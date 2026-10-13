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

const SCOPE_NOTES = {
  global: "Changes apply to administrators within a minute (immediately on their next action). Super-admins always see every module. Shared reference data (stock items, kitchens, units, stock levels) stays available to the modules that depend on it.",
  kitchen: "A kitchen override applies to everyone using that kitchen in the kitchen app and takes priority over the general setting. Changes apply within a minute. Choose Inherit to remove an override.",
  user: "A user override applies to one person and takes priority over their kitchen's override and the general setting. Super-admins are never restricted. Changes apply within a minute. Choose Inherit to remove an override."
};

/** Explains what the active settings tab does. */
export const scopeNote = (scope) => SCOPE_NOTES[scope] || SCOPE_NOTES.global;

/**
 * Which override-target lists (kitchens, users) the page needs: those whose tab was opened, plus any whose
 * names appear in the change history (so audit rows show names rather than ids).
 */
export const neededTargetScopes = (visitedScopes, auditItems = []) => {
  const seen = new Set(visitedScopes);
  for (const row of auditItems) seen.add(row.scope);
  return { kitchen: seen.has("kitchen"), user: seen.has("user") };
};
