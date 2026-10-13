export const MAX_PAGE = 10_000;

/** Parse a 1-based page query value; anything unusable becomes 1 and large values are capped. */
export const clampPage = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_PAGE, Math.max(1, Math.floor(n)));
};
