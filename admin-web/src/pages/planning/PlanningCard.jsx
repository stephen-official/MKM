import { useId, useState } from "react";
import { CalendarClock, Check, ChevronDown, Clock, Edit3, Lock, Package, X } from "lucide-react";
import { closesInText, lineLabel } from "../sharedOrders/sharedOrders.js";
import { closingRange, dayText, fromIstInput, kitchenNames, productSummary, toIstInput } from "./planning.js";

/**
 * One kitchen order still being gathered, as a fold-out glass card. Closed, it shows what the order is at a glance:
 * a few products, the kitchens, needed-by, how many items and when joining closes. Opened: each kitchen's items and the
 * ordering window (Close now for admins; Change closing time for super-admins).
 */
export function PlanningCard({ order, now, open, onToggle, canChangeClosing, busy, onClose, onMoveClosing }) {
  const bodyId = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const range = closingRange(order, now);
  const isOpen = order.status === "open";
  const kitchens = kitchenNames(order);
  const items = order.combinedItems?.length || 0;
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
        <span className="pl-card__main">
          <strong className="pl-card__products">{productSummary(order)}</strong>
          <small className="pl-card__who">
            {kitchens.join(" · ") || "No kitchen"}
            {order.createdBy?.name && <> · opened by {order.createdBy.name}</>}
          </small>
          <span className="pl-card__facts">
            {order.emergency && <span className="kg-pill kg-pill--expired">Urgent</span>}
            <span className="pl-fact"><CalendarClock size={14} aria-hidden="true" /> Needed by {dayText(order.neededBy, order.emergency)}</span>
            <span className="pl-fact"><Package size={14} aria-hidden="true" /> {items} {items === 1 ? "item" : "items"}</span>
            {isOpen
              ? <span className="kg-pill kg-pill--low"><Clock size={12} aria-hidden="true" /> {closesInText(order.closesAt, now)}</span>
              : <span className="kg-pill kg-pill--routine"><Lock size={12} aria-hidden="true" /> Closed · waiting for approval</span>}
          </span>
        </span>
        <ChevronDown size={20} className="pl-card__chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="pl-card__body" id={bodyId}>
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
                  <span>Close joining on</span>
                  <input type="datetime-local" value={draft} min={toIstInput(range?.min || now)} max={range ? toIstInput(range.max) : undefined}
                    onChange={(e) => setDraft(e.target.value)} autoFocus />
                </label>
                <p className="kp-hint">India time. Latest: {range ? dayText(range.max, true) : "—"} (2 days before it is needed).</p>
                {draft && !inRange && <p className="pl-error" role="alert">Pick a time between now and {range ? dayText(range.max, true) : "2 days before needed-by"}.</p>}
                <span className="kp-section__actions pl-closing__actions">
                  <button type="button" className="kg-chip kp-icon kp-chip--cancel" disabled={busy} onClick={() => setEditing(false)} aria-label="Cancel" title="Cancel"><X size={18} aria-hidden="true" /></button>
                  <button type="submit" className="kg-chip kp-icon kp-chip--save" disabled={busy || !inRange} aria-label="Save closing time" title="Save"><Check size={18} aria-hidden="true" /></button>
                </span>
              </form>
            ) : (
              <p className="kp-hint">
                {isOpen
                  ? <>Kitchens can join until <strong>{dayText(order.closesAt, true)}</strong>.{canChangeClosing && !range && " It is needed within 2 days, so it can only be closed now."}</>
                  : <>Closed {order.statusChangedBy?.name ? `by ${order.statusChangedBy.name}` : "automatically"}{order.statusChangedAt ? ` on ${dayText(order.statusChangedAt, true)}` : ""}. No kitchen can add or change items.</>}
              </p>
            )}
          </section>

          <section className="kp-section" aria-label="Items by kitchen">
            <div className="kp-section__head"><h3>Items by kitchen</h3></div>
            <ul className="pl-shares">
              {(order.contributions || []).map((share) => (
                <li key={share._id || share.godownId?._id} className="kg-row pl-share">
                  <div className="pl-share__head">
                    <strong>{share.godownId?.name || "Kitchen"}</strong>
                    {share.userId?.name && <small>{share.userId.name}</small>}
                  </div>
                  <ul className="pl-lines">
                    {(share.items || []).map((line) => (
                      <li key={`${line.stockItemId?._id || line.stockItemId}:${line.packId || "base"}`}>
                        <span>{line.stockItemId?.name || "Product"}</span>
                        <span className="pl-lines__qty">{lineLabel(line)}</span>
                      </li>
                    ))}
                  </ul>
                  {share.note && <p className="kp-hint">“{share.note}”</p>}
                </li>
              ))}
            </ul>
            <p className="kp-hint">To approve, use Orders &amp; receiving → Shared orders.</p>
          </section>
        </div>
      )}
    </li>
  );
}
