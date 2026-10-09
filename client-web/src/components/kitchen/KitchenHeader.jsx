import { Bell, LogOut, School } from "lucide-react";
import "./kitchen-ui.css";

/**
 * Context and account actions shown above kitchen workflows.
 *
 * @param {object} props
 * @param {string} props.kitchenName
 * @param {number} [props.attentionCount=0]
 * @param {() => void} [props.onNotificationsClick]
 * @param {() => void} [props.onLogout]
 * @param {string} [props.className=""]
 */
export default function KitchenHeader({
  kitchenName,
  attentionCount = 0,
  onNotificationsClick,
  onLogout,
  className = "",
}) {
  const safeAttentionCount = Number.isFinite(Number(attentionCount))
    ? Math.max(0, Number(attentionCount))
    : 0;
  const hasAttention = safeAttentionCount > 0;

  return (
    <header className={`kitchen-header ${className}`.trim()}>
      <div className="kitchen-header__brand" aria-label="Current kitchen">
        <span className="kitchen-header__mark" aria-hidden="true">
          <School size={22} strokeWidth={2.25} />
        </span>
        <div className="kitchen-header__identity">
          <p className="kitchen-header__organization">
            Montessori Group of Schools
          </p>
          <div className="kitchen-header__location-row">
            <h1 className="kitchen-header__kitchen">
              {kitchenName || "Kitchen"}
            </h1>
            <span className="kitchen-header__separator" aria-hidden="true">
              •
            </span>
            <span className="kitchen-header__city">Kurnool</span>
          </div>
        </div>
      </div>

      <div className="kitchen-header__actions">
        <button
          type="button"
          className="kitchen-header__action"
          aria-label={
            hasAttention
              ? `${safeAttentionCount} notifications requiring attention`
              : "Notifications"
          }
          onClick={onNotificationsClick}
          disabled={!onNotificationsClick}
        >
          <Bell size={21} aria-hidden="true" />
          {hasAttention && (
            <span className="kitchen-header__attention" aria-hidden="true">
              {safeAttentionCount > 99 ? "99+" : safeAttentionCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className="kitchen-header__action kitchen-header__logout"
          aria-label="Log out"
          title="Log out"
          onClick={onLogout}
          disabled={!onLogout}
        >
          <LogOut size={21} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
