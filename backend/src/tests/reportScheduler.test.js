import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import { startDb, clearDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { consumption, kitchen, seedCatalog } from "./helpers/fixtures.js";
import { ReportRun, ReportSchedule } from "../models/ReportScheduleModels.js";
import nodemailer from "nodemailer";
import { runDueSchedules } from "../jobs/reportScheduler.js";
import { mailer } from "../utils/mailer.js";
import { env } from "../config/env.js";

const NOW = new Date("2026-10-13T02:00:00Z");
let sent;
const fakeMailer = { sendReportEmail: async (msg) => { sent.push(msg); } };

before(async () => { await startDb(); await syncAllIndexes(); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  sent = [];
  const { items } = await seedCatalog(["Rice"]);
  const A = await kitchen("Main Kitchen");
  await consumption(A, { date: "2026-10-10", createdAt: "2026-10-10T05:00:00Z", lines: [[items.Rice, 1, 40]] });
});

const schedule = (extra = {}) => ReportSchedule.create({
  name: "Weekly", godownId: "all", rangePreset: "last-7-days", cadence: "daily", time: "07:30",
  recipients: ["a@x.io", "b@x.io"], format: "xlsx", nextRunAt: new Date(NOW.getTime() - 1000), createdBy: new mongoose.Types.ObjectId(), ...extra
});

test("a due schedule runs once, emails an attachment in Bcc and advances", async () => {
  const s = await schedule();
  const { ran } = await runDueSchedules({ now: NOW, mailer: fakeMailer });
  assert.equal(ran, 1);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].bcc, ["a@x.io", "b@x.io"]);
  assert.match(sent[0].attachment.filename, /^MKM-Executive-Report_All-Kitchens_2026-10-06_to_2026-10-12_.*\.xlsx$/);
  assert.ok(sent[0].attachment.content.length > 0);
  const after1 = await ReportSchedule.findById(s._id).lean();
  assert.equal(after1.lastStatus, "success");
  assert.equal(after1.lockedUntil, null);
  assert.equal(after1.nextRunAt.toISOString(), "2026-10-14T02:00:00.000Z");
  assert.equal(await ReportRun.countDocuments({ status: "success" }), 1);
  assert.equal((await runDueSchedules({ now: NOW, mailer: fakeMailer })).ran, 0, "not due again");
});

test("two concurrent ticks never send twice", async () => {
  await schedule();
  const [a, b] = await Promise.all([runDueSchedules({ now: NOW, mailer: fakeMailer }), runDueSchedules({ now: NOW, mailer: fakeMailer })]);
  assert.equal(a.ran + b.ran, 1);
  assert.equal(sent.length, 1);
});

test("a run whose kitchen no longer exists is recorded and deactivates the schedule", async (t) => {
  const errors = t.mock.method(console, "error", () => {});
  const s = await schedule({ godownId: "65f0c0ffee0000000000abcd" });
  await runDueSchedules({ now: NOW, mailer: fakeMailer });
  const doc = await ReportSchedule.findById(s._id).lean();
  assert.equal(doc.lastStatus, "failed");
  assert.equal(doc.lastError, "KITCHEN_NOT_FOUND");
  assert.equal(doc.active, false, "it would only fail again tomorrow");
  assert.equal(doc.lockedUntil, null);
  assert.equal(sent.length, 0);
  assert.equal(await ReportRun.countDocuments({ scheduleId: s._id, status: "failed", errorCode: "KITCHEN_NOT_FOUND" }), 1);
  assert.equal((await runDueSchedules({ now: new Date(NOW.getTime() + 86_400_000), mailer: fakeMailer })).ran, 0, "not retried");
  assert.deepEqual(errors.mock.calls.map((c) => c.arguments[0]), [`[schedules] ${s._id} failed: KITCHEN_NOT_FOUND`]);
});

test("other failures leave the schedule active and advancing", async (t) => {
  t.mock.method(console, "error", () => {});
  const s = await schedule();
  await runDueSchedules({ now: NOW, mailer: { sendReportEmail: async () => { throw new Error("smtp"); } } });
  const doc = await ReportSchedule.findById(s._id).lean();
  assert.equal(doc.active, true);
  assert.equal(doc.lastError, "EMAIL_FAILED");
  assert.ok(doc.nextRunAt > NOW);
});

