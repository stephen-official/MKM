import { ArrowLeft, Camera, Check, Loader2, PackageCheck, RotateCcw, Truck } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { api } from "../../api";
import { EXPIRY_CHIPS, STORAGE_OPTIONS, adminExpiryFor, arrivingProducts, emptyReceipt, expiryFromChip, expiryNeeded, productIdOf, receiptPayload, receiptProblems, receiptReady } from "../../features/kitchen/receiving";
import { formatDateKey, toLocalDateKey } from "../../utils/date";
import DateField from "../ui/DateField";
import "./SupplyRequestsDeliveries.css";
import "./KitchenReceive.css";

const BASE = "/procurement/collaborative-purchase-orders";
const qty = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const errorText = (error, fallback) => error?.response?.data?.message || fallback;
const amountText = (line) => (line.packId ? `${qty(line.packQuantity)} × ${line.packName}` : `${qty(line.qtyBaseUnit)} ${line.stockItemId?.unitId?.symbol || ""}`);

/** Shrinks a camera photo to at most 1600 px as JPEG so uploads stay small on kitchen data plans; the original if that fails. */
const shrinkPhoto = (file) => new Promise((resolve) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.85);
  };
  image.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
  image.src = url;
});

function PhotoButton({ label, url, busy, onPick }) {
  const input = useRef(null);
  return <div className={`kr-photo${url ? " is-done" : ""}`}>
    <button type="button" disabled={busy} onClick={() => input.current?.click()} aria-label={url ? `Retake ${label.toLowerCase()}` : label}>
      {url ? <img src={url} alt="" /> : <span className="kr-photo__icon">{busy ? <Loader2 size={26} className="kr-spin" /> : <Camera size={26} />}</span>}
      <strong>{busy ? "Uploading…" : url ? <><Check size={13} aria-hidden="true" /> {label}</> : label}</strong>
      {url && !busy && <small><RotateCcw size={11} aria-hidden="true" /> Retake</small>}
    </button>
    <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onPick(file); }} />
  </div>;
}

function Chips({ options, value, onPick, label }) {
  return <div className="kr-chips" role="group" aria-label={label}>
    {options.map((option) => <button key={option.key} type="button" className={value === option.key ? "is-on" : ""} aria-pressed={value === option.key} onClick={() => onPick(option.key)}>{option.label}</button>)}
  </div>;
}

/** One card per arriving product: two photos, expiry, manufacture date, batch number from the label, storage. */
function ItemCard({ order, line, form, today, onChange }) {
  const [uploading, setUploading] = useState({});
  const product = line.stockItemId || {};
  const problems = receiptProblems(line, form, today);
  const needsExpiry = expiryNeeded(line);
  const adminExpiry = adminExpiryFor(order, line);
  const chip = EXPIRY_CHIPS.find((candidate) => expiryFromChip(candidate.key, today) === form.expiryDate)?.key || "";

  const upload = async (kind, file) => {
    setUploading((previous) => ({ ...previous, [kind]: true }));
    try {
      const body = new FormData();
      body.append("photo", await shrinkPhoto(file), `${kind}.jpg`);
      const { data } = await api.post(`${BASE}/${order._id}/photos`, body, { headers: { "Content-Type": "multipart/form-data" } });
      onChange({ photos: { ...form.photos, [kind]: data.url } });
    } catch (error) {
      toast.error(errorText(error, "Photo did not upload. Check your connection and try again."));
    } finally {
      setUploading((previous) => ({ ...previous, [kind]: false }));
    }
  };

  return <article className={`srd-card kr-item${problems.length === 0 ? " is-ready" : ""}`}>
    <header className="kr-item__head">
      <div><h2>{product.name || "Item"}</h2><span>{amountText(line)}</span></div>
      {problems.length === 0 ? <span className="srd-status srd-status--positive"><Check size={13} aria-hidden="true" /> Ready</span> : <span className="srd-status srd-status--neutral">{problems.length} to do</span>}
    </header>

    <div className="kr-photos">
      <PhotoButton label="Photo of goods" url={form.photos.goods} busy={uploading.goods} onPick={(file) => upload("goods", file)} />
      <PhotoButton label="Photo of label" url={form.photos.label} busy={uploading.label} onPick={(file) => upload("label", file)} />
    </div>

    <div className="kr-field">
      <span className="kr-label">Expiry date{needsExpiry ? "" : " (optional)"}</span>
      <Chips label={`Expiry for ${product.name}`} options={EXPIRY_CHIPS} value={chip} onPick={(key) => onChange({ expiryDate: expiryFromChip(key, today) })} />
      <DateField value={form.expiryDate} min={today} label={`Expiry date for ${product.name}`} placeholder="Or pick the date from the label" onChange={(value) => onChange({ expiryDate: value })} />
      {adminExpiry && <small className="kr-prefill">{form.expiryDate === adminExpiry ? "Set by the central store. Change it if the label says otherwise." : `Central store said ${formatDateKey(adminExpiry)}.`}</small>}
    </div>

    <div className="kr-field">
      <span className="kr-label">Storage</span>
      <Chips label={`Storage for ${product.name}`} options={STORAGE_OPTIONS} value={form.storage} onPick={(key) => onChange({ storage: key })} />
    </div>

    <div className="kr-row">
      <div className="kr-field">
        <span className="kr-label">Made on (optional)</span>
        <DateField value={form.mfgDate} max={today} label={`Manufacture date for ${product.name}`} placeholder="Date on the label" onChange={(value) => onChange({ mfgDate: value })} />
      </div>
      <div className="kr-field">
        <span className="kr-label">Batch no. on label (optional)</span>
        <input type="text" value={form.lotNumber} maxLength={60} placeholder="e.g. B-4471" aria-label={`Batch number for ${product.name}`} onChange={(event) => onChange({ lotNumber: event.target.value })} />
      </div>
    </div>

    {problems.length > 0 && <p className="kr-todo">Still needed: {problems.join(", ")}</p>}
  </article>;
}

