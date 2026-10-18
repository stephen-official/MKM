import { io } from "socket.io-client";

const SOCKET_URL = (
  import.meta.env.VITE_API_URL ||
  "https://mkm-backend-sng.onrender.com/api"
).replace("/api", "");

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ["websocket", "polling"],
});

export const connectSocket = () => {
  const token = localStorage.getItem("token");
  if (!token) return;

  socket.auth = { token };
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  socket.disconnect();
};
