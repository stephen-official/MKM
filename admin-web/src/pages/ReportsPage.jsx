import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { useToast } from "../useToast.js";
import { Search, Download, Table as TableIcon, X } from "lucide-react";
import {
  PageHeader, Button, Badge, EmptyState, SplitView, RailList, RailItem, DetailPanel, Meta,
  StatusBadge, ErrorState, DateField, Select } from "../components/ui/index.jsx";

const reportEntities = ["indents", "purchase-orders", "distributions", "transfers", "requests", "consumptions"];
const ENTITY_LABELS = {
  indents: "Purchase indents",
  "purchase-orders": "Purchase orders",
  distributions: "Purchase distributions",
  transfers: "Stock transfers",
  requests: "Usage approval requests",
  consumptions: "Usage records"
};
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MAX_RAIL_ROWS = 200;
const HIDDEN_KEYS = new Set([
  "_id", "__v", "items", "allocations", "leftovers", "updatedAt", "userId", "createdBy", "indentId",
  "purchaseOrderId", "leftoverSourceId", "fromGodownId", "toGodownId", "godownId", "status", "createdAt"
]);

const entityLabel = (entity) => ENTITY_LABELS[entity] || entity.replaceAll("-", " ");
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const fmtDate = (value) => (value ? new Date(value).toLocaleDateString("en-GB") : "—");
const fmtDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
    : "—";
const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;
const docNumber = (row) =>
  row.indentNo || row.orderNo || row.transferNo || row.requestNo || row.distributionNo || row.consumptionNo || "";
const humanizeKey = (key) => key.replace(/([A-Z])/g, " $1");

const formatValue = (key, value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (/amount/i.test(key)) return money(value);
  if (/(At|Date)$/.test(key)) return fmtDateTime(value);
  if (typeof value === "object") return value.name || value.symbol || "—";
  return String(value);
};

