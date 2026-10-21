import test from "node:test";
import assert from "node:assert/strict";
import { canJoin, closesInText, deliveryDateText, hasArriving, kitchenStage, lineState, myShare, orderTimeline, otherOpenOrders, myOrders } from "./orders.js";

const me = "kitchenA";
const now = new Date("2026-10-18T04:30:00.000Z"); // 10:00 in India
const at = (hours) => new Date(now.getTime() + hours * 3_600_000).toISOString();
const share = (godownId, extra = {}) => ({ godownId: { _id: godownId, name: godownId }, addedAt: at(-1), approvedAt: null, dispatchedAt: null, deliveredAt: null, items: [], ...extra });
const order = (extra = {}) => ({ _id: "o1", status: "open", closesAt: at(48), neededBy: at(168), statusChangedAt: null, contributions: [share(me)], ...extra });

test("a kitchen's stage follows its own share, not other kitchens'", () => {
  assert.equal(kitchenStage(order(), me), "requested");
  assert.equal(kitchenStage(order({ contributions: [share(me, { approvedAt: at(-1) })] }), me), "approved");
  assert.equal(kitchenStage(order({ status: "approved" }), me), "approved");
  assert.equal(kitchenStage(order({ status: "ordered" }), me), "ordered");
  assert.equal(kitchenStage(order({ status: "ordered", contributions: [share(me, { dispatchedAt: at(-1) }), share("kitchenB")] }), me), "dispatched");
  assert.equal(kitchenStage(order({ status: "ordered", contributions: [share(me), share("kitchenB", { dispatchedAt: at(-1) })] }), me), "ordered");
  assert.equal(kitchenStage(order({ status: "ordered", contributions: [share(me, { dispatchedAt: at(-2), deliveredAt: at(-1) })] }), me), "delivered");
  assert.equal(kitchenStage(order({ status: "cancelled" }), me), "cancelled");
  // Closed but not yet approved is still waiting for the admin, i.e. "requested".
  assert.equal(kitchenStage(order({ status: "closed" }), me), "requested");
});

test("a line with an open problem is neither on the way nor received", () => {
  const line = { dispatchedAt: at(-2), deliveredAt: null, ticketId: { status: "open", reason: "short" } };
  assert.equal(lineState(line, share(me)), "problem");
  assert.equal(lineState({ ...line, deliveredAt: at(-1) }, share(me)), "received", "settled by the admin");
  assert.equal(hasArriving(order({ status: "ordered", contributions: [share(me, { items: [line] })] }), me), false);
});

test("the timeline marks steps done up to the kitchen's stage, with their dates", () => {
  const steps = orderTimeline(order({ status: "ordered", statusChangedAt: at(-3), contributions: [share(me, { approvedAt: at(-5), dispatchedAt: at(-1) })] }), me);
  assert.deepEqual(steps.map((step) => [step.key, step.done, step.current]), [
    ["requested", true, false], ["approved", true, false], ["ordered", true, false], ["dispatched", true, true], ["delivered", false, false],
  ]);
  assert.deepEqual(steps.map((step) => step.label), ["Requested", "Approved", "Ordered", "Dispatched", "Delivered"]);
  assert.equal(steps[0].at, at(-1));
  assert.equal(steps[3].at, at(-1));
  assert.equal(steps[4].at, null);
});

test("joining is offered only on open orders still taking items that the kitchen is not on", () => {
  const others = order({ contributions: [share("kitchenB")] });
  assert.equal(canJoin(others, me, now), true);
  assert.equal(canJoin(order(), me, now), false, "already on it");
  assert.equal(canJoin({ ...others, closesAt: at(-1) }, me, now), false, "window passed");
  assert.equal(canJoin({ ...others, status: "approved" }, me, now), false);
  const list = [others, order({ _id: "o2" }), { ...others, _id: "o3", status: "closed" }];
  assert.deepEqual(otherOpenOrders(list, me, now).map((o) => o._id), ["o1"]);
  assert.deepEqual(myOrders(list, me).map((o) => o._id), ["o2"]);
  assert.equal(myShare(order(), me).godownId._id, me);
  assert.equal(myShare(others, me), null);
});

test("closing time reads simply", () => {
  assert.equal(closesInText(at(52), now), "Closes in 2 days 4 h");
  assert.equal(closesInText(at(5.5), now), "Closes in 5 h 30 min");
  assert.equal(closesInText(at(0.25), now), "Closes in 15 min");
  assert.equal(closesInText(at(-1), now), "Ordering closed");
});

test("delivery dates read as Indian dates, with a time for emergencies", () => {
  assert.equal(deliveryDateText(at(168)), "Sun, 25 Oct");
  assert.equal(deliveryDateText(at(1), { withTime: true }), "Sun, 18 Oct, 11:00 am");
});

test("lines sent on different days: the stage, each line and what can be received", () => {
  const rice = { stockItemId: "rice", dispatchedAt: at(-2), deliveredAt: null };
  const dal = { stockItemId: "dal", dispatchedAt: null, deliveredAt: null };
  const partly = order({ status: "ordered", contributions: [share(me, { items: [rice, dal] })] });
  assert.equal(kitchenStage(partly, me), "dispatched", "something is on the way");
  assert.equal(hasArriving(partly, me), true);
  assert.deepEqual([lineState(rice, myShare(partly, me)), lineState(dal, myShare(partly, me))], ["on_the_way", "not_sent"]);
  assert.equal(orderTimeline(partly, me)[3].at, at(-2), "dispatched shows when the first line left");

  const riceIn = order({ status: "ordered", contributions: [share(me, { items: [{ ...rice, deliveredAt: at(-1) }, dal] })] });
  assert.equal(hasArriving(riceIn, me), false, "the dal has not been sent yet");
  assert.equal(lineState(riceIn.contributions[0].items[0], myShare(riceIn, me)), "received");
  assert.equal(kitchenStage(riceIn, me), "dispatched", "not delivered until every line has arrived");

  // Shares dispatched whole before lines were tracked.
  const old = order({ status: "ordered", contributions: [share(me, { dispatchedAt: at(-1), items: [{ stockItemId: "rice" }] })] });
  assert.equal(hasArriving(old, me), true);
  assert.equal(lineState(old.contributions[0].items[0], myShare(old, me)), "on_the_way");
});
