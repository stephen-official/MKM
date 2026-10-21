import {
  ArrowLeftRight, BookOpen, Boxes, Package, CalendarClock, ChartColumn, ClipboardCheck, ClipboardList, Gauge, Share2, ShoppingCart, ToggleRight, Users, Utensils, Warehouse, Settings
} from "lucide-react";

export const NAV = [
  { label: "Products", path: "/products", icon: Package, feature: "products", section: "Setup" },
  { label: "Inventory Setup", path: "/inventory-info", icon: Boxes, feature: "inventory", section: "Setup" },
  { label: "Purchase Planning", path: "/indent", icon: ClipboardList, feature: "indent", section: "Stock Operations" },
  { label: "Purchase Orders", path: "/purchase-orders", icon: ShoppingCart, feature: "purchase-orders", section: "Stock Operations" },
  { label: "Distribute Purchases", path: "/stock-distribution", icon: Share2, feature: "stock-distribution", section: "Stock Operations" },
  { label: "Stock Levels", path: "/godowns", icon: Warehouse, feature: "godowns", section: "Stock Operations" },
  { label: "Stock Transfers", path: "/transfer-stock", icon: ArrowLeftRight, feature: "transfer-stock", section: "Stock Operations" },
  { label: "Usage Approvals", path: "/requests", icon: ClipboardCheck, feature: "requests", section: "Usage" },
  { label: "Usage Records", path: "/consumption", icon: Utensils, feature: "consumption", section: "Usage" },
  { label: "Exports", path: "/reports", icon: ChartColumn, feature: "reports", section: "Records" },
  { label: "Product Ledger", path: "/product-ledger", icon: BookOpen, feature: "product-ledger", section: "Records" }
];

/** Super-admin-only pages. They are not feature flags and cannot be disabled. */
export const SUPER_NAV = [
  { label: "Executive Report", path: "/executive-report", icon: Gauge, section: "Executive" },
  { label: "Feature Visibility", path: "/feature-visibility", icon: ToggleRight, section: "Administration" },
  { label: "Users", path: "/users", icon: Users, section: "Administration" },
  { label: "Report Schedules", path: "/report-schedules", icon: CalendarClock, section: "Executive", hiddenFromNav: true }
];

/**
 * The sidebar is intentionally organised around workflows rather than database
 * entities. `tabs` point back to NAV/SUPER_NAV routes so feature flags and old
 * bookmarks keep their original meaning.
 */
export const WORKSPACE_NAV = [
  {
    label: "Catalog", path: "/catalog", icon: Package, section: "Workspace",
    tabs: [
      { label: "Products", slug: "products", route: "/products", feature: "products" },
      { label: "Categories & locations", slug: "setup", route: "/inventory-info", feature: "inventory" }
    ]
  },
  {
    label: "Purchasing", path: "/purchasing", icon: ShoppingCart, section: "Workspace",
    tabs: [
      { label: "Planning", slug: "planning", route: "/indent", feature: "indent" },
      { label: "Orders & receiving", slug: "orders", route: "/purchase-orders", feature: "purchase-orders" },
      { label: "Distribution", slug: "distribution", route: "/stock-distribution", feature: "stock-distribution" }
    ]
  },
  {
    label: "Stock", path: "/stock", icon: Warehouse, section: "Workspace",
    tabs: [
      { label: "Levels", slug: "levels", route: "/godowns", feature: "godowns" },
      { label: "Transfers", slug: "transfers", route: "/transfer-stock", feature: "transfer-stock" }
    ]
  },
  {
    label: "Usage", path: "/usage", icon: Utensils, section: "Workspace",
    tabs: [
      { label: "Approvals", slug: "approvals", route: "/requests", feature: "requests" },
      { label: "Records", slug: "records", route: "/consumption", feature: "consumption" }
    ]
  },
  {
    label: "Reports", path: "/records", icon: ChartColumn, section: "Workspace",
    tabs: [
      { label: "Reports & exports", slug: "reports", route: "/reports", feature: "reports" },
      { label: "Product ledger", slug: "ledger", route: "/product-ledger", feature: "product-ledger" }
    ]
  }
];

export const SUPER_WORKSPACE_NAV = [
  { label: "Executive Report", path: "/executive-report", icon: Gauge, section: "Insights" },
  {
    label: "Administration", path: "/administration", icon: Settings, section: "Manage", superOnly: true,
    tabs: [
      { label: "Users", slug: "users", route: "/users" },
      { label: "Feature visibility", slug: "features", route: "/feature-visibility" },
      { label: "Report schedules", slug: "schedules", route: "/report-schedules" }
    ]
  }
];
