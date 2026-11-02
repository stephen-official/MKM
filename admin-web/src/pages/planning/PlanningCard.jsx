import { useId, useState } from "react";
import { Check, ChevronDown, Edit3, Lock, X } from "lucide-react";
import { lineLabel } from "../sharedOrders/sharedOrders.js";
import {
  ORDER_STEPS, allItems, closingRange, dayText, fromIstInput, kitchenCount, orderTitle, planningStep, timeLeft, toIstInput,
} from "./planning.js";

/** Open to join → Needs approval → Ordered → On the way → Delivered, with the current step lit and named underneath. */
function StepTracker({ step, caption }) {
  return (
    <div className="pl-steps">
      <ol className="pl-steps__track" aria-label={`Status: ${ORDER_STEPS[step]}`}>
        {ORDER_STEPS.map((label, index) => (
          <li key={label} className={index < step ? "is-done" : index === step ? "is-current" : ""} title={label}>
            <span className="pl-steps__dot" aria-hidden="true" />
            <span className="sr-only">{label}{index === step ? " (now)" : ""}</span>
          </li>
        ))}
      </ol>
      <span className={`pl-steps__caption pl-steps__caption--${step}`}>{caption}</span>
    </div>
  );
}

/**
 * One kitchen order still being gathered, as a fold-out glass card. Closed: its name (the needed-by day), who started it,
 * Urgent, a status tracker, and how many items and kitchens. Opened: each kitchen's tile, all items with totals, and the
 * ordering window (Close now; super-admins also change the closing time).
 */
export function PlanningCard({ order, now, open, onToggle, canChangeClosing, busy, onClose, onMoveClosing }) {
  const bodyId = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const range = closingRange(order, now);
  const isOpen = order.status === "open";
  const step = planningStep(order);
  const items = allItems(order);
  const kitchens = kitchenCount(order);
  const picked = fromIstInput(draft);
  const inRange = picked && range && new Date(picked) > now && new Date(picked) <= range.max;

  const startEdit = () => { setDraft(toIstInput(order.closesAt || range.max)); setEditing(true); };
  const save = async (event) => {
    event.preventDefault();
    if (!inRange || busy) return;
    if (await onMoveClosing(order, picked)) setEditing(false);
  };

  return (
    <li className={`kg-glass pl-card${order.emergency ? " kg-glass--rose" : ""}${open ? " pl-card--open" : ""}`}>
      <button type="button" className="pl-card__head" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
        <span className="pl-card__top">
          <strong className="pl-card__title">{orderTitle(order)}</strong>
          {order.emergency && <span className="kg-pill kg-pill--expired">Urgent</span>}
        </span>
        <small className="pl-card__who">Started by {order.createdByGodown?.name || "a kitchen"}</small>
        <StepTracker step={step} caption={isOpen ? `Open to join · ${timeLeft(order.closesAt, now)}` : "Needs approval"} />
        <span className="pl-card__foot">
          <span>{items.length} {items.length === 1 ? "item" : "items"} · {kitchens} {kitchens === 1 ? "kitchen" : "kitchens"}</span>
          <ChevronDown size={20} className="pl-card__chevron" aria-hidden="true" />
        </span>
      </button>

      {open && (
        <div className="pl-card__body" id={bodyId}>
          <section className="kp-section" aria-label="Each kitchen">
            <div className="kp-section__head"><h3>Each kitchen</h3></div>
            <ul className="pl-shares">
              {(order.contributions || []).map((share) => (
                <li key={share._id || share.godownId?._id} className="kg-row pl-share">
                  <strong className="pl-share__name">{share.godownId?.name || "Kitchen"}</strong>
                  <ul className="pl-lines">
                    {(share.items || []).map((line) => (
                      <li key={`${line.stockItemId?._id || line.stockItemId}:${line.packId || "base"}`}>
                        <span>{line.stockItemId?.name || "Product"}</span>
                        <span className="pl-lines__qty">{lineLabel(line)}</span>
                      </li>
                    ))}
                  </ul>
                  {share.note && <p className="pl-share__note">“{share.note}”</p>}
                </li>
              ))}
            </ul>
          </section>

          <section className="kp-section" aria-label="All items">
            <div className="kp-section__head"><h3>All items</h3></div>
            <ul className="kg-row pl-lines pl-total">
              {items.map((item) => (
                <li key={item.id}>
                  <span>{item.name}</span>
                  <span className="pl-total__qty">
                    <strong>{item.total}</strong>
                    {item.parts.length > 0 && <small>({item.parts.join(" + ")})</small>}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="kp-section" aria-label="Ordering window">
            <div className="kp-section__head">
              <h3>Ordering window</h3>
              {isOpen && !editing && (
                <span className="kp-section__actions">
                  {canChangeClosing && range && (
                    <button type="button" className="kg-chip kp-icon kp-chip--edit" disabled={busy} onClick={startEdit} aria-label="Change closing time" title="Change closing time"><Edit3 size={16} aria-hidden="true" /></button>
                  )}
                  <button type="button" className="kg-chip pl-close" disabled={busy} onClick={() => onClose(order)}><Lock size={14} aria-hidden="true" /> Close now</button>
                </span>
              )}
            </div>
            {editing ? (
              <form className="pl-closing" onSubmit={save}>
                <label className="kp-field">
                  <span>Close on (India time)</span>
                  <input type="datetime-local" value={draft} min={toIstInput(range?.min || now)} max={range ? toIstInput(range.max) : undefined}
                    onChange={(e) => setDraft(e.target.value)} autoFocus />
                </label>
                <p className={draft && !inRange ? "pl-error" : "kp-hint"} role={draft && !inRange ? "alert" : undefined}>
                  Latest: {range ? dayText(range.max, true) : "—"}
                </p>
                <span className="kp-section__actions pl-closing__actions">
                  <button type="button" className="kg-chip kp-icon kp-chip--cancel" disabled={busy} onClick={() => setEditing(false)} aria-label="Cancel" title="Cancel"><X size={18} aria-hidden="true" /></button>
                  <button type="submit" className="kg-chip kp-icon kp-chip--save" disabled={busy || !inRange} aria-label="Save closing time" title="Save"><Check size={18} aria-hidden="true" /></button>
                </span>
              </form>
            ) : (
              <p className="kp-hint">{isOpen ? <>Closes <strong>{dayText(order.closesAt, true)}</strong></> : "Closed to new items"}</p>
            )}
          </section>
        </div>
      )}
    </li>
  );
}
