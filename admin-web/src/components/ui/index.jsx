/* Shared UI primitives, styled by styles.css (mirrors HungerHunt admin's
   component set). Prefer these over another inline style object — a change to a
   button or badge then lands everywhere at once. Each accepts className and
   passes the rest through, so a one-off tweak stays possible. */

import { forwardRef, useEffect } from "react";
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
