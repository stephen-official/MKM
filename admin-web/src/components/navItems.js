import {
  ArrowLeftRight, BookOpen, Boxes, ChartColumn, ClipboardCheck, ClipboardList, Gauge, Share2, ShoppingCart, ToggleRight, Users, Utensils, Warehouse
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
  { label: "Feature Visibility", path: "/feature-visibility", icon: ToggleRight, section: "Executive" },
  { label: "Users", path: "/users", icon: Users, section: "Executive" }
];
