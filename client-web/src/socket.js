// // import { io } from 'socket.io-client';

// // // Use your backend URL. 
// // // "autoConnect: false" allows us to manually connect in App.jsx only after login.
// // const URL = "http://localhost:5000"; 

// // export const socket = io(URL, {
// //   autoConnect: false,
// //   withCredentials: true
// // });




// import { io } from "socket.io-client";

// const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api")
//   .replace("/api", "");

// export const socket = io(BASE_URL, {
//   transports: ["websocket"],
//   withCredentials: true,
//   autoConnect: false,
// });

// export const connectSocket = () => {
//   if (!socket.connected) {
//     socket.connect();
//     console.log("🔌 Connected:", BASE_URL);
//   }
// };

// export const disconnectSocket = () => {
//   if (socket.connected) {
//     socket.disconnect();
//     console.log("❌ Disconnected");
//   }
// };







import { io } from "socket.io-client";

// Use ENV (same as axios)
const BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/api", "")
  : "http://localhost:5000";

// Create socket
export const socket = io(BASE_URL, {
  transports: ["websocket"], // 🔥 important for Render
  withCredentials: true,
  autoConnect: false,
});

// Connect manually
export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
    console.log("🔌 Connecting to:", BASE_URL);
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
    console.log("❌ Disconnected");
  }
};