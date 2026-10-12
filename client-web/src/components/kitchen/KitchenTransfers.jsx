import { ArrowRight, Inbox, Plus, RefreshCw, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { api } from "../../api";
import "./KitchenSecondaryScreens.css";

export default function KitchenTransfers({ onCreate }) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const [history, incoming] = await Promise.all([api.get("/user-transfers/history"), api.get("/user-transfers/incoming")]);
      const merged = new Map((history.data || []).map((item) => [item._id, { ...item, isIncoming: false }]));
      (incoming.data || []).forEach((item) => merged.set(item._id, { ...item, isIncoming: true }));
      setTransfers([...merged.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch { toast.error("Failed to load transfers"); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void fetchTransfers(); }, [fetchTransfers]);

  const respond = async (transfer, action) => {
    try { await api.post(`/user-transfers/${transfer._id}/${action}`); toast.success(`Transfer ${action === "accept" ? "accepted" : "rejected"}`); await fetchTransfers(); }
    catch (error) { toast.error(error.response?.data?.error || `Could not ${action} transfer`); }
  };

  return <main className="kss-shell">
    <header className="kss-page-heading"><div><p>Between kitchens</p><h1>Stock transfers</h1><span>Send stock or respond to incoming transfers.</span></div><button type="button" onClick={fetchTransfers} disabled={loading} aria-label="Refresh transfers"><RefreshCw size={19} className={loading ? "kss-spin" : ""} /></button></header>
    <button type="button" className="kss-create" onClick={onCreate}><Plus size={20} /><span><strong>New stock transfer</strong><small>Choose a destination and the items to send</small></span><ArrowRight size={19} /></button>
    {loading ? <div className="kss-empty"><RefreshCw className="kss-spin" /><p>Loading transfers…</p></div> : transfers.length === 0 ? <div className="kss-empty"><Inbox size={30} /><h2>No transfers yet</h2><p>Incoming and outgoing transfers will appear here.</p></div> : <section className="kss-list">
      {transfers.map((transfer) => <article className="kss-card" key={transfer._id}>
        <header><div><p>{transfer.isIncoming ? "Incoming" : "Outgoing"}</p><h2>{transfer.fromGodownId?.name || "Kitchen"} <ArrowRight size={14} /> {transfer.toGodownId?.name || "Kitchen"}</h2></div><span className={`kss-chip kss-chip--${transfer.status === "accepted" ? "positive" : transfer.status === "rejected" ? "critical" : "warning"}`}>{transfer.status || "pending"}</span></header>
        <ul>{(transfer.items || []).map((item, index) => <li key={item.stockItemId?._id || index}><span>{item.stockItemId?.name || "Unknown item"}</span><strong>{item.qtyBaseUnit} {item.stockItemId?.unitId?.symbol || item.unit || "units"}</strong></li>)}</ul>
        {transfer.isIncoming && transfer.status === "pending" && <footer><button type="button" className="kss-accept" onClick={() => respond(transfer, "accept")}><Send size={16} /> Accept transfer</button><button type="button" className="kss-reject" onClick={() => respond(transfer, "reject")}>Reject</button></footer>}
      </article>)}
    </section>}
  </main>;
}
