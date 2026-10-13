import { Badge, DataTable } from "../../components/ui/index.jsx";
import { formatQty } from "./format.js";
import { Pager } from "./Pager.jsx";

export function StockHealth({ data, onPage }) {
  return (
    <>
      <p className="exec-section__note">{data.outCount} out of stock · {data.lowCount} below threshold</p>
      <DataTable>
        <thead><tr><th scope="col">Status</th><th scope="col">Kitchen</th><th scope="col">Item</th><th scope="col" className="num">Quantity</th><th scope="col" className="num">Threshold</th></tr></thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.id}>
              <td><Badge variant={r.state === "out" ? "alert" : "warn"}>{r.state === "out" ? "Out of stock" : "Low"}</Badge></td>
              <td>{r.kitchen}</td>
              <td>{r.item}</td>
              <td className="num">{formatQty(r.qty)} {r.unit}</td>
              <td className="num">{r.threshold ? `${formatQty(r.threshold)} ${r.unit}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      <Pager page={data.page} pages={data.pages} total={data.total} label="items" singular="item" onPage={onPage} />
    </>
  );
}
