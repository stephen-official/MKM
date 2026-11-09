import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ListFilter } from "lucide-react";
import "./StatusFilter.css";

// Below the button when there is room, otherwise above it; never wider than the screen.
const panelPosition = (rect) => {
  const width = Math.min(Math.max(rect.width, 280), window.innerWidth - 16);
  const roomBelow = window.innerHeight - rect.bottom;
  const openAbove = roomBelow < 220 && rect.top > roomBelow;
  return {
    left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), width,
    ...(openAbove ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
  };
};

/**
 * Status filter as a dropdown (Record, Stock levels). Several statuses can be picked; an item shows when it matches
 * any of them, and none picked means all. The closed button keeps a coloured dot for every status that has items.
 * options: [{ key, label }] with key in kg-tone (low, soon, out, expired); counts: { [key]: number }.
 */
export default function StatusFilter({ options, counts, selected, onChange, label = "Filter by status" }) {
  const panelId = useId();
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({});

  const close = (focusTrigger = false) => { setOpen(false); if (focusTrigger) triggerRef.current?.focus(); };
  const toggleOpen = () => {
    if (open) return close();
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPosition(panelPosition(rect));
    setOpen(true);
  };
  const toggle = (key) => onChange(selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key]);

  useEffect(() => {
    if (!open) return undefined;
    const outside = (event) => {
      if (!triggerRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) setOpen(false);
    };
    const reposition = () => { const rect = triggerRef.current?.getBoundingClientRect(); if (rect) setPosition(panelPosition(rect)); };
    const escape = (event) => { if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", reposition);
    document.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  const picked = options.filter((option) => selected.includes(option.key));
  const flagged = options.filter((option) => counts[option.key] > 0);

  return <div className="sf">
    <button ref={triggerRef} type="button" className={`sf-trigger${picked.length ? " is-filtered" : ""}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={panelId} onClick={toggleOpen}>
      <ListFilter size={17} strokeWidth={1.8} aria-hidden="true" />
      <span className="sf-trigger__text"><small>Show</small> {picked.length ? picked.map((option) => option.label).join(", ") : "All"}</span>
      {flagged.length > 0 && <span className="kg-dots" role="img" aria-label={flagged.map((option) => `${counts[option.key]} ${option.label.toLowerCase()}`).join(", ")}>
        {flagged.map((option) => <i key={option.key} className={`kg-tone--${option.key}`} />)}
      </span>}
      <ChevronDown size={16} className={`sf-chevron${open ? " is-open" : ""}`} aria-hidden="true" />
    </button>
    {open && createPortal(
      <div ref={panelRef} id={panelId} role="dialog" aria-label={label} className="sf-panel" style={position}>
        <p className="sf-panel__title">Show only</p>
        <div className="sf-panel__chips" role="group" aria-label={label}>
          {options.map(({ key, label: text }) => {
            const on = selected.includes(key);
            return <button key={key} type="button" className={`sf-chip kg-tone kg-tone--${key}`} aria-pressed={on} onClick={() => toggle(key)}>
              {on && <Check size={13} strokeWidth={2} aria-hidden="true" />}{text}<span>{counts[key] ?? 0}</span>
            </button>;
          })}
        </div>
        <footer className="sf-panel__foot">
          <button type="button" className="kg-chip" onClick={() => onChange([])} disabled={!selected.length}>Show all</button>
          <button type="button" className="kg-btn kg-btn--ok sf-done" onClick={() => close(true)} aria-label="Done" title="Done"><Check size={20} strokeWidth={2.2} aria-hidden="true" /></button>
        </footer>
      </div>, document.body)}
  </div>;
}
