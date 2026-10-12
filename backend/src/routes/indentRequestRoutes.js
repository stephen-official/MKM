import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { GodownStock, IndentRequest } from "../models/FlowModels.js";
import { isKitchenRole } from "../utils/roles.js";

const router = express.Router();

export const normalizePositiveItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  const merged = new Map();
  for (const item of items) {
    const stockItemId = String(item?.stockItemId || "");
    const quantity = Number(item?.qtyBaseUnit ?? item?.qty);
    if (!mongoose.isValidObjectId(stockItemId) || !Number.isFinite(quantity) || quantity <= 0) return null;
    merged.set(stockItemId, (merged.get(stockItemId) || 0) + quantity);
  }
  return [...merged.entries()].map(([stockItemId, qtyBaseUnit]) => ({ stockItemId, qtyBaseUnit }));
};

export const userOwnsRequest = (request, user) =>
  String(request.userId) === String(user.sub) && String(request.godownId) === String(user.godownId);

router.post("/", authorize(["user"]), async (req, res) => {
  try {
    const items = normalizePositiveItems(req.body.items);
    if (!items) return res.status(400).json({ message: "Add at least one item with a valid quantity" });
    const request = await IndentRequest.create({
      userId: req.user.sub,
      godownId: req.user.godownId,
      items,
      note: String(req.body.note || "").trim(),
      targetDate: req.body.targetDate || null,
    });
    return res.status(201).json(request);
  } catch (error) {
    return res.status(500).json({ message: "Supply request failed", error: error.message });
  }
});

router.get("/me", authorize(["user"]), async (req, res) => {
  try {
    const requests = await IndentRequest.find({ userId: req.user.sub, godownId: req.user.godownId })
      .populate({
        path: "items.stockItemId",
        select: "name unitId imageUrl",
        populate: { path: "unitId", select: "symbol" },
      })
      .sort({ createdAt: -1 });
    return res.json(requests);
  } catch {
    return res.status(500).json({ message: "Failed to fetch supply requests" });
  }
});

router.get("/", authorize(["admin"]), async (_req, res) => {
  try {
    const requests = await IndentRequest.find()
      .populate("userId", "name")
      .populate("godownId", "name")
      .populate({
        path: "items.stockItemId",
        select: "name unitId stockGroupId imageUrl",
        populate: { path: "unitId", select: "symbol" },
      })
      .sort({ createdAt: -1 });
    return res.json(requests);
  } catch {
    return res.status(500).json({ message: "Failed to fetch supply requests" });
  }
});

router.patch("/:id/confirm", authorize(["admin"]), async (req, res) => {
  try {
    const request = await IndentRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Supply request not found" });
    if (request.status !== "pending") return res.status(409).json({ message: "Only pending requests can be reviewed" });
    const approvedIds = new Set((req.body.items || []).map((item) => String(item.stockItemId)));
    request.items.forEach((item) => {
      item.status = approvedIds.has(String(item.stockItemId)) ? "approved" : "rejected";
      item.receivedQty = 0;
    });
    request.status = "confirmed";
    request.confirmedAt = new Date();
    request.confirmedBy = req.user.sub;
    await request.save();
    return res.json({ success: true, request });
  } catch (error) {
    return res.status(500).json({ message: "Review failed", error: error.message });
  }
});

router.patch("/:id/select-item", authorize(["admin"]), async (req, res) => {
  try {
    const request = await IndentRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Supply request not found" });
    const item = request.items.find((candidate) => String(candidate.stockItemId) === String(req.body.stockItemId));
    if (!item) return res.status(404).json({ message: "Item not found" });
    item.status = "approved";
    if (["received", "partially_received"].includes(request.status)) request.status = "confirmed";
    await request.save();
    return res.json({ success: true, item });
  } catch (error) {
    return res.status(500).json({ message: "Item update failed", error: error.message });
  }
});

