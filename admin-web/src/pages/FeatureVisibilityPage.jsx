import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { Banner, Button, Card, ConfirmDialog, ErrorState, LoadingState, PageHeader, Tabs } from "../components/ui/index.jsx";
import { useToast } from "../useToast.js";
import { useFeatureFlags } from "../features/FeatureFlagsContext.js";
import { formatDateTime } from "../businessTime.js";
import { FeatureToggleTable } from "./features/FeatureToggleTable.jsx";
import { FeatureAuditList } from "./features/FeatureAuditList.jsx";
import { OverridesPanel } from "./features/OverridesPanel.jsx";
import { applyEdits, describeChange, pendingChanges, pruneEdits } from "./features/diff.js";

const SCOPE_TABS = [{ value: "global", label: "All admins" }, { value: "kitchen", label: "Per kitchen" }, { value: "user", label: "Per user" }];

export function FeatureVisibilityPage() {
  const { showToast } = useToast();
  const { refresh: refreshContext } = useFeatureFlags();
  const [admin, setAdmin] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [edits, setEdits] = useState({});
  const [conflict, setConflict] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [audit, setAudit] = useState(null);
  const [scope, setScope] = useState("global");
  const [kitchens, setKitchens] = useState([]);
  const [users, setUsers] = useState([]);

  // Resolves true when the latest settings were loaded, so callers can tell a failed reload apart.
  const loadAdmin = useCallback(async () => {
    try {
      const { data } = await api.get("/features/admin");
      setAdmin(data);
      setEdits((prev) => pruneEdits(data.flags, prev));
      setLoadError(null);
      return true;
    } catch (error) {
      setLoadError(error.response?.data?.message || "Could not load feature settings.");
      return false;
    }
  }, []);

  const loadAudit = useCallback(async (page = 1) => {
    try {
      const { data } = await api.get("/features/audit", { params: { page } });
      setAudit(data);
    } catch {
      showToast("Could not load change history.", "error");
    }
  }, [showToast]);

  useEffect(() => {
    loadAdmin();
    loadAudit(1);
  }, [loadAdmin, loadAudit]);

  useEffect(() => {
    api.get("/inventory/godowns").then(({ data }) => setKitchens(data)).catch(() => setKitchens([]));
  }, []);

  useEffect(() => {
    api.get("/users", { params: { pageSize: "all" } }).then(({ data }) => setUsers(data.items)).catch(() => setUsers([]));
  }, []);

  const userTargets = useMemo(
    () => users.filter((u) => u.role !== "super_admin").map((u) => ({
      id: String(u._id),
      label: `${u.name} (${u.role === "admin" ? "admin" : u.kitchenName || "kitchen"})`,
      audience: u.role === "admin" ? "admin" : "kitchen",
      kitchenId: u.godownId ? String(u.godownId) : null
    })),
    [users]
  );

  const kitchenTargets = useMemo(
    () => kitchens.map((k) => ({ id: String(k._id), label: k.active === false ? `${k.name} (inactive)` : k.name, audience: "kitchen" })),
    [kitchens]
  );

  const labels = useMemo(() => Object.fromEntries((admin?.features || []).map((f) => [f.key, f.label])), [admin]);
  const changes = admin ? pendingChanges(admin.flags, edits) : {};
  const changeCount = Object.keys(changes).length;

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/features", { expectedVersion: admin.version, changes });
      setAdmin((prev) => ({ ...prev, flags: data.flags, version: data.version, updatedAt: data.updatedAt }));
      setEdits({});
      setConflict(null);
      showToast(`Saved ${data.changed.length} change${data.changed.length === 1 ? "" : "s"}.`, "success");
      refreshContext();
      loadAudit(1);
    } catch (error) {
      const body = error.response?.data;
      if (body?.code === "VERSION_CONFLICT") setConflict(body.currentVersion);
      else showToast(body?.message || "Could not save changes.", "error");
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  };

  const reload = async () => {
    if (await loadAdmin()) setConflict(null);
    else showToast("Could not reload feature settings. Try again.", "error");
  };

  if (loadError && !admin) return <ErrorState message={loadError} onRetry={loadAdmin} />;
  if (!admin) return <LoadingState label="Loading feature settings…" />;

  const summary = Object.entries(changes).map(([key, next]) => describeChange({ key, previous: admin.flags[key], next }, labels)).join("; ");

  return (
    <>
      <PageHeader
        title="Feature Visibility"
        subtitle={`Choose which modules administrators can use. Version ${admin.version}${admin.updatedAt ? ` · last changed ${formatDateTime(admin.updatedAt)}` : ""}`}
        actions={scope === "global" && (
          <>
            <Button variant="ghost" disabled={!changeCount || saving} onClick={() => setEdits({})}>Discard</Button>
            <Button disabled={!changeCount || saving || conflict !== null} onClick={() => setConfirming(true)}>
              Save {changeCount ? `(${changeCount})` : ""}
            </Button>
          </>
        )}
      />
      <Banner variant="info">
        Changes apply to administrators within a minute (immediately on their next action). Super-admins always see every module.
        Shared reference data (stock items, kitchens, units, stock levels) stays available to the modules that depend on it.
      </Banner>
      <Tabs items={SCOPE_TABS} value={scope} onChange={setScope} label="Settings scope" />
      {scope === "global" && conflict !== null && (
        <Banner variant="warn">
          Someone else saved changes (now version {conflict}). Reload to see them — your unsaved edits are kept where they still differ.
          {" "}<Button size="sm" variant="ghost" onClick={reload}>Reload</Button>
        </Banner>
      )}
      {scope === "global" && (
        <Card>
          <FeatureToggleTable
            features={admin.features}
            saved={admin.flags}
            values={applyEdits(admin.flags, edits)}
            disabled={saving}
            onToggle={(key, value) => setEdits((prev) => ({ ...prev, [key]: value }))}
          />
        </Card>
      )}
      {scope === "kitchen" && (
        <Card>
          <OverridesPanel scope="kitchen" targets={kitchenTargets} features={admin.features} globalFlags={admin.flags} onSaved={() => loadAudit(1)} />
        </Card>
      )}
      {scope === "user" && (
        <Card>
          <OverridesPanel scope="user" targets={userTargets} features={admin.features} globalFlags={admin.flags} onSaved={() => loadAudit(1)} />
        </Card>
      )}
      <h2 className="section-title">Change history</h2>
      <Card>
        <FeatureAuditList audit={audit} labels={labels} onPage={loadAudit} />
      </Card>
      {confirming && (
        <ConfirmDialog
          title="Apply feature changes?"
          message={summary}
          confirmLabel="Apply"
          busy={saving}
          onCancel={() => setConfirming(false)}
          onConfirm={save}
        />
      )}
    </>
  );
}
