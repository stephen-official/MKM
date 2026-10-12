import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Search, Download, Trash2, Check, FileSpreadsheet } from "lucide-react";
import { api } from "../api.js";
import { useToast } from "../useToast.js";
import {
  PageHeader, Button, Badge, Banner, EmptyState, ErrorState, LoadingState,
  DataTable, Tabs, SplitView, RailList, RailItem, DetailPanel, Meta
} from "../components/ui/index.jsx";
import { useConfirm } from "../components/ui/useConfirm.jsx";

const ROW_LIMIT = 100;

const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;
const fmtQty = (value) => Number(value || 0).toLocaleString("en-IN");
const isoToday = () => new Date().toISOString().split("T")[0];
const idOf = (ref) => ref?._id || ref;
const isLow = (stock) => Number(stock.qtyBaseUnit) <= Number(stock.thresholdBaseUnit || 0);

export const GodownsPage = () => {
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirm();

  const [godowns, setGodowns] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [viewMode, setViewMode] = useState("all");
  const [selectedGodownId, setSelectedGodownId] = useState(null);
  const [lowGodownId, setLowGodownId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [thresholds, setThresholds] = useState({});
  const [busyRow, setBusyRow] = useState("");
  const [showAll, setShowAll] = useState(false);
  const requestRef = useRef(0);

  const loadData = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setLoadError("");
    try {
      const [godRes, stockRes] = await Promise.all([
        api.get("/inventory/godowns"),
        api.get("/godown-stocks")
      ]);
      if (requestId !== requestRef.current) return;
      const godownList = Array.isArray(godRes.data) ? godRes.data : [];
      setGodowns(godownList);
      setStocks(Array.isArray(stockRes.data) ? stockRes.data : []);
      setSelectedGodownId((current) =>
        godownList.some((g) => g._id === current) ? current : godownList[0]?._id || null
      );
    } catch (error) {
      if (requestId !== requestRef.current) return;
      const message = errorMessage(error, "Failed to load godown stock");
      setLoadError(message);
      showToast(message, "error");
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => { setShowAll(false); }, [viewMode, selectedGodownId, lowGodownId, searchQuery]);

  const lowStocks = useMemo(() => stocks.filter(isLow), [stocks]);

  const countsByGodown = useMemo(() => {
    const total = {};
    const low = {};
    stocks.forEach((s) => {
      const id = idOf(s.godownId);
      total[id] = (total[id] || 0) + 1;
      if (isLow(s)) low[id] = (low[id] || 0) + 1;
    });
    return { total, low };
  }, [stocks]);

  const activeStocks = useMemo(() => {
    let list = viewMode === "low-stock"
      ? lowStocks.filter((s) => !lowGodownId || idOf(s.godownId) === lowGodownId)
      : stocks.filter((s) => idOf(s.godownId) === selectedGodownId);

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((s) =>
        (s.stockItemId?.name || "").toLowerCase().includes(q) ||
        (s.stockItemId?.stockGroupId?.name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [stocks, lowStocks, selectedGodownId, lowGodownId, viewMode, searchQuery]);

  const visibleStocks = showAll ? activeStocks : activeStocks.slice(0, ROW_LIMIT);

  const currentGodown = godowns.find((g) => g._id === (viewMode === "low-stock" ? lowGodownId : selectedGodownId));
  const detailTitle = viewMode === "low-stock"
    ? (currentGodown ? `Low stock: ${currentGodown.name}` : "Low stock alerts")
    : currentGodown?.name || "Select a godown";

  const saveThreshold = async (event, stock) => {
    event.preventDefault();
    const rowId = stock._id;
    const raw = thresholds[rowId];
    if (raw === undefined || raw === "") return showToast("Enter a threshold first", "error");
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return showToast("Threshold must be zero or a positive number", "error");

    setBusyRow(rowId);
    try {
      await api.post(`/procurement/godown-stocks/${rowId}/threshold`, { thresholdBaseUnit: value });
      showToast("Threshold updated", "success");
      setThresholds((prev) => {
        const next = { ...prev };
        delete next[rowId];
        return next;
      });
      await loadData();
    } catch (error) {
      showToast(errorMessage(error, "Threshold update failed"), "error");
    } finally {
      setBusyRow("");
    }
  };

  const deleteStockItem = async (stock) => {
    const name = stock.stockItemId?.name || "this item";
    const ok = await confirm({
      title: "Remove stock record",
      message: `Remove ${name} from ${stock.godownId?.name || "this godown"}? Its current quantity (${fmtQty(stock.qtyBaseUnit)}) will be lost from stock records.`,
      confirmLabel: "Remove",
      variant: "danger"
    });
    if (!ok) return;

    setBusyRow(stock._id);
    try {
      await api.delete(`/procurement/godown-stocks/${stock._id}`);
      showToast("Item removed from stock", "success");
      setStocks((prev) => prev.filter((s) => s._id !== stock._id));
    } catch (error) {
      showToast(errorMessage(error, "Failed to remove item"), "error");
    } finally {
      setBusyRow("");
    }
  };

  const writeSheet = (rows, sheetName, fileName) => {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
    return worksheet;
  };

  const downloadExcel = () => {
    if (activeStocks.length === 0) return showToast("No data to export", "error");
    writeSheet(
      activeStocks.map((it) => ({
        Godown: it.godownId?.name || "N/A",
        Item: it.stockItemId?.name || "N/A",
        "Stock Group": it.stockItemId?.stockGroupId?.name || "General",
        "Current Qty": it.qtyBaseUnit,
        Unit: it.stockItemId?.unitId?.symbol || "",
        Threshold: it.thresholdBaseUnit || 0,
        Status: isLow(it) ? "LOW" : "OK"
      })),
      "Stock_Report",
      `Stock_Report_${isoToday()}.xlsx`
    );
  };

  const downloadMasterExcel = () => {
    if (stocks.length === 0) return showToast("No data to export", "error");

    const godownNames = [...new Set(godowns.map((g) => g.name))].sort();
    const itemMap = {};
    stocks.forEach((it) => {
      const itemId = idOf(it.stockItemId);
      if (!itemMap[itemId]) {
        itemMap[itemId] = {
          "Stock Item": it.stockItemId?.name || "Unknown Item",
          "Stock Group": it.stockItemId?.stockGroupId?.name || "General",
          Units: it.stockItemId?.unitId?.symbol || "",
          ...Object.fromEntries(godownNames.map((name) => [name, 0]))
        };
      }
      const gName = it.godownId?.name || "N/A";
      if (gName in itemMap[itemId]) itemMap[itemId][gName] = it.qtyBaseUnit;
    });

    const rows = Object.values(itemMap).map((row, index) => ({ "S.No": index + 1, ...row }));
    const worksheet = writeSheet(rows, "Master_Stock", `Master_Inventory_Pivoted_${isoToday()}.xlsx`);
    worksheet["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, ...godownNames.map(() => ({ wch: 15 })) ];
  };

  const switchMode = (mode) => {
    setViewMode(mode);
    setSearchQuery("");
  };

  const rail = viewMode === "low-stock" ? (
    <RailList
      title="Critical stock"
      count={lowStocks.length}
      loading={loading && godowns.length === 0}
      empty={<EmptyState title="Nothing is running low" />}
    >
      {lowStocks.length > 0 && (
        <RailItem active={!lowGodownId} onClick={() => setLowGodownId("")}>
          <strong>All godowns</strong>
          <div className="page-subtitle">{lowStocks.length} items low</div>
        </RailItem>
      )}
      {lowStocks.length > 0 && godowns.filter((g) => countsByGodown.low[g._id]).map((g) => (
        <RailItem key={g._id} active={lowGodownId === g._id} onClick={() => setLowGodownId(g._id)}>
          <strong>{g.name}</strong>
          <div className="page-subtitle">{countsByGodown.low[g._id]} items low</div>
        </RailItem>
      ))}
    </RailList>
  ) : (
    <RailList
      title="Godowns"
      count={godowns.length}
      loading={loading && godowns.length === 0}
      empty={<EmptyState title="No godowns yet">Add godowns in Inventory Info.</EmptyState>}
    >
      {godowns.map((g) => (
        <RailItem key={g._id} active={selectedGodownId === g._id} onClick={() => setSelectedGodownId(g._id)}>
          <strong>{g.name}</strong>
          <div className="page-subtitle">Monitoring {countsByGodown.total[g._id] || 0} items</div>
        </RailItem>
      ))}
    </RailList>
  );

  let body;
  if (loading && stocks.length === 0) {
    body = <LoadingState label="Loading stock…" />;
  } else if (loadError && stocks.length === 0) {
    body = <ErrorState message={loadError} onRetry={loadData} />;
  } else if (activeStocks.length === 0) {
    body = (
      <EmptyState title={searchQuery.trim() ? "No items match your search" : "No stock items in this view"}>
        {viewMode === "low-stock" ? "Everything is above its threshold." : "Stock appears here once it is distributed to this godown."}
      </EmptyState>
    );
  } else {
    body = (
      <>
        <DataTable className="table--compact">
          <thead>
            <tr>
              <th scope="col">Stock item</th>
              <th scope="col">Stock group</th>
              <th scope="col">Current qty</th>
              <th scope="col">Threshold</th>
              <th scope="col">Set threshold</th>
              <th scope="col">Remove</th>
            </tr>
          </thead>
          <tbody>
            {visibleStocks.map((it) => {
              const rowId = it._id;
              const low = isLow(it);
              const unit = it.stockItemId?.unitId?.symbol || "";
              const busy = busyRow === rowId;
              const draft = thresholds[rowId] ?? "";
              const itemName = it.stockItemId?.name || "Unknown item";
              return (
                <tr key={rowId}>
                  <td>
                    <strong>{itemName}</strong>
                    {viewMode === "low-stock" && <div className="page-subtitle">{it.godownId?.name}</div>}
                  </td>
                  <td><Badge variant="info">{it.stockItemId?.stockGroupId?.name || "General"}</Badge></td>
                  <td>
                    <Badge variant={low ? "alert" : "success"}>{fmtQty(it.qtyBaseUnit)} {unit}</Badge>
                  </td>
                  <td>{fmtQty(it.thresholdBaseUnit)} {unit}</td>
                  <td>
                    <form onSubmit={(event) => saveThreshold(event, it)} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="number" min="0" step="any" inputMode="decimal"
                        aria-label={`New threshold for ${itemName}`}
                        placeholder="Set"
                        value={draft}
                        disabled={busy}
                        onChange={(e) => setThresholds((prev) => ({ ...prev, [rowId]: e.target.value }))}
                        style={{ width: 72 }}
                      />
                      <Button
                        type="submit" size="sm" variant={draft !== "" ? "dark" : "ghost"}
                        disabled={busy || draft === ""}
                        aria-label={`Save threshold for ${itemName}`} title="Save threshold"
                      >
                        <Check size={16} /> Save
                      </Button>
                    </form>
                  </td>
                  <td>
                    <Button
                      size="sm" variant="danger" disabled={busy}
                      onClick={() => deleteStockItem(it)}
                      aria-label={`Remove ${itemName} stock record`} title="Remove stock record"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
        {!showAll && activeStocks.length > ROW_LIMIT && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
            <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>Show all {activeStocks.length} items</Button>
          </div>
        )}
      </>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader
        title="Godowns"
        actions={
          <>
            <Button variant="dark" size="sm" onClick={downloadMasterExcel} disabled={loading}>
              <FileSpreadsheet size={14} /> Master Excel
            </Button>
            <Button variant="success" size="sm" onClick={downloadExcel} disabled={loading}>
              <Download size={14} /> Export view
            </Button>
          </>
        }
      >
        <Tabs
          label="Stock view"
          value={viewMode}
          onChange={switchMode}
          items={[
            { value: "all", label: "All godowns" },
            { value: "low-stock", label: "Low stock", count: lowStocks.length }
          ]}
        />
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Search size={14} aria-hidden="true" style={{ position: "absolute", left: 10, color: "var(--muted-soft)" }} />
          <input
            type="search" aria-label="Search item or group" placeholder="Search item or group..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 30, width: 220 }}
          />
        </div>
      </PageHeader>

      <SplitView rail={rail}>
        <DetailPanel
          head={
            <>
              <Meta label={viewMode === "low-stock" ? "Alerts" : "Current monitoring"}>{detailTitle}</Meta>
              <Meta label="Items" align="end">{fmtQty(activeStocks.length)}</Meta>
            </>
          }
        >
          <div style={{ paddingTop: 16 }}>
            {loadError && stocks.length > 0 && (
              <Banner variant="warn" style={{ marginBottom: 12 }}>
                Could not refresh: {loadError} <Button variant="ghost" size="sm" onClick={loadData}>Retry</Button>
              </Banner>
            )}
            {body}
          </div>
        </DetailPanel>
      </SplitView>
      {dialog}
    </div>
  );
};
