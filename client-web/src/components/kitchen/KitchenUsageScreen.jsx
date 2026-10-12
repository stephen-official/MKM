import { ChevronRight, Minus, Plus, Search, Utensils } from "lucide-react";
import { useMemo, useState } from "react";
import { toLocalDateKey } from "../../utils/date";
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

export default function KitchenUsageScreen({
  items = [],
  loading = false,
  selectedDate = "",
  onDateChange,
  quantities = {},
  cart,
  onQuantityChange,
  onReview,
  submitting = false,
}) {
  const [search, setSearch] = useState("");
  const quantitySource = cart ?? quantities;
  const today = toLocalDateKey();

  const visibleItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      String(item?.name || "").toLocaleLowerCase().includes(query),
    );
  }, [items, search]);

  const selectedItems = useMemo(
    () => items.filter((item) => numericQuantity(quantityFor(quantitySource, item)) > 0),
    [items, quantitySource],
  );

  const updateQuantity = (item, nextValue) => {
    if (nextValue === "") {
      onQuantityChange?.(item, "");
      return;
    }
    if (!/^\d*(\.\d{0,3})?$/.test(String(nextValue))) return;
    const available = availableQuantity(item);
    const next = Math.min(Number(nextValue) || 0, available);
    onQuantityChange?.(item, nextValue.endsWith?.(".") ? nextValue : next);
  };

  return (
    <main className="kus-screen">
      <header className="kus-intro">
        <span className="kus-intro__icon" aria-hidden="true"><Utensils size={23} /></span>
        <div>
          <p>Daily stock update</p>
          <h1>Record usage</h1>
          <span>Enter the supplies used by your kitchen.</span>
        </div>
      </header>

      <section className="kus-controls" aria-label="Usage details">
        <label className="kus-date">
          <span>Usage date</span>
          <input
            type="date"
            value={selectedDate}
            max={today}
            required
            onChange={(event) => onDateChange?.(event.target.value)}
            disabled={submitting}
          />
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
              const remaining = Math.max(available - used, 0);
              const unit = unitOf(item);
              const isSelected = used > 0;

              return (
                <article className={`kus-item${isSelected ? " kus-item--selected" : ""}`} key={id}>
                  <div className="kus-item__top">
                    {item?.image ? <img src={item.image} alt="" loading="lazy" /> : <span className="kus-item__placeholder" aria-hidden="true">{String(item?.name || "?").charAt(0)}</span>}
                    <div className="kus-item__identity">
                      <h3>{item?.name || "Unnamed supply"}</h3>
                      <p className={available === 0 ? "kus-item__available kus-item__available--empty" : "kus-item__available"}>
                        Available: <strong>{displayNumber(available)} {unit}</strong>
                      </p>
                    </div>
                  </div>
                  <div className="kus-item__entry">
                    <label htmlFor={`usage-${id}`}>Quantity used</label>
                    <div className="kus-stepper">
                      <button type="button" onClick={() => updateQuantity(item, Math.max(used - 1, 0))} disabled={used <= 0 || submitting} aria-label={`Decrease ${item?.name || "item"} quantity`}><Minus size={17} /></button>
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
                      <span>{unit}</span>
                      <button type="button" onClick={() => updateQuantity(item, Math.min(used + 1, available))} disabled={used >= available || available === 0 || submitting} aria-label={`Increase ${item?.name || "item"} quantity`}><Plus size={17} /></button>
                    </div>
                  </div>
                  <p id={`remaining-${id}`} className="kus-item__remaining">
                    {isSelected ? <>Remaining after usage: <strong>{displayNumber(remaining)} {unit}</strong></> : available === 0 ? "This item is out of stock" : "Enter the amount used today"}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className="kus-review">
        <div><strong>{selectedItems.length}</strong><span>{selectedItems.length === 1 ? "item selected" : "items selected"}</span></div>
        <button type="button" onClick={onReview} disabled={!selectedDate || !selectedItems.length || submitting}>
          {submitting ? "Saving…" : "Review usage"}<ChevronRight size={19} aria-hidden="true" />
        </button>
      </footer>
    </main>
  );
}
