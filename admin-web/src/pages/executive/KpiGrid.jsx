import { Badge } from "../../components/ui/index.jsx";
import { formatCount, formatDays, formatMoney, formatPct, formatQty, plural } from "./format.js";

const HEADLINE_IDS = new Set(["stockValue", "consumptionValue", "stockReceivedValue", "procurementSpend"]);

const valueText = (kpi) => (kpi.format === "money" ? formatMoney(kpi.value) : formatCount(kpi.value));

const detailLine = (kpi) => {
  const d = kpi.details || {};
  switch (kpi.id) {
    case "stockValue":
      return d.unpricedItemCount ? `${formatCount(d.unpricedItemCount)} ${plural(d.unpricedItemCount, "item", "items")} without a price (${formatQty(d.unpricedQty)} base units) excluded` : "All stocked items priced";
    case "consumptionValue":
      return [
        d.deltaPct === null ? "No previous-period value to compare" : `${formatPct(d.deltaPct)} vs previous period (${formatMoney(d.previousValue)})`,
        d.unvaluedLineCount ? `${formatCount(d.unvaluedLineCount)} unvalued ${plural(d.unvaluedLineCount, "line", "lines")} not included` : null
      ].filter(Boolean).join(" · ");
    case "pendingRequests":
    case "openTransfers":
      return d.oldestAgeDays === null || d.oldestAgeDays === undefined ? "None waiting" : `Oldest waiting ${formatDays(d.oldestAgeDays)}`;
    case "stockReceivedValue":
      return d.unpricedAllocationCount ? `${formatCount(d.unpricedAllocationCount)} unpriced ${plural(d.unpricedAllocationCount, "allocation", "allocations")} excluded` : `${formatCount(d.distributionCount)} ${plural(d.distributionCount, "distribution", "distributions")}`;
    case "procurementSpend":
      return `${formatCount(d.poCount)} ${plural(d.poCount, "purchase order", "purchase orders")}`;
    case "poAwaitingDistribution":
      return `${formatMoney(d.value)} awaiting distribution`;
    default:
      return null;
  }
};

const hasMissingData = (kpi) =>
  (kpi.id === "stockValue" && kpi.details?.unpricedItemCount > 0) ||
  (kpi.id === "consumptionValue" && kpi.details?.unvaluedLineCount > 0) ||
  (kpi.id === "stockReceivedValue" && kpi.details?.unpricedAllocationCount > 0);

export function KpiGrid({ kpis, onExplain }) {
  const headline = kpis.filter((kpi) => HEADLINE_IDS.has(kpi.id));
  const operational = kpis.filter((kpi) => !HEADLINE_IDS.has(kpi.id));
  const cards = (items, primary = false) => items.map((kpi, index) => (
    <li
      key={kpi.id}
      className={`exec-kpi exec-explainable${primary ? " exec-kpi--headline" : ""}${primary && index === 0 ? " exec-kpi--primary" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`${kpi.label}. Show detailed explanation and calculation.`}
      onClick={() => onExplain(kpi)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onExplain(kpi);
        }
      }}
    >
      <div className="exec-kpi__label">
        {kpi.label}
        <span className="exec-explainable__hint" aria-hidden="true">View calculation</span>
      </div>
      {kpi.status === "error" ? (
        <p className="exec-kpi__value exec-kpi__value--na">Not available</p>
      ) : (
        <p className="exec-kpi__value">{valueText(kpi)}</p>
      )}
      <div className="exec-kpi__tags">
        <Badge variant="neutral">{kpi.kind === "snapshot" ? "Current" : "In period"}</Badge>
        {kpi.estimated && <Badge variant="info">Estimated</Badge>}
        {hasMissingData(kpi) && <Badge variant="warn">Missing prices</Badge>}
      </div>
      {kpi.status === "ok" && detailLine(kpi) && <p className="exec-kpi__detail">{detailLine(kpi)}</p>}
    </li>
  ));
  return (
    <section className="exec-kpi-block" aria-labelledby="exec-key-figures">
      <div className="exec-group-heading exec-group-heading--first">
        <div><span>At a glance</span><h2 id="exec-key-figures">Key figures</h2></div>
        <p>The figures leadership is most likely to act on</p>
      </div>
      <ul className="exec-kpis exec-kpis--headline" aria-label="Headline figures">{cards(headline, true)}</ul>
      {operational.length > 0 && (
        <>
          <h3 className="exec-pulse-title">Operational pulse</h3>
          <ul className="exec-kpis exec-kpis--compact" aria-label="Operational figures">{cards(operational)}</ul>
        </>
      )}
    </section>
  );
}