const saveBlob = (data, filename) => {
  const url = window.URL.createObjectURL(new Blob([data], { type: XLSX_MIME }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const ReportsPage = () => {
  const { showToast } = useToast();
  const [entity, setEntity] = useState("indents");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const requestId = useRef(0);

  // Loads the active entity for the date range; responses from superseded requests are ignored.
  const load = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    setLoadError("");
    setRows([]);
    setSelectedRowId(null);
    try {
      const res = await api.get(`/reports/${entity}`, { params: { startDate, endDate } });
      if (current !== requestId.current) return;
      const data = Array.isArray(res.data) ? res.data : [];
      setRows(data);
      setSelectedRowId(data[0]?._id ?? null);
    } catch (error) {
      if (current !== requestId.current) return;
      const message = errorMessage(error, `Failed to load ${entityLabel(entity)}`);
      setLoadError(message);
      showToast(message, "error");
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [entity, startDate, endDate, showToast]);

  useEffect(() => { load(); }, [load]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [docNumber(row), row.status, row._id, ...Object.values(row).filter((v) => typeof v === "string" || typeof v === "number")]
        .some((val) => String(val).toLowerCase().includes(term))
    );
  }, [rows, searchTerm]);

  const visibleRows = filteredRows.slice(0, MAX_RAIL_ROWS);
  const activeRow = useMemo(() => rows.find((r) => r._id === selectedRowId), [selectedRowId, rows]);

  const resolveStatus = (row) => {
    if (row.status) return row.status;
    return ["distributions", "transfers", "consumptions"].includes(entity) ? "completed" : null;
  };

  const download = async (url, params, filename, failMessage) => {
    if (exporting) return;
    setExporting(true);
    try {
      const response = await api.get(url, { params, responseType: "arraybuffer", headers: { Accept: XLSX_MIME } });
      saveBlob(response.data, filename);
    } catch (error) {
      // An arraybuffer error body has to be decoded before it can be read.
      let message = failMessage;
      try {
        message = JSON.parse(new TextDecoder().decode(error.response?.data)).message || failMessage;
      } catch { /* not JSON; keep the generic message */ }
      showToast(message, "error");
    } finally {
      setExporting(false);
    }
  };

  const exportAllExcel = () =>
    download(`/reports/${entity}/export/excel`, { startDate, endDate },
      `all-${entity}-${startDate || "start"}-to-${endDate || "end"}.xlsx`, "Export failed");

  const exportSingleExcel = (id) =>
    download(`/reports/${entity}/export/excel/${id}`, undefined, `${entity}-${id}.xlsx`, "Download failed");

  const visibleKeys = activeRow ? Object.keys(activeRow).filter((key) => !HIDDEN_KEYS.has(key)) : [];
  const lineItems = activeRow ? activeRow.items || activeRow.allocations : null;
  const activeStatus = activeRow ? resolveStatus(activeRow) : null;

  const changeEntity = (value) => {
    setEntity(value);
    setSearchTerm("");
  };

  const railEmpty = loadError ? (
    <ErrorState message={loadError} onRetry={load} />
  ) : (
    <EmptyState title={rows.length ? "No matching records" : `No ${entityLabel(entity)} found`}>
      {rows.length ? "Try a different search term." : "Try widening the date range or choosing another report."}
    </EmptyState>
  );

  const railItems = visibleRows.map((row) => {
    const status = resolveStatus(row);
    return (
      <RailItem key={row._id} active={selectedRowId === row._id} onClick={() => setSelectedRowId(row._id)}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <strong>{docNumber(row) || row._id.slice(-8).toUpperCase()}</strong>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>{fmtDate(row.createdAt)}</span>
        </div>
        <div style={{ marginTop: 6 }}>
          {status ? <StatusBadge status={status} /> : <Badge>No status</Badge>}
        </div>
      </RailItem>
    );
  });
  if (filteredRows.length > MAX_RAIL_ROWS) {
    railItems.push(
      <p key="more" style={{ padding: 8, fontSize: 12, color: "var(--muted)" }}>
        Showing the first {MAX_RAIL_ROWS} of {filteredRows.length}. Search or narrow the dates to see others.
      </p>
    );
  }

  return (
    <div style={{ height: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <PageHeader
        title="Exports"
        subtitle="Download records from every workflow in one place."
        actions={
          <Button variant="dark" onClick={exportAllExcel} disabled={exporting || loading || !rows.length}>
            <Download size={14} /> {exporting ? "Exporting…" : "Export all"}
          </Button>
        }
      >
        <Select aria-label="Report type" value={entity} onChange={(e) => changeEntity(e.target.value)} style={{ textTransform: "capitalize" }}>
          {reportEntities.map((r) => <option key={r} value={r}>{entityLabel(r)}</option>)}
        </Select>
        <DateField  aria-label="From date" title="From date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} />
        <span aria-hidden="true" style={{ color: "var(--muted)" }}>to</span>
        <DateField  aria-label="To date" title="To date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
        {(startDate || endDate) && (
          <Button variant="ghost" size="sm" aria-label="Clear dates" title="Clear dates" onClick={() => { setStartDate(""); setEndDate(""); }}>
            <X size={14} />
          </Button>
        )}
      </PageHeader>

      <SplitView
        rail={
          <>
            <div style={{ position: "relative", display: "flex", alignItems: "center", marginBottom: 10 }}>
              <Search size={16} aria-hidden="true" style={{ position: "absolute", left: 12, color: "var(--muted-soft)" }} />
              <input
                type="search"
                aria-label="Search records"
                placeholder="Search records…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: 36, width: "100%" }}
              />
            </div>
            <RailList
              title={entityLabel(entity)}
              count={loading ? undefined : filteredRows.length}
              loading={loading}
              empty={railEmpty}
            >
              {railItems}
            </RailList>
          </>
        }
      >
        {activeRow ? (
          <DetailPanel
            head={
              <>
                <Meta label="Document">{docNumber(activeRow) || activeRow._id}</Meta>
                <Meta label="Created">{fmtDateTime(activeRow.createdAt)}</Meta>
                <Meta label="Status">{activeStatus ? <StatusBadge status={activeStatus} /> : "—"}</Meta>
              </>
            }
            foot={
              <Button variant="success" onClick={() => exportSingleExcel(activeRow._id)} disabled={exporting}>
                <Download size={16} /> Download XLSX
              </Button>
            }
          >
            {visibleKeys.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, padding: "20px 0 24px" }}>
                {visibleKeys.map((key) => (
                  <Meta key={key} label={humanizeKey(key)}>
                    <span style={{ fontSize: 14, fontWeight: 600, overflowWrap: "anywhere" }}>{formatValue(key, activeRow[key])}</span>
                  </Meta>
                ))}
              </div>
            )}

            {lineItems && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0 4px", fontWeight: 650 }}>
                  <TableIcon size={16} aria-hidden="true" /> Itemised breakdown
                </div>
                {lineItems.length ? (
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">Item</th>
                        <th scope="col">Group</th>
                        <th scope="col" style={{ textAlign: "center" }}>Quantity</th>
                        <th scope="col" style={{ textAlign: "right" }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, idx) => {
                        const quantity = item.quantity || item.qtyBaseUnit || item.receivedQty || item.orderedQty || 0;
                        const groupName = item.stockItemId?.stockGroupId?.name || item.stockItemId?.groupName || item.groupName || "General";
                        const unitSymbol = item.stockItemId?.unitId?.symbol || item.unitId?.symbol || item.unit || "";
                        const amount = item.amount || (item.unitPrice ? quantity * item.unitPrice : 0);
                        return (
                          <tr key={idx}>
                            <td style={{ fontWeight: 650 }}>{item.stockItemId?.name || item.itemName || "Unknown item"}</td>
                            <td><Badge>{groupName}</Badge></td>
                            <td style={{ textAlign: "center" }}>{quantity} {unitSymbol}</td>
                            <td style={{ textAlign: "right", fontWeight: 650 }}>{amount ? money(amount) : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState title="No line items">This record has no itemised lines.</EmptyState>
                )}
              </>
            )}
          </DetailPanel>
        ) : (
          <EmptyState title={loading ? "Loading…" : "No record selected"}>
            {loading ? "Fetching the report." : "Choose a record from the list to see its details."}
          </EmptyState>
        )}
      </SplitView>
    </div>
  );
};
