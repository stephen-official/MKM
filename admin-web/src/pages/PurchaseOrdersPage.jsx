import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { useToast } from "../useToast.js";
import { Search, CheckCircle2, PackageCheck, History, Download, Users, Building2 } from "lucide-react";
import * as XLSX from "xlsx";
import {
  PageHeader, Button, Badge, EmptyState, Field, Tabs, StatusBadge, SplitView,
  RailList, RailItem, DetailPanel, Meta, LoadingState, ErrorState, Select
} from "../components/ui/index.jsx";
import { useConfirm } from "../components/ui/useConfirm.jsx";
import { lineQuantityLabel, packagingLineFromSnapshot } from "./procurementPackaging.js";
import { SharedOrdersPanel } from "./sharedOrders/SharedOrdersPanel.jsx";
import { SuppliersPanel } from "./suppliers/SuppliersPanel.jsx";

const VIEW_TABS = [
  { value: "history", label: "History", icon: <History size={14} /> },
  { value: "create", label: "Intake", icon: <PackageCheck size={14} /> },
  { value: "shared", label: "Shared orders", icon: <Users size={14} /> },
  { value: "suppliers", label: "Suppliers", icon: <Building2 size={14} /> }
];

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const fmtDate = (value) => (value ? new Date(value).toLocaleDateString("en-GB") : "—");
const errorMessage = (error, fallback) => error?.response?.data?.message || error?.response?.data?.error || fallback;
const idOf = (ref) => ref?._id || ref;

