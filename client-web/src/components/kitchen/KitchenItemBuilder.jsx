import { AlertTriangle, ArrowLeft, Check, ChevronUp, MapPin, Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import "./KitchenItemBuilder.css";
import { getStockHealth, productPacks } from "../../features/kitchen";
import { lockBodyScroll } from "../../utils/scrollLock";
import { useConfirm } from "../ui/ConfirmDialog";
import Select from "../ui/Select";
import OrderTicket from "./OrderTicket";
import { useWide } from "./useWide";

const idOf = (item) => item.stockRecordId || item.stockItemId || item._id;
const amountOf = (entry) => {
  const value = Number(entry?.requestedQty);
  return Number.isFinite(value) && value > 0 ? value : 0;
};
const qty = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const initialOf = (name) => (String(name).trim().charAt(0) || "?").toUpperCase();
/** The biggest pack is the unit "Add" suggests for a supply request; the chips let the cook switch to the base unit. */
const defaultPackFor = (item) => [...productPacks(item)].sort((a, b) => Number(b.size) - Number(a.size))[0] || null;

/**
 * Pick items for a stock transfer (or an old-style supply request). What is added builds up in a receipt-style ticket:
 * on a phone the ticket bar above the nav opens it in a sheet, from 900px it is the sticky column beside the list.
 * A transfer is sent from the ticket once a destination is chosen; a request still goes through the review step.
 */
export default function KitchenItemBuilder({ type, items = [], cart = [], loading, search, onSearch, onQuantityChange, onPackagingChange, onCancel,
  destination = "", destinations = [], currentGodownId, onDestinationChange, onClear, onSubmit, onReview, submitting = false }) {
  const isTransfer = type === "transfer";
  const wide = useWide();
  const [ticketOpen, setTicketOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Cards the cook has tapped "Add" on but not counted yet: { [id]: { unit: null | "base" | packId, done, round } } (as on Use).
  const [started, setStarted] = useState({});
  const [confirm, confirmDialog] = useConfirm();
  const entryFor = (item) => cart.find((entry) => String(idOf(entry)) === String(idOf(item)));
  // Rows come from the cart itself, in the order items were added, so a search in the list never hides them.
  const rows = cart.filter((entry) => amountOf(entry) > 0).map((entry) => ({ id: String(idOf(entry)), name: entry.name, amount: amountOf(entry), unit: entry.packName || entry.unit || "units" }));
  const count = rows.length;
  const setAmount = (entry, amount) => onQuantityChange(entry, amount > 0 ? String(amount) : "");
  const changeRow = (id, amount) => {
    const entry = cart.find((candidate) => String(idOf(candidate)) === id);
    if (entry) setAmount(entry, amount);
  };
  const clearTicket = async () => {
    if (await confirm({ title: "Remove all items from the ticket?", message: "Nothing has been sent yet.", confirmLabel: "Remove all", danger: true })) onClear?.();
  };
  const addItem = (item) => setStarted((previous) => ({ ...previous, [String(idOf(item))]: { unit: isTransfer || productPacks(item).length === 0 ? "base" : null, done: false, round: 0 } }));
  const chooseUnit = (item, unit) => {
    setStarted((previous) => ({ ...previous, [String(idOf(item))]: { ...(previous[String(idOf(item))] || { round: 0 }), unit, done: false } }));
    onPackagingChange?.(item, unit);
  };
  const confirmItem = (item, quantity) => {
    document.getElementById(`builder-${idOf(item)}`)?.blur();
    if (quantity > 0) setStarted((previous) => ({ ...previous, [String(idOf(item))]: { ...(previous[String(idOf(item))] || { unit: "base", round: 0 }), done: true } }));
  };
  const reopenItem = (item) => setStarted((previous) => {
    const current = previous[String(idOf(item))] || { unit: "base" };
    return { ...previous, [String(idOf(item))]: { ...current, done: false, round: (current.round || 0) + 1 } };
  });
  const removeItem = (item) => {
    setAmount(item, 0);
    setStarted((previous) => { const next = { ...previous }; delete next[String(idOf(item))]; return next; });
  };
  // Started cards are forgotten when the cart itself is cleared; the sheet closes itself once the ticket is empty.
  const [seen, setSeen] = useState({ count, cartSize: cart.length });
  if (seen.count !== count || seen.cartSize !== cart.length) {
    setSeen({ count, cartSize: cart.length });
    if (count === 0 && seen.count !== 0) setSheetOpen(false);
    if (cart.length === 0 && seen.cartSize !== 0) setStarted({});
  }
  useEffect(() => {
    if (!sheetOpen) return undefined;
    const onKey = (event) => { if (event.key === "Escape" && !event.defaultPrevented) setSheetOpen(false); }; // the review panel above takes Escape first
    const unlock = lockBodyScroll();
    document.addEventListener("keydown", onKey);
    return () => { unlock(); document.removeEventListener("keydown", onKey); };
  }, [sheetOpen]);

  const destinationName = destinations.find((candidate) => String(candidate._id) === String(destination))?.name || "";
  const needsDestination = isTransfer && !destination;
  const title = isTransfer ? "Create stock transfer" : "Create supply request";
  const ticket = <OrderTicket title={isTransfer ? "Transfer ticket" : "Request ticket"} rows={rows}
    meta={isTransfer ? [{ label: "Send to", value: destinationName || "Choose a kitchen" }] : []}
    emptyText="Tap “Add” on a supply below and it will be listed here." open={wide ? ticketOpen : true} onToggle={wide ? () => setTicketOpen((value) => !value) : undefined}
    onChange={changeRow} onClear={onClear ? clearTicket : undefined}
    onSubmit={isTransfer ? onSubmit : onReview} submitLabel={isTransfer ? "Send transfer" : "Review & continue"} submittingLabel="Sending…" submitting={submitting}
    submitDisabled={needsDestination} note={count > 0 && needsDestination ? "Choose the kitchen to send to first" : ""} />;

  return <main className="kb-shell">
    {confirmDialog}
    {onCancel && <button type="button" className="kg-chip kb-back" onClick={onCancel}><ArrowLeft size={16} aria-hidden="true" /> {isTransfer ? "Back to transfers" : "Back to requests"}</button>}
    <header className="kb-heading"><div><p>{isTransfer ? "Between kitchens" : "Kitchen supplies"}</p><h1>{title}</h1>
      <span>{isTransfer ? "Choose the kitchen and the items to send." : "Choose the supplies your kitchen needs."}</span></div></header>

    <div className="kb-layout">
      {wide && ticket}

      <div className="kb-main">
        {isTransfer && <section className="kg-glass kb-destination" aria-label="Destination">
          <label className="kb-field"><span><MapPin size={15} aria-hidden="true" /> Send to</span>
            <Select value={destination} required aria-label="Send to" placeholder="Choose a kitchen" onChange={(event) => onDestinationChange?.(event.target.value)}>
              <option value="">Choose a kitchen</option>
              {destinations.filter((candidate) => candidate._id !== currentGodownId).map((candidate) => <option key={candidate._id} value={candidate._id}>{candidate.name}</option>)}
            </Select></label>
        </section>}

        <label className="kb-search kg-float"><Search size={19} aria-hidden="true" /><span className="kb-visually-hidden">Search supplies</span>
          <input type="search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search supplies" autoComplete="off" />
          {search && <button type="button" onClick={() => onSearch("")} aria-label="Clear search"><X size={17} /></button>}</label>

        {loading ? <div className="kg-glass kb-state" role="status"><span className="kb-spinner" />Loading supplies…</div>
          : items.length === 0 ? <div className="kg-glass kb-state"><Search size={25} aria-hidden="true" /><strong>No supplies found</strong><span>Try another item name.</span></div>
          : <section className="kb-list" aria-label="Available supplies">
            {items.map((item) => {
              const id = String(idOf(item));
              const selected = entryFor(item);
              const raw = selected?.requestedQty ?? "";
              const quantity = Number(raw || 0);
              const isSelected = quantity > 0;
              const unit = item.unit || "units";
              const packs = isTransfer ? [] : productPacks(item);
              const available = Number(item.currentQty || 0);
              const health = getStockHealth(item);
              const out = isTransfer && available <= 0;
              const begun = isSelected || Boolean(started[id]);
              const chosenUnit = packs.length === 0 ? "base" : isSelected ? (selected?.packId || "base") : started[id]?.unit ?? null;
              const unitChosen = chosenUnit !== null;
              const pack = packs.find((candidate) => String(candidate._id) === String(chosenUnit)) || null;
              const entryUnit = pack ? pack.name : unit;
              const confirmed = Boolean(started[id]?.done) && isSelected;
              const image = item.image && item.image !== "null" ? item.image : "";
              const remaining = Math.max(available - quantity * (pack ? Number(pack.size) : 1), 0);
              const tone = isSelected ? " is-selected" : out || health.key === "out" ? " kb-card--out" : health.key === "low" ? " kb-card--low" : "";
              return <article className={`kg-glass kg-lift kb-card${tone}`} key={id}>
                <div className={`kb-card__media${image ? " has-image" : ""}`} aria-hidden="true">
                  {image ? <img src={image} alt="" loading="lazy" decoding="async" /> : <span>{initialOf(item.name)}</span>}
                </div>
                <div className="kb-card__body">
                  <div className="kb-card__head">
                    <h2>{item.name}</h2>
                    {health.key === "out" ? <span className="kg-pill kg-pill--expired">Out of stock</span> : health.key === "low" ? <span className="kg-pill kg-pill--low">Low stock</span> : null}
                  </div>
                  <dl className="kb-facts"><div><dt>Available</dt><dd>{available > 0 ? <>{qty(available)} {unit}</> : <span className="kb-facts__none">Nothing left</span>}</dd></div></dl>

                  {!begun ? (
                    <div className="kb-card__entry">
                      <span className="kb-card__label">{isTransfer ? "Quantity to send" : "Quantity needed"}</span>
                      <button type="button" className="kt-add" onClick={() => addItem(item)} disabled={out} aria-label={`Add ${item.name}`}><Plus size={17} aria-hidden="true" /> Add<span>{isTransfer ? unit : defaultPackFor(item)?.name || unit}</span></button>
                    </div>
                  ) : (
                    <>
                      {packs.length > 0 && !confirmed && (
                        <div className="kb-unit" role="group" aria-label={`Count ${item.name} in`}>
                          <span className="kb-card__label">Count in</span>
                          {packs.map((candidate) => <button type="button" key={candidate._id} className={String(chosenUnit) === String(candidate._id) ? "is-on" : ""} aria-pressed={String(chosenUnit) === String(candidate._id)} onClick={() => chooseUnit(item, String(candidate._id))}>{candidate.name}</button>)}
                          <button type="button" className={chosenUnit === "base" ? "is-on" : ""} aria-pressed={chosenUnit === "base"} onClick={() => chooseUnit(item, "base")}>{unit}</button>
                        </div>
                      )}
                      {packs.length > 0 && !confirmed && (
                        !unitChosen
                          ? <p className="kb-unit__note kb-unit__note--error" role="alert"><AlertTriangle size={14} aria-hidden="true" /> Please select units</p>
                          : <p className="kb-unit__note">{pack ? <>1 × {pack.name} = <strong>{qty(pack.size)} {unit}</strong></> : <>Counted in {unit} · 1 × {packs[0].name} = {qty(packs[0].size)} {unit}</>}</p>
                      )}
                      <div className="kb-card__entry">
                        <label htmlFor={`builder-${id}`}>{isTransfer ? "Quantity to send" : "Quantity needed"}</label>
                        {confirmed ? (
                          <div className="kb-stepper kb-stepper--done">
                            <button type="button" onClick={() => removeItem(item)} disabled={submitting} aria-label={`Remove ${item.name}`}><X size={17} /></button>
                            <button type="button" className="kb-stepper__value" onClick={() => reopenItem(item)} disabled={submitting} aria-label={`Change ${item.name} quantity`}>
                              {pack ? <>{qty(quantity)} × {pack.name}<small> · {qty(quantity * Number(pack.size))} {unit}</small></> : <>{qty(quantity)} {unit}</>}<Check size={15} aria-hidden="true" />
                            </button>
                          </div>
                        ) : (
                          <div className="kb-stepper kb-stepper--open">
                            <button type="button" onClick={() => removeItem(item)} disabled={submitting} aria-label={`Remove ${item.name}`}><X size={17} /></button>
                            <input key={`${chosenUnit}-${started[id]?.round || 0}`} id={`builder-${id}`} type="text" inputMode="decimal" value={raw} placeholder="0"
                              disabled={!unitChosen || submitting} autoFocus={unitChosen && Boolean(started[id])}
                              onChange={(event) => /^\d*(\.\d{0,3})?$/.test(event.target.value) && onQuantityChange(item, event.target.value)} aria-describedby={`builder-hint-${id}`} />
                            <span>{unitChosen ? entryUnit : "—"}</span>
                            {/* The tick only puts the keyboard away: the amount is already on the ticket as it is typed. */}
                            <button type="button" onClick={() => confirmItem(item, quantity)} disabled={!unitChosen || submitting} aria-label={`Done entering ${item.name}`}><Check size={17} /></button>
                          </div>
                        )}
                      </div>
                      <p id={`builder-hint-${id}`} className="kb-card__hint">
                        {isSelected
                          ? isTransfer ? <>Left after sending: <strong>{qty(remaining)} {unit}</strong></> : pack ? <em>= {qty(quantity * Number(pack.size))} {unit}</em> : ""
                          : unitChosen ? (isTransfer ? "Type how much to send" : "Type how much you need") : ""}
                      </p>
                    </>
                  )}
                </div>
              </article>;
            })}
          </section>}
      </div>
    </div>

    {!wide && (
      <button type="button" className="kb-bar" onClick={() => setSheetOpen(true)} aria-haspopup="dialog" aria-expanded={sheetOpen}
        aria-label={`${count} ${count === 1 ? "item" : "items"} on the ticket. Open the ticket.`}>
        <span className="kb-bar__count" aria-hidden="true">{count}</span>
        <span className="kb-bar__text" aria-hidden="true"><strong>{isTransfer ? "Transfer ticket" : "Request ticket"}</strong> · {count > 0 && needsDestination ? "Choose a kitchen" : "Review"}</span>
        <ChevronUp size={20} aria-hidden="true" />
      </button>
    )}
    {!wide && sheetOpen && (
      <div className="kb-sheet" role="presentation">
        <button type="button" className="kb-sheet__backdrop" onClick={() => setSheetOpen(false)} aria-label="Close the ticket" />
        <section className="kb-sheet__panel" role="dialog" aria-modal="true" aria-label={isTransfer ? "Transfer ticket" : "Request ticket"}>
          <header className="kb-sheet__head">
            <p className="kg-label">{title}</p>
            <button type="button" className="kg-chip kb-sheet__close" onClick={() => setSheetOpen(false)} aria-label="Close the ticket"><X size={18} /></button>
          </header>
          <div className="kb-sheet__body">{ticket}</div>
        </section>
      </div>
    )}
  </main>;
}
