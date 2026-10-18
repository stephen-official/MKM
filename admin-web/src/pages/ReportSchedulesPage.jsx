import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, Banner, Button, Card, ConfirmDialog, DataTable, EmptyState, ErrorState, LoadingState, Modal, PageHeader } from "../components/ui/index.jsx";
import { useToast } from "../useToast.js";
import { formatDateTime } from "../businessTime.js";
import "./executive/executive.css";
import { ScheduleForm } from "./schedules/ScheduleForm.jsx";
import { EMPTY_SCHEDULE, describeSchedule } from "./schedules/scheduleText.js";

export function ReportSchedulesPage() {
  const { showToast } = useToast();
  const [schedules, setSchedules] = useState(null);
  const [error, setError] = useState(null);
  const [kitchens, setKitchens] = useState([]);
  const [editing, setEditing] = useState(null);
  const [serverErrors, setServerErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [history, setHistory] = useState(null);
  const [runningId, setRunningId] = useState(null);

  // Resolves to the loaded rows, or null when the load failed.
  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/report-schedules");
      setSchedules(data);
      setError(null);
      return data;
    } catch (e) {
      setError(e.response?.data?.message || "Could not load schedules.");
      return null;
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get("/inventory/godowns").then(({ data }) => setKitchens(data)).catch(() => setKitchens([])); }, []);

  const kitchenName = (id) => (id === "all" ? "All kitchens" : kitchens.find((k) => String(k._id) === id)?.name || "Removed kitchen");

  // Someone else changed the schedule: reload and show the form again on the current values.
  const reopenFresh = async (id) => {
    const rows = await load();
    const fresh = rows?.find((row) => row._id === id);
    setServerErrors({});
    setEditing(fresh || null);
    showToast(
      fresh ? "Someone else changed this schedule. The latest values are shown; review them and save again." : "Someone else changed this schedule. The list has been reloaded.",
      "error"
    );
  };

  const save = async (body) => {
    setBusy(true);
    setServerErrors({});
    try {
      if (editing._id) await api.patch(`/report-schedules/${editing._id}`, { ...body, expectedVersion: editing.version });
      else await api.post("/report-schedules", body);
      showToast("Schedule saved.", "success");
      setEditing(null);
      load();
    } catch (e) {
      const res = e.response?.data;
      if (res?.code === "INVALID_SCHEDULE") setServerErrors(res.fields || {});
      else if (res?.code === "VERSION_CONFLICT") await reopenFresh(editing._id);
      else showToast(res?.message || "Could not save the schedule.", "error");
    } finally {
      setBusy(false);
    }
  };

  const runNow = async (s) => {
    if (runningId) return;
    setRunningId(s._id);
    try {
      const { data } = await api.post(`/report-schedules/${s._id}/run`);
      showToast(data.message, "success");
    } catch (e) {
      showToast(e.response?.data?.message || "Could not queue the run.", "error");
    } finally {
      setRunningId(null);
      load();
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/report-schedules/${deleting._id}`);
      setDeleting(null);
      showToast("Schedule deleted.", "success");
      load();
    } catch (e) {
      showToast(e.response?.data?.message || "Could not delete.", "error");
    } finally {
      setBusy(false);
    }
  };

  const openHistory = async (s) => {
    try {
      setHistory({ schedule: s, runs: (await api.get(`/report-schedules/${s._id}/runs`)).data });
    } catch {
      showToast("Could not load the run history.", "error");
    }
  };

  return (
    <>
      <PageHeader title="Scheduled Emails" subtitle="Send the Executive Report automatically."
        actions={<Button onClick={() => { setServerErrors({}); setEditing({ ...EMPTY_SCHEDULE }); }}>New schedule</Button>} />
      <Banner variant="info">Schedules run only on servers started with REPORT_SCHEDULER_ENABLED=true. Reports cover complete days up to yesterday.</Banner>
      {error && <ErrorState message={error} onRetry={load} />}
      {!schedules && !error && <LoadingState />}
      {schedules && (
        <Card>
          {schedules.length === 0 ? <EmptyState title="No scheduled reports yet">Create one to email the report on a regular basis.</EmptyState> : (
            <DataTable>
              <thead><tr><th scope="col">Name</th><th scope="col">Kitchen</th><th scope="col">Schedule</th><th scope="col">Next run</th><th scope="col">Last run</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s._id}>
                    <th scope="row">{s.name}{!s.active && <> <Badge variant="neutral">Paused</Badge></>}</th>
                    <td>{kitchenName(s.godownId)}</td>
                    <td>{describeSchedule(s)}</td>
                    <td>{s.active ? formatDateTime(s.nextRunAt) : "—"}</td>
                    <td>
                      {s.lastStatus ? <Badge variant={s.lastStatus === "success" ? "success" : "alert"}>{s.lastStatus}</Badge> : "Never"}
                      {s.lastError && <small className="exec-muted"> {s.lastError}</small>}
                      {s.lastRunAt && <div className="exec-muted">{formatDateTime(s.lastRunAt)}</div>}
                    </td>
                    <td>
                      <div className="row-actions">
                      <Button size="sm" variant="ghost" onClick={() => { setServerErrors({}); setEditing(s); }}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => runNow(s)} disabled={!s.active || runningId !== null}>{runningId === s._id ? "Queuing…" : "Run now"}</Button>
                      <Button size="sm" variant="ghost" onClick={() => openHistory(s)}>History</Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleting(s)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </Card>
      )}
      {editing && (
        <ScheduleForm key={`${editing._id || "new"}:${editing.version ?? 0}`} title={editing._id ? `Edit ${editing.name}` : "New schedule"} initial={editing} kitchens={kitchens}
          busy={busy} serverErrors={serverErrors} onCancel={() => setEditing(null)} onSubmit={save} />
      )}
      {deleting && (
        <ConfirmDialog title="Delete schedule?" message={`“${deleting.name}” will stop sending. Past run history is kept.`}
          confirmLabel="Delete" variant="danger" busy={busy} onCancel={() => setDeleting(null)} onConfirm={remove} />
      )}
      {history && (
        <Modal title={`Runs: ${history.schedule.name}`} wide onClose={() => setHistory(null)}>
          {history.runs.total === 0 ? <EmptyState title="No runs yet" /> : (
            <>
            {history.runs.total > history.runs.items.length && <p className="exec-muted">Showing the latest {history.runs.items.length} of {history.runs.total} runs.</p>}
            <DataTable>
              <thead><tr><th scope="col">When</th><th scope="col">Period</th><th scope="col">Result</th><th scope="col">File</th></tr></thead>
              <tbody>
                {history.runs.items.map((r) => (
                  <tr key={r._id}>
                    <td>{formatDateTime(r.startedAt)}</td>
                    <td>{r.from} to {r.to}</td>
                    <td><Badge variant={r.status === "success" ? "success" : "alert"}>{r.status}</Badge>{r.errorCode && <small className="exec-muted"> {r.errorCode}</small>}</td>
                    <td>{r.filename || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
