const STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

export const niceMax = (value) => {
  if (!(value > 0)) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = STEPS.find((s) => s * magnitude >= value);
  return step * magnitude;
};

export const niceMin = (value) => (value >= 0 ? 0 : -niceMax(-value));

export const linePath = (points, { width, height, max, min }) => {
  if (!points.length) return "";
  const range = max - min || 1;
  const y = (v) => Math.round((height - ((v - min) / range) * height) * 100) / 100;
  if (points.length === 1) return `M${width / 2},${y(points[0].value)}`;
  const x = (i) => Math.round(((i / (points.length - 1)) * width) * 100) / 100;
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
};

/**
 * Y-axis labels to draw. The maximum is always labelled; when the data goes negative the zero line and the
 * minimum are labelled too. `fraction` is the distance from the top of the plot (0 = top, 1 = bottom).
 */
/** Closest two axis labels may sit, as a fraction of the plot height. */
const MIN_TICK_GAP = 0.12;

export const axisTicks = ({ min, max }) => {
  const range = max - min || 1;
  const at = (value) => (max - value) / range;
  const ticks = [{ kind: "max", value: max, fraction: 0 }];
  if (min < 0) {
    const zero = at(0);
    // With mostly-negative data the zero line sits at the top: its label replaces the (crowded) maximum.
    if (zero < MIN_TICK_GAP) ticks.shift();
    ticks.push({ kind: "zero", value: 0, fraction: zero });
    ticks.push({ kind: "min", value: min, fraction: 1 });
  }
  return ticks;
};
