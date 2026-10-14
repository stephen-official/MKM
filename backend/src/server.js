import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import { app } from "./app.js"; 
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { User } from "./models/User.js";
import { verifyAccessToken } from "./utils/tokens.js";
import { revalidateSockets, roomsFor, setIo } from "./realtime.js";

const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://localhost",
  "https://mkm-user.vercel.app",
  "https://mkm-self.vercel.app"
];
const allowedOrigins = [...new Set([...defaultOrigins, ...env.corsOrigins])];
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { 
    origin: allowedOrigins, 
    methods: ["GET", "POST"],
    credentials: true 
  } 
});
setIo(io);

io.use(async (socket, next) => {
  try {
    const header = socket.handshake.headers.authorization || "";
    const token = socket.handshake.auth?.token || (header.startsWith("Bearer ") ? header.slice(7) : null);
    if (!token) return next(new Error("Authentication required"));

    const claims = verifyAccessToken(token);
    const user = await User.findById(claims.sub).select("role godownId active");
    if (!user?.active) return next(new Error("Account is inactive"));

    socket.data.user = {
      id: String(user._id),
      role: user.role,
      godownId: user.godownId ? String(user.godownId) : null,
    };
    return next();
  } catch {
    return next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  for (const room of roomsFor(socket.data.user)) socket.join(room);
});

connectDB()
  .then(async () => {
    const PORT = env.port || 5000;
    server.listen(PORT, () => {
      console.log(`Backend running with authenticated realtime updates on port ${PORT}`);
    });
    // Access changes made on another instance reach this instance's sockets within this interval.
    setInterval(() => {
      revalidateSockets().catch((error) => console.error("[realtime] socket revalidation failed:", error.message));
    }, 30_000).unref();
    if (env.reportSchedulerEnabled) {
      const { startReportScheduler } = await import("./jobs/reportScheduler.js");
      startReportScheduler();
      console.log("Report scheduler started");
    }
  })
  .catch((error) => {
    console.error("❌ DB connection failed:", error);
    process.exit(1);
  });

export { io };
