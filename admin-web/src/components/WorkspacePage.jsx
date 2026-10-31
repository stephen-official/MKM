import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { Tabs } from "./ui/index.jsx";
import { useFeatureFlags } from "../features/FeatureFlagsContext.js";

/* A tab may name a list whose pending rows it counts (navItems `pendingCount`); the count is re-read on
   every route change so it follows approvals made on the page. */
const usePendingCounts = (tabs, pathname) => {
  const [counts, setCounts] = useState({});
  const sources = tabs.filter((tab) => tab.pendingCount).map((tab) => tab.pendingCount).join(",");
  useEffect(() => {
    if (!sources) return undefined;
    let cancelled = false;
    Promise.all(sources.split(",").map((path) =>
      api.get(path).then(({ data }) => [path, (Array.isArray(data) ? data : []).filter((row) => row.status === "pending").length]).catch(() => [path, 0])
    )).then((entries) => { if (!cancelled) setCounts(Object.fromEntries(entries)); });
    return () => { cancelled = true; };
  }, [sources, pathname]);
  return counts;
};

export function WorkspacePage({ workspace, routeMap }) {
  const { isEnabled, isSuperAdmin } = useFeatureFlags();
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = workspace.tabs.filter((tab) => isSuperAdmin || !tab.feature || isEnabled(tab.feature));
  const slug = location.pathname.slice(workspace.path.length).split("/").filter(Boolean)[0];
  const active = tabs.find((tab) => tab.slug === slug);
  const counts = usePendingCounts(tabs, location.pathname);

  if (!tabs.length) return <Navigate to="/no-access" replace />;
  if (!active) return <Navigate to={`${workspace.path}/${tabs[0].slug}`} replace />;

  return (
    <section className="workflow-workspace" aria-label={`${workspace.label} workspace`}>
      <div className="workflow-workspace__nav">
        <strong>{workspace.label}</strong>
        <Tabs
          label={`${workspace.label} sections`}
          items={tabs.map((tab) => ({ value: tab.slug, label: tab.label, count: tab.pendingCount && counts[tab.pendingCount] ? counts[tab.pendingCount] : undefined }))}
          value={active.slug}
          onChange={(next) => navigate(`${workspace.path}/${next}`)}
        />
      </div>
      <div className="workflow-workspace__page">{routeMap[active.route]}</div>
    </section>
  );
}
