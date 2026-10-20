import { ArrowLeft, Boxes, Check, ChevronRight, MapPin, Minus, Plus, Search, Send, X } from "lucide-react";
import { useState } from "react";
import "./KitchenTransactions.css";
import { productPacks } from "../../features/kitchen";
import { useConfirm } from "../ui/ConfirmDialog";
import Select from "../ui/Select";
import OrderTicket from "./OrderTicket";

const idOf = (item) => item.stockRecordId || item.stockItemId || item._id;
const amountOf = (entry) => {
  const value = Number(entry?.requestedQty);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

/**
 * Pick items for a stock transfer (or an old-style supply request). What is added builds up in a receipt-style ticket;
 * a transfer is sent straight from the ticket once a destination is chosen, a request still goes through the review step.
 */
export default function KitchenItemBuilder({ type, items = [], cart = [], loading, search, onSearch, onQuantityChange, onPackagingChange, onCancel,
  destination = "", destinations = [], currentGodownId, onDestinationChange, onClear, onSubmit, onReview, submitting = false }) {
  const isTransfer = type === "transfer";
  const [ticketOpen, setTicketOpen] = useState(true);
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
  const showTicket = () => {
    setTicketOpen(true);
    document.getElementById("kitchen-ticket")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const destinationName = destinations.find((candidate) => String(candidate._id) === String(destination))?.name || "";
  const canSend = count > 0 && !submitting && (!isTransfer || Boolean(destination));

  return <main className="ktb-shell">
    {confirmDialog}
    <button type="button" className="ktb-back" onClick={onCancel}><ArrowLeft size={18} /> {isTransfer ? "Back to transfers" : "Back to requests"}</button>
    <header className="ktb-heading">
      <span aria-hidden="true">{isTransfer ? <Send size={24} /> : <Boxes size={24} />}</span>
      <div><p>{isTransfer ? "Between kitchens" : "Kitchen supplies"}</p><h1>{isTransfer ? "Create stock transfer" : "Create supply request"}</h1><small>{isTransfer ? "Choose the kitchen and the items to send." : "Choose the supplies your kitchen needs."}</small></div>
    </header>

    <div className="ktb-layout">
      <OrderTicket title={isTransfer ? "Transfer ticket" : "Request ticket"} rows={rows}
        meta={isTransfer ? [{ label: "Send to", value: destinationName || "Choose a kitchen below" }] : []}
        emptyText="Tap “Add” on a supply below and it will be listed here." open={ticketOpen} onToggle={() => setTicketOpen((value) => !value)}
        onChange={changeRow} onClear={onClear ? clearTicket : undefined} />

      <div className="ktb-main">
        {isTransfer && <label className="ktb-destination"><span><MapPin size={17} aria-hidden="true" /> Send to</span>
          <Select value={destination} required onChange={(event) => onDestinationChange?.(event.target.value)}>
            <option value="">Choose a kitchen</option>
            {destinations.filter((candidate) => candidate._id !== currentGodownId).map((candidate) => <option key={candidate._id} value={candidate._id}>{candidate.name}</option>)}
          </Select></label>}
        <label className="ktb-search"><Search size={20} /><span className="ktb-sr-only">Search supplies</span><input type="search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search supplies" />{search && <button type="button" onClick={() => onSearch("")} aria-label="Clear search"><X size={18} /></button>}</label>
        {loading ? <div className="ktb-state">Loading supplies…</div> : items.length === 0 ? <div className="ktb-state"><Search size={28} /><strong>No supplies found</strong><span>Try another item name.</span></div> : <section className="ktb-list" aria-label="Available supplies">
          {items.map((item) => {
            const selected = entryFor(item);
            const raw = selected?.requestedQty ?? "";
            const quantity = Number(raw || 0);
            const unit = item.unit || "units";
            const packs = productPacks(item);
            const entryUnit = selected?.packName || unit;
            const available = Number(item.currentQty || 0);
            return <article className={`ktb-card${quantity > 0 ? " ktb-card--selected" : ""}`} key={idOf(item)}>
              <div className="ktb-card__identity"><span aria-hidden="true">{String(item.name || "?").charAt(0)}</span><div><h2>{item.name}</h2>{isTransfer && <p>Available: {available.toLocaleString("en-IN", { maximumFractionDigits: 3 })} {unit}</p>}</div></div>
              <div className="ktb-entry"><label htmlFor={`builder-${idOf(item)}`}>Quantity</label>{packs.length > 0 && !isTransfer && <select aria-label={`Packaging for ${item.name}`} value={selected?.packId || "base"} onChange={(event) => onPackagingChange?.(item, event.target.value)}><option value="base">{unit}</option>{packs.map((pack) => <option key={pack._id} value={pack._id}>{pack.name} ({pack.size} {unit})</option>)}</select>}
                {quantity > 0
                  ? <div><button type="button" onClick={() => setAmount(item, Math.max(0, quantity - 1))} aria-label={quantity <= 1 ? `Remove ${item.name}` : `Decrease ${item.name}`}>{quantity <= 1 ? <X size={17} /> : <Minus size={17} />}</button><input id={`builder-${idOf(item)}`} type="text" inputMode="decimal" value={raw} placeholder="0" onChange={(event) => onQuantityChange(item, event.target.value)} /><span>{entryUnit}</span><button type="button" onClick={() => onQuantityChange(item, quantity + 1)} aria-label={`Increase ${item.name}`}><Plus size={17} /></button></div>
                  : <button type="button" className="kt-add" onClick={() => setAmount(item, isTransfer ? Math.min(1, available) : 1)} disabled={isTransfer && available <= 0} aria-label={`Add ${item.name}`}><Plus size={17} aria-hidden="true" /> Add<span>{entryUnit}</span></button>}
              </div>
            </article>;
          })}
        </section>}
      </div>
    </div>

    <footer className="ktb-submit">
      <button type="button" className="ktb-submit__count" onClick={showTicket} aria-label={`${count} ${count === 1 ? "item" : "items"} on the ticket. Show the ticket.`}><strong>{count}</strong><span>{count === 1 ? "item" : "items"} · view ticket</span></button>
      {isTransfer
        ? <button type="button" className="ktb-submit__go" onClick={onSubmit} disabled={!canSend}>{submitting ? "Sending…" : "Send transfer"}<Check size={18} aria-hidden="true" /></button>
        : <button type="button" className="ktb-submit__go" onClick={onReview} disabled={count === 0}>Review &amp; continue<ChevronRight size={18} aria-hidden="true" /></button>}
    </footer>
  </main>;
}
