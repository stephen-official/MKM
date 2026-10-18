import express from "express";
import ExcelJS from "exceljs";
import { authorize } from "../middleware/auth.js";
import { Godown, StockGroup, StockItem, Unit } from "../models/InventoryModels.js";
import { isAvailable } from "../catalog/completeness.js";
import { isKitchenRole } from "../utils/roles.js";

export const inventoryRoutes = express.Router();

const modelMap = {
  "stock-groups": StockGroup,
  units: Unit,
  "stock-items": StockItem,
  godowns: Godown
};

const adminOnly = authorize(["admin"]);
const adminOrUser = authorize(["admin", "user"]);

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

      let rows = await query.lean();
      if (req.params.type === "stock-items") {
        // Admin pages use this list to name past records, so they get every product (with `archived`);
        // kitchens only ever see products that are complete and not archived.
        if (isKitchenRole(req.user.role)) rows = rows.filter((row) => isAvailable(row, row.unitId));
      }
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
    
    const finalData = { ...req.body };
    
    // Auto-fill name if symbol is provided (specifically for Units)
    if (!finalData.name && finalData.symbol) finalData.name = finalData.symbol;
    if (!finalData.name) return res.status(400).json({ message: "Name is required" });

    // INTEGRATED LOGIC: If type is 'godowns', force active to true 
    // so it shows up in the Registration list automatically.
    if (type === "godowns") {
      finalData.active = true;
    }
    
    const row = await Model.create(finalData);
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

      const updateData = { ...req.body };

      const row = await Model.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

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
    if (req.params.type === "stock-groups" && await StockItem.exists({ stockGroupId: req.params.id })) {
      return res.status(409).json({ code: "GROUP_IN_USE", message: "Products still belong to this group. Move them to another group first." });
    }

    await Model.findByIdAndDelete(req.params.id);
    return res.json({ message: "Deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});







