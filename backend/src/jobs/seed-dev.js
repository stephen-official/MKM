// Local development seed. Refuses to run unless MONGODB_URI points at localhost.
// Catalog (godowns, stock groups, units, stock items) is loaded verbatim from
// ~/mkm-local/live-catalog.json (see export-live-catalog.js); users, stock levels
// and transactions are generated locally with dev credentials.
import "dotenv/config";
import fs from "fs";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { env } from "../config/env.js";
import {
  Consumption, Distribution, GodownStock, Indent, IndentRequest, Notification,
  PurchaseOrder, Request, Transfer
} from "../models/FlowModels.js";
import { User } from "../models/User.js";

if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(env.mongoUri)) {
  console.error("Refusing to seed: MONGODB_URI is not a local database.");
  process.exit(1);
}

const catalogPath = `${process.env.HOME}/mkm-local/live-catalog.json`;
if (!fs.existsSync(catalogPath)) {
  console.error(`Missing ${catalogPath}. Run: cd backend && node src/jobs/export-live-catalog.js`);
  process.exit(1);
}
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

const { ObjectId } = mongoose.Types;
const ID_FIELDS = ["_id", "stockGroupId", "unitId"];
const DATE_FIELDS = ["createdAt", "updatedAt"];
const revive = (doc) => {
  const out = { ...doc };
  for (const f of ID_FIELDS) if (out[f]) out[f] = new ObjectId(out[f]);
  for (const f of DATE_FIELDS) if (out[f]) out[f] = new Date(out[f]);
  if (Array.isArray(out.subUnits)) out.subUnits = out.subUnits.map((s) => ({ ...s, _id: s._id ? new ObjectId(s._id) : undefined }));
  return out;
};

