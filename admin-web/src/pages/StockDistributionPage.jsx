import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Search, Plus, Trash2, Download } from "lucide-react";
import { api } from "../api.js";
import { useToast } from "../useToast.js";
import {
  PageHeader, Button, Badge, EmptyState, ErrorState, DataTable, Tabs, StatusBadge,
  SplitView, RailList, RailItem, DetailPanel, Meta, Select
} from "../components/ui/index.jsx";
import { useConfirm } from "../components/ui/useConfirm.jsx";
import { lineQuantityLabel, packagingLineFromSnapshot } from "./procurementPackaging.js";

const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;
const idOf = (ref) => ref?._id || ref;
const fmtNum = (value) => Number(value || 0).toLocaleString("en-IN");
const fmtMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const fmtDate = (value) => (value ? new Date(value).toLocaleDateString("en-GB") : "-");
const isoToday = () => new Date().toISOString().split("T")[0];
const sameItem = (a, b) => String(a) === String(b);

const recordTitle = (record) =>
  record?.indentId?.indentNo || record?.purchaseOrderId?.indentId?.indentNo || "Distribution";

const receivedItems = (po) => (po?.items || []).filter((it) => (it.receivedQty || 0) > 0);

export const StockDistributionPage = () => {
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirm();

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [distLogs, setDistLogs] = useState([]);

  const [activeTab, setActiveTab] = useState("pending");
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [allocations, setAllocations] = useState([]);
  const requestRef = useRef(0);
  const extraRowId = useRef(0);

  const isCompleted = activeTab === "completed";

  const loadData = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setLoadError("");
    try {
      const [poRes, godownRes, itemRes, logRes] = await Promise.all([
        api.get("/procurement/purchase-orders"),
        api.get("/inventory/godowns"),
        api.get("/inventory/stock-items"),
        api.get("/procurement/distributions/logs")
      ]);
      if (requestId !== requestRef.current) return;
      setPurchaseOrders((poRes.data || []).filter((po) => receivedItems(po).length > 0));
      setGodowns(godownRes.data || []);
      setStockItems(itemRes.data || []);
      setDistLogs(logRes.data || []);
    } catch (error) {
      if (requestId !== requestRef.current) return;
      const message = errorMessage(error, "Failed to load distribution data");
      setLoadError(message);
      showToast(message, "error");
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const getStockDetails = useCallback((id) => {
    const item = stockItems.find((s) => sameItem(s._id, idOf(id)));
    if (!item) return { name: "Unknown item", unit: "-", group: "General" };
    return {
      name: item.name,
      unit: item.unitId?.symbol || item.unitId?.name || "unit",
      group: item.stockGroupId?.name || "General"
    };
  }, [stockItems]);

  const getGodownName = useCallback((id) => {
    const godown = godowns.find((g) => sameItem(g._id, idOf(id)));
    return godown ? godown.name : "Not assigned";
  }, [godowns]);

  const pendingOrders = useMemo(
    () => purchaseOrders.filter((p) => p.status === "pending" || !p.status),
    [purchaseOrders]
  );

  const activeRecord = useMemo(() => {
    if (!selectedId) return null;
    return (isCompleted ? distLogs : pendingOrders).find((r) => r._id === selectedId) || null;
  }, [selectedId, isCompleted, pendingOrders, distLogs]);

  useEffect(() => {
    if (!activeRecord) {
      setAllocations([]);
      return;
    }
    if (isCompleted) {
      setAllocations((activeRecord.allocations || []).map((it, idx) => ({
        tempId: `log-${it._id || idx}`,
        stockItemId: idOf(it.stockItemId),
        godownId: idOf(it.godownId) || "",
        qtyBaseUnit: it.qtyBaseUnit,
        unitPrice: it.unitPrice || 0,
        maxQty: it.packId ? it.packQuantity : it.qtyBaseUnit,
        entryQty: it.packId ? it.packQuantity : it.qtyBaseUnit,
        packId: it.packId || null,
        packName: it.packName || "",
        packSize: it.packSize || null,
        packQuantity: it.packQuantity || null,
        packPrice: it.packPrice || null
      })));
      return;
    }
    setAllocations(receivedItems(activeRecord).map((it, idx) => ({
      tempId: `po-${idx}`,
      stockItemId: idOf(it.stockItemId),
      godownId: "",
      qtyBaseUnit: 0,
      entryQty: 0,
      unitPrice: it.unitPrice || 0,
      maxQty: it.packId ? it.packQuantity : (it.receivedQty || 0),
      packId: it.packId || null,
      packName: it.packName || "",
      packSize: it.packSize || null,
      packQuantity: 0,
      packPrice: it.packPrice || null
    })));
  }, [activeRecord, isCompleted]);

  const railItems = useMemo(() => {
    const list = isCompleted ? distLogs : pendingOrders;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((record) => {
      const lines = isCompleted ? record.allocations : record.items;
      const names = (lines || []).map((l) => {
        const d = getStockDetails(l.stockItemId);
        return `${d.name} ${d.group}`;
      });
      return [recordTitle(record), ...names].join(" ").toLowerCase().includes(q);
    });
  }, [isCompleted, pendingOrders, distLogs, searchQuery, getStockDetails]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSelectedId(null);
    setSearchQuery("");
  };

  const updateAllocation = (tempId, field, value) => {
    if (isCompleted) return;
    const row = allocations.find((a) => a.tempId === tempId);
    if (!row) return;

    let next = value;
    if (field === "entryQty") {
      next = Math.max(0, Number(value) || 0);
      const othersTotal = allocations
        .filter((a) => a.tempId !== tempId && sameItem(a.stockItemId, row.stockItemId))
        .reduce((sum, a) => sum + (Number(a.entryQty) || 0), 0);
      const limit = Math.max(0, row.maxQty - othersTotal);
      if (next > limit) {
        showToast(`Only ${fmtNum(limit)} ${row.packName || getStockDetails(row.stockItemId).unit} left to allocate`, "error");
        next = limit;
      }
    }
    setAllocations((prev) => prev.map((a) => (a.tempId === tempId ? { ...a, [field]: next } : a)));
  };

  const addAllocationRow = (index, baseAlloc) => {
    const newRow = { ...baseAlloc, tempId: `extra-${++extraRowId.current}`, qtyBaseUnit: 0, entryQty: 0, packQuantity: 0, godownId: "" };
    setAllocations((prev) => {
      const updated = [...prev];
      updated.splice(index + 1, 0, newRow);
      return updated;
    });
  };

  const removeAllocationRow = (tempId) => {
    setAllocations((prev) => prev.filter((a) => a.tempId !== tempId));
  };

  const totalValue = allocations.reduce((sum, a) => sum + (Number(a.entryQty) || 0) * (a.packId ? Number(a.packPrice || 0) : Number(a.unitPrice || 0)), 0);

  const handleDistributionSubmit = async (event) => {
    event?.preventDefault();
    if (!activeRecord || submitting) return;

    if (allocations.some((a) => a.entryQty > 0 && !a.godownId)) {
      return showToast("Choose a destination godown for every row that has a quantity.", "error");
    }
    const validAllocations = allocations.filter((a) => a.godownId && a.entryQty > 0);
    if (validAllocations.length === 0) return showToast("Assign destinations and quantities.", "error");

    const stockItemIds = [...new Set(allocations.map((a) => String(a.stockItemId)))];
    for (const sId of stockItemIds) {
      const rows = allocations.filter((a) => sameItem(a.stockItemId, sId));
      const total = rows.reduce((sum, a) => sum + (Number(a.entryQty) || 0), 0);
      if (Math.abs(total - rows[0].maxQty) > 1e-9) {
        const details = getStockDetails(sId);
        return showToast(`Incomplete: distribute all ${fmtNum(rows[0].maxQty)} ${rows[0].packName || details.unit} of ${details.name} (now ${fmtNum(total)}).`, "error");
      }
    }

    const ok = await confirm({
      title: "Distribute stock",
      message: `Distribute ${stockItemIds.length} item(s) from ${recordTitle(activeRecord)} to ${new Set(validAllocations.map((a) => a.godownId)).size} godown(s), worth ${fmtMoney(totalValue)}? This adds the stock to the godowns and cannot be undone.`,
      confirmLabel: "Distribute",
      variant: "primary"
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      await api.post("/procurement/distributions", {
        purchaseOrderId: activeRecord._id,
        allocations: validAllocations.map((allocation) => {
          const converted = packagingLineFromSnapshot(allocation, allocation.entryQty, allocation.packPrice ?? allocation.unitPrice);
          return { stockItemId: allocation.stockItemId, godownId: allocation.godownId, ...converted };
        }),
        leftovers: []
      });
      showToast("Inventory distributed successfully", "success");
      setSelectedId(null);
      await loadData();
    } catch (error) {
      showToast(errorMessage(error, "Distribution failed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadAsExcel = (mode = "current") => {
    let rows = [];
    let fileName = "";

    if (mode === "master") {
      if (!distLogs.length) return showToast("No completed distributions found", "error");
      const itemMap = {};
      distLogs.forEach((log) => {
        (log.allocations || []).forEach((a) => {
          const details = getStockDetails(a.stockItemId);
          const godownName = getGodownName(a.godownId);
          const row = itemMap[details.name] || (itemMap[details.name] = {
            "Stock Item": details.name,
            "Stock Group": details.group,
            "Unit Price": a.unitPrice || 0,
            Units: details.unit,
            "Total Quantity": 0,
            "Total Valuation": 0
          });
          row[godownName] = (row[godownName] || 0) + (a.qtyBaseUnit || 0);
          row["Total Quantity"] += a.qtyBaseUnit || 0;
          row["Total Valuation"] += (a.qtyBaseUnit || 0) * (a.unitPrice || 0);
        });
      });
      rows = Object.values(itemMap).map((row, index) => ({ "S.No": index + 1, ...row }));
      fileName = `Master_Inventory_Valuation_${isoToday()}.xlsx`;
    } else {
      if (!allocations.length) return showToast("No data to export", "error");
      rows = allocations.map((a, idx) => {
        const details = getStockDetails(a.stockItemId);
        return {
          "S.No": idx + 1,
          Item: details.name,
          Group: details.group,
          Destination: getGodownName(a.godownId),
          Packaging: a.packName || details.unit,
          "Pack Quantity": a.packQuantity || "",
          "Base Quantity": a.qtyBaseUnit,
          Unit: details.unit,
          "Unit Price": a.unitPrice || 0,
          "Total Amount": (a.qtyBaseUnit || 0) * (a.unitPrice || 0)
        };
      });
      fileName = `Stock_Distribution_Amount_${isCompleted ? "Log" : "Pending"}_${Date.now()}.xlsx`;
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financial_Report");
    XLSX.writeFile(wb, fileName);
  };

  const railEmpty = (
    <EmptyState title={searchQuery.trim() ? "No matches" : isCompleted ? "No completed distributions" : "Nothing pending"}>
      {searchQuery.trim()
        ? "Try a different indent number or item name."
        : isCompleted
          ? "Distributions you complete will be listed here."
          : "Purchase orders with received stock will appear here, ready to distribute to godowns."}
    </EmptyState>
  );

  const rail = (
    <RailList
      title={isCompleted ? "Completed" : "Pending"}
      count={railItems.length}
      loading={loading && railItems.length === 0 && !loadError}
      empty={loadError ? <ErrorState message={loadError} onRetry={loadData} /> : railEmpty}
    >
      {railItems.map((item) => (
        <RailItem key={item._id} active={selectedId === item._id} onClick={() => setSelectedId(item._id)}>
          <strong>{recordTitle(item)}</strong>
          <div className="page-subtitle">
            {isCompleted
              ? `Distributed ${fmtDate(item.createdAt)}`
              : `${receivedItems(item).length} items pending`}
          </div>
        </RailItem>
      ))}
    </RailList>
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader
        title="Distribute Purchases"
        subtitle="Allocate newly received purchase-order stock to godowns."
        actions={
          <Button variant="dark" size="sm" onClick={() => downloadAsExcel("master")} disabled={loading}>
            <Download size={14} /> Valuation report
          </Button>
        }
      >
        <Tabs
          label="Distribution status"
          value={activeTab}
          onChange={switchTab}
          items={[
            { value: "pending", label: "Pending", count: pendingOrders.length },
            { value: "completed", label: "Completed", count: distLogs.length }
          ]}
        />
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Search size={14} aria-hidden="true" style={{ position: "absolute", left: 10, color: "var(--muted-soft)" }} />
          <input
            type="search" aria-label="Search indents or items" placeholder="Search..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 30 }}
          />
        </div>
      </PageHeader>

      <SplitView rail={rail}>
        {activeRecord ? (
          <form onSubmit={handleDistributionSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <DetailPanel
              head={
                <>
                  <Meta label={isCompleted ? "Distribution" : "Purchase order"}>{recordTitle(activeRecord)}</Meta>
                  <Meta label="Status"><StatusBadge status={isCompleted ? "distributed" : "pending"} /></Meta>
                  <Meta label="Total value" align="end">{fmtMoney(totalValue)}</Meta>
                </>
              }
              foot={
                <>
                  <Button variant="success" size="sm" onClick={() => downloadAsExcel("current")}>
                    <Download size={14} /> Export amount
                  </Button>
                  {!isCompleted && (
                    <Button type="submit" variant="dark" size="sm" disabled={submitting}>
                      {submitting ? "Distributing…" : "Distribute"}
                    </Button>
                  )}
                </>
              }
            >
              <div style={{ paddingTop: 16 }}>
                <DataTable>
                  <thead>
                    <tr>
                      <th scope="col">Item &amp; group</th>
                      <th scope="col">Destination</th>
                      <th scope="col">Quantity</th>
                      <th scope="col">Amount</th>
                      <th scope="col">{isCompleted ? "" : "Split"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map((alloc, idx) => {
                      const details = getStockDetails(alloc.stockItemId);
                      const isSubRow = idx > 0 && sameItem(allocations[idx - 1].stockItemId, alloc.stockItemId);
                      const totalAllocated = allocations
                        .filter((a) => sameItem(a.stockItemId, alloc.stockItemId))
                        .reduce((sum, a) => sum + (Number(a.entryQty) || 0), 0);
                      const remaining = alloc.maxQty - totalAllocated;
                      const rowAmount = (Number(alloc.entryQty) || 0) * (alloc.packId ? Number(alloc.packPrice || 0) : Number(alloc.unitPrice || 0));
                      return (
                        <tr key={alloc.tempId}>
                          <td>
                            {!isSubRow ? (
                              <>
                                <strong>{details.name}</strong>
                                <div style={{ marginTop: 4 }}><Badge>{details.group}</Badge></div>
                                <div className="page-subtitle">Rate: {fmtMoney(alloc.packId ? alloc.packPrice : alloc.unitPrice)} / {alloc.packName || details.unit}</div>
                                {!isCompleted && (
                                  <div style={{ marginTop: 4 }}>
                                    <Badge variant={remaining === 0 ? "success" : "warn"}>
                                      {remaining === 0 ? "Balanced" : `Pending ${fmtNum(remaining)} ${alloc.packName || details.unit}`}
                                    </Badge>
                                  </div>
                                )}
                              </>
                            ) : <span className="page-subtitle">↳ Split allocation</span>}
                          </td>
                          <td>
                            {isCompleted ? getGodownName(alloc.godownId) : (
                              <Select
                                aria-label={`Destination godown for ${details.name}`}
                                value={alloc.godownId}
                                disabled={submitting}
                                onChange={(e) => updateAllocation(alloc.tempId, "godownId", e.target.value)}
                                style={{ minWidth: 160 }}
                              >
                                <option value="">Select godown</option>
                                {godowns.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
                              </Select>
                            )}
                          </td>
                          <td>
                            {isCompleted ? (alloc.packId ? lineQuantityLabel(alloc, details.unit) : `${fmtNum(alloc.qtyBaseUnit)} ${details.unit}`) : (
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <input
                                  type="number" min="0" max={alloc.maxQty} step="any"
                                  aria-label={`Quantity of ${details.name} in ${alloc.packName || details.unit}`}
                                  value={alloc.entryQty}
                                  disabled={submitting}
                                  onChange={(e) => updateAllocation(alloc.tempId, "entryQty", e.target.value)}
                                  style={{ width: 90 }}
                                />
                                <span className="page-subtitle">{alloc.packName || details.unit}</span>
                              </div>
                            )}
                          </td>
                          <td><strong>{fmtMoney(rowAmount)}</strong></td>
                          <td>
                            {!isCompleted && (
                              <div style={{ display: "flex", gap: 6 }}>
                                <Button
                                  variant="ghost" size="sm" disabled={submitting}
                                  onClick={() => addAllocationRow(idx, alloc)}
                                  aria-label={`Split ${details.name} across another godown`} title="Split to another godown"
                                >
                                  <Plus size={14} />
                                </Button>
                                {isSubRow && (
                                  <Button
                                    variant="danger" size="sm" disabled={submitting}
                                    onClick={() => removeAllocationRow(alloc.tempId)}
                                    aria-label="Remove split row" title="Remove split row"
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </DataTable>
              </div>
            </DetailPanel>
          </form>
        ) : (
          <DetailPanel>
            <EmptyState title={isCompleted ? "Select a completed distribution" : "Select an indent or PO to distribute stock"}>
              {isCompleted ? "Pick a record on the left to review where the stock went." : "Pick a purchase order on the left, then assign each item to a godown."}
            </EmptyState>
          </DetailPanel>
        )}
      </SplitView>
      {dialog}
    </div>
  );
};
