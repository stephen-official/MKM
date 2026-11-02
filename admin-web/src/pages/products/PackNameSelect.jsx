import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Minus } from "lucide-react";

/**
 * Pack name picker: the built-in names, then the custom names already in use (each with a minus to delete a mistyped one),
 * then "Other…" to type a new one. A plain <select> cannot hold a button per option, hence this small listbox.
 * `onPick(name)` chooses a name, `onOther()` switches the row to typing, `onRemove(name)` deletes a custom name.
 * The product group picker reuses it: no built-ins, no divider, its own wording, and a minus only where `canRemove(name)` allows.
 */
export function PackNameSelect({ id, value, builtIns, customs, invalid, onPick, onOther, onRemove,
  customsLabel = "Added by you", otherLabel = "Other… type a new name", removeLabel = "Delete pack name", canRemove = () => true }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => !root.current?.contains(event.target) && setOpen(false);
    const onKey = (event) => { if (event.key === "Escape") { event.stopPropagation(); setOpen(false); } };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey, true); };
  }, [open]);

  const same = (name) => value.trim().toLowerCase() === name.toLowerCase();
  const pick = (name) => { onPick(name); setOpen(false); };
  const row = (name, removable) => (
    <li key={name} className="pack-name__row">
      <button type="button" role="option" aria-selected={same(name)} className="pack-name__option" onClick={() => pick(name)}>
        <span>{name}</span>{same(name) && <Check size={15} aria-hidden="true" />}
      </button>
      {removable && (
        <button type="button" className="pack-name__remove" aria-label={`${removeLabel} ${name}`} title={removeLabel}
          onClick={() => { setOpen(false); onRemove(name); }}>
          <Minus size={14} aria-hidden="true" />
        </button>
      )}
    </li>
  );

  return (
    <div className="pack-name" ref={root}>
      <button type="button" id={id} className="pack-name__button" aria-haspopup="listbox" aria-expanded={open} aria-invalid={invalid || undefined} onClick={() => setOpen((o) => !o)}>
        <span className={value ? "" : "pack-name__placeholder"}>{value || "Choose…"}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <ul role="listbox" aria-labelledby={id} className="pack-name__list">
          {builtIns.map((name) => row(name, false))}
          {customsLabel && customs.length > 0 && <li className="pack-name__divider" role="presentation">{customsLabel}</li>}
          {customs.map((name) => row(name, canRemove(name)))}
          <li className="pack-name__row">
            <button type="button" role="option" aria-selected={false} className="pack-name__option pack-name__option--other" onClick={() => { onOther(); setOpen(false); }}>{otherLabel}</button>
          </li>
        </ul>
      )}
    </div>
  );
}
