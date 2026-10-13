import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";

/**
 * Definition tooltip. Opens on hover, keyboard focus and tap; closes on blur,
 * Escape, mouse leave, or a pointer press outside it. A click/tap only ever
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
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
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
        onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <Info size={14} aria-hidden="true" />
      </button>
      {open && <span role="tooltip" id={id} className="exec-tip__body">{text}</span>}
    </span>
  );
}
