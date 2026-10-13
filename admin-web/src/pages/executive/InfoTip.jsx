import { useId, useState } from "react";
import { Info } from "lucide-react";

export function InfoTip({ label, text }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className="exec-tip">
      <button
        type="button"
        className="exec-tip__btn"
        aria-label={`What is ${label}?`}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <Info size={14} aria-hidden="true" />
      </button>
      {open && <span role="tooltip" id={id} className="exec-tip__body">{text}</span>}
    </span>
  );
}