export const PurchaseOrdersPage = () => {
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirm();
  const [view, setView] = useState("history");
  const [searchTerm, setSearchTerm] = useState("");

  const [indents, setIndents] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [selectedIndentId, setSelectedIndentId] = useState("");
  const [editableItems, setEditableItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    setLoadError("");
    try {
      const [indRes, poRes, stockRes] = await Promise.all([
        api.get("/procurement/purchase-orders/purchased-indents"),
        api.get("/procurement/purchase-orders"),
        api.get("/inventory/stock-items")
      ]);
      if (current !== requestId.current) return;
      const sortedPOs = [...(poRes.data || [])].sort(
        (a, b) => new Date(b.receivedAt || b.createdAt) - new Date(a.receivedAt || a.createdAt)
      );
      setIndents(indRes.data || []);
      setStockItems(stockRes.data || []);
      setPurchaseOrders(sortedPOs);
      setSelectedPoId((prev) => (sortedPOs.some((po) => po._id === prev) ? prev : sortedPOs[0]?._id ?? null));
    } catch (error) {
      if (current !== requestId.current) return;
      const message = errorMessage(error, "Failed to load purchase orders");
      setLoadError(message);
      showToast(message, "error");
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const getStockDetails = useCallback((id) => {
    const item = stockItems.find((s) => s._id === id);
    if (!item) return { name: "Unknown Item", unit: "units", group: "General" };
    return {
      name: item.name,
      unit: item.unitId?.symbol || item.unit || "units",
      group: item.stockGroupId?.name || "General"
    };
  }, [stockItems]);

  const filteredPOs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return purchaseOrders.filter((po) => (po.indentId?.indentNo || "").toLowerCase().includes(term));
  }, [purchaseOrders, searchTerm]);

  const activePO = useMemo(
    () => purchaseOrders.find((p) => p._id === selectedPoId),
    [selectedPoId, purchaseOrders]
  );

  const poLabel = (po) => po.indentId?.indentNo || `PO-${po._id.slice(-4).toUpperCase()}`;

  const downloadExcel = () => {
    if (!activePO) return;
    const excelData = (activePO.items || []).map((item) => {
      const details = getStockDetails(idOf(item.stockItemId));
      return {
        "Order Date": fmtDate(activePO.receivedAt),
        "Indent No": activePO.indentId?.indentNo || "N/A",
        "Product Name": details.name,
        "Stock Group": details.group,
        "Unit": details.unit,
        "Pack": item.packName || "",
        "Pack quantity": item.packQuantity || "",
        "Unit Price": item.unitPrice,
        "Received Qty": item.receivedQty,
        "Subtotal": item.amount
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Order");
    XLSX.writeFile(workbook, `PO_${activePO.indentId?.indentNo || activePO._id}.xlsx`);
  };

  // Seed the editable intake rows (prices come from the indent) when an indent is chosen.
  useEffect(() => {
    const indent = selectedIndentId ? indents.find((i) => i._id === selectedIndentId) : null;
    if (!indent?.items) {
      setEditableItems([]);
      return;
    }
    setEditableItems(indent.items.map((it) => {
      const stockItemId = idOf(it.stockItemId);
      const details = getStockDetails(stockItemId);
      return {
        stockItemId,
        name: details.name,
        unit: details.unit,
        group: details.group,
        orderedQty: Number(it.orderedQty || 0),
        receivedQty: String(Number(it.packQuantity ?? it.orderedQty ?? 0)),
        unitPrice: String(Number(it.packPrice ?? it.unitPrice ?? 0)),
        packId: it.packId || null,
        packName: it.packName || "",
        packSize: it.packSize || null,
        packQuantity: it.packQuantity || null
      };
    }));
  }, [selectedIndentId, indents, getStockDetails]);

  const updateItem = (idx, field, value) =>
    setEditableItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));

  const rowErrors = useMemo(
    () => editableItems.map((it) => ({
      qty: it.receivedQty === "" || !(Number(it.receivedQty) >= 0),
      price: it.unitPrice === "" || !(Number(it.unitPrice) >= 0)
    })),
    [editableItems]
  );

  const intakeTotal = editableItems.reduce((sum, it) => sum + (Number(it.receivedQty) || 0) * (Number(it.unitPrice) || 0), 0);

  const createPO = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!selectedIndentId) return showToast("Select an indent to receive", "error");
    if (rowErrors.some((e) => e.qty || e.price)) {
      return showToast("Quantities and unit prices must be numbers of 0 or more", "error");
    }
    if (!editableItems.some((it) => Number(it.receivedQty) > 0)) {
      return showToast("Enter a received quantity for at least one item", "error");
    }
    const indentNo = indents.find((i) => i._id === selectedIndentId)?.indentNo;
    const ok = await confirm({
      title: "Confirm intake",
      message: `Receive ${indentNo || "this indent"} worth ${money(intakeTotal)} and update stock? This cannot be undone.`,
      confirmLabel: "Confirm intake"
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      const items = editableItems.map((it) => {
        const converted = packagingLineFromSnapshot(it, it.receivedQty, it.unitPrice);
        return { ...it, ...converted, receivedQty: converted.qtyBaseUnit };
      });
      await api.post("/procurement/purchase-orders", {
        indentId: selectedIndentId,
        items,
        totalAmount: intakeTotal,
        receivedAt: new Date().toISOString()
      });
      showToast("Inventory intake confirmed", "success");
      setSelectedIndentId("");
      setView("history");
      await load();
    } catch (error) {
      showToast(errorMessage(error, "Could not create the purchase order"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const renderHistory = () => {
    if (loadError && !purchaseOrders.length) return <ErrorState message={loadError} onRetry={load} />;
    return (
      <SplitView
        rail={
          <RailList
            title="Completed orders"
            count={filteredPOs.length}
            loading={loading && !purchaseOrders.length}
            empty={
              <EmptyState title={purchaseOrders.length ? "No matching orders" : "No purchase orders yet"}>
                {purchaseOrders.length ? "Try a different indent number." : "Orders appear here once an indent is received on the Intake tab."}
              </EmptyState>
            }
          >
            {filteredPOs.map((po) => (
              <RailItem key={po._id} active={selectedPoId === po._id} onClick={() => setSelectedPoId(po._id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <strong>{poLabel(po)}</strong>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{fmtDate(po.receivedAt)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {money(po.totalAmount)} • {po.items?.length || 0} items
                  </span>
                  {po.status && <StatusBadge status={po.status} />}
                </div>
              </RailItem>
            ))}
          </RailList>
        }
      >
        {activePO ? (
          <DetailPanel
            head={
              <>
                <Meta label="Order received">{fmtDate(activePO.receivedAt)}</Meta>
                <Meta label="Indent">{poLabel(activePO)}</Meta>
                {activePO.status && <Meta label="Status"><StatusBadge status={activePO.status} /></Meta>}
                <Meta label="Total valuation" align="end">{money(activePO.totalAmount)}</Meta>
              </>
            }
            foot={
              <Button variant="success" onClick={downloadExcel}>
                <Download size={18} /> Export Excel (.xlsx)
              </Button>
            }
          >
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Group</th>
                  <th scope="col" style={{ textAlign: "center" }}>Qty</th>
                  <th scope="col" style={{ textAlign: "right" }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(activePO.items || []).map((item, idx) => {
                  const details = getStockDetails(idOf(item.stockItemId));
                  return (
                    <tr key={idx}>
                      <td>
                        <div style={{ fontWeight: 650 }}>{details.name}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>Rate: {item.packId ? `${money(item.packPrice)} / ${item.packName}` : `${money(item.unitPrice)} / ${details.unit}`}</div>
                      </td>
                      <td><Badge variant="info">{details.group}</Badge></td>
                      <td style={{ textAlign: "center" }}>{item.packId ? lineQuantityLabel({ ...item, qtyBaseUnit: item.receivedQty }, details.unit) : `${item.receivedQty} ${details.unit}`}</td>
                      <td style={{ textAlign: "right", fontWeight: 650 }}>{money(item.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DetailPanel>
        ) : (
          <EmptyState title="No order selected">Choose an order from the list to see its items.</EmptyState>
        )}
      </SplitView>
    );
  };

  const renderIntake = () => (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "20px 32px 28px" }}>
      {loading && !indents.length ? (
        <LoadingState label="Loading pending indents…" />
      ) : loadError && !indents.length ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : (
        <form onSubmit={createPO} noValidate style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <DetailPanel
            head={
              <>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <Field label="Pending indent">
                    <Select value={selectedIndentId} onChange={(e) => setSelectedIndentId(e.target.value)} disabled={submitting}>
                      <option value="">Choose an indent to process…</option>
                      {indents.map((i) => (
                        <option key={i._id} value={i._id}>{i.indentNo} — {money(i.totalAmount)}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Meta label="Intake total" align="end">{money(intakeTotal)}</Meta>
              </>
            }
            foot={
              editableItems.length > 0 && (
                <Button type="submit" disabled={submitting}>
                  <CheckCircle2 size={18} /> {submitting ? "Updating stock…" : "Confirm intake & update stock"}
                </Button>
              )
            }
          >
            {editableItems.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col" style={{ textAlign: "center" }}>Requested</th>
                    <th scope="col" style={{ textAlign: "center", width: 160 }}>Unit price</th>
                    <th scope="col" style={{ textAlign: "center", width: 160 }}>Received qty</th>
                    <th scope="col" style={{ textAlign: "right" }}>Valuation</th>
                  </tr>
                </thead>
                <tbody>
                  {editableItems.map((item, idx) => (
                    <tr key={item.stockItemId || idx}>
                      <td>
                        <div style={{ fontWeight: 650 }}>{item.name}</div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                          <Badge>{item.group}</Badge>
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>per {item.packName || item.unit}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>{item.packId ? `${item.packQuantity} ${item.packName} (${item.orderedQty} ${item.unit})` : `${item.orderedQty} ${item.unit}`}</td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="number" min="0" step="any" inputMode="decimal"
                          aria-label={`${item.packName || "Unit"} price for ${item.name}`}
                          aria-invalid={rowErrors[idx].price}
                          value={item.unitPrice}
                          disabled={submitting}
                          onChange={(e) => updateItem(idx, "unitPrice", e.target.value)}
                          style={{ width: 110, textAlign: "center" }}
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="number" min="0" step="any" inputMode="decimal"
                          aria-label={`Received ${item.packName || item.unit} quantity for ${item.name}`}
                          aria-invalid={rowErrors[idx].qty}
                          value={item.receivedQty}
                          disabled={submitting}
                          onChange={(e) => updateItem(idx, "receivedQty", e.target.value)}
                          style={{ width: 100, textAlign: "center" }}
                        />
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 650 }}>
                        {money((Number(item.receivedQty) || 0) * (Number(item.unitPrice) || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title={indents.length ? "Select a pending indent" : "No indents awaiting intake"}>
                {indents.length
                  ? "Choose an indent above to review quantities and prices before receiving it."
                  : "Indents marked as purchased will show up here."}
              </EmptyState>
            )}
          </DetailPanel>
        </form>
      )}
    </div>
  );

  return (
    <div style={{ height: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <PageHeader
        title="Purchase Orders"
        actions={
          view === "history" && (
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Search size={16} aria-hidden="true" style={{ position: "absolute", left: 12, color: "var(--muted-soft)" }} />
              <input
                type="search"
                aria-label="Search purchase orders by indent number"
                placeholder="Search POs…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: 36, width: 220 }}
              />
            </div>
          )
        }
      >
        <Tabs items={VIEW_TABS} value={view} onChange={setView} label="Purchase order views" />
      </PageHeader>

      {view === "history" ? renderHistory() : view === "shared" ? <SharedOrdersPanel /> : view === "suppliers" ? <SuppliersPanel /> : renderIntake()}
      {dialog}
    </div>
  );
};
