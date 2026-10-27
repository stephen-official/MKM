import { useCallback, useEffect, useState } from "react";
import { api } from "../../api.js";
import { useToast } from "../../useToast.js";
import { formatDateTime } from "../../businessTime.js";
import { Badge, Button, EmptyState, ErrorState, Field, LoadingState, Modal } from "../../components/ui/index.jsx";
import { useConfirm } from "../../components/ui/useConfirm.jsx";
import { errMsg } from "../indent/helpers.js";
import "./corrections.css";

// Keep in step with REOPEN_REASONS in backend/src/models/UsageCorrectionModel.js.
const REASON = { ticked_by_mistake: "Ticked by mistake", stock_was_used: "The kitchen did use stock", other: "Other" };
const STATUS = { pending: "Waiting", approved: "Reopened", rejected: "Rejected" };
const TONE = { pending: "warn", approved: "success", rejected: "neutral" };

/* "27 Oct 2026" from a business date (YYYY-MM-DD) without a timezone shift. */
const longDay = (dateKey) => {
  const [y, m, d] = String(dateKey || "").split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : dateKey || "-";
};

/**
 * Corrections kitchens asked for: a day marked "no usage" by mistake. Approving removes the mark so the kitchen can
 * record usage for that day; rejecting keeps it closed and sends the note to the kitchen. onCount reports open ones.
 */
export const CorrectionsPanel = ({ onCount }) => {
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirm();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(null); // { row, note }

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
    const ok = await confirm({
      title: `Reopen ${longDay(row.date)} for ${row.kitchen?.name || "the kitchen"}?`,
      message: "The \"no usage\" mark is removed and the kitchen can record usage for that day again.",
      confirmLabel: "Reopen day"
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.post(`/usage-corrections/${row._id}/approve`, {});
      showToast("Day reopened. The kitchen has been told.", "success");
      await load();
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
      showToast("Correction rejected. The kitchen sees your note.", "success");
      setRejecting(null);
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
  else if (rows.length === 0) body = <EmptyState title="No corrections">When a kitchen marks a day as "no usage" by mistake, its request to reopen the day appears here.</EmptyState>;
  else {
    body = (
      <ul className="corrections">
        {rows.map((r) => (
          <li key={r._id} className={`correction correction--${r.status}`}>
            <div>
              <strong>Reopen {longDay(r.date)} · {r.kitchen?.name || "Kitchen"}</strong>
              <p>{[REASON[r.reason] || r.reason, r.requestedBy && `asked by ${r.requestedBy}`, formatDateTime(r.createdAt)].filter(Boolean).join(" · ")}</p>
              {r.note && <p className="correction__note">“{r.note}”</p>}
              {r.status !== "pending" && (
                <p className="correction__decision">
                  {r.status === "approved" ? "Reopened" : `Rejected: ${r.decisionNote}`}{r.decidedBy && ` · ${r.decidedBy}`}{r.decidedAt && ` · ${formatDateTime(r.decidedAt)}`}
                </p>
              )}
            </div>
            {r.status === "pending" ? (
              <div className="row-actions">
                <Button size="sm" disabled={busy} onClick={() => approve(r)}>Reopen day</Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => setRejecting({ row: r, note: "" })}>Reject</Button>
              </div>
            ) : <Badge variant={TONE[r.status] || "neutral"}>{STATUS[r.status] || r.status}</Badge>}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="corrections-page">
      {body}
      {dialog}
      {rejecting && (
        <Modal title={`Keep ${longDay(rejecting.row.date)} closed?`} onClose={() => !busy && setRejecting(null)} actions={(
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
