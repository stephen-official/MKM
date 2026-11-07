import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
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


  const toggle = (id) => setOpen((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const kitchenAdded = async (kitchen, { notes, users: added }) => {
    setAdding(false);
    const what = added ? `${kitchen.name} added with ${added} ${added === 1 ? "user" : "users"}` : `${kitchen.name} added`;
    if (notes.length) showToast(`${what}, but ${notes.join("; ")}. You can finish this from its card.`, "error");
    else showToast(what, "success");
    await Promise.all([load(), loadUsers()]);
    setOpen((prev) => new Set(prev).add(kitchen._id)); // open it, ready for the people who sign in there
  };

  let body;
  if (loading && kitchens.length === 0) body = <div className="kg-glass setup-state" role="status"><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Loading…</div>;
  else if (loadError) body = <ErrorState message={loadError} onRetry={load} />;
  else if (kitchens.length === 0) body = <EmptyState className="kg-glass setup-state" title="No kitchens yet">Use Add kitchen to add the first one.</EmptyState>;
  else {
    body = (
      <ul className="kp-cards" aria-label="Kitchens">
        {kitchens.map((k) => (
          <KitchenCard key={k._id} kitchen={k} kitchens={kitchens} users={usersByKitchen.get(String(k._id)) || []} canManageUsers={canManageUsers}
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
        <p className="setup-results" aria-live="polite"><strong>{kitchens.length}</strong> {kitchens.length === 1 ? "kitchen" : "kitchens"}</p>
        {body}
      </div>
      {adding && <AddKitchenDialog existingNames={kitchens.map((k) => k.name)} canManageUsers={canManageUsers} onClose={() => setAdding(false)} onAdded={kitchenAdded} />}
      {dialog}
    </div>
  );
};