/** "Receive delivery" for a shared order: details per arriving item, then everything is added to stock at once. */
export default function KitchenReceiveItems({ order, lines, notSentCount = 0, onBack, onDone }) {
  const today = toLocalDateKey();
  const products = arrivingProducts(lines);
  const [forms, setForms] = useState(() => Object.fromEntries(products.map((line) => [productIdOf(line), emptyReceipt(adminExpiryFor(order, line))])));
  const [busy, setBusy] = useState(false);
  const ready = receiptReady(lines, forms, today);
  const readyCount = products.filter((line) => receiptProblems(line, forms[productIdOf(line)], today).length === 0).length;
  const update = (line, change) => setForms((previous) => ({ ...previous, [productIdOf(line)]: { ...previous[productIdOf(line)], ...change } }));

  const submit = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`${BASE}/${order._id}/receive`, receiptPayload(lines, forms));
      toast.success("Added to your stock");
      onDone(data);
    } catch (error) {
      toast.error(errorText(error, "Could not save. Check your connection and try again."));
      if (["ALREADY_DELIVERED", "NOT_DISPATCHED"].includes(error?.response?.data?.code)) onDone(null);
    } finally {
      setBusy(false);
    }
  };

  return <main className="srd-shell kr-shell">
    <button type="button" className="kr-back" onClick={onBack} disabled={busy}><ArrowLeft size={18} /> Back</button>
    <header className="srd-page-header"><div><p>Delivery</p><h1>Receive items</h1>
      <span>Take two photos of each item and enter the dates from the label. Only the items on the way are listed{notSentCount ? "; the rest will come later" : ""}.</span></div></header>

    <section className="kr-supplier" aria-label="Supplier">
      <Truck size={17} aria-hidden="true" />
      <div>
        <strong>{order.supplier?.name || "Supplier not recorded"}</strong>
        <small>{order.supplier?.fssaiLicence ? `FSSAI licence ${order.supplier.fssaiLicence}` : "FSSAI licence not recorded"} · {order.invoiceNo ? `Invoice ${order.invoiceNo}` : "Invoice: not yet"}</small>
      </div>
    </section>

    <section className="kr-items" aria-label="Items to receive">
      {products.map((line) => <ItemCard key={productIdOf(line)} order={order} line={line} form={forms[productIdOf(line)]} today={today} onChange={(change) => update(line, change)} />)}
    </section>

    <footer className="kr-submit"><div><strong>{readyCount} of {products.length}</strong><span>{products.length === 1 ? "item ready" : "items ready"}</span></div>
      <button type="button" className="srd-primary-button" disabled={busy || !ready} onClick={submit}>{busy ? "Saving…" : <><PackageCheck size={18} aria-hidden="true" /> Add to my stock</>}</button></footer>
  </main>;
}
