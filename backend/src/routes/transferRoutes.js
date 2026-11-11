import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { bodyItemIds, requireAvailableProducts } from "../catalog/productService.js";
import { io, notifyKitchen } from "../realtime.js";
import { stripPrices } from "../utils/kitchenSafe.js";
import { acceptTransfer, createKitchenTransfer, createTransfer, incomingTransfers, listTransfers, rejectTransfer, transferHistory } from "../modules/transfers/transferService.js";

export const transferRoutes = express.Router();

transferRoutes.get("/user-transfers/incoming", authorize(["user"]), async (req, res) => {
  res.json(await incomingTransfers(req.user));
});

transferRoutes.post("/user-transfers/:id/accept", authorize(["user"]), async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const transfer = await acceptTransfer({ transferId: req.params.id, actor: req.user, session });
      // Retain the existing notification timing inside the transaction.
      for (const id of [transfer.fromGodownId, transfer.toGodownId]) { notifyKitchen(id, "transfers"); notifyKitchen(id, "stock"); }
      io.to(transfer.fromGodownId.toString()).emit("transfer_accepted", stripPrices(transfer));
    });
    res.json({ message: "Transfer Accepted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  } finally {
    session.endSession();
  }
});

transferRoutes.get("/transfers", authorize(["admin", "user"]), async (req, res) => {
  try { res.json(await listTransfers(req.user)); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

transferRoutes.post("/transfers", authorize(["admin", "user"]), requireAvailableProducts(bodyItemIds), async (req, res) => {
  try {
    const transfer = await createTransfer({ input: req.body, actor: req.user });
    for (const id of [transfer.fromGodownId, req.body.toGodownId]) { notifyKitchen(id, "transfers"); notifyKitchen(id, "stock"); }
    io.to(req.body.toGodownId.toString()).emit("new_transfer", stripPrices(transfer));
    res.status(201).json(transfer);
  } catch (error) { res.status(error.status || 500).json({ error: error.message }); }
});

transferRoutes.post("/user-transfers/:id/reject", authorize(["user"]), async (req, res) => {
  let transfer;
  try { transfer = await rejectTransfer({ transferId: req.params.id, actor: req.user }); }
  catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    throw error;
  }
  for (const id of [transfer.fromGodownId, transfer.toGodownId]) { notifyKitchen(id, "transfers"); notifyKitchen(id, "stock"); }
  io.to(transfer.fromGodownId.toString()).emit("transfer_rejected", stripPrices(transfer));
  res.json({ message: "Rejected" });
});

transferRoutes.get("/user-transfers/history", authorize(["user"]), async (req, res) => {
  res.json(await transferHistory(req.user));
});

transferRoutes.post("/user-transfers", authorize(["user"]), requireAvailableProducts(bodyItemIds), async (req, res) => {
  let transfer;
  try { transfer = await createKitchenTransfer({ input: req.body, actor: req.user }); }
  catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    throw error;
  }
  io.to(req.body.toGodownId.toString()).emit("new_transfer", stripPrices(transfer));
  res.status(201).json(transfer);
});
