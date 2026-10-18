import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Search, FileSpreadsheet, Plus, Trash2, Edit3, Package, Layers, MapPin, Ruler, Upload, Loader2, Check, X } from "lucide-react";
import { api } from "../api.js";
import { useToast } from "../useToast.js";
import {
  PageHeader, Button, Badge, Field, EmptyState, ErrorState, LoadingState,
  DataTable, Tabs, DetailPanel, Select
} from "../components/ui/index.jsx";
import { useConfirm } from "../components/ui/useConfirm.jsx";

const TABS = [
  { value: "stock-groups", label: "Stock Groups", singular: "Stock Group", icon: <Layers size={14} /> },
  { value: "units", label: "Units & Sub-units", singular: "Unit", icon: <Ruler size={14} /> },
  { value: "stock-items", label: "Stock Items", singular: "Stock Item", icon: <Package size={14} /> },
  { value: "godowns", label: "Godowns", singular: "Godown", icon: <MapPin size={14} /> }
];

const ITEM_TYPES = [
  { value: "stock", label: "Stock Item" },
  { value: "daily_use", label: "Daily Use Item" }
];

const ROW_LIMIT = 100;

const EMPTY_FORM = { name: "", symbol: "", stockGroupId: "", subName: "", factor: "", imageUrl: "", unitId: "", itemType: "stock" };
const EMPTY_EDIT = { name: "", symbol: "", stockGroupId: "", unitId: "", itemType: "stock", file: null };

