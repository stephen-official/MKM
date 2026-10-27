import { useEffect, useState } from "react";
import { Send, X } from "lucide-react";
import { formatDateKey } from "../../utils/date";
import { NO_USAGE_REASON_LABEL, REOPEN_REASONS } from "../../features/kitchen/corrections";
import "./ReportMistakeSheet.css";

/**
 * "Report a mistake" for a day marked "no usage": the cook says why the day should be open again and the ask goes to
 * the admin. Nothing changes on the phone until the admin approves. onSubmit(reason, note) resolves true when sent.
 */
export default function ReportMistakeSheet({ date, markReason = "", onClose, onSubmit }) {
  const [reason, setReason] = useState("ticked_by_mistake");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  // Escape closes the sheet; the page behind does not scroll while it is open.
  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape" && !event.defaultPrevented) onClose(); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const needsNote = reason === "other";
  const canSend = !sending && (!needsNote || note.trim().length > 0);
  const send = async () => {
    if (!canSend) return;
    setSending(true);
    const ok = await onSubmit?.(reason, note.trim());
    setSending(false);
    if (ok) onClose();
  };

  return (
    <div className="krm-layer" role="presentation">
      <button type="button" className="krm-backdrop" onClick={onClose} aria-label="Close" />
      <section className="krm-panel" role="dialog" aria-modal="true" aria-labelledby="report-mistake-title">
        <header className="krm-head">
          <div><p className="kg-label">No usage · {formatDateKey(date)}{markReason && ` · ${NO_USAGE_REASON_LABEL[markReason] || markReason}`}</p><h2 id="report-mistake-title">Report a mistake</h2></div>
          <button type="button" className="kg-chip krm-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="krm-body">
          <section className="kg-glass krm-form" aria-label="What went wrong">
            <p className="krm-label">Why should this day be opened again?</p>
            <div className="krm-chips" role="group" aria-label="Reason">
              {REOPEN_REASONS.map(([key, label]) => (
                <button type="button" key={key} className={reason === key ? "is-on" : ""} aria-pressed={reason === key} disabled={sending} onClick={() => setReason(key)}>{label}</button>
              ))}
            </div>
            <input className="krm-note" type="text" value={note} maxLength={200} disabled={sending}
              placeholder={needsNote ? "What happened?" : "Anything to add? (optional)"} aria-label="What happened?"
              onChange={(event) => setNote(event.target.value)} />
            <button type="button" className="kg-btn krm-submit" disabled={!canSend} onClick={send}>
              <Send size={16} aria-hidden="true" />{sending ? "Sending…" : "Send to the admin"}
            </button>
            <p className="krm-hint">An admin will reopen the day. You can record usage for it once they approve.</p>
          </section>
        </div>
      </section>
    </div>
  );
}
