import XLSX from "xlsx-js-style";
import { getGroupName, recordDateKey } from "./helpers.js";

const FIXED_GODOWN_ORDER = ["MINDS", "INDUS BOYS", "INDUS GIRLS", "MONTE", "BAKERY", "A-Camp"];

const normalizeGodownName = (name) => {
  if (!name) return "General";
  const trimmed = String(name).trim();
  return FIXED_GODOWN_ORDER.find((g) => g.toUpperCase() === trimmed.toUpperCase()) || trimmed;
};

const getOrderedGodowns = (names) => {
  const unique = [...new Set(names.filter(Boolean).map(normalizeGodownName))];
  const isFixed = (name) => FIXED_GODOWN_ORDER.some((f) => f.toUpperCase() === name.toUpperCase());
  const fixed = FIXED_GODOWN_ORDER.filter((f) => unique.some((n) => n.toUpperCase() === f.toUpperCase()));
  return [...fixed, ...unique.filter((n) => !isFixed(n))];
};

const blankEntry = (name, group, unit, godowns) => ({
  name,
  group,
  unit,
  total: 0,
  godowns: Object.fromEntries(godowns.map((g) => [g, 0]))
});

/* One table: every inventory item (zero-filled) plus anything consumed that is not in inventory. */
const buildItemMap = (inventoryItems, records, godowns) => {
  const map = {};
  inventoryItems.forEach((item) => {
    map[String(item._id)] = blankEntry(
      item.name || "",
      item.stockGroupId?.name || item.stockGroupId?.toString?.() || "General",
      item.unitId?.symbol || item.unitId?.name || "",
      godowns
    );
  });

  records.forEach((record) => {
    const godown = normalizeGodownName(record.godownId?.name || "General");
    record.items?.forEach((item) => {
      const id = String(item.stockItemId?._id || item.stockItemId);
      const qty = Number(item.qtyBaseUnit || 0);
      if (!map[id]) {
        map[id] = blankEntry(
          item.stockItemId?.name || "",
          getGroupName(item),
          item.stockItemId?.unitId?.symbol || "",
          godowns
        );
      }
      map[id].godowns[godown] = (map[id].godowns[godown] || 0) + qty;
      map[id].total += qty;
    });
  });
  return map;
};

const pushSection = (aoa, title, itemMap, godowns) => {
  aoa.push([title], []);
  aoa.push(["S.No", "Stock Item", "Group", "Unit", ...godowns, "TOTAL"]);
  Object.values(itemMap)
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((item, index) => {
      aoa.push([
        index + 1,
        item.name,
        item.group,
        item.unit,
        ...godowns.map((g) => Number(item.godowns[g] || 0)),
        Number(item.total || 0)
      ]);
    });
  aoa.push([], []);
};

const solid = (rgb) => ({ patternType: "solid", fgColor: { rgb } });

/* Single record -> one sheet. */
export const exportRecord = (record) => {
  const rows = (record.items || []).map((item) => ({
    "Stock Item": item.stockItemId?.name || "N/A",
    "Stock Group": getGroupName(item),
    "Item ID": item.stockItemId?._id?.toUpperCase(),
    Quantity: item.qtyBaseUnit,
    Unit: item.stockItemId?.unitId?.symbol || "",
    Date: recordDateKey(record),
    Reason: record.reason || "",
    "Authorised By": record.userId?.name,
    Godown: record.godownId?.name
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Usage Report");
  XLSX.writeFile(workbook, `Usage_${record.userId?.name || "Report"}_${Date.now()}.xlsx`);
};

/* All filtered records -> consolidated section + one section per date. */
export const exportAllRecords = (records, inventoryItems, fromDate, toDate) => {
  const godowns = getOrderedGodowns(records.map((r) => r.godownId?.name || "General"));

  const byDate = {};
  records.forEach((r) => {
    const key = recordDateKey(r);
    (byDate[key] = byDate[key] || []).push(r);
  });

  const aoa = [["MONTESSORI USAGE REPORT"], []];

  let consolidatedTitle = "CONSOLIDATED";
  if (fromDate || toDate) consolidatedTitle += ` (${fromDate || ""} to ${toDate || ""})`;
  pushSection(aoa, consolidatedTitle, buildItemMap(inventoryItems, records, godowns), godowns);

  Object.keys(byDate)
    .sort((a, b) => new Date(b) - new Date(a))
    .forEach((date) => {
      pushSection(aoa, `DATE: ${date}`, buildItemMap(inventoryItems, byDate[date], godowns), godowns);
    });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const maxCols = Math.max(...aoa.map((row) => row.length));
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: maxCols - 1 } }];

  if (ws.A1) {
    ws.A1.s = {
      font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center" },
      fill: solid("1E3A8A")
    };
  }

  Object.keys(ws).forEach((cell) => {
    if (!ws[cell]) return;
    if (ws[cell].v && String(ws[cell].v).startsWith("DATE:")) {
      ws[cell].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        alignment: { horizontal: "left" },
        fill: solid("16A34A")
      };
    }
    if (ws[cell].v === "S.No") {
      const rowNo = Number(cell.match(/\d+/)[0]);
      for (let i = 0; i < maxCols; i++) {
        const ref = `${XLSX.utils.encode_col(i)}${rowNo}`;
        if (ws[ref]) {
          ws[ref].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            alignment: { horizontal: "center" },
            fill: solid("2563EB")
          };
        }
      }
    }
  });

  ws["!cols"] = [{ wch: 8 }, { wch: 28 }, { wch: 20 }, { wch: 12 }, ...godowns.map(() => ({ wch: 15 })), { wch: 15 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Usage");
  XLSX.writeFile(
    wb,
    fromDate || toDate
      ? `Usage_Report_${fromDate || "start"}_to_${toDate || "end"}.xlsx`
      : "All_Usage_Report.xlsx"
  );
};
