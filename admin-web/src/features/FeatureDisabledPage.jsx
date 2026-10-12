import { Link } from "react-router-dom";
import { EmptyState, PageHeader } from "../components/ui/index.jsx";

export function FeatureDisabledPage({ label, homePath }) {
  return (
    <>
      <PageHeader title={label || "Unavailable"} />
      <EmptyState
        title="This feature is currently disabled."
        action={homePath ? <Link className="btn btn--ghost btn--sm" to={homePath}>Go to an available page</Link> : null}
      >
        A super-admin has turned it off for administrators. Ask them if you need access.
      </EmptyState>
    </>
  );
}
