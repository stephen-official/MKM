/* Shared UI primitives, styled by styles.css (mirrors HungerHunt admin's
   component set). Prefer these over another inline style object — a change to a
   button or badge then lands everywhere at once. Each accepts className and
   passes the rest through, so a one-off tweak stays possible. */

import { Children, forwardRef, isValidElement, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const cx = (...parts) => parts.filter(Boolean).join(" ");

/* The bar that tops every page: title (+ optional subtitle), then `children`
   (tabs, filters) and `actions` (buttons) on the right. */
export function PageHeader({ title, subtitle, children, actions, className }) {
  return (
    <header className={cx("page-bar", className)}>
      <div className="page-bar__title">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="page-bar__body">{children}</div>}
      {actions && <div className="page-bar__actions">{actions}</div>}
    </header>
  );
}

export function Card({ as: Tag = "div", tight = false, className, children, ...rest }) {
  return (
    <Tag className={cx("card", tight && "card--tight", className)} {...rest}>
      {children}
    </Tag>
  );
}

/* variant: primary | dark | ghost | success | danger. size: "sm" for a button
   inside a row or table cell. */
export function Button({ variant = "primary", size, block = false, className, children, ...rest }) {
  return (
    <button
      type="button"
      className={cx("btn", `btn--${variant}`, size === "sm" && "btn--sm", block && "btn--block", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

/* variant: neutral | success | alert | warn | info */
export function Badge({ variant = "neutral", className, children, ...rest }) {
  return (
    <span className={cx("badge", `badge--${variant}`, className)} {...rest}>
      {children}
    </span>
  );
}

/* variant: warn | alert | success | info */
export function Banner({ variant = "info", className, children, ...rest }) {
  return (
    <div className={cx("banner", `banner--${variant}`, className)} role="status" {...rest}>
      {children}
    </div>
  );
}

export function EmptyState({ title, children, action, className }) {
  return (
    <div className={cx("empty-state", className)}>
      <p className="empty-state__title">{title}</p>
      {children && <p className="empty-state__text">{children}</p>}
      {action}
    </div>
  );
}

export function Field({ label, children, className }) {
  return (
    <label className={cx("field", className)}>
      {label && <span className="field__label">{label}</span>}
      {children}
    </label>
  );
}

const nodeText = (node) => Children.toArray(node).map((child) => {
  if (typeof child === "string" || typeof child === "number") return String(child);
  return isValidElement(child) ? nodeText(child.props.children) : "";
}).join("");

const readSelectOptions = (children, group = null, output = []) => {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === "option") {
      output.push({
        value: String(child.props.value ?? ""),
        label: nodeText(child.props.children),
        disabled: Boolean(child.props.disabled),
        group
      });
    } else if (child.type === "optgroup") {
      readSelectOptions(child.props.children, child.props.label, output);
    }
  });
  return output;
};

const popupPosition = (rect, optionCount) => {
  const width = Math.max(rect.width, 220);
  const estimatedHeight = Math.min(320, optionCount * 42 + 24);
  const roomBelow = window.innerHeight - rect.bottom;
  const openAbove = roomBelow < Math.min(240, estimatedHeight) && rect.top > roomBelow;
  return {
    left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
    width,
    ...(openAbove ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 })
  };
};

/**
 * Site-wide select-only combobox. It intentionally accepts native option and
 * optgroup children so pages can migrate without changing their form logic.
 */
