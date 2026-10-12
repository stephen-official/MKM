import {
  ArrowLeftRight, BookOpen, Boxes, ChartColumn, ClipboardCheck, ClipboardList, Share2, ShoppingCart, Utensils, Warehouse
} from "lucide-react";

export const NAV = [
  { label: "Inventory Info", path: "/inventory-info", icon: Boxes },
  { label: "Indent", path: "/indent", icon: ClipboardList },
  { label: "Purchase Orders", path: "/purchase-orders", icon: ShoppingCart },
  { label: "Stock Distribution", path: "/stock-distribution", icon: Share2 },
  { label: "Godowns", path: "/godowns", icon: Warehouse },
  { label: "Transfer Stock", path: "/transfer-stock", icon: ArrowLeftRight },
  { label: "Requests", path: "/requests", icon: ClipboardCheck },
  { label: "Consumption", path: "/consumption", icon: Utensils },
  { label: "Reports", path: "/reports", icon: ChartColumn },
  { label: "Product Ledger", path: "/product-ledger", icon: BookOpen }
];
