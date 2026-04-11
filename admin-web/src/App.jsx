import { useMemo, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { setAuthToken } from "./api.js";
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

import logo from "./mkmLogo.png";


const modules = ["Inventory Info", "Indent", "Purchase Orders", "Stock Distribution", "Godowns", "Transfer Stock", "Requests", "Consumption", "Reports"];

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
      "/reports": <ReportsPage />
    }),
    []
  );

  if (!session.loggedIn) return <AuthPage onLogin={({ role }) => setSession({ loggedIn: true, role })} />;

  if (session.role !== "admin") {
    return (
      <div className="auth-wrap">
        <h1>Access restricted</h1>
        <p>This web app is for admin role only. Please login with an admin account.</p>
        <button
          onClick={() => {
            setAuthToken(null);
            localStorage.removeItem("userRole");
            setSession({ loggedIn: false, role: null });
          }}
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <img src={logo} alt="Montessori Kitchen Logo" className="sidebar-logo" />
        <h2>Montessori Kitchen Management</h2>
        {modules.map((name) => {
          const to = `/${name.toLowerCase().replaceAll(" ", "-")}`;
          return (
            <NavLink key={name} to={to} className="nav-item">
              {name}
            </NavLink>
          );
        })}
        <button
          onClick={() => {
            setAuthToken(null);
            localStorage.removeItem("userRole");
            setSession({ loggedIn: false, role: null });
          }}
        >
          Logout
        </button>
      </aside>
      <main className="main">
        <Routes>
          {modules.map((name) => {
            const path = `/${name.toLowerCase().replaceAll(" ", "-")}`;
            return <Route key={name} path={path} element={routeMap[path] || <ModulePage title={name} />} />;
          })}
          <Route path="*" element={<InventoryPage />} />
        </Routes>
      </main>
    </div>
  );
};
