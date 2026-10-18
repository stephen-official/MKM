import { ArrowLeft, Boxes, Minus, Plus, Search, Send, X } from "lucide-react";
import "./KitchenTransactions.css";
import { productPacks } from "../../features/kitchen";

const idOf = (item) => item.stockRecordId || item.stockItemId || item._id;

export default function KitchenItemBuilder({ type, items = [], cart = [], loading, search, onSearch, onQuantityChange, onPackagingChange, onCancel }) {
  const isTransfer = type === "transfer";
  const selectedQuantity = (item) => cart.find((entry) => String(idOf(entry)) === String(idOf(item)))?.requestedQty ?? "";
  return <main className="ktb-shell">
    <button type="button" className="ktb-back" onClick={onCancel}><ArrowLeft size={18} /> {isTransfer ? "Back to transfers" : "Back to requests"}</button>
    <header className="ktb-heading">
      <span aria-hidden="true">{isTransfer ? <Send size={24} /> : <Boxes size={24} />}</span>
      <div><p>{isTransfer ? "Between kitchens" : "Kitchen supplies"}</p><h1>{isTransfer ? "Create stock transfer" : "Create supply request"}</h1><small>{isTransfer ? "Choose the items and quantities to send." : "Choose the supplies your kitchen needs."}</small></div>
    </header>
    <label className="ktb-search"><Search size={20} /><span className="ktb-sr-only">Search supplies</span><input type="search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search supplies" />{search && <button type="button" onClick={() => onSearch("")} aria-label="Clear search"><X size={18} /></button>}</label>
    {loading ? <div className="ktb-state">Loading supplies…</div> : items.length === 0 ? <div className="ktb-state"><Search size={28} /><strong>No supplies found</strong><span>Try another item name.</span></div> : <section className="ktb-list" aria-label="Available supplies">
      {items.map((item) => {
        const raw = selectedQuantity(item);
        const quantity = Number(raw || 0);
        const unit = item.unit || "units";
        const selected = cart.find((entry) => String(idOf(entry)) === String(idOf(item)));
        const packs = productPacks(item);
        const entryUnit = selected?.packName || unit;
        return <article className={`ktb-card${quantity > 0 ? " ktb-card--selected" : ""}`} key={idOf(item)}>
          <div className="ktb-card__identity"><span aria-hidden="true">{String(item.name || "?").charAt(0)}</span><div><h2>{item.name}</h2>{isTransfer && <p>Available: {Number(item.currentQty || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 })} {unit}</p>}</div></div>
          <div className="ktb-entry"><label htmlFor={`builder-${idOf(item)}`}>Quantity</label>{packs.length > 0 && !isTransfer && <select aria-label={`Packaging for ${item.name}`} value={selected?.packId || "base"} onChange={(event) => onPackagingChange?.(item, event.target.value)}><option value="base">{unit}</option>{packs.map((pack) => <option key={pack._id} value={pack._id}>{pack.name} ({pack.size} {unit})</option>)}</select>}<div><button type="button" onClick={() => onQuantityChange(item, Math.max(0, quantity - 1))} disabled={quantity <= 0} aria-label={`Decrease ${item.name}`}><Minus size={17} /></button><input id={`builder-${idOf(item)}`} type="text" inputMode="decimal" value={raw} placeholder="0" onChange={(event) => onQuantityChange(item, event.target.value)} /><span>{entryUnit}</span><button type="button" onClick={() => onQuantityChange(item, quantity + 1)} aria-label={`Increase ${item.name}`}><Plus size={17} /></button></div></div>
        </article>;
      })}
    </section>}
  </main>;
}
