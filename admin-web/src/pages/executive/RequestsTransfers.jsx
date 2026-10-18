import { DataTable } from "../../components/ui/index.jsx";
import { formatCount, formatDays } from "./format.js";

/** Makes an element open the explanation for `target`, the specific figure or row selected. */
const explainable = (onExplain, label, target) => onExplain ? {
  role: "button",
  tabIndex: 0,
  "aria-label": `${label}. Show detailed explanation and calculation.`,
  onClick: () => onExplain(target),
  onKeyDown: (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onExplain(target);
    }
  },
} : {};

const Ageing = ({ title, queue, ageing, onExplain }) => (
  <DataTable>
    <caption className="exec-caption">
      {title} — {ageing.oldestAgeDays === null || ageing.oldestAgeDays === undefined ? "none waiting" : `oldest ${formatDays(ageing.oldestAgeDays)}`}
    </caption>
    <thead><tr><th scope="col">Waiting</th><th scope="col" className="num">Count</th></tr></thead>
    <tbody>{ageing.buckets.map((b) => <tr className={onExplain ? "exec-table-row--clickable" : undefined} {...explainable(onExplain, `${title}: ${b.label}`, { queue, bucket: b })} key={b.id}><td>{b.label}</td><td className="num">{formatCount(b.count)}</td></tr>)}</tbody>
  </DataTable>
);

const ByStatus = ({ title, kind, rows, onExplain }) => (
  <DataTable>
    <caption className="exec-caption">{title}</caption>
    <thead><tr><th scope="col">Status</th><th scope="col" className="num">Count</th></tr></thead>
    <tbody>{rows.map((r) => <tr className={onExplain ? "exec-table-row--clickable" : undefined} {...explainable(onExplain, `${title}: ${r.status}`, { status: kind, row: r })} key={r.status}><td className="exec-status">{r.status}</td><td className="num">{formatCount(r.count)}</td></tr>)}</tbody>
  </DataTable>
);

export function RequestsTransfers({ data, onExplain }) {
  const { requests, transfers } = data;
  return (
    <div className="exec-split">
      <ByStatus title="Requests created in period" kind="requests" rows={requests.byStatus} onExplain={onExplain} />
      <p className={`exec-section__note${onExplain ? " exec-inline-explainable" : ""}`} {...explainable(onExplain, "Approval rate", { approvalRate: true })}>Approval rate: {requests.approvalRate === null ? "no decisions in period" : `${requests.approvalRate}%`}</p>
      <Ageing title="Pending requests (current)" queue="requests" ageing={requests.pendingAgeing} onExplain={onExplain} />
      <ByStatus title="Transfers created in period" kind="transfers" rows={transfers.byStatus} onExplain={onExplain} />
      <Ageing title="Open transfers (current)" queue="transfers" ageing={transfers.openAgeing} onExplain={onExplain} />
    </div>
  );
}
