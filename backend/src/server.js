import 'dotenv/config'; 

// 2. Import dependencies
import http from "http";
import { Server } from "socket.io";
import { app } from "./app.js"; 
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { productLedgerRoutes } from "./routes/productLedgerRoutes.js";

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://mkm-user.vercel.app",
  "https://mkm-self.vercel.app"
];







// Create HTTP Server using the Express app
const server = http.createServer(app);

// Initialize Socket.io with dynamic CORS origins
const io = new Server(server, { 
  cors: { 
    origin: allowedOrigins, 
    methods: ["GET", "POST"],
    credentials: true 
  } 
});

// --- 3. SOCKET EVENT LOGIC ---

io.on("connection", (socket) => {
  // Users join a room specific to their godown for targeted inventory alerts
  socket.on("join-godown", (godownId) => {
    if (godownId) {
      socket.join(godownId);
      console.log(`📡 User joined Godown Room: ${godownId}`);
    }
  });

  // Admins join a global admin room for system-wide notifications
  socket.on("join-admin", () => {
    socket.join("admins");
    console.log("🛡️ Admin joined Admins Room");
  });

  socket.on("disconnect", () => {
    console.log("🔌 User disconnected from socket");
  });
});

// --- 4. DATABASE & SERVER START ---

connectDB()
  .then(() => {
    const PORT = env.port || 5000;
    server.listen(PORT, () => {
      console.log(`✅ DREAM Backend running on port ${PORT}`);
      console.log(`🚀 Socket.io active & CORS allowed for: ${allowedOrigins.join(", ")}`);
    });
  })
  .catch((error) => {
    console.error("❌ DB connection failed:", error);
    process.exit(1);
  });

export { io };
