import { useEffect, useId, useMemo, useRef, useState } from "react";

const MAX_OPTIONS = 100;

/* Accessible product picker (ARIA 1.2 combobox with a listbox popup).
   Arrow keys move, Enter picks, Escape closes (and restores the picked name),
   Home/End jump. Remount with a new `key` to reset it (e.g. when the godown changes). */
export function ProductCombobox({ products, value, onSelect, disabled, placeholder = "Search product…" }) {
  const uid = useId();
  const listId = `${uid}-list`;
  const selected = products.find((p) => p._id === value);

  const [text, setText] = useState(selected?.name || "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const optionRefs = useRef([]);

  // Keep the input in step when the selection changes from outside.
  useEffect(() => {
    setText(selected?.name || "");
  }, [selected?.name]);

  const options = useMemo(() => {
    // Searching only applies while the text differs from the picked product's name.
    const query = selected && text === selected.name ? "" : text.trim().toLowerCase();
    const matches = query
      ? products.filter(
          (p) => p.name?.toLowerCase().includes(query) || p.stockGroup?.toLowerCase().includes(query)
        )
      : products;
    return { shown: matches.slice(0, MAX_OPTIONS), total: matches.length };
  }, [products, text, selected]);

  useEffect(() => {
    if (active >= 0) optionRefs.current[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const close = () => {
    setOpen(false);
    setActive(-1);
    setText(selected?.name || "");
  };

  const pick = (product) => {
    onSelect(product._id);
    setText(product.name);
    setOpen(false);
    setActive(-1);
  };

  const move = (delta) => {
    const count = options.shown.length;
    if (!count) return;
    setOpen(true);
    setActive((prev) => {
      if (prev < 0) return delta > 0 ? 0 : count - 1;
      return (prev + delta + count) % count;
    });
  };

  const onKeyDown = (e) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        move(-1);
        break;
      case "Home":
        if (open && options.shown.length) {
          e.preventDefault();
          setActive(0);
        }
        break;
      case "End":
        if (open && options.shown.length) {
          e.preventDefault();
          setActive(options.shown.length - 1);
        }
        break;
      case "Enter":
        if (open) {
          e.preventDefault();
          const product = options.shown[active >= 0 ? active : options.shown.length === 1 ? 0 : -1];
          if (product) pick(product);
        }
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          close();
        }
        break;
      case "Tab":
        close();
        break;
      default:
    }
  };

  const showList = open && !disabled;

  return (
    <div style={{ position: "relative", width: 240 }}>
      <input
        type="text"
        role="combobox"
        aria-label="Product"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${uid}-opt-${active}` : undefined}
        autoComplete="off"
        value={text}
        disabled={disabled}
        placeholder={disabled ? "Select a godown first" : placeholder}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(e.target.value.trim() ? 0 : -1);
        }}
        onFocus={(e) => {
          setOpen(true);
          e.target.select();
        }}
        onClick={() => setOpen(true)}
        onBlur={close}
        onKeyDown={onKeyDown}
        style={{ width: "100%", boxSizing: "border-box" }}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Products"
          // Keep focus in the input while the pointer interacts with the list.
          onMouseDown={(e) => e.preventDefault()}
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 30,
            margin: 0,
            padding: 0,
            listStyle: "none",
            maxHeight: 280,
            overflowY: "auto",
            overscrollBehavior: "contain",
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-card)"
          }}
        >
          {options.shown.length === 0 ? (
            <li role="presentation" className="page-subtitle" style={{ padding: 14, textAlign: "center", margin: 0 }}>
              No products found
            </li>
          ) : (
            options.shown.map((product, index) => (
              <li
                key={product._id}
                id={`${uid}-opt-${index}`}
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                role="option"
                aria-selected={product._id === value}
                onClick={() => pick(product)}
                onMouseEnter={() => setActive(index)}
                style={{
                  padding: "10px 14px",
                  cursor: "pointer",
                  background: index === active ? "var(--primary-bg)" : "transparent",
                  borderBottom: "1px solid var(--border)",
                  fontWeight: product._id === value ? 650 : 500,
                  color: "var(--ink)"
                }}
              >
                <div>{product.name}</div>
                {product.stockGroup && (
                  <div className="page-subtitle" style={{ margin: "2px 0 0" }}>{product.stockGroup}</div>
                )}
              </li>
            ))
          )}
          {options.total > options.shown.length && (
            <li role="presentation" className="page-subtitle" style={{ padding: 10, textAlign: "center", margin: 0 }}>
              Showing {options.shown.length} of {options.total}. Keep typing to narrow down.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
