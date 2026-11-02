import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import { api } from "../api.js";
import { useToast } from "../useToast.js";
import { Button, PageHeader, EmptyState, ErrorState } from "../components/ui/index.jsx";
import { useConfirm } from "../components/ui/useConfirm.jsx";
import { KitchenCard } from "./kitchens/KitchenCard.jsx";
import { AddKitchenDialog } from "./kitchens/AddKitchenDialog.jsx";
import "./InventorySetup.css";
import "./kitchens/kitchens.css";

// Master data › Kitchens: every kitchen and the central store (stored as godowns; that word is not shown here) as a fold-out
// card. Opened: the logo (shown in the kitchen app), the name, and for super-admins the people who sign in there, their
// passwords and their details — the one place to manage kitchen users.
const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;

export const InventoryPage = ({ canManageUsers = false }) => {
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirm();

  const [kitchens, setKitchens] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(() => new Set());
  const [adding, setAdding] = useState(false); // the Add kitchen popup is open
  const requestRef = useRef(0);

  const loadUsers = useCallback(async () => {
    if (!canManageUsers) return;
    try {
      const { data } = await api.get("/users", { params: { role: "user", pageSize: "all" } });
      setUsers(data.items || []);
    } catch (error) {
      showToast(errorMessage(error, "Could not load the kitchen users."), "error");
    }
  }, [canManageUsers, showToast]);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setLoadError("");
    try {
      const res = await api.get("/inventory/godowns");
      if (requestId !== requestRef.current) return;
      setKitchens(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      if (requestId !== requestRef.current) return;
      setKitchens([]);
      setLoadError(errorMessage(error, "Could not load the kitchens"));
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); loadUsers(); }, [load, loadUsers]);

  const usersByKitchen = useMemo(() => {
    const map = new Map();
    users.forEach((u) => { const key = String(u.godownId || ""); map.set(key, [...(map.get(key) || []), u]); });
    return map;
  }, [users]);

  // Search finds a kitchen by its name or by the name or email of someone who signs in there.
  const needle = q.trim().toLowerCase();
  const visible = needle
    ? kitchens.filter((k) => k.name.toLowerCase().includes(needle) || (usersByKitchen.get(String(k._id)) || []).some((u) => `${u.name} ${u.email}`.toLowerCase().includes(needle)))
    : kitchens;

  const toggle = (id) => setOpen((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const kitchenAdded = async (kitchen, { logoFailed }) => {
    setAdding(false);
    showToast(logoFailed ? "Kitchen added, but the logo did not upload. Add it from its card." : "Kitchen added", logoFailed ? "error" : "success");
    setQ("");
    await load();
    setOpen((prev) => new Set(prev).add(kitchen._id)); // open it, ready for the people who sign in there
  };

  let body;
  if (loading && kitchens.length === 0) body = <div className="kg-glass setup-state" role="status"><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Loading…</div>;
  else if (loadError) body = <ErrorState message={loadError} onRetry={load} />;
  else if (visible.length === 0) body = <EmptyState className="kg-glass setup-state" title={needle ? `Nothing matches “${q.trim()}”` : "No kitchens yet"}>{needle ? "Try a different search." : "Use Add kitchen to add the first one."}</EmptyState>;
  else {
    body = (
      <ul className="kp-cards" aria-label="Kitchens">
        {visible.map((k) => (
          <KitchenCard key={k._id} kitchen={k} users={usersByKitchen.get(String(k._id)) || []} canManageUsers={canManageUsers}
            open={open.has(k._id)} onToggle={() => toggle(k._id)} onChanged={load} onUsersChanged={loadUsers} confirm={confirm} />
        ))}
      </ul>
    );
  }

  return (
    <div className="setup-shell">
      <PageHeader
        title="Kitchens"
        subtitle={canManageUsers ? "Every school kitchen and the central store. Open one to change its logo and name, and the people who sign in there." : "Every school kitchen and the central store. Open one to change its logo and name."}
        actions={<Button onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" /> Add kitchen</Button>}
      />
      <div className="setup-page">
        <label className="ks-search kg-float">
          <Search size={16} aria-hidden="true" />
          <input type="search" aria-label="Search kitchens" placeholder={canManageUsers ? "Search kitchens or people" : "Search kitchens"} value={q} onChange={(e) => setQ(e.target.value)} />
          {q && <button type="button" aria-label="Clear search" onClick={() => setQ("")}><X size={16} aria-hidden="true" /></button>}
        </label>
        <p className="setup-results" aria-live="polite"><strong>{visible.length}</strong> {visible.length === 1 ? "kitchen" : "kitchens"}{needle ? ` matching “${q.trim()}”` : ""}</p>
        {body}
      </div>
      {adding && <AddKitchenDialog existingNames={kitchens.map((k) => k.name)} onClose={() => setAdding(false)} onAdded={kitchenAdded} />}
      {dialog}
    </div>
  );
};
