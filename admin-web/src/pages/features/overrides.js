export const TRI_STATE = ["inherit", "shown", "hidden"];
export const toTri = (value) => (value === true ? "shown" : value === false ? "hidden" : "inherit");
export const fromTri = (tri) => (tri === "shown" ? true : tri === "hidden" ? false : null);

export const overrideChanges = (saved, edits) =>
  Object.fromEntries(Object.entries(edits)
    .map(([key, tri]) => [key, fromTri(tri)])
    .filter(([key, value]) => (saved[key] ?? null) !== value));

export const effectivePreview = ({ base, kitchen = {}, user = {} }) => {
  const out = { ...base };
  for (const layer of [kitchen, user]) for (const [k, v] of Object.entries(layer)) if (typeof v === "boolean") out[k] = v;
  return out;
};
