import { describe, expect, it } from "vitest";
import { allSharesApproved, canSetPurchaseDetails, canApprove, canDispatch, canDispatchAll, canDispatchLine, canMarkOrdered, closesInText, lineDelivery, shareStage, lineLabel } from "./sharedOrders.js";

const now = new Date("2026-10-18T04:30:00.000Z");
const at = (hours) => new Date(now.getTime() + hours * 3_600_000).toISOString();
const share = (extra = {}) => ({ approvedAt: null, dispatchedAt: null, deliveredAt: null, items: [], ...extra });

describe("shared orders (admin)", () => {
  it("approval is possible only while the order is open or closed", () => {
    expect(canApprove({ status: "open" })).toBe(true);
    expect(canApprove({ status: "closed" })).toBe(true);
    for (const status of ["approved", "ordered", "cancelled"]) expect(canApprove({ status })).toBe(false);
  });

  it("knows when every kitchen on the order has been approved", () => {
    expect(allSharesApproved({ contributions: [share({ approvedAt: at(-1) }), share({ approvedAt: at(-2) })] })).toBe(true);
    expect(allSharesApproved({ contributions: [share({ approvedAt: at(-1) }), share()] })).toBe(false);
    expect(allSharesApproved({ contributions: [] })).toBe(false);
  });

  it("an order is marked ordered only after approval, and shares are dispatched once after that", () => {
    expect(canMarkOrdered({ status: "approved" })).toBe(true);
    expect(canMarkOrdered({ status: "closed" })).toBe(false);
    expect(canDispatch({ status: "ordered" }, share({ items: [{}] }))).toBe(true);
    expect(canDispatch({ status: "ordered" }, share({ dispatchedAt: at(-1), items: [{}] }))).toBe(false);
    expect(canDispatch({ status: "approved" }, share({ items: [{}] }))).toBe(false);
  });

  it("lines are dispatched one by one, a kitchen until all its lines are sent, and all until nothing is left", () => {
    const ordered = { status: "ordered" };
    const sent = { dispatchedAt: at(-2) };
    const pending = { dispatchedAt: null };
    const mixed = share({ items: [sent, pending] });
    expect(canDispatchLine(ordered, pending, mixed)).toBe(true);
    expect(canDispatchLine(ordered, sent, mixed)).toBe(false);
    expect(canDispatchLine({ status: "approved" }, pending, mixed)).toBe(false);
    expect(canDispatch(ordered, mixed)).toBe(true);
    expect(canDispatch(ordered, share({ items: [sent] }))).toBe(false);
    expect(canDispatch(ordered, share({ dispatchedAt: at(-1), items: [pending] }))).toBe(false, "sent whole before lines were tracked");
    expect(canDispatchAll({ status: "ordered", contributions: [share({ items: [sent] }), mixed] })).toBe(true);
    expect(canDispatchAll({ status: "ordered", contributions: [share({ items: [sent] })] })).toBe(false);
    expect([lineDelivery(pending, mixed), lineDelivery(sent, mixed), lineDelivery({ ...sent, deliveredAt: at(-1) }, mixed)]).toEqual(["Not sent", "On the way", "Received"]);
    expect(shareStage(ordered, mixed)).toBe("Partly dispatched");
    expect(shareStage(ordered, share({ items: [{ ...sent, deliveredAt: at(-1) }, sent] }))).toBe("Partly received");
  });

  it("each kitchen's share reads as one plain stage", () => {
    expect(shareStage({ status: "open" }, share())).toBe("Requested");
    expect(shareStage({ status: "open" }, share({ approvedAt: at(-1) }))).toBe("Approved");
    expect(shareStage({ status: "approved" }, share())).toBe("Approved");
    expect(shareStage({ status: "ordered" }, share())).toBe("Ordered");
    expect(shareStage({ status: "ordered" }, share({ dispatchedAt: at(-1), items: [{}] }))).toBe("Dispatched");
    expect(shareStage({ status: "ordered" }, share({ dispatchedAt: at(-2), deliveredAt: at(-1) }))).toBe("Delivered");
    expect(shareStage({ status: "cancelled" }, share())).toBe("Cancelled");
  });

  it("the ordering timer reads simply", () => {
    expect(closesInText(at(52), now)).toBe("Closes in 2 days 4 h");
    expect(closesInText(at(0.25), now)).toBe("Closes in 15 min");
    expect(closesInText(at(-1), now)).toBe("Ordering closed");
  });

  it("lines show packs when ordered in packs", () => {
    const unit = { stockItemId: { unitId: { symbol: "kg" } } };
    expect(lineLabel({ ...unit, qtyBaseUnit: 12.5 })).toBe("12.5 kg");
    expect(lineLabel({ ...unit, qtyBaseUnit: 50, packId: "p", packName: "25 kg bag", packQuantity: 2 })).toBe("2 × 25 kg bag (50 kg)");
  });

  it("allows supplier and invoice details once approved, and after ordering", () => {
    expect(["open", "closed", "cancelled"].map((status) => canSetPurchaseDetails({ status }))).toEqual([false, false, false]);
    expect(["approved", "ordered"].map((status) => canSetPurchaseDetails({ status }))).toEqual([true, true]);
  });
});
