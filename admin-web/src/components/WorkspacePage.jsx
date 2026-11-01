import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { Tabs } from "./ui/index.jsx";
import { useFeatureFlags } from "../features/FeatureFlagsContext.js";

/* A tab may carry a count (navItems `pendingCount`): a list path whose pending rows are counted, or { path, count }
   where `count(data)` reads the number. `countFor: "super_admin"` fetches it for super-admins only. The count is
   re-read on every route change so it follows approvals made on the page. */
const countSource = (tab) => (typeof tab.pendingCount === "string" ? { path: tab.pendingCount, count: (data) => (Array.isArray(data) ? data : []).filter((row) => row.status === "pending").length } : tab.pendingCount);
const countKey = (tab) => (tab.pendingCount ? countSource(tab).path : "");
const usePendingCounts = (tabs, pathname, isSuperAdmin) => {
  const [counts, setCounts] = useState({});
  const counted = tabs.filter((tab) => tab.pendingCount && (tab.countFor !== "super_admin" || isSuperAdmin));
  const sources = counted.map(countKey).join(",");
  useEffect(() => {
    if (!sources) return undefined;
    let cancelled = false;
    Promise.all(counted.map((tab) => {
      const { path, count } = countSource(tab);
      return api.get(path).then(({ data }) => [path, count(data) || 0]).catch(() => [path, 0]);
    })).then((entries) => { if (!cancelled) setCounts(Object.fromEntries(entries)); });
    return () => { cancelled = true; };
  }, [sources, pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  return counts;
};

export function WorkspacePage({ workspace, routeMap }) {
  const { isEnabled, isSuperAdmin } = useFeatureFlags();
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = workspace.tabs.filter((tab) => isSuperAdmin || !tab.feature || isEnabled(tab.feature));
  const slug = location.pathname.slice(workspace.path.length).split("/").filter(Boolean)[0];
  const active = tabs.find((tab) => tab.slug === slug);
  const counts = usePendingCounts(tabs, location.pathname, isSuperAdmin);

  if (!tabs.length) return <Navigate to="/no-access" replace />;
  if (!active) return <Navigate to={`${workspace.path}/${tabs[0].slug}`} replace />;

  return (
    <section className="workflow-workspace" aria-label={`${workspace.label} workspace`}>
      <div className="workflow-workspace__nav">
        <strong>{workspace.label}</strong>
        <Tabs
          label={`${workspace.label} sections`}
          items={tabs.map((tab) => ({ value: tab.slug, label: tab.label, count: tab.pendingCount && counts[countKey(tab)] ? counts[countKey(tab)] : undefined }))}
          value={active.slug}
          onChange={(next) => navigate(`${workspace.path}/${next}`)}
        />
      </div>
      <div className="workflow-workspace__page">{routeMap[active.route]}</div>
    </section>
  );
}
