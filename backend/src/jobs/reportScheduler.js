import { ReportRun, ReportSchedule } from "../models/ReportScheduleModels.js";
import { buildExportReport, exportFilename } from "../executive/exportCommon.js";
import { buildExcelWorkbook } from "../executive/excelExport.js";
import { pdfBlocks, renderPdf } from "../executive/pdfExport.js";
import { computeNextRun, rangeForPreset } from "../executive/schedule.js";
import { mailer as defaultMailer } from "../utils/mailer.js";

const LOCK_MS = 15 * 60_000;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MIME = { xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", pdf: "application/pdf" };

const claimNext = (now) => ReportSchedule.findOneAndUpdate(
  { active: true, nextRunAt: { $lte: now }, $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }] },
  { $set: { lockedUntil: new Date(now.getTime() + LOCK_MS) } },
  { sort: { nextRunAt: 1 }, new: true }
);

const runOne = async (schedule, now, mailer) => {
  const { from, to } = rangeForPreset(schedule.rangePreset, now);
  const run = { scheduleId: schedule._id, startedAt: new Date(), from, to, recipientCount: schedule.recipients.length };
  try {
    const report = await buildExportReport({ godownId: schedule.godownId, from, to }, { now });
    const content = schedule.format === "pdf"
      ? await renderPdf(pdfBlocks(report))
      : Buffer.from(await buildExcelWorkbook(report).xlsx.writeBuffer());
    if (content.length > MAX_ATTACHMENT_BYTES) throw Object.assign(new Error("Attachment too large"), { code: "ATTACHMENT_TOO_LARGE" });
    const filename = exportFilename({ kitchen: report.meta.kitchen, from, to, generatedAt: report.meta.generatedAt, tz: report.meta.timezone, ext: schedule.format });
    try {
      await mailer.sendReportEmail({
        bcc: schedule.recipients,
        subject: `${schedule.name}: ${report.meta.kitchen.name}, ${from} to ${to}`,
        text: `Attached is the Montessori Kitchen executive report for ${report.meta.kitchen.name}, ${from} to ${to} (${report.meta.timezone}). Values marked estimated use the latest known prices.`,
        attachment: { filename, content, contentType: MIME[schedule.format] }
      });
    } catch (error) {
      throw Object.assign(error, { code: "EMAIL_FAILED" });
    }
    return { ...run, status: "success", filename, errorCode: null };
  } catch (error) {
    const code = typeof error?.code === "string" ? error.code : "RUN_FAILED";
    console.error(`[schedules] ${schedule._id} failed: ${code} ${error.message}`);
    return { ...run, status: "failed", filename: null, errorCode: code };
  }
};

export const runDueSchedules = async ({ now = new Date(), mailer = defaultMailer, limit = 10 } = {}) => {
  let ran = 0;
  while (ran < limit) {
    const schedule = await claimNext(now);
    if (!schedule) break;
    const result = await runOne(schedule, now, mailer);
    await ReportRun.create({ ...result, finishedAt: new Date() });
    await ReportSchedule.updateOne({ _id: schedule._id }, {
      $set: {
        lastRunAt: now, lastStatus: result.status, lastError: result.errorCode,
        nextRunAt: computeNextRun(schedule, now), lockedUntil: null
      }
    });
    ran += 1;
  }
  return { ran };
};

export const startReportScheduler = ({ intervalMs = 60_000 } = {}) => {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runDueSchedules();
    } catch (error) {
      console.error("[schedules] tick failed:", error.message);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  tick();
  return () => clearInterval(timer);
};
