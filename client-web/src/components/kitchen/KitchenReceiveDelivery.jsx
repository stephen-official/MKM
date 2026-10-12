import { ArrowLeft, PackageCheck } from "lucide-react";
import "./KitchenSecondaryScreens.css";

export default function KitchenReceiveDelivery({ indent, values = {}, onChange, onBack, onSubmit }) {
  const items = (indent?.items || []).filter((item) => item.status === "approved" && Number(item.receivedQty || 0) < Number(item.qtyBaseUnit || 0));
  return <main className="kss-shell">
    <button type="button" className="kss-back" onClick={onBack}><ArrowLeft size={18} /> Back to deliveries</button>
    <header className="kss-header"><span><PackageCheck size={23} /></span><div><p>Incoming supplies</p><h1>Receive delivery</h1><small>Enter the physical quantity received for each item.</small></div></header>
    <section className="kss-receive-list">
      {items.map((item) => {
        const id = String(item.stockItemId?._id || item.stockItemId);
        const remaining = Math.max(0, Number(item.qtyBaseUnit || 0) - Number(item.receivedQty || 0));
        const unit = item.stockItemId?.unitId?.symbol || item.unit || "units";
        return <article key={id}><div><h2>{item.stockItemId?.name || "Unknown item"}</h2><p>Previously received: {Number(item.receivedQty || 0).toLocaleString("en-IN")} {unit}</p></div><label><span>Outstanding: <strong>{remaining.toLocaleString("en-IN")} {unit}</strong></span><input type="number" inputMode="decimal" min="0" max={remaining} step="0.001" placeholder="0" value={values[id] ?? ""} onChange={(event) => onChange(id, event.target.value, remaining)} /></label></article>;
      })}
    </section>
    <footer className="kss-submit"><div><strong>{Object.values(values).filter((value) => Number(value) > 0).length}</strong><span>items entered</span></div><button type="button" onClick={onSubmit} disabled={!Object.values(values).some((value) => Number(value) > 0)}>Confirm received</button></footer>
  </main>;
}
