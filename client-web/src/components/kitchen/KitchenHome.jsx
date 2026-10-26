import { AlertCircle, AlertTriangle, ArrowRight, ArrowUpRight, CalendarDays, CalendarOff, CheckCircle2, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useWide } from "./useWide";
import { toLocalDateKey, localDateFromKey } from "../../utils/date";
import { expiryStatus, itemsToUseFirst } from "../../features/kitchen";
import { deliveryDateText, kitchenStage, myOrders, orderTimeline } from "../../features/kitchen/orders";
import "./KitchenHome.css";

const RECEIVABLE_STATUSES = new Set([
  "approved",
  "confirmed",
  "dispatched",
  "partially_received",
]);

const NO_HIDDEN = new Set();
const NO_ORDERS = [];

const asNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const statusOf = (record) => String(record?.status || "").toLowerCase();

const remainingToReceive = (line) => {
  const approved = asNumber(
    line?.approvedQty ?? line?.approvedQuantity ?? line?.qtyBaseUnit ?? line?.requestedQty ?? line?.quantity,
  );
  const received = asNumber(line?.receivedQty ?? line?.receivedQuantity);
  return Math.max(approved - received, 0);
};

const isReceivable = (indent) => {
  if (!RECEIVABLE_STATUSES.has(statusOf(indent))) return false;
  if (!Array.isArray(indent?.items) || indent.items.length === 0) return true;
  return indent.items.some((line) => {
    const lineStatus = statusOf(line);
    return (!lineStatus || ["approved", "confirmed", "dispatched", "partially_received"].includes(lineStatus)) &&
      remainingToReceive(line) > 0;
  });
};

// Built by hand rather than with Intl, whose output differs between phone browsers.
const LONG_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const longDate = (dateKey) => {
  const date = localDateFromKey(dateKey);
  return date ? `${LONG_DAYS[date.getDay()]} ${date.getDate()} ${LONG_MONTHS[date.getMonth()]}` : "";
};
/** "Today", "Yesterday", "2 days ago", "3 days ago" for recent dates; nothing for older ones. */
const relativeDay = (dateKey, today) => {
  const date = localDateFromKey(dateKey);
  const now = localDateFromKey(today);
  if (!date || !now) return "";
  const days = Math.round((now - date) / 86_400_000);
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : days === 2 || days === 3 ? `${days} days ago` : "";
};
/** The date line: the relative word in bold, then the full date in light italics ("Today, Saturday 24 October"). */
const DayLine = ({ dateKey, today, suffix = "" }) => {
  const when = relativeDay(dateKey, today);
  return <>{when && <strong className="kh-when">{when}, </strong>}<em className="kh-date">{longDate(dateKey)}</em>{suffix}</>;
};

const REASONS = [["closed", "Closed"], ["holiday", "Holiday"], ["other", "Other"]];
const REASON_LABEL = Object.fromEntries(REASONS);

const qtyText = (value, item) => `${asNumber(value).toLocaleString("en-IN", { maximumFractionDigits: 3 })} ${item.unit || item.unitId?.symbol || "units"}`;

/** One item line: name and hint on the left, a status pill, the quantity on the right. */
const Row = ({ name, hint, tone, status, qty, onClick }) => (
  <button type="button" className="kg-row kh-row" onClick={onClick}>
    <span className="kh-row__text"><strong>{name}</strong><small>{hint}</small></span>
    {status && <span className={`kg-pill kg-pill--${tone}`}>{status}</span>}
    {qty && <span className="kh-row__qty">{qty}</span>}
  </button>
);

/**
 * A collapsible section: the header (one tap target) carries the name, a count or pill, an exclamation mark when it
 * needs attention, and the chevron. Everything starts closed so the page stays short; the header says what is inside.
 */
