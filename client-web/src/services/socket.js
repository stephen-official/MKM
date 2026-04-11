import { io } from "socket.io-client";

const SOCKET_URL = "http://your-api-url:5000"; // Replace with your backend URL

export const socket = io(SOCKET_URL, {
  autoConnect: false, // We connect manually after login
});

export const connectSocket = (user) => {
  if (!socket.connected) {
    socket.connect();
    
    // Join appropriate rooms based on role
    if (user.role === "admin") {
      socket.emit("join-admin");
    } else {
      socket.emit("join-godown", user.godownId);
    }
  }
};