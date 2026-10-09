import { io } from "socket.io-client";

const SOCKET_URL = (
  import.meta.env.VITE_API_URL ||
  "https://mkm-backend-xr78.onrender.com/api"
).replace("/api", "");

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ["websocket", "polling"],
});

export const connectSocket = (user) => {
  if (!socket.connected) {
    socket.connect();
  }

  socket.once("connect", () => {
    if (user.role === "admin") {
      socket.emit("join-admin");
    } else {
      socket.emit("join-godown", user.godownId);
    }
  });
};

export const disconnectSocket = () => {
  socket.disconnect();
};