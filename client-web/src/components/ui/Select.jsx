import { Children, isValidElement, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

const nodeText = (node) => Children.toArray(node).map((child) => {
  if (typeof child === "string" || typeof child === "number") return String(child);
  return isValidElement(child) ? nodeText(child.props.children) : "";
}).join("");

const readOptions = (children, group = null, output = []) => {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === "option") {
      output.push({ value: String(child.props.value ?? ""), label: nodeText(child.props.children), disabled: Boolean(child.props.disabled), group });
    } else if (child.type === "optgroup") {
      readOptions(child.props.children, child.props.label, output);
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
    left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), width,
    ...(openAbove ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 })
  };
};

/** Shared select-only combobox used by every kitchen-app dropdown. */
export default function Select({ value, onChange, children, disabled = false, required = false, className, style, name, id, placeholder = "Choose…", ...rest }) {
  const uid = useId();
  const listId = `${uid}-listbox`;
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const typeahead = useRef({ text: "", timer: null });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [popup, setPopup] = useState({});
  const options = readOptions(children);
  const optionCount = options.length;
  const stringValue = String(value ?? "");
  const selectedIndex = options.findIndex((option) => option.value === stringValue);
  const selected = options[selectedIndex];

  const positionPopup = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPopup(popupPosition(rect, optionCount));
  };
  const firstEnabled = (from, direction = 1) => {
    if (!optionCount) return -1;
    let index = from;
    for (let checked = 0; checked < optionCount; checked += 1) {
      index = (index + direction + optionCount) % optionCount;
      if (!options[index].disabled) return index;
    }
    return -1;
  };
  const closeMenu = () => { setOpen(false); setActive(-1); };
  const openMenu = (preferred = selectedIndex) => {
    if (disabled) return;
    positionPopup();
    setActive(preferred >= 0 && !options[preferred]?.disabled ? preferred : firstEnabled(-1));
    setOpen(true);
  };
  const pick = (index) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange?.({ target: { value: option.value, name }, currentTarget: { value: option.value, name } });
    closeMenu();
    triggerRef.current?.focus();
  };
  const move = (direction) => {
    if (!open) return openMenu(selectedIndex);
    setActive((current) => firstEnabled(current < 0 ? (direction > 0 ? -1 : 0) : current, direction));
  };
  const onKeyDown = (event) => {
    switch (event.key) {
      case "ArrowDown": event.preventDefault(); move(1); break;
      case "ArrowUp": event.preventDefault(); move(-1); break;
      case "Home": if (open) { event.preventDefault(); setActive(firstEnabled(-1)); } break;
      case "End": if (open) { event.preventDefault(); setActive(firstEnabled(0, -1)); } break;
      case "Enter":
      case " ": event.preventDefault(); if (open && active >= 0) pick(active); else openMenu(); break;
      case "Escape": if (open) { event.preventDefault(); closeMenu(); } break;
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

  const menu = open && !disabled ? createPortal(
    <ul id={listId} role="listbox" className="custom-select__menu" style={popup} aria-label={rest["aria-label"] || name || "Options"} onMouseDown={(event) => event.preventDefault()}>
      {options.map((option, index) => (
        <li key={`${option.value}-${index}`} role="presentation">
          {option.group && option.group !== options[index - 1]?.group && <div className="custom-select__group">{option.group}</div>}
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
            <span>{option.label}</span>{option.value === stringValue && <Check size={15} aria-hidden="true" />}
          </div>
        </li>
      ))}
    </ul>, document.body
  ) : null;

  return <div ref={rootRef} className={`custom-select${className ? ` ${className}` : ""}`}>
    <button
      {...rest}
      ref={triggerRef}
      id={id}
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={listId}
      aria-required={required || undefined}
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
    {menu}
  </div>;
}
