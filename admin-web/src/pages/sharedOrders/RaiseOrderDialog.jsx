import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../../api.js";
import { useToast } from "../../useToast.js";
import { Banner, Button, Field, Modal, Select } from "../../components/ui/index.jsx";
import { orderItems, unitChoices } from "./sharedOrders.js";

const BASE = "/procurement/collaborative-purchase-orders";
const errorMessage = (error, fallback) => error?.response?.data?.message || error?.response?.data?.error || fallback;
const EMERGENCY = "emergency";
const blankRow = () => ({ key: Math.random().toString(36).slice(2), productId: "", qty: "", packId: "base" });

/**
 * The central store raises a shared order for one kitchen. "Save for review" leaves the kitchen's items waiting for
 * approval like any kitchen request; "Approve and send" approves them at once. Either way other kitchens can still
 * join until the order closes, and stock only moves when the kitchen receives the delivery.
 */
export function RaiseOrderDialog({ onClose, onCreated }) {
  const { showToast } = useToast();
  const [kitchens, setKitchens] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({ godownId: "", when: "", title: "", note: "", rows: [blankRow()] });
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    Promise.all([
      api.get("/inventory/godowns"),
      api.get("/products", { params: { status: "available" } }),
      api.get("/ordering-settings"),
    ]).then(([godowns, catalog, ordering]) => {
      setKitchens((godowns.data || []).filter((kitchen) => kitchen.active !== false));
      setProducts(catalog.data?.items || []);
      setSettings(ordering.data?.settings || null);
      setForm((current) => ({ ...current, when: current.when || ordering.data?.settings?.neededInOptions?.[0]?.key || "" }));
    }).catch((error) => setLoadError(errorMessage(error, "Could not load kitchens and products")));
  }, []);

  const set = (change) => setForm((current) => ({ ...current, ...change }));
  const setRow = (key, change) => set({ rows: form.rows.map((row) => (row.key === key ? { ...row, ...change } : row)) });
  const items = useMemo(() => orderItems(products, form.rows), [products, form.rows]);
  const chosen = new Set(form.rows.map((row) => row.productId).filter(Boolean));
  const ready = Boolean(form.godownId && form.when) && items.length > 0;
  const kitchenName = kitchens.find((kitchen) => kitchen._id === form.godownId)?.name || "the kitchen";

  const submit = async (approve) => {
    if (!ready || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const timing = form.when === EMERGENCY ? { emergency: true } : { neededIn: form.when };
      const { data } = await api.post(BASE, {
        godownId: form.godownId, ...timing, title: form.title, orderNote: form.note, items, approve,
      });
      showToast(approve ? `Order approved for ${kitchenName}` : `Order raised for ${kitchenName}; it is waiting for review`, "success");
      onCreated(data);
    } catch (error) {
      showToast(errorMessage(error, "Could not raise the order. Try again."), "error");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const loading = !settings && !loadError;
  return (
    <Modal title="Raise order for a kitchen" wide onClose={() => !busy && onClose()} actions={(
      <>
        <Button variant="ghost" disabled={busy} onClick={onClose}>Cancel</Button>
        <Button variant="ghost" disabled={busy || !ready} onClick={() => submit(false)}>Save for review</Button>
        <Button disabled={busy || !ready} onClick={() => submit(true)}>{busy ? "Saving…" : "Approve and send"}</Button>
      </>
    )}>
      {loadError ? <Banner variant="alert">{loadError}</Banner> : loading ? <p className="confirm-message">Loading…</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <div style={{ flex: "2 1 240px" }}>
              <Field label="Kitchen">
                <Select value={form.godownId} placeholder="Choose a kitchen" onChange={(e) => set({ godownId: e.target.value })}>
                  {kitchens.map((kitchen) => <option key={kitchen._id} value={kitchen._id}>{kitchen.name}</option>)}
                </Select>
              </Field>
            </div>
            <div style={{ flex: "1 1 180px" }}>
              <Field label="Needed">
                <Select value={form.when} onChange={(e) => set({ when: e.target.value })}>
                  {(settings?.neededInOptions || []).map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                  <option value={EMERGENCY}>Emergency (within {settings?.emergencyHours ?? 1} h)</option>
                </Select>
              </Field>
            </div>
          </div>
          <Field label="Title (optional)">
            <input type="text" value={form.title} maxLength={120} placeholder="e.g. Weekly staples" onChange={(e) => set({ title: e.target.value })} />
          </Field>

          <div>
            <span className="field__label">Items</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
              {form.rows.map((row) => {
                const product = products.find((candidate) => candidate._id === row.productId);
                return (
                  <div key={row.key} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                    <div className="field" style={{ flex: "2 1 220px", minWidth: 0 }}>
                      <Select value={row.productId} placeholder="Choose a product" aria-label="Product"
                        onChange={(e) => setRow(row.key, { productId: e.target.value, packId: "base" })}>
                        {products.filter((candidate) => candidate._id === row.productId || !chosen.has(candidate._id))
                          .map((candidate) => <option key={candidate._id} value={candidate._id}>{candidate.name}</option>)}
                      </Select>
                    </div>
                    <input type="number" min="0" step="0.001" placeholder="Qty" aria-label={`Quantity of ${product?.name || "item"}`}
                      style={{ flex: "0 1 96px", width: 96 }} disabled={!product} value={row.qty}
                      onChange={(e) => { if (e.target.value === "" || /^\d*\.?\d{0,3}$/.test(e.target.value)) setRow(row.key, { qty: e.target.value }); }} />
                    <div className="field" style={{ flex: "1 1 150px", minWidth: 0 }}>
                      <Select value={row.packId} disabled={!product} aria-label={`Unit for ${product?.name || "item"}`}
                        onChange={(e) => setRow(row.key, { packId: e.target.value })}>
                        {unitChoices(product).map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
                      </Select>
                    </div>
                    <Button variant="ghost" size="sm" aria-label="Remove item" disabled={form.rows.length === 1}
                      onClick={() => set({ rows: form.rows.filter((candidate) => candidate.key !== row.key) })}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                );
              })}
            </div>
            <Button variant="ghost" size="sm" style={{ marginTop: 8 }} onClick={() => set({ rows: [...form.rows, blankRow()] })}>
              <Plus size={16} /> Add item
            </Button>
          </div>

          <Field label="Note to the kitchen (optional)">
            <textarea rows={2} maxLength={500} value={form.note} onChange={(e) => set({ note: e.target.value })} />
          </Field>
          <p className="confirm-message" style={{ margin: 0 }}>
            Other kitchens can add their items until ordering closes; you review those as usual. Stock is added only when {kitchenName} receives the delivery.
          </p>
        </div>
      )}
    </Modal>
  );
}
