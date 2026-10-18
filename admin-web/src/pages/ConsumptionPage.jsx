import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Search } from "lucide-react";
import { api } from "../api.js";
import { useToast } from "../useToast.js";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  RailItem,
  RailList,
  SplitView,
  Badge,
  DateField } from "../components/ui/index.jsx";
import { useConfirm } from "../components/ui/useConfirm.jsx";
import { ConsumptionDetail } from "./consumption/ConsumptionDetail.jsx";
import { exportAllRecords, exportRecord } from "./consumption/exportExcel.js";
import {
  compareRecords,
  errorMessage,
  formatTime,
  getGroupName,
  idOf,
  isValidQty,
  recordDateKey,
  recordDisplayDate
} from "./consumption/helpers.js";

const PAGE_SIZE = 200;
const labelFor = () => "Usage";

export const ConsumptionPage = () => {
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirm();

  const [rows, setRows] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const load = useCallback(async (isCancelled = () => false) => {
    setLoading(true);
    setLoadError("");
    try {
      const [consumptionRes, inventoryRes] = await Promise.all([
        api.get("/consumptions"),
        api.get("/inventory/stock-items")
      ]);
      if (isCancelled()) return;
      setRows(Array.isArray(consumptionRes.data) ? consumptionRes.data : []);
      setInventoryItems(Array.isArray(inventoryRes.data) ? inventoryRes.data : []);
    } catch (err) {
      if (isCancelled()) return;
      const message = errorMessage(err, "Failed to load consumption records.");
      setLoadError(message);
      showToast(message, "error");
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let cancelled = false;
    load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  const processedRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rows
      .filter((r) => {
        const key = recordDateKey(r);
        if (fromDate && key < fromDate) return false;
        if (toDate && key > toDate) return false;
        if (!query) return true;
        return (
          r.userId?.name?.toLowerCase().includes(query) ||
          r.godownId?.name?.toLowerCase().includes(query)
        );
      })
      .sort(compareRecords);
  }, [rows, fromDate, toDate, searchQuery]);

  /* The record shown in the detail IS the highlighted one: fall back to the first
     visible record whenever the selection is missing or filtered out. */
  const activeRecord = useMemo(
    () => processedRows.find((r) => r._id === selectedId) || processedRows[0] || null,
    [selectedId, processedRows]
  );
  const editing = Boolean(activeRecord) && editingRecordId === activeRecord._id;

  const stopEditing = () => {
    setEditingRecordId(null);
    setEditItems([]);
  };

  const selectRecord = (id) => {
    if (id !== activeRecord?._id) stopEditing();
    setSelectedId(id);
  };

  const resetLimit = (setter) => (value) => {
    setter(value);
    setLimit(PAGE_SIZE);
  };

  const startEditing = () => {
    setEditingRecordId(activeRecord._id);
    setEditItems(
      (activeRecord.items || []).map((item) => ({
        stockItemId: idOf(item.stockItemId),
        stockRecordId: item.stockRecordId || null,
        name: item.stockItemId?.name || "Unknown item",
        unit: item.stockItemId?.unitId?.symbol || "",
        group: getGroupName(item),
        qtyBaseUnit: Number(item.qtyBaseUnit || 0)
      }))
    );
  };

  const updateEditQuantity = (index, value) => {
    // Up to 3 decimal places; allow an empty field while typing.
    if (value !== "" && !/^\d*(\.\d{0,3})?$/.test(value)) return;
    setEditItems((prev) => prev.map((item, i) => (i === index ? { ...item, qtyBaseUnit: value } : item)));
  };

  const removeEditItem = (index) => setEditItems((prev) => prev.filter((_, i) => i !== index));

  const saveEdit = async () => {
    if (!activeRecord || saving) return;
    if (editItems.length === 0) {
      showToast("A record needs at least one item. Cancel the edit or delete the record.", "error");
      return;
    }
    if (editItems.some((item) => !isValidQty(item.qtyBaseUnit))) {
      showToast("Please enter a valid quantity (0 or more) for every item.", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await api.patch(`/consumptions/${activeRecord._id}`, {
        items: editItems.map((item) => ({
          stockItemId: item.stockItemId,
          qtyBaseUnit: Number(Number(item.qtyBaseUnit).toFixed(3)),
          stockRecordId: item.stockRecordId || undefined
        }))
      });
      setRows((prev) =>
        prev.map((row) =>
          row._id === activeRecord._id ? res.data : row
        )
      );
      stopEditing();
      showToast(`${labelFor(activeRecord)} updated.`, "success");
    } catch (err) {
      showToast(errorMessage(err, `Failed to update ${labelFor(activeRecord).toLowerCase()}.`), "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async () => {
    if (!activeRecord || deleting) return;
    const record = activeRecord;
    const ok = await confirm({
      title: "Delete usage record?",
      message: `Delete this usage record for ${record.userId?.name || "this user"}? The used quantity will be returned to godown stock.`,
      confirmLabel: "Delete",
      variant: "danger"
    });
    if (!ok) return;

    setDeleting(true);
    try {
      await api.delete(`/consumptions/${record._id}`);
      setRows((prev) => prev.filter((row) => row._id !== record._id));
      stopEditing();
      setSelectedId(null);
      showToast("Usage deleted and stock restored.", "success");
    } catch (err) {
      showToast(errorMessage(err, `Failed to delete ${labelFor(record).toLowerCase()}.`), "error");
    } finally {
      setDeleting(false);
    }
  };

  const exportAll = () => {
    if (!inventoryItems.length) {
      showToast("No inventory items found.", "error");
      return;
    }
    if (!processedRows.length) {
      showToast("No consumption records found for the selected filters.", "error");
      return;
    }
    exportAllRecords(processedRows, inventoryItems, fromDate, toDate);
  };

  const visibleRows = processedRows.slice(0, limit);
  const filtered = Boolean(searchQuery.trim() || fromDate || toDate);

  const railEmpty = (
    <EmptyState title={filtered ? "No matching records" : "No records yet"}>
      {filtered ? "Try a different search or date range." : "Usage records will appear here."}
    </EmptyState>
  );

  let detail;
  if (loading) detail = <LoadingState label="Loading records…" />;
  else if (loadError) detail = <ErrorState message={loadError} onRetry={() => load()} />;
  else if (!activeRecord) detail = <EmptyState title="No record selected">Pick a record from the list to see its items.</EmptyState>;
  else
    detail = (
      <ConsumptionDetail
        record={activeRecord}
        editing={editing}
        editItems={editItems}
        saving={saving}
        deleting={deleting}
        onEdit={startEditing}
        onCancelEdit={stopEditing}
        onSave={saveEdit}
        onDelete={deleteRecord}
        onQtyChange={updateEditQuantity}
        onRemoveItem={removeEditItem}
        onExport={() => exportRecord(activeRecord)}
      />
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <PageHeader
        title="Usage Records"
        subtitle="Review, correct and export kitchen usage."
        actions={
          <Button variant="success" onClick={exportAll} disabled={loading || Boolean(loadError)}>
            <FileSpreadsheet size={16} /> Export all
          </Button>
        }
      >
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Search size={16} aria-hidden="true" style={{ position: "absolute", left: 12, color: "var(--muted)" }} />
          <input
            type="search"
            placeholder="Search user or godown"
            aria-label="Search by user or godown"
            value={searchQuery}
            onChange={(e) => resetLimit(setSearchQuery)(e.target.value)}
            style={{ width: 210, paddingLeft: 36 }}
          />
        </div>
        <DateField
          
          aria-label="From date"
          value={fromDate}
          max={toDate || undefined}
          onChange={(e) => resetLimit(setFromDate)(e.target.value)}
        />
        <span className="page-subtitle" style={{ margin: 0 }}>to</span>
        <DateField
          
          aria-label="To date"
          value={toDate}
          min={fromDate || undefined}
          onChange={(e) => resetLimit(setToDate)(e.target.value)}
        />
        {(fromDate || toDate) && (
          <Button
            variant="ghost"
            onClick={() => {
              setFromDate("");
              setToDate("");
              setLimit(PAGE_SIZE);
            }}
          >
            Clear
          </Button>
        )}
      </PageHeader>

      <SplitView
        rail={
          <RailList
            title={searchQuery ? "Search results" : "Recent records"}
            count={loading || loadError ? undefined : processedRows.length}
            loading={loading}
            empty={loadError ? <ErrorState message={loadError} onRetry={() => load()} /> : railEmpty}
          >
            {visibleRows.length > 0
              ? [
                  ...visibleRows.map((r) => (
                    <RailItem key={r._id} active={r._id === activeRecord?._id} onClick={() => selectRecord(r._id)}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <strong>{r.userId?.name || "Unknown user"}</strong>
                        <span className="page-subtitle" style={{ margin: 0 }}>{formatTime(r.createdAt)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 6 }}>
                        <Badge variant="info">Usage</Badge>
                        <span className="page-subtitle" style={{ margin: 0 }}>{recordDisplayDate(r)}</span>
                      </div>
                      <div className="page-subtitle" style={{ marginTop: 6 }}>
                        {r.items?.length || 0} items{r.godownId?.name ? ` • ${r.godownId.name}` : ""}
                      </div>
                    </RailItem>
                  )),
                  processedRows.length > limit && (
                    <Button key="more" variant="ghost" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
                      Show more ({processedRows.length - limit} remaining)
                    </Button>
                  )
                ].filter(Boolean)
              : null}
          </RailList>
        }
      >
        {detail}
      </SplitView>
      {dialog}
    </div>
  );
};
