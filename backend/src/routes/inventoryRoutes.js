import express from "express";
import ExcelJS from "exceljs";
import { authorize } from "../middleware/auth.js";
import { Godown, StockGroup, StockItem, Unit } from "../models/InventoryModels.js";
import { Consumption, Distribution, GodownStock, IndentRequest, Request, Transfer } from "../models/FlowModels.js";
import { CollaborativePurchaseOrder } from "../models/CollaborativePurchaseOrderModel.js";
import { DeliveryTicket } from "../models/DeliveryTicketModel.js";
import { NoUsageDay } from "../models/NoUsageDayModel.js";
import { OpeningBalance } from "../models/OpeningBalanceModel.js";
import { ProductRequest } from "../models/ProductRequestModel.js";
import { StockBatch } from "../models/StockBatchModel.js";
import { UsageCorrection } from "../models/UsageCorrectionModel.js";
import { User } from "../models/User.js";
import { isAvailable } from "../catalog/completeness.js";
import { isOfferedSymbol } from "../catalog/units.js";
import { ensureOtherGroup, isOtherGroup, sortGroups } from "../catalog/groups.js";
import { isKitchenRole } from "../utils/roles.js";
import mongoose from "mongoose";
import multer from "multer";
import { storePhoto } from "../stock/photoStorage.js";
import { notifyKitchens } from "../realtime.js";

export const inventoryRoutes = express.Router();

const modelMap = {
  "stock-groups": StockGroup,
  units: Unit,
  "stock-items": StockItem,
  godowns: Godown
};

const adminOnly = authorize(["admin"]);
const adminOrUser = authorize(["admin", "user"]);

/**
 * Everything that can point at a godown. A godown with any of these cannot be deleted: the records would be left
 * pointing at nothing (a kitchen user with no kitchen, stock rows and usage with no owner). Plain words for the admin.
 */
const GODOWN_USES = [
  ["users", User, (id) => ({ godownId: id })],
  ["stock", GodownStock, (id) => ({ godownId: id })],
  ["stock batches", StockBatch, (id) => ({ godownId: id })],
  ["opening balances", OpeningBalance, (id) => ({ godownId: id })],
  ["usage records", Consumption, (id) => ({ godownId: id })],
  ["no-usage days", NoUsageDay, (id) => ({ godownId: id })],
  ["usage corrections", UsageCorrection, (id) => ({ godownId: id })],
  ["usage requests", Request, (id) => ({ godownId: id })],
  ["transfers", Transfer, (id) => ({ $or: [{ fromGodownId: id }, { toGodownId: id }] })],
  ["distributions", Distribution, (id) => ({ "allocations.godownId": id })],
  ["supply requests", IndentRequest, (id) => ({ godownId: id })],
  ["orders", CollaborativePurchaseOrder, (id) => ({ $or: [{ createdByGodown: id }, { "contributions.godownId": id }] })],
  ["delivery tickets", DeliveryTicket, (id) => ({ godownId: id })],
  ["product requests", ProductRequest, (id) => ({ godownId: id })],
];
// Master data › Kitchens: the fields a kitchen's form may set (anything else in the body is ignored). Null = a bad value.
const godownFields = (body = {}) => {
  const out = {};
  if (body.name !== undefined) out.name = String(body.name).trim();
  if (body.address !== undefined) out.address = String(body.address).trim().slice(0, 200);
  if (body.inChargeName !== undefined) out.inChargeName = String(body.inChargeName).trim().slice(0, 80);
  if (body.phone !== undefined) {
    const digits = String(body.phone).replace(/\D/g, "");
    if (digits && (digits.length < 6 || digits.length > 15)) return null;
    out.phone = digits;
  }
  if (body.isCentralStore !== undefined) out.isCentralStore = body.isCentralStore === true;
  return out;
};
const BAD_GODOWN = { code: "INVALID_INPUT", message: "Enter the kitchen phone as digits, e.g. 9876543210 or 08518234567." };
// Only one place is the central store: marking one clears the mark on the others.
const keepOneCentralStore = async (row) => {
  if (row?.isCentralStore) await Godown.updateMany({ _id: { $ne: row._id }, isCentralStore: true }, { $set: { isCentralStore: false } });
};

