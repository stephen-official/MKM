import { AlertCircle, AlertTriangle, ArrowRight, CalendarDays, CalendarOff, CheckCircle2, ChevronDown, Truck } from "lucide-react";
import { useState } from "react";
import { toLocalDateKey, localDateFromKey } from "../../utils/date";
import { expiryStatus, itemsToUseFirst } from "../../features/kitchen";
import { deliveryDateText, kitchenStage, myOrders, orderTimeline } from "../../features/kitchen/orders";
import "./KitchenHome.css";

const OPEN_REQUEST_STATUSES = new Set([
  "pending",
  "submitted",
  "under_review",
  "approved",
  "partially_approved",
  "confirmed",
  "dispatched",
  "partially_received",
]);

const RECEIVABLE_STATUSES = new Set([
  "approved",
  "confirmed",
  "dispatched",
  "partially_received",
]);

const NO_HIDDEN = new Set();
const NO_ORDERS = [];

const asNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const statusOf = (record) => String(record?.status || "").toLowerCase();

const remainingToReceive = (line) => {
  const approved = asNumber(
    line?.approvedQty ?? line?.approvedQuantity ?? line?.qtyBaseUnit ?? line?.requestedQty ?? line?.quantity,
  );
  const received = asNumber(line?.receivedQty ?? line?.receivedQuantity);
  return Math.max(approved - received, 0);
};

const isReceivable = (indent) => {
  if (!RECEIVABLE_STATUSES.has(statusOf(indent))) return false;
  if (!Array.isArray(indent?.items) || indent.items.length === 0) return true;
  return indent.items.some((line) => {
    const lineStatus = statusOf(line);
    return (!lineStatus || ["approved", "confirmed", "dispatched", "partially_received"].includes(lineStatus)) &&
      remainingToReceive(line) > 0;
  });
};

// Built by hand rather than with Intl, whose output differs between phone browsers.
const LONG_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const longDate = (dateKey) => {
  const date = localDateFromKey(dateKey);
  return date ? `${LONG_DAYS[date.getDay()]}, ${date.getDate()} ${LONG_MONTHS[date.getMonth()]}` : "";
};

const REASONS = [["closed", "Closed"], ["holiday", "Holiday"], ["other", "Other"]];
const REASON_LABEL = Object.fromEntries(REASONS);

