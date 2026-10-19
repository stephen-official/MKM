import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "../../api.js";
import { useToast } from "../../useToast.js";
import { Badge, Button, Card, EmptyState, ErrorState, Field, LoadingState, Modal } from "../../components/ui/index.jsx";
import { emptySupplierForm, formFromSupplier, formatLicence, payloadFromSupplierForm, validateSupplierForm } from "./suppliers.js";

const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;

/** Suppliers the central store buys from. Their name and FSSAI licence are shown to kitchens on every order received. */
export function SuppliersPanel() {
  const { showToast } = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(null); // null | { supplier: null | {...}, form }
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const fetchSuppliers = useCallback(() => api.get("/suppliers", { params: { status: "all" } })
    .then((res) => { setSuppliers(res.data || []); setLoadError(""); })
    .catch((error) => setLoadError(errorMessage(error, "Failed to load suppliers")))
    .finally(() => setLoading(false)), []);
  const load = useCallback(() => { setLoading(true); return fetchSuppliers(); }, [fetchSuppliers]);
  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const open = (supplier = null) => { setErrors({}); setEditing({ supplier, form: supplier ? formFromSupplier(supplier) : emptySupplierForm() }); };
  const set = (change) => setEditing((previous) => ({ ...previous, form: { ...previous.form, ...change } }));

  const save = async (event) => {
    event.preventDefault();
    const found = validateSupplierForm(editing.form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const body = payloadFromSupplierForm(editing.form);
      if (editing.supplier) await api.put(`/suppliers/${editing.supplier._id}`, body);
      else await api.post("/suppliers", body);
      showToast(editing.supplier ? "Supplier updated" : "Supplier added", "success");
      setEditing(null);
      await load();
    } catch (error) {
      const code = error?.response?.data?.code;
      if (code === "DUPLICATE_NAME") setErrors({ name: errorMessage(error, "Another supplier has this name.") });
      else showToast(errorMessage(error, "Could not save the supplier."), "error");
    } finally {
      setBusy(false);
    }
  };

  if (loadError && !suppliers.length) return <ErrorState message={loadError} onRetry={load} />;
  if (loading && !suppliers.length) return <LoadingState label="Loading suppliers…" />;

  return (
    <>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15 }}>Suppliers</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>Kitchens see the supplier's name and FSSAI licence on every delivery they receive.</p>
          </div>
          <Button onClick={() => open()}><Plus size={16} /> Add supplier</Button>
        </div>
        {suppliers.length === 0 ? (
          <EmptyState title="No suppliers yet">Add the vendors you buy from, with their FSSAI licence numbers.</EmptyState>
        ) : (
          <table className="table">
            <thead><tr><th scope="col">Name</th><th scope="col">FSSAI licence</th><th scope="col">Phone</th><th scope="col">Status</th><th scope="col" style={{ textAlign: "right" }}>Actions</th></tr></thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier._id}>
                  <td style={{ fontWeight: 650 }}>{supplier.name}</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{formatLicence(supplier.fssaiLicence)}</td>
                  <td>{supplier.phone || "—"}</td>
                  <td>{supplier.active ? <Badge variant="success">Active</Badge> : <Badge>Archived</Badge>}</td>
                  <td style={{ textAlign: "right" }}><Button size="sm" variant="ghost" onClick={() => open(supplier)}>Edit</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {editing && (
        <Modal title={editing.supplier ? "Edit supplier" : "Add supplier"} onClose={() => !busy && setEditing(null)} actions={(
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
            <Button type="submit" form="supplier-form" disabled={busy}>{busy ? "Saving…" : editing.supplier ? "Save changes" : "Add supplier"}</Button>
          </>
        )}>
          <form id="supplier-form" onSubmit={save} style={{ display: "grid", gap: 14 }}>
            <Field label="Name">
              <input type="text" value={editing.form.name} maxLength={120} autoFocus onChange={(e) => set({ name: e.target.value })} aria-invalid={Boolean(errors.name) || undefined} />
              {errors.name && <small style={{ color: "var(--danger)" }}>{errors.name}</small>}
            </Field>
            <Field label="FSSAI licence number (14 digits)">
              <input type="text" inputMode="numeric" value={editing.form.fssaiLicence} placeholder="1234 5678 9012 34" onChange={(e) => set({ fssaiLicence: e.target.value })} aria-invalid={Boolean(errors.fssaiLicence) || undefined} />
              {errors.fssaiLicence && <small style={{ color: "var(--danger)" }}>{errors.fssaiLicence}</small>}
            </Field>
            <Field label="Phone (optional)">
              <input type="tel" value={editing.form.phone} maxLength={20} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
            {editing.supplier && (
              <label className="checkbox">
                <input type="checkbox" checked={editing.form.active} onChange={(e) => set({ active: e.target.checked })} />
                <span>Active<small style={{ display: "block", color: "var(--muted)" }}>Untick to archive. Archived suppliers cannot be chosen for new orders.</small></span>
              </label>
            )}
          </form>
        </Modal>
      )}
    </>
  );
}
