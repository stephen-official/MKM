const roundTo = (value, places) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const factor = 10 ** places;
  const rounded = (Math.sign(n) * Math.round((Math.abs(n) + Number.EPSILON) * factor)) / factor;
  return rounded === 0 ? 0 : rounded;
};

/** Money: half away from zero, 2 dp. Apply once to a final total, never before summing. */
export const round2 = (value) => roundTo(value, 2);
/** Quantities: 3 dp. */
export const round3 = (value) => roundTo(value, 3);
