import { useId } from "react";
import { ChevronDown, Clock, Edit3, Lock } from "lucide-react";
import { lineLabel } from "../sharedOrders/sharedOrders.js";
import {
  ORDER_STEPS, allItems, closingRange, dayText, kitchenCount, orderTitle, planningStep, timeLeft,
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
 * Urgent, a status tracker, and how many items and kitchens. Opened: the ordering window first (Close now), then each
 * kitchen's tile and all items with totals. Super-admins also change the closing time and, until approval, each kitchen's items.
 */
export function PlanningCard({ order, now, open, onToggle, superAdmin, busy, onClose, onChangeClosing, onEditItems }) {
  const bodyId = useId();
  const range = closingRange(order, now);
  const isOpen = order.status === "open";
  const step = planningStep(order);
  const items = allItems(order);
  const kitchens = kitchenCount(order);

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
          <section className="kg-row pl-window" aria-label="Ordering window">
            <div className="pl-window__text">
              <span className="pl-window__label">Ordering window</span>
              <strong>{isOpen ? `Kitchens can join until ${dayText(order.closesAt, true)}` : "Closed · no kitchen can add or change items"}</strong>
              {isOpen && <small>{timeLeft(order.closesAt, now)}{superAdmin && !range ? " · needed within 2 days, so it can only be closed" : ""}</small>}
            </div>
            {isOpen && (
              <div className="pl-window__actions">
                {superAdmin && range && (
                  <button type="button" className="kg-chip pl-window__change" disabled={busy} onClick={() => onChangeClosing(order)}><Clock size={14} aria-hidden="true" /> Change time</button>
                )}
                <button type="button" className="kg-chip pl-close" disabled={busy} onClick={() => onClose(order)}><Lock size={14} aria-hidden="true" /> Close now</button>
              </div>
            )}
          </section>

          <section className="kp-section" aria-label="Each kitchen">
            <div className="kp-section__head"><h3>Each kitchen</h3></div>
            <ul className="pl-shares">
              {(order.contributions || []).map((share) => {
                const kitchenId = String(share.godownId?._id || share.godownId);
                const canEdit = superAdmin && !share.approvedAt;
                return (
                <li key={share._id || kitchenId} className="kg-row pl-share">
                  <div className="pl-share__head">
                    <strong className="pl-share__name">{share.godownId?.name || "Kitchen"}</strong>
                    {canEdit && (
                      <button type="button" className="kg-chip kp-icon kp-chip--edit" disabled={busy} onClick={() => onEditItems(order, share)}
                        aria-label={`Change ${share.godownId?.name || "this kitchen"}'s items`} title="Change items"><Edit3 size={16} aria-hidden="true" /></button>
                    )}
                  </div>
                  {share.adminChange && <small className="pl-share__changed">Changed by you · kitchen has not looked yet</small>}
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
                );
              })}
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

        </div>
      )}
    </li>
  );
}
