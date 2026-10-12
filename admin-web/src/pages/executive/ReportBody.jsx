export function ReportBody({ report }) {
  return <pre className="exec-debug">{JSON.stringify(report.kpis, null, 2)}</pre>;
}
