import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { api } from "../../api.js";
import { useToast } from "../../useToast.js";
import { Button, ErrorState, Select } from "../../components/ui/index.jsx";

// Settings › Ordering rules: the figures behind shared kitchen orders (backend ordering/settings.js validates them).
const toAmount = (hours) => (hours >= 24 && hours % 24 === 0 ? { amount: String(hours / 24), unit: "days" } : { amount: String(hours), unit: "hours" });
const toHours = ({ amount, unit }) => Number(amount) * (unit === "days" ? 24 : 1);
const newKey = () => `n${Date.now().toString(36).slice(-6)}`; // the server wants 1–8 lowercase letters or digits

const fromSettings = (s) => ({
  options: s.neededInOptions.map((o) => ({ key: o.key, label: o.label, ...toAmount(o.hours) })),
  emergencyHours: String(s.emergencyHours),
  closeBefore: toAmount(s.closeBeforeHours),
  minOpenPercent: String(Math.round(s.minOpenShare * 100))
});

function Amount({ value, onChange, label }) {
  return (
    <span className="rules-amount">
      <input type="number" min="0" step="any" inputMode="decimal" aria-label={label} value={value.amount} onChange={(e) => onChange({ ...value, amount: e.target.value })} />
      <Select className="rules-unit" aria-label={`${label} in`} value={value.unit} onChange={(e) => onChange({ ...value, unit: e.target.value })}>
        <option value="hours">hours</option>
        <option value="days">days</option>
      </Select>
    </span>
  );
}

export function OrderingRules() {
  const { showToast } = useToast();
  const [form, setForm] = useState(null);
  const [version, setVersion] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const { data } = await api.get("/ordering-settings");
      setForm(fromSettings(data.settings));
      setVersion(data.version);
    } catch (error) {
      setLoadError(error?.response?.data?.message || "Could not load the ordering rules.");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loadError) return <ErrorState message={loadError} onRetry={load} />;
  if (!form) return <div className="kg-glass setup-state" role="status"><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Loading…</div>;

  const setOption = (index, patch) => setForm((prev) => ({ ...prev, options: prev.options.map((o, i) => (i === index ? { ...o, ...patch } : o)) }));

  const save = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const settings = {
        neededInOptions: form.options.map((o) => ({ key: o.key, label: o.label.trim(), hours: toHours(o) })),
        emergencyHours: Number(form.emergencyHours),
        closeBeforeHours: toHours(form.closeBefore),
        minOpenShare: Number(form.minOpenPercent) / 100
      };
      const { data } = await api.put("/ordering-settings", { settings, expectedVersion: version });
      setForm(fromSettings(data.settings));
      setVersion(data.version);
      showToast("Ordering rules saved", "success");
    } catch (error) {
      showToast(error?.response?.data?.message || "Could not save the ordering rules.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="rules" onSubmit={save}>
      <section className="kg-glass rules-card">
        <h3>When kitchens can say they need it</h3>
        <p className="setup-hint">The choices a kitchen picks from when it starts an order, e.g. “3 days”. Between 1 and 10 choices.</p>
        <ul className="rules-options">
          {form.options.map((option, index) => (
            <li key={option.key}>
              <input className="rules-label" aria-label={`Choice ${index + 1} name`} placeholder="Name, e.g. 3 days" maxLength={30} value={option.label} onChange={(e) => setOption(index, { label: e.target.value })} />
              <Amount label={`Choice ${index + 1} time`} value={option} onChange={(next) => setOption(index, next)} />
              <button type="button" className="kg-chip setup-row__icon setup-row__icon--danger" disabled={form.options.length <= 1}
                onClick={() => setForm((prev) => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }))} aria-label={`Remove choice ${option.label || index + 1}`} title="Remove">
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        {form.options.length < 10 && (
          <button type="button" className="kg-chip rules-add" onClick={() => setForm((prev) => ({ ...prev, options: [...prev.options, { key: newKey(), label: "", amount: "", unit: "days" }] }))}>
            <Plus size={15} aria-hidden="true" /> Add a choice
          </button>
        )}
      </section>

      <section className="kg-glass rules-card">
        <h3>Emergency orders</h3>
        <p className="setup-hint">How soon an order marked “emergency” is needed, in hours (15 minutes to 24 hours).</p>
        <span className="rules-amount">
          <input type="number" min="0.25" max="24" step="0.25" inputMode="decimal" aria-label="Emergency orders needed within, hours" value={form.emergencyHours} onChange={(e) => setForm((prev) => ({ ...prev, emergencyHours: e.target.value }))} />
          <span>hours</span>
        </span>
      </section>

      <section className="kg-glass rules-card">
        <h3>When other kitchens stop joining</h3>
        <p className="setup-hint">Other kitchens can add to an order until this long before it is needed, so the store has time to buy.</p>
        <Amount label="Stop joining before needed" value={form.closeBefore} onChange={(next) => setForm((prev) => ({ ...prev, closeBefore: next }))} />
        <p className="setup-hint">But an order always stays open for at least this share of the time until it is needed (5–95%).</p>
        <span className="rules-amount">
          <input type="number" min="5" max="95" step="1" inputMode="numeric" aria-label="Shortest open share, percent" value={form.minOpenPercent} onChange={(e) => setForm((prev) => ({ ...prev, minOpenPercent: e.target.value }))} />
          <span>%</span>
        </span>
      </section>

      <div className="rules-actions">
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save ordering rules"}</Button>
      </div>
    </form>
  );
}