test("mail failure is a failed run", async (t) => {
  const errors = t.mock.method(console, "error", () => {});
  await schedule();
  await runDueSchedules({ now: NOW, mailer: { sendReportEmail: async () => { throw new Error("smtp"); } } });
  assert.equal((await ReportRun.findOne().lean()).errorCode, "EMAIL_FAILED");
  assert.equal(errors.mock.callCount(), 1);
});

test("an xlsx schedule attaches a Buffer (so the size guard counts bytes)", async () => {
  await schedule({ format: "xlsx" });
  await runDueSchedules({ now: NOW, mailer: fakeMailer });
  assert.equal(sent.length, 1);
  assert.ok(Buffer.isBuffer(sent[0].attachment.content));
  assert.equal(sent[0].attachment.content.subarray(0, 2).toString(), "PK", "xlsx is a zip");
});

test("a PDF schedule attaches a real PDF with the right name and type", async () => {
  const s = await schedule({ format: "pdf" });
  await runDueSchedules({ now: NOW, mailer: fakeMailer });
  assert.equal(sent.length, 1);
  const { attachment } = sent[0];
  assert.equal(attachment.contentType, "application/pdf");
  assert.match(attachment.filename, /^MKM-Executive-Report_All-Kitchens_2026-10-06_to_2026-10-12_.*\.pdf$/);
  assert.equal(attachment.content.subarray(0, 5).toString(), "%PDF-");
  assert.equal((await ReportSchedule.findById(s._id).lean()).lastStatus, "success");
  assert.match((await ReportRun.findOne().lean()).filename, /\.pdf$/);
});

test("an attachment over 10 MB is not sent and the run fails with ATTACHMENT_TOO_LARGE", async (t) => {
  const errors = t.mock.method(console, "error", () => {});
  const huge = Buffer.alloc(10 * 1024 * 1024 + 1);
  for (const format of ["pdf", "xlsx"]) {
    await ReportSchedule.deleteMany({});
    await ReportRun.deleteMany({});
    const s = await schedule({ format });
    await runDueSchedules({ now: NOW, mailer: fakeMailer, renderers: { [format]: async () => huge } });
    assert.equal(sent.length, 0, format);
    const doc = await ReportSchedule.findById(s._id).lean();
    assert.equal(doc.lastStatus, "failed", format);
    assert.equal(doc.lastError, "ATTACHMENT_TOO_LARGE", format);
    assert.equal(doc.active, true, format);
    assert.equal((await ReportRun.findOne({ scheduleId: s._id }).lean()).errorCode, "ATTACHMENT_TOO_LARGE", format);
  }
  assert.equal(errors.mock.callCount(), 2);
  // exactly at the limit is still sent
  await ReportSchedule.deleteMany({});
  await schedule({ format: "pdf" });
  await runDueSchedules({ now: NOW, mailer: fakeMailer, renderers: { pdf: async () => Buffer.alloc(10 * 1024 * 1024) } });
  assert.equal(sent.length, 1);
});

test("the real mailer puts recipients in bcc and the service address in to", async (t) => {
  const original = env.emailUser;
  env.emailUser = "service@mkm.test";
  t.after(() => { env.emailUser = original; });
  const outbox = [];
  const create = t.mock.method(nodemailer, "createTransport", () => ({ sendMail: async (message) => { outbox.push(message); } }));
  const attachment = { filename: "r.xlsx", content: Buffer.from("x"), contentType: "application/octet-stream" };
  await mailer.sendReportEmail({ bcc: ["a@x.io", "b@x.io"], subject: "S", text: "T", attachment });
  assert.equal(create.mock.callCount(), 1);
  assert.equal(outbox.length, 1);
  assert.equal(outbox[0].to, "service@mkm.test");
  assert.deepEqual(outbox[0].bcc, ["a@x.io", "b@x.io"]);
  assert.equal(outbox[0].from, '"Montessori Kitchen" <service@mkm.test>');
  assert.equal(outbox[0].subject, "S");
  assert.deepEqual(outbox[0].attachments, [attachment]);
  assert.ok(!JSON.stringify(outbox[0].to).includes("a@x.io"), "recipients are never visible in To");
  assert.equal("cc" in outbox[0], false);
});

test("inactive and locked schedules are skipped", async () => {
  await schedule({ active: false });
  await schedule({ lockedUntil: new Date(NOW.getTime() + 60_000) });
  assert.equal((await runDueSchedules({ now: NOW, mailer: fakeMailer })).ran, 0);
});

