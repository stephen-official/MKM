import { Unit } from "../models/InventoryModels.js";

// The built-in units. Kitchens enter quantities in exactly a product's unit (no conversion). A super-admin may add more in
// Settings (Unit.offered); built-in ones cannot be removed. The aliases help read spreadsheets and old data.
export const UNIT_PRESETS = Object.freeze([
  { symbol: "kg", name: "Kilogram", aliases: ["kg", "kgs", "kilo", "kilos", "kilogram", "kilograms"] },
  { symbol: "g", name: "Gram", aliases: ["g", "gm", "gms", "gram", "grams", "gr"] },
  { symbol: "L", name: "Litre", aliases: ["l", "lt", "ltr", "ltrs", "litre", "litres", "liter", "liters"] },
  { symbol: "mL", name: "Millilitre", aliases: ["ml", "mls", "millilitre", "millilitres", "milliliter", "milliliters"] },
  { symbol: "pcs", name: "Pieces", aliases: ["pcs", "pc", "piece", "pieces", "nos", "no", "no.", "number", "numbers", "each", "units", "unit"] },
  { symbol: "dozen", name: "Dozen", aliases: ["dozen", "dozens", "doz", "dz"] },
  { symbol: "packet", name: "Packet", aliases: ["packet", "packets", "pkt", "pkts", "pack", "packs"] }
]);

export const PRESET_SYMBOLS = Object.freeze(UNIT_PRESETS.map((unit) => unit.symbol));
const SYMBOL_SET = new Set(PRESET_SYMBOLS);

/** True only for the exact built-in symbol. */
export const isPresetSymbol = (symbol) => SYMBOL_SET.has(symbol);

// Units a product may use: the built-in ones plus those added in Settings. Held in memory because the completeness check
// is synchronous and runs wherever kitchens see a product; refreshed at start-up, after every Settings change and each minute.
let offered = new Set(PRESET_SYMBOLS);
/** True for an exact built-in or added symbol: "Kg" or "kgs" must be corrected before a product is complete. */
export const isOfferedSymbol = (symbol) => offered.has(symbol);
export const refreshOfferedUnits = async () => {
  const added = await Unit.find({ offered: true }).select("symbol").lean();
  offered = new Set([...PRESET_SYMBOLS, ...added.map((unit) => unit.symbol)]);
  return offered;
};
export const startOfferedUnitsRefresh = () => {
  refreshOfferedUnits().catch(() => {});
  const timer = setInterval(() => refreshOfferedUnits().catch(() => {}), 60_000);
  timer.unref?.();
};

const norm = (text) => String(text ?? "").trim().toLowerCase();

/** The preset an existing unit most likely means, by its symbol first and then its name; null when unclear. */
export const presetFor = ({ symbol, name } = {}) => {
  for (const candidate of [symbol, name]) {
    const key = norm(candidate);
    if (!key) continue;
    const match = UNIT_PRESETS.find((unit) => unit.aliases.includes(key));
    if (match) return match;
  }
  return null;
};
