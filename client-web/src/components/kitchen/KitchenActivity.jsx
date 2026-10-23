import { CalendarDays, ClipboardCheck, History } from "lucide-react";
import { useMemo, useState } from "react";
import { toLocalDateKey } from "../../utils/date";
import DateField from "../ui/DateField";
import "./KitchenLists.css";

const formatDateTime = (value) => new Intl.DateTimeFormat("en-IN", {
  day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
}).format(new Date(value));

/** History: every usage entry this kitchen recorded, newest first, with an optional single-day filter. */
export default function KitchenActivity({ entries = [] }) {
  const [date, setDate] = useState("");
  const visibleEntries = useMemo(
    () => entries.filter((entry) => !date || toLocalDateKey(entry.historyTime || entry.date || entry.createdAt) === date),
    [date, entries],
  );

  return (
    <main className="kl-shell">
      <header className="kl-intro">
        <span className="kg-orb kl-intro__icon" aria-hidden="true"><History size={23} strokeWidth={1.7} /></span>
        <div><p>Kitchen records</p><h1>History</h1><span>Usage recorded by your kitchen, newest first.</span></div>
      </header>
      <label className="kg-glass kl-filter">
        <CalendarDays size={19} aria-hidden="true" /><span>Filter by date</span>
        <DateField value={date} label="Filter by date" placeholder="Any date" onChange={setDate} />
        {date && <button type="button" onClick={() => setDate("")}>Clear</button>}
      </label>
      {visibleEntries.length === 0 ? (
        <section className="kg-glass kl-state"><ClipboardCheck size={28} strokeWidth={1.6} aria-hidden="true" /><h2>No usage records</h2><p>{date ? "No usage was recorded on this date." : "Recorded usage will appear here."}</p></section>
      ) : (
        <section className="kl-list" aria-label="Usage history">
          {visibleEntries.map((entry) => (
            <article className="kg-glass kl-card" key={`${entry.type}-${entry._id}`}>
              <header className="kl-card__head">
                <div><p>{entry.type === "daily" ? "Daily-use record" : "Stock usage"}</p><h2>{formatDateTime(entry.historyTime)}</h2></div>
                <span className="kg-pill kg-pill--low">Recorded</span>
              </header>
              <ul>{(entry.items || []).map((item, index) => <li key={item.stockItemId?._id || index}><span>{item.stockItemId?.name || item.name || "Unknown item"}</span><strong>{Number(item.qtyBaseUnit || item.quantity || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 })} {item.stockItemId?.unitId?.symbol || item.unit || "units"}</strong></li>)}</ul>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
