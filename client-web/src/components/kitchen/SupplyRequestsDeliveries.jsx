import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Inbox,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  normalizeDeliveries,
  normalizeSupplyRequests,
} from "../../features/kitchen";
import "./SupplyRequestsDeliveries.css";

const EDITABLE_STATUSES = new Set(["draft", "pending", "submitted"]);
const DELETABLE_STATUSES = new Set(["draft", "pending", "submitted"]);

const formatQuantity = (value) =>
  Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });

const formatDate = (value) => {
  if (!value) return "Date not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const shortReference = (value) => {
  const reference = String(value || "");
  return reference.length > 16 ? `…${reference.slice(-8)}` : reference;
};

function StatusChip({ status }) {
  return <span className={`srd-status srd-status--${status.tone}`}>{status.label}</span>;
}

function QuantityLine({ line, delivery = false }) {
  const requested = line.packId ? `${formatQuantity(line.packQuantity)} ${line.packName} (${formatQuantity(line.requestedQuantity)} ${line.unit})` : `${formatQuantity(line.requestedQuantity)} ${line.unit}`;
  return (
    <li className="srd-line">
      <div className="srd-line__name">
        <strong>{line.name}</strong>
        {line.decision === "rejected" && <span>Not approved</span>}
      </div>
      <div className="srd-line__quantities">
        <span><small>Requested</small><b>{requested}</b></span>
        <span><small>Approved</small><b>{formatQuantity(line.approvedQuantity)} {line.unit}</b></span>
        {delivery && <span><small>Received</small><b>{formatQuantity(line.receivedQuantity)} {line.unit}</b></span>}
      </div>
    </li>
  );
}

function LoadingState() {
  return (
    <div className="srd-loading" role="status" aria-live="polite">
      <span className="srd-spinner" aria-hidden="true" />
      <p>Loading kitchen supplies…</p>
    </div>
  );
}

function EmptyState({ tab, onCreateRequest }) {
  const deliveries = tab === "deliveries";
  return (
    <div className="srd-empty">
      <span aria-hidden="true">{deliveries ? <Truck size={30} /> : <Inbox size={30} />}</span>
      <h2>{deliveries ? "No deliveries yet" : "No supply requests yet"}</h2>
      <p>
        {deliveries
          ? "Approved supplies will appear here when they are ready for your kitchen."
          : "Create a request when your kitchen needs ingredients or other supplies."}
      </p>
      {!deliveries && (
        <button type="button" className="srd-primary-button" onClick={onCreateRequest}>
          <Plus size={18} aria-hidden="true" /> Create supply request
        </button>
      )}
    </div>
  );
}

function RequestCard({ request, rawRecord, onEditRequest, onDeleteRequest }) {
  const canEdit = EDITABLE_STATUSES.has(request.status.key);
  const canDelete = DELETABLE_STATUSES.has(request.status.key);

  return (
    <article className="srd-card">
      <header className="srd-card__header">
        <div>
          <p className="srd-card__eyebrow">Supply request</p>
          <h2>{shortReference(request.reference)}</h2>
        </div>
        <StatusChip status={request.status} />
      </header>

      <div className="srd-card__meta">
        <span><CalendarDays size={15} aria-hidden="true" /> Submitted {formatDate(request.createdAt)}</span>
        <span><ClipboardList size={15} aria-hidden="true" /> {request.itemCount} {request.itemCount === 1 ? "item" : "items"}</span>
      </div>

      {request.note && <p className="srd-card__note">{request.note}</p>}
      <ul className="srd-lines" aria-label="Requested items">
        {request.items.map((line, index) => (
          <QuantityLine key={line.id || `${line.name}-${index}`} line={line} />
        ))}
      </ul>

      {(canEdit || canDelete) && (
        <footer className="srd-card__actions">
          {canEdit && (
            <button type="button" onClick={() => onEditRequest?.(rawRecord)}>
              <Pencil size={16} aria-hidden="true" /> Edit
            </button>
          )}
          {canDelete && (
            <button type="button" className="srd-danger-action" onClick={() => onDeleteRequest?.(rawRecord)}>
              <Trash2 size={16} aria-hidden="true" /> Delete
            </button>
          )}
        </footer>
      )}
    </article>
  );
}

