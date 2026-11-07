import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, Minus, Plus } from "lucide-react";
import { api } from "../../api.js";
import { useToast } from "../../useToast.js";
import { formatDateTime } from "../../businessTime.js";
import { Button, EmptyState, ErrorState, Field, LoadingState, Modal } from "../../components/ui/index.jsx";
import { useConfirm } from "../../components/ui/useConfirm.jsx";
import { errMsg } from "../shared/format.js";
import { correctionChanges, describeCorrection, longDay } from "./correctionSummary.js";
import "./corrections.css";

const STATUS = { pending: { label: "Waiting for you", tone: "soon" }, approved: { label: "Approved", tone: "routine" }, rejected: { label: "Rejected", tone: "expired" } };
const qty = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const amount = (value, unit) => (value === null ? "—" : `${qty(value)} ${unit}`.trim());

/* One ticket row: before → after with an arrow saying what happened (up, down, new, removed). */
const ChangeRow = ({ change, reopen }) => {
  const kind = change.kind === "changed" ? (Number(change.after) > Number(change.before) ? "up" : "down") : change.kind;
  const icon = kind === "up" ? <ArrowUp size={14} aria-hidden="true" />
    : kind === "down" ? <ArrowDown size={14} aria-hidden="true" />
    : kind === "added" ? <Plus size={14} aria-hidden="true" />
    : kind === "removed" ? <Minus size={14} aria-hidden="true" /> : null;
  const word = kind === "up" ? "More" : kind === "down" ? "Less" : kind === "added" ? "New" : kind === "removed" ? "Removed" : "Same";
  return (
    <li className={`correction-ticket__row correction-ticket__row--${kind}`}>
      <div className="correction-ticket__name"><strong>{change.name}</strong><small>{change.unit}</small></div>
      <div className="correction-ticket__amounts">
        <span className="correction-ticket__before">{reopen ? "No usage" : amount(change.before, change.unit)}</span>
        <span className="correction-ticket__arrow" aria-hidden="true">→</span>
        <span className="correction-ticket__after">{amount(change.after, change.unit)}</span>
      </div>
      <span className={`correction-ticket__tag correction-ticket__tag--${kind}`}>{icon}{word}</span>
    </li>
  );
};

/**
 * Corrections kitchens asked for: usage to record on a day marked "no usage" by mistake, or new lines for a usage
 * record (none = cancel it). One card per ask: the date, two or three plain lines, and a chevron that opens the
 * ticket, where every line shows before → after with an arrow. Approve (in the ticket) makes the change and stock moves
 * with it; Reject changes nothing and sends the note to the kitchen. onCount reports open ones; onApplied fires
 * after an approval so the records list can reload.
 */
