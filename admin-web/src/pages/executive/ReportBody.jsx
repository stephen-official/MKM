import { useState } from "react";
import { Card } from "../../components/ui/index.jsx";
import { KpiGrid } from "./KpiGrid.jsx";
import { Section } from "./Section.jsx";
import { TrendChart } from "./TrendChart.jsx";
import { TopItems } from "./TopItems.jsx";
import { Procurement } from "./Procurement.jsx";
import { RequestsTransfers } from "./RequestsTransfers.jsx";
import { KitchenComparison } from "./KitchenComparison.jsx";
import { KitchenConsumptionOverview } from "./KitchenConsumption.jsx";
import { CalculationDialog } from "./CalculationDialog.jsx";
import { formatMoney, plural } from "./format.js";
import {
  comparisonWorking,
  flowDetailWorking,
  flowWorking,
  kitchenConsumptionWorking,
  kitchenComparisonRowWorking,
  kpiWorking,
  overallConsumptionWorking,
  procurementDetailWorking,
  procurementWorking,
  reportingBasisWorking,
  topItemWorking,
  topItemsWorking,
  trendWorking,
} from "./workings.js";

export function ReportBody({ report, onSelectKitchen, onPage }) {
  const [working, setWorking] = useState(null);
  const { meta, kpis, sections: s } = report;
  const data = (section) => (section?.status === "ok" ? section.data : null);
  const trend = data(s.consumptionTrend);
  const top = data(s.topItems);
  const kitchenTrends = trend?.kitchens;
  return (
    <>
      <Card
        as="button"
        type="button"
        className="exec-directors-note exec-explainable"
        onClick={() => setWorking(reportingBasisWorking(report))}
        aria-label="Explain the reporting basis"
      >
        <span className="exec-directors-note__label">Reporting basis</span>
        <p>{meta.notes.historicalStock} Values marked “Estimated” use the latest known price.</p>
        <span className="exec-explainable__hint" aria-hidden="true">View basis</span>
      </Card>
      <KpiGrid kpis={kpis} onExplain={(kpi) => setWorking(kpiWorking(kpi, report))} />
      <div className={`exec-grid exec-grid--lead${kitchenTrends ? " exec-grid--kitchen-trends" : ""}`}>
        <div className="exec-consumption-stack">
          {kitchenTrends ? (
            <>
              <Section title="Overall" note="Each bar represents one kitchen’s consumption value for the selected period." section={s.consumptionTrend}
                isEmpty={kitchenTrends.length === 0} emptyText="There are no kitchens to compare."
                onExplain={() => setWorking(overallConsumptionWorking(trend, meta))}>
                {kitchenTrends.length > 0 && <KitchenConsumptionOverview kitchens={kitchenTrends} onSelect={(kitchen) => setWorking(kitchenConsumptionWorking(kitchen, meta, trend))} />}
              </Section>
              <div className="exec-trend-heading">
                <span>Kitchen trends</span>
                <p>Daily consumption value, shown one kitchen below the other</p>
              </div>
              {kitchenTrends.map((kitchen) => (
                <Section
                  key={kitchen.godownId}
                  title={kitchen.kitchen}
                  note={`${formatMoney(kitchen.total)} in period${kitchen.deleted ? " · deleted kitchen" : !kitchen.active ? " · inactive" : ""}${kitchen.unvaluedLines > 0 ? ` · ${kitchen.unvaluedLines} unvalued ${plural(kitchen.unvaluedLines, "line", "lines")}` : ""}`}
                  section={s.consumptionTrend}
                  onExplain={() => setWorking(kitchenConsumptionWorking(kitchen, meta, trend))}
                >
                  <TrendChart data={{ points: kitchen.points, total: kitchen.total }} />
                </Section>
              ))}
            </>
          ) : (
            <Section title="Consumption trend" section={s.consumptionTrend}
              isEmpty={trend && trend.points.every((p) => p.value === 0 && p.unvaluedLines === 0)}
              emptyText="No consumption was recorded in this period."
              onExplain={() => setWorking(trendWorking(trend, meta))}>
              {trend && <TrendChart data={trend} />}
            </Section>
          )}
        </div>
        <Section title="Top consumed items" section={s.topItems} isEmpty={top && top.items.length === 0} emptyText="No consumption was recorded in this period."
          onExplain={() => setWorking(topItemsWorking(top, meta, trend))}>
          {top && <TopItems data={top} onSelect={(item) => setWorking(topItemWorking(item, meta, { items: top.items, trend }))} />}
        </Section>
      </div>
      <div className="exec-group-heading">
        <div><span>Operations</span><h2>Supply flow</h2></div>
        <p>Purchasing, requests and movement across kitchens</p>
      </div>
      <div className="exec-grid">
        <Section title="Procurement" section={s.procurement} onExplain={() => setWorking(procurementWorking(data(s.procurement), meta))}>
          {data(s.procurement) && <Procurement data={data(s.procurement)} onExplain={(target) => setWorking(procurementDetailWorking(target, data(s.procurement), meta))} />}
        </Section>
        <Section title="Requests and transfers" section={s.requestsTransfers} onExplain={() => setWorking(flowWorking(data(s.requestsTransfers), meta))}>
          {data(s.requestsTransfers) && <RequestsTransfers data={data(s.requestsTransfers)} onExplain={(target) => setWorking(flowDetailWorking(target, data(s.requestsTransfers), meta))} />}
        </Section>
      </div>
      {s.kitchenComparison && (
        <div className="exec-full-width">
          <Section title="Kitchen comparison" note="Select a kitchen to open its report." section={s.kitchenComparison}
            isEmpty={data(s.kitchenComparison)?.total === 0} emptyText="No kitchens have activity in this period."
            onExplain={() => setWorking(comparisonWorking(data(s.kitchenComparison), meta))}>
            {data(s.kitchenComparison) && <KitchenComparison data={data(s.kitchenComparison)} onSelectKitchen={onSelectKitchen} onPage={(p) => onPage("comparison", p)} onExplain={(row) => setWorking(kitchenComparisonRowWorking(row, meta))} />}
          </Section>
        </div>
      )}
      <footer className="exec-report-notes">
        <strong>How to read this report</strong>
        <p>{meta.notes.unvaluedConsumption} Snapshot figures show the current position; period figures use the selected dates.</p>
      </footer>
      <CalculationDialog spec={working} onClose={() => setWorking(null)} />
    </>
  );
}
