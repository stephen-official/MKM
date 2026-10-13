import { DataTable } from "../../components/ui/index.jsx";
import { formatMoney, formatQty } from "./format.js";

export function TopItems({ data }) {
  return (
    <>
      <DataTable>
        <thead><tr><th scope="col">#</th><th scope="col">Item</th><th scope="col" className="num">Value</th><th scope="col" className="num">Quantity</th></tr></thead>
        <tbody>
          {data.items.map((i) => (
            <tr key={i.stockItemId ?? `unknown-${i.rank}`}>
              <td>{i.rank}</td>
              <td>{i.name}{i.unvaluedLines > 0 && <small className="exec-muted"> · {i.unvaluedLines} unvalued</small>}</td>
              <td className="num">{formatMoney(i.value)}</td>
              <td className="num">{formatQty(i.qty)} {i.unit}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      {data.tiedBeyondLimit > 0 && <p className="exec-section__note">{data.tiedBeyondLimit} more item(s) tie with #10 and are not shown.</p>}
    </>
  );
}
