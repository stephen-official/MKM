import { useCallback, useEffect, useState } from "react";
import { api } from "../../api.js";
import { useToast } from "../../useToast.js";
import { formatDateTime } from "../../businessTime.js";
import { Badge, Button, DataTable, EmptyState, ErrorState, Field, LoadingState, Modal } from "../../components/ui/index.jsx";
import { useConfirm } from "../../components/ui/useConfirm.jsx";
import { errMsg } from "../indent/helpers.js";
import { correctionChanges, describeCorrection } from "./correctionSummary.js";
import "./corrections.css";

const STATUS = { pending: "Waiting", approved: "Approved", rejected: "Rejected" };
const TONE = { pending: "warn", approved: "success", rejected: "neutral" };
const CHANGE = { changed: "Changed", removed: "Removed", added: "Added", same: "" };
const qty = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });

/**
 * Corrections kitchens asked for: usage to record on a day marked "no usage" by mistake, or new lines for a usage
 * record (none = cancel it). Each row says in a few words what changes; Details shows every line before and after.
 * Approving makes the change (stock moves with it); rejecting changes nothing and sends the note to the kitchen.
 * onCount reports open ones; onApplied fires after an approval so the records list can reload.
 */
export const CorrectionsPanel = ({ onCount, onApplied }) => {
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirm();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(null); // { row, note }
  const [details, setDetails] = useState(null); // the row whose before/after table is open

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
      setDetails(null);
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
      setDetails(null);
      await load();
    } catch (err) {
      showToast(errMsg(err, "Could not reject"), "error");
    } finally {
      setBusy(false);
    }
  };

  const actions = (r) => r.status === "pending" ? (
    <div className="row-actions">
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => setDetails(r)}>Details</Button>
      <Button size="sm" disabled={busy} onClick={() => approve(r)}>Approve</Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => setRejecting({ row: r, note: "" })}>Reject</Button>
    </div>
  ) : (
    <div className="row-actions">
      <Button size="sm" variant="ghost" onClick={() => setDetails(r)}>Details</Button>
      <Badge variant={TONE[r.status] || "neutral"}>{STATUS[r.status] || r.status}</Badge>
    </div>
  );

  let body;
  if (rows === null) body = <LoadingState label="Loading corrections…" />;
  else if (error) body = <ErrorState message={error} onRetry={load} />;
  else if (rows.length === 0) body = <EmptyState title="No corrections">When a kitchen edits a recorded day, its request appears here for approval.</EmptyState>;
  else {
    body = (
      <ul className="corrections">
        {rows.map((r) => {
          const { title, lines } = describeCorrection(r);
          return (
            <li key={r._id} className={`correction correction--${r.status}`}>
              <div>
                <strong>{title}</strong>
                <p>{[r.requestedBy && `asked by ${r.requestedBy}`, formatDateTime(r.createdAt)].filter(Boolean).join(" · ")}</p>
                {lines.map((text) => <p key={text} className="correction__line">{text}</p>)}
                {r.note && <p className="correction__note">“{r.note}”</p>}
                {r.status !== "pending" && (
                  <p className="correction__decision">
                    {r.status === "approved" ? "Approved" : `Rejected: ${r.decisionNote}`}{r.decidedBy && ` · ${r.decidedBy}`}{r.decidedAt && ` · ${formatDateTime(r.decidedAt)}`}
                  </p>
                )}
              </div>
              {actions(r)}
            </li>
          );
        })}
      </ul>
    );
  }

  const changes = details ? correctionChanges(details) : [];
  return (
    <div className="corrections-page">
      {body}
      {dialog}
      {details && (
        <Modal title={describeCorrection(details).title} onClose={() => setDetails(null)} wide actions={(
          details.status === "pending" ? (
            <>
              <Button variant="ghost" disabled={busy} onClick={() => setRejecting({ row: details, note: "" })}>Reject</Button>
              <Button disabled={busy} onClick={() => approve(details)}>Approve</Button>
            </>
          ) : <Button variant="ghost" onClick={() => setDetails(null)}>Close</Button>
        )}>
          {describeCorrection(details).lines.map((text) => <p key={text} className="correction__line">{text}</p>)}
          <DataTable className="correction-table">
            <thead><tr><th>Item</th><th>{details.kind === "reopen_day" ? "Marked" : "Before"}</th><th>After</th><th>Change</th></tr></thead>
            <tbody>
              {changes.map((change) => (
                <tr key={change.name} className={`correction-table__row--${change.kind}`}>
                  <td>{change.name}</td>
                  <td>{change.before === null ? (details.kind === "reopen_day" ? "No usage" : "—") : `${qty(change.before)} ${change.unit}`}</td>
                  <td>{change.after === null ? "—" : `${qty(change.after)} ${change.unit}`}</td>
                  <td>{CHANGE[change.kind]}</td>
                </tr>
              ))}
              {changes.length === 0 && <tr><td colSpan={4}>No lines.</td></tr>}
            </tbody>
          </DataTable>
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
    </div>
  );
};
