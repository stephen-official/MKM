
import express from "express";
import ExcelJS from "exceljs";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { authorize } from "../middleware/auth.js";
import { Godown, StockGroup, StockItem, Unit } from "../models/InventoryModels.js";

// --- Cloudinary Configuration ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "inventory_management",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [{ width: 500, height: 500, crop: "limit" }],
  },
});

const upload = multer({ storage });
export const inventoryRoutes = express.Router();

const modelMap = {
  "stock-groups": StockGroup,
  units: Unit,
  "stock-items": StockItem,
  godowns: Godown
};

const adminOnly = authorize(["admin"]);

// --- Image Upload (Cloudinary) ---
inventoryRoutes.post("/stock-items/upload-image", adminOnly, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Image file is required" });
    return res.status(201).json({ imageUrl: req.file.path });
  } catch (error) {
    return res.status(500).json({ message: "Cloudinary upload failed", error: error.message });
  }
});

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
inventoryRoutes.get("/:type", adminOnly, async (req, res) => {
  try {
    const Model = modelMap[req.params.type];
    if (!Model) return res.status(404).json({ message: "Invalid type" });
    
    const q = req.query.q?.toString().trim();
    const filter = q ? { name: { $regex: q, $options: "i" } } : {};
    
    let query = Model.find(filter);
    if (req.params.type === "stock-items") query = query.populate("stockGroupId unitId");
    if (req.params.type === "units") query = query.populate("stockGroupId");

    const rows = await query.lean();
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// CREATE
inventoryRoutes.post("/:type", adminOnly, async (req, res) => {
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

// UPDATE
inventoryRoutes.put("/:type/:id", adminOnly, async (req, res) => {
  try {
    const Model = modelMap[req.params.type];
    if (!Model) return res.status(404).json({ message: "Invalid type" });
    
    const row = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.json(row);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// DELETE
inventoryRoutes.delete("/:type/:id", adminOnly, async (req, res) => {
  try {
    const Model = modelMap[req.params.type];
    if (!Model) return res.status(404).json({ message: "Invalid type" });
    
    await Model.findByIdAndDelete(req.params.id);
    return res.json({ message: "Deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});



