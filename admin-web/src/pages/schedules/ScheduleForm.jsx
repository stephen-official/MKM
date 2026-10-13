import { useState } from "react";
import { Button, Field, Modal } from "../../components/ui/index.jsx";
import { EMPTY_SCHEDULE, buildSchedulePayload, isRemovedKitchen } from "./scheduleText.js";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const FIELD_KEYS = ["name", "godownId", "rangePreset", "cadence", "dayOfWeek", "dayOfMonth", "time", "format", "recipients", "active"];

export function ScheduleForm({ title, initial, kitchens, busy, serverErrors = {}, onCancel, onSubmit }) {
  // Only the editable fields are kept, so server-managed ones (_id, version, nextRunAt, ...) are never sent back.
  const [form, setForm] = useState(() => ({
    name: initial.name,
    godownId: initial.godownId,
    rangePreset: initial.rangePreset,
    cadence: initial.cadence,
    dayOfWeek: initial.dayOfWeek ?? EMPTY_SCHEDULE.dayOfWeek,
    dayOfMonth: initial.dayOfMonth ?? EMPTY_SCHEDULE.dayOfMonth,
    time: initial.time,
    format: initial.format,
    active: initial.active,
    recipientsText: initial.recipients.join("\n")
  }));
  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const err = (key) => serverErrors[key] && <span className="field__error" role="alert">{serverErrors[key]}</span>;
  const otherErrors = Object.entries(serverErrors).filter(([key]) => !FIELD_KEYS.includes(key));
  const submit = (event) => {
    event.preventDefault();
    onSubmit(buildSchedulePayload(form));
  };
  const active = kitchens.filter((k) => k.active !== false);
  const inactive = kitchens.filter((k) => k.active === false);
  return (
    <Modal title={title} onClose={() => !busy && onCancel()} wide actions={(
      <>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button type="submit" form="schedule-form" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
      </>
    )}>
      <form id="schedule-form" className="form-grid form-grid--stack" onSubmit={submit} noValidate>
        {otherErrors.map(([key, message]) => <span key={key} className="field__error" role="alert">{message}</span>)}
        <Field label="Name"><input value={form.name} onChange={(e) => set({ name: e.target.value })} />{err("name")}</Field>
        <Field label="Kitchen">
          <select value={form.godownId} onChange={(e) => set({ godownId: e.target.value })}>
            <option value="all">All kitchens</option>
            {isRemovedKitchen(form.godownId, kitchens) && <option value={form.godownId} disabled>Removed kitchen</option>}
            {active.length > 0 && <optgroup label="Active">{active.map((k) => <option key={k._id} value={k._id}>{k.name}</option>)}</optgroup>}
            {inactive.length > 0 && <optgroup label="Inactive">{inactive.map((k) => <option key={k._id} value={k._id}>{k.name}</option>)}</optgroup>}
          </select>
          {err("godownId")}
        </Field>
        <Field label="Report period">
          <select value={form.rangePreset} onChange={(e) => set({ rangePreset: e.target.value })}>
            <option value="last-7-days">Last 7 days</option>
            <option value="last-30-days">Last 30 days</option>
            <option value="previous-month">Previous calendar month</option>
          </select>
          {err("rangePreset")}
        </Field>
        <Field label="Frequency">
          <select value={form.cadence} onChange={(e) => set({ cadence: e.target.value })}>
            <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
          </select>
          {err("cadence")}
        </Field>
        {form.cadence === "weekly" && (
          <Field label="Day of the week">
            <select value={form.dayOfWeek} onChange={(e) => set({ dayOfWeek: Number(e.target.value) })}>
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
            {err("dayOfWeek")}
          </Field>
        )}
        {form.cadence === "monthly" && (
          <Field label="Day of the month">
            <select value={form.dayOfMonth} onChange={(e) => set({ dayOfMonth: Number(e.target.value) })}>
              {Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
            <small className="exec-muted">Days 29–31 are not offered so every month has a run.</small>
            {err("dayOfMonth")}
          </Field>
        )}
        <Field label="Time (IST)"><input type="time" step="60" value={form.time} onChange={(e) => set({ time: e.target.value })} />{err("time")}</Field>
        <fieldset className="checkbox">
          <legend className="field__label">Format</legend>
          <label><input type="radio" name="format" checked={form.format === "xlsx"} onChange={() => set({ format: "xlsx" })} /> Excel</label>
          <label><input type="radio" name="format" checked={form.format === "pdf"} onChange={() => set({ format: "pdf" })} /> PDF</label>
          {err("format")}
        </fieldset>
        <Field label="Recipients">
          <textarea rows={4} value={form.recipientsText} onChange={(e) => set({ recipientsText: e.target.value })} />
          <small className="exec-muted">Separate addresses with commas or new lines. Up to 20. Recipients are Bcc’d and do not see each other.</small>
          {err("recipients")}
        </Field>
        <label className="checkbox"><input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} /> Active</label>
      </form>
    </Modal>
  );
}
