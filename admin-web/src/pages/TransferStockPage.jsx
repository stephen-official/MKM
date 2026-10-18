import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import XLSX from "xlsx-js-style";
import { ArrowRightLeft, Search, FileSpreadsheet, X } from "lucide-react";
import { useToast } from "../useToast.js";
import {
  PageHeader, Card, Button, Badge, EmptyState, Field, SplitView, RailList, RailItem, DetailPanel,
  Meta, StatusBadge, ErrorState, DateField, Select } from "../components/ui/index.jsx";
import { useConfirm } from "../components/ui/useConfirm.jsx";

const MAX_RAIL_ROWS = 200;
const EMPTY_FORM = { fromGodownId: "", toGodownId: "", stockGroupId: "", stockItemId: "", qtyBaseUnit: "" };

const errorMessage = (error, fallback) => error?.response?.data?.message || error?.response?.data?.error || fallback;
const idOf = (ref) => ref?._id || ref;
const fmtDate = (value) => (value ? new Date(value).toLocaleDateString("en-GB") : "—");
const fmtDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
    : "—";
// Local calendar day as yyyy-mm-dd, so it compares correctly with <input type="date"> values.
const dayKey = (value) => new Date(value).toLocaleDateString("en-CA");
const transferRef = (t) => `TRN-${t._id.slice(-6).toUpperCase()}`;

