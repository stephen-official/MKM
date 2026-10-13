import { plural } from "../executive/format.js";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIOD = { "last-7-days": "last 7 days", "last-30-days": "last 30 days", "previous-month": "previous month" };
const FORMAT = { xlsx: "Excel", pdf: "PDF" };

export const describeSchedule = (s) => {
  const when = s.cadence === "daily" ? "Every day" : s.cadence === "weekly" ? `Every ${DAYS[s.dayOfWeek]}` : `Monthly on day ${s.dayOfMonth}`;
  const n = s.recipients.length;
  return `${when} at ${s.time} IST · ${PERIOD[s.rangePreset]} · ${FORMAT[s.format]} · ${n} ${plural(n, "recipient", "recipients")}`;
};

export const parseRecipients = (text) => String(text || "").split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);

export const EMPTY_SCHEDULE = {
  name: "", godownId: "all", rangePreset: "last-7-days", cadence: "weekly", dayOfWeek: 1, dayOfMonth: 1,
  time: "08:00", format: "xlsx", recipients: [], active: true
};

/** The form's editable fields as the API body (recipients parsed; only the cadence's own day is sent). */
export const buildSchedulePayload = (form) => {
  const { recipientsText, ...rest } = form;
  return {
    ...rest,
    recipients: parseRecipients(recipientsText),
    dayOfWeek: rest.cadence === "weekly" ? Number(rest.dayOfWeek) : null,
    dayOfMonth: rest.cadence === "monthly" ? Number(rest.dayOfMonth) : null
  };
};

/** True when a schedule points at a specific kitchen that is no longer in the kitchen list. */
export const isRemovedKitchen = (godownId, kitchens) =>
  godownId !== "all" && !kitchens.some((k) => String(k._id) === String(godownId));