export function Select({ value, onChange, children, disabled = false, className, style, name, id, placeholder = "Choose…", ...rest }) {
  const uid = useId();
  const listId = `${uid}-listbox`;
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const typeahead = useRef({ text: "", timer: null });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [popup, setPopup] = useState({});
  const options = readSelectOptions(children);
  const stringValue = String(value ?? "");
  const selectedIndex = options.findIndex((option) => option.value === stringValue);
  const selected = options[selectedIndex];

  const optionCount = options.length;
  const positionPopup = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPopup(popupPosition(rect, optionCount));
  };

  const firstEnabled = (from, direction = 1) => {
    if (!options.length) return -1;
    let index = from;
    for (let checked = 0; checked < options.length; checked += 1) {
      index = (index + direction + options.length) % options.length;
      if (!options[index].disabled) return index;
    }
    return -1;
  };

  const openMenu = (preferred = selectedIndex) => {
    if (disabled) return;
    positionPopup();
    setActive(preferred >= 0 && !options[preferred]?.disabled ? preferred : firstEnabled(-1));
    setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);
    setActive(-1);
  };

  const pick = (index) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange?.({ target: { value: option.value, name }, currentTarget: { value: option.value, name } });
    closeMenu();
    triggerRef.current?.focus();
  };

  const move = (direction) => {
    if (!open) {
      openMenu(selectedIndex);
      return;
    }
    setActive((current) => firstEnabled(current < 0 ? (direction > 0 ? -1 : 0) : current, direction));
  };

  const onKeyDown = (event) => {
    switch (event.key) {
      case "ArrowDown": event.preventDefault(); move(1); break;
      case "ArrowUp": event.preventDefault(); move(-1); break;
      case "Home":
        if (open) { event.preventDefault(); setActive(firstEnabled(-1)); }
        break;
      case "End":
        if (open) { event.preventDefault(); setActive(firstEnabled(0, -1)); }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (open && active >= 0) pick(active); else openMenu();
        break;
      case "Escape":
        if (open) { event.preventDefault(); closeMenu(); }
        break;
      case "Tab": closeMenu(); break;
      default:
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
          window.clearTimeout(typeahead.current.timer);
          typeahead.current.text += event.key.toLowerCase();
          const match = options.findIndex((option) => !option.disabled && option.label.toLowerCase().startsWith(typeahead.current.text));
          if (match >= 0) { if (!open) openMenu(match); else setActive(match); }
          typeahead.current.timer = window.setTimeout(() => { typeahead.current.text = ""; }, 600);
        }
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    const outside = (event) => {
      if (!rootRef.current?.contains(event.target) && !document.getElementById(listId)?.contains(event.target)) closeMenu();
    };
    const reposition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setPopup(popupPosition(rect, optionCount));
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", reposition);
    document.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("scroll", reposition, true);
    };
  }, [open, listId, optionCount]);

  useEffect(() => {
    if (open && active >= 0) optionRefs.current[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const popupMenu = open && !disabled ? createPortal(
    <ul id={listId} role="listbox" className="custom-select__menu" style={popup} aria-label={rest["aria-label"] || name || "Options"} onMouseDown={(event) => event.preventDefault()}>
      {options.map((option, index) => {
        const heading = option.group && option.group !== options[index - 1]?.group;
        return (
          <li key={`${option.value}-${index}`} role="presentation">
            {heading && <div className="custom-select__group">{option.group}</div>}
            <div
              id={`${uid}-option-${index}`}
              ref={(element) => { optionRefs.current[index] = element; }}
              role="option"
              aria-selected={option.value === stringValue}
              aria-disabled={option.disabled || undefined}
              className={`custom-select__option${index === active ? " custom-select__option--active" : ""}${option.value === stringValue ? " custom-select__option--selected" : ""}${option.disabled ? " custom-select__option--disabled" : ""}`}
              onMouseEnter={() => !option.disabled && setActive(index)}
              onClick={() => pick(index)}
            >
              <span>{option.label}</span>
              {option.value === stringValue && <Check size={15} aria-hidden="true" />}
            </div>
          </li>
        );
      })}
    </ul>,
    document.body
  ) : null;

  return (
    <div ref={rootRef} className={`custom-select${className ? ` ${className}` : ""}`}>
      <button
        {...rest}
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${uid}-option-${active}` : undefined}
        disabled={disabled}
        className="custom-select__trigger"
        style={style}
        onClick={() => open ? closeMenu() : openMenu()}
        onKeyDown={onKeyDown}
      >
        <span className={selected ? "custom-select__value" : "custom-select__placeholder"}>{selected?.label || placeholder}</span>
        <ChevronDown size={16} className={`custom-select__chevron${open ? " custom-select__chevron--open" : ""}`} aria-hidden="true" />
      </button>
      {popupMenu}
    </div>
  );
}

export function Modal({ title, onClose, children, actions, wide = false }) {
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={cx("modal", wide && "modal--wide")}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        {title && <h2 className="modal-title">{title}</h2>}
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}

/* An in-app stand-in for window.confirm. */
export function ConfirmDialog({ title, message, confirmLabel = "Confirm", variant = "primary", busy = false, onCancel, onConfirm }) {
  return (
    <Modal
      title={title}
      onClose={() => !busy && onCancel()}
      actions={
        <>
          <Button variant="ghost" block disabled={busy} onClick={onCancel}>Cancel</Button>
          <Button variant={variant} block disabled={busy} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="confirm-message">{message}</p>
    </Modal>
  );
}

export function DataTable({ className, children, ...rest }) {
  return (
    <div className="table-wrap">
      <table className={cx("table", className)} {...rest}>{children}</table>
    </div>
  );
}


/* ---- tabs ---------------------------------------------------------------
   One tab/segmented control for every page. `items` are { value, label, icon?,
   count? }; the page owns the selected value. */
export function Tabs({ items, value, onChange, label = "Sections", className }) {
  return (
    <div className={cx("tabs", className)} role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={item.value === value}
          className={cx("tabs__tab", item.value === value && "tabs__tab--active")}
          onClick={() => onChange(item.value)}
        >
          {item.icon}
          {item.label}
          {item.count !== undefined && <span className="tabs__count">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---- status -------------------------------------------------------------
   One mapping from a workflow status to a badge colour, so "pending" looks the
   same on every page. */
const STATUS_VARIANT = {
  pending: "warn",
  purchased: "info",
  confirmed: "info",
  partially_received: "warn",
  approved: "success",
  accepted: "success",
  received: "success",
  stock_received: "success",
  distributed: "success",
  completed: "success",
  rejected: "alert",
  cancelled: "alert"
};

const statusLabel = (status) => String(status || "unknown").replaceAll("_", " ");

export function StatusBadge({ status, className, ...rest }) {
  const key = String(status || "").toLowerCase();
  return (
    <Badge variant={STATUS_VARIANT[key] || "neutral"} className={cx("badge--status", className)} {...rest}>
      {statusLabel(status)}
    </Badge>
  );
}

/* ---- master / detail ----------------------------------------------------
   The list-on-the-left, record-on-the-right layout most tabs share. */
export function SplitView({ rail, children, className }) {
  return (
    <div className={cx("split", className)}>
      <aside className="split__rail">{rail}</aside>
      <section className="split__detail">{children}</section>
    </div>
  );
}

export function RailList({ title, count, children, empty, loading }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="rail">
      {title && (
        <h2 className="rail__title">
          {title}{count !== undefined && ` (${count})`}
        </h2>
      )}
      <div className="rail__list" role="list">
        {loading ? <LoadingState label="Loading…" /> : hasItems ? children : empty}
      </div>
    </div>
  );
}

/* A selectable row. Rendered as a button so it works from the keyboard. */
export function RailItem({ active, onClick, children, className, ...rest }) {
  return (
    <button
      type="button"
      role="listitem"
      aria-current={active ? "true" : undefined}
      className={cx("rail-item", active && "rail-item--active", className)}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}

/* The record panel: a head (identity + figures), a scrolling body, and a foot
   for the actions. */
export function DetailPanel({ head, foot, children, className }) {
  return (
    <div className={cx("detail", className)}>
      {head && <div className="detail__head">{head}</div>}
      <div className="detail__body">{children}</div>
      {foot && <div className="detail__foot">{foot}</div>}
    </div>
  );
}

/* A labelled value for a detail head: small caps label over the value. */
export function Meta({ label, children, align }) {
  return (
    <div className={cx("meta", align === "end" && "meta--end")}>
      <span className="meta__label">{label}</span>
      <span className="meta__value">{children}</span>
    </div>
  );
}

/* ---- feedback ------------------------------------------------------------ */

export function LoadingState({ label = "Loading…" }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-state__spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message = "Something went wrong.", onRetry }) {
  return (
    <div className="empty-state empty-state--error" role="alert">
      <p className="empty-state__title">{message}</p>
      {onRetry && <Button variant="ghost" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

/* ---- date field ---------------------------------------------------------
   dd/mm/yyyy everywhere, whatever the browser's locale. Values are yyyy-mm-dd
   strings and onChange receives { target: { value } }, so it drops in where a
   native <input type="date"> was used. */
const parseDay = (value) => {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const formatDay = (date) =>
  date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` : "";

const DateInput = forwardRef(function DateInput(props, ref) {
  return <input ref={ref} type="text" inputMode="numeric" autoComplete="off" {...props} />;
});

export function DateField({ value, onChange, min, max, className, placeholder = "dd/mm/yyyy", disabled, ...rest }) {
  return (
    <DatePicker
      selected={parseDay(value)}
      onChange={(date) => onChange?.({ target: { value: formatDay(date) } })}
      minDate={parseDay(min) || undefined}
      maxDate={parseDay(max) || undefined}
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholder}
      disabled={disabled}
      isClearable={false}
      showPopperArrow={false}
      popperPlacement="bottom-start"
      wrapperClassName={cx("date-field", className)}
      customInput={<DateInput />}
      {...rest}
    />
  );
}