export const TransferStockPage = () => {
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirm();
  const [godowns, setGodowns] = useState([]);
  const [stockGroups, setStockGroups] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [transfersLoading, setTransfersLoading] = useState(true);
  const [transfersError, setTransfersError] = useState("");
  const [stockLoading, setStockLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [itemSearch, setItemSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const transfersRequest = useRef(0);
  const stockRequest = useRef(0);

  const loadTransfers = useCallback(async () => {
    const current = ++transfersRequest.current;
    setTransfersLoading(true);
    setTransfersError("");
    try {
      const res = await api.get("/transfers");
      if (current !== transfersRequest.current) return;
      setTransfers(
        [...(res.data || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      );
    } catch (error) {
      if (current !== transfersRequest.current) return;
      const message = errorMessage(error, "Failed to load transfers");
      setTransfersError(message);
      showToast(message, "error");
    } finally {
      if (current === transfersRequest.current) setTransfersLoading(false);
    }
  }, [showToast]);

  const loadReferenceData = useCallback(async () => {
    try {
      const [gRes, grpRes] = await Promise.all([api.get("/inventory/godowns"), api.get("/inventory/stock-groups")]);
      setGodowns(gRes.data || []);
      setStockGroups(grpRes.data || []);
    } catch (error) {
      showToast(errorMessage(error, "Failed to load godowns and stock groups"), "error");
    }
  }, [showToast]);

  const loadGodownStock = useCallback(async (godownId) => {
    const current = ++stockRequest.current;
    if (!godownId) {
      setStockItems([]);
      setStockLoading(false);
      return;
    }
    setStockLoading(true);
    try {
      const res = await api.get("/godown-stocks");
      if (current !== stockRequest.current) return;
      setStockItems((res.data || []).filter((s) => idOf(s.godownId) === godownId));
    } catch (error) {
      if (current !== stockRequest.current) return;
      setStockItems([]);
      showToast(errorMessage(error, "Failed to fetch godown stock levels"), "error");
    } finally {
      if (current === stockRequest.current) setStockLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadTransfers(); loadReferenceData(); }, [loadTransfers, loadReferenceData]);
  useEffect(() => { loadGodownStock(form.fromGodownId); }, [loadGodownStock, form.fromGodownId]);

  const currentSelectedItem = useMemo(
    () => stockItems.find((item) => idOf(item.stockItemId) === form.stockItemId),
    [stockItems, form.stockItemId]
  );
  const available = Number(currentSelectedItem?.qtyBaseUnit) || 0;
  const unitSymbol = currentSelectedItem?.stockItemId?.unitId?.symbol || "";

  const filteredItems = useMemo(() => {
    const term = itemSearch.trim().toLowerCase();
    return stockItems.filter((item) => {
      const matchesSearch = (item.stockItemId?.name || "").toLowerCase().includes(term);
      const matchesGroup = form.stockGroupId ? idOf(item.stockItemId?.stockGroupId) === form.stockGroupId : true;
      return matchesSearch && matchesGroup;
    });
  }, [stockItems, itemSearch, form.stockGroupId]);

  const processedTransfers = useMemo(
    () => transfers.filter((t) => {
      const day = dayKey(t.createdAt);
      return !(fromDate && day < fromDate) && !(toDate && day > toDate);
    }),
    [transfers, fromDate, toDate]
  );

  const selectedTransfer = processedTransfers.find((t) => t._id === selectedId) || processedTransfers[0] || null;

  const patchForm = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(patch).forEach((key) => delete next[key]);
      if ("fromGodownId" in patch || "toGodownId" in patch) { delete next.fromGodownId; delete next.toGodownId; }
      return next;
    });
  };

  const onSourceChange = (value) => {
    setItemSearch("");
    patchForm({
      fromGodownId: value,
      toGodownId: form.toGodownId === value ? "" : form.toGodownId,
      stockItemId: "",
      qtyBaseUnit: ""
    });
  };

  const validate = () => {
    const next = {};
    const qty = Number(form.qtyBaseUnit);
    if (!form.fromGodownId) next.fromGodownId = "Choose a source godown.";
    if (!form.toGodownId) next.toGodownId = "Choose a destination godown.";
    else if (form.fromGodownId && form.fromGodownId === form.toGodownId) next.toGodownId = "Destination must differ from the source.";
    if (!form.stockItemId) next.stockItemId = "Choose an item to transfer.";
    if (form.qtyBaseUnit === "" || !Number.isFinite(qty) || qty <= 0) next.qtyBaseUnit = "Enter a quantity greater than 0.";
    else if (form.stockItemId && qty > available) next.qtyBaseUnit = `Only ${available} ${unitSymbol} available.`.trim();
    return next;
  };

  const handleTransfer = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      showToast(Object.values(found)[0], "error");
      return;
    }
    const qty = Number(form.qtyBaseUnit);
    const fromName = godowns.find((g) => g._id === form.fromGodownId)?.name || "source";
    const toName = godowns.find((g) => g._id === form.toGodownId)?.name || "destination";
    const ok = await confirm({
      title: "Post transfer",
      message: `Transfer ${qty} ${unitSymbol} of ${currentSelectedItem?.stockItemId?.name || "this item"} from ${fromName} to ${toName}?`,
      confirmLabel: "Post transfer"
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      await api.post("/transfers", {
        fromGodownId: form.fromGodownId,
        toGodownId: form.toGodownId,
        items: [{ stockItemId: form.stockItemId, qtyBaseUnit: qty }]
      });
      showToast("Transfer posted", "success");
      setForm((prev) => ({ ...prev, stockItemId: "", qtyBaseUnit: "" }));
      setItemSearch("");
      setSelectedId(null);
      await Promise.all([loadTransfers(), loadGodownStock(form.fromGodownId)]);
    } catch (error) {
      showToast(errorMessage(error, "Transfer failed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadAllTransfersExcel = () => {
    if (!processedTransfers.length) return;
    const groupedByDate = {};
    const consolidated = {};
    const godownColumns = new Set();

    const addQty = (bucket, item, from, to, qty) => {
      const id = idOf(item.stockItemId);
      if (!bucket[id]) {
        bucket[id] = {
          name: item.stockItemId?.name || "",
          group: item.stockItemId?.stockGroupId?.name || "General",
          unit: item.stockItemId?.unitId?.symbol || "",
          total: 0,
          godowns: {}
        };
      }
      const entry = bucket[id];
      entry.total += qty;
      entry.godowns[`${from} (-)`] = (entry.godowns[`${from} (-)`] || 0) + qty;
      entry.godowns[`${to} (+)`] = (entry.godowns[`${to} (+)`] || 0) + qty;
    };

    processedTransfers.forEach((tr) => {
      const from = tr.fromGodownId?.name || "Unknown";
      const to = tr.toGodownId?.name || "Unknown";
      godownColumns.add(`${from} (-)`);
      godownColumns.add(`${to} (+)`);
      const day = dayKey(tr.createdAt);
      (groupedByDate[day] ||= {});
      (tr.items || []).forEach((item) => {
        const qty = Number(item.qtyBaseUnit) || 0;
        addQty(groupedByDate[day], item, from, to, qty);
        addQty(consolidated, item, from, to, qty);
      });
    });

    const columns = [...godownColumns];
    const header = ["S.No", "Stock Item", "Group", "Unit", ...columns, "TOTAL"];
    const rowsFor = (bucket) =>
      Object.values(bucket).map((item, i) => [
        i + 1, item.name, item.group, item.unit, ...columns.map((g) => item.godowns[g] || 0), item.total
      ]);

    const aoa = [["TRANSFER REPORT"], []];
    Object.keys(groupedByDate).sort().reverse().forEach((day) => {
      aoa.push([`DATE : ${fmtDate(`${day}T00:00:00`)}`], [], header, ...rowsFor(groupedByDate[day]), [], []);
    });
    aoa.push(["CONSOLIDATED"], [], header, ...rowsFor(consolidated));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Transfers");
    XLSX.writeFile(
      wb,
      fromDate || toDate ? `Transfer_Report_${fromDate || "start"}_to_${toDate || "end"}.xlsx` : "Transfer_Report.xlsx"
    );
  };

  const railItems = processedTransfers.slice(0, MAX_RAIL_ROWS).map((t) => (
    <RailItem key={t._id} active={selectedTransfer?._id === t._id} onClick={() => setSelectedId(t._id)}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <strong>{transferRef(t)}</strong>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{fmtDate(t.createdAt)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginTop: 6 }}>
        <span style={{ fontSize: 12, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 6 }}>
          {t.fromGodownId?.name || "—"} <ArrowRightLeft size={10} aria-label="to" /> {t.toGodownId?.name || "—"}
        </span>
        {t.status && <StatusBadge status={t.status} />}
      </div>
    </RailItem>
  ));
  if (processedTransfers.length > MAX_RAIL_ROWS) {
    railItems.push(
      <p key="more" style={{ padding: 8, fontSize: 12, color: "var(--muted)" }}>
        Showing the latest {MAX_RAIL_ROWS} of {processedTransfers.length}. Narrow the dates to see others.
      </p>
    );
  }

  const railEmpty = transfersError ? (
    <ErrorState message={transfersError} onRetry={loadTransfers} />
  ) : (
    <EmptyState title={transfers.length ? "No transfers in this range" : "No transfers yet"}>
      {transfers.length ? "Clear or widen the date filter." : "Posted transfers will appear here."}
    </EmptyState>
  );

  return (
    <div style={{ height: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <PageHeader
        title="Stock Transfers"
        subtitle="Move existing stock between godowns for the receiver to accept."
        actions={
          <Button variant="success" size="sm" onClick={handleDownloadAllTransfersExcel} disabled={!processedTransfers.length}>
            <FileSpreadsheet size={16} /> Export transfers
          </Button>
        }
      >
        <DateField  aria-label="Transfers from date" title="From date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} />
        <span aria-hidden="true" style={{ color: "var(--muted)" }}>to</span>
        <DateField  aria-label="Transfers to date" title="To date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
        {(fromDate || toDate) && (
          <Button variant="ghost" size="sm" aria-label="Clear dates" title="Clear dates" onClick={() => { setFromDate(""); setToDate(""); }}>
            <X size={14} />
          </Button>
        )}
      </PageHeader>

      <div style={{ padding: "20px 32px 0" }}>
        <Card as="form" onSubmit={handleTransfer} noValidate tight style={{ marginTop: 0 }} aria-label="New transfer">
          <div className="form-row form-row--grid">
            <FormField label="Source godown" error={errors.fromGodownId} style={{ flex: "1 1 170px" }}>
              <Select value={form.fromGodownId} disabled={submitting} aria-invalid={!!errors.fromGodownId} onChange={(e) => onSourceChange(e.target.value)}>
                <option value="">Select source</option>
                {godowns.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
              </Select>
            </FormField>

            <FormField label="Destination godown" error={errors.toGodownId} style={{ flex: "1 1 170px" }}>
              <Select value={form.toGodownId} disabled={submitting} aria-invalid={!!errors.toGodownId} onChange={(e) => patchForm({ toGodownId: e.target.value })}>
                <option value="">Select destination</option>
                {godowns.filter((g) => g._id !== form.fromGodownId).map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
              </Select>
            </FormField>

            <FormField label="Stock group" style={{ flex: "1 1 150px" }}>
              <Select value={form.stockGroupId} disabled={submitting} onChange={(e) => { setItemSearch(""); patchForm({ stockGroupId: e.target.value, stockItemId: "" }); }}>
                <option value="">All groups</option>
                {stockGroups.map((grp) => <option key={grp._id} value={grp._id}>{grp.name}</option>)}
              </Select>
            </FormField>

            <FormField label="Find item" style={{ flex: "1 1 150px" }}>
              <span style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <Search size={16} aria-hidden="true" style={{ position: "absolute", left: 10, color: "var(--muted-soft)" }} />
                <input
                  type="search"
                  placeholder={form.fromGodownId ? "Type to filter items" : "Select source first"}
                  disabled={!form.fromGodownId || submitting}
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  style={{ width: "100%", paddingLeft: 34 }}
                />
              </span>
            </FormField>

            <FormField label="Item" error={errors.stockItemId} style={{ flex: "2 1 220px" }}>
              <Select
                value={form.stockItemId}
                disabled={!form.fromGodownId || stockLoading || submitting}
                aria-invalid={!!errors.stockItemId}
                onChange={(e) => patchForm({ stockItemId: e.target.value, qtyBaseUnit: "" })}
              >
                <option value="">
                  {!form.fromGodownId ? "Select source first" : stockLoading ? "Loading stock…" : filteredItems.length ? "Select item" : "No items in stock"}
                </option>
                {filteredItems.map((item) => (
                  <option key={item._id} value={idOf(item.stockItemId)} disabled={!(item.qtyBaseUnit > 0)}>
                    {item.stockItemId?.name} ({item.qtyBaseUnit} {item.stockItemId?.unitId?.symbol || ""})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              label={currentSelectedItem ? `Qty (max ${available} ${unitSymbol})`.trim() : "Qty"}
              error={errors.qtyBaseUnit}
              style={{ flex: "1 1 120px" }}
            >
              <input
                type="number" min="0" step="any" inputMode="decimal"
                max={currentSelectedItem ? available : undefined}
                placeholder="0"
                value={form.qtyBaseUnit}
                disabled={submitting}
                aria-invalid={!!errors.qtyBaseUnit}
                onChange={(e) => patchForm({ qtyBaseUnit: e.target.value })}
              />
            </FormField>

            <Button type="submit" variant="dark" disabled={submitting}>
              {submitting ? "Posting…" : "Post transfer"}
            </Button>
          </div>
        </Card>
      </div>

      <SplitView
        rail={
          <RailList
            title="Recent activity"
            count={transfersLoading ? undefined : processedTransfers.length}
            loading={transfersLoading && !transfers.length}
            empty={railEmpty}
          >
            {railItems}
          </RailList>
        }
      >
        {selectedTransfer ? (
          <DetailPanel
            head={
              <>
                <Meta label="Reference">{transferRef(selectedTransfer)}</Meta>
                <Meta label="Route">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    {selectedTransfer.fromGodownId?.name || "—"} <ArrowRightLeft size={14} aria-label="to" /> {selectedTransfer.toGodownId?.name || "—"}
                  </span>
                </Meta>
                <Meta label="Posted">{fmtDateTime(selectedTransfer.createdAt)}</Meta>
                {selectedTransfer.status && <Meta label="Status"><StatusBadge status={selectedTransfer.status} /></Meta>}
              </>
            }
          >
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Stock group</th>
                  <th scope="col" style={{ textAlign: "right" }}>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {(selectedTransfer.items || []).map((it, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 650 }}>{it.stockItemId?.name || "Unknown item"}</td>
                    <td><Badge>{it.stockItemId?.stockGroupId?.name || "General"}</Badge></td>
                    <td style={{ textAlign: "right", fontWeight: 650 }}>
                      {it.qtyBaseUnit} {it.stockItemId?.unitId?.symbol || "units"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DetailPanel>
        ) : (
          <EmptyState title="No transfer selected">Choose a transfer from the list to see its items.</EmptyState>
        )}
      </SplitView>
      {dialog}
    </div>
  );
};

// A form control with its label and an inline validation message.
function FormField({ label, error, children, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, ...style }}>
      <Field label={label}>{children}</Field>
      {error && <span role="alert" style={{ fontSize: 12, color: "var(--danger-strong)" }}>{error}</span>}
    </div>
  );
}