function DeliveryCard({ delivery, rawRecord, onReceiveDelivery }) {
  const progress = delivery.expectedQuantity > 0
    ? Math.min(100, Math.round((delivery.receivedQuantity / delivery.expectedQuantity) * 100))
    : 0;

  return (
    <article className="srd-card srd-card--delivery">
      <header className="srd-card__header">
        <div>
          <p className="srd-card__eyebrow">Kitchen delivery</p>
          <h2>{shortReference(delivery.reference)}</h2>
        </div>
        <StatusChip status={delivery.status} />
      </header>

      <div className="srd-card__meta">
        <span><CalendarDays size={15} aria-hidden="true" /> Updated {formatDate(delivery.updatedAt || delivery.createdAt)}</span>
        <span><PackageCheck size={15} aria-hidden="true" /> {delivery.itemCount} {delivery.itemCount === 1 ? "item" : "items"}</span>
      </div>

      <div className="srd-progress" aria-label={`${progress}% of this delivery received`}>
        <div><span>Delivery progress</span><strong>{progress}%</strong></div>
        <span className="srd-progress__track"><i style={{ width: `${progress}%` }} /></span>
      </div>

      <ul className="srd-lines" aria-label="Delivery items">
        {delivery.items.map((line, index) => (
          <QuantityLine key={line.id || `${line.name}-${index}`} line={line} delivery />
        ))}
      </ul>

      <footer className="srd-delivery-summary">
        <div>
          <small>Still to receive</small>
          <strong>{formatQuantity(delivery.remainingQuantity)} total units</strong>
        </div>
        {delivery.canReceive ? (
          <button type="button" className="srd-primary-button" onClick={() => onReceiveDelivery?.(rawRecord)}>
            Confirm received <ChevronRight size={18} aria-hidden="true" />
          </button>
        ) : (
          <span className="srd-complete"><CheckCircle2 size={17} aria-hidden="true" /> Receipt confirmed</span>
        )}
      </footer>
    </article>
  );
}

/**
 * Mobile-first view over the legacy IndentRequest collection. Callback payloads
 * are the original records so existing edit, delete and receive flows can be reused.
 */
export default function SupplyRequestsDeliveries({
  indents = [],
  loading = false,
  onCreateRequest,
  onEditRequest,
  onDeleteRequest,
  onReceiveDelivery,
  refresh,
  initialTab = "requests",
}) {
  const [activeTab, setActiveTab] = useState(initialTab === "deliveries" ? "deliveries" : "requests");
  const requests = useMemo(
    () => normalizeSupplyRequests({ indentRequests: indents }),
    [indents],
  );
  const deliveries = useMemo(() => normalizeDeliveries(indents), [indents]);
  const recordsById = useMemo(
    () => new Map(indents.map((record) => [String(record._id || record.id), record])),
    [indents],
  );
  const currentItems = activeTab === "requests" ? requests : deliveries;

  return (
    <main className="srd-shell">
      <header className="srd-page-header">
        <div>
          <p>Kitchen supplies</p>
          <h1>Requests &amp; deliveries</h1>
          <span>Request supplies and confirm what arrives at your kitchen.</span>
        </div>
        <button type="button" className="srd-refresh" onClick={refresh} disabled={loading} aria-label="Refresh requests and deliveries">
          <RefreshCw size={19} className={loading ? "srd-spin" : ""} aria-hidden="true" />
        </button>
      </header>

      <div className="srd-tabs" role="tablist" aria-label="Supply activity">
        <button type="button" role="tab" aria-selected={activeTab === "requests"} onClick={() => setActiveTab("requests")}>
          Requests <span>{requests.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "deliveries"} onClick={() => setActiveTab("deliveries")}>
          Deliveries <span>{deliveries.length}</span>
        </button>
      </div>

      {activeTab === "requests" && !loading && (
        <button type="button" className="srd-create" onClick={onCreateRequest}>
          <Plus size={20} aria-hidden="true" />
          <span><strong>New supply request</strong><small>Ask the central store for kitchen supplies</small></span>
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      )}

      {loading ? <LoadingState /> : currentItems.length === 0 ? (
        <EmptyState tab={activeTab} onCreateRequest={onCreateRequest} />
      ) : (
        <section className="srd-list" aria-label={activeTab === "requests" ? "Supply requests" : "Deliveries"}>
          {activeTab === "requests"
            ? requests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  rawRecord={recordsById.get(String(request.id))}
                  onEditRequest={onEditRequest}
                  onDeleteRequest={onDeleteRequest}
                />
              ))
            : deliveries.map((delivery) => (
                <DeliveryCard
                  key={delivery.id}
                  delivery={delivery}
                  rawRecord={recordsById.get(String(delivery.id))}
                  onReceiveDelivery={onReceiveDelivery}
                />
              ))}
        </section>
      )}
    </main>
  );
}
