import { useMemo, useState } from "react";
import { Badge, Button, DataTable, DetailPanel, EmptyState, Meta } from "../../components/ui/index.jsx";
import { inr } from "./helpers.js";
import { packOptions, selectedPackage } from "../procurementPackaging.js";

const PAGE = 200;
const BLANK = { checked: false, qty: "", price: "", packageKey: "base" };
const lineTotal = (s) => Number(s.qty || 0) * Number(s.price || 0);

/* Create New tab: tick stock items, enter quantity and price, submit as an indent. */
export const IndentCreateView = ({ stock, selected, setSelected, submitting, onSubmit, searching }) => {
  const [limit, setLimit] = useState(PAGE);

  const total = useMemo(
    () => Object.values(selected).reduce((sum, s) => (s.checked ? sum + lineTotal(s) : sum), 0),
    [selected]
  );
  const checkedCount = Object.values(selected).filter((s) => s.checked).length;
  const allChecked = stock.length > 0 && stock.every((s) => selected[s._id]?.checked);

  const patch = (id, change) =>
    setSelected((prev) => ({ ...prev, [id]: { ...BLANK, ...prev[id], ...change } }));

  const toggleAll = (checked) =>
    setSelected((prev) => {
      const next = { ...prev };
      stock.forEach((s) => { next[s._id] = { ...BLANK, ...next[s._id], checked }; });
      return next;
    });

  const onQty = (id, value) => {
    if (value !== "" && !/^\d*\.?\d{0,3}$/.test(value)) return; // at most 3 decimals
    patch(id, { qty: value });
  };

  return (
    <div className="split" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        style={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0, flex: 1 }}
      >
        <DetailPanel
          head={
            <>
              <Meta label="New requisition">{checkedCount} item{checkedCount === 1 ? "" : "s"} selected</Meta>
              <Meta label="Estimated total" align="end">{inr(total)}</Meta>
            </>
          }
          foot={
            <Button type="submit" disabled={submitting || checkedCount === 0}>
              {submitting ? "Submitting…" : "Submit Requisition"}
            </Button>
          }
        >
          {stock.length === 0 ? (
            <EmptyState title={searching ? "No stock items match your search" : "No stock items available"}>
              {searching ? "Try a different name or group." : "Add stock items in Inventory Setup first."}
            </EmptyState>
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <th scope="col" style={{ width: 50 }}>
                    <input type="checkbox" aria-label="Select all listed items" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} />
                  </th>
                  <th scope="col">Name</th>
                  <th scope="col">Stock group</th>
                  <th scope="col" style={{ width: 160 }}>Qty</th>
                  <th scope="col" style={{ width: 120 }}>Price (₹)</th>
                  <th scope="col" style={{ textAlign: "right" }}>Item total</th>
                </tr>
              </thead>
              <tbody>
                {stock.slice(0, limit).map((row) => {
                  const state = selected[row._id] || BLANK;
                  const options = packOptions(row);
                  const packaging = selectedPackage(row, state.packageKey);
                  return (
                    <tr key={row._id}>
                      <td>
                        <input type="checkbox" aria-label={`Select ${row.name}`} checked={state.checked} onChange={(e) => patch(row._id, { checked: e.target.checked })} />
                      </td>
                      <td><strong>{row.name}</strong></td>
                      <td><Badge variant="info">{row.stockGroupId?.name || "Unassigned"}</Badge></td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input
                            type="number" min="0" step="0.001" placeholder="0" style={{ width: 90 }}
                            aria-label={`Quantity of ${row.name}`}
                            disabled={!state.checked} value={state.qty} onChange={(e) => onQty(row._id, e.target.value)}
                          />
                          {options.length > 1 ? (
                            <select
                              aria-label={`Packaging for ${row.name}`}
                              disabled={!state.checked}
                              value={state.packageKey}
                              onChange={(e) => {
                                const next = selectedPackage(row, e.target.value);
                                patch(row._id, { packageKey: e.target.value, price: next.price || "" });
                              }}
                            >
                              {options.map((option) => <option key={option.key} value={option.key}>{option.label}{option.id ? ` (${option.size} ${row.unitId?.symbol})` : ""}</option>)}
                            </select>
                          ) : <span style={{ color: "var(--muted)", fontSize: 12 }}>{packaging.label}</span>}
                        </div>
                      </td>
                      <td>
                        <input
                          type="number" min="0" step="0.01" placeholder="0" style={{ width: 90 }}
                          aria-label={`Price of ${row.name}`}
                          disabled={!state.checked} value={state.price} onChange={(e) => patch(row._id, { price: e.target.value })}
                        />
                      </td>
                      <td style={{ textAlign: "right" }}>{state.checked ? inr(lineTotal(state)) : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          )}
          {stock.length > limit && (
            <Button variant="ghost" size="sm" onClick={() => setLimit((n) => n + PAGE)}>
              Show more ({stock.length - limit} left)
            </Button>
          )}
        </DetailPanel>
      </form>
    </div>
  );
};
