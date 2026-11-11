import { pricesForKitchen } from "../../executive/valuation.js";
import { round2 } from "../../utils/money.js";

/** Adds unitPriceAtIssue/amountAtIssue to lines; `keep` maps stockItemId → an already-captured price. */
export const priceLines = async (godownId, lines, keep = new Map()) => {
  let prices = new Map();
  try {
    prices = await pricesForKitchen(godownId, lines.filter((l) => !keep.has(String(l.stockItemId))).map((l) => l.stockItemId));
  } catch (error) {
    // Valuation is a nice-to-have at issue time: recording the consumption must not depend on it.
    // Lines are stored unpriced (null) and show up as unvalued lines in the report.
    console.error(`[consumption] PRICE_LOOKUP_FAILED godown=${godownId}: ${error.message}`);
  }
  return lines.map((line) => {
    const id = String(line.stockItemId);
    const unitPrice = keep.has(id) ? keep.get(id) : prices.get(id)?.price ?? null;
    const qty = Number(line.qtyBaseUnit);
    return {
      ...line,
      unitPriceAtIssue: unitPrice,
      amountAtIssue: unitPrice === null || !Number.isFinite(qty) ? null : round2(qty * unitPrice)
    };
  });
};
