import { useState } from "react";
import {
  Badge, Banner, Button, DataTable, DetailPanel, EmptyState, ErrorState, LoadingState, Meta,
  RailItem, RailList, SplitView, StatusBadge
} from "../../components/ui/index.jsx";
import { fmtDate, formatQty } from "./helpers.js";

const PAGE = 100;
const rowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 };
const mutedStyle = { color: "var(--muted)", fontSize: 12 };

/* Requests tab: kitchen supply requests to review. `decisions` maps stock item id
   to "approved" | "rejected" for the request being reviewed. */
export const IndentRequestsView = ({
  requests, selected, loading, error, onRetry, onSelect, onClose, r, decisions, setDecisions, busy, onConfirm, onRejectAll, hasFilter
}) => {
  const [limit, setLimit] = useState(PAGE);
  const pending = selected?.status === "pending";
  const items = selected?.items || [];
  const allApproved = items.length > 0 && items.every((it) => decisions[r.id(it)] === "approved");

  const decide = (id, value) =>
    setDecisions((prev) => {
      const next = { ...prev };
      if (value) next[id] = value; else delete next[id];
      return next;
    });

  const toggleAll = (checked) =>
    setDecisions((prev) => {
      const next = {};
      items.forEach((it) => {
        const id = r.id(it);
        if (checked) { if (prev[id] !== "rejected") next[id] = "approved"; }
        else if (prev[id] === "rejected") next[id] = "rejected";
      });
      return next;
    });

  const rail = (
    <RailList
      title="All requests"
      count={requests.length}
      loading={loading && requests.length === 0}
      empty={
        error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : (
          <EmptyState title={hasFilter ? "No requests in this date range" : "No supply requests yet"}>
            {hasFilter ? "Clear the date filter to see everything." : "Requests raised by kitchens will appear here."}
          </EmptyState>
        )
      }
    >
      {requests.slice(0, limit).map((q) => (
        <RailItem key={q._id} active={selected?._id === q._id} onClick={() => onSelect(q._id)}>
          <div style={rowStyle}>
            <strong>{q.userId?.name || "Unknown user"}</strong>
            <span style={mutedStyle}>{fmtDate(q.createdAt)}</span>
          </div>
          <div style={{ ...rowStyle, marginTop: 6 }}>
            <span style={mutedStyle}>{q.godownId?.name || "Main godown"} · {q.items?.length || 0} items</span>
            <StatusBadge status={q.status} />
          </div>
        </RailItem>
      ))}
      {requests.length > limit && (
        <Button variant="ghost" size="sm" onClick={() => setLimit((n) => n + PAGE)}>
          Show more ({requests.length - limit} left)
        </Button>
      )}
    </RailList>
  );

  let detail;
  if (loading && !selected) detail = <LoadingState label="Loading requests…" />;
  else if (!selected) detail = <EmptyState title="Select a request to review" />;
  else {
    detail = (
      <DetailPanel
        head={
          <>
            <Meta label="Source godown">{selected.godownId?.name || "General"}</Meta>
            <Meta label="Requested by">{selected.userId?.name || "Unknown user"}</Meta>
            <Meta label="Raised on">{fmtDate(selected.createdAt)}</Meta>
            <Meta label="Status" align="end"><StatusBadge status={selected.status} /></Meta>
          </>
        }
        foot={
          <>
            <Button variant="ghost" disabled={busy} onClick={onClose}>Close</Button>
            {pending && (
              <>
                <Button variant="danger" disabled={busy} onClick={onRejectAll}>Reject Entire Request</Button>
                <Button disabled={busy} onClick={onConfirm}>{busy ? "Saving…" : "Confirm Request"}</Button>
              </>
            )}
          </>
        }
      >
        {pending && (
          <Banner variant="info">
            Tick the items to supply and confirm. Unticked items are rejected; use Reject Entire Request to decline everything.
          </Banner>
        )}
        <DataTable>
          <thead>
            <tr>
              <th scope="col" style={{ width: 40 }}>
                <input
                  type="checkbox"
                  aria-label="Select all items"
                  checked={allApproved}
                  disabled={!pending}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th scope="col">Item</th>
              <th scope="col">Group</th>
              <th scope="col">Requested</th>
              <th scope="col">Received</th>
              <th scope="col" style={{ textAlign: "right" }}>{pending ? "Action" : "Decision"}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const id = r.id(it);
              const rejected = it.status === "rejected" || decisions[id] === "rejected";
              const fullyReceived = Number(it.receivedQty || 0) >= Number(it.qtyBaseUnit || 0);
              return (
                <tr key={idx}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Approve ${r.name(it)}`}
                      disabled={!pending}
                      checked={decisions[id] === "approved"}
                      onChange={(e) => decide(id, e.target.checked ? "approved" : "rejected")}
                    />
                  </td>
                  <td><strong>{r.name(it)}</strong></td>
                  <td><Badge variant="info">{r.group(it)}</Badge></td>
                  <td>{formatQty(it.qtyBaseUnit)} {r.unit(it)}</td>
                  <td>
                    {formatQty(it.receivedQty)} {r.unit(it)}
                    {!pending && it.status === "approved" && fullyReceived && <div style={mutedStyle}>Fully received</div>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {rejected ? (
                      <StatusBadge status="rejected" />
                    ) : pending ? (
                      <Button variant="danger" size="sm" onClick={() => decide(id, "rejected")}>Reject</Button>
                    ) : (
                      it.status && <StatusBadge status={it.status} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      </DetailPanel>
    );
  }

  return <SplitView rail={rail}>{detail}</SplitView>;
};
