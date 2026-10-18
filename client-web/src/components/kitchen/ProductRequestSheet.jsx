import { useEffect, useState } from "react";
import { PackagePlus, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { api } from "../../api";
import Select from "../ui/Select";
import "./KitchenTransactions.css";
import "./ProductRequestSheet.css";

// Keep in step with backend/src/catalog/units.js.
const UNITS = [
  ["kg", "Kilogram (kg)"], ["g", "Gram (g)"], ["L", "Litre (L)"], ["mL", "Millilitre (mL)"],
  ["pcs", "Pieces (pcs)"], ["dozen", "Dozen"], ["packet", "Packet"]
];
const STATUS = { pending: "Waiting for review", approved: "Added", rejected: "Not added" };
const EMPTY = { name: "", unitSymbol: "", brand: "", note: "" };

/** Lets a kitchen ask for a product that is not in the catalog yet, and see what happened to earlier asks. */
export default function ProductRequestSheet({ onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState(null);

  const loadHistory = () => api.get("/product-requests/me").then(({ data }) => setHistory(data)).catch(() => setHistory([]));
  useEffect(() => { loadHistory(); }, []);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const submit = async () => {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try {
      await api.post("/product-requests", form);
      toast.success("Request sent. You will see the product here once it is added.");
      setForm(EMPTY);
      loadHistory();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not send the request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ktr-layer" role="presentation">
      <button type="button" className="ktr-backdrop" onClick={onClose} aria-label="Close" />
      <section className="ktr-panel" role="dialog" aria-modal="true" aria-labelledby="product-request-title">
        <header>
          <div><p>Not in the list?</p><h2 id="product-request-title">Request a new product</h2></div>
          <button type="button" onClick={onClose} aria-label="Close"><X size={22} /></button>
        </header>
        <div className="ktr-content">
          <section className="ktr-details" aria-label="Product details">
            <label className="ktr-note">
              <span>Product name</span>
              <input value={form.name} maxLength={120} placeholder="e.g. Basmati rice" onChange={(e) => set({ name: e.target.value })} />
            </label>
            <label>
              <span>Unit (optional)</span>
              <Select value={form.unitSymbol} onChange={(e) => set({ unitSymbol: e.target.value })}>
                <option value="">Not sure</option>
                {UNITS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </label>
            <label>
              <span>Brand (optional)</span>
              <input value={form.brand} maxLength={80} onChange={(e) => set({ brand: e.target.value })} />
            </label>
            <label className="ktr-note">
              <span>Why do you need it? (optional)</span>
              <textarea rows="3" value={form.note} maxLength={500} placeholder="What it is for, how much you use" onChange={(e) => set({ note: e.target.value })} />
            </label>
          </section>

          <section className="kpr-history" aria-labelledby="product-request-history">
            <h3 id="product-request-history">Your requests</h3>
            {history === null ? <p className="kpr-muted">Loading…</p> : history.length === 0 ? (
              <p className="kpr-muted">Nothing requested yet.</p>
            ) : (
              <ul>
                {history.map((row) => (
                  <li key={row._id}>
                    <div>
                      <strong>{row.name}</strong>
                      {row.status === "rejected" && row.decisionNote && <small>{row.decisionNote}</small>}
                      {row.status === "approved" && row.product && <small>Listed as {row.product.name}</small>}
                    </div>
                    <span className={`kpr-status kpr-status--${row.status}`}>{STATUS[row.status]}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <footer>
          <div><span>An admin reviews each request before the product is added.</span></div>
          <button type="button" onClick={submit} disabled={!form.name.trim() || saving}>
            <PackagePlus size={16} aria-hidden="true" style={{ verticalAlign: "-3px", marginRight: 6 }} />{saving ? "Sending…" : "Send request"}
          </button>
        </footer>
      </section>
    </div>
  );
}
