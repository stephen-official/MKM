// // import cors from "cors";
// // import express from "express";
// // import fs from "fs";
// // import morgan from "morgan";
// // import path from "path";
// // import { fileURLToPath } from "url";
// // import rateLimit from "express-rate-limit";
// // import { env } from "./config/env.js";
// // import { authenticate } from "./middleware/auth.js";
// // import { authRoutes } from "./routes/authRoutes.js";
// // import { inventoryRoutes } from "./routes/inventoryRoutes.js";
// // import { operationsRoutes } from "./routes/operationsRoutes.js";
// // import { procurementRoutes } from "./routes/procurementRoutes.js";
// // import { reportRoutes } from "./routes/reportRoutes.js";

// // export const app = express();
// // const __filename = fileURLToPath(import.meta.url);
// // const __dirname = path.dirname(__filename);
// // const uploadsDir = path.resolve(__dirname, "../uploads");
// // fs.mkdirSync(uploadsDir, { recursive: true });

// // app.use(express.json());
// // app.use(morgan("dev"));
// // app.use("/uploads", express.static(uploadsDir));
// // app.use(
// //   cors({
// //     origin: env.corsOrigins.length > 0 ? env.corsOrigins : true
// //   })
// // );

// // app.use("/api/auth", rateLimit({ windowMs: 10 * 60 * 1000, limit: 100 }), authRoutes);
// // app.use("/api/inventory", authenticate, inventoryRoutes);
// // app.use("/api", authenticate, procurementRoutes);
// // app.use("/api", authenticate, operationsRoutes);
// // app.use("/api/reports", authenticate, reportRoutes);

// // app.get("/api/health", (_req, res) => res.json({ ok: true }));






// import express from "express";
// import cors from "cors";
// import fs from "fs";
// import morgan from "morgan";
// import path from "path";
// import { fileURLToPath } from "url";
// import rateLimit from "express-rate-limit";
// import { env } from "./config/env.js";
// import { authenticate } from "./middleware/auth.js";
// import { authRoutes } from "./routes/authRoutes.js";
// import { inventoryRoutes } from "./routes/inventoryRoutes.js";
// import { operationsRoutes } from "./routes/operationsRoutes.js";
// import { procurementRoutes } from "./routes/procurementRoutes.js";
// import { reportRoutes } from "./routes/reportRoutes.js";

// const app = express();

// // --- 1. SETUP DIRECTORIES ---
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// const uploadsDir = path.resolve(__dirname, "../uploads");
// if (!fs.existsSync(uploadsDir)) {
//     fs.mkdirSync(uploadsDir, { recursive: true });
// }

// // --- 2. SECURITY & CORS (MUST BE FIRST) ---
// // This ensures every request gets the 'Access-Control-Allow-Origin' header immediately
// // --- 2. SECURITY & CORS (MUST BE FIRST) ---
// app.use(
//   cors({
//     origin: ["http://localhost:5174", "http://localhost:5173"],
//     credentials: true, // Keep this
//     methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"]
//   })
// );

// // --- 3. STANDARD MIDDLEWARE ---
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(morgan("dev"));
// app.use("/uploads", express.static(uploadsDir));

// // --- 4. PUBLIC ROUTES ---
// app.get("/api/health", (_req, res) => res.json({ ok: true }));
// app.use("/api/auth", rateLimit({ windowMs: 10 * 60 * 1000, limit: 100 }), authRoutes);

// // --- 5. PROTECTED ROUTES ---
// // NOTE: If your Client-Web isn't sending a Token yet, 
// // you might need to temporarily remove 'authenticate' to see the data.
// app.use("/api/inventory", authenticate, inventoryRoutes);
// app.use("/api", authenticate, procurementRoutes);
// app.use("/api", authenticate, operationsRoutes);
// app.use("/api/reports", authenticate, reportRoutes);

// export { app };






// 4





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

const app = express();

// --- 1. SETUP DIRECTORIES ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// --- 2. SECURITY & CORS (MUST BE FIRST) ---
// This ensures every request gets the 'Access-Control-Allow-Origin' header immediately.
// credentials: true is required for Socket.io and Auth cookies.
app.use(cors({
  // Must match your Vite ports exactly
  origin: ["http://localhost:5173", "http://localhost:5174"], 
  credentials: true, // Required to match the frontend 'withCredentials: true'
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
}));

// --- 3. STANDARD MIDDLEWARE ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/uploads", express.static(uploadsDir));

// --- 4. PUBLIC ROUTES ---
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Rate limiting for auth routes to prevent brute force
const authLimiter = rateLimit({ 
    windowMs: 10 * 60 * 1000, 
    limit: 100 
});
app.use("/api/auth", authLimiter, authRoutes);

// --- 5. PROTECTED ROUTES ---
// The 'authenticate' middleware ensures only logged-in users can access these modules.
app.use("/api/inventory", authenticate, inventoryRoutes);
app.use("/api", authenticate, procurementRoutes);
app.use("/api", authenticate, operationsRoutes);
app.use("/api/reports", authenticate, reportRoutes);

// --- 6. ERROR HANDLING (OPTIONAL BUT RECOMMENDED) ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
});

export { app };