// Master data › Kitchens: a kitchen's logo, stored like product photos (Cloudinary, or the uploads folder locally).
const logoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
inventoryRoutes.post("/godowns/:id/logo", adminOnly, logoUpload.single("logo"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !(await Godown.exists({ _id: req.params.id }))) return res.status(404).json({ code: "NOT_FOUND", message: "Kitchen not found." });
    if (!req.file) return res.status(400).json({ code: "LOGO_REQUIRED", message: "Choose a picture for the logo." });
    const logoUrl = await storePhoto({ buffer: req.file.buffer, mimetype: req.file.mimetype, folder: "kitchen-logos", baseUrl: `${req.protocol}://${req.get("host")}` });
    const kitchen = await Godown.findByIdAndUpdate(req.params.id, { $set: { logoUrl } }, { new: true }).lean();
    notifyKitchens("stock");
    return res.json(kitchen);
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ code: error.code || "INVALID_INPUT", message: error.message });
    return res.status(500).json({ code: "SERVER_ERROR", message: "The logo could not be saved." });
  }
});
inventoryRoutes.delete("/godowns/:id/logo", adminOnly, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ code: "NOT_FOUND", message: "Kitchen not found." });
  const kitchen = await Godown.findByIdAndUpdate(req.params.id, { $set: { logoUrl: "" } }, { new: true }).lean();
  if (!kitchen) return res.status(404).json({ code: "NOT_FOUND", message: "Kitchen not found." });
  return res.json(kitchen);
});

/** The names of the record kinds that still point at this godown, in GODOWN_USES order. */
export const godownUses = async (id) => {
  const hits = await Promise.all(GODOWN_USES.map(async ([label, Model, filter]) => ((await Model.exists(filter(id))) ? label : null)));
  return hits.filter(Boolean);
};

/** Products are managed on the products page (price rules live there) and units are fixed presets. */
const refuseCatalogWrites = (req, res, next) => {
  if (req.params.type === "stock-items") {
    return res.status(410).json({ code: "USE_PRODUCTS_PAGE", message: "Products are added and edited on the Products page." });
  }
  if (req.params.type === "units") {
    return res.status(409).json({ code: "UNITS_ARE_PRESETS", message: "Units are a fixed preset list and cannot be changed here." });
  }
  return next();
};



