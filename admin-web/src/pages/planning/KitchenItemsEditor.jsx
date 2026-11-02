import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Lock, Minus, Plus, Search, Trash2, Undo2 } from "lucide-react";
import { Button, Modal } from "../../components/ui/index.jsx";
import { ProductCombobox } from "../ledger/ProductCombobox.jsx";
import { changeCount, editableLines, linesPayload, linesReady, newLine, rowChange, stepAmount } from "./planning.js";

// The same words and arrows the kitchen sees in its "Your admin changed items" list.
const TAG = {
  up: { icon: ArrowUp, word: "More" },
  down: { icon: ArrowDown, word: "Less" },
  added: { icon: Plus, word: "New" },
  removed: { icon: Minus, word: "Removed" },
};

/**
 * Super-admin popup: change one kitchen's items on an order still being planned. Each item has − / + around its
 * amount and a bin; a removed item stays struck through with Undo; products are added from a search box. Every changed
 * row shows what the kitchen will see (was 10 kg ↑ More). onSave(items) resolves true when saved.
 */
export function KitchenItemsEditor({ kitchenName, orderName, share, products, busy, onSave, onClose }) {
  const [rows, setRows] = useState(() => editableLines(share));
  const onList = new Set(rows.map((row) => row.stockItemId));
  const choices = useMemo(() => products.filter((product) => !onList.has(String(product._id))), [products, rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const changes = changeCount(rows);
  const ready = linesReady(rows);
  const keptCount = rows.filter((row) => !row.removed).length;

  const patch = (key, change) => setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...change } : row)));
  const type = (key, amount) => { if (amount === "" || /^\d*\.?\d{0,3}$/.test(amount)) patch(key, { amount }); };
  const remove = (row) => (row.original === null ? setRows((prev) => prev.filter((r) => r.key !== row.key)) : patch(row.key, { removed: true }));
  const add = (id) => {
    const product = products.find((p) => String(p._id) === String(id));
    if (product) setRows((prev) => [...prev, newLine(product)]);
  };

  const save = async (event) => {
    event.preventDefault();
    if (busy || !ready || changes === 0) return;
    await onSave(linesPayload(rows));
  };

  let hint = "The kitchen will see these changes.";
  if (keptCount === 0) hint = "A kitchen keeps at least one item. Undo a removal to save.";
  else if (!ready) hint = "Every item needs an amount above 0.";
  else if (changes === 0) hint = "Nothing changed yet.";

  return (
    <Modal title={`Change items · ${kitchenName}`} onClose={() => !busy && onClose()} closeButton="right" wide dismissible={!busy}>
      <form className="pl-editor" onSubmit={save} noValidate>
        <p className="pl-editor__order">{orderName}</p>
        <ul className="pl-editor__rows">
          {rows.map((row) => {
            const kind = rowChange(row);
            const tag = TAG[kind];
            return (
              <li key={row.key} className={`kg-row pl-editor__row${row.removed ? " is-removed" : ""}`}>
                <div className="pl-editor__main">
                  <strong className="pl-editor__name">{row.name}</strong>
                  {row.approved ? (
                    <span className="pl-editor__locked"><Lock size={13} aria-hidden="true" /> {row.amount} {row.unit} · approved, can't change</span>
                  ) : row.removed ? (
                    <span className="pl-editor__controls">
                      <span className="pl-editor__was">{row.original} {row.unit}</span>
                      <button type="button" className="kg-chip pl-editor__undo" onClick={() => patch(row.key, { removed: false, amount: row.original })}><Undo2 size={14} aria-hidden="true" /> Undo</button>
                    </span>
                  ) : (
                    <span className="pl-editor__controls">
                      <button type="button" className="kg-chip kp-icon" disabled={busy || Number(row.amount) <= 1} onClick={() => patch(row.key, { amount: stepAmount(row.amount, -1) })} aria-label={`Less ${row.name}`}><Minus size={16} aria-hidden="true" /></button>
                      <label className="pl-editor__amount">
                        <input type="text" inputMode="decimal" value={row.amount} aria-label={`Amount of ${row.name}`} onChange={(e) => type(row.key, e.target.value)} />
                        <span>{row.unit}</span>
                      </label>
                      <button type="button" className="kg-chip kp-icon" disabled={busy} onClick={() => patch(row.key, { amount: stepAmount(row.amount, 1) })} aria-label={`More ${row.name}`}><Plus size={16} aria-hidden="true" /></button>
                      <button type="button" className="kg-chip kp-icon kp-chip--danger pl-editor__bin" disabled={busy} onClick={() => remove(row)} aria-label={`Remove ${row.name}`} title="Remove"><Trash2 size={16} aria-hidden="true" /></button>
                    </span>
                  )}
                </div>
                {tag && (
                  <div className="pl-editor__change">
                    {kind !== "added" && kind !== "removed" && <span>was {row.original} {row.unit}</span>}
                    <span className={`pl-tag pl-tag--${kind}`}><tag.icon size={13} strokeWidth={2.4} aria-hidden="true" />{tag.word}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="pl-editor__add">
          <Search size={16} aria-hidden="true" />
          <ProductCombobox key={rows.length} products={choices} value={null} onSelect={add} placeholder="Add a product…" />
        </div>

        <p className={keptCount === 0 || !ready ? "pl-error" : "kp-hint"} role={keptCount === 0 || !ready ? "alert" : undefined}>{hint}</p>
        <div className="pl-editor__actions">
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy || !ready || changes === 0}>
            {busy ? "Saving…" : changes === 0 ? "Save changes" : `Save ${changes} ${changes === 1 ? "change" : "changes"}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
