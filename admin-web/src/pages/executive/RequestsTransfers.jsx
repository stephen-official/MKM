import { DataTable } from "../../components/ui/index.jsx";
import { formatCount, formatDays } from "./format.js";

const Ageing = ({ title, ageing }) => (
  <DataTable>
    <caption className="exec-caption">{title} — oldest {formatDays(ageing.oldestAgeDays)}</caption>
    <thead><tr><th scope="col">Waiting</th><th scope="col" className="num">Count</th></tr></thead>
    <tbody>{ageing.buckets.map((b) => <tr key={b.id}><td>{b.label}</td><td className="num">{formatCount(b.count)}</td></tr>)}</tbody>
  </DataTable>
);

const ByStatus = ({ title, rows }) => (
  <DataTable>
    <caption className="exec-caption">{title}</caption>
    <thead><tr><th scope="col">Status</th><th scope="col" className="num">Count</th></tr></thead>
    <tbody>{rows.map((r) => <tr key={r.status}><td className="exec-status">{r.status}</td><td className="num">{formatCount(r.count)}</td></tr>)}</tbody>
  </DataTable>
);

export function RequestsTransfers({ data }) {
  const { requests, transfers } = data;
  return (
    <div className="exec-split">
      <ByStatus title="Requests created in period" rows={requests.byStatus} />
      <p className="exec-section__note">Approval rate: {requests.approvalRate === null ? "no decisions in period" : `${requests.approvalRate}%`}</p>
      <Ageing title="Pending requests (current)" ageing={requests.pendingAgeing} />
      <ByStatus title="Transfers created in period" rows={transfers.byStatus} />
      <Ageing title="Open transfers (current)" ageing={transfers.openAgeing} />
    </div>
  );
}
