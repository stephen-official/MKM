// Moves existing products onto the preset units and reports what each product still needs.
//   npm --prefix backend run migrate-product-catalog            (dry run: prints the plan, changes nothing)
//   npm --prefix backend run migrate-product-catalog -- --apply (makes the changes)
// A unit that clearly means a preset ("Kg", "kgs", "Nos") is merged into that preset: its products are
// re-pointed and the old unit is removed. A unit with no clear match is left alone and reported; its
// products stay incomplete (hidden from kitchens) until a super-admin picks a preset unit on the products page.
import "dotenv/config";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import { StockItem, Unit } from "../models/InventoryModels.js";
import { ensurePresetUnits } from "../catalog/productService.js";
import { MISSING_LABELS, missingFields } from "../catalog/completeness.js";
import { UNIT_PRESETS, isPresetSymbol, presetFor } from "../catalog/units.js";

/** Read-only: what --apply would do. */
export const planCatalogMigration = async () => {
  const [units, products] = await Promise.all([Unit.find().lean(), StockItem.find().lean()]);
  const productsByUnit = new Map();
  for (const product of products) {
    const key = String(product.unitId);
    if (!productsByUnit.has(key)) productsByUnit.set(key, []);
    productsByUnit.get(key).push(product.name);
  }
  const merges = [];
  const unmatched = [];
  for (const unit of units) {
    if (isPresetSymbol(unit.symbol)) continue;
    const preset = presetFor(unit);
    const entry = { unitId: String(unit._id), symbol: unit.symbol, name: unit.name, products: productsByUnit.get(String(unit._id)) || [] };
    if (preset) merges.push({ ...entry, into: preset.symbol });
    else unmatched.push(entry);
  }
  const unitById = new Map(units.map((unit) => [String(unit._id), unit]));
  const mergedInto = new Map(merges.map((merge) => [merge.unitId, merge.into]));
  const incomplete = products.map((product) => {
    const unit = unitById.get(String(product.unitId));
    // Judge each product as it will be after the merges.
    const after = unit && mergedInto.has(String(unit._id)) ? { symbol: mergedInto.get(String(unit._id)) } : unit;
    return { name: product.name, archived: Boolean(product.archived), missing: missingFields(product, after) };
  }).filter((row) => !row.archived && row.missing.length > 0);
  return { merges, unmatched, incomplete, productCount: products.length };
};

export const applyCatalogMigration = async (plan) => {
  const presets = new Map((await ensurePresetUnits()).map((unit) => [unit.symbol, unit._id]));
  let moved = 0;
  for (const merge of plan.merges) {
    const result = await StockItem.updateMany({ unitId: merge.unitId }, { $set: { unitId: presets.get(merge.into) } });
    moved += result.modifiedCount;
    if (!(await StockItem.exists({ unitId: merge.unitId }))) await Unit.deleteOne({ _id: merge.unitId });
  }
  return { moved };
};

const describe = (plan) => {
  const lines = [`Products: ${plan.productCount}. Preset units: ${UNIT_PRESETS.map((u) => u.symbol).join(", ")}.`];
  lines.push("", `Units merged into a preset (${plan.merges.length}):`);
  for (const m of plan.merges) lines.push(`  "${m.symbol}" (${m.name}) → ${m.into}  [${m.products.length} products]`);
  lines.push("", `Units with no clear preset (${plan.unmatched.length}) — left as they are; add a preset or fix the products:`);
  for (const u of plan.unmatched) lines.push(`  "${u.symbol}" (${u.name}): ${u.products.join(", ") || "no products"}`);
  lines.push("", `Products kitchens cannot use until completed (${plan.incomplete.length}):`);
  for (const row of plan.incomplete) lines.push(`  ${row.name}: needs ${row.missing.map((code) => MISSING_LABELS[code].toLowerCase()).join(", ")}`);
  return lines.join("\n");
};

const main = async () => {
  const apply = process.argv.includes("--apply");
  try {
    const { connectDB } = await import("../config/db.js");
    await connectDB();
    const plan = await planCatalogMigration();
    console.log(describe(plan));
    if (apply) {
      const { moved } = await applyCatalogMigration(plan);
      console.log(`\nApplied: ${moved} products moved to preset units.`);
    } else {
      console.log("\nDry run only. Re-run with --apply to make these changes.");
    }
    process.exitCode = 0;
  } catch (error) {
    console.error(`Catalog migration failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
