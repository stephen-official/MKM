import { ArrowRight, Inbox, Plus, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { api } from "../../api";
import { useKitchenChanges } from "../../liveUpdates";
import "./KitchenLists.css";

const STATUS_TONE = { accepted: "low", rejected: "expired", pending: "soon" };
const formatDateTime = (value) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
const isPending = (transfer) => (transfer.status || "pending") === "pending";

/** Transfers between kitchens: start one, and accept or reject the ones sent to this kitchen. */
export default function KitchenTransfers({ onCreate }) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  // quiet: a live update refreshes the list in place instead of showing "Loading transfers…" again.
  const fetchTransfers = useCallback(async (quiet = false) => {
    if (quiet !== true) setLoading(true);
    try {
      const [history, incoming] = await Promise.all([api.get("/user-transfers/history"), api.get("/user-transfers/incoming")]);
      const merged = new Map((history.data || []).map((item) => [item._id, { ...item, isIncoming: false }]));
      (incoming.data || []).forEach((item) => merged.set(item._id, { ...item, isIncoming: true }));
      setTransfers([...merged.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch { toast.error("Failed to load transfers"); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void fetchTransfers(); }, [fetchTransfers]);
  useKitchenChanges(["transfers"], () => fetchTransfers(true));

  const respond = async (transfer, action) => {
    try { await api.post(`/user-transfers/${transfer._id}/${action}`); toast.success(`Transfer ${action === "accept" ? "accepted" : "rejected"}`); await fetchTransfers(); }
    catch (error) { toast.error(error.response?.data?.error || `Could not ${action} transfer`); }
  };

  // Two groups like the Ongoing orders list: what other kitchens sent here (ones still waiting for an answer first), then what this kitchen sent out.
  const groups = [
    ["Sent to you", transfers.filter((transfer) => transfer.isIncoming).sort((a, b) => Number(isPending(b)) - Number(isPending(a)))],
    ["Sent by you", transfers.filter((transfer) => !transfer.isIncoming)]
  ];
  const card = (transfer) => {
    const status = transfer.status || "pending";
    return <article className={`kg-glass kl-card${transfer.isIncoming && status === "pending" ? " kg-glass--cool" : ""}`} key={transfer._id}>
      <header className="kl-card__head">
        <div><p>{transfer.createdAt ? formatDateTime(transfer.createdAt) : "Transfer"}</p><h2>{transfer.fromGodownId?.name || "Kitchen"} <ArrowRight size={14} aria-hidden="true" /> {transfer.toGodownId?.name || "Kitchen"}</h2></div>
        <span className={`kg-pill kg-pill--${STATUS_TONE[status] || "routine"}`}>{status}</span>
      </header>
      <ul>{(transfer.items || []).map((item, index) => <li key={item.stockItemId?._id || index}><span>{item.stockItemId?.name || "Unknown item"}</span><strong>{item.qtyBaseUnit} {item.stockItemId?.unitId?.symbol || item.unit || "units"}</strong></li>)}</ul>
      {transfer.isIncoming && status === "pending" && <footer className="kl-card__foot">
        <button type="button" className="kg-btn" onClick={() => respond(transfer, "accept")}><Send size={16} aria-hidden="true" /> Accept transfer</button>
        <button type="button" className="kg-chip kl-reject" onClick={() => respond(transfer, "reject")}>Reject</button>
      </footer>}
    </article>;
  };

  return <main className="kl-shell">
    <button type="button" className="kg-glass kg-lift kl-create" onClick={onCreate}>
      <span className="kg-orb" aria-hidden="true"><Plus size={20} strokeWidth={1.8} /></span>
      <span><strong>New stock transfer</strong><small>Choose a destination and the items to send</small></span>
      <ArrowRight size={19} aria-hidden="true" />
    </button>
    {loading ? <div className="kg-glass kl-state" role="status"><span className="kl-spinner" aria-hidden="true" /><p>Loading transfers…</p></div>
      : transfers.length === 0 ? <div className="kg-glass kl-state"><Inbox size={28} strokeWidth={1.6} aria-hidden="true" /><h2>No transfers yet</h2><p>Incoming and outgoing transfers will appear here.</p></div>
      : groups.map(([heading, list]) => list.length > 0 && <section className="kl-group" key={heading} aria-label={heading}>
        <h2>{heading}</h2>
        <div className="kl-list">{list.map(card)}</div>
      </section>)}
  </main>;
}
