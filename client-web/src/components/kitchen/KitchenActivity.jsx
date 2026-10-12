import { CalendarDays, ClipboardCheck, History } from "lucide-react";
import { useMemo, useState } from "react";
import { toLocalDateKey } from "../../utils/date";
import "./KitchenSecondaryScreens.css";

const formatDateTime = (value) => new Intl.DateTimeFormat("en-IN", {
  day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
}).format(new Date(value));

export default function KitchenActivity({ entries = [] }) {
  const [date, setDate] = useState("");
  const visibleEntries = useMemo(
    () => entries.filter((entry) => !date || toLocalDateKey(entry.historyTime || entry.date || entry.createdAt) === date),
    [date, entries],
  );

  return (
    <main className="kss-shell">
      <header className="kss-header">
        <span><History size={23} /></span>
        <div><p>Kitchen records</p><h1>Usage activity</h1><small>Review previously recorded kitchen usage.</small></div>
      </header>
      <label className="kss-date-filter">
        <CalendarDays size={19} aria-hidden="true" /><span>Filter by date</span>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        {date && <button type="button" onClick={() => setDate("")}>Clear</button>}
      </label>
      {visibleEntries.length === 0 ? (
        <section className="kss-empty"><ClipboardCheck size={30} /><h2>No usage records</h2><p>{date ? "No usage was recorded on this date." : "Recorded usage will appear here."}</p></section>
      ) : (
        <section className="kss-list" aria-label="Usage history">
          {visibleEntries.map((entry) => (
            <article className="kss-card" key={`${entry.type}-${entry._id}`}>
              <header><div><p>{entry.type === "daily" ? "Daily-use record" : "Stock usage"}</p><h2>{formatDateTime(entry.historyTime)}</h2></div><span className="kss-chip kss-chip--positive">Recorded</span></header>
              <ul>{(entry.items || []).map((item, index) => <li key={item.stockItemId?._id || index}><span>{item.stockItemId?.name || item.name || "Unknown item"}</span><strong>{Number(item.qtyBaseUnit || item.quantity || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 })} {item.stockItemId?.unitId?.symbol || item.unit || "units"}</strong></li>)}</ul>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
