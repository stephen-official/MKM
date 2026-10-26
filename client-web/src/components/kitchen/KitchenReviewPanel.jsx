import { CalendarDays, MapPin, Minus, Plus, Trash2, X } from "lucide-react";
import { useEffect } from "react";
import { toLocalDateKey } from "../../utils/date";
import { lockBodyScroll } from "../../utils/scrollLock";
import "./KitchenReviewPanel.css";
import Select from "../ui/Select";
import DateField from "../ui/DateField";

const qty = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });

/** Final check before an old-style supply request (or a legacy usage / transfer entry) is sent: the details, then every item
 *  with its own stepper. A glass sheet on a phone, a centred glass card from 700px. */
export default function KitchenReviewPanel({ type, items = [], usageDate, onUsageDateChange, requestDate, onRequestDateChange, reason, onReasonChange, destination, onDestinationChange, destinations = [], currentGodownId, onQuantityChange, onRemove, onClose, onSubmit }) {
  const isUsage = type === "usage";
  const isTransfer = type === "transfer";
  const isRequest = !isUsage && !isTransfer;
  const title = isUsage ? "Review usage" : isTransfer ? "Review stock transfer" : "Review supply request";
  const submitLabel = isUsage ? "Record usage" : isTransfer ? "Send transfer" : "Submit request";
  const visibleItems = items.filter((item) => Number(item.requestedQty ?? item.qtyBaseUnit) > 0);
  const count = visibleItems.length;
  const blocked = !count || (isTransfer && !destination) || (isRequest && !reason.trim());
  // Escape closes the panel and nothing underneath it (the builder's ticket sheet also listens): this listener runs first,
  // in the capture phase, and marks the key as handled. An open dropdown menu keeps Escape for itself. The page behind
  // does not scroll while the panel is open.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape" || document.querySelector(".custom-select__menu")) return;
      event.preventDefault();
      onClose();
    };
    const unlock = lockBodyScroll();
    document.addEventListener("keydown", onKey, true);
    return () => { unlock(); document.removeEventListener("keydown", onKey, true); };
  }, [onClose]);

  return <div className="kv-layer" role="presentation">
    <button type="button" className="kv-backdrop" onClick={onClose} aria-label="Close review" />
    <section className="kv-panel" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <header className="kv-head">
        <div><p className="kg-label">Final check</p><h2 id="review-title">{title}</h2></div>
        <button type="button" className="kg-chip kv-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
      </header>
      <div className="kv-body">
        <section className="kg-glass kv-details" aria-label="Transaction details">
          {isUsage && <label className="kv-field"><span><CalendarDays size={15} aria-hidden="true" /> Usage date</span><DateField value={usageDate} max={toLocalDateKey()} required label="Usage date" onChange={onUsageDateChange} /></label>}
          {isRequest && <>
            <label className="kv-field"><span><CalendarDays size={15} aria-hidden="true" /> Needed by</span><DateField value={requestDate} min={toLocalDateKey()} label="Needed by" onChange={onRequestDateChange} /></label>
            <label className="kv-field"><span>Reason for request</span><textarea rows="3" value={reason} maxLength={500} placeholder="Why are these supplies needed?" onChange={(event) => onReasonChange(event.target.value)} /></label>
          </>}
          {isTransfer && <label className="kv-field"><span><MapPin size={15} aria-hidden="true" /> Destination kitchen</span>
            <Select value={destination} required aria-label="Destination kitchen" placeholder="Choose a kitchen" onChange={(event) => onDestinationChange(event.target.value)}>
              <option value="">Choose a kitchen</option>
              {destinations.filter((item) => item._id !== currentGodownId).map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
            </Select></label>}
        </section>

        <section className="kv-items" aria-labelledby="review-items-title">
          <div className="kv-items__head"><h3 id="review-items-title">Selected items</h3><span>{count}</span></div>
          {count === 0 && <p className="kg-glass kv-empty">Nothing selected yet.</p>}
          <ul className="kv-rows">
            {visibleItems.map((item) => {
              const quantity = Number(item.requestedQty ?? item.qtyBaseUnit ?? 0);
              const unit = item.packName || item.unit || "units";
              return <li key={item.stockRecordId || item.stockItemId || item._id} className="kg-row">
                <div className="kv-row__name"><strong>{item.name}</strong><small>{unit}</small></div>
                <div className="kv-stepper">
                  <button type="button" onClick={() => onQuantityChange(item, Math.max(0, quantity - 1))} aria-label={`Less ${item.name}`}><Minus size={15} /></button>
                  <b>{qty(quantity)}</b>
                  <button type="button" onClick={() => onQuantityChange(item, quantity + 1)} aria-label={`More ${item.name}`}><Plus size={15} /></button>
                </div>
                <button type="button" className="kv-remove" onClick={() => onRemove(item)} aria-label={`Remove ${item.name}`}><Trash2 size={16} /></button>
              </li>;
            })}
          </ul>
        </section>
      </div>
      <footer className="kv-foot">
        {isRequest && count > 0 && !reason.trim() && <p className="kv-note" role="status">Add a short reason before you send</p>}
        <button type="button" className="kg-btn kv-submit" onClick={onSubmit} disabled={blocked}>{submitLabel}</button>
      </footer>
    </section>
  </div>;
}
