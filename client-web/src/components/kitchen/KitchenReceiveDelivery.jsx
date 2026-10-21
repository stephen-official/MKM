import { ArrowLeft, PackageCheck } from "lucide-react";
import "./KitchenSecondaryScreens.css";
import { outstandingEntryQuantity } from "../../features/kitchen/workflows";
import DateField from "../ui/DateField";

export default function KitchenReceiveDelivery({ indent, values = {}, details = {}, onChange, onDetailsChange, onBack, onSubmit }) {
  const items = (indent?.items || []).filter((item) => item.status === "approved" && Number(item.receivedQty || 0) < Number(item.qtyBaseUnit || 0));
  return <main className="kss-shell">
    <button type="button" className="kss-back" onClick={onBack}><ArrowLeft size={18} /> Back to deliveries</button>
    <header className="kss-header"><span><PackageCheck size={23} /></span><div><p>Incoming supplies</p><h1>Receive delivery</h1><small>Enter the physical quantity received for each item.</small></div></header>
    <section className="kss-receive-list">
      {items.map((item) => {
        const id = String(item.stockItemId?._id || item.stockItemId);
        const remaining = outstandingEntryQuantity(item);
        const baseUnit = item.stockItemId?.unitId?.symbol || item.unit || "units";
        const unit = item.packName || baseUnit;
        const received = item.packId ? Number(item.receivedQty || 0) / Number(item.packSize) : Number(item.receivedQty || 0);
        const checklist = details[id] || {};
        return <article key={id}><div><h2>{item.stockItemId?.name || "Unknown item"}</h2><p>Previously received: {received.toLocaleString("en-IN", { maximumFractionDigits: 3 })} {unit}</p></div><label><span>Outstanding: <strong>{remaining.toLocaleString("en-IN", { maximumFractionDigits: 3 })} {unit}</strong></span><input type="number" inputMode="decimal" min="0" max={remaining} step="0.001" placeholder="0" value={values[id] ?? ""} onChange={(event) => onChange(id, event.target.value, remaining)} /></label><label><span>Expiry date</span><DateField value={checklist.expiryDate || ""} label="Expiry date" placeholder="Choose expiry date" onChange={(value) => onDetailsChange(id, { expiryDate: value })} /></label><label><span>Condition</span><select value={checklist.condition || "good"} onChange={(event) => onDetailsChange(id, { condition: event.target.value })}><option value="good">Good</option><option value="partial_damage">Partly damaged</option><option value="damaged">Damaged</option></select></label><label><span>Batch / lot number</span><input type="text" value={checklist.lotNumber || ""} onChange={(event) => onDetailsChange(id, { lotNumber: event.target.value })} /></label><label><span>Notes</span><textarea rows="2" value={checklist.notes || ""} onChange={(event) => onDetailsChange(id, { notes: event.target.value })} /></label></article>;
      })}
    </section>
    <footer className="kss-submit"><div><strong>{Object.values(values).filter((value) => Number(value) > 0).length}</strong><span>items entered</span></div><button type="button" onClick={onSubmit} disabled={!Object.values(values).some((value) => Number(value) > 0)}>Confirm received</button></footer>
  </main>;
}
