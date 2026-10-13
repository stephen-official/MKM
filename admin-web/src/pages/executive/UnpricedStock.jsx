import { DataTable } from "../../components/ui/index.jsx";
import { formatQty } from "./format.js";
import { Pager } from "./Pager.jsx";

export function UnpricedStock({ data, onPage }) {
  return (
    <>
      <DataTable>
        <thead><tr><th scope="col">Kitchen</th><th scope="col">Item</th><th scope="col" className="num">Quantity</th></tr></thead>
        <tbody>
          {data.rows.map((r) => <tr key={r.id}><td>{r.kitchen}</td><td>{r.item}</td><td className="num">{formatQty(r.qty)} {r.unit}</td></tr>)}
        </tbody>
      </DataTable>
      <Pager page={data.page} pages={data.pages} total={data.total} label="unpriced items" onPage={onPage} />
    </>
  );
}
