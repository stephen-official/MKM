import { useState } from "react";
import { FileSpreadsheet, CheckCircle2 } from "lucide-react";
import {
  Badge, Button, DataTable, DetailPanel, EmptyState, Meta, RailItem, RailList, SplitView, StatusBadge
} from "../../components/ui/index.jsx";
import { fmtDate, formatQty, inr } from "./helpers.js";
import { lineQuantityLabel } from "../procurementPackaging.js";

const PAGE = 100;
const rowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 };
const mutedStyle = { color: "var(--muted)", fontSize: 12 };

/* Logs tab: raised indents on the left, the selected indent on the right. */
export const IndentLogsView = ({ indents, selected, onSelect, r, busy, onExport, onMarkPurchased, searching }) => {
  const [limit, setLimit] = useState(PAGE);

  const rail = (
    <RailList
      title="Results"
      count={indents.length}
      empty={
        <EmptyState title={searching ? "No indents match your search" : "No indents yet"}>
          {searching ? "Try a different indent number." : "Use Create New to raise the first indent."}
        </EmptyState>
      }
    >
      {indents.slice(0, limit).map((i) => (
        <RailItem key={i._id} active={selected?._id === i._id} onClick={() => onSelect(i._id)}>
          <div style={rowStyle}>
            <strong>{i.indentNo || `REF-${i._id.slice(-4)}`}</strong>
            <span style={mutedStyle}>{fmtDate(i.createdAt)}</span>
          </div>
          <div style={{ ...rowStyle, marginTop: 6 }}>
            <span style={mutedStyle}>{inr(i.totalAmount)}</span>
            <StatusBadge status={i.status} />
          </div>
        </RailItem>
      ))}
      {indents.length > limit && (
        <Button variant="ghost" size="sm" onClick={() => setLimit((n) => n + PAGE)}>
          Show more ({indents.length - limit} left)
        </Button>
      )}
    </RailList>
  );

  return (
    <SplitView rail={rail}>
      {selected ? (
        <DetailPanel
          head={
            <>
              <Meta label="Indent">{selected.indentNo || `REF-${selected._id.slice(-4)}`}</Meta>
              <Meta label="Status"><StatusBadge status={selected.status} /></Meta>
              <Meta label="Raised on">{fmtDate(selected.createdAt)}</Meta>
              <Meta label="Total valuation" align="end">{inr(selected.totalAmount)}</Meta>
            </>
          }
          foot={
            <>
              <Button variant="success" onClick={onExport}>
                <FileSpreadsheet size={16} /> Export Excel
              </Button>
              {String(selected.status).toLowerCase() === "pending" && (
                <Button disabled={busy} onClick={() => onMarkPurchased(selected)}>
                  <CheckCircle2 size={16} /> {busy ? "Updating…" : "Mark Purchased"}
                </Button>
              )}
            </>
          }
        >
          <DataTable>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Group</th>
                <th scope="col" style={{ textAlign: "right" }}>Qty</th>
                <th scope="col" style={{ textAlign: "right" }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(selected.items || []).map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <strong>{r.name(item)}</strong>
                    {item.status === "rejected" && <> <StatusBadge status="rejected" /></>}
                    <div style={mutedStyle}>{item.packId ? `${inr(item.packPrice)} / ${item.packName}` : `Unit price: ${inr(item.unitPrice)}`}</div>
                  </td>
                  <td><Badge variant="info">{r.group(item)}</Badge></td>
                  <td style={{ textAlign: "right" }}>{item.packId ? lineQuantityLabel(item, r.unit(item)) : `${formatQty(item.orderedQty)} ${r.unit(item)}`}</td>
                  <td style={{ textAlign: "right" }}>{inr(item.orderedQty * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </DetailPanel>
      ) : (
        <EmptyState title="Select an indent to view details" />
      )}
    </SplitView>
  );
};
