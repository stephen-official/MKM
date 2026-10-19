import { AlertTriangle, ArrowLeft, Camera, Check, Loader2, Mic, PackageCheck, RotateCcw, Square, Trash2, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { api } from "../../api";
import { EXPIRY_CHIPS, PROBLEM_REASONS, STORAGE_OPTIONS, adminExpiryFor, arrivingProducts, emptyProblem, emptyReceipt, usableQty, expiryFromChip, expiryNeeded, productIdOf, receiptPayload, receiptProblems, receiptReady } from "../../features/kitchen/receiving";
import { formatDateKey, toLocalDateKey } from "../../utils/date";
import DateField from "../ui/DateField";
import "./SupplyRequestsDeliveries.css";
import "./KitchenReceive.css";

const BASE = "/procurement/collaborative-purchase-orders";
const qty = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const errorText = (error, fallback) => error?.response?.data?.message || fallback;
const unitOf = (line) => line.stockItemId?.unitId?.symbol || "";
const amountText = (line) => (line.packId ? `${qty(line.packQuantity)} × ${line.packName}` : `${qty(line.qtyBaseUnit)} ${unitOf(line)}`);

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

const canRecord = () => typeof window !== "undefined" && Boolean(window.MediaRecorder && navigator.mediaDevices?.getUserMedia);
const recordingType = () => ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || "";

/** Tap to record, tap to stop; the note uploads straight away. Hidden where the browser cannot record. */
function VoiceNote({ orderId, url, onChange }) {
  const [state, setState] = useState("idle"); // idle | recording | uploading
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef(null);
  useEffect(() => {
    if (state !== "recording") return undefined;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [state]);
  useEffect(() => () => { try { recorder.current?.stream?.getTracks().forEach((track) => track.stop()); } catch { /* nothing to stop */ } }, []);
  if (!canRecord()) return null;

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = recordingType();
      const media = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks = [];
      media.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
      media.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setState("uploading");
        try {
          const blob = new Blob(chunks, { type: media.mimeType || type || "audio/webm" });
          const body = new FormData();
          body.append("audio", blob, `note.${(blob.type.includes("mp4") ? "m4a" : "webm")}`);
          const { data } = await api.post(`${BASE}/${orderId}/voice-notes`, body, { headers: { "Content-Type": "multipart/form-data" } });
          onChange(data.url);
        } catch (error) {
          toast.error(errorText(error, "Voice note did not upload. Try again."));
        } finally {
          setState("idle");
        }
      };
      recorder.current = media;
      media.start();
      setSeconds(0);
      setState("recording");
      // Stop by itself after two minutes so a forgotten recording does not grow.
      setTimeout(() => { if (media.state === "recording") media.stop(); }, 120_000);
    } catch {
      toast.error("Could not use the microphone. Allow it in the phone's settings and try again.");
    }
  };
  const stop = () => recorder.current?.stop();

  if (url) return <div className="kr-voice is-done">
    <audio controls src={url} preload="none" />
    <button type="button" className="kr-voice__remove" onClick={() => onChange("")} aria-label="Remove voice note"><Trash2 size={16} /> Remove</button>
  </div>;
  return <button type="button" className={`kr-voice__record${state === "recording" ? " is-recording" : ""}`} disabled={state === "uploading"} onClick={state === "recording" ? stop : start}>
    {state === "uploading" ? <><Loader2 size={18} className="kr-spin" /> Uploading…</>
      : state === "recording" ? <><Square size={18} /> Stop ({seconds}s)</>
        : <><Mic size={18} /> Record a voice note (optional)</>}
  </button>;
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
  const problem = form.problem;
  const usable = usableQty(problem);
  const needsExpiry = problem ? usable > 0 && expiryNeeded(line) : expiryNeeded(line);
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

  return <article className={`srd-card kr-item${problems.length === 0 ? " is-ready" : ""}${problem ? " has-problem" : ""}`}>
    <header className="kr-item__head">
      <div><h2>{product.name || "Item"}</h2><span>{amountText(line)}</span></div>
      {problems.length === 0 ? <span className={`srd-status srd-status--${problem ? "warning" : "positive"}`}><Check size={13} aria-hidden="true" /> {problem ? "Problem ready to send" : "Ready"}</span> : <span className="srd-status srd-status--neutral">{problems.length} to do</span>}
    </header>

    <div className="kr-photos">
      <PhotoButton label="Photo of goods" url={form.photos.goods} busy={uploading.goods} onPick={(file) => upload("goods", file)} />
      <PhotoButton label={problem ? "Photo of label (optional)" : "Photo of label"} url={form.photos.label} busy={uploading.label} onPick={(file) => upload("label", file)} />
    </div>

    <button type="button" className={`kr-problem-toggle${problem ? " is-on" : ""}`} aria-pressed={Boolean(problem)} onClick={() => onChange({ problem: problem ? null : emptyProblem() })}>
      <AlertTriangle size={17} aria-hidden="true" /> {problem ? "Problem with this item — tap to cancel" : "Problem with this item?"}
    </button>

    {problem && <div className="kr-problem">
      <div className="kr-field">
        <span className="kr-label">What went wrong</span>
        <Chips label={`Problem with ${product.name}`} options={PROBLEM_REASONS} value={problem.reason} onPick={(key) => onChange({ problem: { ...problem, reason: key } })} />
      </div>
      <div className="kr-field">
        <span className="kr-label">Usable amount that arrived ({unitOf(line) || "units"})</span>
        <input type="text" inputMode="decimal" value={problem.receivedQty} placeholder="0" aria-label={`Usable amount of ${product.name} that arrived`}
          onChange={(event) => /^\d*(\.\d{0,3})?$/.test(event.target.value) && onChange({ problem: { ...problem, receivedQty: event.target.value } })} />
        <small className="kr-prefill">Ordered: {qty(line.qtyBaseUnit)} {unitOf(line)}. Enter 0 if none of it can be used.</small>
      </div>
      <div className="kr-field">
        <span className="kr-label">Tell the central store (optional)</span>
        <textarea rows={2} value={problem.note} maxLength={500} placeholder="e.g. two bags torn and wet" aria-label={`Note about ${product.name}`} onChange={(event) => onChange({ problem: { ...problem, note: event.target.value } })} />
      </div>
      <VoiceNote orderId={order._id} url={problem.voiceNoteUrl} onChange={(url) => onChange({ problem: { ...problem, voiceNoteUrl: url } })} />
      <p className="kr-hint">The central store will check this and decide what goes into your stock. The usable part still needs its details below.</p>
    </div>}

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
      const raised = Object.values(forms).filter((form) => form.problem).length;
      toast.success(raised ? `Saved. ${raised === 1 ? "1 problem" : `${raised} problems`} sent to the central store` : "Added to your stock");
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
      <button type="button" className="srd-primary-button" disabled={busy || !ready} onClick={submit}>{busy ? "Saving…" : <><PackageCheck size={18} aria-hidden="true" /> {Object.values(forms).some((form) => form.problem) ? "Save & send problems" : "Add to my stock"}</>}</button></footer>
  </main>;
}
