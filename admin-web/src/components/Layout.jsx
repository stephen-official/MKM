import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  BookOpen,
  Boxes,
  ChartColumn,
  ClipboardCheck,
  ClipboardList,
  LogOut,
  Menu,
  PackageOpen,
  Share2,
  ShoppingCart,
  Utensils,
  Warehouse,
  ArrowLeftRight
} from "lucide-react";
import logo from "../mkmLogo.png";

// A pointer that can hover gets the hover-driven rail; touch screens keep the
// menu button. Read live so a tablet docked to a mouse switches over.
const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

const useCanHover = () => {
  const [canHover, setCanHover] = useState(() => window.matchMedia(HOVER_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia(HOVER_QUERY);
    const update = () => setCanHover(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return canHover;
};

const stagger = (index) => ({ "--i": index });

export const Layout = ({ onLogout, sections, children }) => {
  const location = useLocation();
  const canHover = useCanHover();
  const [hovering, setHovering] = useState(false);
  const [pinned, setPinned] = useState(false);
  const isExpanded = canHover ? hovering : pinned;
  const leaveTimer = useRef(null);

  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  // A route change should always return the touch drawer to its compact state
  // and move keyboard focus to the newly rendered page, matching HungerHunt's
  // predictable navigation behaviour.
  useEffect(() => {
    setPinned(false);
    setHovering(false);
    requestAnimationFrame(() => document.querySelector("#admin-main")?.focus());
  }, [location.pathname]);

  const openRail = () => {
    clearTimeout(leaveTimer.current);
    setHovering(true);
  };

  // A short grace period so a pointer crossing the rail's edge does not make it
  // flicker shut and open again.
  const closeRail = () => {
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setHovering(false), 140);
  };

  const handleRailClick = (event) => {
    if (!canHover && isExpanded && event.target.closest("a")) setPinned(false);
  };

  let index = 0;

  return (
    <div className="layout">
      <a className="skip-link" href="#admin-main">Skip to main content</a>
      <div className="sidenav-slot">
        {isExpanded && !canHover && (
          <button
            type="button"
            className="sidenav-scrim"
            aria-label="Close menu"
            onClick={() => setPinned(false)}
          />
        )}
        <aside
          className={`sidenav${isExpanded ? "" : " sidenav--collapsed"}`}
          onMouseEnter={canHover ? openRail : undefined}
          onMouseLeave={canHover ? closeRail : undefined}
          onFocus={canHover ? (event) => event.target.matches(":focus-visible") && openRail() : undefined}
          onBlur={canHover ? (event) => !event.currentTarget.contains(event.relatedTarget) && closeRail() : undefined}
          onClick={handleRailClick}
        >
          <div className="sidenav-top">
            <Link
              to="/"
              className="sidenav-brand"
              aria-label={!canHover && !isExpanded ? "Expand menu" : "Montessori Kitchen dashboard"}
              onClick={(event) => {
                if (!canHover && !isExpanded) {
                  event.preventDefault();
                  setPinned(true);
                }
              }}
            >
              <img src={logo} alt="" className="sidenav-logo" />
              <span className="sidenav-brand__text">
                <strong>Montessori Kitchen</strong>
                <small>Admin console</small>
              </span>
            </Link>
            {!canHover && isExpanded && (
              <button
                type="button"
                className="sidenav-toggle"
                onClick={() => setPinned(false)}
                aria-label="Collapse menu"
              >
                <Menu size={20} />
              </button>
            )}
          </div>

          <nav className="sidenav-nav" aria-label="Main navigation">
            {sections.map((section) => (
              <div key={section.title} style={{ display: "contents" }}>
                <p className="sidenav-section-label"><span>{section.title}</span></p>
                {section.items.map(({ label, path, icon: Icon, hiddenFromAdmins }) => (
                  <NavLink
                    key={path}
                    to={path}
                    className={({ isActive }) => `sidenav-link${isActive ? " sidenav-link--active" : ""}`}
                    style={stagger(index++)}
                    title={isExpanded ? undefined : label}
                  >
                    <span className="sidenav-icon"><Icon size={19} /></span>
                    <span className="sidenav-label">{label}</span>
                    {hiddenFromAdmins && <span className="sidenav-hidden-badge" title="Hidden from admins">Off</span>}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          <div className="sidenav-footer">
            <button
              type="button"
              className="sidenav-link sidenav-logout"
              onClick={onLogout}
              style={stagger(index)}
              title={isExpanded ? undefined : "Sign out"}
            >
              <span className="sidenav-icon"><LogOut size={19} /></span>
              <span className="sidenav-label">Sign out</span>
            </button>
          </div>
        </aside>
      </div>

      <main id="admin-main" className="layout-main" tabIndex="-1">
        {children}
      </main>
    </div>
  );
};
