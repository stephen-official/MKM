# Phase 3 — Feature visibility (admin-web)

Read `README.md` Decision 2 ("When changes take effect") first. Depends on Phases 1–2.

Conventions in this app: shared UI primitives come from `admin-web/src/components/ui/index.jsx` (`PageHeader`, `Card`, `Button`, `Badge`, `Banner`, `EmptyState`, `DataTable`, `ConfirmDialog`, `LoadingState`, `ErrorState`, `DateField`); toasts via `useToast()` from `admin-web/src/useToast.js` (`showToast(message, "error"|"success")`); hooks/contexts live in `.js` files separate from components (the `react-refresh/only-export-components` lint rule). Icons are from `lucide-react` (verified to exist: `Gauge`, `ToggleRight`, `Users`, `CalendarClock`, `Info`, `Download`, `RotateCcw`, `ChartLine`, `FileText`).

---

### Task 13: Business-time helper, nav model, flags context, disabled-feature event

**Files:**
- Create: `admin-web/src/businessTime.js`, `admin-web/src/businessTime.test.js`
- Create: `admin-web/src/features/featureNav.js`, `admin-web/src/features/featureNav.test.js`
- Create: `admin-web/src/features/FeatureFlagsContext.js` (context + `useFeatureFlags`), `admin-web/src/features/FeatureFlagsProvider.jsx`
- Modify: `admin-web/src/components/navItems.js` (add `feature` + `section`, add `SUPER_NAV`)
- Modify: `admin-web/src/api.js` (dispatch `FEATURE_DISABLED_EVENT`)

**Interfaces:**
- Produces (`businessTime.js`): `BUSINESS_TZ = "Asia/Kolkata"`, `formatDateTime(iso) → "13/10/2026, 14:05 IST"`, `todayInBusinessTz(now = new Date()) → "YYYY-MM-DD"`, `addDays(dateStr, n) → "YYYY-MM-DD"`.
- Produces (`navItems.js`): `NAV` items `{ label, path, icon, feature, section: "Stock"|"Insights" }`; `SUPER_NAV` items `{ label, path, icon, section: "Executive" }` — Phase 3 adds Executive Report and Feature Visibility; Phase 6 appends Users and Report Schedules.
- Produces (`featureNav.js`): `buildSections({ flags, role }) → { title, items }[]`, `isPathAllowed(path, { flags, role }) → boolean`, `firstAllowedPath({ flags, role }) → string`, `disabledFeatureForPath(path, { flags, role }) → featureKey | null`.
- Produces (`FeatureFlagsContext.js`): `FeatureFlagsContext`, `useFeatureFlags() → { flags, version, status: "loading"|"ready"|"error", error, role, isSuperAdmin, isEnabled(key), refresh() }`.
- Produces (`api.js`): `FEATURE_DISABLED_EVENT = "mkm:feature-disabled"` (CustomEvent with `detail` = server payload).

- [ ] **Step 1: Failing tests**

`admin-web/src/businessTime.test.js`:

```js
import { describe, expect, it } from "vitest";
import { addDays, formatDateTime, todayInBusinessTz } from "./businessTime.js";

describe("businessTime", () => {
  it("computes today in Asia/Kolkata, not the browser zone", () => {
    expect(todayInBusinessTz(new Date("2026-10-12T19:00:00Z"))).toBe("2026-10-13"); // 00:30 IST
    expect(todayInBusinessTz(new Date("2026-10-12T18:00:00Z"))).toBe("2026-10-12"); // 23:30 IST
  });
  it("adds calendar days across month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("formats instants in IST", () => {
    expect(formatDateTime("2026-10-13T08:35:00Z")).toBe("13/10/2026, 14:05 IST");
    expect(formatDateTime(null)).toBe("—");
  });
});
```

`admin-web/src/features/featureNav.test.js`:

