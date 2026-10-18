import { formatMoney, plural } from "./format.js";

export function KitchenConsumptionOverview({ kitchens, onSelect }) {
  const max = Math.max(...kitchens.map((row) => Math.abs(row.total)), 1);
  return (
    <figure className="exec-kitchen-bars">
      <figcaption>Consumption value for the selected period</figcaption>
      <div className="exec-kitchen-bars__plot" role="img" aria-label={`Consumption value across ${kitchens.length} ${plural(kitchens.length, "kitchen", "kitchens")}`}>
        {kitchens.map((row) => (
          <button type="button" className="exec-kitchen-bar exec-explainable" key={row.godownId} onClick={() => onSelect?.(row)} aria-label={`Explain ${row.kitchen} consumption`}>
            <div className="exec-kitchen-bar__label">
              <strong>{row.kitchen}</strong>
              <span>{formatMoney(row.total)}</span>
            </div>
            <div className="exec-kitchen-bar__track" aria-hidden="true">
              <i className={row.total < 0 ? "exec-kitchen-bar__fill exec-kitchen-bar__fill--negative" : "exec-kitchen-bar__fill"} style={{ width: `${(Math.abs(row.total) / max) * 100}%` }} />
            </div>
            {(row.deleted || !row.active || row.unvaluedLines > 0) && (
              <small>
                {row.deleted ? "Deleted kitchen" : !row.active ? "Inactive" : ""}
                {(row.deleted || !row.active) && row.unvaluedLines > 0 ? " · " : ""}
                {row.unvaluedLines > 0 ? `${row.unvaluedLines} unvalued ${plural(row.unvaluedLines, "line", "lines")}` : ""}
              </small>
            )}
          </button>
        ))}
      </div>
    </figure>
  );
}
