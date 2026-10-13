// Normative KPI definitions (README Decision 4). Served with every report, shown as
// tooltips and written to the export's Definitions sheet — edit here only.
export const HISTORICAL_STOCK_NOTE =
  "Stock figures are current, not as of the end of the selected period.";
export const UNVALUED_CONSUMPTION_NOTE =
  "Consumption recorded before prices were captured at issue has no value and is counted as unvalued lines.";

export const AGE_BUCKETS = Object.freeze([
  { id: "lt1d", label: "Under 1 day", maxDays: 1 },
  { id: "1to3d", label: "1 to 3 days", maxDays: 3 },
  { id: "3to7d", label: "3 to 7 days", maxDays: 7 },
  { id: "gt7d", label: "7 days or more", maxDays: null }
]);

export const DEFINITIONS = Object.freeze([
  { id: "stockValue", label: "Estimated stock value", kind: "snapshot", format: "money",
    text: "Current quantity × latest valid price for each kitchen item with stock above zero. Price = latest distribution price to that kitchen, else latest purchase-order price, else unpriced (excluded and counted separately). Active kitchens only when viewing all kitchens." },
  { id: "lowStock", label: "Items below threshold", kind: "snapshot", format: "count",
    text: "Kitchen items with a threshold set and current quantity above zero but at or below the threshold." },
  { id: "outOfStock", label: "Out of stock", kind: "snapshot", format: "count",
    text: "Kitchen items whose current quantity is zero or less." },
  { id: "consumptionValue", label: "Consumption value", kind: "period", format: "money",
    text: "Sum of the value recorded at the time of issue for consumption lines dated in the period (inclusive). A line is dated by the consumption's recorded date; when that is not a YYYY-MM-DD date, by the business date it was created. Returns net off. Lines without a recorded value are counted as unvalued, never re-priced. Compared with the previous period of equal length." },
  { id: "dailyUseLines", label: "Daily-use issues", kind: "period", format: "count",
    text: "Number of daily-use item lines dated in the period (recorded date, falling back to the business date of creation when it is not a YYYY-MM-DD date). Daily-use items carry no price, so they are counted rather than valued." },
  { id: "pendingRequests", label: "Pending requests", kind: "snapshot", format: "count",
    text: "Kitchen stock and daily-use requests currently waiting for an admin decision." },
  { id: "pendingSupplyRequests", label: "Supply requests awaiting confirmation", kind: "snapshot", format: "count",
    text: "Kitchen supply requests currently in pending status." },
  { id: "openTransfers", label: "Open transfers", kind: "snapshot", format: "count",
    text: "Transfers currently pending acceptance, where the kitchen is the sender or the receiver." },
  { id: "stockReceivedValue", label: "Stock received value", kind: "period", format: "money",
    text: "Quantity × unit price of stock distributed to the kitchen(s) during the period. Allocations without a valid price are excluded and counted. Leftover redistributions count once, as their own movements." },
  { id: "procurementSpend", label: "Procurement spend (received value)", kind: "period", format: "money",
    text: "Total of purchase orders whose received date falls in the period (received quantity, or ordered quantity when none recorded, × unit price). All kitchens only." },
  { id: "poAwaitingDistribution", label: "POs awaiting distribution", kind: "snapshot", format: "count",
    text: "Purchase orders received but not yet distributed to kitchens. All kitchens only." }
]);

export const DEFINITION_BY_ID = Object.freeze(Object.fromEntries(DEFINITIONS.map((d) => [d.id, d])));
