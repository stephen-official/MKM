import { AlertTriangle, ArrowLeft, CalendarClock, Check, ChevronRight, Clock, History, Lock, Minus, Plus, RefreshCw, Search, Truck, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { api } from "../../api";
import { productPacks } from "../../features/kitchen";
import { canEditShare, closesInText, deliveryDateText, hasArriving, kitchenStage, lineState, myOrders, myShare, orderTimeline, otherOpenOrders } from "../../features/kitchen/orders";
import { arrivingLines } from "../../features/kitchen/receiving";
import KitchenReceiveItems from "./KitchenReceiveItems";
import OrderTicket from "./OrderTicket";
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

/** Cart entries with an amount → the ticket's rows, in the order they were added: name, amount, unit (pack name when in packs). */
const ticketRows = (cart, products, locked) => Object.entries(cart).flatMap(([id, entry]) => {
  const amount = Number(entry.qty);
  const product = products.find((candidate) => String(candidate._id) === id);
  if (!(amount > 0) || !product) return [];
  const pack = productPacks(product).find((candidate) => String(candidate._id) === String(entry.packId));
  return [{ id, name: product.name, amount, unit: pack ? pack.name : product.unit, locked: locked.has(id) }];
});

function ItemPicker({ mode, products, cart, setCart, settings, neededIn, setNeededIn, emergency, setEmergency, busy, onBack, onSubmit, now }) {
  const [search, setSearch] = useState("");
  const [ticketOpen, setTicketOpen] = useState(true);
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
  const setAmount = (id, amount) => setEntry(id, { qty: amount > 0 ? String(amount) : "" });
  const title = mode.type === "new" ? "New order" : mode.type === "join" ? "Add my items" : "Edit my items";
  const when = mode.type === "new" ? (preview ? `≈ ${deliveryDateText(preview, { withTime: emergency })}` : null) : deliveryDateText(mode.order.neededBy, { withTime: mode.order.emergency });

  const clearTicket = async () => {
    const ok = await confirm({ title: "Remove all items from the ticket?", message: locked.size ? "Items the central store has already approved stay." : "You can add them again afterwards.", confirmLabel: "Remove all", danger: true });
    if (ok) setCart((previous) => Object.fromEntries(Object.entries(previous).filter(([id]) => locked.has(id))));
  };
  const showTicket = () => {
    setTicketOpen(true);
    document.getElementById("kitchen-ticket")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return <main className="ko-shell ko-picker">
    {confirmDialog}
    <button type="button" className="kg-chip ko-back" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> Back</button>
    <header className="ko-heading"><div><p>Ask for supplies</p><h1>{title}</h1>
      <span>{mode.type === "new" ? "Choose what your kitchen needs and when." : `Delivery by ${deliveryDateText(mode.order.neededBy, { withTime: mode.order.emergency })}.`}</span></div></header>

    <div className="ko-picker__layout">
      <OrderTicket rows={rows} meta={[{ label: "Delivery", value: when }]} emptyText="Tap “Add” on a supply below and it will be listed here." open={ticketOpen} onToggle={() => setTicketOpen((value) => !value)} onChange={setAmount} onClear={clearTicket} />

      <div className="ko-picker__main">
        {mode.type === "new" && <section className="kg-glass ko-when" aria-label="When do you need it">
          <label className="ko-field"><span>Needed by</span>
            <select value={neededIn} disabled={emergency} onChange={(event) => setNeededIn(event.target.value)}>
              {(settings?.neededInOptions || []).map((candidate) => <option key={candidate.key} value={candidate.key}>{candidate.label}</option>)}
            </select>
            {preview && <em className="ko-date">≈ {deliveryDateText(preview, { withTime: emergency })}</em>}
          </label>
          <label className="ko-emergency"><input type="checkbox" checked={emergency} onChange={(event) => setEmergency(event.target.checked)} />
            <span><AlertTriangle size={16} aria-hidden="true" /> Emergency — needed within {settings?.emergencyHours === 1 ? "1 hour" : `${settings?.emergencyHours} hours`}</span></label>
        </section>}

        <label className="ko-search"><Search size={19} aria-hidden="true" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search supplies" aria-label="Search supplies" />{search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search"><X size={17} /></button>}</label>

        <section className="ko-products" aria-label="Supplies">
          {shown.length === 0 && <div className="kg-glass ko-empty"><h2>No supplies found</h2><p>Try another name.</p></div>}
          {shown.map((product) => {
            const id = String(product._id);
            const entry = cart[id] || { qty: "", packId: "base" };
            const amount = Number(entry.qty || 0);
            const packs = productPacks(product);
            const isLocked = locked.has(id);
            const unit = packs.find((pack) => String(pack._id) === String(entry.packId))?.name || product.unit;
            return <article key={id} className={`kg-glass kg-lift ko-product${amount > 0 ? " is-selected" : ""}`}>
              <div className="ko-product__name"><strong>{product.name}</strong>{isLocked && <small className="ko-locked"><Lock size={12} aria-hidden="true" /> Approved — can’t change</small>}</div>
              <div className="ko-entry">
                {packs.length > 0 && <select aria-label={`Packaging for ${product.name}`} value={entry.packId} disabled={isLocked} onChange={(event) => setEntry(id, { packId: event.target.value })}>
                  <option value="base">{product.unit}</option>{packs.map((pack) => <option key={pack._id} value={pack._id}>{pack.name}</option>)}</select>}
                {amount > 0 || isLocked
                  ? <div className="ko-stepper">
                    <button type="button" disabled={isLocked || amount <= 0} onClick={() => setAmount(id, Math.max(0, amount - 1))} aria-label={amount <= 1 ? `Remove ${product.name}` : `Less ${product.name}`}>{amount <= 1 ? <X size={17} /> : <Minus size={17} />}</button>
                    <input type="text" inputMode="decimal" value={entry.qty} placeholder="0" disabled={isLocked} aria-label={`${product.name} quantity`}
                      onChange={(event) => /^\d*(\.\d{0,3})?$/.test(event.target.value) && setEntry(id, { qty: event.target.value })} />
                    <span>{unit}</span>
                    <button type="button" disabled={isLocked} onClick={() => setAmount(id, amount + 1)} aria-label={`More ${product.name}`}><Plus size={17} /></button>
                  </div>
                  : <button type="button" className="kt-add" onClick={() => setAmount(id, 1)} aria-label={`Add ${product.name}`}><Plus size={17} aria-hidden="true" /> Add<span>{unit}</span></button>}
              </div>
            </article>;
          })}
        </section>
      </div>
    </div>

    <footer className="ko-submit">
      <button type="button" className="ko-submit__count" onClick={showTicket} aria-label={`${count} ${count === 1 ? "item" : "items"} on the ticket. Show the ticket.`}><strong>{count}</strong><span>{count === 1 ? "item" : "items"} · view ticket</span></button>
      <button type="button" className="kg-btn" disabled={busy || count === 0} onClick={onSubmit}>{busy ? "Placing…" : mode.type === "edit" ? "Save changes" : "Place request"}</button></footer>
  </main>;
}

export default function KitchenOrders({ products = [], godownId, onShowPast, canShowPast = true, onOrdersLoaded }) {
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState(null); // null = list; { type: "new" | "join" | "edit" | "receive", order?, godownId, notSent? }
  const [cart, setCart] = useState({});
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
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(timer); }, []);

  const joinable = useMemo(() => otherOpenOrders(orders, godownId, now), [orders, godownId, now]);
  const mine = useMemo(() => myOrders(orders, godownId), [orders, godownId]);

  const start = (type, order) => {
    const share = order ? myShare(order, godownId) : null;
    setCart(Object.fromEntries((share?.items || []).map((line) => [String(line.stockItemId?._id || line.stockItemId), { qty: String(line.packId ? line.packQuantity : line.qtyBaseUnit), packId: line.packId || "base" }])));
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

  if (mode?.type === "receive") {
    return <KitchenReceiveItems order={mode.order} lines={arrivingLines(mode.order, godownId)} notSentCount={mode.notSent}
      onBack={() => setMode(null)} onDone={() => { setMode(null); load(); }} />;
  }

  if (mode) {
    return <ItemPicker mode={mode} products={products} cart={cart} setCart={setCart} settings={settings} neededIn={neededIn} setNeededIn={setNeededIn}
      emergency={emergency} setEmergency={setEmergency} busy={busy} onBack={() => setMode(null)} onSubmit={submit} now={now} />;
  }

  return <main className="ko-shell">
    <header className="ko-heading">
      <div><p>Kitchen supplies</p><h1>Ask for supplies</h1><span>Order from the central store, or add your items to another kitchen’s order.</span></div>
      <button type="button" className="kg-chip ko-refresh" onClick={load} disabled={loading} aria-label="Refresh orders"><RefreshCw size={19} className={loading ? "ko-spin" : ""} aria-hidden="true" /></button>
    </header>

    <button type="button" className="kg-glass kg-lift ko-create" onClick={() => start("new")} disabled={!settings}>
      <span className="kg-orb" aria-hidden="true"><Plus size={20} /></span><span><strong>New order</strong><small>Choose items and when you need them</small></span><ChevronRight size={20} aria-hidden="true" />
    </button>

    {loading && orders.length === 0 ? <div className="ko-state" role="status"><span className="ko-spinner" aria-hidden="true" /><p>Loading orders…</p></div>
      : failed ? <div className="kg-glass ko-empty"><h2>Could not load orders</h2><p>Check your connection and try again.</p><button type="button" className="kg-btn" onClick={load}>Try again</button></div>
      : <>
        {joinable.length > 0 && <section className="ko-section" aria-labelledby="ko-join-title">
          <h2 id="ko-join-title">Open orders — add your items</h2>
          <div className="ko-list">{joinable.map((order) => <JoinCard key={order._id} order={order} now={now} onJoin={(picked) => start("join", picked)} />)}</div>
        </section>}
        <section className="ko-section" aria-labelledby="ko-mine-title">
          <h2 id="ko-mine-title">My orders</h2>
          {mine.length === 0
            ? <div className="kg-glass ko-empty"><span className="kg-orb" aria-hidden="true"><Truck size={24} /></span><h2>No orders yet</h2><p>Tap “New order” when your kitchen needs supplies.</p></div>
            : <div className="ko-list">{mine.map((order) => <MyOrderCard key={order._id} order={order} godownId={godownId} now={now} onEdit={(picked) => start("edit", picked)} onReceive={receive} />)}</div>}
        </section>
      </>}

    {canShowPast && <button type="button" className="kg-chip ko-past" onClick={onShowPast}><History size={17} aria-hidden="true" /> Past requests</button>}
  </main>;
}
