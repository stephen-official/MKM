import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Edit3, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { useToast } from "../../useToast.js";
import { EmptyState, ErrorState } from "../../components/ui/index.jsx";

const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;

/**
 * One Settings list (units, pack names, groups) as glass rows, like Master data › Kitchens.
 * `load()` returns rows `{ id, title, sub?, pill?, canRename?, canDelete? }`. `addFields` are the add box's inputs;
 * `onAdd(values)`, `onRename(row, name)` and `onDelete(row)` (which asks for confirmation itself) do the work.
 */
export function SettingsList({ label, singular, load, addFields, onAdd, onRename, onDelete }) {
  const { showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [q, setQ] = useState("");
  const emptyValues = () => Object.fromEntries(addFields.map((f) => [f.key, ""]));
  const [values, setValues] = useState(emptyValues);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");
  const [busyId, setBusyId] = useState("");
  const requestRef = useRef(0);

  const reload = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setLoadError("");
    try {
      const next = await load();
      if (requestId === requestRef.current) setRows(next);
    } catch (error) {
      if (requestId === requestRef.current) { setRows([]); setLoadError(errorMessage(error, `Could not load the ${label.toLowerCase()}.`)); }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [load, label]);

  useEffect(() => { reload(); }, [reload]);

  const needle = q.trim().toLowerCase();
  const visible = needle ? rows.filter((r) => `${r.title} ${r.sub || ""}`.toLowerCase().includes(needle)) : rows;
  const ready = addFields.every((f) => !f.required || values[f.key].trim());

  const add = async (event) => {
    event.preventDefault();
    if (adding || !ready) return;
    // Already listed (by its name or short form)? Say so plainly instead of a database error.
    const wanted = values[addFields[0].key].trim().toLowerCase();
    const clash = rows.find((r) => [r.title, r.raw?.name, r.raw?.symbol].some((t) => String(t || "").toLowerCase() === wanted));
    if (clash) { showToast(`“${clash.title}” is already in the list.`, "error"); return; }
    setAdding(true);
    try {
      await onAdd(Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()])));
      showToast(`${singular} added`, "success");
      setValues(emptyValues());
      await reload();
    } catch (error) {
      showToast(errorMessage(error, "Could not add it."), "error");
    } finally {
      setAdding(false);
    }
  };

  const saveRename = async (row) => {
    if (busyId || !editName.trim()) return;
    setBusyId(row.id);
    try {
      await onRename(row, editName.trim());
      showToast("Renamed", "success");
      setEditingId("");
      await reload();
    } catch (error) {
      showToast(errorMessage(error, "Could not rename it."), "error");
    } finally {
      setBusyId("");
    }
  };

  const remove = async (row) => {
    setBusyId(row.id);
    try {
      if (await onDelete(row)) { showToast("Removed", "success"); await reload(); }
    } catch (error) {
      showToast(errorMessage(error, "Could not remove it."), "error");
    } finally {
      setBusyId("");
    }
  };

  let body;
  if (loading && rows.length === 0) body = <div className="kg-glass setup-state" role="status"><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Loading…</div>;
  else if (loadError) body = <ErrorState message={loadError} onRetry={reload} />;
  else if (visible.length === 0) body = <EmptyState className="kg-glass setup-state" title={needle ? `Nothing matches “${q.trim()}”` : `No ${label.toLowerCase()} yet`}>{needle ? "Try a different search." : "Use the box above to add one."}</EmptyState>;
  else {
    body = (
      <ul className="setup-rows" aria-label={label}>
        {visible.map((row) => {
          const editing = editingId === row.id;
          const busy = busyId === row.id;
          return (
            <li key={row.id} className={`kg-glass setup-row${editing ? " setup-row--editing" : ""}`}>
              {editing ? (
                <input className="setup-row__input" autoFocus aria-label="Name" value={editName} maxLength={60} onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveRename(row); } else if (e.key === "Escape") setEditingId(""); }} />
              ) : (
                <div className="setup-row__text"><strong>{row.title}</strong>{row.sub && <small>{row.sub}</small>}</div>
              )}
              {row.pill && !editing && <span className="kg-pill kg-pill--routine">{row.pill}</span>}
              {(row.canRename || row.canDelete) && (
                <div className="setup-row__actions">
                  {editing ? (
                    <>
                      <button type="button" className="kg-btn setup-row__save" disabled={busy} onClick={() => saveRename(row)}><Check size={15} aria-hidden="true" /> {busy ? "Saving…" : "Save"}</button>
                      <button type="button" className="kg-chip setup-row__icon" disabled={busy} onClick={() => setEditingId("")} aria-label="Cancel renaming" title="Cancel"><X size={16} aria-hidden="true" /></button>
                    </>
                  ) : row.canRename && (
                    <button type="button" className="kg-chip setup-row__icon" disabled={busy} onClick={() => { setEditingId(row.id); setEditName(row.title); }} aria-label={`Rename ${row.title}`} title="Rename"><Edit3 size={16} aria-hidden="true" /></button>
                  )}
                  {row.canDelete && !editing && (
                    <button type="button" className="kg-chip setup-row__icon setup-row__icon--danger" disabled={busy} onClick={() => remove(row)} aria-label={`Remove ${row.title}`} title="Remove"><Trash2 size={16} aria-hidden="true" /></button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <>
      <form className="kg-glass setup-add" onSubmit={add}>
        {addFields.map((f) => (
          <input key={f.key} className={`setup-add__input${f.narrow ? " setup-add__input--narrow" : ""}`} placeholder={f.placeholder} aria-label={f.placeholder}
            maxLength={f.maxLength} value={values[f.key]} onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))} />
        ))}
        <button type="submit" className="kg-btn" disabled={adding || !ready}><Plus size={16} aria-hidden="true" /> {adding ? "Adding…" : `Add ${singular.toLowerCase()}`}</button>
      </form>
      <label className="ks-search kg-float">
        <Search size={16} aria-hidden="true" />
        <input type="search" aria-label={`Search ${label.toLowerCase()}`} placeholder={`Search ${label.toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)} />
        {q && <button type="button" aria-label="Clear search" onClick={() => setQ("")}><X size={16} aria-hidden="true" /></button>}
      </label>
      <p className="setup-results" aria-live="polite"><strong>{visible.length}</strong> {label.toLowerCase()}</p>
      {body}
    </>
  );
}
