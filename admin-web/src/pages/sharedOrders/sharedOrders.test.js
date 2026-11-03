import { describe, expect, it } from "vitest";
import { canAdjustLine, editableQuantity, eventActor, eventText, requestedLabel, allSharesApproved, canSetPurchaseDetails, canApprove, canCancel, canDispatch, canDispatchAll, canDispatchLine, canMarkOrdered, canRejectLine, canRejectShare, closesInText, hasLiveItems, lineDelivery, orderItems, orderRowsReady, orderStage, shareStage, lineLabel, sourceLabel, unitChoices } from "./sharedOrders.js";

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
    expect(shareStage(ordered, mixed)).toBe("Incomplete dispatch");
    expect(shareStage(ordered, share({ items: [{ ...sent, deliveredAt: at(-1) }, sent] }))).toBe("Partly received");
  });

  it("each kitchen's stage says what the admin has to do next", () => {
    expect(shareStage({ status: "open" }, share())).toBe("Needs approval");
    expect(shareStage({ status: "open" }, share({ approvedAt: at(-1) }))).toBe("Place order");
    expect(shareStage({ status: "approved" }, share())).toBe("Place order");
    expect(shareStage({ status: "ordered" }, share())).toBe("Needs to be dispatched");
    expect(shareStage({ status: "ordered" }, share({ dispatchedAt: at(-1), items: [{}] }))).toBe("Dispatched");
    expect(shareStage({ status: "ordered" }, share({ dispatchedAt: at(-2), deliveredAt: at(-1) }))).toBe("Delivered");
    expect(shareStage({ status: "cancelled" }, share())).toBe("Cancelled");
  });

  it("an open delivery problem is the stage, whatever else is going on", () => {
    const problem = { dispatchedAt: at(-2), ticketId: "t1" };
    expect(shareStage({ status: "ordered" }, share({ items: [problem] }))).toBe("Problem to settle");
    expect(shareStage({ status: "ordered" }, share({ items: [problem, { dispatchedAt: at(-2), deliveredAt: at(-1) }] }))).toBe("Problem to settle");
    expect(shareStage({ status: "ordered" }, share({ deliveredAt: at(-1), items: [{ ...problem, deliveredAt: at(-1) }] }))).toBe("Delivered");
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

  it("shows a line with an open problem as such until the admin settles it", () => {
    expect(lineDelivery({ dispatchedAt: at(-2), ticketId: { status: "open" } }, share())).toBe("Problem raised");
    expect(lineDelivery({ dispatchedAt: at(-2), deliveredAt: at(-1), ticketId: { status: "settled" } }, share())).toBe("Received");
  });

  it("allows supplier and invoice details once approved, and after ordering", () => {
    expect(["open", "closed", "cancelled"].map((status) => canSetPurchaseDetails({ status }))).toEqual([false, false, false]);
    expect(["approved", "ordered"].map((status) => canSetPurchaseDetails({ status }))).toEqual([true, true]);
  });
});

describe("order stage badge", () => {
  const sent = { dispatchedAt: "2026-10-18T05:00:00.000Z" };
  const received = { dispatchedAt: "2026-10-18T05:00:00.000Z", deliveredAt: "2026-10-19T05:00:00.000Z" };
  it("shows what the admin must do next, taking the most pressing kitchen", () => {
    expect(orderStage({ status: "open", contributions: [share({ items: [{}] })] })).toBe("Needs approval");
    expect(orderStage({ status: "open", contributions: [share({ approvedAt: "x", items: [{}] }), share({ items: [{}] })] })).toBe("Needs approval");
    expect(orderStage({ status: "approved", contributions: [share({ approvedAt: "x", items: [{}] })] })).toBe("Place order");
    expect(orderStage({ status: "ordered", contributions: [share({ items: [sent] }), share({ items: [{}] })] })).toBe("Needs to be dispatched");
    expect(orderStage({ status: "ordered", contributions: [share({ items: [sent, {}] })] })).toBe("Incomplete dispatch");
    expect(orderStage({ status: "ordered", contributions: [share({ items: [sent] }), share({ items: [{ ...sent, ticketId: "t" }] })] })).toBe("Problem to settle");
  });
  it("otherwise says where the delivery stands", () => {
    expect(orderStage({ status: "ordered", contributions: [share({ items: [sent] }), share({ deliveredAt: "x", items: [received] })] })).toBe("Dispatched");
    expect(orderStage({ status: "ordered", contributions: [share({ items: [sent, received] })] })).toBe("Partly received");
    expect(orderStage({ status: "ordered", contributions: [share({ deliveredAt: "x", items: [received] })] })).toBe("Delivered");
    expect(orderStage({ status: "cancelled", contributions: [share({ items: [{}] })] })).toBe("Cancelled");
    expect(orderStage({ status: "open", contributions: [] })).toBe("Needs approval");
  });
});

