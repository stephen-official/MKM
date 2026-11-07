import { fail } from "../../shared/httpErrors.js";
import { listOrders, requireOrderById } from "./orderRepository.js";

export const ORDER_STATUSES = new Set(["open", "closed", "approved", "ordered", "cancelled"]);

/** Normalizes public list parameters in one place so routes do not own query policy. */
export const normalizeOrderListParams = ({ status, page, limit } = {}) => {
  const normalizedStatus = status ? String(status) : null;
  if (normalizedStatus && !ORDER_STATUSES.has(normalizedStatus)) throw fail(400, "Invalid status filter");
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
