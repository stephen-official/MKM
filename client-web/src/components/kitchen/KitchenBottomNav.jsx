import {
  ClipboardList,
  Home,
  Package,
  Utensils,
} from "lucide-react";
import { createElement } from "react";
import "./kitchen-ui.css";

const NO_HIDDEN_TABS = new Set();

const TABS = [
  { id: "home", label: "Home", Icon: Home },
  { id: "stock", label: "Stock", Icon: Package },
  { id: "usage", label: "Use", accessibleLabel: "Record usage", Icon: Utensils },
  { id: "requests", label: "Requests", Icon: ClipboardList },
];

/**
 * Primary navigation for the kitchen mobile experience.
 *
 * @param {object} props
 * @param {"home"|"stock"|"usage"|"requests"} props.activeTab
 * @param {(tab: string) => void} props.onTabChange
 * @param {number} [props.requestCount=0] Number of requests requiring attention.
 * @param {Set<string>} [props.hiddenTabs] Tab ids to hide (features disabled for this kitchen).
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.className=""]
 */
export default function KitchenBottomNav({
  activeTab,
  onTabChange,
  requestCount = 0,
  hiddenTabs = NO_HIDDEN_TABS,
  disabled = false,
  className = "",
}) {
  const safeRequestCount = Number.isFinite(Number(requestCount))
    ? Math.max(0, Number(requestCount))
    : 0;

  return (
    <nav
      className={`kitchen-bottom-nav ${className}`.trim()}
      aria-label="Kitchen navigation"
    >
      <div className="kitchen-bottom-nav__items">
        {TABS.filter(({ id }) => !hiddenTabs.has(id)).map(({ id, label, accessibleLabel, Icon }) => {
          const isActive = activeTab === id;
          const showBadge = id === "requests" && safeRequestCount > 0;

          return (
            <button
              key={id}
              type="button"
              className={`kitchen-bottom-nav__item${
                isActive ? " kitchen-bottom-nav__item--active" : ""
              }${id === "usage" ? " kitchen-bottom-nav__item--primary" : ""}`}
              aria-label={accessibleLabel || label}
              aria-current={isActive ? "page" : undefined}
              disabled={disabled}
              onClick={() => onTabChange?.(id)}
            >
              <span className="kitchen-bottom-nav__icon-wrap" aria-hidden="true">
                {createElement(Icon, {
                  size: 22,
                  strokeWidth: isActive ? 2.5 : 2,
                })}
                {showBadge && (
                  <span className="kitchen-bottom-nav__badge">
                    {safeRequestCount > 99 ? "99+" : safeRequestCount}
                  </span>
                )}
              </span>
              <span className="kitchen-bottom-nav__label">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
