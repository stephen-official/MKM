import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { Banner, ErrorState, LoadingState, PageHeader } from "../components/ui/index.jsx";
import { formatDateTime, todayInBusinessTz } from "../businessTime.js";
import { ReportFilters } from "./executive/ReportFilters.jsx";
import { isDefault, sanitizeReportParams, toApiQuery, toSearchParams } from "./executive/reportParams.js";
import { useExecutiveReport } from "./executive/useExecutiveReport.js";
import { ReportBody } from "./executive/ReportBody.jsx";
import { ExportButtons } from "./executive/ExportButtons.jsx";
import "./executive/executive.css";

export function ExecutiveReportPage() {
  const [search, setSearch] = useSearchParams();
  const location = useLocation();
  const [kitchens, setKitchens] = useState(null);
  const [kitchenError, setKitchenError] = useState(false);
  const today = todayInBusinessTz();

  useEffect(() => {
    let cancelled = false;
    api.get("/inventory/godowns")
      .then(({ data }) => { if (!cancelled) setKitchens([...data].sort((a, b) => a.name.localeCompare(b.name))); })
      .catch(() => { if (!cancelled) setKitchenError(true); });
    return () => { cancelled = true; };
  }, []);

  const kitchenIds = useMemo(() => (kitchens ? new Set(kitchens.map((k) => String(k._id).toLowerCase())) : undefined), [kitchens]);
  const state = useMemo(() => sanitizeReportParams(search, { today, kitchenIds }), [search, today, kitchenIds]);

  // Replace an invalid or non-canonical URL with the safe one (no extra history entry).
  // The kitchen-reset flag rides along in location state so the banner survives the redirect;
  // the next filter change or reset navigates without it, which clears the banner.
  useEffect(() => {
    if (state.changed) setSearch(toSearchParams(state), { replace: true, state: { kitchenReset: state.kitchenReset } });
  }, [state, setSearch]);
  const showKitchenReset = state.kitchenReset || location.state?.kitchenReset === true;

  const apiQuery = useMemo(() => toApiQuery(state), [state]);
  const { status, report, error, reload } = useExecutiveReport(apiQuery);

  // Any filter change returns every list to page 1.
  const update = (patch) => setSearch(toSearchParams({ ...state, ...patch, pages: { health: 1, unpriced: 1, comparison: 1 } }));
  const setPage = (key, value) => setSearch(toSearchParams({ ...state, pages: { ...state.pages, [key]: value } }));

  const kitchenName = report?.meta?.kitchen?.name;
  return (
    <div className="exec-page">
      <PageHeader
        title="Executive Report"
        subtitle={report ? `${kitchenName} · ${report.meta.from} to ${report.meta.to} · Data updated at ${formatDateTime(report.meta.generatedAt)}` : "Loading…"}
        actions={<ExportButtons apiQuery={apiQuery} disabled={!report} />}
      />
      <ReportFilters
        state={state}
        kitchens={kitchens || []}
        today={today}
        onChange={update}
        onReset={() => setSearch(new URLSearchParams())}
        canReset={!isDefault(state)}
        disabled={false}
      />
      {showKitchenReset && <Banner variant="warn">The selected kitchen no longer exists, so the report shows all kitchens.</Banner>}
      {kitchenError && <Banner variant="warn">The kitchen list could not be loaded. You can still view all kitchens.</Banner>}
      {status === "error" && error?.code === "KITCHEN_NOT_FOUND" && (
        <Banner variant="warn">That kitchen was removed. Choose another kitchen or reset the filters.</Banner>
      )}
      {!report && status === "loading" && <LoadingState label="Building the report…" />}
      {!report && status === "error" && <ErrorState message={error?.message || "The report could not be loaded."} onRetry={reload} />}
      {report && (
        <div aria-busy={status === "loading"} className={status === "loading" ? "exec-stale" : undefined}>
          {status === "error" && <Banner variant="alert">Refreshing failed: {error?.message}. Showing the previous result.</Banner>}
          <ReportBody report={report} onSelectKitchen={(id) => update({ godownId: id })} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
