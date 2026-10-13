const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIOD = { "last-7-days": "last 7 days", "last-30-days": "last 30 days", "previous-month": "previous month" };
const FORMAT = { xlsx: "Excel", pdf: "PDF" };

export const describeSchedule = (s) => {
  const when = s.cadence === "daily" ? "Every day" : s.cadence === "weekly" ? `Every ${DAYS[s.dayOfWeek]}` : `Monthly on day ${s.dayOfMonth}`;
  const n = s.recipients.length;
  return `${when} at ${s.time} IST · ${PERIOD[s.rangePreset]} · ${FORMAT[s.format]} · ${n} recipient${n === 1 ? "" : "s"}`;
};

export const parseRecipients = (text) => String(text || "").split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);

export const EMPTY_SCHEDULE = {
  name: "", godownId: "all", rangePreset: "last-7-days", cadence: "weekly", dayOfWeek: 1, dayOfMonth: 1,
  time: "08:00", format: "xlsx", recipients: [], active: true
};
