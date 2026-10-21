import { ChevronDown, Minus, Plus, X } from "lucide-react";
import "./OrderTicket.css";

const qty = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });

/**
 * Receipt-style list of what the cook has added, with no prices: one row per item with its own stepper, so the whole
 * request or usage entry is visible at once. Folds away on a phone; wide screens show it beside the list.
 * rows: [{ id, name, amount, unit, locked? }] in the order they were added. meta: [{ label, value }] shown under the title.
 */
export default function OrderTicket({ title = "Order ticket", rows = [], meta = [], emptyText = "Tap “Add” on an item below and it will be listed here.", open = true, onToggle, onChange, onClear, clearLabel = "Remove all items" }) {
  const count = rows.length;
  return <section className="kt-ticket" id="kitchen-ticket" aria-labelledby="kt-ticket-title">
    <button type="button" className="kt-ticket__head" onClick={onToggle} aria-expanded={open} aria-controls="kt-ticket-body">
      <span><p>{title}</p><h2 id="kt-ticket-title">{count === 0 ? "Nothing added yet" : `${count} ${count === 1 ? "item" : "items"}`}</h2></span>
      <ChevronDown size={20} className={open ? "is-open" : ""} aria-hidden="true" />
    </button>
    {open && <div id="kt-ticket-body">
      {meta.filter((entry) => entry.value).map((entry) => <dl key={entry.label} className="kt-ticket__meta"><dt>{entry.label}</dt><dd>{entry.value}</dd></dl>)}
      {count === 0
        ? <p className="kt-ticket__empty">{emptyText}</p>
        : <ul className="kt-ticket__rows" aria-label={`Items on this ${title.toLowerCase()}`}>
          <li className="kt-ticket__cols" aria-hidden="true"><span>Item</span><span>Qty</span></li>
          {rows.map((row) => <li key={row.id}>
            <div className="kt-ticket__name"><strong>{row.name}</strong><small>{row.unit}{row.locked ? " · approved" : ""}</small></div>
            <div className="kt-ticket__stepper">
              <button type="button" disabled={row.locked} onClick={() => onChange(row.id, Math.max(0, row.amount - 1))} aria-label={row.amount <= 1 ? `Remove ${row.name}` : `Less ${row.name}`}>{row.amount <= 1 ? <X size={15} /> : <Minus size={15} />}</button>
              <b>{qty(row.amount)}</b>
              <button type="button" disabled={row.locked} onClick={() => onChange(row.id, row.amount + 1)} aria-label={`More ${row.name}`}><Plus size={15} /></button>
            </div>
          </li>)}
        </ul>}
      {onClear && rows.some((row) => !row.locked) && <button type="button" className="kt-ticket__clear" onClick={onClear}>{clearLabel}</button>}
    </div>}
  </section>;
}
