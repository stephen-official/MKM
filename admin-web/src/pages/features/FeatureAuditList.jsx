import { Button, DataTable, EmptyState } from "../../components/ui/index.jsx";
import { formatDateTime } from "../../businessTime.js";
import { describeChange, describeScope } from "./diff.js";

export function FeatureAuditList({ audit, labels, names, onPage }) {
  if (!audit) return null;
  if (audit.total === 0) return <EmptyState title="No changes yet">Every change to feature visibility will be listed here.</EmptyState>;
  const pages = Math.max(1, Math.ceil(audit.total / audit.pageSize));
  return (
    <>
      <DataTable>
        <thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">Scope</th><th scope="col">Changes</th></tr></thead>
        <tbody>
          {audit.items.map((row) => (
            <tr key={row._id}>
              <td>{formatDateTime(row.at)}</td>
              <td>{row.actorName || "—"}<br /><small>{row.actorEmail}</small></td>
              <td>{describeScope(row, names)}</td>
              <td><ul className="plain-list">{row.changes.map((c) => <li key={c.key}>{describeChange(c, labels)}</li>)}</ul></td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      <div className="pager">
        <Button variant="ghost" size="sm" disabled={audit.page <= 1} onClick={() => onPage(audit.page - 1)}>Previous</Button>
        <span>Page {audit.page} of {pages}</span>
        <Button variant="ghost" size="sm" disabled={audit.page >= pages} onClick={() => onPage(audit.page + 1)}>Next</Button>
      </div>
    </>
  );
}
