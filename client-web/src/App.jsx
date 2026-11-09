import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { Check, X } from "lucide-react";

import Login from "./pages/Login";
import ClientStore from "./components/ClientStore";

import { socket, connectSocket, disconnectSocket } from "./socket";
import { clearSession, isAccessTokenValid } from "./utils/session";

// Snackbars are tinted glass like the rest of the kitchen app: green = done/approved, red = failed/rejected,
// yellow = still processing, blue = plain notice. The library styles toasts inline, so the look is set here.
const toastGlass = (tint, line, accent, track = "#fff") => ({
  style: { background: tint, boxShadow: `0 0 0 1px ${line}, inset 0 1px 0 #fff, 0 14px 32px rgba(30, 52, 92, 0.14)` },
  iconTheme: { primary: accent, secondary: track },
});
// Thin line icons in a soft ring, like the rest of the app, instead of the library's solid filled badges.
const toastIcon = (Icon, accent, soft, line) => (
  <span style={{ display: "grid", placeItems: "center", flex: "none", width: 22, height: 22, borderRadius: "50%", color: accent, background: soft, boxShadow: `inset 0 0 0 1px ${line}` }}>
    <Icon size={13} strokeWidth={2} aria-hidden="true" />
  </span>
);
const TOAST_OPTIONS = {
  style: {
    maxWidth: "min(420px, calc(100vw - 32px))", padding: "10px 16px", borderRadius: "18px",
    border: "1px solid var(--glass-border)", color: "var(--ink-2)",
    fontFamily: "var(--font-kitchen)", fontSize: "14px", fontWeight: 500, lineHeight: 1.35,
    WebkitBackdropFilter: "var(--nav-glass-blur)", backdropFilter: "var(--nav-glass-blur)",
  },
  blank: toastGlass("var(--tint-cool)", "var(--btn-glass-primary-line)", "var(--blue)"),
  success: { ...toastGlass("var(--tint-green)", "var(--ok-line)", "var(--ok)"), icon: toastIcon(Check, "var(--ok)", "var(--ok-soft)", "var(--ok-line)") },
  error: { ...toastGlass("var(--tint-rose)", "var(--no-line)", "var(--no)"), icon: toastIcon(X, "var(--no)", "var(--no-soft)", "var(--no-line)") },
  loading: toastGlass("var(--tint-warm)", "var(--st-soon-line)", "var(--st-soon-fg)", "rgba(220, 190, 130, 0.35)"),
};

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  if (!isAccessTokenValid(token)) {
    clearSession();
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) return;

    try {
      if (!isAccessTokenValid(token)) {
        clearSession();
        return;
      }

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
      clearSession();
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
  <Toaster position="top-center" containerStyle={{ top: 14 }} toastOptions={TOAST_OPTIONS} />

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

</Router>
  );
}

export default App;