const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const dateStr = (n) => daysAgo(n).toISOString().slice(0, 10);
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const run = async () => {
  await connectDB();
  await mongoose.connection.dropDatabase();
  const db = mongoose.connection.db;

  // Exact copy of the live catalog (raw insert keeps ids and absent fields as-is).
  await db.collection("godowns").insertMany(catalog.godowns.map(revive));
  await db.collection("stockgroups").insertMany(catalog.stockgroups.map(revive));
  await db.collection("units").insertMany(catalog.units.map(revive));
  await db.collection("stockitems").insertMany(catalog.stockitems.map(revive));

  const godowns = catalog.godowns.map(revive);
  const items = catalog.stockitems.map(revive);
  const real = items.filter((i) => !/test/i.test(i.name));
  const dailyUse = real.filter((i) => i.itemType === "daily_use");
  const stockLike = real.filter((i) => i.itemType !== "daily_use");
  const price = (it) => 20 + ((String(it._id).charCodeAt(23) * 7) % 180);
  const pick = (arr, n, offset = 0) => Array.from({ length: n }, (_, k) => arr[(offset + k * 3) % arr.length]);

  const hash = (p) => bcrypt.hash(p, 10);
  const admin = await User.create({ name: "Dev Admin", email: "admin@example.com", passwordHash: await hash("Admin@123"), role: "admin" });
  await User.create({ name: "Dev Super Admin", email: "superadmin@example.com", passwordHash: await hash("Super@123"), role: "super_admin" });
  const userFor = {};
  for (const gd of godowns) {
    userFor[gd._id] = await User.create({
      name: `${gd.name} User`, email: `${slug(gd.name)}@example.com`,
      passwordHash: await hash("User@123"), role: "user", godownId: gd._id
    });
  }

  // Stock levels for every godown x every item; thresholds on a slice so low-stock alerts fire.
  const stockRows = [];
  godowns.forEach((gd, gi) => {
    real.forEach((it, ii) => {
      const qty = 5 + ((ii * 13 + gi * 29) % 120);
      const threshold = ii % 7 === 0 ? 30 : 0;
      stockRows.push({ godownId: gd._id, stockItemId: it._id, qtyBaseUnit: qty, thresholdBaseUnit: threshold });
    });
  });
  await GodownStock.insertMany(stockRows);

  // Procurement flow on real items.
  const mk = (it, qty) => ({ stockItemId: it._id, orderedQty: qty, receivedQty: qty, qtyBaseUnit: qty, unitPrice: price(it), amount: qty * price(it), status: "approved" });
  const lines = pick(stockLike, 4).map((it, k) => mk(it, 40 + k * 10));
  const total = lines.reduce((s, l) => s + l.amount, 0);
  const indent = await Indent.create({ indentNo: "IND-DEV-0001", createdBy: admin._id, items: lines, totalAmount: total, status: "stock_received" });
  const po = await PurchaseOrder.create({ indentId: indent._id, items: lines, totalAmount: total, status: "distributed", receivedAt: daysAgo(3) });
  await Distribution.create({
    purchaseOrderId: po._id,
    allocations: godowns.slice(0, 2).map((gd) => ({ stockItemId: lines[0].stockItemId, godownId: gd._id, qtyBaseUnit: 20, unitPrice: lines[0].unitPrice, amount: 20 * lines[0].unitPrice })),
    leftovers: [{ stockItemId: lines[0].stockItemId, qtyBaseUnit: lines[0].qtyBaseUnit - 40 }]
  });
  const pendingItem = pick(stockLike, 1, 5)[0];
  await Indent.create({ indentNo: "IND-DEV-0002", createdBy: admin._id, items: [{ stockItemId: pendingItem._id, orderedQty: 50, qtyBaseUnit: 50, unitPrice: price(pendingItem), amount: 50 * price(pendingItem) }], totalAmount: 50 * price(pendingItem), status: "pending" });

  // Kitchen-side requests, transfer.
  const [g0, g1, g2] = godowns;
  await IndentRequest.create({ godownId: g0._id, userId: userFor[g0._id]._id, items: pick(stockLike, 2, 1).map((it) => ({ stockItemId: it._id, qtyBaseUnit: 20 })), status: "pending" });
  await IndentRequest.create({ godownId: g1._id, userId: userFor[g1._id]._id, items: pick(stockLike, 1, 2).map((it) => ({ stockItemId: it._id, qtyBaseUnit: 15, receivedQty: 15, status: "approved" })), status: "received", confirmedAt: daysAgo(2), confirmedBy: admin._id });
  await Request.create({ godownId: g0._id, userId: userFor[g0._id]._id, requestType: "usage", targetDate: dateStr(0), reason: "Weekend event, extra stock needed", items: pick(stockLike, 1, 4).map((it) => ({ stockItemId: it._id, qtyBaseUnit: 25 })), status: "pending" });
  await Request.create({ godownId: g1._id, userId: userFor[g1._id]._id, requestType: "usage", targetDate: dateStr(1), reason: "Missed yesterday's usage entry", items: pick(dailyUse, 1).map((it) => ({ stockItemId: it._id, qtyBaseUnit: 6 })), status: "approved", adminDecision: "Approved" });
  await Transfer.create({ fromGodownId: g2._id, toGodownId: g0._id, createdBy: admin._id, items: pick(stockLike, 1, 6).map((it) => ({ stockItemId: it._id, qtyBaseUnit: 10 })), status: "pending" });

  // A week of unified usage for every godown. Daily-use is a product label, not a separate log.
  for (let d = 1; d <= 7; d++) {
    for (const gd of godowns) {
      const u = userFor[gd._id];
      const used = [...pick(dailyUse, Math.min(5, dailyUse.length), d), ...pick(stockLike, 4, d)];
      await Consumption.create({ godownId: gd._id, userId: u._id, date: dateStr(d), items: used.map((it, k) => {
        const qty = 1 + ((d + k) % 5);
        return { stockItemId: it._id, qtyBaseUnit: qty, unitDisplay: "", unitPriceAtIssue: price(it), amountAtIssue: qty * price(it) };
      }) });
    }
  }

  const low = stockLike[0];
  await Notification.create({ type: "low_stock", severity: "warning", payload: { godownId: g0._id, godownName: g0.name, stockItemId: low._id, itemName: low.name, qtyBaseUnit: 3, threshold: 30 } });
  await Notification.create({ type: "low_stock", severity: "critical", payload: { godownId: g1._id, godownName: g1.name, stockItemId: low._id, itemName: low.name, qtyBaseUnit: 1, threshold: 30 } });

  console.log(`Dev seed complete: ${godowns.length} godowns, ${items.length} items, ${stockRows.length} stock rows. Super admin: superadmin@example.com / Super@123`);
  process.exit(0);
};

run().catch((e) => { console.error(e); process.exit(1); });
