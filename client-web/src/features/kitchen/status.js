const FALLBACK_STATUS = Object.freeze({
  key: "unknown",
  label: "Status unavailable",
  tone: "neutral",
});

const REQUEST_STATUSES = Object.freeze({
  draft: { label: "Draft", tone: "neutral" },
  pending: { label: "Submitted", tone: "warning" },
  submitted: { label: "Submitted", tone: "warning" },
  confirmed: { label: "Approved", tone: "positive" },
  approved: { label: "Approved", tone: "positive" },
  partially_approved: { label: "Partially approved", tone: "info" },
  partially_received: { label: "Partially received", tone: "info" },
  received: { label: "Received", tone: "positive" },
  rejected: { label: "Rejected", tone: "critical" },
  cancelled: { label: "Cancelled", tone: "neutral" },
});

const DELIVERY_STATUSES = Object.freeze({
  awaiting_approval: { label: "Awaiting approval", tone: "warning" },
  approved: { label: "Ready for dispatch", tone: "info" },
  dispatched: { label: "Ready to receive", tone: "info" },
  partially_received: { label: "Partially received", tone: "warning" },
  received: { label: "Received", tone: "positive" },
  rejected: { label: "Not approved", tone: "critical" },
  cancelled: { label: "Cancelled", tone: "neutral" },
});

const normalizeKey = (value) => String(value || "unknown").trim().toLowerCase();

const getStatus = (map, status) => {
  const key = normalizeKey(status);
  const match = map[key];
  return match ? { key, ...match } : { ...FALLBACK_STATUS, key };
};

/** Returns a stable UI label and semantic tone for a supply-request status. */
export const getSupplyRequestStatus = (status) => getStatus(REQUEST_STATUSES, status);

/** Returns a stable UI label and semantic tone for a delivery status. */
export const getDeliveryStatus = (status) => getStatus(DELIVERY_STATUSES, status);

export const statusTones = Object.freeze({
  neutral: "neutral",
  info: "info",
  warning: "warning",
  positive: "positive",
  critical: "critical",
});
