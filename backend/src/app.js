import express from "express";
// Patches Express 4 routers so a rejected async handler reaches the error handler instead of crashing the process.
import "express-async-errors";
import cors from "cors";
import fs from "fs";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { authenticate } from "./middleware/auth.js";
import { featureGate } from "./features/featureGate.js";
import { kitchenPriceFilter } from "./utils/kitchenSafe.js";
import { featureRoutes } from "./routes/featureRoutes.js";
import { authRoutes } from "./routes/authRoutes.js";
import { inventoryRoutes } from "./routes/inventoryRoutes.js";
import { operationsRoutes } from "./routes/operationsRoutes.js";
import { procurementRoutes } from "./routes/procurementRoutes.js";
import { reportRoutes } from "./routes/reportRoutes.js";
import { indentRequestRoutes } from "./routes/indentRequestRoutes.js";
import { productLedgerRoutes } from "./routes/productLedgerRoutes.js";
import { executiveRoutes } from "./routes/executiveRoutes.js";
import { userRoutes } from "./routes/userRoutes.js";
import { reportScheduleRoutes } from "./routes/reportScheduleRoutes.js";
import { productRoutes } from "./routes/productRoutes.js";
import { productRequestRoutes } from "./routes/productRequestRoutes.js";
import { collaborativePurchaseOrderRoutes } from "./routes/collaborativePurchaseOrderRoutes.js";
import { orderingSettingsRoutes } from "./routes/orderingSettingsRoutes.js";
import { supplierRoutes } from "./routes/supplierRoutes.js";
import { deliveryTicketRoutes } from "./routes/deliveryTicketRoutes.js";
import { usageDayRoutes } from "./routes/usageDayRoutes.js";
import { usageCorrectionRoutes } from "./routes/usageCorrectionRoutes.js";
import { errorResponse } from "./shared/httpErrors.js";

const app = express();



app.set("trust proxy", env.trustProxy);
// --- 1. SETUP DIRECTORIES ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}






const hardcodedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:19006",

  // Capacitor Android
  "https://localhost",

  // Vercel
  "https://mkm-user.vercel.app",
  "https://mkm-self.vercel.app"
];






const envOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : [];
const allowedOrigins = [...new Set([...hardcodedOrigins, ...envOrigins])];




app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.error(`CORS blocked for origin: ${origin}`);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    exposedHeaders: ["Content-Disposition"]
}));


app.options("*", cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));


// --- 3. STANDARD MIDDLEWARE ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));
app.use("/uploads", express.static(uploadsDir));

// --- 4. PUBLIC ROUTES ---
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Rate limiting for auth routes to prevent brute force
const authLimiter = rateLimit({ 
    windowMs: 10 * 60 * 1000, 
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    // Keyed on req.ip, which "trust proxy" (TRUST_PROXY, default 1 hop) resolves to the client address the outermost
    // trusted proxy saw. Set TRUST_PROXY to the real hop count (e.g. 2 behind a CDN plus Render) or every client
    // shares the proxy's address and one bucket. The raw
    // X-Forwarded-For header must not be the key: its leading entries are whatever the client sent.
});



export const PUBLIC_MOUNTS = [["/api/auth", authRoutes]];

// --- 5. PROTECTED ROUTES ---
// The 'authenticate' middleware ensures only logged-in users can access these modules.
// Order is significant and matches the previous app.use() calls: operationsRoutes is
// mounted at both /api and /api/operations (featureGate normalises the alias).
export const PROTECTED_MOUNTS = [
  ["/api/inventory", inventoryRoutes],
  ["/api/products", productRoutes],
  ["/api/product-requests", productRequestRoutes],
  ["/api/procurement/collaborative-purchase-orders", collaborativePurchaseOrderRoutes],
  ["/api/ordering-settings", orderingSettingsRoutes],
  ["/api/suppliers", supplierRoutes],
  ["/api/delivery-tickets", deliveryTicketRoutes],
  ["/api/usage-days", usageDayRoutes],
  ["/api/usage-corrections", usageCorrectionRoutes],
  ["/api/procurement", procurementRoutes],
  ["/api", operationsRoutes],
  ["/api/reports", reportRoutes],
  ["/api/operations", operationsRoutes],
  ["/api/indent-requests", indentRequestRoutes],
  ["/api/product-ledger", productLedgerRoutes],
  ["/api/features", featureRoutes],
  ["/api/executive", executiveRoutes],
  ["/api/users", userRoutes],
  ["/api/report-schedules", reportScheduleRoutes]
];

app.use("/api/auth", authLimiter, authRoutes);
for (const [mountPath, router] of PROTECTED_MOUNTS) app.use(mountPath, authenticate, featureGate, kitchenPriceFilter, router);


// --- 6. ERROR HANDLING ---
// Client errors raised by middleware (malformed JSON, oversized body) keep their 4xx status and message;
// anything else is logged and answered with a generic 500 so internal details never reach the client.
const EXPECTED_DB_ERRORS = new Set(["CastError", "ValidationError", "VersionError"]);
const isOperationalError = (err) => Number.isInteger(err?.status) || err?.code === 11000 || EXPECTED_DB_ERRORS.has(err?.name);

export const errorHandler = (err, _req, res, next) => {
    if (res.headersSent) return next(err);
    if (err.httpErrorOverrides !== undefined || err.stockCommandError) {
        const response = errorResponse(err, err.httpErrorOverrides);
        // Legacy policies may answer a bug with a 4xx; log by the error's origin, not just the status sent.
        if (response.status >= 500 || !isOperationalError(err)) console.error(err.stack || err);
        return response.text ? res.status(response.status).send(response.body) : res.status(response.status).json(response.body);
    }
    const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status === 500) console.error(err.stack || err);
    return res.status(status).json({ message: status === 500 ? "Internal Server Error" : err.message });
};
app.use(errorHandler);

export { app };
