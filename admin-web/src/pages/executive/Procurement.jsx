import { DataTable } from "../../components/ui/index.jsx";
import { formatCount, formatMoney, plural } from "./format.js";

const label = (s) => s.replace(/_/g, " ");

const StatusTable = ({ caption, rows, withValue }) => (
  <DataTable>
    <caption className="exec-caption">{caption}</caption>
    <thead><tr><th scope="col">Status</th><th scope="col" className="num">Count</th>{withValue && <th scope="col" className="num">Value</th>}</tr></thead>
    <tbody>{rows.map((r) => <tr key={r.status}><td className="exec-status">{label(r.status)}</td><td className="num">{formatCount(r.count)}</td>{withValue && <td className="num">{formatMoney(r.value)}</td>}</tr>)}</tbody>
  </DataTable>
);

export function Procurement({ data }) {
  return (
    <div className="exec-split">
      <dl className="exec-facts">
        <div><dt>Stock received value</dt><dd>{formatMoney(data.stockReceived.value)}</dd></div>
        <div><dt>Distributions</dt><dd>{formatCount(data.stockReceived.distributionCount)}</dd></div>
        {data.scope === "all" && (
          <>
            <div><dt>Procurement spend</dt><dd>{formatMoney(data.spend.value)} ({formatCount(data.spend.poCount)} {plural(data.spend.poCount, "PO", "POs")})</dd></div>
            <div><dt>Awaiting distribution</dt><dd>{formatCount(data.awaiting.count)} {plural(data.awaiting.count, "PO", "POs")} · {formatMoney(data.awaiting.value)}</dd></div>
          </>
        )}
      </dl>
      {data.scope === "all" && <StatusTable caption="Indents created in period" rows={data.indents} withValue />}
      <StatusTable caption="Supply requests created in period" rows={data.supplyRequests} />
    </div>
  );
}