export const CorrectionsPanel = ({ onCount, onApplied }) => {
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirm();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(null); // { row, note }
  const [open, setOpen] = useState(null); // the row whose ticket is open

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/usage-corrections");
      setRows(data || []);
      setError("");
      onCount?.((data || []).filter((r) => r.status === "pending").length);
    } catch (err) {
      setRows([]);
      setError(errMsg(err, "Failed to load corrections"));
    }
  }, [onCount]);
  useEffect(() => { load(); }, [load]);

  const approve = async (row) => {
    const { title } = describeCorrection(row);
    const ok = await confirm({
      title: `Approve: ${title}?`,
      message: row.kind === "reopen_day"
        ? "The \"no usage\" mark is removed and this usage is recorded for the kitchen. Stock is deducted now."
        : (row.items || []).length === 0
          ? "The record is deleted and every quantity goes back into the kitchen's stock."
          : "The record's lines are replaced and stock moves by the difference.",
      confirmLabel: "Approve"
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.post(`/usage-corrections/${row._id}/approve`, {});
      showToast("Approved. The kitchen's records and stock are updated.", "success");
      setOpen(null);
      await load();
      onApplied?.();
    } catch (err) {
      showToast(errMsg(err, "Could not approve"), "error");
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!rejecting?.note.trim()) return;
    setBusy(true);
    try {
      await api.post(`/usage-corrections/${rejecting.row._id}/reject`, { note: rejecting.note.trim() });
      showToast("Rejected. The kitchen sees your note.", "success");
      setRejecting(null);
      setOpen(null);
      await load();
    } catch (err) {
      showToast(errMsg(err, "Could not reject"), "error");
    } finally {
      setBusy(false);
    }
  };

  let body;
  if (rows === null) body = <LoadingState label="Loading corrections…" />;
  else if (error) body = <ErrorState message={error} onRetry={load} />;
  else if (rows.length === 0) body = <EmptyState className="kg-glass corrections-empty" title="No corrections">When a kitchen edits a recorded day, its request appears here for approval.</EmptyState>;
  else {
    body = (
      <ul className="corrections" aria-label="Corrections">
        {rows.map((r) => {
          const { lines } = describeCorrection(r);
          const status = STATUS[r.status] || STATUS.pending;
          const what = r.kind === "reopen_day" ? "Record usage" : (r.items || []).length === 0 ? "Cancel usage record" : "Change usage";
          return (
            // The whole card opens the ticket; the chevron stays as the keyboard-reachable control.
            <li key={r._id} className={`kg-glass kg-lift correction correction--${r.status}${r.status === "pending" ? " kg-glass--cool" : ""}`} onClick={() => setOpen(r)}>
              <div className="correction__top">
                <div>
                  <p className="kg-label">{r.kitchen?.name || "Kitchen"} · {what}</p>
                  <h2>{longDay(r.date)}</h2>
                </div>
                <button type="button" className="kg-chip correction__open" onClick={(event) => { event.stopPropagation(); setOpen(r); }} aria-label={`Open the ticket for ${longDay(r.date)}`}>
                  <ArrowUpRight size={18} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>
              {lines.map((text) => <p key={text} className="correction__line">{text}</p>)}
              {r.note && <p className="correction__note">“{r.note}”</p>}
              <div className="correction__foot">
                <span className={`kg-pill kg-pill--${status.tone}`}>{status.label}</span>
                <p>{r.status === "pending"
                  ? [r.requestedBy && `asked by ${r.requestedBy}`, formatDateTime(r.createdAt)].filter(Boolean).join(" · ")
                  : [r.status === "approved" ? "Approved" : `Rejected: ${r.decisionNote}`, r.decidedBy, r.decidedAt && formatDateTime(r.decidedAt)].filter(Boolean).join(" · ")}</p>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  const changes = open ? correctionChanges(open) : [];
  const openStatus = open ? STATUS[open.status] || STATUS.pending : null;
  return (
    <div className="corrections-page">
      {body}
      {open && (
        <Modal title={`${open.kitchen?.name || "Kitchen"} · ${longDay(open.date)}`} onClose={() => !busy && setOpen(null)} actions={(
          open.status === "pending" ? (
            <>
              <Button variant="ghost" disabled={busy} onClick={() => setRejecting({ row: open, note: "" })}>Reject</Button>
              <Button disabled={busy} onClick={() => approve(open)}>Approve</Button>
            </>
          ) : <Button variant="ghost" onClick={() => setOpen(null)}>Close</Button>
        )}>
          <section className="kg-glass correction-ticket" aria-label="Correction ticket">
            <header className="correction-ticket__head">
              <div><p className="kg-label">Correction ticket</p><h3>{changes.length} {changes.length === 1 ? "item" : "items"}</h3></div>
              <span className={`kg-pill kg-pill--${openStatus.tone}`}>{openStatus.label}</span>
            </header>
            <dl className="correction-ticket__meta">
              <div><dt>Usage date</dt><dd>{longDay(open.date)}</dd></div>
              <div><dt>Asked by</dt><dd>{[open.requestedBy, formatDateTime(open.createdAt)].filter(Boolean).join(" · ")}</dd></div>
            </dl>
            {describeCorrection(open).lines.map((text) => <p key={text} className="correction-ticket__line">{text}</p>)}
            <ul className="correction-ticket__rows">
              <li className="correction-ticket__cols" aria-hidden="true"><span>Item</span><span>{open.kind === "reopen_day" ? "Marked → After" : "Before → After"}</span><span>Change</span></li>
              {changes.map((change) => <ChangeRow key={change.name} change={change} reopen={open.kind === "reopen_day"} />)}
              {changes.length === 0 && <li className="correction-ticket__empty">No lines.</li>}
            </ul>
            {open.status !== "pending" && open.decisionNote && <p className="correction-ticket__line">Note to the kitchen: {open.decisionNote}</p>}
          </section>
        </Modal>
      )}
      {rejecting && (
        <Modal title={`Reject: ${describeCorrection(rejecting.row).title}?`} onClose={() => !busy && setRejecting(null)} actions={(
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="danger" disabled={busy || !rejecting.note.trim()} onClick={reject}>Reject</Button>
          </>
        )}>
          <Field label="Reason the kitchen will see">
            <textarea rows={3} value={rejecting.note} maxLength={300} onChange={(e) => setRejecting({ ...rejecting, note: e.target.value })} />
          </Field>
        </Modal>
      )}
      {/* Last, so the confirm box sits above the ticket modal. */}
      {dialog}
    </div>
  );
};
