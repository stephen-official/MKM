import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { jwtDecode } from "jwt-decode";

import Login from "./pages/Login";
import ClientStore from "./components/ClientStore";

import { socket, connectSocket, disconnectSocket } from "./socket";
import RefreshButton from "./components/RefreshButton";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
};

function App() {
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) return;

    try {
      jwtDecode(token);

      // Connect socket
      connectSocket();

      socket.on("connect", () => {
        console.log("✅ Socket Connected:", socket.id);
      });

      socket.on("connect_error", (err) => {
        console.error("❌ Socket Error:", err.message);
      });

      socket.on("disconnect", () => {
        console.log("❌ Socket Disconnected");
      });

      socket.on("low_stock_alert", (data) => {
        toast.error(data.payload?.message || "Low Stock Alert!");
      });

      socket.on("request_approved", () => {
        toast.success("Inventory request approved!");
      });

      socket.on("request_rejected", () => {
        toast.error("Inventory request rejected!");
      });

    } catch (err) {
      console.error(err);
      localStorage.removeItem("token");
    }

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("disconnect");
      socket.off("low_stock_alert");
      socket.off("request_approved");
      socket.off("request_rejected");
      disconnectSocket();
    };
  }, []);

  return (
     <Router>
  <Toaster
    position="top-center"
    toastOptions={{
      style: {
        fontFamily: 'sans-serif',
        fontSize: '14px',
      }
    }}
  />

  <Routes>
    <Route path="/login" element={<Login />} />

    <Route
      path="/"
      element={
        <ProtectedRoute>
          <ClientStore />
        </ProtectedRoute>
      }
    />

    <Route path="*" element={<Navigate to="/" />} />
  </Routes>

  <RefreshButton />

</Router>
  );
}

export default App;
