import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { logout, setStoredRole, SESSION_EXPIRED_EVENT } from "./api.js";
import { isAdminRole, isSuperAdmin } from "./roles.js";
import { AuthPage } from "./pages/AuthPage.jsx";
import { ModulePage } from "./pages/ModulePage.jsx";
import { Banner, Button, LoadingState } from "./components/ui/index.jsx";
import { Layout } from "./components/Layout.jsx";
import { NAV, SUPER_NAV } from "./components/navItems.js";
import { WORKSPACE_NAV, SUPER_WORKSPACE_NAV } from "./components/navItems.js";
import { WorkspacePage } from "./components/WorkspacePage.jsx";
import { FeatureFlagsProvider } from "./features/FeatureFlagsProvider.jsx";
import { useFeatureFlags } from "./features/FeatureFlagsContext.js";
import { FeatureDisabledPage } from "./features/FeatureDisabledPage.jsx";
import { NO_ACCESS_PATH, buildSections, disabledFeatureForPath, firstAllowedPath, isPathAllowed } from "./features/featureNav.js";

const lazyNamed = (load, name) => lazy(() => load().then((module) => ({ default: module[name] })));
const ConsumptionPage = lazyNamed(() => import("./pages/ConsumptionPage.jsx"), "ConsumptionPage");
const GodownsPage = lazyNamed(() => import("./pages/GodownsPage.jsx"), "GodownsPage");
const PlanningPage = lazyNamed(() => import("./pages/planning/PlanningPage.jsx"), "PlanningPage");
const InventoryPage = lazyNamed(() => import("./pages/InventoryPage.jsx"), "InventoryPage");
const ProductsPage = lazyNamed(() => import("./pages/ProductsPage.jsx"), "ProductsPage");
const PurchaseOrdersPage = lazyNamed(() => import("./pages/PurchaseOrdersPage.jsx"), "PurchaseOrdersPage");
const ReportsPage = lazyNamed(() => import("./pages/ReportsPage.jsx"), "ReportsPage");
const RequestsPage = lazyNamed(() => import("./pages/RequestsPage.jsx"), "RequestsPage");
const StockDistributionPage = lazyNamed(() => import("./pages/StockDistributionPage.jsx"), "StockDistributionPage");
const TransferStockPage = lazyNamed(() => import("./pages/TransferStockPage.jsx"), "TransferStockPage");
const ProductLedger = lazy(() => import("./pages/ProductLedger.jsx"));
const FeatureVisibilityPage = lazyNamed(() => import("./pages/FeatureVisibilityPage.jsx"), "FeatureVisibilityPage");
const UsersPage = lazyNamed(() => import("./pages/UsersPage.jsx"), "UsersPage");
const ExecutiveReportPage = lazyNamed(() => import("./pages/ExecutiveReportPage.jsx"), "ExecutiveReportPage");
const ReportSchedulesPage = lazyNamed(() => import("./pages/ReportSchedulesPage.jsx"), "ReportSchedulesPage");
const SettingsPage = lazyNamed(() => import("./pages/SettingsPage.jsx"), "SettingsPage");

function AdminShell({ onLogout, routeMap }) {
  const { flags, role, status } = useFeatureFlags();
  const sections = buildSections({ flags, role });
  const home = firstAllowedPath({ flags, role });
  const guard = (path, label, element) => {
    if (disabledFeatureForPath(path, { flags, role })) return <FeatureDisabledPage label={label} homePath={home === NO_ACCESS_PATH ? null : home} />;
    if (!isPathAllowed(path, { flags, role })) return <Navigate to={home} replace />;
    return element;
  };
  // Until the flags arrive an admin's nav and routes would flash (and 403) pages that may be switched off.
  if (!isSuperAdmin(role) && status === "loading") {
    return (
      <Layout onLogout={onLogout} sections={[]}>
        <LoadingState label="Loading your workspace…" />
      </Layout>
    );
  }
  return (
    <Layout onLogout={onLogout} sections={sections}>
      {status === "error" && (
        <Banner variant="warn">Feature settings could not be loaded. Some pages may be unavailable.</Banner>
      )}
      <Suspense fallback={<LoadingState label="Loading page…" />}>
      <Routes>
        {[...WORKSPACE_NAV, ...SUPER_WORKSPACE_NAV].filter((workspace) => workspace.tabs).map((workspace) => (
          <Route
            key={workspace.path}
            path={`${workspace.path}/*`}
            element={isPathAllowed(workspace.path, { flags, role })
              ? <WorkspacePage workspace={workspace} routeMap={routeMap} />
              : <Navigate to={home} replace />}
          />
        ))}
        {[...NAV, ...SUPER_NAV].map(({ label, path }) => (
          <Route
            key={path}
            path={path}
            element={guard(
              path,
              label,
              legacyWorkspacePath(path)
                ? <Navigate to={legacyWorkspacePath(path)} replace />
                : (routeMap[path] || <ModulePage title={label} />)
            )}
          />
        ))}
        <Route path={NO_ACCESS_PATH} element={<FeatureDisabledPage label="No pages available" homePath={null} />} />
        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>
      </Suspense>
    </Layout>
  );
}

