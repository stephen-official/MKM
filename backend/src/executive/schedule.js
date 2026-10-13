import mongoose from "mongoose";
import { BUSINESS_TZ, addDays, businessDateOf, zonedInstant } from "./params.js";

export const PRESETS = Object.freeze(["last-7-days", "last-30-days", "previous-month"]);
export const CADENCES = Object.freeze(["daily", "weekly", "monthly"]);
export const FORMATS = Object.freeze(["xlsx", "pdf"]);
export const MAX_RECIPIENTS = 20;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const weekday = (dateStr) => new Date(`${dateStr}T00:00:00Z`).getUTCDay();

export const computeNextRun = (schedule, after, tz = BUSINESS_TZ) => {
  let day = businessDateOf(after, tz);
  for (let i = 0; i < 400; i += 1, day = addDays(day, 1)) {
    const matches = schedule.cadence === "daily"
      || (schedule.cadence === "weekly" && weekday(day) === schedule.dayOfWeek)
      || (schedule.cadence === "monthly" && Number(day.slice(8, 10)) === schedule.dayOfMonth);
    if (!matches) continue;
    const at = zonedInstant(day, schedule.time, tz);
    if (at > after) return at;
  }
  throw new Error("No next run within 400 days");
};

export const rangeForPreset = (preset, runAt, tz = BUSINESS_TZ) => {
  const today = businessDateOf(runAt, tz);
  const yesterday = addDays(today, -1);
  if (preset === "last-7-days") return { from: addDays(today, -7), to: yesterday };
  if (preset === "last-30-days") return { from: addDays(today, -30), to: yesterday };
  const firstOfThisMonth = `${today.slice(0, 7)}-01`;
  const lastOfPrevious = addDays(firstOfThisMonth, -1);
  return { from: `${lastOfPrevious.slice(0, 7)}-01`, to: lastOfPrevious };
};

export const validateSchedule = (input) => {
  const fields = {};
  const name = String(input?.name || "").trim();
  if (!name || name.length > 100) fields.name = "Enter a name (100 characters max).";
  const godownId = input?.godownId === "all" ? "all" : String(input?.godownId || "").toLowerCase();
  if (godownId !== "all" && !(/^[a-f0-9]{24}$/.test(godownId) && mongoose.isValidObjectId(godownId))) fields.godownId = "Choose a kitchen or all kitchens.";
  if (!PRESETS.includes(input?.rangePreset)) fields.rangePreset = "Choose a report period.";
  if (!CADENCES.includes(input?.cadence)) fields.cadence = "Choose how often to send.";
  if (input?.cadence === "weekly" && !(Number.isInteger(input?.dayOfWeek) && input.dayOfWeek >= 0 && input.dayOfWeek <= 6)) fields.dayOfWeek = "Choose a day of the week.";
  if (input?.cadence === "monthly" && !(Number.isInteger(input?.dayOfMonth) && input.dayOfMonth >= 1 && input.dayOfMonth <= 28)) fields.dayOfMonth = "Choose a day from 1 to 28.";
  if (!TIME.test(String(input?.time || ""))) fields.time = "Enter a time as HH:MM (24-hour).";
  if (!FORMATS.includes(input?.format)) fields.format = "Choose Excel or PDF.";
  const recipients = [...new Set((Array.isArray(input?.recipients) ? input.recipients : []).map((e) => String(e).trim().toLowerCase()).filter(Boolean))];
  if (recipients.length === 0 || recipients.length > MAX_RECIPIENTS || recipients.some((e) => !EMAIL.test(e))) {
    fields.recipients = `Add 1 to ${MAX_RECIPIENTS} valid email addresses.`;
  }
  if (Object.keys(fields).length) throw Object.assign(new Error("Check the highlighted fields."), { status: 400, code: "INVALID_SCHEDULE", fields });
  return {
    value: {
      name, godownId, rangePreset: input.rangePreset, cadence: input.cadence,
      dayOfWeek: input.cadence === "weekly" ? input.dayOfWeek : null,
      dayOfMonth: input.cadence === "monthly" ? input.dayOfMonth : null,
      time: input.time, recipients, format: input.format, active: input.active !== false
    }
  };
};
