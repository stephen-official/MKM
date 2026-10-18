import { CalendarDays } from "lucide-react";
import { formatDateKey } from "../../utils/date";
import "./DateField.css";

/**
 * A date box that always reads "Sun, 18 Oct 2026". The phone's own date picker sits invisibly on top,
 * so tapping anywhere opens it; values stay YYYY-MM-DD keys like a plain <input type="date">.
 */
export default function DateField({ value, onChange, min, max, required, disabled, placeholder = "Choose a date", label }) {
  const openPicker = (event) => {
    try { event.currentTarget.showPicker?.(); } catch { /* older browsers open it on focus instead */ }
  };
  return (
    <span className={`df${disabled ? " df--disabled" : ""}`}>
      <CalendarDays size={17} aria-hidden="true" />
      <span className={value ? "df__text" : "df__text df__text--empty"}>{value ? formatDateKey(value) : placeholder}</span>
      <input type="date" className="df__input" value={value || ""} min={min} max={max} required={required} disabled={disabled}
        aria-label={label} onClick={openPicker} onChange={(event) => onChange?.(event.target.value)} />
    </span>
  );
}