const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;
const isoToday = () => new Date().toISOString().split("T")[0];
const itemTypeLabel = (type) => (type === "daily_use" ? "Daily Use" : "Stock Item");

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

  const [form, setForm] = useState(EMPTY_FORM);
  const [meta, setMeta] = useState({ stockGroups: [], units: [] });
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [uploading, setUploading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const fileInputRef = useRef(null);
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
      setRows(Array.isArray(res.data) ? res.data : []);
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

  const refreshMeta = useCallback(async () => {
    try {
      const [groupsRes, unitsRes] = await Promise.all([
        api.get("/inventory/stock-groups"),
        api.get("/inventory/units")
      ]);
      const units = unitsRes.data || [];
      setMeta({ stockGroups: groupsRes.data || [], units });
      setForm((prev) => (prev.unitId || !units[0] ? prev : { ...prev, unitId: units[0]._id }));
    } catch (error) {
      showToast(errorMessage(error, "Failed to load groups and units"), "error");
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { refreshMeta(); }, [refreshMeta]);
  useEffect(() => { setShowAll(false); }, [tab, debouncedQ]);

  const switchTab = (next) => {
    if (next === tab) return;
    setTab(next);
    setQ("");
    setDebouncedQ("");
    setEditingId("");
    setEditForm(EMPTY_EDIT);
    setForm({ ...EMPTY_FORM, unitId: meta.units[0]?._id || "" });
  };

  const duplicateName = useMemo(() => {
    const name = form.name.trim().toLowerCase();
    return Boolean(name) && rows.some((r) => String(r.name || "").toLowerCase() === name);
  }, [form.name, rows]);

  const visibleRows = showAll ? rows : rows.slice(0, ROW_LIMIT);

  const handleExport = () => {
    if (rows.length === 0) return showToast("No data to export", "error");

    const data = rows.map((row) => {
      const base = { ID: row._id, Name: row.name };
      if (tab === "units") return { ...base, Symbol: row.symbol, Group: row.stockGroupId?.name || "Unassigned" };
      if (tab === "stock-items") {
        return {
          ...base,
          Unit: row.unitId?.symbol || "N/A",
          Group: row.stockGroupId?.name || "Unassigned",
          StockType: itemTypeLabel(row.itemType),
          Threshold: row.defaultThreshold || 0
        };
      }
      return base;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, tab);
    XLSX.writeFile(workbook, `Inventory_${tab}_${isoToday()}.xlsx`);
    showToast("Excel file downloaded", "success");
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await api.post("/inventory/stock-items/upload-image", formData);
      setForm((prev) => ({ ...prev, imageUrl: res.data.imageUrl }));
      showToast("Image uploaded successfully", "success");
    } catch (error) {
      showToast(errorMessage(error, "Image upload failed"), "error");
    } finally {
      setUploading(false);
    }
  };

  const addRow = async (event) => {
    event.preventDefault();
    if (adding || uploading) return;

    const name = form.name.trim();
    if (!name) return showToast("Name is required", "error");
    if (duplicateName) return showToast(`${currentTab.singular} "${name}" already exists`, "error");
    if (tab === "units" && !form.symbol.trim()) return showToast("Symbol is required for a unit", "error");
    if (tab === "units" && form.subName.trim() && !(Number(form.factor) > 0)) {
      return showToast("Enter a sub-unit factor greater than zero", "error");
    }
    if (tab === "stock-items" && !form.stockGroupId) return showToast("Choose a stock group", "error");
    if (tab === "stock-items" && !form.unitId) return showToast("Choose a unit (add one under Units first)", "error");

    let payload;
    if (tab === "units") {
      payload = {
        name,
        symbol: form.symbol.trim(),
        subUnits: form.subName.trim() ? [{ name: form.subName.trim(), factorToBase: Number(form.factor) }] : []
      };
    } else if (tab === "stock-items") {
      payload = {
        name,
        imageUrl: form.imageUrl,
        stockGroupId: form.stockGroupId,
        unitId: form.unitId,
        defaultThreshold: 0,
        itemType: form.itemType
      };
    } else {
      payload = { name };
    }

    setAdding(true);
    try {
      await api.post(`/inventory/${tab}`, payload);
      showToast(`${currentTab.singular} added`, "success");
      setForm({ ...EMPTY_FORM, unitId: meta.units[0]?._id || "" });
      await Promise.all([load(), refreshMeta()]);
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
      await Promise.all([load(), refreshMeta()]);
    } catch (error) {
      showToast(errorMessage(error, "Delete failed"), "error");
    } finally {
      setDeletingId("");
    }
  };

  const startEdit = (row) => {
    setEditingId(row._id);
    setEditForm({
      name: row.name || "",
      symbol: row.symbol || "",
      stockGroupId: row.stockGroupId?._id || "",
      unitId: row.unitId?._id || "",
      itemType: row.itemType || "stock",
      file: null
    });
  };

  function cancelEdit() {
    setEditingId("");
    setEditForm(EMPTY_EDIT);
  }

  const saveEdit = async (id) => {
    if (savingId) return;
    const name = editForm.name.trim();
    if (!name) return showToast("Name is required", "error");
    if (tab === "units" && !editForm.symbol.trim()) return showToast("Symbol is required for a unit", "error");
    if (tab === "stock-items" && (!editForm.stockGroupId || !editForm.unitId)) {
      return showToast("Stock group and unit are required", "error");
    }

    setSavingId(id);
    try {
      if (tab === "stock-items") {
        // Stock-item edits may include a new image, so the request is multipart.
        const formData = new FormData();
        formData.append("name", name);
        formData.append("itemType", editForm.itemType);
        formData.append("stockGroupId", editForm.stockGroupId);
        formData.append("unitId", editForm.unitId);
        if (editForm.file) formData.append("image", editForm.file);
        await api.put(`/inventory/${tab}/${id}`, formData);
      } else if (tab === "units") {
        await api.put(`/inventory/${tab}/${id}`, { name, symbol: editForm.symbol.trim() });
      } else {
        await api.put(`/inventory/${tab}/${id}`, { name });
      }
      showToast("Updated", "success");
      cancelEdit();
      await Promise.all([load(), refreshMeta()]);
    } catch (error) {
      showToast(errorMessage(error, "Update failed"), "error");
    } finally {
      setSavingId("");
    }
  };

  const onEditKeyDown = (event, id) => {
    if (event.key === "Enter" && event.target.type !== "file") {
      event.preventDefault();
      saveEdit(id);
    } else if (event.key === "Escape") {
      cancelEdit();
    }
  };

  const setEdit = (field) => (e) => setEditForm((prev) => ({ ...prev, [field]: e.target.value }));
  const setAdd = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const hasDetailsColumn = tab === "units" || tab === "stock-items";

  const renderEditor = (row) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 200 }} onKeyDown={(e) => onEditKeyDown(e, row._id)}>
      <input autoFocus aria-label="Name" placeholder="Name" value={editForm.name} onChange={setEdit("name")} />
      {tab === "units" && (
        <input aria-label="Symbol" placeholder="Symbol" value={editForm.symbol} onChange={setEdit("symbol")} />
      )}
      {tab === "stock-items" && (
        <>
          <Select aria-label="Stock group" value={editForm.stockGroupId} onChange={setEdit("stockGroupId")}>
            <option value="">Select group...</option>
            {meta.stockGroups.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
          </Select>
          <Select aria-label="Unit" value={editForm.unitId} onChange={setEdit("unitId")}>
            <option value="">Select unit...</option>
            {meta.units.map((u) => <option key={u._id} value={u._id}>{u.symbol}</option>)}
          </Select>
          <Select aria-label="Item type" value={editForm.itemType} onChange={setEdit("itemType")}>
            {ITEM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <input
            type="file" accept="image/*" aria-label="Replace image"
            onChange={(e) => setEditForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
          />
        </>
      )}
    </div>
  );

  let body;
  if (loading && rows.length === 0) {
    body = <LoadingState label="Loading…" />;
  } else if (loadError) {
    body = <ErrorState message={loadError} onRetry={load} />;
  } else if (rows.length === 0) {
    body = (
      <EmptyState title={debouncedQ ? `No ${currentTab.label.toLowerCase()} match "${debouncedQ}"` : `No ${currentTab.label.toLowerCase()} yet`}>
        {debouncedQ ? "Try a different search." : `Use the form above to add your first ${currentTab.singular.toLowerCase()}.`}
      </EmptyState>
    );
  } else {
    body = (
      <>
        <DataTable>
          <thead>
            <tr>
              <th scope="col">Name</th>
              {hasDetailsColumn && <th scope="col">Details</th>}
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const editing = editingId === row._id;
              const busy = savingId === row._id || deletingId === row._id;
              return (
                <tr key={row._id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {tab === "stock-items" && (
                        <div style={{ width: 40, height: 40, flex: "none", background: "var(--bg-subtle)", borderRadius: "var(--radius)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid var(--border)" }}>
                          {row.imageUrl
                            ? <img src={row.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                            : <Package size={20} aria-hidden="true" color="var(--border-strong)" />}
                        </div>
                      )}
                      <div>
                        {editing ? renderEditor(row) : (
                          <strong>{row.name}{tab === "units" && row.symbol ? ` (${row.symbol})` : ""}</strong>
                        )}
                        <div className="page-subtitle">ID: {String(row._id).slice(-6).toUpperCase()}</div>
                      </div>
                    </div>
                  </td>

                  {tab === "stock-items" && (
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <Badge variant="info">Unit: {row.unitId?.symbol || "No unit"}</Badge>
                        <Badge>Group: {row.stockGroupId?.name || "Unassigned"}</Badge>
                        <Badge variant="success">{itemTypeLabel(row.itemType)}</Badge>
                      </div>
                    </td>
                  )}
                  {tab === "units" && (
                    <td>
                      {(row.subUnits || []).length > 0
                        ? row.subUnits.map((s, i) => <Badge key={s._id || i}>{s.name} = {s.factorToBase} {row.symbol}</Badge>)
                        : <span className="page-subtitle">No sub-units</span>}
                    </td>
                  )}

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

  const addForm = (
    <form onSubmit={addRow} style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end", flex: 1 }}>
      <Field label="Name">
        <input
          placeholder="Enter name..." value={form.name} onChange={setAdd("name")}
          aria-invalid={duplicateName || undefined} style={{ minWidth: 200 }}
        />
        {duplicateName && <span className="page-subtitle" role="status">Already exists</span>}
      </Field>

      {tab === "stock-items" && (
        <>
          <Field label="Stock group">
            <Select value={form.stockGroupId} onChange={setAdd("stockGroupId")}>
              <option value="">Select group...</option>
              {meta.stockGroups.map((sg) => <option key={sg._id} value={sg._id}>{sg.name}</option>)}
            </Select>
          </Field>
          <Field label="Item type">
            <Select value={form.itemType} onChange={setAdd("itemType")}>
              {ITEM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </Field>
          <Field label="Unit">
            <Select value={form.unitId} onChange={setAdd("unitId")}>
              {meta.units.length === 0 && <option value="">No units yet</option>}
              {meta.units.map((u) => <option key={u._id} value={u._id}>{u.symbol}</option>)}
            </Select>
          </Field>
          <div className="field">
            <span className="field__label">Image</span>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} aria-label="Item image" />
            <Button variant={form.imageUrl ? "success" : "ghost"} disabled={uploading} onClick={() => fileInputRef.current?.click()}>
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? "Uploading…" : form.imageUrl ? "Uploaded" : "Choose file"}
            </Button>
          </div>
        </>
      )}

      {tab === "units" && (
        <>
          <Field label="Symbol">
            <input placeholder="e.g. Kg" value={form.symbol} onChange={setAdd("symbol")} style={{ width: 100 }} />
          </Field>
          <Field label="Sub-unit (optional)">
            <input placeholder="e.g. Gram" value={form.subName} onChange={setAdd("subName")} style={{ width: 130 }} />
          </Field>
          <Field label="Factor to base">
            <input
              type="number" min="0" step="any" placeholder="e.g. 0.001"
              value={form.factor} onChange={setAdd("factor")} disabled={!form.subName.trim()} style={{ width: 110 }}
            />
          </Field>
        </>
      )}

      <Button type="submit" variant="dark" disabled={adding || uploading}>
        <Plus size={16} /> {adding ? "Adding…" : `Add ${currentTab.singular}`}
      </Button>
    </form>
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader
        title="Inventory Setup"
        subtitle="Manage stock items, groups, units and godown locations."
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
        <DetailPanel head={addForm}>
          <div style={{ paddingTop: 16 }}>{body}</div>
        </DetailPanel>
      </div>
      {dialog}
    </div>
  );
};