test("a lock left by a crashed run expires", async () => {
  await schedule({ lockedUntil: new Date(NOW.getTime() - 1) });
  assert.equal((await runDueSchedules({ now: NOW, mailer: fakeMailer })).ran, 1);
});

test("mail failure still advances nextRunAt and releases the lock", async (t) => {
  t.mock.method(console, "error", () => {});
  const s = await schedule();
  await runDueSchedules({ now: NOW, mailer: { sendReportEmail: async () => { throw new Error("smtp"); } } });
  const doc = await ReportSchedule.findById(s._id).lean();
  assert.equal(doc.nextRunAt.toISOString(), "2026-10-14T02:00:00.000Z");
  assert.equal(doc.lockedUntil, null);
  assert.equal(doc.lastStatus, "failed");
  assert.equal((await runDueSchedules({ now: NOW, mailer: fakeMailer })).ran, 0, "not retried");
  assert.equal(sent.length, 0);
});

test("a schedule whose next run cannot be computed is deactivated without sending", async (t) => {
  t.mock.method(console, "error", () => {});
  const s = await schedule({ cadence: "weekly", dayOfWeek: null });
  await runDueSchedules({ now: NOW, mailer: fakeMailer });
  const doc = await ReportSchedule.findById(s._id).lean();
  assert.equal(sent.length, 0);
  assert.equal(doc.active, false);
  assert.equal(doc.lastStatus, "failed");
  assert.equal(doc.lastError, "INVALID_SCHEDULE");
  assert.equal(doc.lockedUntil, null);
  assert.equal(await ReportRun.countDocuments({ scheduleId: s._id, status: "failed", errorCode: "INVALID_SCHEDULE" }), 1);
  assert.equal((await runDueSchedules({ now: NOW, mailer: fakeMailer })).ran, 0);
  assert.equal(sent.length, 0);
});

test("failing to persist nextRunAt skips the run, keeps the schedule active and releases the lock", async (t) => {
  const s = await schedule();
  const original = ReportSchedule.updateOne.bind(ReportSchedule);
  let calls = 0;
  t.mock.method(ReportSchedule, "updateOne", (...args) => {
    calls += 1;
    if (calls === 1) throw new Error("db blip");
    return original(...args);
  });
  t.mock.method(console, "error", () => {});
  await runDueSchedules({ now: NOW, mailer: fakeMailer });
  assert.equal(sent.length, 0, "no send without a persisted next run");
  const doc = await ReportSchedule.findById(s._id).lean();
  assert.equal(doc.active, true);
  assert.equal(doc.lockedUntil, null);
  assert.equal(doc.lastError ?? null, null);
  assert.equal(await ReportRun.countDocuments({ errorCode: "INVALID_SCHEDULE" }), 0);
  // the next tick picks it up normally
  assert.equal((await runDueSchedules({ now: NOW, mailer: fakeMailer })).ran, 1);
  assert.equal(sent.length, 1);
});

test("a bookkeeping failure after a successful send never causes a second send", async (t) => {
  await schedule();
  t.mock.method(ReportRun, "create", () => { throw new Error("db"); });
  t.mock.method(console, "error", () => {});
  assert.equal((await runDueSchedules({ now: NOW, mailer: fakeMailer })).ran, 1);
  assert.equal(sent.length, 1);
  assert.equal((await ReportSchedule.findOne().lean()).lockedUntil, null);
  assert.equal((await runDueSchedules({ now: NOW, mailer: fakeMailer })).ran, 0);
  assert.equal((await runDueSchedules({ now: new Date(NOW.getTime() + 20 * 60_000), mailer: fakeMailer })).ran, 0, "still not due after the lock window");
  assert.equal(sent.length, 1);
});