const legacyWorkspacePath = (path) => {
  const workspace = [...WORKSPACE_NAV, ...SUPER_WORKSPACE_NAV]
    .find((item) => item.tabs?.some((tab) => tab.route === path));
  const tab = workspace?.tabs.find((item) => item.route === path);
  return workspace && tab ? `${workspace.path}/${tab.slug}` : null;
};

export const App = () => {
  const [session, setSession] = useState(() => {
    const token = localStorage.getItem("accessToken");
    const role = localStorage.getItem("userRole");
    return token ? { loggedIn: true, role } : { loggedIn: false, role: null };
  });

  const routeMap = useMemo(
    () => ({
      "/products": <ProductsPage />,
      "/products/requests": <ProductsPage view="requests" />,
      "/inventory-info": <InventoryPage canManageUsers={isSuperAdmin(session.role)} />,
      "/indent": <PlanningPage superAdmin={isSuperAdmin(session.role)} />,
      "/purchase-orders": <PurchaseOrdersPage />,
      "/stock-distribution": <StockDistributionPage />,
      "/godowns": <GodownsPage canSetOpeningBalance={isSuperAdmin(session.role)} />,
      "/transfer-stock": <TransferStockPage />,
      "/requests": <RequestsPage />,
      "/consumption": <ConsumptionPage />,
      "/reports": <ReportsPage />,
      "/product-ledger": <ProductLedger />,
      "/executive-report": <ExecutiveReportPage />,
      "/feature-visibility": <FeatureVisibilityPage />,
      "/users": <UsersPage />,
      "/report-schedules": <ReportSchedulesPage />,
      "/settings": <SettingsPage />
    }),
    [session.role]
  );

  const [notice, setNotice] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  // The API client fires this when a token can no longer be refreshed.
  useEffect(() => {
    const onExpired = () => {
      setNotice("Your session has expired. Please sign in again.");
      setSession({ loggedIn: false, role: null });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const handleLogin = ({ role }) => {
    setNotice("");
    setSession({ loggedIn: true, role });
  };

  // The shell (and its flag refreshes) is unmounted while signing out, so a focus event cannot
  // surface "session expired" over the sign-out message.
  const handleLogout = async (message = "") => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setNotice(message);
      setSession({ loggedIn: false, role: null });
      setSigningOut(false);
    }
  };

  // The server's view of this account differs from the stored role: follow it.
  const handleRoleChange = (role) => {
    setStoredRole(role);
    setSession({ loggedIn: true, role });
  };

  if (signingOut) return <LoadingState label="Signing out…" />;

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
            <AuthPage onLogin={handleLogin} notice={notice || undefined} />
          ) : !isAdminRole(session.role) ? (
            <div className="access-restricted">
              <h1>Access restricted</h1>
              <p>This web app is for administrators only. Please sign in with an admin account.</p>
              <Button onClick={() => handleLogout()}>Back to sign in</Button>
            </div>
          ) : (
            <FeatureFlagsProvider
              key={session.role}
              role={session.role}
              onRoleChange={handleRoleChange}
              onSignOut={() => handleLogout("This account no longer has access to the admin console. Kitchen accounts sign in on the kitchen app.")}
            >
              <AdminShell onLogout={() => handleLogout()} routeMap={routeMap} />
            </FeatureFlagsProvider>
          )
        }
      />
    </Routes>
  );
};
