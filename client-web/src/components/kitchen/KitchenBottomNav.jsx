import {
  ClipboardList,
  Home,
  Package,
} from "lucide-react";
import { createElement } from "react";
import "./kitchen-ui.css";

const NO_HIDDEN_TABS = new Set();

const TABS = [
  { id: "home", label: "Home", Icon: Home },
  { id: "stock", label: "Stock", Icon: Package },
  { id: "requests", label: "Orders", Icon: ClipboardList },
];

/**
 * Primary navigation for the kitchen mobile experience.
 *
 * @param {object} props
 * @param {"home"|"stock"|"requests"} props.activeTab
 * @param {(tab: string) => void} props.onTabChange
 * @param {boolean} [props.requestAlert=false] An unsent supply order is waiting (items added from Home): the Orders tab shows a "!" badge.
 * @param {Set<string>} [props.hiddenTabs] Tab ids to hide (features disabled for this kitchen).
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.className=""]
 */
export default function KitchenBottomNav({
  activeTab,
  onTabChange,
  requestAlert = false,
  hiddenTabs = NO_HIDDEN_TABS,
  disabled = false,
  className = "",
}) {
  const visibleTabs = TABS.filter(({ id }) => !hiddenTabs.has(id));
  // The glass bubble under the current tab: one slot wide, slid across by whole slots (phone only; the sidebar styles the item itself).
  const activeIndex = visibleTabs.findIndex(({ id }) => id === activeTab);

  return (
    <nav
      className={`kitchen-bottom-nav ${className}`.trim()}
      aria-label="Kitchen navigation"
    >
      <div className="kitchen-bottom-nav__items">
        {activeIndex >= 0 && (
          <span className="kitchen-bottom-nav__bubble" aria-hidden="true"
            style={{ width: `${100 / visibleTabs.length}%`, transform: `translateX(${activeIndex * 100}%)` }} />
        )}
        {visibleTabs.map(({ id, label, accessibleLabel, Icon }) => {
          const isActive = activeTab === id;
          const showBadge = id === "requests" && requestAlert;

          return (
            <button
              key={id}
              type="button"
              className={`kitchen-bottom-nav__item${
                isActive ? " kitchen-bottom-nav__item--active" : ""
              }`}
              aria-label={accessibleLabel || label}
              aria-current={isActive ? "page" : undefined}
              disabled={disabled}
              onClick={() => onTabChange?.(id)}
            >
              <span className="kitchen-bottom-nav__icon-wrap" aria-hidden="true">
                {createElement(Icon, {
                  size: 20,
                  strokeWidth: isActive ? 1.8 : 1.6,
                })}
                {showBadge && (
                  <span className="kitchen-bottom-nav__badge kitchen-bottom-nav__badge--alert">!</span>
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
