import { Button } from "../../components/ui/index.jsx";
import { formatCount, plural } from "./format.js";

/** `label` is the plural noun; `singular` is used when the total is exactly one. */
export function Pager({ page, pages, total, onPage, label, singular }) {
  const noun = `${formatCount(total)} ${plural(total, singular ?? label, label)}`;
  if (pages <= 1) return <p className="exec-count">{noun}</p>;
  return (
    <nav className="pager" aria-label={`${label} pages`}>
      <span className="exec-count">{noun}</span>
      <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
      <span>Page {page} of {pages}</span>
      <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
    </nav>
  );
}
