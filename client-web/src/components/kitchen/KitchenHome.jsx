import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, Truck } from "lucide-react";
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
  const usageComplete = todaysEntries.length > 0;
  // A hint of colour on the cards whose state asks for attention; plain glass otherwise.
  const useFirstTint = expiredCount > 0 ? " kg-glass--rose" : useFirst.length > 0 ? " kg-glass--warm" : "";
  const lowTint = outOfStock.length > 0 ? " kg-glass--rose" : lowStock.length > 0 ? " kg-glass--cool" : "";

  return (
    <main className="kh-shell">
      <section className="kh-top" aria-label="Today">
        {canRecordUsage && <div className={`kg-glass kg-lift kh-day${usageComplete ? "" : " kg-glass--warm"}`}>
          <span className="kg-orb kh-day__icon" aria-hidden="true">{usageComplete ? <CheckCircle2 size={20} strokeWidth={1.6} /> : <CalendarDays size={20} strokeWidth={1.6} />}</span>
          <div className="kh-day__text">
            <p className="kg-label">{longDate(today)}{usageComplete ? ` · ${todaysEntries.length} ${todaysEntries.length === 1 ? "entry" : "entries"}` : ""}</p>
            <h2>{usageComplete ? "Today’s usage is recorded" : "Today’s usage is not recorded yet"}</h2>
          </div>
          <button type="button" className="kg-btn" onClick={onRecordUsage}>
            {usageComplete ? "Add more" : "Record usage"}<ArrowRight size={17} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>}
        {canRecordUsage && expiredCount > 0 && <button type="button" className="kg-glass kg-glass--rose kg-lift kh-tile" onClick={onRecordUsage} aria-label={`${expiredCount} expired ${expiredCount === 1 ? "item" : "items"}. Check before using.`}>
          <span className="kg-orb kh-tile__icon" aria-hidden="true"><AlertTriangle size={20} strokeWidth={1.7} /></span>
          <span><span className="kg-label">Check before using</span><strong>{expiredCount} expired</strong></span>
        </button>}
      </section>

      <div className="kh-cols">
        <div className="kh-col">
          {canRecordUsage && <section className={`kg-glass kg-lift kh-card${useFirstTint}`} aria-labelledby="use-first-title">
            <header className="kh-card__head">
              <div><p className="kg-label">Today’s work</p><h2 id="use-first-title">Use first</h2></div>
              <button type="button" className="kg-chip" onClick={onRecordUsage}>Record usage</button>
            </header>
            {useFirst.length === 0 && <Row name="Nothing expiring this week" hint="Every dated item has more than 7 days left" tone="routine" status="In date" onClick={onViewStock} />}
            {useFirst.slice(0, 3).map((item, index) => {
              const expiry = expiryStatus(item, today);
              const expired = expiry.key === "expired";
              return <Row key={item._id || item.stockRecordId || `${item.name}-${index}`} name={item.name || "Unnamed item"}
                hint={expired ? "Check before using" : "Use within the week"} tone={expired ? "expired" : "soon"} status={expiry.label}
                qty={qtyText(expiry.qtyBaseUnit, item)} onClick={onRecordUsage} />;
            })}
          </section>}

          <section className={`kg-glass kg-lift kh-card${lowTint}`} aria-labelledby="running-low-title">
            <header className="kh-card__head">
              <div><p className="kg-label">Stock</p><h2 id="running-low-title">Running low</h2></div>
              <button type="button" className="kg-chip" onClick={onViewStock}>View all</button>
            </header>
            {attentionItems.length === 0 && <Row name="All stock above its low level" hint={`${items.filter((item) => item.available !== false).length} items you can use`} tone="routine" status="Fine" onClick={onViewStock} />}
            {attentionItems.slice(0, 3).map((item, index) => {
              const quantity = asNumber(item.currentQty ?? item.quantity ?? item.kitchenQty);
              const out = quantity <= 0;
              return <Row key={item._id || item.stockRecordId || `${item.name}-${index}`} name={item.name || "Unnamed item"}
                hint={out ? "Ask for supplies now" : "Ask for supplies soon"} tone={out ? "expired" : "low"} status={out ? "Out of stock" : "Low stock"}
                qty={qtyText(quantity, item)} onClick={onViewStock} />;
            })}
          </section>
        </div>

        {canUseRequests && <div className="kh-col kh-col--side">
          <section className={`kg-glass kg-lift kh-card${toReceive > 0 ? " kg-glass--cool" : ""}`} aria-labelledby="deliveries-title">
            <header className="kh-card__head kh-card__head--count">
              <div><p className="kg-label">On its way</p><h2 id="deliveries-title">Deliveries to receive</h2></div>
              <span className="kh-count" aria-hidden="true">{toReceive}</span>
            </header>
            <div className="kg-row kh-delivery">
              <div className="kh-delivery__who">
                <span className="kg-orb" aria-hidden="true"><Truck size={19} strokeWidth={1.6} /></span>
                <span className="kh-row__text">
                  <strong>From the central store</strong>
                  <small>{toReceive ? `${toReceive} ${toReceive === 1 ? "delivery has" : "deliveries have"} arrived · check the items and confirm` : "Nothing on the way right now"}</small>
                </span>
              </div>
              {toReceive > 0 && <button type="button" className="kg-btn kh-delivery__go" onClick={onReceiveDelivery}>Receive items</button>}
            </div>
          </section>

          <section className="kg-glass kg-lift kh-card" aria-labelledby="in-progress-title">
            <header className="kh-card__head">
              <div><p className="kg-label">Requests</p><h2 id="in-progress-title">In progress</h2></div>
              <button type="button" className="kg-chip" onClick={onRequestSupplies}>Ask for supplies</button>
            </header>
            {inProgressCount === 0 && <Row name="No open requests" hint="Start one when you run short of anything" tone="routine" status="None" onClick={onRequestSupplies} />}
            {inProgressOrders.slice(0, 2).map((order) => (
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
          </section>
        </div>}
      </div>
    </main>
  );
}
