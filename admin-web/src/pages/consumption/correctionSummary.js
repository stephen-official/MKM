// Pure: turns a usage correction (GET /usage-corrections row) into plain words for the admin, plus a before/after table.

const qty = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const amount = (line) => `${qty(line.qtyBaseUnit)} ${line.unit || ""}`.trim();
const nameOf = (line) => line.name || "Unknown item";

/* "27 Oct 2026" from a business date (YYYY-MM-DD) without a timezone shift. */
export const longDay = (dateKey) => {
  const [y, m, d] = String(dateKey || "").split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : dateKey || "-";
};

/** At most `max` entries joined with " · ", then "+N more". */
const brief = (parts, max = 3) => parts.length <= max ? parts.join(" · ") : `${parts.slice(0, max).join(" · ")} · +${parts.length - max} more`;

/**
 * Every item the correction touches, in the order: changed/removed lines as they were, then added lines.
 * kind: "same" | "changed" | "removed" | "added".
 * The kitchen app's adminChanges (client-web/src/features/kitchen/orders.js) uses the same idea — keep the two in step.
 */
export const correctionChanges = (row) => {
  const before = row.before || [];
  const after = row.items || [];
  const afterById = new Map(after.map((line) => [String(line.stockItemId), line]));
  const rows = before.map((line) => {
    const next = afterById.get(String(line.stockItemId));
    const unit = line.unit || next?.unit || "";
    if (!next) return { name: nameOf(line), unit, before: line.qtyBaseUnit, after: null, kind: "removed" };
    return { name: nameOf(line), unit, before: line.qtyBaseUnit, after: next.qtyBaseUnit, kind: Number(next.qtyBaseUnit) === Number(line.qtyBaseUnit) ? "same" : "changed" };
  });
  const seen = new Set(before.map((line) => String(line.stockItemId)));
  for (const line of after) {
    if (!seen.has(String(line.stockItemId))) rows.push({ name: nameOf(line), unit: line.unit || "", before: null, after: line.qtyBaseUnit, kind: "added" });
  }
  return rows;
};

/** { title, lines } — a heading and two or three short sentences saying what the kitchen wants. */
export const describeCorrection = (row) => {
  const kitchen = row.kitchen?.name || "A kitchen";
  const day = longDay(row.date);
  if (row.kind === "reopen_day") {
    const items = row.items || [];
    return {
      title: `Record usage on ${day} · ${kitchen}`,
      lines: [
        `${day} is marked "no usage". ${kitchen} says that was a mistake and stock was used.`,
        items.length === 0 ? "Wants the day opened again." : `Wants to record: ${brief(items.map((line) => `${nameOf(line)} ${amount(line)}`))}.`,
      ],
    };
  }
  const changes = correctionChanges(row);
  const before = row.before || [];
  const after = row.items || [];
  if (after.length === 0) {
    return {
      title: `Cancel usage record of ${day} · ${kitchen}`,
      lines: [
        `Wants the whole record removed: ${brief(before.map((line) => `${nameOf(line)} ${amount(line)}`))}.`,
        "Approving puts every quantity back into the kitchen's stock.",
      ],
    };
  }
  const words = changes.filter((change) => change.kind !== "same").map((change) => {
    if (change.kind === "removed") return `${change.name} removed`;
    if (change.kind === "added") return `${change.name} ${qty(change.after)} ${change.unit} added`.replace(/\s+/g, " ");
    return `${change.name} ${qty(change.before)} → ${qty(change.after)} ${change.unit}`.trim();
  });
  const same = changes.length - words.length;
  return {
    title: `Change usage of ${day} · ${kitchen}`,
    lines: [
      `${brief(words)}.`,
      `${before.length} ${before.length === 1 ? "item" : "items"} before, ${after.length} after${same > 0 ? ` (${same} unchanged)` : ""}. Stock moves by the difference.`,
    ],
  };
};
