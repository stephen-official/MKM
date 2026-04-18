// import { io } from "socket.io-client";

// const BASE_URL =
//   import.meta.env.VITE_API_URL?.replace("/api", "") ||
//   "http://localhost:5000";

// export const socket = io(BASE_URL, {
//   withCredentials: true,
//   transports: ["websocket"], // 🔥 IMPORTANT for Render
// });






import { io } from "socket.io-client";

// Get backend base (remove /api if present)
const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api")
  .replace("/api", "");

// Create socket instance
export const socket = io(BASE_URL, {
  withCredentials: true,
  transports: ["websocket"], // 🔥 Required for Render (avoids polling issues)
  autoConnect: false, // control manually
});

// Optional: helper functions (clean usage)
export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
    console.log("🔌 Socket connecting to:", BASE_URL);
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
    console.log("❌ Socket disconnected");
  }
};