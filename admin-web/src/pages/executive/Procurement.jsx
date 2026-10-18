import { DataTable } from "../../components/ui/index.jsx";
import { formatCount, formatMoney, plural } from "./format.js";

const label = (s) => s.replace(/_/g, " ");

/** Makes an element open the explanation for `target`, the specific figure or row selected. */
const explainable = (onExplain, label, target) => onExplain ? {
  role: "button",
  tabIndex: 0,
  "aria-label": `${label}. Show detailed explanation and calculation.`,
  onClick: () => onExplain(target),
  onKeyDown: (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onExplain(target);
    }
  },
} : {};

const StatusTable = ({ caption, kind, rows, withValue, onExplain }) => (
  <DataTable>
    <caption className="exec-caption">{caption}</caption>
    <thead><tr><th scope="col">Status</th><th scope="col" className="num">Count</th>{withValue && <th scope="col" className="num">Value</th>}</tr></thead>
    <tbody>{rows.map((r) => <tr className={onExplain ? "exec-table-row--clickable" : undefined} {...explainable(onExplain, `${label(r.status)} ${caption}`, { status: kind, row: r })} key={r.status}><td className="exec-status">{label(r.status)}</td><td className="num">{formatCount(r.count)}</td>{withValue && <td className="num">{formatMoney(r.value)}</td>}</tr>)}</tbody>
  </DataTable>
);

export function Procurement({ data, onExplain }) {
  return (
    <div className="exec-split">
      <dl className="exec-facts">
        <div className="exec-explainable" {...explainable(onExplain, "Stock received value", { fact: "stockReceived" })}><dt>Stock received value</dt><dd>{formatMoney(data.stockReceived.value)}</dd></div>
        <div className="exec-explainable" {...explainable(onExplain, "Distributions", { fact: "distributions" })}><dt>Distributions</dt><dd>{formatCount(data.stockReceived.distributionCount)}</dd></div>
        {data.scope === "all" && (
          <>
            <div className="exec-explainable" {...explainable(onExplain, "Procurement spend", { fact: "spend" })}><dt>Procurement spend</dt><dd>{formatMoney(data.spend.value)} ({formatCount(data.spend.poCount)} {plural(data.spend.poCount, "PO", "POs")})</dd></div>
            <div className="exec-explainable" {...explainable(onExplain, "Awaiting distribution", { fact: "awaiting" })}><dt>Awaiting distribution</dt><dd>{formatCount(data.awaiting.count)} {plural(data.awaiting.count, "PO", "POs")} · {formatMoney(data.awaiting.value)}</dd></div>
          </>
        )}
      </dl>
      {data.scope === "all" && <StatusTable caption="Indents created in period" kind="indents" rows={data.indents} withValue onExplain={onExplain} />}
      <StatusTable caption="Supply requests created in period" kind="supply" rows={data.supplyRequests} onExplain={onExplain} />
    </div>
  );
}
