import { linePath, niceMax, niceMin } from "./chartScale.js";
import { formatMoney, formatPct } from "./format.js";

const W = 640;
const H = 180;

export function TrendChart({ data }) {
  const values = data.points.map((p) => p.value);
  const max = niceMax(Math.max(0, ...values));
  const min = niceMin(Math.min(0, ...values));
  const pointY = (v) => H - ((v - min) / (max - min)) * H;
  const zeroY = pointY(0);
  const unvalued = data.points.reduce((s, p) => s + p.unvaluedLines, 0);
  return (
    <figure className="exec-chart">
      <figcaption className="exec-chart__caption">
        Total {formatMoney(data.total)}{data.deltaPct !== null && ` · ${formatPct(data.deltaPct)} vs previous period`}
        {unvalued > 0 && ` · ${unvalued} unvalued lines not plotted`}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="exec-chart__svg" role="img"
        aria-label={`Daily consumption value from ${data.points[0]?.date} to ${data.points.at(-1)?.date}`}>
        <line x1="0" x2={W} y1={zeroY} y2={zeroY} className="exec-chart__axis" />
        {data.points.length === 1 ? (
          // A single point has no line to draw: a zero-length round-capped stroke renders a dot that stays circular under the stretched viewBox.
          <line x1={W / 2} x2={W / 2} y1={pointY(data.points[0].value)} y2={pointY(data.points[0].value)} className="exec-chart__dot" vectorEffect="non-scaling-stroke" />
        ) : (
          <path d={linePath(data.points, { width: W, height: H, max, min })} className="exec-chart__line" fill="none" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      <div className="exec-chart__scale" aria-hidden="true">
        <span>{formatMoney(max)}</span><span>{data.points[0]?.date}</span><span>{data.points.at(-1)?.date}</span>
      </div>
      <details className="exec-chart__table">
        <summary>Show the daily values</summary>
        <table className="table">
          <thead><tr><th scope="col">Date</th><th scope="col">Value</th><th scope="col">Unvalued lines</th></tr></thead>
          <tbody>{data.points.map((p) => <tr key={p.date}><td>{p.date}</td><td>{formatMoney(p.value)}</td><td>{p.unvaluedLines}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}
