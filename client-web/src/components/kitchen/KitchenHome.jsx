import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  PackageCheck,
  Plus,
  Utensils,
} from "lucide-react";
import { createElement } from "react";
import { toLocalDateKey } from "../../utils/date";
import { expiryStatus, itemsToUseFirst } from "../../features/kitchen";
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

const ActionButton = ({ icon: Icon, title, description, onClick, tone = "plain" }) => (
  <button type="button" className={`kh-action kh-action--${tone}`} onClick={onClick}>
    <span className="kh-action__icon" aria-hidden="true">{createElement(Icon, { size: 21, strokeWidth: 2.2 })}</span>
    <span className="kh-action__copy">
      <strong>{title}</strong>
      <small>{description}</small>
    </span>
    <ChevronRight className="kh-action__arrow" size={20} aria-hidden="true" />
  </button>
);

/**
 * Mobile-first landing screen for a school kitchen.
 * All collections are optional, allowing the parent to render while data loads.
 */
export default function KitchenHome({
  userInfo,
  items = [],
  requests = [],
  indents = [],
  orders = [],
  onRecordUsage,
  onViewStock,
  onRequestSupplies,
  onReceiveDelivery,
  sharedToReceive = 0,
  onOpenActivity,
  hidden = NO_HIDDEN,
}) {
  // Views whose feature is off for this kitchen are not offered at all (rather than toasting on tap).
  const canRecordUsage = !hidden.has("usage");
  const canUseRequests = !hidden.has("requests");
  const canOpenActivity = !hidden.has("activity");
  const today = toLocalDateKey();
  void userInfo;

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
  const pendingRequests = [...requests, ...indents].filter((record) => OPEN_REQUEST_STATUSES.has(statusOf(record)));
  // Old-style deliveries plus shares of shared orders that have been dispatched to this kitchen.
  const toReceive = indents.filter(isReceivable).length + sharedToReceive;
  const todaysEntries = orders.filter(
    (entry) => toLocalDateKey(entry?.date || entry?.usageDate || entry?.createdAt) === today,
  );
  const usageComplete = todaysEntries.length > 0;

  return (
    <main className="kh-shell">
      {canRecordUsage && <section className={`kh-day-status ${usageComplete ? "kh-day-status--done" : ""}`} aria-labelledby="today-status-title">
        <span className="kh-day-status__icon" aria-hidden="true">
          {usageComplete ? <CheckCircle2 size={24} /> : <ClipboardCheck size={24} />}
        </span>
        <div>
          <h2 id="today-status-title">{usageComplete ? "Today’s usage is recorded" : "Record today’s kitchen usage"}</h2>
          <p>{usageComplete ? `${todaysEntries.length} ${todaysEntries.length === 1 ? "entry" : "entries"} saved today` : "Keep stock accurate before the end of your shift."}</p>
        </div>
        <button type="button" onClick={onRecordUsage}>
          {usageComplete ? "Add more" : "Start"}<ArrowRight size={17} aria-hidden="true" />
        </button>
      </section>}

      <section aria-labelledby="overview-title">
        <div className="kh-section-heading">
          <div><p>Overview</p><h2 id="overview-title">What needs attention</h2></div>
          {canOpenActivity && <button type="button" onClick={onOpenActivity}>View activity</button>}
        </div>
        <div className="kh-metrics">
          <button type="button" className="kh-metric kh-metric--warning" onClick={onViewStock} aria-label={`${attentionItems.length} stock items need attention. View stock.`}>
            <AlertTriangle size={22} aria-hidden="true" />
            <strong>{attentionItems.length}</strong><span>Stock alerts</span>
            <small>{outOfStock.length} out of stock</small>
          </button>
          {canUseRequests && <button type="button" className="kh-metric kh-metric--delivery" onClick={onReceiveDelivery} aria-label={`${toReceive} deliveries are ready to receive.`}>
            <PackageCheck size={22} aria-hidden="true" />
            <strong>{toReceive}</strong><span>To receive</span>
            <small>{toReceive ? "Check delivered items" : "Nothing waiting"}</small>
          </button>}
          {canUseRequests && <button type="button" className="kh-metric kh-metric--request" onClick={onRequestSupplies} aria-label={`${pendingRequests.length} supply requests are in progress.`}>
            <Clock3 size={22} aria-hidden="true" />
            <strong>{pendingRequests.length}</strong><span>In progress</span>
            <small>Supply requests</small>
          </button>}
        </div>
      </section>

      <section aria-labelledby="actions-title">
        <div className="kh-section-heading"><div><p>Daily tasks</p><h2 id="actions-title">What would you like to do?</h2></div></div>
        <div className="kh-actions">
          {canRecordUsage && <ActionButton icon={Utensils} title="Record usage" description="Enter supplies used today" onClick={onRecordUsage} tone="primary" />}
          <ActionButton icon={Boxes} title="View kitchen stock" description={`${items.filter((item) => item.available !== false).length} items you can use`} onClick={onViewStock} />
          {canUseRequests && <ActionButton icon={Plus} title="Request supplies" description="Ask the central store for items" onClick={onRequestSupplies} />}
          {canUseRequests && <ActionButton icon={PackageCheck} title="Receive a delivery" description={toReceive ? `${toReceive} waiting for confirmation` : "Check incoming supplies"} onClick={onReceiveDelivery} />}
        </div>
      </section>

      {canRecordUsage && useFirst.length > 0 && (
        <section className="kh-alert-list" aria-labelledby="use-first-title">
          <div className="kh-section-heading">
            <div><p>Expiry</p><h2 id="use-first-title">Use first</h2></div>
            <button type="button" onClick={onRecordUsage}>Record usage</button>
          </div>
          <div className="kh-alert-list__items">
            {useFirst.slice(0, 3).map((item, index) => {
              const expiry = expiryStatus(item, today);
              return (
                <button type="button" key={item._id || item.stockRecordId || `${item.name}-${index}`} onClick={onRecordUsage}>
                  <span className={`kh-stock-dot ${expiry.key === "expired" ? "kh-stock-dot--out" : ""}`} aria-hidden="true" />
                  <span><strong>{item.name || "Unnamed item"}</strong><small>{expiry.key === "expired" ? `${expiry.label} · check before using` : expiry.label}</small></span>
                  <b>{expiry.qtyBaseUnit.toLocaleString("en-IN", { maximumFractionDigits: 3 })} {item.unit || item.unitId?.symbol || "units"}</b>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {attentionItems.length > 0 && (
        <section className="kh-alert-list" aria-labelledby="stock-alert-title">
          <div className="kh-section-heading">
            <div><p>Stock</p><h2 id="stock-alert-title">Running low</h2></div>
            <button type="button" onClick={onViewStock}>View all</button>
          </div>
          <div className="kh-alert-list__items">
            {attentionItems.slice(0, 3).map((item, index) => {
              const quantity = asNumber(item.currentQty ?? item.quantity ?? item.kitchenQty);
              return (
                <button type="button" key={item._id || item.stockRecordId || `${item.name}-${index}`} onClick={onViewStock}>
                  <span className={`kh-stock-dot ${quantity <= 0 ? "kh-stock-dot--out" : ""}`} aria-hidden="true" />
                  <span><strong>{item.name || "Unnamed item"}</strong><small>{quantity <= 0 ? "Out of stock" : "Low stock"}</small></span>
                  <b>{quantity.toLocaleString("en-IN", { maximumFractionDigits: 3 })} {item.unit || item.unitId?.symbol || "units"}</b>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
