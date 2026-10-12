import { Meta } from "../../components/ui/index.jsx";

import { formatQty } from "./format.js";

const TONES = { success: "var(--success)", danger: "var(--danger)", info: "var(--info)" };

export function LedgerSummary({ opening, inward, outward, current }) {
  const item = (label, value, tone) => (
    <Meta label={label} align="end">
      <span style={{ color: TONES[tone] || "var(--ink)" }}>{value}</span>
    </Meta>
  );
  return (
    <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
      {item("Opening", formatQty(opening))}
      {item("Inward", `+${formatQty(inward)}`, "success")}
      {item("Outward", `-${formatQty(outward)}`, "danger")}
      {item("Current stock", formatQty(current), "info")}
    </div>
  );
}
