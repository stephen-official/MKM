import { Button } from "../../components/ui/index.jsx";

export function Pager({ page, pages, total, onPage, label }) {
  if (pages <= 1) return <p className="exec-count">{total} {label}</p>;
  return (
    <nav className="pager" aria-label={`${label} pages`}>
      <span className="exec-count">{total} {label}</span>
      <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
      <span>Page {page} of {pages}</span>
      <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
    </nav>
  );
}