/** "No usage" needs a reason: three chips and a confirm, shown right where the cook tapped. */
function NoUsagePicker({ date, onConfirm, onCancel }) {
  const [reason, setReason] = useState("closed");
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    const ok = await onConfirm(date, reason);
    if (!ok) setBusy(false);
  };
  return (
    <div className="kh-nouse" role="group" aria-label="Why was nothing used?">
      <span className="kg-label">Why was nothing used?</span>
      <div className="kh-nouse__chips">
        {REASONS.map(([key, label]) => <button type="button" key={key} className={`kh-chip${reason === key ? " is-on" : ""}`} aria-pressed={reason === key} disabled={busy} onClick={() => setReason(key)}>{label}</button>)}
      </div>
      <div className="kh-nouse__actions">
        <button type="button" className="kg-btn" disabled={busy} onClick={confirm}>{busy ? "Saving…" : "Mark no usage"}</button>
        <button type="button" className="kg-chip" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

const qtyText = (value, item) => `${asNumber(value).toLocaleString("en-IN", { maximumFractionDigits: 3 })} ${item.unit || item.unitId?.symbol || "units"}`;

/** One item line: name and hint on the left, a status pill, the quantity on the right. */
const Row = ({ name, hint, tone, status, qty, onClick }) => (
  <button type="button" className="kg-row kh-row" onClick={onClick}>
    <span className="kh-row__text"><strong>{name}</strong><small>{hint}</small></span>
    {status && <span className={`kg-pill kg-pill--${tone}`}>{status}</span>}
    {qty && <span className="kh-row__qty">{qty}</span>}
  </button>
);

/**
 * A collapsible section: the header (one tap target) carries the name, a count or pill, an exclamation mark when it
 * needs attention, and the chevron. Everything starts closed so the page stays short; the header says what is inside.
 */
const Section = ({ id, label, title, summary, attention = false, tint = "", open, onToggle, children }) => (
  <section className={`kg-glass kh-card${tint}${open ? " is-open" : ""}`} aria-labelledby={`${id}-title`}>
    <button type="button" className="kh-card__head" onClick={onToggle} aria-expanded={open} aria-controls={`${id}-body`}>
      <span className="kh-card__text"><span className="kg-label">{label}</span><span className="kh-card__title" id={`${id}-title`}>{title}</span></span>
      {summary && <span className="kh-card__summary">{summary}</span>}
      {attention && <span className="kh-card__alert" role="img" aria-label="Needs attention"><AlertCircle size={20} strokeWidth={1.9} /></span>}
      <ChevronDown size={20} className={open ? "is-open" : ""} aria-hidden="true" />
    </button>
    {open && <div id={`${id}-body`} className="kh-card__body">{children}</div>}
  </section>
);

/**
 * Landing screen for a school kitchen: what to use first, what is running low, what is on its way.
 * All collections are optional, allowing the parent to render while data loads.
 */
export default function KitchenHome({
  userInfo,
  items = [],
  requests = [],
  indents = [],
  orders = [],
  sharedOrders = NO_ORDERS,
  onRecordUsage,
  onRecordUsageOn,
  usageDays = null,
  onNoUsage,
  onUndoNoUsage,
  onViewStock,
  onRequestSupplies,
  onReceiveDelivery,
  sharedToReceive = 0,
  hidden = NO_HIDDEN,
}) {
  // Views whose feature is off for this kitchen are not offered at all (rather than toasting on tap).
  const canRecordUsage = !hidden.has("usage");
  const canUseRequests = !hidden.has("requests");
  const today = toLocalDateKey();
  const [picking, setPicking] = useState(null); // the date whose "no usage" reason is being chosen
  const [missedOpen, setMissedOpen] = useState(false);
  const [openSections, setOpenSections] = useState({});
  const isOpen = (key) => Boolean(openSections[key]);
  const toggle = (key) => setOpenSections((previous) => ({ ...previous, [key]: !previous[key] }));
  const godownId = userInfo?.godown?._id;

  const outOfStock = items.filter((item) => asNumber(item.currentQty ?? item.quantity ?? item.kitchenQty) <= 0);
  const lowStock = items.filter((item) => {
    const quantity = asNumber(item.currentQty ?? item.quantity ?? item.kitchenQty);
    const threshold = asNumber(
      item.thresholdBaseUnit ?? item.threshold ?? item.lowStockThreshold ??
      item.minimumStock ?? item.reorderLevel ?? item.minQty,
    );
    return quantity > 0 && threshold > 0 && quantity <= threshold;
  });
  const attentionItems = [...outOfStock, ...lowStock];
  // Expired or expiring within the week, most urgent first; usable items only, since the rest cannot be recorded anyway.
  const useFirst = itemsToUseFirst(items.filter((item) => item.available !== false), today);
  const expiredCount = useFirst.filter((item) => expiryStatus(item, today).key === "expired").length;
  const pendingRequests = [...requests, ...indents].filter((record) => OPEN_REQUEST_STATUSES.has(statusOf(record)));
  // Shared orders this kitchen is on that have not arrived yet, newest first.
  const inProgressOrders = myOrders(sharedOrders, godownId)
    .filter((order) => !["delivered", "cancelled"].includes(kitchenStage(order, godownId)))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const inProgressCount = inProgressOrders.length + pendingRequests.length;
  // Old-style deliveries plus shares of shared orders that have been dispatched to this kitchen.
  const toReceive = indents.filter(isReceivable).length + sharedToReceive;
  const todaysEntries = orders.filter(
    (entry) => toLocalDateKey(entry?.date || entry?.usageDate || entry?.createdAt) === today,
  );
  // The server's day-by-day account (per kitchen) wins; the per-login entries are the fallback while it loads.
  const todayRow = usageDays?.days?.find((day) => day.date === today) || null;
  const usageComplete = todayRow ? todayRow.status === "recorded" : todaysEntries.length > 0;
  const todayNone = todayRow?.status === "none";
  const entryCount = todayRow ? todayRow.entries : todaysEntries.length;
  const missedDays = (usageDays?.days || []).filter((day) => day.status === "missed" && day.date !== today);
  const confirmNoUsage = async (date, reason) => {
    const ok = await onNoUsage?.(date, reason);
    if (ok) setPicking(null);
    return ok;
  };
  // A hint of colour on the cards whose state asks for attention; plain glass otherwise.
  const useFirstTint = expiredCount > 0 ? " kg-glass--rose" : useFirst.length > 0 ? " kg-glass--warm" : "";
  const lowTint = outOfStock.length > 0 ? " kg-glass--rose" : lowStock.length > 0 ? " kg-glass--cool" : "";

  return (
    <main className="kh-shell">
      <section className="kh-top" aria-label="Today">
        {canRecordUsage && <div className={`kg-glass kg-lift kh-day${usageComplete || todayNone ? "" : " kg-glass--warm"}`}>
          <span className="kg-orb kh-day__icon" aria-hidden="true">{usageComplete ? <CheckCircle2 size={20} strokeWidth={1.6} /> : todayNone ? <CalendarOff size={20} strokeWidth={1.6} /> : <CalendarDays size={20} strokeWidth={1.6} />}</span>
          <div className="kh-day__text">
            <p className="kg-label">{longDate(today)}{usageComplete ? ` · ${entryCount} ${entryCount === 1 ? "entry" : "entries"}` : todayNone ? ` · ${REASON_LABEL[todayRow.reason] || "No usage"}` : ""}</p>
            <h2>{usageComplete ? "Today’s usage is recorded" : todayNone ? "No usage today" : "Today’s usage is not recorded yet"}</h2>
          </div>
          <div className="kh-day__actions">
            <button type="button" className="kg-btn" onClick={onRecordUsage}>
              {usageComplete ? "Add more" : todayNone ? "Record anyway" : "Record usage"}<ArrowRight size={17} strokeWidth={1.8} aria-hidden="true" />
            </button>
            {todayNone && onUndoNoUsage && <button type="button" className="kg-chip" onClick={() => onUndoNoUsage(today)}>Undo</button>}
            {!usageComplete && !todayNone && onNoUsage && picking !== today && <button type="button" className="kh-link" onClick={() => setPicking(today)}>Tap if no usage is recorded</button>}
          </div>
          {picking === today && <NoUsagePicker date={today} onConfirm={confirmNoUsage} onCancel={() => setPicking(null)} />}
        </div>}
      </section>

      {/* Days in the last month with neither usage nor a "no usage" mark: loud on purpose, so a forgotten day gets fixed. */}
      {canRecordUsage && missedDays.length > 0 && <section className="kg-glass kh-missed" aria-labelledby="kh-missed-title">
        <button type="button" className="kh-missed__head" onClick={() => setMissedOpen((value) => !value)} aria-expanded={missedOpen} aria-controls="kh-missed-list">
          <span className="kg-orb kh-missed__icon" aria-hidden="true"><AlertTriangle size={20} strokeWidth={1.7} /></span>
          <span className="kh-missed__text"><span className="kg-label">Usage not recorded</span><strong id="kh-missed-title">{missedDays.length} missed {missedDays.length === 1 ? "day" : "days"}</strong></span>
          <ChevronDown size={20} className={missedOpen ? "is-open" : ""} aria-hidden="true" />
        </button>
        {missedOpen && <ul id="kh-missed-list" className="kh-missed__list">
          {missedDays.map((day) => <li key={day.date}>
            <div className="kh-missed__row">
              <span className="kh-missed__date">{longDate(day.date)}</span>
              <button type="button" className="kg-btn" onClick={() => onRecordUsageOn?.(day.date)}>Record</button>
              {onNoUsage && picking !== day.date && <button type="button" className="kh-link" onClick={() => setPicking(day.date)}>Tap if no usage is recorded</button>}
            </div>
            {picking === day.date && <NoUsagePicker date={day.date} onConfirm={confirmNoUsage} onCancel={() => setPicking(null)} />}
          </li>)}
        </ul>}
      </section>}

      <div className="kh-cols">
        <div className="kh-col">
          {canRecordUsage && <Section id="use-first" label="Today’s work" title="Use first" tint={useFirstTint} attention={useFirst.length > 0}
            summary={expiredCount > 0 ? <span className="kg-pill kg-pill--expired">{expiredCount} expired</span> : `${useFirst.length} ${useFirst.length === 1 ? "item" : "items"}`}
            open={isOpen("use-first")} onToggle={() => toggle("use-first")}>
            {useFirst.length === 0 && <Row name="Nothing expiring this week" hint="Every dated item has more than 7 days left" tone="routine" status="In date" onClick={onViewStock} />}
            {useFirst.slice(0, 3).map((item, index) => {
              const expiry = expiryStatus(item, today);
              const expired = expiry.key === "expired";
              return <Row key={item._id || item.stockRecordId || `${item.name}-${index}`} name={item.name || "Unnamed item"}
                hint={expired ? "Check before using" : "Use within the week"} tone={expired ? "expired" : "soon"} status={expiry.label}
                qty={qtyText(expiry.qtyBaseUnit, item)} onClick={onRecordUsage} />;
            })}
            <div className="kh-card__foot"><button type="button" className="kg-chip" onClick={onRecordUsage}>Record usage</button></div>
          </Section>}

          <Section id="running-low" label="Stock" title="Running low" tint={lowTint} attention={attentionItems.length > 0}
            summary={outOfStock.length > 0 ? <span className="kg-pill kg-pill--expired">{outOfStock.length} out of stock</span> : lowStock.length > 0 ? <span className="kg-pill kg-pill--low">{lowStock.length} low</span> : "All fine"}
            open={isOpen("running-low")} onToggle={() => toggle("running-low")}>
            {attentionItems.length === 0 && <Row name="All stock above its low level" hint={`${items.filter((item) => item.available !== false).length} items you can use`} tone="routine" status="Fine" onClick={onViewStock} />}
            {attentionItems.slice(0, 3).map((item, index) => {
              const quantity = asNumber(item.currentQty ?? item.quantity ?? item.kitchenQty);
              const out = quantity <= 0;
              return <Row key={item._id || item.stockRecordId || `${item.name}-${index}`} name={item.name || "Unnamed item"}
                hint={out ? "Ask for supplies now" : "Ask for supplies soon"} tone={out ? "expired" : "low"} status={out ? "Out of stock" : "Low stock"}
                qty={qtyText(quantity, item)} onClick={onViewStock} />;
            })}
            <div className="kh-card__foot"><button type="button" className="kg-chip" onClick={onViewStock}>View all</button></div>
          </Section>
        </div>

        {canUseRequests && <div className="kh-col kh-col--side">
          <Section id="incoming" label="Requests" title="Incoming orders" tint={toReceive > 0 ? " kg-glass--cool" : ""} attention={toReceive > 0}
            summary={toReceive > 0 ? <span className="kg-pill kg-pill--low">{toReceive} to receive</span> : <span className="kh-count">{inProgressCount}</span>}
            open={isOpen("incoming")} onToggle={() => toggle("incoming")}>
            {toReceive > 0 && <div className="kg-row kh-delivery">
              <div className="kh-delivery__who">
                <span className="kg-orb" aria-hidden="true"><Truck size={19} strokeWidth={1.6} /></span>
                <span className="kh-row__text">
                  <strong>From the central store</strong>
                  <small>{`${toReceive} ${toReceive === 1 ? "delivery has" : "deliveries have"} arrived · check the items and confirm`}</small>
                </span>
              </div>
              <button type="button" className="kg-btn kh-delivery__go" onClick={onReceiveDelivery}>Receive items</button>
            </div>}
            {inProgressCount === 0 && toReceive === 0 && <Row name="No open requests" hint="Start one when you run short of anything" tone="routine" status="None" onClick={onRequestSupplies} />}
            {inProgressOrders.slice(0, 3).map((order) => (
              <button type="button" key={order._id} className="kg-row kh-order" onClick={onRequestSupplies}>
                <span className="kh-row__text">
                  <strong>{order.title || "Supply request"}</strong>
                  <small>{order.neededBy ? `Delivery by ${deliveryDateText(order.neededBy)}` : "Shared order"}</small>
                </span>
                <span className="kh-steps">
                  <ol aria-label="Request status">
                    {orderTimeline(order, godownId).map((step) => <li key={step.key} className={step.done ? "is-done" : ""} aria-label={`${step.label}${step.done ? ", done" : ""}`} />)}
                  </ol>
                  <small>{orderTimeline(order, godownId).find((step) => step.current)?.label || "Requested"}</small>
                </span>
              </button>
            ))}
            {pendingRequests.length > 0 && <Row name={`${pendingRequests.length} older ${pendingRequests.length === 1 ? "request" : "requests"}`} hint="Sent before shared orders" tone="routine" status="Open" onClick={onRequestSupplies} />}
            <div className="kh-card__foot"><button type="button" className="kg-btn" onClick={onRequestSupplies}>Go to Requests<ArrowRight size={17} strokeWidth={1.8} aria-hidden="true" /></button></div>
          </Section>
        </div>}
      </div>
    </main>
  );
}
