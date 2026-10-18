import { formatMoney, formatQty, plural } from "./format.js";

export function TopItems({ data, onSelect }) {
  const max = Math.max(...data.items.map((item) => item.value), 1);
  return (
    <>
      <ol className="exec-product-list">
        {data.items.map((i) => (
          <li key={i.stockItemId ?? `unknown-${i.rank}`}>
            <button type="button" className="exec-product exec-explainable" onClick={() => onSelect?.(i)} aria-label={`Explain ${i.name} consumption`}>
              <span className="exec-product__rank">{String(i.rank).padStart(2, "0")}</span>
              <span className="exec-product__name">
                <strong>{i.name}</strong>
                <span>{formatQty(i.qty)} {i.unit}{i.unvaluedLines > 0 && ` · ${i.unvaluedLines} unvalued`}</span>
              </span>
              <span className="exec-product__bar" aria-hidden="true"><i style={{ width: `${(i.value / max) * 100}%` }} /></span>
              <strong className="exec-product__value">{formatMoney(i.value)}</strong>
            </button>
          </li>
        ))}
      </ol>
      {data.tiedBeyondLimit > 0 && <p className="exec-section__note">{data.tiedBeyondLimit} more {plural(data.tiedBeyondLimit, "item ties", "items tie")} with #10 and {plural(data.tiedBeyondLimit, "is", "are")} not shown.</p>}
    </>
  );
}
