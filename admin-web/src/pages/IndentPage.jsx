import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, FileSpreadsheet, Inbox, PlusCircle, Search } from "lucide-react";
import { api } from "../api.js";
import { useToast } from "../useToast.js";
import {
  Button, ErrorState, LoadingState, PageHeader, Tabs, DateField } from "../components/ui/index.jsx";
import { useConfirm } from "../components/ui/useConfirm.jsx";
import { IndentLogsView } from "./indent/IndentLogsView.jsx";
import { IndentRequestsView } from "./indent/IndentRequestsView.jsx";
import { IndentCreateView } from "./indent/IndentCreateView.jsx";
import { exportIndent, exportRequests } from "./indent/exports.js";
import { errMsg, inDateRange, makeResolvers } from "./indent/helpers.js";

const TABS = [
  { value: "history", label: "Logs", icon: <ClipboardList size={14} aria-hidden="true" /> },
  { value: "requests", label: "Supply Requests", icon: <Inbox size={14} aria-hidden="true" /> },
  { value: "create", label: "Create New", icon: <PlusCircle size={14} aria-hidden="true" /> }
];

const byNewest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

export const IndentPage = () => {
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirm();

  const [view, setView] = useState("history");
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [stockItems, setStockItems] = useState([]);
  const [indents, setIndents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const [requests, setRequests] = useState([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState("");
  const [reqId, setReqId] = useState(null);
  const [decisions, setDecisions] = useState({});

  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);

  const loadSeq = useRef(0);
  const reqSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const [itemsRes, indentRes] = await Promise.all([
        api.get("/inventory/stock-items"),
        api.get("/procurement/indents")
      ]);
      if (seq !== loadSeq.current) return;
      setStockItems(itemsRes.data || []);
      setIndents([...(indentRes.data || [])].sort(byNewest));
      setLoadError("");
    } catch (error) {
      if (seq !== loadSeq.current) return;
      const message = errMsg(error, "Failed to load indents");
      setLoadError(message);
      showToast(message, "error");
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [showToast]);

  const loadRequests = useCallback(async () => {
    const seq = ++reqSeq.current;
    setReqLoading(true);
    try {
      const res = await api.get("/indent-requests");
      if (seq !== reqSeq.current) return;
      setRequests([...(res.data || [])].sort(byNewest));
      setReqError("");
    } catch (error) {
      if (seq !== reqSeq.current) return;
      const message = errMsg(error, "Failed to load supply requests");
      setReqError(message);
      showToast(message, "error");
    } finally {
      if (seq === reqSeq.current) setReqLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (view === "requests") loadRequests(); }, [view, loadRequests]);

  const r = useMemo(() => makeResolvers(stockItems), [stockItems]);
  const term = searchTerm.trim().toLowerCase();

  const filteredIndents = useMemo(
    () => indents.filter((i) => !term || (i.indentNo || "").toLowerCase().includes(term) || String(i._id).includes(term)),
    [indents, term]
  );
  const filteredStock = useMemo(
    () => stockItems.filter((s) => !term || s.name?.toLowerCase().includes(term) || s.stockGroupId?.name?.toLowerCase().includes(term)),
    [stockItems, term]
  );
  const filteredRequests = useMemo(
    () => requests.filter((q) => inDateRange(q.createdAt, fromDate, toDate)),
    [requests, fromDate, toDate]
  );

  const activeIndent = filteredIndents.find((i) => i._id === selectedId) || filteredIndents[0] || null;
  const activeRequest = filteredRequests.find((q) => q._id === reqId) || null;

  const switchView = (next) => {
    setView(next);
    setSearchTerm("");
    setReqId(null);
    setDecisions({});
  };

  const selectRequest = (id) => {
    setReqId(id);
    setDecisions({});
  };

  const markPurchased = async (indent) => {
    const ok = await confirm({
      title: "Mark as purchased?",
      message: `Indent ${indent.indentNo || ""} will be marked purchased and become available for purchase orders. This cannot be undone.`,
      confirmLabel: "Mark Purchased"
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.post(`/procurement/indents/${indent._id}/mark-purchased`);
      showToast("Indent marked as purchased", "success");
      await load();
    } catch (error) {
      showToast(errMsg(error, "Failed to update status"), "error");
    } finally {
      setBusy(false);
    }
  };

  const confirmRequest = async () => {
    const approved = (activeRequest?.items || []).filter((it) => decisions[r.id(it)] === "approved");
    if (approved.length === 0) return showToast("Tick at least one item, or use Reject Entire Request", "error");
    const rejectedCount = activeRequest.items.length - approved.length;
    const ok = await confirm({
      title: "Confirm request?",
      message: `${approved.length} item(s) will be approved${rejectedCount ? ` and ${rejectedCount} rejected` : ""}. The kitchen is notified and this cannot be changed afterwards.`,
      confirmLabel: "Confirm Request"
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.patch(`/indent-requests/${activeRequest._id}/confirm`, {
        items: approved.map((it) => ({ stockItemId: r.id(it), qtyBaseUnit: it.qtyBaseUnit }))
      });
      showToast("Selected items approved", "success");
      setReqId(null);
      setDecisions({});
      await loadRequests();
    } catch (error) {
      showToast(errMsg(error, "Confirmation failed"), "error");
    } finally {
      setBusy(false);
    }
  };

  const rejectEntireRequest = async () => {
    const ok = await confirm({
      title: "Reject entire request?",
      message: "Every item on this request will be rejected. This cannot be undone.",
      confirmLabel: "Reject Request",
      variant: "danger"
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.patch(`/indent-requests/${activeRequest._id}/reject`);
      showToast("Request rejected", "success");
      setReqId(null);
      setDecisions({});
      await loadRequests();
    } catch (error) {
      showToast(errMsg(error, "Reject failed"), "error");
    } finally {
      setBusy(false);
    }
  };

  const submitIndent = async () => {
    const checked = Object.entries(draft).filter(([, s]) => s.checked);
    const nameOf = (id) => stockItems.find((s) => s._id === id)?.name || "item";
    if (checked.length === 0) return showToast("Select at least one item", "error");
    for (const [id, s] of checked) {
      if (!(Number(s.qty) > 0)) return showToast(`Enter a quantity above 0 for ${nameOf(id)}`, "error");
      if (s.price !== "" && !(Number(s.price) >= 0)) return showToast(`Enter a valid price for ${nameOf(id)}`, "error");
    }
    const items = checked.map(([id, s]) => ({
      stockItemId: id,
      orderedQty: Number(s.qty),
      unitPrice: Number(s.price || 0),
      amount: Number(s.qty) * Number(s.price || 0)
    }));
    setBusy(true);
    try {
      await api.post("/procurement/indents", { items });
      showToast("Indent submitted", "success");
      setDraft({});
      switchView("history");
      await load();
    } catch (error) {
      showToast(errMsg(error, "Submission failed"), "error"); // draft is kept for a retry
    } finally {
      setBusy(false);
    }
  };

  const exportAll = () => {
    if (filteredRequests.length === 0) return showToast("No requests found for this range", "error");
    exportRequests(filteredRequests, r, fromDate, toDate);
    showToast("Excel exported", "success");
  };

  const searchBox = (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <Search size={16} aria-hidden="true" style={{ position: "absolute", left: 12, color: "var(--muted-soft)" }} />
      <input
        type="search" aria-label="Search" placeholder={view === "create" ? "Search stock items…" : "Search indents…"}
        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ paddingLeft: 36, width: 240 }}
      />
    </div>
  );

  const dateFilter = (
    <>
      <DateField  aria-label="From date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} />
      <span style={{ color: "var(--muted)", fontSize: 12 }}>to</span>
      <DateField  aria-label="To date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
      {(fromDate || toDate) && (
        <Button variant="ghost" size="sm" onClick={() => { setFromDate(""); setToDate(""); }}>Clear</Button>
      )}
      <Button variant="success" onClick={exportAll}>
        <FileSpreadsheet size={16} /> Export supply requests
      </Button>
    </>
  );

  let body;
  if (loading) body = <LoadingState label="Loading indents…" />;
  else if (loadError && indents.length === 0 && stockItems.length === 0) body = <ErrorState message={loadError} onRetry={load} />;
  else if (view === "history") {
    body = (
      <IndentLogsView
        indents={filteredIndents} selected={activeIndent} onSelect={setSelectedId} r={r} busy={busy}
        searching={Boolean(term)} onMarkPurchased={markPurchased} onExport={() => exportIndent(activeIndent, r)}
      />
    );
  } else if (view === "requests") {
    body = (
      <IndentRequestsView
        requests={filteredRequests} selected={activeRequest} loading={reqLoading} error={reqError} onRetry={loadRequests}
        onSelect={selectRequest} onClose={() => selectRequest(null)} r={r} decisions={decisions} setDecisions={setDecisions}
        busy={busy} onConfirm={confirmRequest} onRejectAll={rejectEntireRequest} hasFilter={Boolean(fromDate || toDate)}
      />
    );
  } else {
    body = (
      <IndentCreateView
        stock={filteredStock} selected={draft} setSelected={setDraft} submitting={busy}
        onSubmit={submitIndent} searching={Boolean(term)}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <PageHeader title="Purchase Planning" subtitle="Review kitchen supply requests and prepare purchase indents." actions={view === "requests" ? dateFilter : searchBox}>
        <Tabs items={TABS} value={view} onChange={switchView} label="Indent views" />
      </PageHeader>
      {body}
      {dialog}
    </div>
  );
};
