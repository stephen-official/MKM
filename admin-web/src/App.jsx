import { useEffect, useMemo, useState } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { logout, SESSION_EXPIRED_EVENT } from "./api.js";
import { isAdminRole } from "./roles.js";
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
import { Banner, Button } from "./components/ui/index.jsx";
import ProductLedger from "./pages/ProductLedger.jsx";
import { Layout } from "./components/Layout.jsx";
import { NAV, SUPER_NAV } from "./components/navItems.js";
import { FeatureFlagsProvider } from "./features/FeatureFlagsProvider.jsx";
import { useFeatureFlags } from "./features/FeatureFlagsContext.js";
import { FeatureDisabledPage } from "./features/FeatureDisabledPage.jsx";
import { NO_ACCESS_PATH, buildSections, disabledFeatureForPath, firstAllowedPath, isPathAllowed } from "./features/featureNav.js";
import { FeatureVisibilityPage } from "./pages/FeatureVisibilityPage.jsx";
import { UsersPage } from "./pages/UsersPage.jsx";
import { ExecutiveReportPage } from "./pages/ExecutiveReportPage.jsx";
import { ReportSchedulesPage } from "./pages/ReportSchedulesPage.jsx";

function AdminShell({ onLogout, routeMap }) {
  const { flags, role, status } = useFeatureFlags();
  const sections = buildSections({ flags, role });
  const home = firstAllowedPath({ flags, role });
  const guard = (path, label, element) => {
    if (disabledFeatureForPath(path, { flags, role })) return <FeatureDisabledPage label={label} homePath={home === NO_ACCESS_PATH ? null : home} />;
    if (!isPathAllowed(path, { flags, role })) return <Navigate to={home} replace />;
    return element;
  };
  return (
    <Layout onLogout={onLogout} sections={sections}>
      {status === "error" && (
        <Banner variant="warn">Feature settings could not be loaded. Some pages may be unavailable.</Banner>
      )}
      <Routes>
        {[...NAV, ...SUPER_NAV].map(({ label, path }) => (
          <Route key={path} path={path} element={guard(path, label, routeMap[path] || <ModulePage title={label} />)} />
        ))}
        <Route path={NO_ACCESS_PATH} element={<FeatureDisabledPage label="No pages available" homePath={null} />} />
        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>
    </Layout>
  );
}

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
      "/product-ledger": <ProductLedger />,
      "/executive-report": <ExecutiveReportPage />,
      "/feature-visibility": <FeatureVisibilityPage />,
      "/users": <UsersPage />,
      "/report-schedules": <ReportSchedulesPage />
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

  const handleLogout = async () => {
    await logout();
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
          ) : !isAdminRole(session.role) ? (
            <div className="access-restricted">
              <h1>Access restricted</h1>
              <p>This web app is for administrators only. Please sign in with an admin account.</p>
              <Button onClick={handleLogout}>Back to sign in</Button>
            </div>
          ) : (
            <FeatureFlagsProvider key={session.role} role={session.role}>
              <AdminShell onLogout={handleLogout} routeMap={routeMap} />
            </FeatureFlagsProvider>
          )
        }
      />
    </Routes>
  );
};
