import { AlertCircle, AlertTriangle, ArrowLeft, CalendarClock, Check, ChevronRight, ChevronUp, Clock, Lock, Plus, Search, Truck, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { api } from "../../api";
import { useKitchenChanges } from "../../liveUpdates";
import { formatStockQuantity, getStockHealth, productPacks } from "../../features/kitchen";
import { canEditShare, closesInText, deliveryDateText, draftCounts, hasArriving, kitchenStage, lineState, myOrders, myShare, needsQuantity, orderTimeline, otherOpenOrders } from "../../features/kitchen/orders";
import { arrivingLines } from "../../features/kitchen/receiving";
import KitchenReceiveItems from "./KitchenReceiveItems";
import { TransferCard } from "./KitchenTransfers";
import { fetchWaitingTransfers, respondToTransfer } from "./transfersApi";
import OrderTicket from "./OrderTicket";
import { useWide } from "./useWide";
import { useConfirm } from "../ui/ConfirmDialog";
import "./KitchenOrders.css";

const BASE = "/procurement/collaborative-purchase-orders";
const qty = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const errorText = (error, fallback) => error?.response?.data?.message || fallback;
const productName = (line) => line.stockItemId?.name || "Item";
const unitOf = (line) => line.stockItemId?.unitId?.symbol || "";
const LINE_STATE = { not_sent: { label: "Not sent yet", pill: "kg-pill--routine" }, on_the_way: { label: "On the way", pill: "kg-pill--low" }, problem: { label: "Problem raised · waiting for central store", pill: "kg-pill--soon" }, received: { label: "Received", pill: "ko-pill--received" } };
/** "Received · MKM-2610-0001", or what the central store decided after a problem. */
const lineStateText = (line, share) => {
  const state = lineState(line, share);
  if (state === "received" && line.ticketId) return line.receivedQtyBaseUnit > 0 ? `Received ${qty(line.receivedQtyBaseUnit)} ${unitOf(line)} · ${line.trackingId}` : "Settled · nothing added";
  return `${LINE_STATE[state].label}${line.trackingId ? ` · ${line.trackingId}` : ""}`;
};
const lineAmount = (line) => (line.packId ? `${qty(line.packQuantity)} × ${line.packName}` : `${qty(line.qtyBaseUnit)} ${unitOf(line)}`);
const numericQuantity = (value) => { const number = Number(value); return Number.isFinite(number) && number > 0 ? number : 0; };
/** Cooks count rice in bags and oil in tins, so the biggest pack is the unit "Add" suggests; the chips let them switch to kg. */
const defaultPackFor = (product) => [...productPacks(product)].sort((a, b) => Number(b.size) - Number(a.size))[0] || null;
const packLabel = (pack, count) => (count === 1 ? pack.name : `${pack.name}s`);
const initialOf = (name) => (String(name).trim().charAt(0) || "?").toUpperCase();

/** Cart entries ({ qty, packId }) keyed by product id → API item lines. */
const toItems = (cart, products) => Object.entries(cart).flatMap(([id, entry]) => {
  const amount = Number(entry.qty);
  if (!(amount > 0)) return [];
  const pack = productPacks(products.find((product) => String(product._id) === id) || {}).find((candidate) => String(candidate._id) === String(entry.packId));
  return pack
    ? [{ stockItemId: id, qtyBaseUnit: amount * Number(pack.size), packId: pack._id, packName: pack.name, packSize: Number(pack.size), packQuantity: amount }]
    : [{ stockItemId: id, qtyBaseUnit: amount }];
});

function Timeline({ order, godownId }) {
  return <ol className="ko-timeline" aria-label="Order progress">
    {orderTimeline(order, godownId).map((step) => <li key={step.key} className={`${step.done ? "is-done" : ""} ${step.current ? "is-current" : ""}`}>
      <span aria-hidden="true">{step.done ? <Check size={13} /> : null}</span>
      <b>{step.label}</b>
      {step.at && <small>{deliveryDateText(step.at)}</small>}
    </li>)}
  </ol>;
}

function MyOrderCard({ order, godownId, now, onEdit, onReceive }) {
  const share = myShare(order, godownId);
  const stage = kitchenStage(order, godownId);
  const others = order.kitchenCount - 1;
  const arriving = hasArriving(order, godownId);
  const notSent = share.items.filter((line) => lineState(line, share) === "not_sent").length;
  return <article className={`kg-glass kg-lift ko-card${order.emergency ? " ko-card--urgent" : ""}`}>
    <header className="ko-card__head">
      <div><p className="kg-label">{order.emergency ? "Emergency order" : "Shared order"}</p><h2>{order.title || share.items.map(productName).join(", ")}</h2></div>
      {order.emergency && <span className="kg-pill kg-pill--expired">Urgent</span>}
    </header>
    <div className="ko-meta">
      <span><CalendarClock size={15} aria-hidden="true" /> Delivery by <em className="ko-date">{deliveryDateText(order.neededBy, { withTime: order.emergency })}</em></span>
      {order.status === "open" && <span><Clock size={15} aria-hidden="true" /> {closesInText(order.closesAt, now)}</span>}
      {others > 0 && <span><Users size={15} aria-hidden="true" /> {others} other {others === 1 ? "kitchen" : "kitchens"}</span>}
    </div>
    {stage === "cancelled" ? <p className="ko-note">This order was cancelled by the central store.</p> : <Timeline order={order} godownId={godownId} />}
    <ul className="ko-lines" aria-label="Your items">
      {share.items.map((line) => <li key={`${line.stockItemId?._id}:${line.packId || "base"}`} className="ko-line">
        <strong>{productName(line)}</strong><span>{lineAmount(line)}</span>
        {order.status === "ordered"
          ? <span className={`kg-pill ${LINE_STATE[lineState(line, share)].pill}`}>{lineStateText(line, share)}</span>
          : line.approvedAt && <small className="ko-locked"><Lock size={12} aria-hidden="true" /> Approved</small>}
      </li>)}
    </ul>
    {order.supplier && stage === "delivered" && <p className="ko-note">From {order.supplier.name}{order.invoiceNo ? ` · Invoice ${order.invoiceNo}` : ""}</p>}
    {canEditShare(order, godownId, now) && <footer className="ko-actions"><button type="button" className="kg-chip" onClick={() => onEdit(order)}>Edit my items</button></footer>}
    {arriving && <footer className="ko-confirm"><p className="ko-hint"><Truck size={15} aria-hidden="true" /> {notSent ? "Some items are on the way; the rest will come later." : "On the way."} Something wrong with an item? You can mark it as a problem inside.</p><button type="button" className="kg-btn" onClick={() => onReceive(order, notSent)}>Receive items <ChevronRight size={17} aria-hidden="true" /></button></footer>}
  </article>;
}

function JoinCard({ order, now, onJoin }) {
  const names = [...new Set(order.contributions.flatMap((share) => share.items.map(productName)))];
  return <article className={`kg-glass kg-lift ko-card ${order.emergency ? "ko-card--urgent" : "ko-card--join"}`}>
    <header className="ko-card__head">
      <div><p className="kg-label">Started by {order.createdByGodown?.name || "a kitchen"}</p><h2>{order.title || names.join(", ")}</h2></div>
      {order.emergency && <span className="kg-pill kg-pill--expired">Urgent</span>}
    </header>
    <div className="ko-meta">
      <span><CalendarClock size={15} aria-hidden="true" /> Delivery by <em className="ko-date">{deliveryDateText(order.neededBy, { withTime: order.emergency })}</em></span>
      <span><Clock size={15} aria-hidden="true" /> {closesInText(order.closesAt, now)}</span>
    </div>
    <p className="ko-asked">Asked for: <b>{names.join(", ")}</b></p>
    <button type="button" className="kg-btn ko-wide" onClick={() => onJoin(order)}><Plus size={17} aria-hidden="true" /> Add my items</button>
  </article>;
}

/** Cart entries with an amount (or added from Home and still waiting for one) → the ticket's rows, in the order they were added. */
const ticketRows = (cart, products, locked) => Object.entries(cart).flatMap(([id, entry]) => {
  const amount = Number(entry.qty);
  const pending = needsQuantity(entry);
  const product = products.find((candidate) => String(candidate._id) === id);
  if ((!(amount > 0) && !pending) || !product) return [];
  const pack = productPacks(product).find((candidate) => String(candidate._id) === String(entry.packId));
  return [{ id, name: product.name, amount: amount > 0 ? amount : 0, unit: pack ? pack.name : product.unit, locked: locked.has(id), needsQty: pending }];
});

function ItemPicker({ mode, products, cart, setCart, settings, neededIn, setNeededIn, emergency, setEmergency, busy, onBack, onSubmit, now }) {
  const [search, setSearch] = useState("");
  const [ticketOpen, setTicketOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const wide = useWide();
  const [confirm, confirmDialog] = useConfirm();
  const share = mode.order ? myShare(mode.order, mode.godownId) : null;
  const locked = new Set((share?.items || []).filter((line) => line.approvedAt).map((line) => String(line.stockItemId?._id || line.stockItemId)));
  const shown = products.filter((product) => product.name.toLowerCase().includes(search.trim().toLowerCase()));
  const rows = ticketRows(cart, products, locked);
  const count = rows.length;
  const option = settings?.neededInOptions.find((candidate) => candidate.key === neededIn);
  const previewHours = emergency ? settings?.emergencyHours : option?.hours;
  const preview = previewHours ? new Date(now.getTime() + previewHours * 3_600_000) : null;
  const setEntry = (id, change) => setCart((previous) => ({ ...previous, [id]: { qty: "", packId: "base", ...previous[id], ...change } }));
  // Per-card entry state, as on Use: { [id]: { done, round } }. done = the field has sunk into a confirmed row; round remounts the field so it refocuses.
  const [ui, setUi] = useState({});
  const addProduct = (product) => {
    const id = String(product._id);
    setEntry(id, { qty: "", packId: productPacks(product).length ? "" : "base" });
    setUi((previous) => ({ ...previous, [id]: { done: false, round: 0 } }));
  };
  // Switching the unit keeps what was entered: 2 bags becomes 50 kg, 50 kg becomes 2 bags.
  const chooseUnit = (product, unit) => {
    const id = String(product._id);
    const packs = productPacks(product);
    const current = cart[id] || {};
    const currentPack = packs.find((candidate) => String(candidate._id) === String(current.packId));
    const base = numericQuantity(current.qty) * (currentPack ? Number(currentPack.size) : 1);
    const next = unit === "base" ? null : packs.find((candidate) => String(candidate._id) === unit);
    const converted = Number((base / (next ? Number(next.size) : 1)).toFixed(3));
    setEntry(id, { packId: unit, qty: converted > 0 ? String(converted) : "" });
    setUi((previous) => ({ ...previous, [id]: { ...(previous[id] || { round: 0 }), done: false } }));
  };
  // Typing into a card that was filled from Home (no card state yet) keeps the field open until the tick, like any other card.
  const touchProduct = (id) => setUi((previous) => (previous[id] ? previous : { ...previous, [id]: { done: false, round: 0 } }));
  const removeProduct = (product) => {
    const id = String(product._id);
    setCart((previous) => { const next = { ...previous }; delete next[id]; return next; });
    setUi((previous) => { const next = { ...previous }; delete next[id]; return next; });
  };
  const confirmProduct = (product, amount) => {
    const id = String(product._id);
    document.getElementById(`order-${id}`)?.blur();
    if (amount > 0) setUi((previous) => ({ ...previous, [id]: { ...(previous[id] || { round: 0 }), done: true } }));
  };
  const reopenProduct = (product) => {
    const id = String(product._id);
    setUi((previous) => ({ ...previous, [id]: { done: false, round: (previous[id]?.round || 0) + 1 } }));
  };
  const setAmount = (id, amount) => (amount > 0 ? setEntry(id, { qty: String(amount) }) : setCart((previous) => { const next = { ...previous }; delete next[id]; return next; }));
  const missing = rows.filter((row) => row.needsQty).length;
  const title = mode.type === "new" ? "New order" : mode.type === "join" ? "Add my items" : "Edit my items";
  const when = mode.type === "new" ? (preview ? `≈ ${deliveryDateText(preview, { withTime: emergency })}` : null) : deliveryDateText(mode.order.neededBy, { withTime: mode.order.emergency });

  const clearTicket = async () => {
    const ok = await confirm({ title: "Remove all items from the ticket?", message: locked.size ? "Items the central store has already approved stay." : "You can add them again afterwards.", confirmLabel: "Remove all", danger: true });
    if (ok) setCart((previous) => Object.fromEntries(Object.entries(previous).filter(([id]) => locked.has(id))));
  };
  // Phone: the sheet closes itself once the ticket is empty; Escape closes it and the page behind does not scroll meanwhile.
  const [seenCount, setSeenCount] = useState(count);
  if (seenCount !== count) {
    setSeenCount(count);
    if (count === 0) setSheetOpen(false);
  }
  useEffect(() => {
    if (!sheetOpen) return undefined;
    const onKey = (event) => { if (event.key === "Escape") setSheetOpen(false); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", onKey); };
  }, [sheetOpen]);
  const submitLabel = mode.type === "edit" ? "Save changes" : "Place request";
  // Numbered steps so cooks know what to press next: a new order is when → add → review; join and edit skip "when".
  const stepOf = (n) => (mode.type === "new" ? `Step ${n}/3` : `Step ${n - 1}/2`);
  const note = missing ? `${missing} ${missing === 1 ? "item needs" : "items need"} a quantity before you can send` : "";
  // Same ticket on both layouts: the sticky column beside the list from 900px, the sheet on a phone; the action lives inside it.
  const ticket = <OrderTicket badge={stepOf(3)} rows={rows} meta={[{ label: "Delivery", value: when }]} emptyText="Tap “Add” on a supply below and it will be listed here."
    open={wide ? ticketOpen : true} onToggle={wide ? () => setTicketOpen((value) => !value) : undefined} onChange={setAmount} onClear={clearTicket}
    onSubmit={onSubmit} submitLabel={submitLabel} submittingLabel="Placing…" submitting={busy} submitDisabled={missing > 0} note={note} />;

  return <main className="ko-shell ko-picker">
    {confirmDialog}
    {mode.type !== "new" && <button type="button" className="kg-chip ko-back" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> Back</button>}
    <header className="ko-heading"><div><h1>{title}</h1>
      <span>{mode.type === "new" ? "Choose what your kitchen needs and when." : `Delivery by ${deliveryDateText(mode.order.neededBy, { withTime: mode.order.emergency })}.`}</span></div></header>

    <div className="ko-picker__layout">
      {wide && ticket}

      <div className="ko-picker__main">
        {mode.type === "new" && <section className="kg-glass ko-when" aria-label="When do you need it">
          <p className="ko-step-head"><span className="ko-step">{stepOf(1)}</span> When do you need it?</p>
          <label className="ko-field"><span>Needed by</span>
            <select value={neededIn} disabled={emergency} onChange={(event) => setNeededIn(event.target.value)}>
              {(settings?.neededInOptions || []).map((candidate) => <option key={candidate.key} value={candidate.key}>{candidate.label}</option>)}
            </select>
            {preview && <em className="ko-date">≈ {deliveryDateText(preview, { withTime: emergency })}</em>}
          </label>
          <label className="ko-emergency"><input type="checkbox" checked={emergency} onChange={(event) => setEmergency(event.target.checked)} />
            <span><AlertTriangle size={16} aria-hidden="true" /> Emergency — needed within {settings?.emergencyHours === 1 ? "1 hour" : `${settings?.emergencyHours} hours`}</span></label>
        </section>}

        <p className="ko-step-head"><span className="ko-step">{stepOf(2)}</span> Add supplies</p>
        <label className="ko-search kg-float"><Search size={19} aria-hidden="true" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search supplies" aria-label="Search supplies" />{search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search"><X size={17} /></button>}</label>

        <section className="ko-products" aria-label="Supplies">
          {shown.length === 0 && <div className="kg-glass ko-empty"><h2>No supplies found</h2><p>Try another name.</p></div>}
          {shown.map((product) => {
            const id = String(product._id);
            const entry = cart[id];
            const begun = Boolean(entry);
            const amount = numericQuantity(entry?.qty);
            const packs = productPacks(product);
            const isLocked = locked.has(id);
            const unit = product.unit;
            const pack = packs.find((candidate) => String(candidate._id) === String(entry?.packId)) || null;
            // Items added from Home arrive with no unit, so the card asks for one before the number box unlocks (as on Use).
            const chosenUnit = !begun ? null : pack ? String(pack._id) : entry.packId === "base" || packs.length === 0 ? "base" : null;
            const unitChosen = chosenUnit !== null;
            const isSelected = amount > 0;
            // Lines loaded from an existing order (or approved ones) start as confirmed rows; a tap reopens them.
            const confirmed = isLocked || (isSelected && (ui[id]?.done ?? true));
            const health = getStockHealth(product);
            const image = product.image && product.image !== "null" ? product.image : "";
            const baseAmount = amount * (pack ? Number(pack.size) : 1);
            const entryUnit = pack ? packLabel(pack, amount || 1) : unit;
            const tone = isSelected ? " is-selected" : health.key === "out" ? " ko-product--out" : health.key === "low" ? " ko-product--low" : "";
            return <article key={id} className={`kg-glass kg-lift ko-product${tone}`}>
              <div className={`ko-product__media${image ? " has-image" : ""}`} aria-hidden="true">
                {image ? <img src={image} alt="" loading="lazy" decoding="async" /> : <span>{initialOf(product.name)}</span>}
              </div>
              <div className="ko-product__body">
                <div className="ko-product__head">
                  <h3>{product.name}</h3>
                  {health.key === "out" ? <span className="kg-pill kg-pill--expired">Out of stock</span> : health.key === "low" ? <span className="kg-pill kg-pill--low">Low stock</span> : null}
                </div>
                <dl className="ko-facts">
                  <div>
                    <dt>In stock</dt>
                    <dd>{health.quantity > 0
                      ? <>{formatStockQuantity(health.quantity, unit, product)}{packs.length > 0 && <small> · {qty(health.quantity)} {unit}</small>}</>
                      : <span className="ko-facts__none">Nothing left</span>}</dd>
                  </div>
                </dl>
                {isLocked && <p className="ko-locked"><Lock size={12} aria-hidden="true" /> Approved — can’t change</p>}

                {!begun ? (
                  <div className="ko-product__entry">
                    <span className="ko-product__label">Quantity needed</span>
                    <button type="button" className="kt-add" onClick={() => addProduct(product)} aria-label={`Add ${product.name}`}><Plus size={17} aria-hidden="true" /> Add<span>{defaultPackFor(product)?.name || unit}</span></button>
                  </div>
                ) : (
                  <>
                    {packs.length > 0 && !confirmed && (
                      <div className="ko-unit" role="group" aria-label={`Count ${product.name} in`}>
                        <span className="ko-product__label">Count in</span>
                        {packs.map((candidate) => <button type="button" key={candidate._id} className={chosenUnit === String(candidate._id) ? "is-on" : ""} aria-pressed={chosenUnit === String(candidate._id)} onClick={() => chooseUnit(product, String(candidate._id))}>{candidate.name}</button>)}
                        <button type="button" className={chosenUnit === "base" ? "is-on" : ""} aria-pressed={chosenUnit === "base"} onClick={() => chooseUnit(product, "base")}>{unit}</button>
                      </div>
                    )}
                    {packs.length > 0 && !confirmed && (
                      !unitChosen
                        ? <p className="ko-unit__note ko-unit__note--error" role="alert"><AlertTriangle size={14} aria-hidden="true" /> Please select units</p>
                        : <p className="ko-unit__note">{pack
                          ? <>1 × {pack.name} = <strong>{qty(pack.size)} {unit}</strong></>
                          : <>Counted in {unit} · 1 × {packs[0].name} = {qty(packs[0].size)} {unit}</>}</p>
                    )}
                    <div className="ko-product__entry">
                      <label htmlFor={`order-${id}`}>Quantity needed</label>
                      {confirmed ? (
                        <div className="ko-stepper ko-stepper--done">
                          <button type="button" onClick={() => removeProduct(product)} disabled={isLocked} aria-label={`Remove ${product.name}`}><X size={17} /></button>
                          <button type="button" className="ko-stepper__value" onClick={() => reopenProduct(product)} disabled={isLocked} aria-label={`Change ${product.name} quantity`}>
                            {pack ? <>{qty(amount)} × {pack.name}<small> · {qty(baseAmount)} {unit}</small></> : <>{qty(amount)} {unit}</>}<Check size={15} aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <div className="ko-stepper ko-stepper--open">
                          <button type="button" onClick={() => removeProduct(product)} aria-label={`Remove ${product.name}`}><X size={17} /></button>
                          <input
                            key={`${chosenUnit}-${ui[id]?.round || 0}`}
                            id={`order-${id}`}
                            type="text"
                            inputMode="decimal"
                            value={entry.qty}
                            placeholder="0"
                            disabled={!unitChosen}
                            autoFocus={unitChosen && Boolean(ui[id])}
                            onChange={(event) => { if (!/^\d*(\.\d{0,3})?$/.test(event.target.value)) return; setEntry(id, { qty: event.target.value }); touchProduct(id); }}
                            aria-label={`${product.name} quantity`}
                          />
                          <span>{unitChosen ? entryUnit : "—"}</span>
                          {/* The tick only puts the keyboard away: the amount is already on the ticket as it is typed. */}
                          <button type="button" onClick={() => confirmProduct(product, amount)} disabled={!unitChosen} aria-label={`Done entering ${product.name}`}><Check size={17} /></button>
                        </div>
                      )}
                    </div>
                    <p className="ko-product__hint">{isSelected ? (pack ? <em>= {qty(baseAmount)} {unit}</em> : "") : unitChosen ? "Type how much you need" : ""}</p>
                  </>
                )}
              </div>
            </article>;
          })}
        </section>
      </div>
    </div>

    {!wide && (
      <button type="button" className="ko-bar" onClick={() => setSheetOpen(true)} aria-haspopup="dialog" aria-expanded={sheetOpen}
        aria-label={`${count} ${count === 1 ? "item" : "items"} on the order ticket. Open the ticket.`}>
        <span className="ko-bar__count" aria-hidden="true">{count}</span>
        <span className="ko-bar__text" aria-hidden="true"><strong>{stepOf(3)} · Ticket</strong> · {missing ? `${missing} ${missing === 1 ? "needs" : "need"} a quantity` : "Review"}</span>
        <ChevronUp size={20} aria-hidden="true" />
      </button>
    )}
    {!wide && sheetOpen && (
      <div className="ko-sheet" role="presentation">
        <button type="button" className="ko-sheet__backdrop" onClick={() => setSheetOpen(false)} aria-label="Close the ticket" />
        <section className="ko-sheet__panel" role="dialog" aria-modal="true" aria-label="Order ticket">
          <header className="ko-sheet__head">
            <p className="kg-label">{title}</p>
            <button type="button" className="kg-chip ko-sheet__close" onClick={() => setSheetOpen(false)} aria-label="Close the ticket"><X size={18} /></button>
          </header>
          <div className="ko-sheet__body">{ticket}</div>
        </section>
      </div>
    )}
  </main>;
}

/**
 * draft / onDraftChange: the new-order cart, held by the parent so items added from Home stay put while the cook is elsewhere.
 * section: "ongoing" (orders in progress, plus transfers waiting for Accept / Reject when canTransfer), "new" (the new-order picker) or "history" (delivered and cancelled orders).
 * onNewOrder / onLeaveNewOrder switch the "New order" section tab on and off.
 */
export default function KitchenOrders({ products = [], godownId, onOrdersLoaded, draft = {}, onDraftChange, section = "ongoing", canTransfer = false, onNewOrder, onLeaveNewOrder }) {
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState(null); // null = list; { type: "new" | "join" | "edit" | "receive", order?, godownId, notSent? }
  const [localCart, setLocalCart] = useState({});
  const isNew = mode?.type === "new";
  const cart = isNew ? draft : localCart;
  const setCart = isNew && onDraftChange ? onDraftChange : setLocalCart;
  const [neededIn, setNeededIn] = useState("");
  const [emergency, setEmergency] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, figures] = await Promise.all([api.get(BASE, { params: { limit: 100 } }), api.get("/ordering-settings")]);
      setOrders(list.data.items || []);
      onOrdersLoaded?.(list.data.items || []);
      setSettings(figures.data.settings);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
      setNow(new Date());
    }
  }, [onOrdersLoaded]);

  useEffect(() => { load(); }, [load]);
  useKitchenChanges(["orders"], load);
  // Transfers other kitchens sent here that still need an answer; they sit with the ongoing orders because they need action.
  const [waitingTransfers, setWaitingTransfers] = useState([]);
  const loadWaiting = useCallback(async () => {
    if (!canTransfer) return;
    try { setWaitingTransfers(await fetchWaitingTransfers()); } catch { /* the orders list still works without them */ }
  }, [canTransfer]);
  useEffect(() => { loadWaiting(); }, [loadWaiting]);
  useKitchenChanges(["transfers"], loadWaiting);
  const respondWaiting = async (transfer, action) => { if (await respondToTransfer(transfer, action)) loadWaiting(); };
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(timer); }, []);
  // The "New order" tab opens the picker once the ordering settings are in; leaving it closes the picker (the draft stays put). History never shows one.
  useEffect(() => {
    if (section === "new" && settings && mode?.type !== "new") start("new");
    if (section !== "new" && mode?.type === "new") setMode(null);
    if (section === "history" && mode) setMode(null);
  }, [section, settings, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const joinable = useMemo(() => otherOpenOrders(orders, godownId, now), [orders, godownId, now]);
  const mine = useMemo(() => myOrders(orders, godownId), [orders, godownId]);
  // Ongoing = still on its way; delivered and cancelled orders move to Orders history.
  const finished = (order) => ["delivered", "cancelled"].includes(kitchenStage(order, godownId));
  const ongoing = mine.filter((order) => !finished(order));
  const done = mine.filter(finished);
  const waiting = draftCounts(draft);

  const start = (type, order) => {
    const share = order ? myShare(order, godownId) : null;
    // A new order starts from the shared draft as it is (items added from Home, or left half-filled); join and edit start from the order's own lines.
    if (type !== "new") setLocalCart(Object.fromEntries((share?.items || []).map((line) => [String(line.stockItemId?._id || line.stockItemId), { qty: String(line.packId ? line.packQuantity : line.qtyBaseUnit), packId: line.packId || "base" }])));
    setNeededIn(settings?.neededInOptions[0]?.key || "");
    setEmergency(false);
    setMode({ type, order, godownId });
  };

  const submit = async () => {
    const items = toItems(cart, products);
    setBusy(true);
    try {
      if (mode.type === "new") await api.post(BASE, emergency ? { emergency: true, items } : { neededIn, items });
      else if (mode.type === "join") await api.post(`${BASE}/${mode.order._id}/contributions`, { items });
      else await api.put(`${BASE}/${mode.order._id}/contributions/me`, { items });
      toast.success(mode.type === "edit" ? "Your items were updated" : "Request placed with the central store");
      if (mode.type === "new") { onDraftChange?.({}); onLeaveNewOrder?.(); }
      setMode(null);
      await load();
    } catch (error) {
      toast.error(errorText(error, "Could not send. Check your connection and try again."));
      if (["ORDER_CLOSED", "VERSION_CONFLICT"].includes(error?.response?.data?.code)) { setMode(null); load(); }
    } finally {
      setBusy(false);
    }
  };

  const receive = (order, notSent) => setMode({ type: "receive", order, godownId, notSent });

  const loadingState = <div className="ko-state" role="status"><span className="ko-spinner" aria-hidden="true" /><p>Loading orders…</p></div>;
  const failedState = <div className="kg-glass ko-empty"><h2>Could not load orders</h2><p>Check your connection and try again.</p><button type="button" className="kg-btn" onClick={load}>Try again</button></div>;
  const orderCard = (order) => <MyOrderCard key={order._id} order={order} godownId={godownId} now={now} onEdit={(picked) => start("edit", picked)} onReceive={receive} />;

  // Orders history (under the History tab): delivered and cancelled orders.
  if (section === "history") {
    return <main className="ko-shell">
      {loading && orders.length === 0 ? loadingState : failed ? failedState
        : <section className="ko-section" aria-labelledby="ko-done-title">
          <h2 id="ko-done-title">Finished orders</h2>
          {done.length === 0
            ? <div className="kg-glass ko-empty"><span className="kg-orb" aria-hidden="true"><Truck size={24} /></span><h2>Nothing finished yet</h2><p>Delivered and cancelled orders will be listed here.</p></div>
            : <div className="ko-list">{done.map(orderCard)}</div>}
        </section>}
    </main>;
  }

  if (mode?.type === "receive") {
    return <KitchenReceiveItems order={mode.order} lines={arrivingLines(mode.order, godownId)} notSentCount={mode.notSent}
      onBack={() => setMode(null)} onDone={() => { setMode(null); load(); }} />;
  }

  if (mode) {
    return <ItemPicker mode={mode} products={products} cart={cart} setCart={setCart} settings={settings} neededIn={neededIn} setNeededIn={setNeededIn}
      emergency={emergency} setEmergency={setEmergency} busy={busy} onBack={() => { if (isNew) onLeaveNewOrder?.(); setMode(null); }} onSubmit={submit} now={now} />;
  }

  return <main className="ko-shell">
    {waiting.items > 0 && <button type="button" className="kg-glass kg-lift ko-create ko-create--waiting" onClick={onNewOrder} disabled={!settings}>
      <span className="kg-orb" aria-hidden="true"><AlertCircle size={20} /></span>
      <span><strong>Continue your order</strong>
        <small>{waiting.missing ? `${waiting.missing} ${waiting.missing === 1 ? "item" : "items"} from Home ${waiting.missing === 1 ? "needs" : "need"} a quantity` : `${waiting.items} ${waiting.items === 1 ? "item" : "items"} waiting to be sent`}</small></span>
      <ChevronRight size={20} aria-hidden="true" />
    </button>}

    {waitingTransfers.length > 0 && <section className="ko-section" aria-labelledby="ko-waiting-title">
      <h2 id="ko-waiting-title">Transfers waiting for you</h2>
      <div className="ko-list">{waitingTransfers.map((transfer) => <TransferCard key={transfer._id} transfer={transfer} onRespond={respondWaiting} />)}</div>
    </section>}

    {loading && orders.length === 0 ? loadingState : failed ? failedState
      : <>
        {joinable.length > 0 && <section className="ko-section" aria-labelledby="ko-join-title">
          <h2 id="ko-join-title">Open orders — add your items</h2>
          <div className="ko-list">{joinable.map((order) => <JoinCard key={order._id} order={order} now={now} onJoin={(picked) => start("join", picked)} />)}</div>
        </section>}
        <section className="ko-section" aria-labelledby="ko-mine-title">
          <h2 id="ko-mine-title">My orders</h2>
          {ongoing.length === 0
            ? <div className="kg-glass ko-empty"><span className="kg-orb" aria-hidden="true"><Truck size={24} /></span><h2>No orders in progress</h2><p>Tap “New order” when your kitchen needs supplies.</p></div>
            : <div className="ko-list">{ongoing.map(orderCard)}</div>}
        </section>
      </>}
  </main>;
}
