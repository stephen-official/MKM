import { AlertTriangle, Check, Minus, Plus, Search, Utensils, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { formatDateKey, toLocalDateKey } from "../../utils/date";
import { expiryStatus, formatStockQuantity, needsAttention, productPacks, sortByExpiry, withPackaging } from "../../features/kitchen";
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
  const addItem = (item) => {
    const pack = defaultPackFor(item);
    const chosen = pack ? { packId: pack._id, packName: pack.name, packSize: Number(pack.size) } : null;
    setAmount(item, Math.min(1, availableQuantity(item) / (chosen ? chosen.packSize : 1)), chosen);
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
  const showTicket = () => {
    setTicketOpen(true);
    document.getElementById("kitchen-ticket")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
      <OrderTicket title="Usage ticket" rows={ticketRows} meta={[{ label: "Usage date", value: formatDateKey(selectedDate) }]}
        emptyText="Tap “Add” on a supply below and it will be listed here." open={ticketOpen} onToggle={() => setTicketOpen((value) => !value)}
        onChange={changeRow} onClear={onClear ? clearTicket : undefined} />
      <div className="kus-main">
      <section className="kus-controls" aria-label="Usage details">
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
          <div className="kus-state" role="status"><span className="kus-spinner" />Loading kitchen stock…</div>
        ) : visibleItems.length === 0 ? (
          <div className="kus-state"><Search size={25} aria-hidden="true" /><strong>No supplies found</strong><span>Try a different item name.</span></div>
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

              return (
                <article className={`kus-item${isSelected ? " kus-item--selected" : ""}`} key={id}>
                  <div className="kus-item__top">
                    {item?.image ? <img src={item.image} alt="" loading="lazy" /> : <span className="kus-item__placeholder" aria-hidden="true">{String(item?.name || "?").charAt(0)}</span>}
                    <div className="kus-item__identity">
                      <h3>{item?.name || "Unnamed supply"}</h3>
                      <p className={available === 0 ? "kus-item__available kus-item__available--empty" : "kus-item__available"}>
                        Available: <strong>{formatStockQuantity(available, unit, item)}</strong>{packs.length > 0 && available > 0 && <small> · {displayNumber(available)} {unit}</small>}
                      </p>
                    </div>
                  </div>
                  {needsAttention(expiry) && (
                    <p className={`kus-item__expiry kus-item__expiry--${expiry.tone}`} role={expiry.key === "expired" ? "alert" : undefined}>
                      <AlertTriangle size={15} aria-hidden="true" />
                      <span>{expiry.key === "expired"
                        ? <><strong>{expiry.label}</strong> · {displayNumber(expiry.qtyBaseUnit)} {unit} · check before using</>
                        : <><strong>Use first:</strong> {expiry.label} · {displayNumber(expiry.qtyBaseUnit)} {unit}</>}</span>
                    </p>
                  )}
                  <div className="kus-item__entry">
                    <label htmlFor={`usage-${id}`}>Quantity used</label>
                    {!isSelected ? (
                      <button type="button" className="kt-add" onClick={() => addItem(item)} disabled={available === 0 || submitting} aria-label={`Add ${item?.name || "item"}`}><Plus size={17} aria-hidden="true" /> Add<span>{defaultPackFor(item)?.name || unit}</span></button>
                    ) : (
                    <div className="kus-stepper">
                      <button type="button" onClick={() => setAmount(item, Math.max(used - 1, 0))} disabled={submitting} aria-label={used <= 1 ? `Remove ${item?.name || "item"}` : `Decrease ${item?.name || "item"} quantity`}>{used <= 1 ? <X size={17} /> : <Minus size={17} />}</button>
                      <input
                        id={`usage-${id}`}
                        type="text"
                        inputMode="decimal"
                        value={rawQuantity}
                        placeholder="0"
                        disabled={available === 0 || submitting}
                        onChange={(event) => updateQuantity(item, event.target.value)}
                        aria-describedby={`remaining-${id}`}
                      />
                      <span>{entryUnit}</span>
                      <button type="button" onClick={() => updateQuantity(item, Math.min(used + 1, available / (pack ? pack.packSize : 1)))} disabled={usedBase >= available || available === 0 || submitting} aria-label={`Increase ${item?.name || "item"} quantity`}><Plus size={17} /></button>
                    </div>
                    )}
                  </div>
                  {isSelected && packs.length > 0 && (
                    <div className="kus-unit" role="group" aria-label={`Count ${item?.name || "item"} in`}>
                      {packs.map((candidate) => <button type="button" key={candidate._id} className={pack?.packId === candidate._id ? "is-on" : ""} aria-pressed={pack?.packId === candidate._id} disabled={submitting} onClick={() => switchUnit(item, candidate._id)}>{candidate.name}</button>)}
                      <button type="button" className={pack ? "" : "is-on"} aria-pressed={!pack} disabled={submitting} onClick={() => switchUnit(item, "base")}>{unit}</button>
                      {pack && used > 0 && <em>= {displayNumber(usedBase)} {unit}</em>}
                    </div>
                  )}
                  <p id={`remaining-${id}`} className="kus-item__remaining">
                    {isSelected ? <>Remaining after usage: <strong>{formatStockQuantity(remaining, unit, item)}</strong>{packs.length > 0 && <> ({displayNumber(remaining)} {unit})</>}</> : available === 0 ? "This item is out of stock" : "Tap Add if you used this today"}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>
      </div>
      </div>

      <footer className="kus-review">
        <button type="button" className="kus-review__count" onClick={showTicket} aria-label={`${ticketRows.length} ${ticketRows.length === 1 ? "item" : "items"} on the ticket. Show the ticket.`}><strong>{ticketRows.length}</strong><span>{ticketRows.length === 1 ? "item" : "items"} · view ticket</span></button>
        <button type="button" onClick={onSubmit} disabled={!selectedDate || !ticketRows.length || submitting}>
          {submitting ? "Saving…" : "Record usage"}<Check size={19} aria-hidden="true" />
        </button>
      </footer>
    </main>
  );
}