test("HTTP: create, conflict, run-now, history (super-admin only)", async () => {
  const { app } = await import("../app.js");
  const request = (await import("supertest")).default;
  const { createUser } = await import("./helpers/auth.js");
  const root = await createUser({ role: "super_admin" });
  const admin = await createUser({ role: "admin" });
  const as = (who, method, url) => request(app)[method](url).set("Authorization", `Bearer ${who.token}`);
  const body = { name: "Daily", godownId: "all", rangePreset: "last-7-days", cadence: "daily", time: "07:30", recipients: ["a@x.io"], format: "pdf" };
  assert.equal((await as(admin, "get", "/api/report-schedules")).status, 403);
  const bad = await as(root, "post", "/api/report-schedules").send({ ...body, time: "7am" });
  assert.equal(bad.body.code, "INVALID_SCHEDULE");
  assert.ok(bad.body.fields.time);
  const created = await as(root, "post", "/api/report-schedules").send(body);
  assert.equal(created.status, 201);
  const edited = await as(root, "patch", `/api/report-schedules/${created.body._id}`).send({ expectedVersion: 1, name: "Daily 2" });
  assert.equal(edited.status, 200);
  assert.equal((await as(root, "patch", `/api/report-schedules/${created.body._id}`).send({ expectedVersion: 1, name: "x" })).status, 409);
  const noVersion = await as(root, "patch", `/api/report-schedules/${created.body._id}`).send({ name: "y" });
  assert.equal(noVersion.status, 400);
  assert.ok(noVersion.body.fields.expectedVersion);
  assert.equal((await as(root, "post", `/api/report-schedules/${created.body._id}/run`)).status, 202);
  await ReportSchedule.updateOne({ _id: created.body._id }, { $set: { active: false } });
  const inactive = await as(root, "post", `/api/report-schedules/${created.body._id}/run`);
  assert.equal(inactive.status, 409);
  assert.equal(inactive.body.code, "SCHEDULE_INACTIVE");
  assert.equal((await as(root, "get", `/api/report-schedules/${created.body._id}/runs`)).body.total, 0);
  assert.equal((await as(root, "get", `/api/report-schedules/${created.body._id}/runs?page=100000000000000000000`)).status, 200);
});

test("HTTP: editing a schedule keeps a queued run-now; reactivating a paused one does not run it at once", async () => {
  const { app } = await import("../app.js");
  const request = (await import("supertest")).default;
  const { createUser } = await import("./helpers/auth.js");
  const root = await createUser({ role: "super_admin" });
  const as = (method, url) => request(app)[method](url).set("Authorization", `Bearer ${root.token}`);
  const created = await as("post", "/api/report-schedules").send({ name: "Daily", godownId: "all", rangePreset: "last-7-days", cadence: "daily", time: "07:30", recipients: ["a@x.io"], format: "pdf" });
  assert.equal((await as("post", `/api/report-schedules/${created.body._id}/run`)).status, 202);
  assert.equal((await as("patch", `/api/report-schedules/${created.body._id}`).send({ expectedVersion: 1, name: "Daily renamed" })).status, 200);
  assert.equal((await runDueSchedules({ now: new Date(), mailer: fakeMailer })).ran, 1, "the queued run still happens");

  await ReportSchedule.updateOne({ _id: created.body._id }, { $set: { active: false, nextRunAt: new Date(Date.now() - 86_400_000) } });
  assert.equal((await as("patch", `/api/report-schedules/${created.body._id}`).send({ expectedVersion: 2, active: true })).status, 200);
  assert.equal((await runDueSchedules({ now: new Date(), mailer: fakeMailer })).ran, 0, "reactivation waits for the next slot");
});

test("HTTP: deleting a schedule also deletes its run history, and only its own", async () => {
  const { app } = await import("../app.js");
  const request = (await import("supertest")).default;
  const { createUser } = await import("./helpers/auth.js");
  const root = await createUser({ role: "super_admin" });
  const keep = await schedule();
  const doomed = await schedule({ name: "Doomed" });
  const run = (scheduleId) => ({ scheduleId, startedAt: NOW, finishedAt: NOW, status: "success", from: "2026-10-06", to: "2026-10-12", recipientCount: 2 });
  await ReportRun.create([run(doomed._id), run(doomed._id), run(keep._id)]);
  const res = await request(app).delete(`/api/report-schedules/${doomed._id}`).set("Authorization", `Bearer ${root.token}`);
  assert.equal(res.status, 204);
  assert.equal(await ReportSchedule.countDocuments({ _id: doomed._id }), 0);
  assert.equal(await ReportRun.countDocuments({ scheduleId: doomed._id }), 0);
  assert.equal(await ReportRun.countDocuments({ scheduleId: keep._id }), 1);
  const again = await request(app).delete(`/api/report-schedules/${doomed._id}`).set("Authorization", `Bearer ${root.token}`);
  assert.equal(again.status, 404);
});