```js
import { describe, expect, it } from "vitest";
import { buildSections, disabledFeatureForPath, firstAllowedPath, isPathAllowed } from "./featureNav.js";

const all = { inventory: true, indent: true, "purchase-orders": true, "stock-distribution": true, godowns: true,
  "transfer-stock": true, requests: true, consumption: true, reports: true, "product-ledger": true };

describe("featureNav", () => {
  it("admins lose disabled items and never see the Executive section", () => {
    const sections = buildSections({ flags: { ...all, reports: false }, role: "admin" });
    const paths = sections.flatMap((s) => s.items.map((i) => i.path));
    expect(paths).not.toContain("/reports");
    expect(paths).not.toContain("/executive-report");
    expect(sections.map((s) => s.title)).toEqual(["Stock", "Insights"]);
  });
  it("super-admins see everything, disabled items flagged", () => {
    const sections = buildSections({ flags: { ...all, reports: false }, role: "super_admin" });
    const reports = sections.flatMap((s) => s.items).find((i) => i.path === "/reports");
    expect(reports.hiddenFromAdmins).toBe(true);
    expect(sections.at(-1).title).toBe("Executive");
    expect(sections.at(-1).items.map((i) => i.path)).toEqual(["/executive-report", "/feature-visibility"]);
  });
  it("empty sections are dropped", () => {
    const flags = { ...all, reports: false, consumption: false, requests: false, "product-ledger": false, "transfer-stock": false };
    const titles = buildSections({ flags, role: "admin" }).map((s) => s.title);
    expect(titles).toEqual(["Stock"]);
  });
  it("route checks and first allowed path", () => {
    expect(isPathAllowed("/reports", { flags: { ...all, reports: false }, role: "admin" })).toBe(false);
    expect(isPathAllowed("/feature-visibility", { flags: all, role: "admin" })).toBe(false);
    expect(isPathAllowed("/feature-visibility", { flags: all, role: "super_admin" })).toBe(true);
    expect(disabledFeatureForPath("/reports", { flags: { ...all, reports: false }, role: "admin" })).toBe("reports");
    expect(disabledFeatureForPath("/reports", { flags: { ...all, reports: false }, role: "super_admin" })).toBe(null);
    expect(firstAllowedPath({ flags: { ...all, inventory: false }, role: "admin" })).toBe("/indent");
    expect(firstAllowedPath({ flags: Object.fromEntries(Object.keys(all).map((k) => [k, false])), role: "admin" })).toBe("/no-access");
    expect(firstAllowedPath({ flags: null, role: "admin" })).toBe("/inventory-info");
  });
});
```

Run: `npm --prefix admin-web test` → FAIL (modules missing).

- [ ] **Step 2: Implement `businessTime.js`**

```js
export const BUSINESS_TZ = "Asia/Kolkata";

const dateParts = (date) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
};

export const todayInBusinessTz = (now = new Date()) => dateParts(now);

export const addDays = (dateStr, days) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().slice(0, 10);
};

export const formatDateTime = (iso) => {
  if (!iso) return "—";
  const text = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false
  }).format(new Date(iso));
  return `${text} IST`;
};
```

- [ ] **Step 3: Update `navItems.js`**

```js
import {
  ArrowLeftRight, BookOpen, Boxes, ChartColumn, ClipboardCheck, ClipboardList, Gauge, Share2, ShoppingCart, ToggleRight, Utensils, Warehouse
} from "lucide-react";

export const NAV = [
  { label: "Inventory Info", path: "/inventory-info", icon: Boxes, feature: "inventory", section: "Stock" },
  { label: "Indent", path: "/indent", icon: ClipboardList, feature: "indent", section: "Stock" },
  { label: "Purchase Orders", path: "/purchase-orders", icon: ShoppingCart, feature: "purchase-orders", section: "Stock" },
  { label: "Stock Distribution", path: "/stock-distribution", icon: Share2, feature: "stock-distribution", section: "Stock" },
  { label: "Godowns", path: "/godowns", icon: Warehouse, feature: "godowns", section: "Stock" },
  { label: "Transfer Stock", path: "/transfer-stock", icon: ArrowLeftRight, feature: "transfer-stock", section: "Stock" },
  { label: "Requests", path: "/requests", icon: ClipboardCheck, feature: "requests", section: "Insights" },
  { label: "Consumption", path: "/consumption", icon: Utensils, feature: "consumption", section: "Insights" },
  { label: "Reports", path: "/reports", icon: ChartColumn, feature: "reports", section: "Insights" },
  { label: "Product Ledger", path: "/product-ledger", icon: BookOpen, feature: "product-ledger", section: "Insights" }
];

/** Super-admin-only pages. They are not feature flags and cannot be disabled. */
export const SUPER_NAV = [
  { label: "Executive Report", path: "/executive-report", icon: Gauge, section: "Executive" },
  { label: "Feature Visibility", path: "/feature-visibility", icon: ToggleRight, section: "Executive" }
];
```

