import { ClipboardCheck, History, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toLocalDateKey } from "../../utils/date";
import DateField from "../ui/DateField";
import "./KitchenLists.css";

const formatDateTime = (value) => new Intl.DateTimeFormat("en-IN", {
  day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
}).format(new Date(value));

const itemName = (item) => item.stockItemId?.name || item.name || "Unknown item";

/** History: every usage entry this kitchen recorded, newest first, filtered by item name and/or a single day. */
export default function KitchenActivity({ entries = [] }) {
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const query = search.trim().toLowerCase();
  // While searching, each card lists only the items that match, and cards with no match are left out.
  const visibleEntries = useMemo(() => entries
    .filter((entry) => !date || toLocalDateKey(entry.historyTime || entry.date || entry.createdAt) === date)
    .map((entry) => (query ? { ...entry, items: (entry.items || []).filter((item) => itemName(item).toLowerCase().includes(query)) } : entry))
    .filter((entry) => !query || entry.items.length > 0), [date, entries, query]);

  return (
    <main className="kl-shell">
      <header className="kl-intro">
        <span className="kg-orb kl-intro__icon" aria-hidden="true"><History size={23} strokeWidth={1.7} /></span>
        <div><p>Kitchen records</p><h1>History</h1><span>Usage recorded by your kitchen, newest first.</span></div>
      </header>
      <label className="kl-search kg-float">
        <Search size={20} aria-hidden="true" />
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search items" aria-label="Search items" autoComplete="off" />
        {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search"><X size={18} aria-hidden="true" /></button>}
      </label>
      <label className="kg-glass kl-filter">
        <DateField value={date} label="Filter by date" placeholder="Filter by date" onChange={setDate} />
        {date && <button type="button" onClick={() => setDate("")}>Clear</button>}
      </label>
      {visibleEntries.length === 0 ? (
        <section className="kg-glass kl-state"><ClipboardCheck size={28} strokeWidth={1.6} aria-hidden="true" /><h2>No usage records</h2><p>{query ? `No usage of “${search.trim()}” was recorded${date ? " on this date" : ""}.` : date ? "No usage was recorded on this date." : "Recorded usage will appear here."}</p></section>
      ) : (
        <section className="kl-list" aria-label="Usage history">
          {visibleEntries.map((entry) => (
            <article className="kg-glass kl-card" key={`${entry.type}-${entry._id}`}>
              <header className="kl-card__head">
                <div><p>{entry.type === "daily" ? "Daily-use record" : "Stock usage"}</p><h2>{formatDateTime(entry.historyTime)}</h2></div>
                <span className="kg-pill kg-pill--low">Recorded</span>
              </header>
              <ul>{(entry.items || []).map((item, index) => <li key={item.stockItemId?._id || index}><span>{itemName(item)}</span><strong>{Number(item.qtyBaseUnit || item.quantity || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 })} {item.stockItemId?.unitId?.symbol || item.unit || "units"}</strong></li>)}</ul>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
