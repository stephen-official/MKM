import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Minus, Plus } from "lucide-react";
import { toast } from "react-hot-toast";
import { api } from "../../api";
import { adminChanges, myShare } from "../../features/kitchen/orders";
import "../ui/ConfirmDialog.css";
import "./AdminChangeDialog.css";

const qty = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const TAG = {
  up: { icon: ArrowUp, word: "More" },
  down: { icon: ArrowDown, word: "Less" },
  added: { icon: Plus, word: "New" },
  removed: { icon: Minus, word: "Removed" },
};

/** The strip inside an order's container on Home and Orders: shown while the central team's change is unseen. */
export function AdminChangeNotice({ order, godownId }) {
  return adminChanges(myShare(order, godownId)).length > 0
    ? <span className="kac-notice"><span className="kac-notice__dot" aria-hidden="true" />Your admin changed items · Tap to see</span>
    : null;
}

/**
 * What the central team changed in this kitchen's items, one line per product with an arrow: green up for more, red
 * down for less, green + for new, red − for removed. "OK" marks it seen for the whole kitchen; closing keeps it.
 */
export function AdminChangeDialog({ order, godownId, onClose }) {
  const [busy, setBusy] = useState(false);
  const rows = adminChanges(myShare(order, godownId));

  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ok = async () => {
    setBusy(true);
    try {
      await api.post(`/procurement/collaborative-purchase-orders/${order._id}/contributions/me/change-seen`);
      onClose(true);
    } catch {
      toast.error("Could not save. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <div className="cd-layer" role="presentation">
      <button type="button" className="cd-backdrop" aria-label="Close" onClick={() => onClose()} />
      <section className="cd-panel kac-panel" role="dialog" aria-modal="true" aria-labelledby="kac-title">
        <h2 id="kac-title">Your admin changed items</h2>
        <p>Your order now has these changes.</p>
        <ul className="kac-rows">
          {rows.map((row) => {
            const { icon: Icon, word } = TAG[row.kind];
            return (
              <li key={row.id} className={`kac-row kac-row--${row.kind}`}>
                <strong className="kac-row__name">{row.name}</strong>
                <span className="kac-row__amounts">
                  {row.before !== null && <span className="kac-row__before">{qty(row.before)} {row.unit}</span>}
                  {row.before !== null && row.after !== null && <span aria-hidden="true">→</span>}
                  {row.after !== null && <span className="kac-row__after">{qty(row.after)} {row.unit}</span>}
                </span>
                <span className={`kac-tag kac-tag--${row.kind}`}><Icon size={14} strokeWidth={2.4} aria-hidden="true" />{word}</span>
              </li>
            );
          })}
        </ul>
        <footer>
          <button type="button" className="cd-confirm" disabled={busy} onClick={ok} autoFocus>{busy ? "Saving…" : "OK"}</button>
        </footer>
      </section>
    </div>
  );
}
