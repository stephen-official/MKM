import { useEffect, useRef, useState } from "react";
import { ChevronDown, Info, Trash2 } from "lucide-react";
import { PACK_TYPES } from "./productForm.js";

const PREVIEW_GAP = 10; // px between the list and the picture; matches the CSS offset
const PREVIEW_ROOM = 320; // extra scroll height while open: tallest picture (240) + frame + lead + margin
const PREVIEW_LEAD = 24; // how far above the i button the picture starts

const scrollParent = (node) => {
  for (let el = node?.parentElement; el; el = el.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(el).overflowY)) return el;
  }
  return null;
};

/**
 * Pack type dropdown. A native <select> cannot hold the info icon, hover picture or delete button,
 * so this is a small listbox: presets (with the info icon), saved custom types (with a delete button), then Custom.
 * `value` is the chosen name; `custom` is true while "Custom" is the choice.
 */
export function PackTypeSelect({ id, value, custom, customOptions, invalid, onPick, onCustom, onDelete }) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(null); // last preset hovered; kept so the picture stays put while the popup animates out
  const [hovering, setHovering] = useState(false);
  const [broken, setBroken] = useState(() => new Set()); // pictures that failed to load stay hidden
  const [anchor, setAnchor] = useState({ top: 0, originX: 0, originY: 0 }); // where the i button sits, so the picture grows out of it
  const root = useRef(null);
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => !root.current?.contains(event.target) && setOpen(false);
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const close = () => { setOpen(false); setHovering(false); };
  const showPreview = (type, event) => {
    const box = panel.current?.getBoundingClientRect();
    const dotBox = event.currentTarget.getBoundingClientRect();
    if (box) {
      const x = dotBox.left + dotBox.width / 2 - box.left;
      const y = dotBox.top + dotBox.height / 2 - box.top;
      const top = Math.max(0, y - PREVIEW_LEAD);
      setAnchor({ top, originX: x - (box.width + PREVIEW_GAP), originY: y - top });
    }
    setShown(type);
    setHovering(true);
  };
  const hidePreview = () => setHovering(false);

  // While the list is open, lengthen the scrollable area below it so the tallest picture can always be scrolled into view.
  useEffect(() => {
    if (!open) return undefined;
    const parent = scrollParent(root.current);
    if (!parent) return undefined;
    const before = parent.style.paddingBottom;
    const current = parseFloat(getComputedStyle(parent).paddingBottom) || 0;
    parent.style.paddingBottom = `${current + PREVIEW_ROOM}px`;
    return () => { parent.style.paddingBottom = before; };
  }, [open]);
  const same = (name) => !custom && value.trim().toLowerCase() === name.toLowerCase();
  const label = custom ? "Custom" : value || "Choose pack type…";
  const showing = shown && !broken.has(shown.name) ? shown : null;

  return (
    <div className="pack-select" ref={root}>
      <button type="button" id={id} className="pack-select__button" aria-haspopup="listbox" aria-expanded={open} aria-invalid={invalid || undefined} onClick={() => setOpen((o) => !o)}>
        <span className={value || custom ? "" : "pack-select__placeholder"}>{label}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="pack-select__panel" ref={panel}>
          <ul role="listbox" aria-labelledby={id} className="pack-select__list">
            {PACK_TYPES.map((type) => (
              <li key={type.name} className="pack-select__row">
                <button type="button" role="option" aria-selected={same(type.name)} className="pack-select__option" onClick={() => { onPick(type.name); close(); }}>{type.name}</button>
                <span
                  className="pack-type__info" tabIndex={0} role="img" aria-label={`What a ${type.name} looks like`}
                  onMouseEnter={(e) => showPreview(type, e)} onMouseLeave={hidePreview} onFocus={(e) => showPreview(type, e)} onBlur={hidePreview}
                ><Info size={14} aria-hidden="true" /></span>
              </li>
            ))}
            {customOptions.map((name) => (
              <li key={name} className="pack-select__row">
                <button type="button" role="option" aria-selected={same(name)} className="pack-select__option" onClick={() => { onPick(name); close(); }}>{name}</button>
                <button type="button" className="pack-type__remove" aria-label={`Delete custom pack type ${name}`} onClick={() => { close(); onDelete(name); }}>
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              </li>
            ))}
            <li className="pack-select__row">
              <button type="button" role="option" aria-selected={Boolean(custom)} className="pack-select__option" onClick={() => { onCustom(); close(); }}>Custom</button>
            </li>
          </ul>
          {showing && (
            <div className={`pack-select__preview${hovering ? " is-open" : ""}`} aria-hidden="true" style={{ top: anchor.top, transformOrigin: `${anchor.originX}px ${anchor.originY}px` }}>
              <img src={showing.image} alt="" onError={() => setBroken((prev) => new Set(prev).add(showing.name))} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
