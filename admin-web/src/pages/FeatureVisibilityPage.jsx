import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { Banner, Button, Card, ConfirmDialog, ErrorState, LoadingState, PageHeader, Tabs } from "../components/ui/index.jsx";
import { useToast } from "../useToast.js";
import { useFeatureFlags } from "../features/FeatureFlagsContext.js";
import { isAdminRole, isSuperAdmin } from "../roles.js";
import { formatDateTime } from "../businessTime.js";
import { FeatureToggleTable } from "./features/FeatureToggleTable.jsx";
import { FeatureAuditList } from "./features/FeatureAuditList.jsx";
import { truncationNote } from "./features/overrides.js";
import { OverridesPanel } from "./features/OverridesPanel.jsx";
import { applyEdits, describeChange, neededTargetScopes, pendingChanges, pruneEdits, scopeNote } from "./features/diff.js";

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
  const [usersTotal, setUsersTotal] = useState(0);
  const [reloading, setReloading] = useState(false);
  const [visited, setVisited] = useState(() => new Set(["global"]));
  const requested = useRef({ kitchen: false, user: false });

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

  // Target lists load when their tab is first opened (or when the change history needs their names).
  // A failed load clears its "requested" flag; `scope` is a dependency so re-opening a tab retries it.
  const need = neededTargetScopes(visited, audit?.items);
  useEffect(() => {
    if (need.kitchen && !requested.current.kitchen) {
      requested.current.kitchen = true;
      api.get("/inventory/godowns").then(({ data }) => setKitchens(data)).catch(() => {
        requested.current.kitchen = false;
        showToast("Could not load kitchens. Switch tabs to try again.", "error");
      });
    }
    if (need.user && !requested.current.user) {
      requested.current.user = true;
      api.get("/users", { params: { pageSize: "all" } }).then(({ data }) => { setUsers(data.items); setUsersTotal(data.total); }).catch(() => {
        requested.current.user = false;
        showToast("Could not load users. Switch tabs to try again.", "error");
      });
    }
  }, [need.kitchen, need.user, scope, showToast]);

  const changeScope = (next) => {
    setScope(next);
    setVisited((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
  };

  const userTargets = useMemo(
    () => users.filter((u) => !isSuperAdmin(u.role)).map((u) => ({
      id: String(u._id),
      label: `${u.name} (${isAdminRole(u.role) ? "admin" : u.kitchenName || "kitchen"})`,
      audience: isAdminRole(u.role) ? "admin" : "kitchen",
      kitchenId: u.godownId ? String(u.godownId) : null
    })),
    [users]
  );

  const kitchenTargets = useMemo(
    () => kitchens.map((k) => ({ id: String(k._id), label: k.active === false ? `${k.name} (inactive)` : k.name, audience: "kitchen" })),
    [kitchens]
  );

  const names = useMemo(() => ({
    kitchen: Object.fromEntries(kitchens.map((k) => [String(k._id), k.name])),
    user: Object.fromEntries(users.map((u) => [String(u._id), u.name]))
  }), [kitchens, users]);

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
    if (reloading) return;
    setReloading(true);
    try {
      const [loaded] = await Promise.all([loadAdmin(), loadAudit(1)]);
      if (loaded) setConflict(null);
      else showToast("Could not reload feature settings. Try again.", "error");
    } finally {
      setReloading(false);
    }
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
              {changeCount ? `Save (${changeCount})` : "Save"}
            </Button>
          </>
        )}
      />
      <Banner variant="info">{scopeNote(scope)}</Banner>
      <Tabs items={SCOPE_TABS} value={scope} onChange={changeScope} label="Settings scope" />
      {scope === "global" && conflict !== null && (
        <Banner variant="warn">
          Someone else saved changes (now version {conflict}). Reload to see them — your unsaved edits are kept where they still differ.
          {" "}<Button size="sm" variant="ghost" disabled={reloading} onClick={reload}>{reloading ? "Reloading…" : "Reload"}</Button>
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
          <OverridesPanel scope="user" targets={userTargets} note={truncationNote(usersTotal, users.length)} features={admin.features} globalFlags={admin.flags} onSaved={() => loadAudit(1)} />
        </Card>
      )}
      <h2 className="section-title">Change history</h2>
      <Card>
        <FeatureAuditList audit={audit} labels={labels} names={names} onPage={loadAudit} />
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
