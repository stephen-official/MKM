import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import XLSX from "xlsx-js-style";
import { CheckCircle, FileSpreadsheet, Search, XCircle } from "lucide-react";
import { api } from "../api.js";
import { useToast } from "../useToast.js";
import {
  Banner, Button, DataTable, DetailPanel, EmptyState, ErrorState, Field, LoadingState, Meta, PageHeader,
  RailItem, RailList, SplitView, StatusBadge, DateField } from "../components/ui/index.jsx";
import { useConfirm } from "../components/ui/useConfirm.jsx";
import { errMsg, fmtDate, fmtDateTime, fmtTime, formatQty, inDateRange, rangeLabel } from "./indent/helpers.js";

const PAGE = 100;
const rowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 };
const mutedStyle = { color: "var(--muted)", fontSize: 12 };

const qtyOf = (item) => item.qtyBaseUnit || item.quantity || 0;
const unitOf = (item) => item.stockItemId?.unitId?.symbol || item.unit || "";
const targetOf = (req) => (req.targetDate ? fmtDate(req.targetDate) : "Immediate");

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: "FFFFFF" } },
  fill: { patternType: "solid", fgColor: { rgb: "1E40AF" } }
};

const exportOne = (req) => {
  const rows = (req.items || []).map((item) => ({
    "Stock Item": item.stockItemId?.name || "",
    Quantity: qtyOf(item),
    Unit: unitOf(item) || "Units",
    Status: req.status,
    Reason: req.reason || "",
    "Authorised By": req.userId?.name || "Admin",
    Date: fmtDate(req.createdAt),
    "Target Date": targetOf(req)
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Inventory Request");
  XLSX.writeFile(wb, `Request_${req.requestedBy || req.userId?.name || "Admin"}_${Date.now()}.xlsx`);
};

const exportMany = (requests, from, to) => {
  const rows = [["Date", "Target Date", "Godown", "Requested By", "Reason", "Status", "Item", "Quantity", "Unit"]];
  const groupOf = []; // request index per data row, for banding
  requests.forEach((req, ri) => {
    (req.items || []).forEach((item, i) => {
      const first = i === 0;
      rows.push([
        first ? fmtDate(req.createdAt) : "",
        first ? targetOf(req) : "",
        first ? req.godownId?.name || "" : "",
        first ? req.userId?.name || "" : "",
        first ? req.reason || "" : "",
        first ? req.status || "" : "",
        item.stockItemId?.name || "",
        qtyOf(item),
        unitOf(item)
      ]);
      groupOf.push(ri);
    });
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const cols = rows[0].length;
  for (let c = 0; c < cols; c += 1) {
    const head = ws[XLSX.utils.encode_cell({ r: 0, c })];
    if (head) head.s = HEADER_STYLE;
    groupOf.forEach((ri, i) => {
      const cell = ws[XLSX.utils.encode_cell({ r: i + 1, c })];
      if (cell) cell.s = { fill: { patternType: "solid", fgColor: { rgb: ri % 2 === 0 ? "E0F2FE" : "ECFDF5" } } };
    });
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Requests");
  XLSX.writeFile(wb, `Requests_${rangeLabel(from, to)}.xlsx`);
};

export const RequestsPage = () => {
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirm();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    try {
      const res = await api.get("/requests");
      if (mine !== seq.current) return;
      setRequests(res.data || []);
      setError("");
    } catch (err) {
      if (mine !== seq.current) return;
      const message = errMsg(err, "Failed to load requests");
      setError(message);
      showToast(message, "error");
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests
      .filter((r) => inDateRange(r.createdAt, fromDate, toDate))
      .filter(
        (r) =>
          !q ||
          r.requestedBy?.toLowerCase().includes(q) ||
          r.userId?.name?.toLowerCase().includes(q) ||
          r.godownId?.name?.toLowerCase().includes(q) ||
          r.reason?.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        if ((a.status === "pending") !== (b.status === "pending")) return a.status === "pending" ? -1 : 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }, [requests, fromDate, toDate, searchQuery]);

  const active = rows.find((r) => r._id === selectedId) || rows[0] || null;
  const activeId = active?._id;
  useEffect(() => { setNote(""); }, [activeId]);

  const decide = async (action) => {
    const approve = action === "approve";
    const ok = await confirm({
      title: approve ? "Approve this request?" : "Reject this request?",
      message: approve
        ? `The requested quantities will be deducted from ${active.godownId?.name || "the kitchen"}'s stock and recorded as consumption. This cannot be undone.`
        : "The kitchen will be told this request was rejected. This cannot be undone.",
      confirmLabel: approve ? "Approve" : "Reject",
      variant: approve ? "primary" : "danger"
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.post(`/requests/${active._id}/${action}`, { note: note.trim() || undefined });
      showToast(approve ? "Request approved" : "Request rejected", "success");
      setNote("");
      await load();
    } catch (err) {
      showToast(errMsg(err, "Action failed"), "error"); // note stays for a retry
    } finally {
      setBusy(false);
    }
  };

  const exportAll = () => {
    if (!rows.length) return showToast("No requests to export", "error");
    exportMany(rows, fromDate, toDate);
    showToast("Excel exported", "success");
  };

  const filtered = Boolean(searchQuery.trim() || fromDate || toDate);
  const pending = active?.status === "pending";

  const rail = (
    <RailList
      title={filtered ? "Search results" : "Recent records"}
      count={rows.length}
      loading={loading}
      empty={
        error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <EmptyState title={filtered ? "No matching requests" : "No requests yet"}>
            {filtered ? "Adjust the search or date range." : "Consumption requests from kitchens will appear here."}
          </EmptyState>
        )
      }
    >
      {rows.slice(0, limit).map((r) => (
        <RailItem key={r._id} active={active?._id === r._id} onClick={() => setSelectedId(r._id)}>
          <div style={rowStyle}>
            <strong>{r.godownId?.name || "Main hub"}</strong>
            <span style={mutedStyle}>{fmtTime(r.createdAt)}</span>
          </div>
          <div style={{ ...rowStyle, marginTop: 6 }}>
            <span style={mutedStyle}>{fmtDate(r.createdAt)} · {r.items?.length || 0} items · {r.userId?.name || "Admin"}</span>
            <StatusBadge status={r.status} />
          </div>
        </RailItem>
      ))}
      {rows.length > limit && (
        <Button variant="ghost" size="sm" onClick={() => setLimit((n) => n + PAGE)}>
          Show more ({rows.length - limit} left)
        </Button>
      )}
    </RailList>
  );

  let detail;
  if (loading) detail = <LoadingState label="Loading requests…" />;
  else if (!active) detail = <EmptyState title={error ? "Requests could not be loaded" : "No matching requests found"} />;
  else {
    detail = (
      <DetailPanel
        head={
          <>
            <Meta label="Status"><StatusBadge status={active.status} /></Meta>
            <Meta label="Target date">{targetOf(active)}</Meta>
            <Meta label="Raised">{fmtDateTime(active.createdAt)}</Meta>
            <Meta label="Requested by" align="end">
              {active.userId?.name || "Admin"}
              {active.godownId?.name && <span style={{ ...mutedStyle, display: "block", fontWeight: 400 }}>{active.godownId.name}</span>}
            </Meta>
          </>
        }
        foot={
          <>
            <Button variant="success" onClick={() => exportOne(active)} style={{ marginRight: "auto" }}>
              <FileSpreadsheet size={16} /> Export to Excel
            </Button>
            {pending ? (
              <>
                <Button variant="danger" disabled={busy} onClick={() => decide("reject")}>
                  <XCircle size={16} /> Reject
                </Button>
                <Button disabled={busy} onClick={() => decide("approve")}>
                  <CheckCircle size={16} /> {busy ? "Saving…" : "Approve Request"}
                </Button>
              </>
            ) : (
              <span style={mutedStyle}>Admin note: {active.adminDecision || "No note provided"}</span>
            )}
          </>
        }
      >
        {active.reason && <Banner variant="info">Reason: {active.reason}</Banner>}
        {pending && (
          <Field label="Decision note (optional)">
            <input type="text" value={note} maxLength={200} placeholder="Shown to the kitchen with your decision" onChange={(e) => setNote(e.target.value)} />
          </Field>
        )}
        <DataTable>
          <thead>
            <tr>
              <th scope="col">Stock item</th>
              <th scope="col" style={{ textAlign: "right" }}>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {(active.items || []).map((item, idx) => (
              <tr key={idx}>
                <td><strong>{item.stockItemId?.name || "Unknown item"}</strong></td>
                <td style={{ textAlign: "right" }}>{formatQty(qtyOf(item))} {unitOf(item)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </DetailPanel>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <PageHeader
        title="Requests"
        actions={
          <>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Search size={16} aria-hidden="true" style={{ position: "absolute", left: 12, color: "var(--muted-soft)" }} />
              <input
                type="search" aria-label="Search requests" placeholder="Search requests…" value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setLimit(PAGE); }} style={{ paddingLeft: 36, width: 200 }}
              />
            </div>
            <DateField  aria-label="From date" value={fromDate} max={toDate || undefined} onChange={(e) => { setFromDate(e.target.value); setLimit(PAGE); }} />
            <span style={mutedStyle}>to</span>
            <DateField  aria-label="To date" value={toDate} min={fromDate || undefined} onChange={(e) => { setToDate(e.target.value); setLimit(PAGE); }} />
            {(fromDate || toDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setFromDate(""); setToDate(""); }}>Clear</Button>
            )}
            <Button variant="success" onClick={exportAll}>
              <FileSpreadsheet size={16} /> Export All
            </Button>
          </>
        }
      />
      <SplitView rail={rail}>{detail}</SplitView>
      {dialog}
    </div>
  );
};
