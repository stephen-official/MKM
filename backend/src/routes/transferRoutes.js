import { asyncRoute, legacyErrorPolicy } from "../shared/httpErrors.js";
import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { bodyItemIds, requireAvailableProducts } from "../catalog/productService.js";
import { io, notifyKitchen } from "../realtime.js";
import { stripPrices } from "../utils/kitchenSafe.js";
import { stockTransaction } from "../shared/stockCommandHttp.js";
import { acceptTransfer, createKitchenTransfer, createTransfer, incomingTransfers, listTransfers, rejectTransfer, transferHistory } from "../modules/transfers/transferService.js";

export const transferRoutes = express.Router();

transferRoutes.get("/user-transfers/incoming", authorize(["user"]), async (req, res) => {
  res.json(await incomingTransfers(req.user));
});

transferRoutes.post("/user-transfers/:id/accept", authorize(["user"]), asyncRoute(async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const transfer = await stockTransaction(req, session, () => acceptTransfer({ transferId: req.params.id, actor: req.user, session }));
    if (!req.stockCommandReplayed) {
      for (const id of [transfer.fromGodownId, transfer.toGodownId]) { notifyKitchen(id, "transfers"); notifyKitchen(id, "stock"); }
      io.to(transfer.fromGodownId.toString()).emit("transfer_accepted", stripPrices(transfer));
    }
    res.json({ message: "Transfer Accepted" });
  } finally {
    session.endSession();
  }
}, legacyErrorPolicy({ status: 400, field: "error" })));

transferRoutes.get("/transfers", authorize(["admin", "user"]), asyncRoute(async (req, res) => {
   res.json(await listTransfers(req.user));
}, legacyErrorPolicy({ status: 500, field: "error" })));

transferRoutes.post("/transfers", authorize(["admin", "user"]), requireAvailableProducts(bodyItemIds), asyncRoute(async (req, res) => {

    const transfer = await createTransfer({ input: req.body, actor: req.user });
    for (const id of [transfer.fromGodownId, req.body.toGodownId]) { notifyKitchen(id, "transfers"); notifyKitchen(id, "stock"); }
    io.to(req.body.toGodownId.toString()).emit("new_transfer", stripPrices(transfer));
    res.status(201).json(transfer);

}, legacyErrorPolicy({ status: 500, respectStatus: true, field: "error" })));

transferRoutes.post("/user-transfers/:id/reject", authorize(["user"]), asyncRoute(async (req, res) => {
  let transfer;
   transfer = await rejectTransfer({ transferId: req.params.id, actor: req.user });
  for (const id of [transfer.fromGodownId, transfer.toGodownId]) { notifyKitchen(id, "transfers"); notifyKitchen(id, "stock"); }
  io.to(transfer.fromGodownId.toString()).emit("transfer_rejected", stripPrices(transfer));
  res.json({ message: "Rejected" });
}, legacyErrorPolicy({ respectStatus: true, unknownMessage: "Internal Server Error" })));

transferRoutes.get("/user-transfers/history", authorize(["user"]), async (req, res) => {
  res.json(await transferHistory(req.user));
});

transferRoutes.post("/user-transfers", authorize(["user"]), requireAvailableProducts(bodyItemIds), asyncRoute(async (req, res) => {
  let transfer;
   transfer = await createKitchenTransfer({ input: req.body, actor: req.user });
  io.to(req.body.toGodownId.toString()).emit("new_transfer", stripPrices(transfer));
  res.status(201).json(transfer);
}, legacyErrorPolicy({ respectStatus: true, unknownMessage: "Internal Server Error" })));
