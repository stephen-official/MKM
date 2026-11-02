import { useState } from "react";
import { Button, Modal } from "../../components/ui/index.jsx";
import { CLOSING_SLOTS, closingChoice, closingDays, closingRange, dayText, orderTitle, timeLeft, toIstInput } from "./planning.js";

const dayLabel = (day) => dayText(`${day}T12:00:00+05:30`);

/**
 * Super-admin popup: move when kitchens stop joining an order. All taps: a day (today up to 2 days before needed-by),
 * then a time, or "Latest allowed". Shows the new time before saving. onSave(iso) resolves true when saved.
 */
export function ClosingTimeDialog({ order, now, busy, onSave, onClose }) {
  const range = closingRange(order, now);
  const days = closingDays(range);
  const current = order.closesAt ? toIstInput(order.closesAt) : "";
  const [day, setDay] = useState(() => current.slice(0, 10) && days.includes(current.slice(0, 10)) ? current.slice(0, 10) : days[0] || "");
  const [slot, setSlot] = useState(""); // a CLOSING_SLOTS key, or "latest"
  const picked = slot === "latest" ? range?.max.toISOString() : closingChoice(day, slot, range);
  const unchanged = picked && order.closesAt && Math.abs(new Date(picked) - new Date(order.closesAt)) < 60_000;

  const save = async (event) => {
    event.preventDefault();
    if (busy || !picked || unchanged) return;
    await onSave(picked);
  };

  return (
    <Modal title="Change closing time" onClose={() => !busy && onClose()} closeButton="right" wide dismissible={!busy}>
      <form className="pl-editor pl-closing-form" onSubmit={save} noValidate>
        <p className="pl-editor__order">{orderTitle(order)} · now closes <strong>{dayText(order.closesAt, true)}</strong></p>

        <fieldset className="pl-step">
          <legend>1 · Day</legend>
          <div className="pl-choices">
            {days.map((d) => (
              <button key={d} type="button" className={`kg-chip pl-choice${slot !== "latest" && day === d ? " is-picked" : ""}`} aria-pressed={slot !== "latest" && day === d}
                onClick={() => { setDay(d); if (slot === "latest") setSlot(""); }}>
                {dayLabel(d)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="pl-step">
          <legend>2 · Time (India time)</legend>
          <div className="pl-choices">
            {CLOSING_SLOTS.map((s) => {
              const possible = Boolean(closingChoice(day, s.key, range));
              return (
                <button key={s.key} type="button" className={`kg-chip pl-choice${slot === s.key ? " is-picked" : ""}`} aria-pressed={slot === s.key}
                  disabled={!possible} title={possible ? undefined : "Not possible on this day"} onClick={() => setSlot(s.key)}>
                  {s.label}
                </button>
              );
            })}
            <button type="button" className={`kg-chip pl-choice${slot === "latest" ? " is-picked" : ""}`} aria-pressed={slot === "latest"} onClick={() => setSlot("latest")}>
              Latest allowed · {range ? dayText(range.max, true) : "—"}
            </button>
          </div>
          <p className="pl-step__note">An order must close at least 2 days before it is needed ({dayText(order.neededBy)}).</p>
        </fieldset>

        <div className={`kg-row pl-closing-preview${picked ? " is-ready" : ""}`} aria-live="polite">
          {picked
            ? <>New closing time: <strong>{dayText(picked, true)}</strong> · {timeLeft(picked, now)}{unchanged && " (same as now)"}</>
            : "Pick a day and a time."}
        </div>

        <div className="pl-editor__actions">
          <Button type="button" variant="danger" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy || !picked || unchanged}>{busy ? "Saving…" : "Save closing time"}</Button>
        </div>
      </form>
    </Modal>
  );
}
