import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { api } from "../../api.js";
import { useToast } from "../../useToast.js";
import { Button, EmptyState, ErrorState, PageHeader } from "../../components/ui/index.jsx";
import { useConfirm } from "../../components/ui/useConfirm.jsx";
import { PlanningCard } from "./PlanningCard.jsx";
import { KitchenItemsEditor } from "./KitchenItemsEditor.jsx";
import { NewOrderDialog } from "./NewOrderDialog.jsx";
import { ClosingTimeDialog } from "./ClosingTimeDialog.jsx";
import { orderTitle, planningOrders } from "./planning.js";
import "../InventorySetup.css";
import "../kitchens/kitchens.css";
import "./planning.css";

const BASE = "/procurement/collaborative-purchase-orders";
const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;
const fetchStatus = (status) => api.get(BASE, { params: { status, limit: 100 } }).then((res) => res.data.items || []);

/**
 * Purchasing › Planning: every kitchen order still being gathered (open, or closed and waiting for approval) as a card,
 * the soonest needed first. Approving, buying and dispatching stay in Orders & receiving.
 */
export function PlanningPage({ superAdmin = false }) {
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirm();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [open, setOpen] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [products, setProducts] = useState([]); // for adding items (new orders; super-admins changing a kitchen's items)
  const [starting, setStarting] = useState(false); // the New order popup is open
  const [closingFor, setClosingFor] = useState(null); // the order whose closing time is being changed
  // { order, share } whose items the super-admin is changing. The popup lives here, not in the card: the card's glass
  // (backdrop-filter) would trap its fixed position.
  const [editing, setEditing] = useState(null);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    try {
      const [gathering, closed] = await Promise.all([fetchStatus("open"), fetchStatus("closed")]);
      if (requestId !== requestRef.current) return;
      setOrders(planningOrders([...gathering, ...closed]));
      setLoadError("");
    } catch (error) {
      if (requestId === requestRef.current) setLoadError(errorMessage(error, "Could not load the orders."));
    } finally {
      if (requestId === requestRef.current) { setLoading(false); setNow(new Date()); }
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get("/inventory/stock-items")
      .then((res) => setProducts((res.data || []).filter((p) => !p.archived).map((p) => ({ ...p, stockGroup: p.stockGroupId?.name || "" }))))
      .catch(() => setProducts([]));
  }, []);
  // "Closes in …" counts down; an order whose time runs out moves to Closed on the next load.
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(timer); }, []);

  const toggle = (id) => setOpen((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const closeNow = async (order) => {
    if (busy) return;
    const ok = await confirm({
      title: "Close this order now?",
      message: "No kitchen will be able to join it or change its items. This cannot be undone.",
      confirmLabel: "Close now",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.patch(`${BASE}/${order._id}/status`, { status: "closed" });
      showToast("Order closed", "success");
    } catch (error) {
      showToast(errorMessage(error, "Could not close it. Try again."), "error");
    } finally {
      setBusy(false);
      await load();
    }
  };

  /** Returns true when saved, so the card can leave its edit form. */
  const moveClosing = async (order, closesAt) => {
    if (busy) return false;
    setBusy(true);
    try {
      await api.patch(`${BASE}/${order._id}/closing-time`, { closesAt });
      showToast("Closing time changed", "success");
      return true;
    } catch (error) {
      showToast(errorMessage(error, "Could not change it. Try again."), "error");
      return false;
    } finally {
      setBusy(false);
      await load();
    }
  };

  /** Returns true when saved, so the tile can leave its edit form. */
  const saveItems = async (order, godownId, items) => {
    if (busy) return false;
    setBusy(true);
    try {
      await api.put(`${BASE}/${order._id}/kitchens/${godownId}/items`, { items });
      showToast("Items changed. The kitchen will see what changed.", "success");
      return true;
    } catch (error) {
      showToast(errorMessage(error, "Could not save the items. Try again."), "error");
      return false;
    } finally {
      setBusy(false);
      await load();
    }
  };

  /** New order for a kitchen, after a plain-words check. Returns true when it was made. */
  const startOrder = async (body, kitchenName) => {
    if (busy) return false;
    const ok = await confirm({
      title: "Start this order?",
      message: `${kitchenName} will see it in its Orders straight away, and other kitchens can add their items until it closes.`,
      confirmLabel: "Start order",
    });
    if (!ok) return false;
    setBusy(true);
    try {
      await api.post(BASE, body);
      showToast(`Order started for ${kitchenName}`, "success");
      setStarting(false);
      return true;
    } catch (error) {
      showToast(errorMessage(error, "Could not start the order. Try again."), "error");
      return false;
    } finally {
      setBusy(false);
      await load();
    }
  };

  const gathering = orders.filter((order) => order.status === "open").length;
  let body;
  if (loading && orders.length === 0) body = <div className="kg-glass setup-state" role="status"><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Loading…</div>;
  else if (loadError && orders.length === 0) body = <ErrorState message={loadError} onRetry={load} />;
  else if (orders.length === 0) {
    body = (
      <EmptyState className="kg-glass setup-state" title="No orders being gathered">
        When a kitchen starts an order, it shows up here until it is approved.
      </EmptyState>
    );
  } else {
    body = (
      <ul className="pl-cards" aria-label="Orders being gathered">
        {orders.map((order) => (
          <PlanningCard key={order._id} order={order} now={now} open={open.has(order._id)} onToggle={() => toggle(order._id)}
            superAdmin={superAdmin} busy={busy} onClose={closeNow} onChangeClosing={setClosingFor} onEditItems={(picked, share) => setEditing({ order: picked, share })} />
        ))}
      </ul>
    );
  }

  return (
    <div className="setup-shell">
      <PageHeader title="Planning" subtitle="Kitchen orders still being gathered, soonest needed first. Other kitchens can add their items until an order closes."
        actions={<Button onClick={() => setStarting(true)}><Plus size={16} aria-hidden="true" /> New order</Button>} />
      <div className="setup-page">
        <p className="setup-results" aria-live="polite">
          <strong>{orders.length}</strong> {orders.length === 1 ? "order" : "orders"}
          {orders.length > 0 && <> · {gathering} open to join · {orders.length - gathering} waiting for approval</>}
        </p>
        {body}
      </div>
      {editing && (
        <KitchenItemsEditor kitchenName={editing.share.godownId?.name || "Kitchen"} orderName={orderTitle(editing.order)} share={editing.share}
          products={products} busy={busy} onClose={() => setEditing(null)}
          onSave={async (items) => {
            const kitchen = editing.share.godownId?.name || "The kitchen";
            const ok = await confirm({
              title: "Save these changes?",
              message: `This changes the order straight away. ${kitchen} will get a notification showing what changed.`,
              confirmLabel: "Save changes",
            });
            if (ok && await saveItems(editing.order, String(editing.share.godownId?._id || editing.share.godownId), items)) setEditing(null);
          }} />
      )}
      {closingFor && (
        <ClosingTimeDialog order={closingFor} now={now} busy={busy} onClose={() => setClosingFor(null)}
          onSave={async (iso) => { if (await moveClosing(closingFor, iso)) setClosingFor(null); }} />
      )}
      {starting && <NewOrderDialog products={products} busy={busy} onStart={startOrder} onClose={() => setStarting(false)} />}
      {dialog}
    </div>
  );
}
