// The only units a product may use. Kitchens enter quantities in exactly these units (no conversion),
// so adding one here is the whole change: the products page and the migration read this list.
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

/** True only for the exact preset symbol: "Kg" or "kgs" must be corrected before a product is complete. */
export const isPresetSymbol = (symbol) => SYMBOL_SET.has(symbol);

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