const Section = ({ id, label, title, summary, attention = false, tint = "", open, onToggle, onOpen, wide = false, groupTitle = "Details", children }) => {
  const head = (
    <>
      <span className="kh-card__text">{label && <span className="kg-label">{label}</span>}<span className="kh-card__title" id={`${id}-title`}>{title}</span></span>
      {summary && <span className="kh-card__summary">{summary}</span>}
      {attention && <span className="kh-card__alert" role="img" aria-label="Needs attention"><AlertCircle size={20} strokeWidth={1.9} /></span>}
    </>
  );
  // Desktop: the whole tile is a link to its page (hover rim, arrow in the corner); the content sits in a dropdown row inside it.
  if (wide && onOpen) {
    return (
      <LinkTile className={`kg-glass kg-lift kh-card kh-card--link${tint}`} labelledBy={`${id}-title`} onOpen={onOpen}>
        <div className="kh-card__head kh-card__head--static">{head}<ArrowUpRight size={20} aria-hidden="true" /></div>
        <div className="kh-card__body"><Group id={id} title={groupTitle} open={open} onToggle={onToggle}>{children}</Group></div>
      </LinkTile>
    );
  }
  return (
    <section className={`kg-glass kh-card${tint}${open ? " is-open" : ""}`} aria-labelledby={`${id}-title`}>
      <button type="button" className="kh-card__head" onClick={onToggle} aria-expanded={open} aria-controls={`${id}-body`}>
        {head}
        <ChevronDown size={20} className={open ? "is-open" : ""} aria-hidden="true" />
      </button>
      <div id={`${id}-body`} className={`kh-drop${open ? " is-open" : ""}`}><div className="kh-card__body">{children}</div></div>
    </section>
  );
};

/** Kitchen inventory: on desktop a link tile to Stock with the two groups as summary rows; on a phone a card with dropdowns. */
const InventoryTile = ({ wide, onOpen, tint, children }) => {
  const head = <div className="kh-card__head kh-card__head--static"><span className="kh-card__text"><span className="kh-card__title" id="stock-title">Kitchen inventory</span></span>{wide && <ArrowUpRight size={20} aria-hidden="true" />}</div>;
  return wide
    ? <LinkTile className={`kg-glass kg-lift kh-card kh-card--link${tint}`} labelledBy="stock-title" onOpen={onOpen}>{head}{children}</LinkTile>
    : <section className={`kg-glass kh-card${tint}`} aria-labelledby="stock-title">{head}{children}</section>;
};

/** A card that behaves like a link: click or Enter anywhere on it opens the page. Buttons inside (dropdown headers, rows) keep their own tap. */
const LinkTile = ({ className, labelledBy, onOpen, children }) => {
  const onTile = (event) => !event.target.closest("button");
  return (
    <section className={className} aria-labelledby={labelledBy} role="link" tabIndex={0} onClick={(event) => { if (onTile(event)) onOpen(); }}
      onKeyDown={(event) => { if (onTile(event) && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onOpen(); } }}>
      {children}
    </section>
  );
};

/** A dropdown row inside a section (Stock has two: Use first and Running low). Same header grammar as a section, smaller. */
const Group = ({ id, title, summary, attention = false, open, onToggle, children }) => {
  const head = (
    <>
      <span className="kh-group__title">{title}</span>
      {summary && <span className="kh-card__summary">{summary}</span>}
      {attention && <span className="kh-card__alert" role="img" aria-label="Needs attention"><AlertCircle size={18} strokeWidth={1.9} /></span>}
    </>
  );
  return (
    <div className={`kh-group${open ? " is-open" : ""}`}>
      <button type="button" className="kh-group__head" onClick={onToggle} aria-expanded={open} aria-controls={`${id}-body`}>
        {head}
        <ChevronDown size={18} className={open ? "is-open" : ""} aria-hidden="true" />
      </button>
      <div id={`${id}-body`} className={`kh-drop${open ? " is-open" : ""}`}><div className="kh-group__body">{children}</div></div>
    </div>
  );
};

/**
 * Landing screen for a school kitchen: what to use first, what is running low, what is on its way.
 * All collections are optional, allowing the parent to render while data loads.
 */
