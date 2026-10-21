import { useMemo, useState } from "react";
import { Badge, Banner, Card, DataTable, EmptyState, LoadingState, Tabs } from "../../components/ui/index.jsx";
import { DEFAULT_EXPIRY_WINDOW, EXPIRY_WINDOWS, daysLeftLabel, expiringBatches } from "./expiring.js";

const fmtQty = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const fmtDate = (iso) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
const WINDOW_TABS = EXPIRY_WINDOWS.map((days) => ({ value: days, label: `${days} days` }));

/** Kitchen stock that is expired or about to expire, across every kitchen. Uses the batches Stock Levels already loads. */
export function ExpiringPanel({ batches = [], loading = false }) {
  const [days, setDays] = useState(DEFAULT_EXPIRY_WINDOW);
  const rows = useMemo(() => expiringBatches(batches, { days }), [batches, days]);
  const expired = rows.filter((row) => row.daysLeft < 0).length;

  return (
    <Card style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15 }}>Expiring stock</h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>Kitchen stock past its expiry date or close to it. Kitchens see the same items marked “use first”.</p>
        </div>
        <Tabs items={WINDOW_TABS} value={days} onChange={setDays} label="Expiry window" />
      </div>
      {expired > 0 && (
        <Banner variant="warn" style={{ marginBottom: 12 }}>
          {expired === 1 ? "1 batch has" : `${expired} batches have`} already expired. Check with the kitchen whether it was used or thrown away.
        </Banner>
      )}
      {loading && batches.length === 0 ? <LoadingState label="Loading stock batches…" />
        : rows.length === 0 ? <EmptyState title={`Nothing expires in the next ${days} days`}>Dated stock in every kitchen is good for longer than that.</EmptyState>
        : (
          <DataTable className="table--compact">
            <thead><tr><th scope="col">Kitchen</th><th scope="col">Product</th><th scope="col">Quantity</th><th scope="col">Expiry</th><th scope="col">Days left</th><th scope="col">Tracking ID</th><th scope="col">Supplier</th></tr></thead>
            <tbody>
              {rows.map(({ batch, daysLeft }) => (
                <tr key={batch._id}>
                  <td style={{ fontWeight: 650 }}>{batch.godownId?.name || "Kitchen"}</td>
                  <td>{batch.stockItemId?.name || "Product"}</td>
                  <td>{fmtQty(batch.remainingQtyBaseUnit)} {batch.stockItemId?.unitId?.symbol || ""}</td>
                  <td>{fmtDate(batch.expiryDate)}</td>
                  <td><Badge variant={daysLeft < 0 ? "alert" : "warn"}>{daysLeftLabel(daysLeft)}</Badge></td>
                  <td>{batch.trackingId || "—"}</td>
                  <td>{batch.supplierName || "—"}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
    </Card>
  );
}