// --- Excel Export ---
inventoryRoutes.get("/:type/export/excel", adminOnly, async (req, res) => {
  try {
    const Model = modelMap[req.params.type];
    if (!Model) return res.status(404).json({ message: "Invalid type" });

    let query = Model.find();
    if (req.params.type === "stock-items") query = query.populate("stockGroupId unitId");
    if (req.params.type === "units") query = query.populate("stockGroupId");
    
    const rows = await query.lean();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(req.params.type);

    if (rows.length > 0) {
      const headers = Object.keys(rows[0]).filter(k => k !== "__v" && k !== "_id");
      sheet.columns = headers.map((k) => ({ header: k.toUpperCase(), key: k, width: 25 }));
      
      rows.forEach((row) => {
        const flatRow = { ...row };
        // Flatten populated fields for the Excel sheet
        if (row.stockGroupId?.name) flatRow.stockGroupId = row.stockGroupId.name;
        if (row.unitId?.name) flatRow.unitId = row.unitId.name;
        sheet.addRow(flatRow);
      });
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${req.params.type}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.status(200).end(); 
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Generic CRUD Operations ---

// GET List
inventoryRoutes.get("/:type", async (req, res) => {
  try {
    const Model = modelMap[req.params.type];
    if (!Model) return res.status(404).json({ message: "Invalid type" });

    // 🔥 IMPORTANT LOGIC
  const type = req.params.type;

// Allow users to view stock-items and godowns
const middleware =
  ["stock-items", "godowns", "stock-groups", "units"].includes(type)
    ? adminOrUser
    : adminOnly;

    middleware(req, res, async () => {
      const q = req.query.q?.toString().trim();
      const filter = q ? { name: { $regex: q, $options: "i" } } : {};

      let query = Model.find(filter);

      if (req.params.type === "stock-items")
        query = query.populate("stockGroupId unitId");

      if (req.params.type === "units")
        query = query.populate("stockGroupId");

      if (req.params.type === "stock-groups") await ensureOtherGroup();
      let rows = await query.lean();
      if (req.params.type === "stock-groups") rows = sortGroups(rows);
      // Admins see how many products (archived ones too) each group holds: the product form offers delete only on an empty group.
      if (req.params.type === "stock-groups" && !isKitchenRole(req.user.role)) {
        const counts = new Map((await StockItem.aggregate([{ $group: { _id: "$stockGroupId", n: { $sum: 1 } } }])).map((c) => [String(c._id), c.n]));
        rows = rows.map((row) => ({ ...row, productCount: counts.get(String(row._id)) || 0 }));
      }
      if (req.params.type === "stock-items") {
        // Admin pages use this list to name past records, so they get every product (with `archived`);
        // kitchens only ever see products that are complete and not archived.
        if (isKitchenRole(req.user.role)) rows = rows.filter((row) => isAvailable(row, row.unitId));
      }
      // Kitchens get only the units products may use (built-in and added in Settings), not old leftover ones.
      if (req.params.type === "units" && isKitchenRole(req.user.role)) rows = rows.filter((row) => isOfferedSymbol(row.symbol));
      return res.json(rows);
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// CREATE
inventoryRoutes.post("/:type", adminOnly, refuseCatalogWrites, async (req, res) => {
  try {
    const type = req.params.type;
    const Model = modelMap[type];
    if (!Model) return res.status(404).json({ message: "Invalid type" });
    
    let finalData = { ...req.body };
    if (type === "godowns") {
      finalData = godownFields(req.body);
      if (!finalData) return res.status(400).json(BAD_GODOWN);
    }
    
    // Auto-fill name if symbol is provided (specifically for Units)
    if (!finalData.name && finalData.symbol) finalData.name = finalData.symbol;
    if (!finalData.name) return res.status(400).json({ message: "Name is required" });

    // INTEGRATED LOGIC: If type is 'godowns', force active to true 
    // so it shows up in the Registration list automatically.
    if (type === "godowns") {
      finalData.active = true;
    }
    
    const row = await Model.create(finalData);
    if (type === "godowns") await keepOneCentralStore(row);
    return res.status(201).json(row);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});
inventoryRoutes.put(
  "/:type/:id",
  adminOnly,
  refuseCatalogWrites,
  async (req, res) => {
    try {
      const type = req.params.type;
      const Model = modelMap[type];
      if (!Model) return res.status(404).json({ message: "Invalid type" });

      let updateData = { ...req.body };
      if (type === "godowns") {
        updateData = godownFields(req.body);
        if (!updateData) return res.status(400).json(BAD_GODOWN);
        if (updateData.name === "") return res.status(400).json({ code: "INVALID_INPUT", message: "Name is required" });
      }
      if (type === "stock-groups") {
        const current = await Model.findById(req.params.id).lean();
        if (current && isOtherGroup(current.name)) return res.status(409).json({ code: "GROUP_BUILT_IN", message: "“Other” is built in and keeps its name." });
        if (isOtherGroup(updateData.name)) return res.status(409).json({ code: "GROUP_BUILT_IN", message: "“Other” is already there as a built-in group." });
      }

      const row = await Model.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );
      if (type === "godowns") await keepOneCentralStore(row);

      return res.json(row);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);





// DELETE
inventoryRoutes.delete("/:type/:id", adminOnly, refuseCatalogWrites, async (req, res) => {
  try {
    const Model = modelMap[req.params.type];
    if (!Model) return res.status(404).json({ message: "Invalid type" });
    if (req.params.type === "stock-groups") {
      const current = await StockGroup.findById(req.params.id).lean();
      if (current && isOtherGroup(current.name)) return res.status(409).json({ code: "GROUP_BUILT_IN", message: "“Other” is built in and cannot be deleted." });
    }
    if (req.params.type === "stock-groups" && await StockItem.exists({ stockGroupId: req.params.id })) {
      return res.status(409).json({ code: "GROUP_IN_USE", message: "Products still belong to this group. Move them to another group first." });
    }
    if (req.params.type === "godowns") {
      const uses = await godownUses(req.params.id);
      if (uses.length) {
        return res.status(409).json({ code: "GODOWN_IN_USE", uses, message: `This kitchen still has ${uses.join(", ")} pointing at it. It cannot be deleted while any of those exist.` });
      }
    }

    await Model.findByIdAndDelete(req.params.id);
    return res.json({ message: "Deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});







