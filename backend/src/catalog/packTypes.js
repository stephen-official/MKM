// Pack types a product can be ordered in. The presets are fixed; anything else is a custom type that an admin
// may add by typing it on a pack and retire again with the products page. The admin app mirrors this list.
export const PRESET_PACK_TYPES = Object.freeze(["Box/Carton", "Bag", "Can", "Tub"]);
export const MAX_PACK_NAME_LENGTH = 40;

const sameName = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

export const isPresetPackType = (name) => PRESET_PACK_TYPES.some((preset) => sameName(preset, name));

const capitalizeFirst = (text) => text.charAt(0).toUpperCase() + text.slice(1);

/** "bag " -> "Bag" so one type is never stored under two spellings; custom names get a capital first letter. */
export const canonicalPackName = (name) => {
  const trimmed = String(name ?? "").trim().replace(/\s+/g, " ");
  return PRESET_PACK_TYPES.find((preset) => sameName(preset, trimmed)) || capitalizeFirst(trimmed);
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const packNameMatch = (name) => ({ $regex: `^${escapeRegex(String(name).trim())}$`, $options: "i" });

/**
 * Products that have a pack of this type. `disabled` is true when every pack the product has is of this type,
 * so removing the type leaves bulk ordering on with no pack: the product turns incomplete and kitchens lose it.
 */
export const summarizePackTypeUsage = (products, name) => products
  .filter((product) => product.soldInPacks && (product.packs || []).some((pack) => sameName(pack.name, name)))
  .map((product) => ({
    _id: product._id,
    name: product.name,
    disabled: (product.packs || []).every((pack) => sameName(pack.name, name))
  }));
