import { useEffect, useMemo, useState } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { clearSession, SESSION_EXPIRED_EVENT } from "./api.js";
import { AuthPage } from "./pages/AuthPage.jsx";
import { ConsumptionPage } from "./pages/ConsumptionPage.jsx";
import { GodownsPage } from "./pages/GodownsPage.jsx";
import { IndentPage } from "./pages/IndentPage.jsx";
import { InventoryPage } from "./pages/InventoryPage.jsx";
import { ModulePage } from "./pages/ModulePage.jsx";
import { PurchaseOrdersPage } from "./pages/PurchaseOrdersPage.jsx";
import { ReportsPage } from "./pages/ReportsPage.jsx";
import { RequestsPage } from "./pages/RequestsPage.jsx";
import { StockDistributionPage } from "./pages/StockDistributionPage.jsx";
import { TransferStockPage } from "./pages/TransferStockPage.jsx";
import { Button } from "./components/ui/index.jsx";
import ProductLedger from "./pages/ProductLedger.jsx";
import { Layout } from "./components/Layout.jsx";
import { NAV } from "./components/navItems.js";

export const App = () => {
  const [session, setSession] = useState(() => {
    const token = localStorage.getItem("accessToken");
    const role = localStorage.getItem("userRole");
    return token ? { loggedIn: true, role } : { loggedIn: false, role: null };
  });

  const routeMap = useMemo(
    () => ({
      "/inventory-info": <InventoryPage />,
      "/indent": <IndentPage />,
      "/purchase-orders": <PurchaseOrdersPage />,
      "/stock-distribution": <StockDistributionPage />,
      "/godowns": <GodownsPage />,
      "/transfer-stock": <TransferStockPage />,
      "/requests": <RequestsPage />,
      "/consumption": <ConsumptionPage />,
      "/reports": <ReportsPage />,
      "/product-ledger": <ProductLedger />
    }),
    []
  );

  const [expired, setExpired] = useState(false);

  // The API client fires this when a token can no longer be refreshed.
  useEffect(() => {
    const onExpired = () => {
      setExpired(true);
      setSession({ loggedIn: false, role: null });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const handleLogin = ({ role }) => {
    setExpired(false);
    setSession({ loggedIn: true, role });
  };

  const handleLogout = () => {
    clearSession();
    setExpired(false);
    setSession({ loggedIn: false, role: null });
  };

  // --- 1. PUBLIC ROUTES (Accessible without login) ---
  // This allows the /reset-password path to work even when session.loggedIn is false
  return (
    <Routes>
      {/* Password Reset Route - Passing 'reset' mode as a prop */}
      <Route 
        path="/reset-password" 
        element={<AuthPage initialMode="reset" onLogin={handleLogin} />} 
      />

      {/* --- 2. PROTECTED LOGIC --- */}
      <Route
        path="*"
        element={
          !session.loggedIn ? (
            <AuthPage onLogin={handleLogin} notice={expired ? "Your session has expired. Please sign in again." : undefined} />
          ) : session.role !== "admin" ? (
            <div className="access-restricted">
              <h1>Access restricted</h1>
              <p>This web app is for admin role only. Please login with an admin account.</p>
              <Button onClick={handleLogout}>Back to sign in</Button>
            </div>
          ) : (
            <Layout onLogout={handleLogout}>
              <Routes>
                {NAV.map(({ label, path }) => (
                  <Route key={path} path={path} element={routeMap[path] || <ModulePage title={label} />} />
                ))}
                {/* Default redirect for logged-in admins */}
                <Route path="*" element={<Navigate to="/inventory-info" replace />} />
              </Routes>
            </Layout>
          )
        }
      />
    </Routes>
  );
};
