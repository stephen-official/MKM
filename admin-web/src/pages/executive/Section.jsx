import { Card, EmptyState } from "../../components/ui/index.jsx";
import { CircleHelp } from "lucide-react";

/** Per-section frame: title, optional note, error and empty states handled here once. */
export function Section({ title, note, section, isEmpty, emptyText, children, actions, onExplain }) {
  return (
    <Card className="exec-section">
      <header className="exec-section__head">
        <h2 className="exec-section__title">{title}</h2>
        <div className="exec-section__actions">
          {actions}
          {onExplain && section?.status !== "error" && (
            <button type="button" className="exec-explain" onClick={onExplain} aria-label={`Explain ${title}`}>
              <CircleHelp size={15} aria-hidden="true" />
              <span>Explain</span>
            </button>
          )}
        </div>
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
