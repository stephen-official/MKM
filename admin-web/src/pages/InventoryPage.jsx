import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Search, FileSpreadsheet, Plus, Trash2, Edit3, Layers, MapPin, Ruler, Check, X } from "lucide-react";
import { api } from "../api.js";
import { useToast } from "../useToast.js";
import {
  PageHeader, Button, Badge, Field, EmptyState, ErrorState, LoadingState,
  DataTable, Tabs, DetailPanel
} from "../components/ui/index.jsx";
import { useConfirm } from "../components/ui/useConfirm.jsx";

// Products have their own page (ProductsPage.jsx); units are a fixed preset list, shown here read-only.
const TABS = [
  { value: "stock-groups", label: "Product Groups", singular: "Product Group", icon: <Layers size={14} /> },
  { value: "units", label: "Units", singular: "Unit", icon: <Ruler size={14} />, readOnly: true },
  { value: "godowns", label: "Godowns", singular: "Godown", icon: <MapPin size={14} /> }
];

// Keep in step with backend/src/catalog/units.js.
const PRESET_SYMBOLS = new Set(["kg", "g", "L", "mL", "pcs", "dozen", "packet"]);
const ROW_LIMIT = 100;

const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;
const isoToday = () => new Date().toISOString().split("T")[0];

export const InventoryPage = () => {
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirm();

  const [tab, setTab] = useState("stock-groups");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [showAll, setShowAll] = useState(false);

  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");
  const [adding, setAdding] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const requestRef = useRef(0);
  const currentTab = TABS.find((t) => t.value === tab);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [q]);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setLoadError("");
    try {
      const res = await api.get(`/inventory/${tab}`, { params: { q: debouncedQ } });
      if (requestId !== requestRef.current) return;
      const next = Array.isArray(res.data) ? res.data : [];
      // Presets first, in their usual order; any older unit is listed after them.
      setRows(tab === "units" ? [...next].sort((a, b) => Number(PRESET_SYMBOLS.has(b.symbol)) - Number(PRESET_SYMBOLS.has(a.symbol))) : next);
    } catch (error) {
      if (requestId !== requestRef.current) return;
      const message = errorMessage(error, "Failed to load data");
      setRows([]);
      setLoadError(message);
      showToast(message, "error");
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [tab, debouncedQ, showToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setShowAll(false); }, [tab, debouncedQ]);

  const switchTab = (next) => {
    if (next === tab) return;
    setTab(next);
    setQ("");
    setDebouncedQ("");
    cancelEdit();
    setName("");
  };

  const duplicateName = useMemo(() => {
    const wanted = name.trim().toLowerCase();
    return Boolean(wanted) && rows.some((r) => String(r.name || "").toLowerCase() === wanted);
  }, [name, rows]);

  const visibleRows = showAll ? rows : rows.slice(0, ROW_LIMIT);

  const handleExport = () => {
    if (rows.length === 0) return showToast("No data to export", "error");
    const data = rows.map((row) => (tab === "units"
      ? { ID: row._id, Name: row.name, Symbol: row.symbol, Preset: PRESET_SYMBOLS.has(row.symbol) ? "Yes" : "No" }
      : { ID: row._id, Name: row.name }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, tab);
    XLSX.writeFile(workbook, `Inventory_${tab}_${isoToday()}.xlsx`);
    showToast("Excel file downloaded", "success");
  };

  const addRow = async (event) => {
    event.preventDefault();
    if (adding) return;
    const trimmed = name.trim();
    if (!trimmed) return showToast("Name is required", "error");
    if (duplicateName) return showToast(`${currentTab.singular} "${trimmed}" already exists`, "error");
    setAdding(true);
    try {
      await api.post(`/inventory/${tab}`, { name: trimmed });
      showToast(`${currentTab.singular} added`, "success");
      setName("");
      await load();
    } catch (error) {
      showToast(errorMessage(error, "Could not add"), "error");
    } finally {
      setAdding(false);
    }
  };

  const removeRow = async (row) => {
    const ok = await confirm({
      title: `Delete ${currentTab.singular.toLowerCase()}`,
      message: `Delete "${row.name}"? Records that already reference it may stop showing correctly. This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger"
    });
    if (!ok) return;
    setDeletingId(row._id);
    try {
      await api.delete(`/inventory/${tab}/${row._id}`);
      showToast("Deleted", "success");
      if (editingId === row._id) cancelEdit();
      await load();
    } catch (error) {
      showToast(errorMessage(error, "Delete failed"), "error");
    } finally {
      setDeletingId("");
    }
  };

  const startEdit = (row) => {
    setEditingId(row._id);
    setEditName(row.name || "");
  };

  function cancelEdit() {
    setEditingId("");
    setEditName("");
  }

  const saveEdit = async (id) => {
    if (savingId) return;
    const trimmed = editName.trim();
    if (!trimmed) return showToast("Name is required", "error");
    setSavingId(id);
    try {
      await api.put(`/inventory/${tab}/${id}`, { name: trimmed });
      showToast("Updated", "success");
      cancelEdit();
      await load();
    } catch (error) {
      showToast(errorMessage(error, "Update failed"), "error");
    } finally {
      setSavingId("");
    }
  };

  const onEditKeyDown = (event, id) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveEdit(id);
    } else if (event.key === "Escape") {
      cancelEdit();
    }
  };

  let body;
  if (loading && rows.length === 0) {
    body = <LoadingState label="Loading…" />;
  } else if (loadError) {
    body = <ErrorState message={loadError} onRetry={load} />;
  } else if (rows.length === 0) {
    body = (
      <EmptyState title={debouncedQ ? `No ${currentTab.label.toLowerCase()} match "${debouncedQ}"` : `No ${currentTab.label.toLowerCase()} yet`}>
        {debouncedQ ? "Try a different search." : currentTab.readOnly ? "Preset units appear once the Products page has been opened." : `Use the form above to add your first ${currentTab.singular.toLowerCase()}.`}
      </EmptyState>
    );
  } else {
    body = (
      <>
        <DataTable>
          <thead>
            <tr>
              <th scope="col">Name</th>
              {tab === "units" && <th scope="col">Status</th>}
              {!currentTab.readOnly && <th scope="col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const editing = editingId === row._id;
              const busy = savingId === row._id || deletingId === row._id;
              return (
                <tr key={row._id}>
                  <td>
                    {editing ? (
                      <input autoFocus aria-label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => onEditKeyDown(e, row._id)} />
                    ) : (
                      <strong>{row.name}{tab === "units" && row.symbol ? ` (${row.symbol})` : ""}</strong>
                    )}
                    <div className="page-subtitle">ID: {String(row._id).slice(-6).toUpperCase()}</div>
                  </td>
                  {tab === "units" && (
                    <td>
                      {PRESET_SYMBOLS.has(row.symbol)
                        ? <Badge variant="success">Preset</Badge>
                        : <Badge variant="warn" title="Products using it are hidden from kitchens until moved to a preset unit">Old unit, not offered</Badge>}
                    </td>
                  )}
                  {!currentTab.readOnly && (
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        {editing ? (
                          <>
                            <Button variant="success" size="sm" disabled={busy} onClick={() => saveEdit(row._id)} aria-label={`Save ${row.name}`} title="Save">
                              <Check size={14} /> {savingId === row._id ? "Saving…" : "Save"}
                            </Button>
                            <Button variant="ghost" size="sm" disabled={busy} onClick={cancelEdit} aria-label="Cancel editing" title="Cancel">
                              <X size={14} />
                            </Button>
                          </>
                        ) : (
                          <Button variant="ghost" size="sm" disabled={busy} onClick={() => startEdit(row)} aria-label={`Edit ${row.name}`} title="Edit">
                            <Edit3 size={14} />
                          </Button>
                        )}
                        <Button variant="danger" size="sm" disabled={busy} onClick={() => removeRow(row)} aria-label={`Delete ${row.name}`} title="Delete">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </DataTable>
        {!showAll && rows.length > ROW_LIMIT && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
            <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>Show all {rows.length}</Button>
          </div>
        )}
      </>
    );
  }

  const head = currentTab.readOnly ? (
    <p className="page-subtitle" style={{ margin: 0 }}>
      Products may only use these preset units, and kitchens record quantities in them with no conversion. Products are added and edited on the Products page.
    </p>
  ) : (
    <form onSubmit={addRow} style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end", flex: 1 }}>
      <Field label="Name">
        <input placeholder="Enter name..." value={name} onChange={(e) => setName(e.target.value)} aria-invalid={duplicateName || undefined} style={{ minWidth: 200 }} />
        {duplicateName && <span className="page-subtitle" role="status">Already exists</span>}
      </Field>
      <Button type="submit" variant="dark" disabled={adding}>
        <Plus size={16} /> {adding ? "Adding…" : `Add ${currentTab.singular}`}
      </Button>
    </form>
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader
        title="Inventory Setup"
        subtitle="Manage product groups, preset units and godown locations."
        actions={
          <>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Search size={14} aria-hidden="true" style={{ position: "absolute", left: 10, color: "var(--muted-soft)" }} />
              <input
                type="search" aria-label={`Search ${currentTab.label.toLowerCase()}`} placeholder="Search..."
                value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 30, width: 180 }}
              />
            </div>
            <Button variant="success" size="sm" onClick={handleExport} disabled={loading || rows.length === 0}>
              <FileSpreadsheet size={14} /> Export
            </Button>
          </>
        }
      >
        <Tabs label="Inventory categories" items={TABS} value={tab} onChange={switchTab} />
      </PageHeader>

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "20px 32px 28px" }}>
        <DetailPanel head={head}>
          <div style={{ paddingTop: 16 }}>{body}</div>
        </DetailPanel>
      </div>
      {dialog}
    </div>
  );
};
