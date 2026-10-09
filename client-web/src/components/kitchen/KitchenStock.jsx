import { AlertTriangle, Boxes, PackageX, RefreshCw, Search, Utensils, X } from "lucide-react";
import { useMemo } from "react";
import { getStockHealth } from "../../features/kitchen";
import "./KitchenStock.css";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "low", label: "Low" },
  { key: "out", label: "Out" },
];

const itemName = (item) => item?.name || item?.stockItemId?.name || item?.itemName || "Unnamed item";
const itemUnit = (item) =>
  item?.unit || item?.unitSymbol || item?.unitId?.symbol || item?.stockItemId?.baseUnitId?.symbol || "units";

const formatQuantity = (value) =>
  Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });

const stockKey = (item, index) => item?._id || item?.stockRecordId || item?.stockItemId?._id || `${itemName(item)}-${index}`;

/** Mobile-first stock list for one kitchen. Search and health filter are controlled by the parent. */
export default function KitchenStock({
  items = [],
  loading = false,
  searchQuery = "",
  onSearchChange,
  filter = "all",
  onFilterChange,
  onRecordUsage,
  onRefresh,
}) {
  const counts = useMemo(() => {
    const result = { all: items.length, low: 0, out: 0 };
    items.forEach((item) => {
      const { key } = getStockHealth(item);
      if (key === "low" || key === "out") result[key] += 1;
    });
    return result;
  }, [items]);

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return items
      .filter((item) => filter === "all" || getStockHealth(item).key === filter)
      .filter((item) => !query || itemName(item).toLocaleLowerCase().includes(query))
      .sort((a, b) => {
        const healthDifference = getStockHealth(a).priority - getStockHealth(b).priority;
        return healthDifference || itemName(a).localeCompare(itemName(b));
      });
  }, [filter, items, searchQuery]);

  const hasSearchOrFilter = Boolean(searchQuery.trim()) || filter !== "all";

  return (
    <main className="ks-shell" aria-labelledby="kitchen-stock-title">
      <header className="ks-heading">
        <div>
          <p className="ks-eyebrow">Kitchen inventory</p>
          <h1 id="kitchen-stock-title">Stock</h1>
          <p>Check what is available before recording usage or requesting supplies.</p>
        </div>
        <button type="button" className="ks-refresh" onClick={onRefresh} disabled={loading} aria-label="Refresh kitchen stock">
          <RefreshCw size={20} className={loading ? "ks-spin" : ""} aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </header>

      <section className="ks-controls" aria-label="Search and filter stock">
        <label className="ks-search">
          <span className="ks-sr-only">Search stock items</span>
          <Search size={20} aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder="Search items"
            autoComplete="off"
          />
          {searchQuery && (
            <button type="button" onClick={() => onSearchChange?.("")} aria-label="Clear stock search">
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </label>

        <div className="ks-filters" role="group" aria-label="Filter by stock status">
          {FILTERS.map(({ key, label }) => (
            <button
              type="button"
              key={key}
              className={filter === key ? "ks-filter ks-filter--active" : "ks-filter"}
              onClick={() => onFilterChange?.(key)}
              aria-pressed={filter === key}
            >
              {label}<span>{counts[key]}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="ks-results-heading" aria-live="polite">
        <strong>{visibleItems.length} {visibleItems.length === 1 ? "item" : "items"}</strong>
        {counts.low + counts.out > 0 && <span>{counts.low + counts.out} need attention</span>}
      </div>

      {loading && items.length === 0 ? (
        <div className="ks-loading" role="status">
          <RefreshCw size={24} className="ks-spin" aria-hidden="true" />
          <span>Loading kitchen stock…</span>
        </div>
      ) : visibleItems.length === 0 ? (
        <section className="ks-empty">
          {hasSearchOrFilter ? <Search size={30} aria-hidden="true" /> : <Boxes size={30} aria-hidden="true" />}
          <h2>{hasSearchOrFilter ? "No matching items" : "No stock items yet"}</h2>
          <p>{hasSearchOrFilter ? "Try another search or view all stock." : "Stock assigned to this kitchen will appear here."}</p>
          {hasSearchOrFilter && (
            <button type="button" onClick={() => { onSearchChange?.(""); onFilterChange?.("all"); }}>View all stock</button>
          )}
        </section>
      ) : (
        <ul className="ks-list" aria-label="Kitchen stock items">
          {visibleItems.map((item, index) => {
            const health = getStockHealth(item);
            const unit = itemUnit(item);
            return (
              <li className={`ks-card ks-card--${health.tone}`} key={stockKey(item, index)}>
                <div className="ks-card__icon" aria-hidden="true">
                  {health.key === "out" ? <PackageX size={23} /> : health.key === "low" ? <AlertTriangle size={23} /> : <Boxes size={23} />}
                </div>
                <div className="ks-card__body">
                  <div className="ks-card__top">
                    <div>
                      <h2>{itemName(item)}</h2>
                      <span className={`ks-status ks-status--${health.tone}`}>{health.label}</span>
                    </div>
                    <p className="ks-quantity"><strong>{formatQuantity(health.quantity)}</strong><span>{unit}</span></p>
                  </div>
                  <div className="ks-card__footer">
                    <p>{health.threshold > 0 ? `Low-stock level: ${formatQuantity(health.threshold)} ${unit}` : "No low-stock level set"}</p>
                    <button type="button" onClick={() => onRecordUsage?.(item)} disabled={health.key === "out"}>
                      <Utensils size={17} aria-hidden="true" /> Record usage
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