router.post("/:id/receive", authorize(["user", "admin"]), async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let updatedRequest;
    await session.withTransaction(async () => {
      const request = await IndentRequest.findById(req.params.id).session(session);
      if (!request) throw Object.assign(new Error("Supply request not found"), { status: 404 });
      if (isKitchenRole(req.user.role) && !userOwnsRequest(request, req.user)) {
        throw Object.assign(new Error("You cannot receive another kitchen's delivery"), { status: 403 });
      }
      if (!["confirmed", "partially_received"].includes(request.status)) {
        throw Object.assign(new Error("This delivery is not ready to receive"), { status: 409 });
      }
      const receivedItems = normalizePositiveItems((req.body.items || []).map((item) => ({
        stockItemId: item.stockItemId,
        qtyBaseUnit: item.receivedQty,
      })));
      if (!receivedItems) throw Object.assign(new Error("Enter at least one valid received quantity"), { status: 400 });

      for (const received of receivedItems) {
        const line = request.items.find((item) => String(item.stockItemId) === String(received.stockItemId));
        if (!line || line.status !== "approved") {
          throw Object.assign(new Error("Only approved items can be received"), { status: 400 });
        }
        const remaining = Number(line.qtyBaseUnit) - Number(line.receivedQty || 0);
        if (received.qtyBaseUnit > remaining) {
          throw Object.assign(new Error("Received quantity exceeds the outstanding quantity"), { status: 400 });
        }
        line.receivedQty = Number(line.receivedQty || 0) + received.qtyBaseUnit;
        await GodownStock.findOneAndUpdate(
          { godownId: request.godownId, stockItemId: line.stockItemId },
          { $inc: { qtyBaseUnit: received.qtyBaseUnit }, $setOnInsert: { thresholdBaseUnit: 0 } },
          { upsert: true, new: true, session },
        );
      }

      const approved = request.items.filter((item) => item.status === "approved");
      const fullyReceived = approved.every((item) => Number(item.receivedQty || 0) >= Number(item.qtyBaseUnit));
      request.status = fullyReceived ? "received" : "partially_received";
      updatedRequest = await request.save({ session });
    });
    return res.json({ success: true, request: updatedRequest });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  } finally {
    await session.endSession();
  }
});

router.put("/:id", authorize(["user"]), async (req, res) => {
  try {
    const request = await IndentRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Supply request not found" });
    if (!userOwnsRequest(request, req.user)) return res.status(403).json({ message: "Forbidden" });
    if (request.status !== "pending") return res.status(409).json({ message: "Only pending requests can be edited" });
    const items = normalizePositiveItems(req.body.items);
    if (!items) return res.status(400).json({ message: "Add at least one item with a valid quantity" });
    request.items = items;
    request.note = String(req.body.note || "").trim();
    request.targetDate = req.body.targetDate || null;
    await request.save();
    return res.json({ message: "Supply request updated", request });
  } catch (error) {
    return res.status(500).json({ message: "Update failed", error: error.message });
  }
});

router.patch("/:id/reject", authorize(["admin"]), async (req, res) => {
  try {
    const request = await IndentRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Supply request not found" });
    if (!["pending", "confirmed"].includes(request.status)) {
      return res.status(409).json({ message: "This request can no longer be rejected" });
    }
    request.items.forEach((item) => { item.status = "rejected"; item.receivedQty = 0; });
    request.status = "rejected";
    await request.save();
    return res.json({ success: true, request });
  } catch (error) {
    return res.status(500).json({ message: "Rejection failed", error: error.message });
  }
});

router.delete("/:id", authorize(["user", "admin"]), async (req, res) => {
  try {
    const request = await IndentRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Supply request not found" });
    if (isKitchenRole(req.user.role) && !userOwnsRequest(request, req.user)) return res.status(403).json({ message: "Forbidden" });
    if (isKitchenRole(req.user.role) && request.status !== "pending") {
      return res.status(409).json({ message: "Only pending requests can be deleted" });
    }
    await request.deleteOne();
    return res.json({ success: true, message: "Supply request deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Delete failed", error: error.message });
  }
});

export const indentRequestRoutes = router;
