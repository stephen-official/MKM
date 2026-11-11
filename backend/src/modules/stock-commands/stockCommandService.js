import { createHash } from "node:crypto";
import { StockCommand } from "../../models/StockCommandModel.js";
import { fail } from "../../shared/httpErrors.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};

export const commandError = (status, message, code) => Object.assign(fail(status, message, code), { stockCommandError: true });

export const stockCommandContext = ({ key, actor, command, input }) => {
  if (key === undefined) return null;
  if (typeof key !== "string" || !/^[!-~]{1,200}$/.test(key)) {
    throw commandError(400, "Idempotency-Key must contain 1 to 200 printable characters without spaces", "INVALID_IDEMPOTENCY_KEY");
  }
  const actorId = String(actor.sub);
  return {
    _id: hash(canonical([actorId, command, key])), actorId, command,
    fingerprint: hash(canonical({ role: actor.role, godownId: String(actor.godownId || ""), input })),
  };
};

const replay = (record, context) => {
  if (record.fingerprint !== context.fingerprint) throw commandError(409, "This idempotency key was already used with different input", "IDEMPOTENCY_CONFLICT");
  if (record.resultJson === null) throw commandError(409, "This stock command is still processing. Retry with the same key.", "COMMAND_IN_PROGRESS");
  return { value: JSON.parse(record.resultJson), replayed: true };
};

/** The claim, stock changes and result commit together. A failed command leaves no claim to block a retry. */
export const runStockTransaction = async ({ session, context, work }) => {
  if (!context) return { value: await session.withTransaction(work), replayed: false };
  // Create the collection before starting a transaction (also supports autoCreate:false deployments).
  await StockCommand.init();
  try {
    return await session.withTransaction(async () => {
      const existing = await StockCommand.findById(context._id).session(session).lean();
      if (existing) return replay(existing, context);
      await StockCommand.create([context], { session });
      const value = await work();
      const resultJson = JSON.stringify(value ?? null);
      if (Buffer.byteLength(resultJson) > 4 * 1024 * 1024) throw commandError(413, "Stock command result is too large to save for retry", "COMMAND_RESULT_TOO_LARGE");
      await StockCommand.updateOne({ _id: context._id }, { $set: { resultJson } }, { session });
      return { value: JSON.parse(resultJson), replayed: false };
    });
  } catch (error) {
    // A competing transaction may have won the unique claim after our snapshot was opened.
    if (error.code !== 11000) throw error;
    const committed = await StockCommand.findById(context._id).lean();
    if (!committed) throw error;
    return replay(committed, context);
  }
};
