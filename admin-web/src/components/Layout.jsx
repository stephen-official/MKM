import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import logo from "../mkmLogo.png";

/* The shell mirrors the kitchen app (client-web KitchenHeader + KitchenBottomNav): a glass header
   with the brand and Log out, and one nav that is a floating pill at the bottom of a phone and a
   glass sidebar on a laptop. Every entry is listed; with many entries the phone pill scrolls sideways. */
export const Layout = ({ onLogout, sections, children }) => {
  const location = useLocation();
  const items = sections.flatMap((section) => section.items);
  const activeIndex = items.findIndex((item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`));
  const itemRefs = useRef([]);
  const [bubble, setBubble] = useState(null);

  // A route change moves keyboard focus to the newly rendered page.
  useEffect(() => {
    requestAnimationFrame(() => document.querySelector("#admin-main")?.focus());
  }, [location.pathname]);

  // The glass bubble under the current tab (phone only; the sidebar styles the item itself). Measured
  // rather than divided into equal slots because a long list scrolls sideways.
  useLayoutEffect(() => {
    const measure = () => {
      const el = itemRefs.current[activeIndex];
      if (!el) { setBubble(null); return; }
      setBubble({ width: `${el.offsetWidth}px`, transform: `translateX(${el.offsetLeft}px)` });
      el.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeIndex, items.length]);

  return (
    <div className="layout">
      <a className="skip-link" href="#admin-main">Skip to main content</a>
      <header className="app-header">
        <Link to="/" className="app-header__brand" aria-label="Montessori Kitchen admin console">
          <span className="app-header__mark" aria-hidden="true"><img src={logo} alt="" /></span>
          <span className="app-header__identity">
            <p className="app-header__organization">Montessori Group of Schools</p>
            <h1 className="app-header__title">Admin console</h1>
          </span>
        </Link>
        <div className="app-header__actions">
          <button type="button" className="app-header__action" aria-label="Log out" title="Log out" onClick={onLogout}>
            <LogOut size={21} aria-hidden="true" />
          </button>
        </div>
      </header>

      {items.length > 0 && (
        <nav className="app-nav" aria-label="Main navigation">
          <div className="app-nav__items">
            {bubble && <span className="app-nav__bubble" aria-hidden="true" style={bubble} />}
            {items.map(({ label, path, icon: Icon, hiddenFromAdmins }, index) => (
              <NavLink
                key={path}
                to={path}
                ref={(el) => { itemRefs.current[index] = el; }}
                className={({ isActive }) => `app-nav__item${isActive ? " app-nav__item--active" : ""}`}
                title={hiddenFromAdmins ? `${label} (hidden from admins)` : undefined}
              >
                <span className="app-nav__icon-wrap" aria-hidden="true">
                  <Icon size={20} strokeWidth={index === activeIndex ? 1.8 : 1.6} />
                  {hiddenFromAdmins && <span className="app-nav__dot" />}
                </span>
                <span className="app-nav__label">{label}</span>
                {hiddenFromAdmins && <span className="sr-only">Hidden from admins</span>}
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      <main id="admin-main" className="layout-main" tabIndex="-1">
        {children}
      </main>
    </div>
  );
};