describe("rejected items", () => {
  const rejected = { rejectedAt: "2026-10-18T05:00:00.000Z", rejectionReason: "Not this week" };
  it("a rejected line is never sent and says so", () => {
    const ordered = { status: "ordered" };
    const mixed = share({ items: [rejected, {}] });
    expect(lineDelivery(rejected, mixed)).toBe("Not approved");
    expect(lineDelivery(rejected, share({ dispatchedAt: "x", items: [rejected] }))).toBe("Not approved");
    expect(canDispatchLine(ordered, rejected, mixed)).toBe(false);
    expect(canDispatch(ordered, share({ items: [rejected] }))).toBe(false);
    expect(canDispatch(ordered, mixed)).toBe(true);
  });

  it("stages ignore rejected lines, and a kitchen with nothing left is Not approved", () => {
    const sent = { dispatchedAt: "x" };
    expect(shareStage({ status: "ordered" }, share({ items: [rejected, sent] }))).toBe("Dispatched");
    expect(shareStage({ status: "ordered" }, share({ items: [rejected, { ...sent, deliveredAt: "y" }], deliveredAt: "y" }))).toBe("Delivered");
    expect(shareStage({ status: "open" }, share({ rejectedAt: "x", items: [rejected] }))).toBe("Not approved");
    expect(shareStage({ status: "ordered" }, share({ rejectedAt: "x", items: [rejected] }))).toBe("Not approved");
    expect(shareStage({ status: "open" }, share({ rejectedAt: "x", items: [rejected, { approvedAt: "x" }] }))).toBe("Place order");
    expect(orderStage({ status: "open", contributions: [share({ rejectedAt: "x", items: [rejected] })] })).toBe("Not approved");
    expect(orderStage({ status: "open", contributions: [share({ rejectedAt: "x", items: [rejected] }), share({ items: [{}] })] })).toBe("Needs approval");
  });

  it("a rejected kitchen counts as reviewed", () => {
    expect(allSharesApproved({ contributions: [share({ approvedAt: "x" }), share({ rejectedAt: "x" })] })).toBe(true);
    expect(hasLiveItems({ contributions: [share({ items: [{ rejectedAt: "x" }] })] })).toBe(false);
    expect(hasLiveItems({ contributions: [share({ items: [{ rejectedAt: "x" }, {}] })] })).toBe(true);
  });

  it("only undecided lines and kitchens can be rejected, while the order is being reviewed", () => {
    expect(canRejectLine({ status: "open" }, {})).toBe(true);
    expect(canRejectLine({ status: "closed" }, {})).toBe(true);
    expect(canRejectLine({ status: "open" }, { approvedAt: "x" })).toBe(false);
    expect(canRejectLine({ status: "open" }, rejected)).toBe(false);
    expect(canRejectLine({ status: "approved" }, {})).toBe(false);
    expect(canRejectShare({ status: "open" }, share({ items: [{}] }))).toBe(true);
    expect(canRejectShare({ status: "open" }, share({ items: [{ approvedAt: "x" }, {}] }))).toBe(true);
    expect(canRejectShare({ status: "open" }, share({ items: [{ approvedAt: "x" }] }))).toBe(false);
    expect(canRejectShare({ status: "open" }, share({ approvedAt: "x", items: [{}] }))).toBe(false);
    expect(canRejectShare({ status: "open" }, share({ rejectedAt: "x", items: [rejected] }))).toBe(false);
    expect(canRejectShare({ status: "ordered" }, share({ items: [{}] }))).toBe(false);
  });

  it("orders can be cancelled until they are placed with the supplier", () => {
    expect(["open", "closed", "approved"].map((status) => canCancel({ status }))).toEqual([true, true, true]);
    expect(["ordered", "cancelled"].map((status) => canCancel({ status }))).toEqual([false, false]);
  });
});

