import { useMemo, useState } from "react";
import { Check, Lock, Minus, Plus, X } from "lucide-react";
import { ProductCombobox } from "../ledger/ProductCombobox.jsx";
import { editableLines, linesPayload, linesReady, newLine } from "./planning.js";

/**
 * Super-admin: change one kitchen's items on an order still being planned. Amounts can be changed, lines removed and
 * products added; approved lines are locked. The kitchen is shown what changed. onSave(items) resolves true when saved.
 */
export function KitchenItemsEditor({ share, products, busy, onSave, onCancel }) {
  const [rows, setRows] = useState(() => editableLines(share));
  const [adding, setAdding] = useState(null); // product id picked in the search box
  const onList = new Set(rows.map((row) => row.stockItemId));
  const choices = useMemo(() => products.filter((product) => !onList.has(String(product._id))), [products, rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key, amount) => {
    if (amount !== "" && !/^\d*\.?\d{0,3}$/.test(amount)) return; // at most 3 decimals
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, amount } : row)));
  };
  const remove = (key) => setRows((prev) => prev.filter((row) => row.key !== key));
  const add = (id) => {
    const product = products.find((p) => String(p._id) === String(id));
    if (product) setRows((prev) => [...prev, newLine(product)]);
    setAdding(null);
  };

  const save = async (event) => {
    event.preventDefault();
    if (busy || !linesReady(rows)) return;
    await onSave(linesPayload(rows));
  };

  return (
    <form className="pl-edit" onSubmit={save}>
      <ul className="pl-edit__rows">
        {rows.map((row) => (
          <li key={row.key} className="pl-edit__row">
            <span className="pl-edit__name">{row.name}</span>
            {row.approved ? (
              <span className="pl-edit__locked"><Lock size={12} aria-hidden="true" /> {row.amount} {row.unit} · approved</span>
            ) : (
              <>
                <label className="pl-edit__amount">
                  <input type="text" inputMode="decimal" value={row.amount} placeholder="0" aria-label={`Amount of ${row.name}`} onChange={(e) => set(row.key, e.target.value)} />
                  <span>{row.unit}</span>
                </label>
                <button type="button" className="kg-chip kp-icon kp-chip--cancel" disabled={busy || rows.length === 1} onClick={() => remove(row.key)}
                  aria-label={`Remove ${row.name}`} title={rows.length === 1 ? "A kitchen keeps at least one item" : "Remove"}><Minus size={16} aria-hidden="true" /></button>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="pl-edit__add">
        <Plus size={16} aria-hidden="true" />
        <ProductCombobox key={rows.length} products={choices} value={adding} onSelect={add} placeholder="Add a product…" />
      </div>
      {!linesReady(rows) && <p className="pl-error" role="alert">Every item needs an amount above 0.</p>}
      <span className="kp-section__actions pl-closing__actions">
        <button type="button" className="kg-chip kp-icon kp-chip--cancel" disabled={busy} onClick={onCancel} aria-label="Cancel" title="Cancel"><X size={18} aria-hidden="true" /></button>
        <button type="submit" className="kg-chip kp-icon kp-chip--save" disabled={busy || !linesReady(rows)} aria-label="Save items" title="Save"><Check size={18} aria-hidden="true" /></button>
      </span>
    </form>
  );
}
