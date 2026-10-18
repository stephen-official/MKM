import { FileSpreadsheet, Pencil, Save, Trash2, X } from "lucide-react";
import { Badge, Button, DataTable, DetailPanel, Meta } from "../../components/ui/index.jsx";
import { formatTime, getGroupName, idOf, recordDisplayDate } from "./helpers.js";

export const ConsumptionDetail = ({
  record,
  editing,
  editItems,
  saving,
  deleting,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onQtyChange,
  onRemoveItem,
  onExport
}) => {
  const rows = editing ? editItems : record.items || [];

  const head = (
    <>
      <Meta label="Date">{recordDisplayDate(record)}</Meta>
      <Meta label="Time">{formatTime(record.createdAt)}</Meta>
      {record.reason && <Meta label="Reason">{record.reason}</Meta>}
      <Meta label="Authorised by" align="end">
        {record.userId?.name || "-"}
        <span className="page-subtitle" style={{ display: "block", fontWeight: 400 }}>
          {record.godownId?.name}
        </span>
      </Meta>
    </>
  );

  const foot = (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginRight: "auto" }}>
        {editing ? (
          <>
            <Button variant="success" onClick={onSave} disabled={saving}>
              <Save size={16} /> {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button variant="ghost" onClick={onCancelEdit} disabled={saving}>
              <X size={16} /> Cancel
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onEdit} disabled={deleting}>
              <Pencil size={16} /> Edit quantities
            </Button>
            <Button variant="danger" onClick={onDelete} disabled={deleting}>
              <Trash2 size={16} /> {deleting ? "Deleting…" : "Delete"}
            </Button>
          </>
        )}
      </div>
      <Button variant="success" onClick={onExport}>
        <FileSpreadsheet size={16} /> Export to Excel (.xlsx)
      </Button>
    </>
  );

  return (
    <DetailPanel head={head} foot={foot}>
      <DataTable>
        <thead>
          <tr>
            <th scope="col">Stock item</th>
            <th scope="col">Stock group</th>
            <th scope="col" style={{ textAlign: "right" }}>Quantity</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="page-subtitle">No items in this record.</td>
            </tr>
          )}
          {rows.map((item, idx) => {
            const itemId = idOf(item.stockItemId);
            const unit = editing ? item.unit : item.stockItemId?.unitId?.symbol;
            const name = editing ? item.name : item.stockItemId?.name;
            return (
              <tr key={`${itemId}-${idx}`}>
                <td>
                  <div style={{ fontWeight: 650 }}>{name || "Unknown item"}</div>
                  <div className="page-subtitle">ID: {itemId.slice(-6).toUpperCase()}</div>
                </td>
                <td>
                  <Badge variant="success">{editing ? item.group : getGroupName(item)}</Badge>
                </td>
                <td style={{ textAlign: "right" }}>
                  {editing ? (
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.001"
                        aria-label={`Quantity for ${name || "item"}`}
                        value={item.qtyBaseUnit}
                        onChange={(e) => onQtyChange(idx, e.target.value)}
                        onBlur={(e) => {
                          if (e.target.value !== "") {
                            onQtyChange(idx, Number(e.target.value).toFixed(3).replace(/\.?0+$/, "") || "0");
                          }
                        }}
                        placeholder="0.000"
                        style={{ width: 110, textAlign: "right", fontWeight: 650 }}
                      />
                      <span className="page-subtitle">{unit}</span>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onRemoveItem(idx)}
                        aria-label={`Remove ${name || "item"}`}
                        title="Remove item"
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontWeight: 650 }}>{item.qtyBaseUnit}</span>
                      <span className="page-subtitle" style={{ marginLeft: 4, display: "inline" }}>{unit}</span>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>
    </DetailPanel>
  );
};