describe("raising an order for a kitchen", () => {
  it("names who raised the order", () => {
    expect(sourceLabel({ source: "admin" })).toBe("Raised by admin");
    expect(sourceLabel({ source: "kitchen" })).toBe("Requested by kitchen");
    expect(sourceLabel({})).toBe("Requested by kitchen", "orders from before the field are kitchen requests");
  });

  it("turns the form's rows into order lines in the base unit, with the pack when one is chosen", () => {
    const rice = { _id: "r", unit: { symbol: "kg" }, soldInPacks: true, packs: [{ _id: "bag", name: "25 kg bag", size: 25 }] };
    const oil = { _id: "o", unit: { symbol: "L" }, soldInPacks: false, packs: [] };
    expect(orderItems([rice, oil], [
      { productId: "r", qty: "2", packId: "bag" },
      { productId: "o", qty: "3.5", packId: "base" },
      { productId: "r", qty: "", packId: "base" },
      { productId: "missing", qty: "4", packId: "base" },
    ])).toEqual([
      { stockItemId: "r", qtyBaseUnit: 50, packId: "bag", packName: "25 kg bag", packSize: 25, packQuantity: 2 },
      { stockItemId: "o", qtyBaseUnit: 3.5 },
    ]);
  });

  it("lists a product's units: the base unit, then its packs", () => {
    const rice = { unit: { symbol: "kg" }, soldInPacks: true, packs: [{ _id: "bag", name: "25 kg bag", size: 25 }, { _id: "x", name: "Broken", size: 0 }] };
    expect(unitChoices(rice)).toEqual([{ value: "base", label: "kg" }, { value: "bag", label: "25 kg bag (25 kg)" }]);
    expect(unitChoices({ unit: { symbol: "L" }, soldInPacks: false, packs: [{ _id: "p", name: "Tin", size: 15 }] })).toEqual([{ value: "base", label: "L" }]);
  });

  it("requires every visible order row to be complete", () => {
    const rice = { _id: "r", soldInPacks: true, packs: [{ _id: "bag", name: "Bag", size: 25 }] };
    const oil = { _id: "o", soldInPacks: false, packs: [] };
    expect(orderRowsReady([rice, oil], [{ productId: "r", qty: "2", packId: "bag" }])).toBe(true);
    expect(orderRowsReady([rice, oil], [{ productId: "r", qty: "2", packId: "bag" }, { productId: "o", qty: "", packId: "base" }])).toBe(false);
    expect(orderRowsReady([rice], [{ productId: "r", qty: "2", packId: "missing" }])).toBe(false);
    expect(orderRowsReady([rice], [{ productId: "", qty: "2", packId: "base" }])).toBe(false);
  });
});

describe("changing a kitchen's quantity", () => {
  const kg = { stockItemId: { unitId: { symbol: "kg" } } };
  it("any line that is not rejected can be changed while the order is being reviewed", () => {
    expect(canAdjustLine({ status: "open" }, {})).toBe(true);
    expect(canAdjustLine({ status: "closed" }, { approvedAt: "x" })).toBe(true);
    expect(canAdjustLine({ status: "open" }, { rejectedAt: "x" })).toBe(false);
    expect(canAdjustLine({ status: "approved" }, {})).toBe(false);
  });

  it("edits in the line's own unit: packs for a pack line, else the base unit", () => {
    expect(editableQuantity({ ...kg, qtyBaseUnit: 12.5 })).toEqual({ value: 12.5, unit: "kg" });
    expect(editableQuantity({ ...kg, qtyBaseUnit: 50, packId: "p", packName: "25 kg bag", packQuantity: 2 })).toEqual({ value: 2, unit: "25 kg bag" });
  });

  it("shows what the kitchen first asked for once the quantity was changed", () => {
    expect(requestedLabel({ ...kg, qtyBaseUnit: 6 })).toBe(null);
    expect(requestedLabel({ ...kg, qtyBaseUnit: 6, requestedQtyBaseUnit: 10 })).toBe("10 kg");
    expect(requestedLabel({ ...kg, qtyBaseUnit: 75, packId: "p", packName: "25 kg bag", packQuantity: 3, requestedQtyBaseUnit: 100, requestedPackQuantity: 4 })).toBe("4 × 25 kg bag");
  });
});

