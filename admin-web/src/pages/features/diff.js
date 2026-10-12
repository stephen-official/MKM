export const applyEdits = (saved, edits) => ({ ...saved, ...edits });

export const pendingChanges = (saved, edits) =>
  Object.fromEntries(Object.entries(edits).filter(([key, value]) => saved[key] !== value));

export const pruneEdits = (saved, edits) => pendingChanges(saved, edits);

const word = (value) => (value ? "shown" : "hidden");
export const describeChange = ({ key, previous, next }, labels) => `${labels[key] || key}: ${word(previous)} → ${word(next)}`;
