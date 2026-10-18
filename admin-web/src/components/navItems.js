import {
  ArrowLeftRight, BookOpen, Boxes, Package, CalendarClock, ChartColumn, ClipboardCheck, ClipboardList, Gauge, Share2, ShoppingCart, ToggleRight, Users, Utensils, Warehouse
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
