import { ORDER_STATUSES } from "../../models/CollaborativePurchaseOrderModel.js";
import { fail } from "../../shared/httpErrors.js";
import { listOrders, requireOrderById } from "./orderRepository.js";

const KNOWN_STATUSES = new Set(ORDER_STATUSES);
export const isOrderStatus = (status) => KNOWN_STATUSES.has(status);

/** Normalizes public list parameters in one place so routes do not own query policy. */
export const normalizeOrderListParams = ({ status, page, limit } = {}) => {
  const normalizedStatus = status ? String(status) : null;
  if (normalizedStatus && !isOrderStatus(normalizedStatus)) throw fail(400, "Invalid status filter");
  return {
    filter: normalizedStatus ? { status: normalizedStatus } : {},
    page: Math.max(1, Number.parseInt(page, 10) || 1),
    limit: Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 25)),
  };
};

export const getOrderDetails = (id) => requireOrderById(id);

export const getOrderPage = async (query) => {
  const params = normalizeOrderListParams(query);
  const { orders, total } = await listOrders(params);
  return {
    orders,
    total,
    page: params.page,
    limit: params.limit,
    pages: Math.max(1, Math.ceil(total / params.limit)),
  };
};
