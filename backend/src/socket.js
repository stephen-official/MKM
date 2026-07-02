// // import { io } from "socket.io-client";

// // const BASE_URL =
// //   import.meta.env.VITE_API_URL?.replace("/api", "") ||
// //   "http://localhost:5000";

// // export const socket = io(BASE_URL, {
// //   withCredentials: true,
// //   transports: ["websocket"], // 🔥 IMPORTANT for Render
// // });






// import { io } from "socket.io-client";

// // Get backend base (remove /api if present)
// const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api")
//   .replace("/api", "");

// // Create socket instance
// export const socket = io(BASE_URL, {
//   withCredentials: true,
//   transports: ["websocket"], // 🔥 Required for Render (avoids polling issues)
//   autoConnect: false, // control manually
// });

// // Optional: helper functions (clean usage)
// export const connectSocket = () => {
//   if (!socket.connected) {
//     socket.connect();
//     console.log("🔌 Socket connecting to:", BASE_URL);
//   }
// };

// export const disconnectSocket = () => {
//   if (socket.connected) {
//     socket.disconnect();
//     console.log("❌ Socket disconnected");
//   }
// };




// 1-07-2026





import { io } from "socket.io-client";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://mkm-backend-xr78.onrender.com/api";

const BASE_URL = API_URL.replace(/\/api\/?$/, "");

console.log("Socket URL:", BASE_URL);

export const socket = io(BASE_URL, {
  withCredentials: true,
  transports: ["websocket", "polling"],
  autoConnect: false,
  reconnection: true,
});

export const connectSocket = () => {
  if (!socket.connected) {
    console.log("Connecting socket:", BASE_URL);
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("❌ Socket error:", err.message);
});