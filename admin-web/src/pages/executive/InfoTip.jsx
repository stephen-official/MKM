import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";

/**
 * Definition tooltip. Opens on hover, keyboard focus and tap; closes on blur,
 * Escape (even when opened by hover), mouse leave (unless the button has focus),
 * or a pointer press outside it. A click/tap only ever
 * opens it, because touch browsers fire an emulated mouseenter before click
 * and a toggle would immediately close it again.
 */
export function InfoTip({ label, text }) {
  const id = useId();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <span className="exec-tip" ref={rootRef}>
      <button
        type="button"
        className="exec-tip__btn"
        aria-label={`What is ${label}?`}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={(event) => { if (document.activeElement !== event.currentTarget) setOpen(false); }}
      >
        <Info size={14} aria-hidden="true" />
      </button>
      {open && <span role="tooltip" id={id} className="exec-tip__body">{text}</span>}
    </span>
  );
}
