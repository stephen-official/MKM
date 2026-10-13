import { Badge } from "../../components/ui/index.jsx";
import { InfoTip } from "./InfoTip.jsx";
import { formatCount, formatDays, formatMoney, formatPct, formatQty } from "./format.js";

const valueText = (kpi) => (kpi.format === "money" ? formatMoney(kpi.value) : formatCount(kpi.value));

const detailLine = (kpi) => {
  const d = kpi.details || {};
  switch (kpi.id) {
    case "stockValue":
      return d.unpricedItemCount ? `${formatCount(d.unpricedItemCount)} items without a price (${formatQty(d.unpricedQty)} base units) excluded` : "All stocked items priced";
    case "consumptionValue":
      return [
        d.deltaPct === null ? "No previous-period value to compare" : `${formatPct(d.deltaPct)} vs previous period (${formatMoney(d.previousValue)})`,
        d.unvaluedLineCount ? `${formatCount(d.unvaluedLineCount)} unvalued lines not included` : null
      ].filter(Boolean).join(" · ");
    case "pendingRequests":
    case "openTransfers":
      return d.oldestAgeDays === null || d.oldestAgeDays === undefined ? "None waiting" : `Oldest waiting ${formatDays(d.oldestAgeDays)}`;
    case "stockReceivedValue":
      return d.unpricedAllocationCount ? `${formatCount(d.unpricedAllocationCount)} unpriced allocations excluded` : `${formatCount(d.distributionCount)} distributions`;
    case "procurementSpend":
      return `${formatCount(d.poCount)} purchase orders`;
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

export function KpiGrid({ kpis, definitions }) {
  const textFor = (id) => definitions.find((d) => d.id === id)?.text || "";
  return (
    <ul className="exec-kpis" aria-label="Key figures">
      {kpis.map((kpi) => (
        <li key={kpi.id} className="exec-kpi">
          <div className="exec-kpi__label">
            {kpi.label}
            <InfoTip label={kpi.label} text={textFor(kpi.id)} />
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
          {kpi.status === "ok" && <p className="exec-kpi__detail">{detailLine(kpi)}</p>}
        </li>
      ))}
    </ul>
  );
}
