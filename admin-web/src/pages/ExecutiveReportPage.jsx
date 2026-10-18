import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useNavigationType, useSearchParams } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { api, REQUEST_TIMEOUT_MS } from "../api.js";
import { Banner, Button, Card, ErrorState, LoadingState } from "../components/ui/index.jsx";
import { formatDateTime, todayInBusinessTz } from "../businessTime.js";
import { ReportFilters } from "./executive/ReportFilters.jsx";
import { canFetchReport, isDefault, sanitizeReportParams, shouldShowKitchenReset, toApiQuery, toSearchParams } from "./executive/reportParams.js";
import { useExecutiveReport } from "./executive/useExecutiveReport.js";
import { ReportBody } from "./executive/ReportBody.jsx";
import { ExportButtons } from "./executive/ExportButtons.jsx";
import "./executive/executive.css";

export function ExecutiveReportPage() {
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const [kitchens, setKitchens] = useState(null);
  const [kitchenError, setKitchenError] = useState(false);
  const today = todayInBusinessTz();

  useEffect(() => {
    let cancelled = false;
    api.get("/inventory/godowns", { timeout: REQUEST_TIMEOUT_MS })
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
    if (state.changed) setSearch(toSearchParams(state), { replace: true, state: { kitchenReset: state.kitchenReset, rangeReset: state.rangeReset } });
  }, [state, setSearch]);
  const showKitchenReset = shouldShowKitchenReset({ resetNow: state.kitchenReset, locationState: location.state, navigationType });
  const showRangeReset = shouldShowKitchenReset({ resetNow: state.rangeReset, locationState: location.state, navigationType, key: "rangeReset" });

  const apiQuery = useMemo(() => toApiQuery(state), [state]);
  // A chosen kitchen is validated against the list first, so a stale id never costs a failing request.
  const { status, report, error, reload } = useExecutiveReport(apiQuery, {
    enabled: canFetchReport({ godownId: state.godownId, kitchensSettled: kitchens !== null || kitchenError })
  });

  // Any filter change returns every list to page 1.
  const update = (patch) => setSearch(toSearchParams({ ...state, ...patch, pages: { health: 1, unpriced: 1, comparison: 1 } }));
  const setPage = (key, value) => setSearch(toSearchParams({ ...state, pages: { ...state.pages, [key]: value } }));

  const kitchenName = report?.meta?.kitchen?.name;
  return (
    <div className="exec-page">
      <header className="exec-header">
        <div className="exec-header__copy">
          <p className="exec-eyebrow">Leadership briefing</p>
          <h1>Executive Inventory Report</h1>
          <p>A concise view of stock value, kitchen consumption, procurement and operational risk.</p>
        </div>
        <div className="exec-actions">
          <Button variant="ghost" onClick={() => navigate("/report-schedules")}>
            <CalendarClock size={16} /> Schedule email
          </Button>
          <ExportButtons apiQuery={apiQuery} disabled={!report} />
        </div>
      </header>

      <div className="exec-content">
        <Card className="exec-filter-card">
          <div className="exec-filter-card__intro">
            <span>Report scope</span>
            <small>{report ? `Updated ${formatDateTime(report.meta.generatedAt)}` : "Preparing current data…"}</small>
          </div>
          <ReportFilters
            state={state}
            kitchens={kitchens || []}
            today={today}
            onChange={update}
            onReset={() => setSearch(new URLSearchParams())}
            canReset={!isDefault(state)}
            disabled={false}
          />
        </Card>
        {report && <p className="exec-period">{kitchenName} <span aria-hidden="true">·</span> {report.meta.from} to {report.meta.to}</p>}
        <div className="exec-notices">
          {showKitchenReset && <Banner variant="warn">The selected kitchen no longer exists, so the report shows all kitchens.</Banner>}
          {showRangeReset && <Banner variant="warn">That date range is not valid (it must end by today and span at most 366 days), so the report shows the last 30 days.</Banner>}
          {kitchenError && <Banner variant="warn">The kitchen list could not be loaded. You can still view all kitchens.</Banner>}
          {status === "error" && error?.code === "KITCHEN_NOT_FOUND" && (
            <Banner variant="warn">That kitchen was removed. Choose another kitchen or reset the filters.</Banner>
          )}
        </div>
        {!report && status === "loading" && <LoadingState label="Building the report…" />}
        {!report && status === "error" && <ErrorState message={error?.message || "The report could not be loaded."} onRetry={reload} />}
        {report && (
          <div aria-busy={status === "loading"} className={status === "loading" ? "exec-stale" : undefined}>
            {status === "error" && <Banner variant="alert">Refreshing failed: {error?.message}. Showing the previous result.</Banner>}
            <ReportBody report={report} onSelectKitchen={(id) => update({ godownId: id })} onPage={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
