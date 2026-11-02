import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, Trash2, Edit3, Check, X, Loader2 } from "lucide-react";
import { api } from "../api.js";
import { useToast } from "../useToast.js";
import { PageHeader, EmptyState, ErrorState } from "../components/ui/index.jsx";
import { useConfirm } from "../components/ui/useConfirm.jsx";
import "./InventorySetup.css";

// Master data › Kitchens: the kitchens and the central store (stored as godowns; that word is not shown here).
// Product groups are managed from the product form, units are fixed presets, pack names live on the product form too.
const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;

export const InventoryPage = () => {
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirm();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [q, setQ] = useState("");

  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");
  const [adding, setAdding] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setLoadError("");
    try {
      const res = await api.get("/inventory/godowns");
      if (requestId !== requestRef.current) return;
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      if (requestId !== requestRef.current) return;
      const message = errorMessage(error, "Could not load the kitchens");
      setRows([]);
      setLoadError(message);
      showToast(message, "error");
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  // A short list: filter on the phone instead of asking the server.
  const needle = q.trim().toLowerCase();
  const visibleRows = needle ? rows.filter((r) => String(r.name || "").toLowerCase().includes(needle)) : rows;

  const duplicateName = useMemo(() => {
    const wanted = name.trim().toLowerCase();
    return Boolean(wanted) && rows.some((r) => String(r.name || "").toLowerCase() === wanted);
  }, [name, rows]);

  const addRow = async (event) => {
    event.preventDefault();
    if (adding) return;
    const trimmed = name.trim();
    if (!trimmed) return showToast("Name is required", "error");
    if (duplicateName) return showToast(`“${trimmed}” already exists`, "error");
    setAdding(true);
    try {
      await api.post("/inventory/godowns", { name: trimmed });
      showToast("Kitchen added", "success");
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
      title: `Delete “${row.name}”?`,
      message: "Only a kitchen with no users, stock, usage, orders or requests can be deleted. This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger"
    });
    if (!ok) return;
    setDeletingId(row._id);
    try {
      await api.delete(`/inventory/godowns/${row._id}`);
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
      await api.put(`/inventory/godowns/${id}`, { name: trimmed });
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
  } else if (visibleRows.length === 0) {
    body = (
      <EmptyState className="kg-glass setup-state" title={needle ? `No kitchen matches “${q.trim()}”` : "No kitchens yet"}>
        {needle ? "Try a different search." : "Use the box above to add the first kitchen."}
      </EmptyState>
    );
  } else {
    body = (
      <ul className="setup-rows" aria-label="Kitchens">
        {visibleRows.map((row) => {
          const editing = editingId === row._id;
          const busy = savingId === row._id || deletingId === row._id;
          return (
            <li key={row._id} className={`kg-glass setup-row${editing ? " setup-row--editing" : ""}`}>
              {editing ? (
                <input className="setup-row__input" autoFocus aria-label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => onEditKeyDown(e, row._id)} />
              ) : (
                <div className="setup-row__text"><strong>{row.name}</strong></div>
              )}
              <div className="setup-row__actions">
                {editing ? (
                  <>
                    <button type="button" className="kg-btn setup-row__save" disabled={busy} onClick={() => saveEdit(row._id)} aria-label={`Save ${row.name}`}>
                      <Check size={15} aria-hidden="true" /> {savingId === row._id ? "Saving…" : "Save"}
                    </button>
                    <button type="button" className="kg-chip setup-row__icon" disabled={busy} onClick={cancelEdit} aria-label="Cancel editing" title="Cancel"><X size={16} aria-hidden="true" /></button>
                  </>
                ) : (
                  <button type="button" className="kg-chip setup-row__icon" disabled={busy} onClick={() => startEdit(row)} aria-label={`Rename ${row.name}`} title="Rename"><Edit3 size={16} aria-hidden="true" /></button>
                )}
                <button type="button" className="kg-chip setup-row__icon setup-row__icon--danger" disabled={busy} onClick={() => removeRow(row)} aria-label={`Delete ${row.name}`} title="Delete"><Trash2 size={16} aria-hidden="true" /></button>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="setup-shell">
      <PageHeader title="Kitchens" subtitle="Every school kitchen and the central store." />
      <div className="setup-page">
        <label className="ks-search kg-float">
          <Search size={16} aria-hidden="true" />
          <input type="search" aria-label="Search kitchens" placeholder="Search kitchens" value={q} onChange={(e) => setQ(e.target.value)} />
          {q && <button type="button" aria-label="Clear search" onClick={() => setQ("")}><X size={16} aria-hidden="true" /></button>}
        </label>
        <form className="kg-glass setup-add" onSubmit={addRow}>
          <input className="setup-add__input" placeholder="New kitchen name" aria-label="New kitchen name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={duplicateName || undefined} />
          {duplicateName && <span className="setup-add__dup" role="status">Already exists</span>}
          <button type="submit" className="kg-btn" disabled={adding || !name.trim() || duplicateName}>
            <Plus size={16} aria-hidden="true" /> {adding ? "Adding…" : "Add kitchen"}
          </button>
        </form>
        <p className="setup-results" aria-live="polite"><strong>{visibleRows.length}</strong> {visibleRows.length === 1 ? "kitchen" : "kitchens"}{needle ? ` matching “${q.trim()}”` : ""}</p>
        {body}
      </div>
      {dialog}
    </div>
  );
};
