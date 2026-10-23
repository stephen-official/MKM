import { LogOut, School } from "lucide-react";
import "./kitchen-ui.css";

/**
 * Context and account actions shown above kitchen workflows.
 *
 * @param {object} props
 * @param {string} props.kitchenName
 * @param {() => void} [props.onLogout]
 * @param {string} [props.className=""]
 */
export default function KitchenHeader({
  kitchenName,
  onLogout,
  className = "",
}) {
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
          </div>
        </div>
      </div>

      <div className="kitchen-header__actions">
        {/* Only Log out lives here: lists update live, and what needs attention shows on Home and the Requests tab badge. */}
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
