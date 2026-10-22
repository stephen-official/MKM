import { AlertTriangle, ChevronUp, Minus, Plus, Search, Utensils, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { formatDateKey, toLocalDateKey } from "../../utils/date";
import { expiryStatus, formatStockQuantity, productPacks, sortByExpiry, withPackaging } from "../../features/kitchen";
import DateField from "../ui/DateField";
import { useConfirm } from "../ui/ConfirmDialog";
import OrderTicket from "./OrderTicket";
import "./KitchenUsageScreen.css";

const itemId = (item) => item?.stockRecordId || item?._id || item?.stockItemId?._id || item?.stockItemId;

const availableQuantity = (item) => {
  const value = Number(item?.currentQty ?? item?.quantity ?? item?.kitchenQty ?? 0);
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
};

const unitOf = (item) => item?.unit || item?.unitId?.symbol || item?.stockItemId?.unitId?.symbol || "units";

const quantityFor = (quantities, item) => {
  const id = itemId(item);
  if (Array.isArray(quantities)) {
    const entry = quantities.find((candidate) => itemId(candidate) === id);
    return entry?.requestedQty ?? entry?.qtyBaseUnit ?? entry?.quantity ?? "";
  }
  if (quantities instanceof Map) return quantities.get(id) ?? "";
  return quantities?.[id] ?? "";
};

const numericQuantity = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const displayNumber = (value) =>
  Number(value).toLocaleString("en-IN", { maximumFractionDigits: 3 });

/** The pack the cook is counting in for this item (from the cart entry), or null for the base unit. */
const packFor = (quantities, item) => {
  if (!Array.isArray(quantities)) return null;
  const entry = quantities.find((candidate) => itemId(candidate) === itemId(item));
  return entry?.packId && Number(entry.packSize) > 0 ? { packId: entry.packId, packName: entry.packName, packSize: Number(entry.packSize) } : null;
};
/** Cooks count rice in bags and oil in tins, so the biggest pack is the starting unit; the toggle switches to kg. */
const defaultPackFor = (item) => [...productPacks(item)].sort((a, b) => Number(b.size) - Number(a.size))[0] || null;
const packLabel = (pack, count) => (count === 1 ? pack.packName : `${pack.packName}s`);
const initialOf = (name) => (String(name).trim().charAt(0) || "?").toUpperCase();
/** "5 days left until it expires", "expires today", "expired 4 days ago": the quiet line under the expiry date (same words as Stock). */
const daysLeftText = (expiry) => {
  const days = expiry.daysLeft;
  if (days === null || days === undefined) return "";
  if (days < 0) return days === -1 ? "expired yesterday" : `expired ${-days} days ago`;
  if (days === 0) return "expires today";
  return `${days} ${days === 1 ? "day" : "days"} left until it expires`;
};

/** From 900px the ticket is a column beside the list; below that it lives in a bottom sheet behind the ticket bar. */
const WIDE = "(min-width: 900px)";
const useWide = () => {
  const [wide, setWide] = useState(() => Boolean(window.matchMedia?.(WIDE).matches));
  useEffect(() => {
    const query = window.matchMedia?.(WIDE);
    if (!query) return undefined;
    const update = () => setWide(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return wide;
};

export default function KitchenUsageScreen({
  items = [],
  loading = false,
  selectedDate = "",
  onDateChange,
  quantities = {},
  cart,
  onQuantityChange,
  onPackagingChange,
  onClear,
  onSubmit,
  submitting = false,
}) {
  const [search, setSearch] = useState("");
  const [ticketOpen, setTicketOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Cards the cook has tapped "Add" on but not counted yet: { [id]: { unit: null | "base" | packId } }.
  // The number box stays locked until a unit is chosen; items with no packs have only one unit, so it is chosen for them.
  const [started, setStarted] = useState({});
  const wide = useWide();
  const [confirm, confirmDialog] = useConfirm();
  const quantitySource = cart ?? quantities;
  const today = toLocalDateKey();

  // Expired and soon-to-expire stock first, so the cook uses it first; the deduction on the server follows the same order.
  const visibleItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const ordered = sortByExpiry(items, today);
    if (!query) return ordered;
    return ordered.filter((item) =>
      String(item?.name || "").toLocaleLowerCase().includes(query),
    );
  }, [items, search, today]);

  const selectedItems = useMemo(
    () => items.filter((item) => numericQuantity(quantityFor(quantitySource, item)) > 0),
    [items, quantitySource],
  );
  // Ticket rows in the order the cook added them (the cart array keeps that order); the stock list stays alphabetical.
  const ticketRows = useMemo(() => {
    const source = Array.isArray(quantitySource) ? quantitySource : selectedItems;
    return source.flatMap((entry) => {
      const item = items.find((candidate) => itemId(candidate) === itemId(entry));
      const amount = numericQuantity(quantityFor(quantitySource, entry));
      const pack = packFor(quantitySource, entry);
      return item && amount > 0 ? [{ id: itemId(item), name: item.name || "Unnamed supply", amount, unit: pack ? `${packLabel(pack, amount)} · ${displayNumber(amount * pack.packSize)} ${unitOf(item)}` : unitOf(item) }] : [];
    });
  }, [items, quantitySource, selectedItems]);

  // Quantities are entered in the unit the cook chose (bags or kg); the cap and the cart entry carry that pack.
  const updateQuantity = (item, nextValue, pack = packFor(quantitySource, item)) => {
    const product = pack ? withPackaging(item, pack.packId) : item;
    if (nextValue === "") {
      onQuantityChange?.(product, "");
      return;
    }
    if (!/^\d*(\.\d{0,3})?$/.test(String(nextValue))) return;
    const size = pack ? pack.packSize : 1;
    const available = availableQuantity(item);
    const availableInUnit = Number((available / size).toFixed(3));
    if (Number(nextValue) * size > available + 1e-9) {
      // The server refuses usage above the balance, so cap it, but say so: a real overrun means the stock is wrong.
      toast.error(`Only ${formatStockQuantity(available, unitOf(item), item)} in stock. Used more? Tell the central store so your stock can be corrected.`,
        { id: `usage-cap-${item?.stockRecordId || item?._id}` });
    }
    const next = Math.min(Number(nextValue) || 0, availableInUnit);
    onQuantityChange?.(product, nextValue.endsWith?.(".") ? nextValue : next);
  };
  const setAmount = (item, amount, pack) => updateQuantity(item, amount > 0 ? String(amount) : "", pack);
  // First tap on "Add": start counting in the biggest pack when the product has one.
  const addItem = (item) => setStarted((previous) => ({ ...previous, [itemId(item)]: { unit: productPacks(item).length ? null : "base" } }));
  const chooseUnit = (item, unit) => {
    setStarted((previous) => ({ ...previous, [itemId(item)]: { unit } }));
    switchUnit(item, unit);
  };
  const removeItem = (item) => {
    setAmount(item, 0);
    setStarted((previous) => { const next = { ...previous }; delete next[itemId(item)]; return next; });
  };
  // Switching the unit keeps what was entered: 2 bags becomes 50 kg, 50 kg becomes 2 bags.
  const switchUnit = (item, packId) => {
    const current = packFor(quantitySource, item);
    const base = numericQuantity(quantityFor(quantitySource, item)) * (current ? current.packSize : 1);
    const target = packId === "base" ? null : productPacks(item).find((candidate) => String(candidate._id) === String(packId));
    const next = target ? { packId: target._id, packName: target.name, packSize: Number(target.size) } : null;
    onPackagingChange?.(item, packId);
    const converted = Number((base / (next ? next.packSize : 1)).toFixed(3));
    if (converted > 0) setAmount(item, converted, next);
  };
  const changeRow = (id, amount) => {
    const item = items.find((candidate) => itemId(candidate) === id);
    if (item) setAmount(item, amount);
  };
  const clearTicket = async () => {
    if (await confirm({ title: "Remove all items from the ticket?", message: "Nothing has been recorded yet.", confirmLabel: "Remove all", danger: true })) onClear?.();
  };
  // The sheet closes itself once the ticket is empty (after a successful "Record usage" the cart is cleared).
  const rowCount = ticketRows.length;
  const [seenCount, setSeenCount] = useState(rowCount);
  if (seenCount !== rowCount) {
    setSeenCount(rowCount);
    if (rowCount === 0) { setSheetOpen(false); setStarted({}); }
  }
  useEffect(() => {
    if (!sheetOpen) return undefined;
    const onKey = (event) => { if (event.key === "Escape") setSheetOpen(false); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", onKey); };
  }, [sheetOpen]);

  const ticket = <OrderTicket title="Usage ticket" rows={ticketRows} meta={[{ label: "Usage date", value: formatDateKey(selectedDate) }]}
    emptyText="Tap “Add” on a supply below and it will be listed here." open={wide ? ticketOpen : true} onToggle={wide ? () => setTicketOpen((value) => !value) : undefined}
    onChange={changeRow} onClear={onClear ? clearTicket : undefined}
    onSubmit={onSubmit} submitLabel="Record usage" submitting={submitting} submitDisabled={!selectedDate} />;

  return (
    <main className="kus-screen">
      {confirmDialog}
      <header className="kus-intro">
        <span className="kus-intro__icon" aria-hidden="true"><Utensils size={23} /></span>
        <div>
          <p>Daily stock update</p>
          <h1>Record usage</h1>
          <span>Enter the supplies used by your kitchen.</span>
        </div>
      </header>

      <div className="kus-layout">
      {wide && ticket}
      <div className="kus-main">
      <section className="kg-glass kus-controls" aria-label="Usage details">
        <label className="kus-date">
          <span>Usage date</span>
          <DateField value={selectedDate} max={today} required label="Usage date"
            onChange={(value) => onDateChange?.(value)} disabled={submitting} />
        </label>
        <label className="kus-search">
          <span className="kus-visually-hidden">Search kitchen stock</span>
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search supplies"
            autoComplete="off"
          />
          {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search">Clear</button>}
        </label>
      </section>

      <section className="kus-stock" aria-labelledby="kus-stock-title" aria-busy={loading}>
        <div className="kus-section-heading">
          <div><p>Kitchen stock</p><h2 id="kus-stock-title">What did you use?</h2></div>
          {!loading && <span>{visibleItems.length} {visibleItems.length === 1 ? "item" : "items"}</span>}
        </div>

        {loading ? (
          <div className="kg-glass kus-state" role="status"><span className="kus-spinner" />Loading kitchen stock…</div>
        ) : visibleItems.length === 0 ? (
          <div className="kg-glass kus-state"><Search size={25} aria-hidden="true" /><strong>No supplies found</strong><span>Try a different item name.</span></div>
        ) : (
          <div className="kus-list">
            {visibleItems.map((item, index) => {
              const id = itemId(item) || `${item?.name}-${index}`;
              const available = availableQuantity(item);
              const rawQuantity = quantityFor(quantitySource, item);
              const used = numericQuantity(rawQuantity);
              const unit = unitOf(item);
              const pack = packFor(quantitySource, item);
              const packs = productPacks(item);
              const usedBase = used * (pack ? pack.packSize : 1);
              const remaining = Math.max(available - usedBase, 0);
              const isSelected = used > 0;
              const expiry = expiryStatus(item, today);
              const entryUnit = pack ? packLabel(pack, used || 1) : unit;
              const begun = isSelected || Boolean(started[id]);
              const chosenUnit = isSelected ? (pack ? pack.packId : "base") : started[id]?.unit ?? null;
              const unitChosen = chosenUnit !== null;
              const image = item?.image && item.image !== "null" ? item.image : "";
              const tone = expiry.key === "expired" ? " kus-item--expired" : expiry.key === "soon" ? " kus-item--soon" : "";

              return (
                <article className={`kg-glass kg-lift kus-item${isSelected ? " kus-item--selected" : ""}${tone}`} key={id}>
                  <div className={`kus-item__media${image ? " has-image" : ""}`} aria-hidden="true">
                    {image ? <img src={image} alt="" loading="lazy" decoding="async" /> : <span>{initialOf(item?.name || "?")}</span>}
                  </div>
                  <div className="kus-item__body">
                    <h3>{item?.name || "Unnamed supply"}</h3>
                    <dl className="kus-facts">
                      <div>
                        <dt>Available</dt>
                        <dd>{available === 0
                          ? <span className="kus-facts__none">Out of stock</span>
                          : <>{formatStockQuantity(available, unit, item)}{packs.length > 0 && <small> · {displayNumber(available)} {unit}</small>}</>}</dd>
                      </div>
                      <div>
                        <dt>Expiry</dt>
                        <dd>
                          {expiry.key === "none" ? <span className="kus-facts__none">No date</span> : formatDateKey(expiry.date)}
                          {expiry.key !== "none" && <em className={`kus-facts__days kus-facts__days--${expiry.tone}`}>{daysLeftText(expiry)}</em>}
                        </dd>
                      </div>
                    </dl>

                    {!begun ? (
                      <div className="kus-item__entry">
                        <span className="kus-item__label">Quantity used</span>
                        <button type="button" className="kt-add" onClick={() => addItem(item)} disabled={available === 0 || submitting} aria-label={`Add ${item?.name || "item"}`}><Plus size={17} aria-hidden="true" /> Add<span>{defaultPackFor(item)?.name || unit}</span></button>
                      </div>
                    ) : (
                      <>
                        {packs.length > 0 && (
                          <div className="kus-unit" role="group" aria-label={`Count ${item?.name || "item"} in`}>
                            <span className="kus-item__label">Count in</span>
                            {packs.map((candidate) => <button type="button" key={candidate._id} className={String(chosenUnit) === String(candidate._id) ? "is-on" : ""} aria-pressed={String(chosenUnit) === String(candidate._id)} disabled={submitting} onClick={() => chooseUnit(item, candidate._id)}>{candidate.name}</button>)}
                            <button type="button" className={chosenUnit === "base" ? "is-on" : ""} aria-pressed={chosenUnit === "base"} disabled={submitting} onClick={() => chooseUnit(item, "base")}>{unit}</button>
                          </div>
                        )}
                        {packs.length > 0 && (
                          !unitChosen
                            ? <p className="kus-unit__note kus-unit__note--error" role="alert"><AlertTriangle size={14} aria-hidden="true" /> Please select units</p>
                            : <p className="kus-unit__note">{pack
                              ? <>1 × {pack.packName} = <strong>{displayNumber(pack.packSize)} {unit}</strong></>
                              : <>Counted in {unit} · 1 × {packs[0].name} = {displayNumber(packs[0].size)} {unit}</>}</p>
                        )}
                        <div className="kus-item__entry">
                          <label htmlFor={`usage-${id}`}>Quantity used</label>
                          <div className="kus-stepper">
                            <button type="button" onClick={() => (used <= 1 ? removeItem(item) : setAmount(item, used - 1))} disabled={submitting} aria-label={used <= 1 ? `Remove ${item?.name || "item"}` : `Decrease ${item?.name || "item"} quantity`}>{used <= 1 ? <X size={17} /> : <Minus size={17} />}</button>
                            <input
                              key={String(chosenUnit)}
                              id={`usage-${id}`}
                              type="text"
                              inputMode="decimal"
                              value={rawQuantity}
                              placeholder="0"
                              disabled={!unitChosen || available === 0 || submitting}
                              autoFocus={unitChosen && Boolean(started[id])}
                              onChange={(event) => updateQuantity(item, event.target.value)}
                              aria-describedby={`remaining-${id}`}
                            />
                            <span>{unitChosen ? entryUnit : "—"}</span>
                            <button type="button" onClick={() => updateQuantity(item, Math.min(used + 1, available / (pack ? pack.packSize : 1)))} disabled={!unitChosen || usedBase >= available || available === 0 || submitting} aria-label={`Increase ${item?.name || "item"} quantity`}><Plus size={17} /></button>
                          </div>
                        </div>
                        <p id={`remaining-${id}`} className="kus-item__remaining">
                          {isSelected
                            ? <>{pack && <em>= {displayNumber(usedBase)} {unit} · </em>}Remaining after usage: <strong>{formatStockQuantity(remaining, unit, item)}</strong>{packs.length > 0 && <> ({displayNumber(remaining)} {unit})</>}</>
                            : unitChosen ? "Type how much you used" : ""}
                        </p>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      </div>
      </div>

      {!wide && (
        <button type="button" className="kus-bar" onClick={() => setSheetOpen(true)} aria-haspopup="dialog" aria-expanded={sheetOpen}
          aria-label={`${rowCount} ${rowCount === 1 ? "item" : "items"} on the usage ticket. Open the ticket.`}>
          <span className="kus-bar__count" aria-hidden="true">{rowCount}</span>
          <span className="kus-bar__text" aria-hidden="true"><strong>Usage ticket</strong> · Review</span>
          <ChevronUp size={20} aria-hidden="true" />
        </button>
      )}
      {!wide && sheetOpen && (
        <div className="kus-sheet" role="presentation">
          <button type="button" className="kus-sheet__backdrop" onClick={() => setSheetOpen(false)} aria-label="Close the ticket" />
          <section className="kus-sheet__panel" role="dialog" aria-modal="true" aria-label="Usage ticket">
            <header className="kus-sheet__head">
              <p className="kg-label">Record usage</p>
              <button type="button" className="kg-chip kus-sheet__close" onClick={() => setSheetOpen(false)} aria-label="Close the ticket"><X size={18} /></button>
            </header>
            <div className="kus-sheet__body">{ticket}</div>
          </section>
        </div>
      )}
    </main>
  );
}
