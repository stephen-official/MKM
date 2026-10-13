import { Banner } from "../../components/ui/index.jsx";
import { KpiGrid } from "./KpiGrid.jsx";
import { Section } from "./Section.jsx";
import { TrendChart } from "./TrendChart.jsx";
import { TopItems } from "./TopItems.jsx";
import { StockHealth } from "./StockHealth.jsx";
import { UnpricedStock } from "./UnpricedStock.jsx";
import { Procurement } from "./Procurement.jsx";
import { RequestsTransfers } from "./RequestsTransfers.jsx";
import { KitchenComparison } from "./KitchenComparison.jsx";

export function ReportBody({ report, onSelectKitchen, onPage }) {
  const { meta, kpis, sections: s } = report;
  const data = (section) => (section?.status === "ok" ? section.data : null);
  const trend = data(s.consumptionTrend);
  const top = data(s.topItems);
  const health = data(s.stockHealth);
  const unpriced = data(s.unpricedStock);
  return (
    <>
      <Banner variant="info">{meta.notes.historicalStock} Values marked “Estimated” use the latest known price.</Banner>
      <KpiGrid kpis={kpis} definitions={meta.definitions} />
      <div className="exec-grid">
        <Section title="Consumption trend" section={s.consumptionTrend}
          isEmpty={trend && trend.points.every((p) => p.value === 0 && p.unvaluedLines === 0)}
          emptyText="No consumption was recorded in this period.">
          {trend && <TrendChart data={trend} />}
        </Section>
        <Section title="Top consumed items" section={s.topItems} isEmpty={top && top.items.length === 0} emptyText="No consumption was recorded in this period.">
          {top && <TopItems data={top} />}
        </Section>
        <Section title="Stock health" note="Current stock, not as of the end of the period." section={s.stockHealth}
          isEmpty={health && health.total === 0} emptyText="Every item is above its threshold.">
          {health && <StockHealth data={health} onPage={(p) => onPage("health", p)} />}
        </Section>
        <Section title="Items without a price" note="Excluded from the estimated stock value." section={s.unpricedStock}
          isEmpty={unpriced && unpriced.total === 0} emptyText="Every stocked item has a price.">
          {unpriced && <UnpricedStock data={unpriced} onPage={(p) => onPage("unpriced", p)} />}
        </Section>
        <Section title="Procurement" section={s.procurement}>
          {data(s.procurement) && <Procurement data={data(s.procurement)} />}
        </Section>
        <Section title="Requests and transfers" section={s.requestsTransfers}>
          {data(s.requestsTransfers) && <RequestsTransfers data={data(s.requestsTransfers)} />}
        </Section>
        {s.kitchenComparison && (
          <Section title="Kitchen comparison" note="Select a kitchen to open its report." section={s.kitchenComparison}
            isEmpty={data(s.kitchenComparison)?.total === 0} emptyText="No kitchens have activity in this period.">
            {data(s.kitchenComparison) && <KitchenComparison data={data(s.kitchenComparison)} onSelectKitchen={onSelectKitchen} onPage={(p) => onPage("comparison", p)} />}
          </Section>
        )}
      </div>
    </>
  );
}
