import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Search, FileSpreadsheet, Plus, Trash2, Edit3, Layers, MapPin, Ruler, Check, X, Loader2, Boxes } from "lucide-react";
import { isPresetPackName } from "./products/productForm.js";
import { api } from "../api.js";
import { useToast } from "../useToast.js";
import { PageHeader, Button, EmptyState, ErrorState, Tabs } from "../components/ui/index.jsx";
import { useConfirm } from "../components/ui/useConfirm.jsx";
import "./InventorySetup.css";

// Products have their own page (ProductsPage.jsx); units are a fixed preset list, shown here read-only.
const TABS = [
  { value: "stock-groups", label: "Product groups", singular: "Product group", icon: <Layers size={14} />, hint: "Every product belongs to one group; the kitchen app arranges its stock list by them. “Other” is always there for products that fit nowhere else." },
  { value: "units", label: "Units", singular: "Unit", icon: <Ruler size={14} />, readOnly: true, hint: "Products may only use these preset units, and kitchens record quantities in them with no conversion." },
  { value: "godowns", label: "Godowns", singular: "Godown", icon: <MapPin size={14} />, hint: "The kitchens and the central store. A godown cannot be deleted while anything still points at it." },
  // Custom pack names typed into product forms (Bag, Box/Carton, Can, Tub and Packet are built in). Deleting one removes its packs from every product.
  { value: "pack-types", label: "Pack types", singular: "Pack type", icon: <Boxes size={14} />, packTypes: true, hint: "Pack names typed in on product forms, besides the built-in Bag, Box/Carton, Can, Tub and Packet. Deleting one removes that pack from every product that has it." }
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
      if (tab === "pack-types") {
        const { data } = await api.get("/products");
        if (requestId !== requestRef.current) return;
        const counts = new Map();
        (data.items || []).forEach((p) => (p.packs || []).forEach((pack) => {
          const name = String(pack.name || "").trim();
          if (name && !isPresetPackName(name)) counts.set(name, (counts.get(name) || 0) + 1);
        }));
        const needle = debouncedQ.toLowerCase();
        setRows([...counts].filter(([name]) => !needle || name.toLowerCase().includes(needle)).sort((a, b) => a[0].localeCompare(b[0]))
          .map(([name, products]) => ({ _id: name, name, products })));
        return;
      }
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

  const removePackType = async (row) => {
    let affected = [];
    try {
      const { data } = await api.get("/products/pack-types/usage", { params: { name: row.name } });
      affected = data.products || [];
    } catch (error) {
      return showToast(errorMessage(error, "Could not check which products use it."), "error");
    }
    const disabled = affected.filter((p) => p.disabled);
    const ok = await confirm({
      title: `Delete pack type “${row.name}”?`,
      message: affected.length === 0
        ? "No product uses it any more. It will just disappear from the list."
        : `Its packs are removed from ${affected.length === 1 ? "1 product" : `${affected.length} products`}: ${affected.map((p) => p.name).join(", ")}.${disabled.length ? ` ${disabled.length === 1 ? "One of them is" : `${disabled.length} of them are`} left with no pack and will be hidden from kitchens until a pack is added.` : ""} Past orders keep their own copy of the pack.`,
      confirmLabel: "Delete pack type",
      variant: "danger"
    });
    if (!ok) return;
    setDeletingId(row._id);
    try {
      await api.post("/products/pack-types/remove", { name: row.name });
      showToast("Pack type deleted", "success");
      await load();
    } catch (error) {
      showToast(errorMessage(error, "Delete failed"), "error");
    } finally {
      setDeletingId("");
    }
  };

  const removeRow = async (row) => {
    if (currentTab.packTypes) return removePackType(row);
    const ok = await confirm({
      title: `Delete ${currentTab.singular.toLowerCase()} “${row.name}”?`,
      message: tab === "godowns"
        ? "Only a godown nothing points at can be deleted. This cannot be undone."
        : "Only a group with no products in it can be deleted. This cannot be undone.",
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
    body = <div className="kg-glass setup-state" role="status"><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Loading…</div>;
  } else if (loadError) {
    body = <ErrorState message={loadError} onRetry={load} />;
  } else if (rows.length === 0) {
    body = (
      <EmptyState className="kg-glass setup-state" title={debouncedQ ? `No ${currentTab.label.toLowerCase()} match “${debouncedQ}”` : `No ${currentTab.label.toLowerCase()} yet`}>
        {debouncedQ ? "Try a different search." : currentTab.readOnly ? "Preset units appear once the Products page has been opened." : currentTab.packTypes ? "Custom pack names appear here once a product form uses one." : `Use the box above to add the first ${currentTab.singular.toLowerCase()}.`}
      </EmptyState>
    );
  } else {
    body = (
      <>
        <ul className="setup-rows" aria-label={currentTab.label}>
          {visibleRows.map((row) => {
            const editing = editingId === row._id;
            const busy = savingId === row._id || deletingId === row._id;
            const preset = tab === "units" && PRESET_SYMBOLS.has(row.symbol);
            const builtIn = tab === "stock-groups" && String(row.name).trim().toLowerCase() === "other";
            return (
              <li key={row._id} className={`kg-glass setup-row${editing ? " setup-row--editing" : ""}`}>
                {editing ? (
                  <input className="setup-row__input" autoFocus aria-label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => onEditKeyDown(e, row._id)} />
                ) : (
                  <div className="setup-row__text">
                    <strong>{row.name}</strong>
                    {tab === "units" && row.symbol && <small>{row.symbol}</small>}
                    {currentTab.packTypes && <small>used by {row.products} {row.products === 1 ? "product" : "products"}</small>}
                  </div>
                )}
                {builtIn && <span className="kg-pill kg-pill--routine" title="Always there for products that fit nowhere else; it cannot be renamed or deleted">Built in</span>}
                {tab === "units" && (
                  preset
                    ? <span className="kg-pill kg-pill--ok">Preset</span>
                    : <span className="kg-pill kg-pill--soon" title="Products using it are hidden from kitchens until moved to a preset unit">Old unit, not offered</span>
                )}
                {!currentTab.readOnly && !builtIn && (
                  <div className="setup-row__actions">
                    {currentTab.packTypes ? null : editing ? (
                      <>
                        <button type="button" className="kg-btn setup-row__save" disabled={busy} onClick={() => saveEdit(row._id)} aria-label={`Save ${row.name}`}>
                          <Check size={15} aria-hidden="true" /> {savingId === row._id ? "Saving…" : "Save"}
                        </button>
                        <button type="button" className="kg-chip setup-row__icon" disabled={busy} onClick={cancelEdit} aria-label="Cancel editing" title="Cancel"><X size={16} aria-hidden="true" /></button>
                      </>
                    ) : (
                      <button type="button" className="kg-chip setup-row__icon" disabled={busy} onClick={() => startEdit(row)} aria-label={`Edit ${row.name}`} title="Edit"><Edit3 size={16} aria-hidden="true" /></button>
                    )}
                    <button type="button" className="kg-chip setup-row__icon setup-row__icon--danger" disabled={busy} onClick={() => removeRow(row)} aria-label={`Delete ${row.name}`} title="Delete"><Trash2 size={16} aria-hidden="true" /></button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {!showAll && rows.length > ROW_LIMIT && (
          <div className="setup-more"><button type="button" className="kg-chip" onClick={() => setShowAll(true)}>Show all {rows.length}</button></div>
        )}
      </>
    );
  }

  return (
    <div className="setup-shell">
      <PageHeader
        title="Groups & godowns"
        subtitle="Product groups, the preset units, and the godowns (kitchens and the central store)."
        actions={(
          <Button variant="ghost" size="sm" onClick={handleExport} disabled={loading || rows.length === 0}>
            <FileSpreadsheet size={14} aria-hidden="true" /> Export
          </Button>
        )}
      />
      <div className="setup-page">
        <Tabs label="Setup sections" items={TABS} value={tab} onChange={switchTab} />
        <p className="setup-hint">{currentTab.hint}</p>
        <label className="ks-search kg-float">
          <Search size={16} aria-hidden="true" />
          <input type="search" aria-label={`Search ${currentTab.label.toLowerCase()}`} placeholder={`Search ${currentTab.label.toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)} />
          {q && <button type="button" aria-label="Clear search" onClick={() => setQ("")}><X size={16} aria-hidden="true" /></button>}
        </label>
        {!currentTab.readOnly && !currentTab.packTypes && (
          <form className="kg-glass setup-add" onSubmit={addRow}>
            <input className="setup-add__input" placeholder={`New ${currentTab.singular.toLowerCase()} name`} aria-label={`New ${currentTab.singular.toLowerCase()} name`} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={duplicateName || undefined} />
            {duplicateName && <span className="setup-add__dup" role="status">Already exists</span>}
            <button type="submit" className="kg-btn" disabled={adding || !name.trim() || duplicateName}>
              <Plus size={16} aria-hidden="true" /> {adding ? "Adding…" : `Add ${currentTab.singular.toLowerCase()}`}
            </button>
          </form>
        )}
        <p className="setup-results" aria-live="polite"><strong>{rows.length}</strong> {rows.length === 1 ? currentTab.singular.toLowerCase() : currentTab.label.toLowerCase()}{debouncedQ ? ` matching “${debouncedQ}”` : ""}</p>
        {body}
      </div>
      {dialog}
    </div>
  );
};
