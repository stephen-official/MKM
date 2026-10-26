import { ChevronDown, Minus, Plus, X } from "lucide-react";
import { useState } from "react";
import "./OrderTicket.css";

const qty = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });

/** The row's count, typed straight into the ticket. The box keeps what is typed while it has focus (even empty or "2."),
 *  commits every valid amount at once, and removes the row if it is left empty. */
function TicketQty({ row, onChange }) {
  const [draft, setDraft] = useState(null);
  // The screen may cap what was typed (no more than the stock): a finished number that the screen did not accept as is snaps
  // to the real amount, so the box never shows more than is on the ticket.
  if (draft !== null && Number(draft) > 0 && !draft.endsWith(".") && Number(draft) !== row.amount) setDraft(String(row.amount));
  const edit = (value) => {
    if (!/^\d*(\.\d{0,3})?$/.test(value)) return;
    setDraft(value);
    if (Number(value) > 0 && !value.endsWith(".")) onChange(row.id, Number(value));
  };
  const done = () => {
    if (draft !== null && !(Number(draft) > 0)) onChange(row.id, 0);
    setDraft(null);
  };
  // A row added from Home has no amount yet: the box is empty with a "0" placeholder until something is typed.
  const shown = row.amount > 0 ? qty(row.amount) : "";
  return <input type="text" inputMode="decimal" value={draft ?? shown} placeholder="0" disabled={row.locked} aria-label={`${row.name} quantity`}
    onFocus={(event) => { setDraft(row.amount > 0 ? String(row.amount) : ""); event.target.select(); }} onChange={(event) => edit(event.target.value)} onBlur={done} />;
}

/**
 * Receipt-style list of what the cook has added, with no prices: one row per item with its own stepper, so the whole
 * request or usage entry is visible at once. Folds away on a phone; wide screens show it beside the list.
 * rows: [{ id, name, amount, unit, locked?, needsQty? }] in the order they were added; needsQty marks an item added from Home
 * that still has no amount. meta: [{ label, value }] shown under the title.
 */
export default function OrderTicket({ title = "Order ticket", rows = [], meta = [], emptyText = "Tap “Add” on an item below and it will be listed here.", open = true, onToggle, onChange, onClear, clearLabel = "Remove all items",
  onSubmit, submitLabel = "Done", submittingLabel = "Saving…", submitting = false, submitDisabled = false, note = "" }) {
  const count = rows.length;
  const heading = <span><p>{title}</p><h2 id="kt-ticket-title">{count === 0 ? "Nothing added yet" : `${count} ${count === 1 ? "item" : "items"}`}</h2></span>;
  return <section className="kg-glass kt-ticket" id="kitchen-ticket" aria-labelledby="kt-ticket-title">
    {onToggle
      ? <button type="button" className="kt-ticket__head" onClick={onToggle} aria-expanded={open} aria-controls="kt-ticket-body">{heading}<ChevronDown size={20} className={open ? "is-open" : ""} aria-hidden="true" /></button>
      : <div className="kt-ticket__head">{heading}</div>}
    {open && <div id="kt-ticket-body">
      {meta.filter((entry) => entry.value).map((entry) => <dl key={entry.label} className="kt-ticket__meta"><dt>{entry.label}</dt><dd>{entry.value}</dd></dl>)}
      {count === 0
        ? <p className="kt-ticket__empty">{emptyText}</p>
        : <ul className="kt-ticket__rows" aria-label={`Items on this ${title.toLowerCase()}`}>
          <li className="kt-ticket__cols" aria-hidden="true"><span>Item</span><span>Qty</span></li>
          {rows.map((row) => <li key={row.id} className={row.needsQty ? "kt-ticket__row--needs" : undefined}>
            <div className="kt-ticket__name"><strong>{row.name}</strong><small>{row.needsQty ? <em>Enter quantity · </em> : null}{row.unit}{row.locked ? " · approved" : ""}</small></div>
            <div className="kt-ticket__stepper">
              <button type="button" disabled={row.locked} onClick={() => onChange(row.id, Math.max(0, row.amount - 1))} aria-label={row.amount <= 1 ? `Remove ${row.name}` : `Less ${row.name}`}>{row.amount <= 1 ? <X size={15} /> : <Minus size={15} />}</button>
              <TicketQty row={row} onChange={onChange} />
              <button type="button" disabled={row.locked} onClick={() => onChange(row.id, row.amount + 1)} aria-label={`More ${row.name}`}><Plus size={15} /></button>
            </div>
          </li>)}
        </ul>}
      {note && <p className="kt-ticket__note" role="status">{note}</p>}
      {onSubmit && <button type="button" className="kg-btn kt-ticket__submit" disabled={count === 0 || submitting || submitDisabled} onClick={onSubmit}>{submitting ? submittingLabel : submitLabel}</button>}
      {onClear && rows.some((row) => !row.locked) && <button type="button" className="kt-ticket__clear" onClick={onClear}>{clearLabel}</button>}
    </div>}
  </section>;
}
