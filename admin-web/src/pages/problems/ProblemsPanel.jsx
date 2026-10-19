import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { api } from "../../api.js";
import { useToast } from "../../useToast.js";
import { Badge, Button, Card, EmptyState, ErrorState, Field, LoadingState, Modal, Tabs } from "../../components/ui/index.jsx";
import { qtyText, reasonLabel, settleDefaults, settlePayload, shortfallFor, validateSettle } from "./problems.js";

const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;
const when = (value) => (value ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "—");
const STATUS_TABS = [{ value: "open", label: "Open" }, { value: "settled", label: "Settled" }];

/** Problems kitchens raised while receiving shared orders: see what arrived, accept a quantity, reorder the rest. */
export function ProblemsPanel() {
  const { showToast } = useToast();
  const [status, setStatus] = useState("open");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [settling, setSettling] = useState(null); // { ticket, form }
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const fetchTickets = useCallback((which) => api.get("/delivery-tickets", { params: { status: which } })
    .then((res) => { setTickets(res.data || []); setLoadError(""); })
    .catch((error) => setLoadError(errorMessage(error, "Failed to load delivery problems")))
    .finally(() => setLoading(false)), []);
  const load = useCallback(() => { setLoading(true); return fetchTickets(status); }, [fetchTickets, status]);
  useEffect(() => { fetchTickets(status); }, [fetchTickets, status]);

  const open = (ticket) => { setErrors({}); setSettling({ ticket, form: settleDefaults(ticket) }); };
  const set = (change) => setSettling((previous) => ({ ...previous, form: { ...previous.form, ...change } }));

  const settle = async (event) => {
    event.preventDefault();
    const found = validateSettle(settling.form, settling.ticket);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/delivery-tickets/${settling.ticket._id}/settle`, settlePayload(settling.form));
      showToast(data.resolution?.followUpOrderId ? "Settled; a follow-up order was opened for the kitchen" : "Settled", "success");
      setSettling(null);
      await load();
    } catch (error) {
      showToast(errorMessage(error, "Could not settle this problem."), "error");
      if (error?.response?.data?.code === "ALREADY_SETTLED") { setSettling(null); load(); }
    } finally {
      setBusy(false);
    }
  };

  const ticket = settling?.ticket;
  const shortfall = ticket ? shortfallFor(ticket, settling.form.acceptedQty) : 0;

  return (
    <>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15 }}>Delivery problems</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>Raised by kitchens while receiving shared orders. Nothing enters their stock until you settle it.</p>
          </div>
          <Tabs items={STATUS_TABS} value={status} onChange={setStatus} label="Problem status" />
        </div>
        {loadError && !tickets.length ? <ErrorState message={loadError} onRetry={load} />
          : loading && !tickets.length ? <LoadingState label="Loading problems…" />
          : tickets.length === 0 ? <EmptyState title={status === "open" ? "No open problems" : "Nothing settled yet"}>{status === "open" ? "Kitchens have not reported any delivery problems." : "Settled problems will be listed here."}</EmptyState>
          : (
            <table className="table">
              <thead><tr><th scope="col">Kitchen</th><th scope="col">Item</th><th scope="col">What went wrong</th><th scope="col">Ordered</th><th scope="col">Usable arrived</th><th scope="col">Raised</th><th scope="col" style={{ textAlign: "right" }}>{status === "open" ? "Action" : "Outcome"}</th></tr></thead>
              <tbody>
                {tickets.map((row) => (
                  <tr key={row._id}>
                    <td style={{ fontWeight: 650 }}>{row.godownId?.name || "Kitchen"}<div style={{ fontSize: 12, color: "var(--muted)" }}>{row.orderNo}</div></td>
                    <td>{row.stockItemId?.name || "Item"}</td>
                    <td>
                      <Badge variant={row.status === "open" ? "warn" : "neutral"}>{reasonLabel(row.reason)}</Badge>
                      {row.note && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{row.note}</div>}
                      <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 12 }}>
                        {row.details?.photos?.goods && <a href={row.details.photos.goods} target="_blank" rel="noreferrer">Photo <ExternalLink size={11} /></a>}
                        {row.details?.photos?.label && <a href={row.details.photos.label} target="_blank" rel="noreferrer">Label <ExternalLink size={11} /></a>}
                        {row.voiceNoteUrl && <a href={row.voiceNoteUrl} target="_blank" rel="noreferrer">Voice note <ExternalLink size={11} /></a>}
                      </div>
                    </td>
                    <td>{qtyText(row.orderedQtyBaseUnit, row)}</td>
                    <td>{qtyText(row.receivedQtyBaseUnit, row)}</td>
                    <td>{when(row.raisedAt)}<div style={{ fontSize: 12, color: "var(--muted)" }}>{row.raisedBy?.name}</div></td>
                    <td style={{ textAlign: "right" }}>
                      {row.status === "open"
                        ? <Button size="sm" onClick={() => open(row)}><CheckCircle2 size={14} /> Settle</Button>
                        : <div style={{ fontSize: 12 }}>Accepted {qtyText(row.resolution?.acceptedQtyBaseUnit, row)}{row.resolution?.followUpOrderId ? ", rest reordered" : ""}<div style={{ color: "var(--muted)" }}>{when(row.resolution?.settledAt)} · {row.resolution?.settledBy?.name}</div></div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </Card>

      {settling && (
        <Modal title={`Settle: ${ticket.stockItemId?.name || "Item"} for ${ticket.godownId?.name || "kitchen"}`} onClose={() => !busy && setSettling(null)} actions={(
          <>
            <Button variant="ghost" onClick={() => setSettling(null)} disabled={busy}>Cancel</Button>
            <Button type="submit" form="settle-form" disabled={busy}>{busy ? "Saving…" : "Settle"}</Button>
          </>
        )}>
          <form id="settle-form" onSubmit={settle} style={{ display: "grid", gap: 14 }}>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
              {reasonLabel(ticket.reason)}. Ordered {qtyText(ticket.orderedQtyBaseUnit, ticket)}, usable arrived {qtyText(ticket.receivedQtyBaseUnit, ticket)}.{ticket.note ? ` Kitchen says: “${ticket.note}”` : ""}
            </p>
            <Field label={`Accept into the kitchen's stock (${ticket.stockItemId?.unitId?.symbol || "units"})`}>
              <input type="number" min="0" step="any" inputMode="decimal" value={settling.form.acceptedQty} autoFocus onChange={(e) => set({ acceptedQty: e.target.value })} aria-invalid={Boolean(errors.acceptedQty) || undefined} />
              {errors.acceptedQty && <small style={{ color: "var(--danger)" }}>{errors.acceptedQty}</small>}
            </Field>
            {shortfall > 0 && (
              <label className="checkbox">
                <input type="checkbox" checked={settling.form.reorder} onChange={(e) => set({ reorder: e.target.checked })} />
                <span>Open a follow-up order for the missing {qtyText(shortfall, ticket)}<small style={{ display: "block", color: "var(--muted)" }}>A normal shared order for this kitchen, which other kitchens may join.</small></span>
              </label>
            )}
            <Field label="Note for the record (optional)">
              <input type="text" value={settling.form.note} maxLength={500} placeholder="e.g. vendor replaces the rest on Monday" onChange={(e) => set({ note: e.target.value })} />
            </Field>
          </form>
        </Modal>
      )}
    </>
  );
}