describe("order history", () => {
  const kitchen = { _id: "k1", name: "Gandhi Nagar School" };
  const rice = { stockItemId: { name: "Rice", unitId: { symbol: "kg" } }, qtyBaseUnit: 10 };
  const dal = { stockItemId: { name: "Dal", unitId: { symbol: "kg" } }, qtyBaseUnit: 4 };
  const event = (action, extra = {}) => ({ action, at: "2026-11-03T17:35:00.000Z", actorRole: "admin", actorId: { name: "Asha" }, godownId: null, items: [], fromStatus: null, toStatus: null, note: "", ...extra });

  it("says what happened, to which kitchen and items, with the reason", () => {
    expect(eventText(event("raised", { godownId: kitchen, items: [rice, dal] }))).toBe("Raised the order for Gandhi Nagar School: Rice, Dal");
    expect(eventText(event("joined", { actorRole: "kitchen", godownId: kitchen, items: [rice] }))).toBe("Gandhi Nagar School joined: Rice");
    expect(eventText(event("edited", { actorRole: "kitchen", godownId: kitchen, items: [rice] }))).toBe("Gandhi Nagar School changed its items: Rice");
    expect(eventText(event("left", { actorRole: "kitchen", godownId: kitchen }))).toBe("Gandhi Nagar School left the order");
    expect(eventText(event("approved", { godownId: kitchen, items: [rice] }))).toBe("Approved Rice for Gandhi Nagar School");
    expect(eventText(event("approved", { fromStatus: "open", toStatus: "approved" }))).toBe("Approved the whole order");
    expect(eventText(event("rejected", { godownId: kitchen, items: [dal], note: "Dal in stock" }))).toBe("Rejected Dal for Gandhi Nagar School: Dal in stock");
    expect(eventText(event("quantity_changed", { godownId: kitchen, items: [{ ...rice, qtyBaseUnit: 6, fromQtyBaseUnit: 10 }] }))).toBe("Changed Rice for Gandhi Nagar School from 10 kg to 6 kg");
    expect(eventText(event("purchase_updated", { note: "Invoice INV-7" }))).toBe("Purchase details: Invoice INV-7");
    expect(eventText(event("dispatched", { godownId: kitchen, items: [rice] }))).toBe("Dispatched Rice to Gandhi Nagar School");
    expect(eventText(event("received", { actorRole: "kitchen", godownId: kitchen, items: [rice] }))).toBe("Gandhi Nagar School received Rice");
    expect(eventText(event("problem_raised", { actorRole: "kitchen", godownId: kitchen, items: [rice], note: "short" }))).toBe("Gandhi Nagar School reported a problem with Rice: short");
    expect(eventText(event("problem_settled", { godownId: kitchen, items: [rice], note: "Accepted 60 of 100" }))).toBe("Settled the problem with Rice for Gandhi Nagar School: Accepted 60 of 100");
  });

  it("describes status changes in plain words", () => {
    expect(eventText(event("status_changed", { actorRole: "system", actorId: null, fromStatus: "open", toStatus: "closed" }))).toBe("Ordering closed");
    expect(eventText(event("status_changed", { fromStatus: "open", toStatus: "closed" }))).toBe("Closed the order to new items");
    expect(eventText(event("status_changed", { fromStatus: "approved", toStatus: "ordered", note: "Supplier Sri Lakshmi Traders" }))).toBe("Marked as ordered: Supplier Sri Lakshmi Traders");
    expect(eventText(event("status_changed", { fromStatus: "approved", toStatus: "ordered" }))).toBe("Marked as ordered");
    expect(eventText(event("status_changed", { fromStatus: "open", toStatus: "cancelled", note: "Supplier closed" }))).toBe("Cancelled the order: Supplier closed");
  });

  it("names who did it", () => {
    expect(eventActor(event("approved"))).toBe("Asha");
    expect(eventActor(event("joined", { actorRole: "kitchen", actorId: { name: "Cook A" } }))).toBe("Cook A");
    expect(eventActor(event("status_changed", { actorRole: "system", actorId: null }))).toBe("System");
    expect(eventActor(event("approved", { actorId: null }))).toBe("Admin");
  });
});
