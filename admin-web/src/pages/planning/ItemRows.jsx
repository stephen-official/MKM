import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Lock, Minus, Plus, Search, Trash2, Undo2 } from "lucide-react";
import { newLine, rowChange, stepAmount } from "./planning.js";

// The same words and arrows the kitchen sees in its "Your admin changed items" list.
const TAG = {
  up: { icon: ArrowUp, word: "More" },
  down: { icon: ArrowDown, word: "Less" },
  added: { icon: Plus, word: "New" },
  removed: { icon: Minus, word: "Removed" },
};

/**
 * The item list of the Planning popups (change a kitchen's items, new order): each item with − / + around its amount
 * and a bin (a removed item that was already on the order stays struck through with Undo), then a search box whose
 * results sit in the popup itself — a floating list would be cut off by the popup. showChanges adds the was / More /
 * Less / New / Removed tags the kitchen will see.
 */
export function ItemRows({ rows, setRows, products, busy, showChanges = true }) {
  const [query, setQuery] = useState("");
  const onList = new Set(rows.map((row) => row.stockItemId));
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return products
      .filter((product) => !onList.has(String(product._id)))
      .filter((product) => product.name?.toLowerCase().includes(term) || product.stockGroup?.toLowerCase().includes(term))
      .slice(0, 8);
  }, [products, rows, query]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (key, change) => setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...change } : row)));
  const type = (key, amount) => { if (amount === "" || /^\d*\.?\d{0,3}$/.test(amount)) patch(key, { amount }); };
  const remove = (row) => (row.original === null ? setRows((prev) => prev.filter((r) => r.key !== row.key)) : patch(row.key, { removed: true }));
  const add = (product) => {
    setRows((prev) => [...prev, newLine(product)]);
    setQuery("");
  };

  return (
    <>
      {rows.length > 0 && <ul className="pl-editor__rows">
        {rows.map((row) => {
          const kind = rowChange(row);
          const tag = showChanges ? TAG[kind] : null;
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
      </ul>}

      <div className="pl-editor__add">
        <label className="pl-editor__search">
          <Search size={16} aria-hidden="true" />
          <input type="search" value={query} placeholder="Add a product: type its name" aria-label="Add a product"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (matches[0]) add(matches[0]); } }} />
        </label>
        {query.trim() && (
          <ul className="pl-editor__results" aria-label="Products found">
            {matches.length === 0 && <li className="pl-editor__none">No product matches “{query.trim()}”.</li>}
            {matches.map((product) => (
              <li key={product._id}>
                <button type="button" className="pl-editor__result" onClick={() => add(product)}>
                  <span><strong>{product.name}</strong>{product.stockGroup && <small>{product.stockGroup}</small>}</span>
                  <span className="pl-editor__result-add"><Plus size={14} aria-hidden="true" /> Add</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

    </>
  );
}
