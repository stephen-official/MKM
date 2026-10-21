import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Tabs } from "./ui/index.jsx";
import { useFeatureFlags } from "../features/FeatureFlagsContext.js";

export function WorkspacePage({ workspace, routeMap }) {
  const { isEnabled, isSuperAdmin } = useFeatureFlags();
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = workspace.tabs.filter((tab) => isSuperAdmin || !tab.feature || isEnabled(tab.feature));
  const slug = location.pathname.slice(workspace.path.length).split("/").filter(Boolean)[0];
  const active = tabs.find((tab) => tab.slug === slug);

  if (!tabs.length) return <Navigate to="/no-access" replace />;
  if (!active) return <Navigate to={`${workspace.path}/${tabs[0].slug}`} replace />;

  return (
    <section className="workflow-workspace" aria-label={`${workspace.label} workspace`}>
      <div className="workflow-workspace__nav">
        <strong>{workspace.label}</strong>
        <Tabs
          label={`${workspace.label} sections`}
          items={tabs.map((tab) => ({ value: tab.slug, label: tab.label }))}
          value={active.slug}
          onChange={(next) => navigate(`${workspace.path}/${next}`)}
        />
      </div>
      <div className="workflow-workspace__page">{routeMap[active.route]}</div>
    </section>
  );
}
