import express from "express";
import cors from "cors";
import fs from "fs";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { authenticate } from "./middleware/auth.js";
import { authRoutes } from "./routes/authRoutes.js";
import { inventoryRoutes } from "./routes/inventoryRoutes.js";
import { operationsRoutes } from "./routes/operationsRoutes.js";
import { procurementRoutes } from "./routes/procurementRoutes.js";
import { reportRoutes } from "./routes/reportRoutes.js";
import { indentRequestRoutes } from "./routes/indentRequestRoutes.js";
import { dailyUsageRoutes } from "./routes/dailyUsageRoutes.js";
import { productLedgerRoutes } from "./routes/productLedgerRoutes.js";

const app = express();



app.set("trust proxy", 1);
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
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
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
    // Correctly identifies the user's IP behind the Render proxy
    keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip 
});



app.use("/api/auth", authLimiter, authRoutes);

// --- 5. PROTECTED ROUTES ---
// The 'authenticate' middleware ensures only logged-in users can access these modules.
app.use("/api/inventory", authenticate, inventoryRoutes);
app.use("/api/procurement", authenticate, procurementRoutes);
app.use("/api", authenticate, operationsRoutes);
app.use("/api/reports", authenticate, reportRoutes);

app.use("/api/operations", authenticate, operationsRoutes);




app.use("/api/indent-requests", authenticate, indentRequestRoutes);
app.use(
  "/api/daily-usage",
  authenticate,
  dailyUsageRoutes
);


app.use("/api/product-ledger", authenticate, productLedgerRoutes);


// --- 6. ERROR HANDLING (OPTIONAL BUT RECOMMENDED) ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
});

export { app };