(The section split is identical to today's `NAV.slice(0, 6)` / `NAV.slice(6)`.)

- [ ] **Step 4: Implement `featureNav.js`**

```js
import { NAV, SUPER_NAV } from "../components/navItems.js";
import { isSuperAdmin } from "../roles.js";

const SECTION_ORDER = ["Stock", "Insights", "Executive"];
export const NO_ACCESS_PATH = "/no-access";

const enabled = (flags, key) => !flags || flags[key] !== false;

export const buildSections = ({ flags, role }) => {
  const superAdmin = isSuperAdmin(role);
  const items = [
    ...NAV.filter((item) => superAdmin || enabled(flags, item.feature))
      .map((item) => ({ ...item, hiddenFromAdmins: superAdmin && !enabled(flags, item.feature) })),
    ...(superAdmin ? SUPER_NAV : [])
  ];
  return SECTION_ORDER
    .map((title) => ({ title, items: items.filter((item) => item.section === title) }))
    .filter((section) => section.items.length > 0);
};

export const disabledFeatureForPath = (path, { flags, role }) => {
  if (isSuperAdmin(role)) return null;
  const item = NAV.find((n) => n.path === path);
  return item && !enabled(flags, item.feature) ? item.feature : null;
};

export const isPathAllowed = (path, { flags, role }) => {
  if (SUPER_NAV.some((n) => n.path === path)) return isSuperAdmin(role);
  return disabledFeatureForPath(path, { flags, role }) === null;
};

export const firstAllowedPath = ({ flags, role }) => {
  const first = buildSections({ flags, role }).flatMap((s) => s.items).find((item) => !item.hiddenFromAdmins);
  return first ? first.path : NO_ACCESS_PATH;
};
```

- [ ] **Step 5: Context, provider, api event**

`admin-web/src/features/FeatureFlagsContext.js`:

```js
import { createContext, useContext } from "react";

export const FeatureFlagsContext = createContext(null);

export const useFeatureFlags = () => {
  const value = useContext(FeatureFlagsContext);
  if (!value) throw new Error("useFeatureFlags must be used inside FeatureFlagsProvider");
  return value;
};
```

`admin-web/src/features/FeatureFlagsProvider.jsx`:

```jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, FEATURE_DISABLED_EVENT } from "../api.js";
import { isSuperAdmin } from "../roles.js";
import { FeatureFlagsContext } from "./FeatureFlagsContext.js";

const REFRESH_MS = 60_000;

/** Loads the caller's effective flags and keeps them fresh (focus, 60 s while visible, after FEATURE_DISABLED). */
export function FeatureFlagsProvider({ role, children }) {
  const [state, setState] = useState({ flags: null, version: 0, status: "loading", error: null });

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/features");
      setState({ flags: data.flags, version: data.version, status: "ready", error: null });
    } catch (error) {
      // Keep the last good flags; the server still enforces them.
      setState((prev) => ({ ...prev, status: prev.flags ? "ready" : "error", error: error.response?.data?.code || "NETWORK_ERROR" }));
    }
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    const onDisabled = () => refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_MS);
    window.addEventListener("focus", onFocus);
    window.addEventListener(FEATURE_DISABLED_EVENT, onDisabled);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(FEATURE_DISABLED_EVENT, onDisabled);
    };
  }, [refresh]);

  const value = useMemo(() => ({
    ...state,
    role,
    isSuperAdmin: isSuperAdmin(role),
    isEnabled: (key) => isSuperAdmin(role) || !state.flags || state.flags[key] !== false,
    refresh
  }), [state, role, refresh]);

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}
```

`admin-web/src/api.js`:
- add `export const FEATURE_DISABLED_EVENT = "mkm:feature-disabled";` next to `SESSION_EXPIRED_EVENT`.
- at the top of the response error handler, before the 401 logic:

```js
    if (response?.status === 403 && response.data?.code === "FEATURE_DISABLED") {
      window.dispatchEvent(new CustomEvent(FEATURE_DISABLED_EVENT, { detail: response.data }));
    }
```

- [ ] **Step 6: Run** — `npm --prefix admin-web test && npm --prefix admin-web run lint` → PASS.

- [ ] **Step 7: Commit**

```bash
git add admin-web/src/businessTime.js admin-web/src/businessTime.test.js admin-web/src/features admin-web/src/components/navItems.js admin-web/src/api.js
git commit -m "feat(admin-web): feature flags context, nav model and business time helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Wire flags into Layout and routing

**Files:**
- Create: `admin-web/src/features/FeatureDisabledPage.jsx`
- Modify: `admin-web/src/components/Layout.jsx` (sections from props, brand link, hidden badge)
- Modify: `admin-web/src/App.jsx` (provider, route guards, super routes, default redirect)
- Modify: `admin-web/src/styles.css` (append `.sidenav-hidden-badge`)

**Interfaces:**
- Consumes: Task 13 (`buildSections`, `isPathAllowed`, `disabledFeatureForPath`, `firstAllowedPath`, `NO_ACCESS_PATH`, `FeatureFlagsProvider`, `useFeatureFlags`).
- Produces: `Layout({ onLogout, sections, children })`; App renders `/executive-report` → `ExecutiveReportPage` (placeholder in this task, real page in Task 25) and `/feature-visibility` → `FeatureVisibilityPage` (Task 15).

- [ ] **Step 1: FeatureDisabledPage**

```jsx
import { Link } from "react-router-dom";
import { EmptyState, PageHeader } from "../components/ui/index.jsx";

export function FeatureDisabledPage({ label, homePath }) {
  return (
    <>
      <PageHeader title={label || "Unavailable"} />
      <EmptyState
        title="This feature is currently disabled."
        action={homePath ? <Link className="btn btn--ghost btn--sm" to={homePath}>Go to an available page</Link> : null}
      >
        A super-admin has turned it off for administrators. Ask them if you need access.
      </EmptyState>
    </>
  );
}
```

- [ ] **Step 2: Layout reads sections from props**

In `admin-web/src/components/Layout.jsx`:
- delete `import { NAV } from "./navItems.js";` and the `SECTIONS` constant;
- change the signature to `export const Layout = ({ onLogout, sections, children }) => {`;
- replace `SECTIONS.map(` with `sections.map(`;
- brand `<Link to="/inventory-info"` → `<Link to="/"`;
- inside the `NavLink` after the label span add:

```jsx
                    {item.hiddenFromAdmins && <span className="sidenav-hidden-badge" title="Hidden from admins">Off</span>}
```

  (rename the destructuring `({ label, path, icon: Icon })` to `(item)` and use `item.label`, `item.path`, `const Icon = item.icon;` inside, or destructure `hiddenFromAdmins` too — keep it readable.)

Append to `admin-web/src/styles.css`:

```css
/* Super-admin hint: this module is switched off for admins. */
.sidenav-hidden-badge {
  margin-left: auto;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: var(--warn-bg);
  color: var(--warn-ink);
}
.sidenav--collapsed .sidenav-hidden-badge { display: none; }
```

- [ ] **Step 3: App routing**

Restructure the logged-in branch of `admin-web/src/App.jsx`:

```jsx
import { FeatureFlagsProvider } from "./features/FeatureFlagsProvider.jsx";
import { useFeatureFlags } from "./features/FeatureFlagsContext.js";
import { FeatureDisabledPage } from "./features/FeatureDisabledPage.jsx";
import { NO_ACCESS_PATH, buildSections, disabledFeatureForPath, firstAllowedPath, isPathAllowed } from "./features/featureNav.js";
import { NAV, SUPER_NAV } from "./components/navItems.js";
import { FeatureVisibilityPage } from "./pages/FeatureVisibilityPage.jsx";
import { ExecutiveReportPage } from "./pages/ExecutiveReportPage.jsx";
```

Add a component (same file, above `App`):

```jsx
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
```

- add `"/executive-report": <ExecutiveReportPage />` and `"/feature-visibility": <FeatureVisibilityPage />` to `routeMap`;
- import `Banner` with `Button` from `./components/ui/index.jsx`;
- replace the `<Layout onLogout={handleLogout}> … </Layout>` element with:

```jsx
            <FeatureFlagsProvider key={session.role} role={session.role}>
              <AdminShell onLogout={handleLogout} routeMap={routeMap} />
            </FeatureFlagsProvider>
```

Create placeholders so the build passes until Tasks 15 and 25:

`admin-web/src/pages/ExecutiveReportPage.jsx`:

```jsx
import { PageHeader } from "../components/ui/index.jsx";
export function ExecutiveReportPage() {
  return <PageHeader title="Executive Report" subtitle="Coming in Task 25" />;
}
```

`admin-web/src/pages/FeatureVisibilityPage.jsx`:

```jsx
import { PageHeader } from "../components/ui/index.jsx";
export function FeatureVisibilityPage() {
  return <PageHeader title="Feature Visibility" subtitle="Coming in Task 15" />;
}
```

- [ ] **Step 4: Verify**

Run: `npm --prefix admin-web test && npm --prefix admin-web run lint && npm --prefix admin-web run build`
Expected: PASS / no new lint errors / build succeeds.

Manual (backend + admin-web running, dev seed):
1. As super-admin: sidebar shows Stock, Insights, Executive sections.
2. `curl -X PUT localhost:5000/api/features -H "Authorization: Bearer <super token>" -H 'Content-Type: application/json' -d '{"expectedVersion":0,"changes":{"reports":false}}'`.
3. As admin (other browser profile): within 60 s or on window focus, "Reports" disappears; visiting `/reports` shows "This feature is currently disabled."; super-admin sees an "Off" badge on Reports.
4. Disable `inventory` too: admin's `/` redirects to `/indent`.

- [ ] **Step 5: Commit**

```bash
git add admin-web/src/App.jsx admin-web/src/components/Layout.jsx admin-web/src/styles.css admin-web/src/features/FeatureDisabledPage.jsx \
  admin-web/src/pages/ExecutiveReportPage.jsx admin-web/src/pages/FeatureVisibilityPage.jsx
git commit -m "feat(admin-web): hide disabled modules and guard their routes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Feature Visibility page

**Files:**
- Create: `admin-web/src/pages/features/diff.js`, `admin-web/src/pages/features/diff.test.js`
- Create: `admin-web/src/pages/features/FeatureToggleTable.jsx`, `admin-web/src/pages/features/FeatureAuditList.jsx`
- Modify (replace placeholder): `admin-web/src/pages/FeatureVisibilityPage.jsx`
- Modify: `admin-web/src/styles.css` (append switch + route list styles)

**Interfaces:**
- Consumes: `GET /api/features/admin`, `PUT /api/features`, `GET /api/features/audit` (Task 12); `useFeatureFlags().refresh` (Task 13); `formatDateTime` (Task 13).
- Produces (`diff.js`): `applyEdits(saved, edits) → flags`, `pendingChanges(saved, edits) → { [key]: boolean }`, `pruneEdits(saved, edits) → edits`, `describeChange({ key, previous, next }, labels) → string`.

- [ ] **Step 1: Failing tests**

`admin-web/src/pages/features/diff.test.js`:

```js
import { describe, expect, it } from "vitest";
import { applyEdits, describeChange, pendingChanges, pruneEdits } from "./diff.js";

const saved = { reports: true, inventory: false };

describe("feature edit diff", () => {
  it("applies edits over saved values", () => {
    expect(applyEdits(saved, { reports: false })).toEqual({ reports: false, inventory: false });
  });
  it("only sends keys that differ from saved", () => {
    expect(pendingChanges(saved, { reports: false, inventory: false })).toEqual({ reports: false });
    expect(pendingChanges(saved, {})).toEqual({});
  });
  it("after a reload, edits equal to the new saved values are dropped", () => {
    expect(pruneEdits({ reports: false, inventory: false }, { reports: false, inventory: true })).toEqual({ inventory: true });
  });
  it("describes audit changes in words", () => {
    expect(describeChange({ key: "reports", previous: true, next: false }, { reports: "Reports" })).toBe("Reports: shown → hidden");
    expect(describeChange({ key: "x", previous: false, next: true }, {})).toBe("x: hidden → shown");
  });
});
```

Run: `npm --prefix admin-web test` → FAIL.

- [ ] **Step 2: Implement `diff.js`**

```js
export const applyEdits = (saved, edits) => ({ ...saved, ...edits });

export const pendingChanges = (saved, edits) =>
  Object.fromEntries(Object.entries(edits).filter(([key, value]) => saved[key] !== value));

export const pruneEdits = (saved, edits) => pendingChanges(saved, edits);

const word = (value) => (value ? "shown" : "hidden");
export const describeChange = ({ key, previous, next }, labels) => `${labels[key] || key}: ${word(previous)} → ${word(next)}`;
```

- [ ] **Step 3: Components**

`admin-web/src/pages/features/FeatureToggleTable.jsx`:

```jsx
import { Badge, DataTable } from "../../components/ui/index.jsx";

const RouteList = ({ title, routes }) => (routes.length ? (
  <div className="route-list">
    <p className="route-list__title">{title}</p>
    <ul>{routes.map((r) => <li key={r}><code>{r}</code></li>)}</ul>
  </div>
) : null);

export function FeatureToggleTable({ features, values, saved, disabled, onToggle }) {
  return (
    <DataTable>
      <thead>
        <tr><th scope="col">Feature</th><th scope="col">Visible to admins</th><th scope="col">Also used by</th><th scope="col">Endpoints</th></tr>
      </thead>
      <tbody>
        {features.map((feature) => {
          const on = values[feature.key] !== false;
          const dirty = saved[feature.key] !== values[feature.key];
          return (
            <tr key={feature.key}>
              <th scope="row">
                {feature.label} {dirty && <Badge variant="warn">Unsaved</Badge>}
              </th>
              <td>
                <label className="switch">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={on}
                    disabled={disabled}
                    aria-label={`${feature.label} visible to admins`}
                    onChange={(e) => onToggle(feature.key, e.target.checked)}
                  />
                  <span className="switch__track" aria-hidden="true" />
                  <span className="switch__text">{on ? "Shown" : "Hidden"}</span>
                </label>
              </td>
              <td>{feature.audiences.includes("kitchen") ? <Badge variant="info">Kitchen app (per-kitchen setting)</Badge> : "—"}</td>
              <td>
                <details>
                  <summary>{feature.routes.reads.length + feature.routes.mutations.length} admin endpoints</summary>
                  <RouteList title="Read" routes={feature.routes.reads} />
                  <RouteList title="Change" routes={feature.routes.mutations} />
                  <RouteList title="Kitchen app" routes={feature.routes.kitchen} />
                  {feature.routes.sharedWith.map((s) => (
                    <p key={s.route} className="route-list__note">
                      <code>{s.route}</code> stays available while any of {s.features.join(", ")} is shown.
                    </p>
                  ))}
                </details>
              </td>
            </tr>
          );
        })}
      </tbody>
    </DataTable>
  );
}
```

`admin-web/src/pages/features/FeatureAuditList.jsx`:

```jsx
import { Button, DataTable, EmptyState } from "../../components/ui/index.jsx";
import { formatDateTime } from "../../businessTime.js";
import { describeChange } from "./diff.js";

export function FeatureAuditList({ audit, labels, onPage }) {
  if (!audit) return null;
  if (audit.total === 0) return <EmptyState title="No changes yet">Every change to feature visibility will be listed here.</EmptyState>;
  const pages = Math.max(1, Math.ceil(audit.total / audit.pageSize));
  return (
    <>
      <DataTable>
        <thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">Scope</th><th scope="col">Changes</th></tr></thead>
        <tbody>
          {audit.items.map((row) => (
            <tr key={row._id}>
              <td>{formatDateTime(row.at)}</td>
              <td>{row.actorName || "—"}<br /><small>{row.actorEmail}</small></td>
              <td>{row.scope === "global" ? "All admins" : `${row.scope} ${row.targetId}`}</td>
              <td><ul className="plain-list">{row.changes.map((c) => <li key={c.key}>{describeChange(c, labels)}</li>)}</ul></td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      <div className="pager">
        <Button variant="ghost" size="sm" disabled={audit.page <= 1} onClick={() => onPage(audit.page - 1)}>Previous</Button>
        <span>Page {audit.page} of {pages}</span>
        <Button variant="ghost" size="sm" disabled={audit.page >= pages} onClick={() => onPage(audit.page + 1)}>Next</Button>
      </div>
    </>
  );
}
```

- [ ] **Step 4: The page**

`admin-web/src/pages/FeatureVisibilityPage.jsx`:

```jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { Banner, Button, Card, ConfirmDialog, ErrorState, LoadingState, PageHeader } from "../components/ui/index.jsx";
import { useToast } from "../useToast.js";
import { useFeatureFlags } from "../features/FeatureFlagsContext.js";
import { formatDateTime } from "../businessTime.js";
import { FeatureToggleTable } from "./features/FeatureToggleTable.jsx";
import { FeatureAuditList } from "./features/FeatureAuditList.jsx";
import { applyEdits, describeChange, pendingChanges, pruneEdits } from "./features/diff.js";

export function FeatureVisibilityPage() {
  const { showToast } = useToast();
  const { refresh: refreshContext } = useFeatureFlags();
  const [admin, setAdmin] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [edits, setEdits] = useState({});
  const [conflict, setConflict] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [audit, setAudit] = useState(null);

  const loadAdmin = useCallback(async () => {
    try {
      const { data } = await api.get("/features/admin");
      setAdmin(data);
      setEdits((prev) => pruneEdits(data.flags, prev));
      setLoadError(null);
    } catch (error) {
      setLoadError(error.response?.data?.message || "Could not load feature settings.");
    }
  }, []);

  const loadAudit = useCallback(async (page = 1) => {
    try {
      const { data } = await api.get("/features/audit", { params: { page } });
      setAudit(data);
    } catch {
      showToast("Could not load change history.", "error");
    }
  }, [showToast]);

  useEffect(() => {
    loadAdmin();
    loadAudit(1);
  }, [loadAdmin, loadAudit]);

  const labels = useMemo(() => Object.fromEntries((admin?.features || []).map((f) => [f.key, f.label])), [admin]);
  const changes = admin ? pendingChanges(admin.flags, edits) : {};
  const changeCount = Object.keys(changes).length;

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/features", { expectedVersion: admin.version, changes });
      setAdmin((prev) => ({ ...prev, flags: data.flags, version: data.version, updatedAt: data.updatedAt }));
      setEdits({});
      setConflict(null);
      showToast(`Saved ${data.changed.length} change${data.changed.length === 1 ? "" : "s"}.`, "success");
      refreshContext();
      loadAudit(1);
    } catch (error) {
      const body = error.response?.data;
      if (body?.code === "VERSION_CONFLICT") setConflict(body.currentVersion);
      else showToast(body?.message || "Could not save changes.", "error");
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  };

  if (loadError && !admin) return <ErrorState message={loadError} onRetry={loadAdmin} />;
  if (!admin) return <LoadingState label="Loading feature settings…" />;

  const summary = Object.entries(changes).map(([key, next]) => describeChange({ key, previous: admin.flags[key], next }, labels)).join("; ");

  return (
    <>
      <PageHeader
        title="Feature Visibility"
        subtitle={`Choose which modules administrators can use. Version ${admin.version}${admin.updatedAt ? ` · last changed ${formatDateTime(admin.updatedAt)}` : ""}`}
        actions={(
          <>
            <Button variant="ghost" disabled={!changeCount || saving} onClick={() => setEdits({})}>Discard</Button>
            <Button disabled={!changeCount || saving || conflict !== null} onClick={() => setConfirming(true)}>
              Save {changeCount ? `(${changeCount})` : ""}
            </Button>
          </>
        )}
      />
      <Banner variant="info">
        Changes apply to administrators within a minute (immediately on their next action). Super-admins always see every module.
        Shared reference data (stock items, kitchens, units, stock levels) stays available to the modules that depend on it.
      </Banner>
      {conflict !== null && (
        <Banner variant="warn">
          Someone else saved changes (now version {conflict}). Reload to see them — your unsaved edits are kept where they still differ.
          {" "}<Button size="sm" variant="ghost" onClick={async () => { await loadAdmin(); setConflict(null); }}>Reload</Button>
        </Banner>
      )}
      <Card>
        <FeatureToggleTable
          features={admin.features}
          saved={admin.flags}
          values={applyEdits(admin.flags, edits)}
          disabled={saving}
          onToggle={(key, value) => setEdits((prev) => ({ ...prev, [key]: value }))}
        />
      </Card>
      <h2 className="section-title">Change history</h2>
      <Card>
        <FeatureAuditList audit={audit} labels={labels} onPage={loadAudit} />
      </Card>
      {confirming && (
        <ConfirmDialog
          title="Apply feature changes?"
          message={summary}
          confirmLabel="Apply"
          busy={saving}
          onCancel={() => setConfirming(false)}
          onConfirm={save}
        />
      )}
    </>
  );
}
```

Append to `admin-web/src/styles.css`:

```css
/* Feature visibility */
.switch { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
.switch input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.switch__track { position: relative; width: 36px; height: 20px; border-radius: 999px; background: var(--border); transition: background 120ms; }
.switch__track::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--white); transition: transform 120ms; }
.switch input:checked + .switch__track { background: var(--teal-600); }
.switch input:checked + .switch__track::after { transform: translateX(16px); }
.switch input:focus-visible + .switch__track { outline: 2px solid var(--teal-600); outline-offset: 2px; }
.switch input:disabled + .switch__track { opacity: 0.5; }
.switch__text { font-size: 13px; color: var(--ink-soft); }
.route-list { margin-top: 6px; }
.route-list__title { font-size: 12px; font-weight: 650; color: var(--muted); }
.route-list ul, .plain-list { margin: 0; padding-left: 16px; }
.route-list__note { font-size: 12px; color: var(--muted); margin-top: 6px; }
.section-title { margin: 20px 0 8px; font-size: 16px; font-weight: 650; }
.pager { display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding-top: 10px; font-size: 13px; }
@media (prefers-reduced-motion: reduce) { .switch__track, .switch__track::after { transition: none; } }
```

(If `--white`, `--teal-600`, `--ink-soft`, `--muted`, `--border` are not all defined in `theme.css`, use the nearest semantic tokens that are — check with `grep -n "^  --" admin-web/src/theme.css`.)

- [ ] **Step 5: Verify**

Run: `npm --prefix admin-web test && npm --prefix admin-web run lint && npm --prefix admin-web run build` → PASS.

Manual: as super-admin toggle Reports off → Save (2-step confirm) → history row appears "Reports: shown → hidden". Open the page in a second tab, change Inventory there and save; in the first tab change Godowns and save → conflict banner; Reload → Godowns edit still pending, Inventory reflects the other tab; Save succeeds.

- [ ] **Step 6: Commit**

```bash
git add admin-web/src/pages/FeatureVisibilityPage.jsx admin-web/src/pages/features admin-web/src/styles.css
git commit -m "feat(admin-web): feature visibility page with conflict handling and history

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
