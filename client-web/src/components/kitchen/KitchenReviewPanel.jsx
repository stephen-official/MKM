import { CalendarDays, MapPin, Minus, Plus, Trash2, X } from "lucide-react";
import { toLocalDateKey } from "../../utils/date";
import "./KitchenTransactions.css";
import Select from "../ui/Select";

export default function KitchenReviewPanel({ type, items = [], usageDate, onUsageDateChange, requestDate, onRequestDateChange, reason, onReasonChange, destination, onDestinationChange, destinations = [], currentGodownId, onQuantityChange, onRemove, onClose, onSubmit }) {
  const isUsage = type === "usage";
  const isTransfer = type === "transfer";
  const title = isUsage ? "Review usage" : isTransfer ? "Review stock transfer" : "Review supply request";
  const submitLabel = isUsage ? "Record usage" : isTransfer ? "Send transfer" : "Submit request";
  const visibleItems = items.filter((item) => Number(item.requestedQty ?? item.qtyBaseUnit) > 0);
  return <div className="ktr-layer" role="presentation"><button type="button" className="ktr-backdrop" onClick={onClose} aria-label="Close review" /><section className="ktr-panel" role="dialog" aria-modal="true" aria-labelledby="review-title">
    <header><div><p>Final check</p><h2 id="review-title">{title}</h2></div><button type="button" onClick={onClose} aria-label="Close"><X size={22} /></button></header>
    <div className="ktr-content">
      <section className="ktr-details" aria-label="Transaction details">
        {isUsage && <label><span><CalendarDays size={17} /> Usage date</span><input type="date" value={usageDate} max={toLocalDateKey()} required onChange={(event) => onUsageDateChange(event.target.value)} /></label>}
        {!isUsage && !isTransfer && <><label><span><CalendarDays size={17} /> Needed by</span><input type="date" value={requestDate} min={toLocalDateKey()} onChange={(event) => onRequestDateChange(event.target.value)} /></label><label className="ktr-note"><span>Reason for request</span><textarea rows="3" value={reason} placeholder="Why are these supplies needed?" onChange={(event) => onReasonChange(event.target.value)} /></label></>}
        {isTransfer && <label><span><MapPin size={17} /> Destination kitchen</span><Select value={destination} required onChange={(event) => onDestinationChange(event.target.value)}><option value="">Choose a kitchen</option>{destinations.filter((item) => item._id !== currentGodownId).map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</Select></label>}
      </section>
      <section className="ktr-items" aria-labelledby="review-items-title"><div className="ktr-items__heading"><h3 id="review-items-title">Selected items</h3><span>{visibleItems.length}</span></div>{visibleItems.map((item) => {
        const quantity = Number(item.requestedQty ?? item.qtyBaseUnit ?? 0);
        const unit = item.packName || item.unit || "units";
        return <article key={item.stockRecordId || item.stockItemId || item._id}><span className="ktr-avatar" aria-hidden="true">{String(item.name || "?").charAt(0)}</span><div className="ktr-item-name"><strong>{item.name}</strong><small>{unit}</small></div><div className="ktr-stepper"><button type="button" onClick={() => onQuantityChange(item, Math.max(0, quantity - 1))} aria-label={`Decrease ${item.name}`}><Minus size={15} /></button><b>{quantity.toLocaleString("en-IN", { maximumFractionDigits: 3 })}</b><button type="button" onClick={() => onQuantityChange(item, quantity + 1)} aria-label={`Increase ${item.name}`}><Plus size={15} /></button></div><button type="button" className="ktr-remove" onClick={() => onRemove(item)} aria-label={`Remove ${item.name}`}><Trash2 size={17} /></button></article>;
      })}</section>
    </div>
    <footer><div><strong>{visibleItems.length}</strong><span>{visibleItems.length === 1 ? "item selected" : "items selected"}</span></div><button type="button" onClick={onSubmit} disabled={!visibleItems.length || (isTransfer && !destination) || (!isUsage && !isTransfer && !reason.trim())}>{submitLabel}</button></footer>
  </section></div>;
}
