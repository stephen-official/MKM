import { Card, EmptyState } from "../../components/ui/index.jsx";

/** Per-section frame: title, optional note, error and empty states handled here once. */
export function Section({ title, note, section, isEmpty, emptyText, children, actions }) {
  return (
    <Card className="exec-section">
      <header className="exec-section__head">
        <h2 className="exec-section__title">{title}</h2>
        {actions}
      </header>
      {note && <p className="exec-section__note">{note}</p>}
      {section?.status === "error" ? (
        <EmptyState title="This section could not be loaded.">The rest of the report is unaffected. Try refreshing in a moment.</EmptyState>
      ) : isEmpty ? (
        <EmptyState title="Nothing to show">{emptyText}</EmptyState>
      ) : children}
    </Card>
  );
}
