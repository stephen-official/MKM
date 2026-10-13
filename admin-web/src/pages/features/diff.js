export const applyEdits = (saved, edits) => ({ ...saved, ...edits });

export const pendingChanges = (saved, edits) =>
  Object.fromEntries(Object.entries(edits).filter(([key, value]) => saved[key] !== value));

export const pruneEdits = (saved, edits) => pendingChanges(saved, edits);

// null/undefined is an override that was cleared (or never set): it falls back to the level above.
const word = (value) => (value === null || value === undefined ? "inherited" : value ? "shown" : "hidden");
export const describeChange = ({ key, previous, next }, labels) => `${labels[key] || key}: ${word(previous)} → ${word(next)}`;

/** "All admins" / "Kitchen: Main" / "User: Amy"; falls back to the raw id when the name is unknown. */
export const describeScope = ({ scope, targetId }, names = {}) => {
  if (scope === "global") return "All admins";
  const name = names[scope]?.[String(targetId)] || targetId;
  if (scope === "kitchen") return `Kitchen: ${name}`;
  if (scope === "user") return `User: ${name}`;
  return `${scope} ${targetId}`;
};
