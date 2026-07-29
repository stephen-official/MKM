

import express from "express";

import { authorize } from "../middleware/auth.js";

import {
  getLedgerGodowns,
  getProducts,
  getProductLedger,
  exportProductLedgerExcel
} from "../controllers/productLedgerController.js";


export const productLedgerRoutes =
  express.Router();


// ======================================================
// GODOWNS
// ======================================================

productLedgerRoutes.get(
  "/godowns",
  authorize(["admin"]),
  getLedgerGodowns
);


// ======================================================
// PRODUCTS
// ======================================================

productLedgerRoutes.get(
  "/products",
  authorize(["admin"]),
  getProducts
);


// ======================================================
// EXPORT
// IMPORTANT: KEEP THIS BEFORE /:productId
// ======================================================

productLedgerRoutes.get(
  "/:productId/export/excel",
  authorize(["admin"]),
  exportProductLedgerExcel
);


// ======================================================
// PRODUCT LEDGER
// ======================================================

productLedgerRoutes.get(
  "/:productId",
  authorize(["admin"]),
  getProductLedger
);