export default function KitchenHome({
  userInfo,
  items = [],
  indents = [],
  orders = [],
  sharedOrders = NO_ORDERS,
  onRecordUsage,
  onRecordUsageOn,
  usageDays = null,
  onUndoNoUsage,
  onViewStock,
  onRequestSupplies,
  sharedToReceive = 0,
  hidden = NO_HIDDEN,
}) {
  // Views whose feature is off for this kitchen are not offered at all (rather than toasting on tap).
  const canRecordUsage = !hidden.has("usage");
  const canUseRequests = !hidden.has("requests");
  const today = toLocalDateKey();
  const [missedOpen, setMissedOpen] = useState(false);
  const wide = useWide();
  const [openSections, setOpenSections] = useState({});
  const isOpen = (key) => Boolean(openSections[key]);
  const toggle = (key) => setOpenSections((previous) => ({ ...previous, [key]: !previous[key] }));
  const godownId = userInfo?.godown?._id;

  const outOfStock = items.filter((item) => asNumber(item.currentQty ?? item.quantity ?? item.kitchenQty) <= 0);
  const lowStock = items.filter((item) => {
    const quantity = asNumber(item.currentQty ?? item.quantity ?? item.kitchenQty);
    const threshold = asNumber(
      item.thresholdBaseUnit ?? item.threshold ?? item.lowStockThreshold ??
      item.minimumStock ?? item.reorderLevel ?? item.minQty,
    );
    return quantity > 0 && threshold > 0 && quantity <= threshold;
  });
  const attentionItems = [...outOfStock, ...lowStock];
  // Expired or expiring within the week, most urgent first; usable items only, since the rest cannot be recorded anyway.
  const useFirst = itemsToUseFirst(items.filter((item) => item.available !== false), today);
  const expiredCount = useFirst.filter((item) => expiryStatus(item, today).key === "expired").length;
  // Shared orders this kitchen is on that have not arrived yet, newest first.
  const inProgressOrders = myOrders(sharedOrders, godownId)
    .filter((order) => !["delivered", "cancelled"].includes(kitchenStage(order, godownId)))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  // Old-style deliveries plus shares of shared orders that have been dispatched to this kitchen.
  const toReceive = indents.filter(isReceivable).length + sharedToReceive;
  const todaysEntries = orders.filter(
    (entry) => toLocalDateKey(entry?.date || entry?.usageDate || entry?.createdAt) === today,
  );
  // The server's day-by-day account (per kitchen) wins; the per-login entries are the fallback while it loads.
  const todayRow = usageDays?.days?.find((day) => day.date === today) || null;
  const usageComplete = todayRow ? todayRow.status === "recorded" : todaysEntries.length > 0;
  const todayNone = todayRow?.status === "none";
  const entryCount = todayRow ? todayRow.entries : todaysEntries.length;
  const missedDays = (usageDays?.days || []).filter((day) => day.status === "missed" && day.date !== today);

  return (
    <main className="kh-shell">
      <section className="kh-top" aria-label="Today">
        {canRecordUsage && <div className={`kg-glass${wide ? " kg-lift" : ""} kh-day${usageComplete || todayNone ? "" : " kg-glass--warm"}`}>
          <span className="kg-orb kh-day__icon" aria-hidden="true">{usageComplete ? <CheckCircle2 size={20} strokeWidth={1.6} /> : todayNone ? <CalendarOff size={20} strokeWidth={1.6} /> : <CalendarDays size={20} strokeWidth={1.6} />}</span>
          <div className="kh-day__text">
            <p className="kh-day__date"><DayLine dateKey={today} today={today} suffix={usageComplete ? ` · ${entryCount} ${entryCount === 1 ? "entry" : "entries"} recorded` : todayNone ? ` · No usage (${REASON_LABEL[todayRow.reason] || "other"})` : ""} /></p>
          </div>
          <div className="kh-day__actions">
            <button type="button" className="kg-btn" onClick={onRecordUsage}>
              {usageComplete ? "Add more" : todayNone ? "Record anyway" : "Record"}<ArrowRight size={17} strokeWidth={1.8} aria-hidden="true" />
            </button>
            {todayNone && onUndoNoUsage && <button type="button" className="kg-chip" onClick={() => onUndoNoUsage(today)}>Undo</button>}
          </div>
          {/* Days in the last month with neither usage nor a "no usage" mark: a red row that drops the list open in place. */}
          {missedDays.length > 0 && <div className="kh-missed">
            <button type="button" className="kh-day__missed" onClick={() => setMissedOpen((value) => !value)} aria-expanded={missedOpen} aria-controls="kh-missed-list">
              <AlertTriangle size={16} strokeWidth={1.9} aria-hidden="true" />
              <span>{missedDays.length} missed {missedDays.length === 1 ? "day" : "days"} · usage not recorded</span>
              <ChevronDown size={18} className={missedOpen ? "is-open" : ""} aria-hidden="true" />
            </button>
            <div id="kh-missed-list" className={`kh-drop${missedOpen ? " is-open" : ""}`}><ul className="kh-missed__list">
              {missedDays.map((day) => <li key={day.date}>
                <div className="kh-missed__row">
                  <span className="kh-missed__date"><DayLine dateKey={day.date} today={today} /></span>
                  <button type="button" className="kg-btn" onClick={() => onRecordUsageOn?.(day.date)}>Record</button>
                </div>
              </li>)}
            </ul></div>
          </div>}
        </div>}
      </section>

      <div className="kh-cols">
        <div className="kh-col">
          <InventoryTile wide={wide} onOpen={onViewStock} tint={expiredCount > 0 || outOfStock.length > 0 ? " kg-glass--rose" : useFirst.length > 0 || lowStock.length > 0 ? " kg-glass--warm" : ""}>
            <div className="kh-card__body">
              {canRecordUsage && <Group id="use-first" title="Use first" attention={useFirst.length > 0}
                summary={expiredCount > 0 ? <span className="kg-pill kg-pill--expired">{expiredCount} expired</span> : `${useFirst.length} ${useFirst.length === 1 ? "item" : "items"}`}
                open={isOpen("use-first")} onToggle={() => toggle("use-first")}>
                {useFirst.length === 0 && <Row name="Nothing expiring this week" hint="Every dated item has more than 7 days left" tone="routine" status="In date" onClick={onViewStock} />}
                {useFirst.slice(0, 3).map((item, index) => {
                  const expiry = expiryStatus(item, today);
                  const expired = expiry.key === "expired";
                  return <Row key={item._id || item.stockRecordId || `${item.name}-${index}`} name={item.name || "Unnamed item"}
                    hint={expired ? "Check before using" : "Use within the week"} tone={expired ? "expired" : "soon"} status={expiry.label}
                    qty={qtyText(expiry.qtyBaseUnit, item)} onClick={onRecordUsage} />;
                })}
              </Group>}

              <Group id="running-low" title="Running low" attention={attentionItems.length > 0}
                summary={outOfStock.length > 0 ? <span className="kg-pill kg-pill--expired">{outOfStock.length} out of stock</span> : lowStock.length > 0 ? <span className="kg-pill kg-pill--low">{lowStock.length} low</span> : "All fine"}
                open={isOpen("running-low")} onToggle={() => toggle("running-low")}>
                {attentionItems.length === 0 && <Row name="All stock above its low level" hint={`${items.filter((item) => item.available !== false).length} items you can use`} tone="routine" status="Fine" onClick={onViewStock} />}
                {attentionItems.slice(0, 3).map((item, index) => {
                  const quantity = asNumber(item.currentQty ?? item.quantity ?? item.kitchenQty);
                  const out = quantity <= 0;
                  return <Row key={item._id || item.stockRecordId || `${item.name}-${index}`} name={item.name || "Unnamed item"}
                    hint={out ? "Ask for supplies now" : "Ask for supplies soon"} tone={out ? "expired" : "low"} status={out ? "Out of stock" : "Low stock"}
                    qty={qtyText(quantity, item)} onClick={onViewStock} />;
                })}
                <div className="kh-card__foot"><button type="button" className="kg-chip" onClick={onViewStock}>View all</button></div>
              </Group>
            </div>
          </InventoryTile>
        </div>

        {canUseRequests && <div className="kh-col kh-col--side">
          <Section id="incoming" title="Requests" groupTitle="Open requests" tint={toReceive > 0 ? " kg-glass--cool" : ""} attention={toReceive > 0} wide={wide} onOpen={onRequestSupplies}
            summary={toReceive > 0 ? <span className="kg-pill kg-pill--low">{toReceive} arriving</span> : <span className="kh-count">{inProgressOrders.length}</span>}
            open={isOpen("incoming")} onToggle={() => toggle("incoming")}>
            {inProgressOrders.length === 0 && <Row name="No open requests" hint="Start one when you run short of anything" tone="routine" status="None" onClick={onRequestSupplies} />}
            {inProgressOrders.slice(0, 3).map((order) => (
              <button type="button" key={order._id} className="kg-row kh-order" onClick={onRequestSupplies}>
                <span className="kh-order__head">
                  <span className="kh-row__text">
                    <strong>{order.title || "Supply request"}</strong>
                    <small>{order.neededBy ? `Delivery by ${deliveryDateText(order.neededBy)}` : "Shared order"}</small>
                  </span>
                  <span className="kh-order__open">Open<ArrowUpRight size={15} strokeWidth={2} aria-hidden="true" /></span>
                </span>
                <span className="kh-steps">
                  <ol aria-label="Request status">
                    {orderTimeline(order, godownId).map((step) => <li key={step.key} className={step.done ? "is-done" : ""} aria-label={`${step.label}${step.done ? ", done" : ""}`} />)}
                  </ol>
                  <small>{orderTimeline(order, godownId).find((step) => step.current)?.label || "Requested"}</small>
                </span>
              </button>
            ))}
            <div className="kh-card__foot"><button type="button" className="kh-link" onClick={onRequestSupplies}>View all</button></div>
          </Section>
        </div>}
      </div>
    </main>
  );
}
