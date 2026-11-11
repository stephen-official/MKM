import { asyncRoute, typedErrorPolicy } from "../shared/httpErrors.js";
import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { Supplier } from "../models/SupplierModel.js";

// Admin-owned supplier records (name + FSSAI licence). Kitchens never call these; they see the
// supplier through the order they receive.
export const supplierRoutes = express.Router();
const adminOnly = authorize(["admin"]);

const CODES = { 400: "INVALID_INPUT", 404: "NOT_FOUND", 409: "CONFLICT" };
const fail = (status, message, code = CODES[status]) => Object.assign(new Error(message), { status, code });
const errorPolicy = typedErrorPolicy({ fallbackMessage: "Suppliers are unavailable", useErrorCode: true, specials: [{ matches: (error) => error.code === 11000, status: 409, code: "DUPLICATE_NAME", message: "A supplier with this name already exists" }] });

const serialize = (doc) => {
  const { _id, name, fssaiLicence, phone, active, createdAt, updatedAt } = doc;
  return { _id, name, fssaiLicence, phone, active, createdAt, updatedAt };
};

/** Validates the fields present in `body`; `creating` makes name and licence mandatory. */
const readFields = (body, creating) => {
  const out = {};
  if (creating || body.name !== undefined) {
    const name = String(body.name ?? "").trim();
    if (!name) throw fail(400, "Supplier name is required");
    if (name.length > 120) throw fail(400, "Supplier name must be 120 characters or fewer");
    Object.assign(out, { name, nameKey: name.toLowerCase() });
  }
  if (creating || body.fssaiLicence !== undefined) {
    const licence = String(body.fssaiLicence ?? "").replace(/\s+/g, "");
    if (!/^\d{14}$/.test(licence)) throw fail(400, "FSSAI licence number must be 14 digits");
    out.fssaiLicence = licence;
  }
  if (body.phone !== undefined) out.phone = String(body.phone ?? "").trim().slice(0, 20);
  if (body.active !== undefined) out.active = Boolean(body.active);
  return out;
};

supplierRoutes.get("/", adminOnly, asyncRoute(async (req, res) => {

    const filter = req.query.status === "all" ? {} : { active: true };
    const rows = await Supplier.find(filter).sort({ name: 1 }).lean();
    return res.json(rows.map(serialize));

}, errorPolicy));

supplierRoutes.post("/", adminOnly, asyncRoute(async (req, res) => {

    const fields = readFields(req.body || {}, true);
    const created = await Supplier.create({ ...fields, createdBy: req.user.sub, updatedBy: req.user.sub });
    return res.status(201).json(serialize(created));

}, errorPolicy));

supplierRoutes.put("/:id", adminOnly, asyncRoute(async (req, res) => {

    if (!mongoose.isValidObjectId(req.params.id)) throw fail(404, "Supplier not found");
    const fields = readFields(req.body || {}, false);
    const updated = await Supplier.findByIdAndUpdate(req.params.id, { ...fields, updatedBy: req.user.sub }, { new: true, runValidators: true });
    if (!updated) throw fail(404, "Supplier not found");
    return res.json(serialize(updated));

}, errorPolicy));
