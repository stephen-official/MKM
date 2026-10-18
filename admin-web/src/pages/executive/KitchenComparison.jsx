import { Badge, DataTable } from "../../components/ui/index.jsx";
import { formatCount, formatMoney } from "./format.js";
import { Pager } from "./Pager.jsx";

const explainable = (onExplain, row) => onExplain ? {
  role: "button",
  tabIndex: 0,
  "aria-label": `Explain ${row.kitchen} figures`,
  onClick: () => onExplain(row),
  onKeyDown: (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onExplain(row);
    }
  },
} : {};

export function KitchenComparison({ data, onSelectKitchen, onPage, onExplain }) {
  return (
    <>
      <DataTable>
        <thead>
          <tr>
            <th scope="col">Kitchen</th><th scope="col" className="num">Consumption value</th><th scope="col" className="num">Unvalued lines</th>
            <th scope="col" className="num">Low / out (current)</th><th scope="col" className="num">Pending requests</th><th scope="col" className="num">Stock received</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr className={onExplain ? "exec-table-row--clickable" : undefined} {...explainable(onExplain, r)} key={r.godownId}>
              <th scope="row">
                {r.deleted ? r.kitchen : (
                  <button type="button" className="exec-link" onClick={(event) => { event.stopPropagation(); onSelectKitchen(r.godownId); }}>{r.kitchen}</button>
                )}
                {!r.active && !r.deleted && <Badge variant="neutral">Inactive</Badge>}
              </th>
              <td className="num">{formatMoney(r.consumptionValue)}</td>
              <td className="num">{formatCount(r.unvaluedLines)}</td>
              <td className="num">{r.lowOrOutOfStock === null ? "—" : formatCount(r.lowOrOutOfStock)}</td>
              <td className="num">{formatCount(r.pendingRequests)}</td>
              <td className="num">{formatMoney(r.stockReceivedValue)}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      <Pager page={data.page} pages={data.pages} total={data.total} label="kitchens" singular="kitchen" onPage={onPage} />
    </>
  );
}
