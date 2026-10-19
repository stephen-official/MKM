import { Counter } from "../models/CounterModel.js";
import { businessDateOf } from "../executive/params.js";

/**
 * The next batch tracking ID, e.g. MKM-2610-0042: MKM, year and month of receipt (business time), then a running
 * number that restarts every month. Bumped inside the caller's transaction, so two kitchens receiving at once
 * never share a number (the losing transaction retries).
 */
export const nextTrackingId = async ({ session, now = new Date() }) => {
  const yymm = businessDateOf(now).slice(2, 7).replace("-", "");
  const counter = await Counter.findOneAndUpdate(
    { _id: `batch-${yymm}` }, { $inc: { seq: 1 } }, { new: true, upsert: true, session },
  );
  return `MKM-${yymm}-${String(counter.seq).padStart(4, "0")}`;
};
