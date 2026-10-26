import { useEffect, useState } from "react";
import { PackagePlus, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { api } from "../../api";
import Select from "../ui/Select";
import "./ProductRequestSheet.css";

// Keep in step with backend/src/catalog/units.js.
const UNITS = [
  ["kg", "Kilogram (kg)"], ["g", "Gram (g)"], ["L", "Litre (L)"], ["mL", "Millilitre (mL)"],
  ["pcs", "Pieces (pcs)"], ["dozen", "Dozen"], ["packet", "Packet"]
];
const STATUS = { pending: "Waiting for review", approved: "Added", rejected: "Not added" };
// Status pill tones: waiting = amber, added = green, not added = rose (the same pills as Stock and Home).
const TONE = { pending: "soon", approved: "routine", rejected: "expired" };
const EMPTY = { name: "", unitSymbol: "", brand: "", note: "" };

/** Lets a kitchen ask for a product that is not in the catalog yet, and see what happened to earlier asks. */
export default function ProductRequestSheet({ onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState(null);

  const loadHistory = () => api.get("/product-requests/me").then(({ data }) => setHistory(data)).catch(() => setHistory([]));
  useEffect(() => { loadHistory(); }, []);
  // Escape closes the sheet (unless the unit menu just used it to close itself); the page behind does not scroll while it is open.
  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape" && !event.defaultPrevented) onClose(); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

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
    <div className="kpr-layer" role="presentation">
      <button type="button" className="kpr-backdrop" onClick={onClose} aria-label="Close" />
      <section className="kpr-panel" role="dialog" aria-modal="true" aria-labelledby="product-request-title">
        <header className="kpr-head">
          <div><p className="kg-label">Not in the list?</p><h2 id="product-request-title">Request a new product</h2></div>
          <button type="button" className="kg-chip kpr-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="kpr-body">
          <section className="kg-glass kpr-form" aria-label="Product details">
            <label className="kpr-field kpr-field--wide">
              <span>Product name</span>
              <input value={form.name} maxLength={120} placeholder="e.g. Basmati rice" onChange={(e) => set({ name: e.target.value })} />
            </label>
            <label className="kpr-field">
              <span>Unit (optional)</span>
              <Select value={form.unitSymbol} onChange={(e) => set({ unitSymbol: e.target.value })} aria-label="Unit">
                <option value="">Not sure</option>
                {UNITS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </label>
            <label className="kpr-field">
              <span>Brand (optional)</span>
              <input value={form.brand} maxLength={80} placeholder="Any brand" onChange={(e) => set({ brand: e.target.value })} />
            </label>
            <label className="kpr-field kpr-field--wide">
              <span>Why do you need it? (optional)</span>
              <textarea rows="3" value={form.note} maxLength={500} placeholder="What it is for, how much you use" onChange={(e) => set({ note: e.target.value })} />
            </label>
            <button type="button" className="kg-btn kpr-submit" onClick={submit} disabled={!form.name.trim() || saving}>
              <PackagePlus size={16} aria-hidden="true" />{saving ? "Sending…" : "Send request"}
            </button>
            <p className="kpr-hint">An admin reviews each request before the product is added.</p>
          </section>

          <section className="kpr-history" aria-labelledby="product-request-history">
            <div className="kpr-history__head"><h3 id="product-request-history">Your requests</h3>{Array.isArray(history) && history.length > 0 && <span>{history.length}</span>}</div>
            {history === null ? <p className="kg-glass kpr-empty">Loading…</p> : history.length === 0 ? (
              <p className="kg-glass kpr-empty">Nothing requested yet.</p>
            ) : (
              <ul className="kpr-rows">
                {history.map((row) => (
                  <li key={row._id} className="kg-row">
                    <div>
                      <strong>{row.name}</strong>
                      {row.status === "rejected" && row.decisionNote && <small>{row.decisionNote}</small>}
                      {row.status === "approved" && row.product && <small>Listed as {row.product.name}</small>}
                    </div>
                    <span className={`kg-pill kg-pill--${TONE[row.status] || "routine"}`}>{STATUS[row.status] || row.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
