import { useEffect, useState, useMemo } from "react";
import { api } from "../api.js";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import XLSX from "xlsx-js-style";
import {
  Calendar,
  Search,
  FileSpreadsheet,
  Pencil,
  Save,
  Trash2,
  X
} from "lucide-react";

export const ConsumptionPage = () => {
 const [rows, setRows] = useState([]);
const [inventoryItems, setInventoryItems] = useState([]);
const [selectedId, setSelectedId] = useState(null);
const [fromDate, setFromDate] = useState("");
const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingRecordId, setEditingRecordId] = useState(null);
const [editItems, setEditItems] = useState([]);
const [savingEdit, setSavingEdit] = useState(false);
  

  useEffect(() => {
    fetchConsumptions();
  }, []);

  const fetchConsumptions = async () => {
  try {
    const [consumptionRes, inventoryRes] = await Promise.all([
      api.get("/consumptions"),
      api.get("/inventory/stock-items")
    ]);

    setRows(consumptionRes.data);
    setInventoryItems(inventoryRes.data);

    if (consumptionRes.data.length > 0) {
      setSelectedId(consumptionRes.data[0]._id);
    }
  } catch (err) {
    console.error("Failed to fetch consumption history:", err);
  } finally {
    setLoading(false);
  }
};

  /**
   * UPDATED HELPER: Robust Stock Group Resolution
   * Checks for deep population first, then falls back to ID or 'General'
   */
  const getGroupName = (item) => {
    // 1. Standard path after deep population: item -> stockItemId -> stockGroupId -> name
    if (item.stockItemId?.stockGroupId?.name) {
      return item.stockItemId.stockGroupId.name;
    }

    // 2. Fallback if stockGroupId was only an ID (population failed)
    if (item.stockItemId?.stockGroupId && typeof item.stockItemId.stockGroupId === 'string') {
      return "ID: " + item.stockItemId.stockGroupId.slice(-4);
    }

    // 3. Last resort
    return "General";
  };



// ============================================================
// GODOWN COLUMN ORDER
// ============================================================

const FIXED_GODOWN_ORDER = [
  "MINDS",
  "INDUS BOYS",
  "INDUS GIRLS",
  "MONTE",
  "BAKERY",
  "A-Camp"
];

const normalizeGodownName = (name) => {
  if (!name) return "General";

  const normalized = String(name).trim().toUpperCase();

  const matched = FIXED_GODOWN_ORDER.find(
    g => g.toUpperCase() === normalized
  );

  return matched || String(name).trim();
};

const getOrderedGodowns = (godownNames) => {
  const uniqueGodowns = [
    ...new Set(
      godownNames
        .filter(Boolean)
        .map(normalizeGodownName)
    )
  ];

  const fixed = FIXED_GODOWN_ORDER.filter(
    fixedName =>
      uniqueGodowns.some(
        name =>
          name.toUpperCase() === fixedName.toUpperCase()
      )
  );

  const additional = uniqueGodowns.filter(
    name =>
      !FIXED_GODOWN_ORDER.some(
        fixedName =>
          fixedName.toUpperCase() === name.toUpperCase()
      )
  );

  return [...fixed, ...additional];
};




  const processedRows = useMemo(() => {
    let data = [...rows];
    data = data.filter(r => {
      const rowDate = r.date
  ? String(r.date).split("T")[0]
  : new Date(r.createdAt)
      .toISOString()
      .split("T")[0];

  if (fromDate && rowDate < fromDate) return false;
  if (toDate && rowDate > toDate) return false;

  return true;
});
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      data = data.filter(r => 
        r.userId?.name?.toLowerCase().includes(query) || 
        r.godownId?.name?.toLowerCase().includes(query)
      );
    }
    return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}, [rows, fromDate, toDate, searchQuery]);

  const activeRecord = useMemo(() => 
    processedRows.find(r => r._id === selectedId) || processedRows[0], 
  [selectedId, processedRows]);


const startEditing = (record) => {
  

  setEditingRecordId(record._id);

 setEditItems(
  (record.items || []).map(item => ({
    stockItemId:
      item.stockItemId?._id ||
      item.stockItemId,

    stockRecordId:
      item.stockRecordId || null,

    name:
      item.stockItemId?.name ||
      "Unknown Item",

    unit:
      item.stockItemId?.unitId?.symbol ||
      "",

    qtyBaseUnit:
      Number(item.qtyBaseUnit || 0)
  }))
);
};

const cancelEditing = () => {
  setEditingRecordId(null);
  setEditItems([]);
};

const updateEditQuantity = (index, value) => {
  // Allow empty field while typing
  if (value === "") {
    setEditItems(prev =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              qtyBaseUnit: ""
            }
          : item
      )
    );
    return;
  }

  // Allow only numbers with maximum 3 decimal places
  if (!/^\d*(\.\d{0,3})?$/.test(value)) {
    return;
  }

  setEditItems(prev =>
    prev.map((item, i) =>
      i === index
        ? {
            ...item,
            qtyBaseUnit: value
          }
        : item
    )
  );
};

const removeEditItem = (index) => {
  setEditItems(prev =>
    prev.filter((_, i) => i !== index)
  );
};

const saveConsumptionEdit = async () => {
  if (!activeRecord || activeRecord.recordType !== "consumption") {
    return;
  }

  if (
    editItems.some(
      item =>
        item.qtyBaseUnit === "" ||
        !Number.isFinite(Number(item.qtyBaseUnit)) ||
        Number(item.qtyBaseUnit) < 0
    )
  ) {
    alert("Please enter valid quantities.");
    return;
  }

  try {
    setSavingEdit(true);

    const res = await api.patch(
      `/consumptions/${activeRecord._id}`,
      {
        items: editItems.map(item => ({
          stockItemId: item.stockItemId,
          qtyBaseUnit: Number(Number(item.qtyBaseUnit).toFixed(3))
        }))
      }
    );

    setRows(prev =>
      prev.map(row =>
        row._id === activeRecord._id
          ? {
              ...res.data,
              recordType: "consumption"
            }
          : row
      )
    );

    setEditingRecordId(null);
    setEditItems([]);

    alert("Consumption updated successfully.");
  } catch (err) {
    console.error("Failed to update consumption:", err);

    alert(
      err.response?.data?.error ||
      "Failed to update consumption."
    );
  } finally {
    setSavingEdit(false);
  }
};


const saveDailyUsageEdit = async () => {
  if (
    !activeRecord ||
    activeRecord.recordType !== "dailyUsage"
  ) {
    return;
  }

  if (
    editItems.some(
      item =>
        item.qtyBaseUnit === "" ||
        !Number.isFinite(
          Number(item.qtyBaseUnit)
        ) ||
        Number(item.qtyBaseUnit) < 0
    )
  ) {
    alert("Please enter valid quantities.");
    return;
  }

  try {
    setSavingEdit(true);

    const res = await api.patch(
      `/daily-usage/${activeRecord._id}`,
      {
        items: editItems.map(item => ({
          stockItemId: item.stockItemId,
          qtyBaseUnit: Number(
            Number(item.qtyBaseUnit).toFixed(3)
          ),
          stockRecordId:
            item.stockRecordId || undefined
        }))
      }
    );

    setRows(prev =>
      prev.map(row =>
        row._id === activeRecord._id
          ? {
              ...res.data,
              recordType: "dailyUsage"
            }
          : row
      )
    );

    setEditingRecordId(null);
    setEditItems([]);

    alert(
      "Daily Usage updated successfully."
    );

  } catch (err) {
    console.error(
      "Failed to update Daily Usage:",
      err
    );

    alert(
      err.response?.data?.error ||
      "Failed to update Daily Usage."
    );

  } finally {
    setSavingEdit(false);
  }
};


const deleteDailyUsage = async (record) => {
  if (
    !record ||
    record.recordType !== "dailyUsage"
  ) {
    return;
  }

  if (
    !window.confirm(
      `Delete this Daily Usage record for ${
        record.userId?.name || "this user"
      }?\n\nThis will only remove the usage history. Godown stock will NOT be changed.`
    )
  ) {
    return;
  }

  try {
    await api.delete(
      `/daily-usage/${record._id}`
    );

    const remaining =
      processedRows.filter(
        row => row._id !== record._id
      );

    setRows(prev =>
      prev.filter(
        row => row._id !== record._id
      )
    );

    setEditingRecordId(null);
    setEditItems([]);

    setSelectedId(
      remaining[0]?._id || null
    );

    alert(
      "Daily Usage deleted successfully."
    );

  } catch (err) {
    console.error(
      "Failed to delete Daily Usage:",
      err
    );

    alert(
      err.response?.data?.error ||
      "Failed to delete Daily Usage."
    );
  }
};



const deleteConsumption = async (record) => {
  if (!record || record.recordType !== "consumption") {
    return;
  }

  if (
    !window.confirm(
      `Delete this consumption record for ${
        record.userId?.name || "this user"
      }?\n\nThe consumed quantity will be returned to godown stock.`
    )
  ) {
    return;
  }

  try {
    await api.delete(`/consumptions/${record._id}`);

    const remaining = processedRows.filter(
      row => row._id !== record._id
    );

    setRows(prev =>
      prev.filter(row => row._id !== record._id)
    );

    setEditingRecordId(null);
    setEditItems([]);

    setSelectedId(
      remaining[0]?._id || null
    );

    alert(
      "Consumption deleted and stock restored."
    );
  } catch (err) {
    console.error("Failed to delete consumption:", err);

    alert(
      err.response?.data?.error ||
      "Failed to delete consumption."
    );
  }
};


  const handleDownloadExcel = () => {
    if (!activeRecord) return;
    const excelData = activeRecord.items.map((item) => ({
      "Stock Item": item.stockItemId?.name || "N/A",
      "Stock Group": getGroupName(item), // Using the updated helper here
      "Item ID": item.stockItemId?._id?.toUpperCase(),
      "Quantity": item.qtyBaseUnit,
      "Unit": item.stockItemId?.unitId?.symbol || "",
"Date": activeRecord.date || activeRecord.createdAt.split("T")[0],
      "Authorised By": activeRecord.userId?.name,
      "Godown": activeRecord.godownId?.name
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Consumption Report");
    XLSX.writeFile(workbook, `Consumption_${activeRecord.userId?.name || 'Report'}_${Date.now()}.xlsx`);
  };
 const handleDownloadAllConsumptionsExcel = () => {
  if (!inventoryItems.length) {
    alert("No inventory items found.");
    return;
  }

  if (!processedRows.length) {
    alert("No consumption records found for the selected date range.");
    return;
  }

  // ============================================================
  // GROUP CONSUMPTIONS BY DATE
  // ============================================================

  const groupedByDate = {};

  processedRows.forEach((cons) => {
    const date = cons.date
      ? String(cons.date).split("T")[0]
      : new Date(cons.createdAt).toISOString().split("T")[0];

    if (!groupedByDate[date]) {
      groupedByDate[date] = [];
    }

    groupedByDate[date].push(cons);
  });

  // ============================================================
  // GODOWNS
  // ============================================================

  const allGodowns = getOrderedGodowns([
    ...processedRows.map(
      (r) => r.godownId?.name || "General"
    )
  ]);

  // ============================================================
  // INVENTORY MASTER LIST
  // Every inventory item MUST appear in Excel
  // ============================================================

  const inventoryMap = {};

  inventoryItems.forEach((item) => {
    const id = String(item._id);

    inventoryMap[id] = {
      id,
      name: item.name || "",
      group:
        item.stockGroupId?.name ||
        item.stockGroupId?.toString?.() ||
        "General",
      unit:
        item.unitId?.symbol ||
        item.unitId?.name ||
        "",
    };
  });

  // ============================================================
  // CONSOLIDATED CONSUMPTION MAP
  // ============================================================

  const consolidatedMap = {};

  // First create ALL inventory products with zero
  inventoryItems.forEach((item) => {
    const id = String(item._id);

    consolidatedMap[id] = {
      name: item.name || "",
      group:
        item.stockGroupId?.name ||
        item.stockGroupId?.toString?.() ||
        "General",
      unit:
        item.unitId?.symbol ||
        item.unitId?.name ||
        "",
      total: 0,
      godowns: {}
    };

    allGodowns.forEach((godown) => {
      consolidatedMap[id].godowns[godown] = 0;
    });
  });

  // ============================================================
  // ADD ACTUAL CONSUMPTION
  // ============================================================

  processedRows.forEach((cons) => {
    const godown = normalizeGodownName(
      cons.godownId?.name || "General"
    );

    cons.items?.forEach((item) => {
      const id = String(
        item.stockItemId?._id ||
        item.stockItemId
      );

      const qty = Number(item.qtyBaseUnit || 0);

      // If item is not in inventory master, create it anyway
      if (!consolidatedMap[id]) {
        consolidatedMap[id] = {
          name: item.stockItemId?.name || "",
          group: getGroupName(item),
          unit: item.stockItemId?.unitId?.symbol || "",
          total: 0,
          godowns: {}
        };

        allGodowns.forEach((g) => {
          consolidatedMap[id].godowns[g] = 0;
        });
      }

      if (
        consolidatedMap[id].godowns[godown] === undefined
      ) {
        consolidatedMap[id].godowns[godown] = 0;
      }

      consolidatedMap[id].godowns[godown] += qty;
      consolidatedMap[id].total += qty;
    });
  });

  // ============================================================
  // CREATE EXCEL DATA
  // ============================================================

  const aoa = [];

  aoa.push([
    "MONTESSORI DAILY CONSUMPTION REPORT"
  ]);

  aoa.push([]);

  // ============================================================
  // CONSOLIDATED SECTION
  // ============================================================

  let consolidatedTitle = "CONSOLIDATED";

  if (fromDate || toDate) {
    consolidatedTitle +=
      ` (${fromDate || ""} to ${toDate || ""})`;
  }

  const consolidatedSection = [];

  consolidatedSection.push([
    consolidatedTitle
  ]);

  consolidatedSection.push([]);

  const consolidatedHeader = [
    "S.No",
    "Stock Item",
    "Group",
    "Unit",
    ...allGodowns,
    "TOTAL"
  ];

  consolidatedSection.push(consolidatedHeader);

  // Sort inventory items by name
  const consolidatedItems = Object.values(
    consolidatedMap
  ).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  consolidatedItems.forEach((item, index) => {
    const row = [
      index + 1,
      item.name,
      item.group,
      item.unit
    ];

    allGodowns.forEach((godown) => {
      row.push(
        Number(item.godowns[godown] || 0)
      );
    });

    row.push(Number(item.total || 0));

    consolidatedSection.push(row);
  });

  consolidatedSection.push([]);
  consolidatedSection.push([]);

  // Insert consolidated section
  aoa.push(...consolidatedSection);

  // ============================================================
  // DATE-WISE REPORT
  // ============================================================

  Object.keys(groupedByDate)
    .sort((a, b) =>
      new Date(b) - new Date(a)
    )
    .forEach((date) => {

      const consumptions = groupedByDate[date];

      // ========================================================
      // IMPORTANT:
      // Use ALL GODOWNS, not only godowns that consumed that day
      // ========================================================

      const godowns = allGodowns;

      // ========================================================
      // Create every inventory item with ZERO
      // ========================================================

      const itemMap = {};

      inventoryItems.forEach((inventoryItem) => {
        const id = String(inventoryItem._id);

        itemMap[id] = {
          name: inventoryItem.name || "",
          group:
            inventoryItem.stockGroupId?.name ||
            inventoryItem.stockGroupId?.toString?.() ||
            "General",
          unit:
            inventoryItem.unitId?.symbol ||
            inventoryItem.unitId?.name ||
            "",
          total: 0,
          godowns: {}
        };

        godowns.forEach((godown) => {
          itemMap[id].godowns[godown] = 0;
        });
      });

      // ========================================================
      // Add actual consumption
      // ========================================================

      consumptions.forEach((cons) => {

        const godown = normalizeGodownName(
          cons.godownId?.name || "General"
        );

        cons.items?.forEach((item) => {

          const id = String(
            item.stockItemId?._id ||
            item.stockItemId
          );

          const qty = Number(
            item.qtyBaseUnit || 0
          );

          // If somehow consumption has an item
          // that is no longer in inventory
          if (!itemMap[id]) {
            itemMap[id] = {
              name:
                item.stockItemId?.name || "",
              group:
                getGroupName(item),
              unit:
                item.stockItemId?.unitId?.symbol ||
                "",
              total: 0,
              godowns: {}
            };

            godowns.forEach((g) => {
              itemMap[id].godowns[g] = 0;
            });
          }

          if (
            itemMap[id].godowns[godown] === undefined
          ) {
            itemMap[id].godowns[godown] = 0;
          }

          itemMap[id].godowns[godown] += qty;
          itemMap[id].total += qty;
        });
      });

      // ========================================================
      // DATE TITLE
      // ========================================================

      aoa.push([
        `DATE: ${date}`
      ]);

      aoa.push([]);

      // ========================================================
      // DATE HEADER
      // ========================================================

      const header = [
        "S.No",
        "Stock Item",
        "Group",
        "Unit",
        ...godowns,
        "TOTAL"
      ];

      aoa.push(header);

      // ========================================================
      // DATE ITEMS
      // ALL INVENTORY ITEMS ARE SHOWN
      // ========================================================

      const dateItems = Object.values(itemMap)
        .sort((a, b) =>
          a.name.localeCompare(b.name)
        );

      dateItems.forEach((item, index) => {

        const row = [
          index + 1,
          item.name,
          item.group,
          item.unit
        ];

        godowns.forEach((godown) => {
          row.push(
            Number(
              item.godowns[godown] || 0
            )
          );
        });

        row.push(
          Number(item.total || 0)
        );

        aoa.push(row);
      });

      aoa.push([]);
      aoa.push([]);
    });

  // ============================================================
  // CREATE WORKSHEET
  // ============================================================

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const maxCols = Math.max(
    ...aoa.map((row) => row.length)
  );

  // ============================================================
  // TITLE MERGE
  // ============================================================

  ws["!merges"] = [
    {
      s: { r: 0, c: 0 },
      e: {
        r: 0,
        c: maxCols - 1
      }
    }
  ];

  // ============================================================
  // MAIN TITLE STYLE
  // ============================================================

  if (ws["A1"]) {
    ws["A1"].s = {
      font: {
        bold: true,
        sz: 16,
        color: {
          rgb: "FFFFFF"
        }
      },
      alignment: {
        horizontal: "center"
      },
      fill: {
        patternType: "solid",
        fgColor: {
          rgb: "1E3A8A"
        }
      }
    };
  }

  // ============================================================
  // STYLE DATE + HEADER ROWS
  // ============================================================

  Object.keys(ws).forEach((cell) => {

    if (!ws[cell]) return;

    // ----------------------------------------------------------
    // DATE ROW
    // ----------------------------------------------------------

    if (
      ws[cell].v &&
      String(ws[cell].v).startsWith("DATE:")
    ) {

      ws[cell].s = {
        font: {
          bold: true,
          color: {
            rgb: "FFFFFF"
          }
        },
        alignment: {
          horizontal: "left"
        },
        fill: {
          patternType: "solid",
          fgColor: {
            rgb: "16A34A"
          }
        }
      };
    }

    // ----------------------------------------------------------
    // HEADER ROW
    // ----------------------------------------------------------

    if (ws[cell].v === "S.No") {

      const rowNo =
        Number(cell.match(/\d+/)[0]) - 1;

      for (
        let i = 0;
        i < maxCols;
        i++
      ) {

        const col =
          XLSX.utils.encode_col(i);

        const ref =
          `${col}${rowNo + 1}`;

        if (ws[ref]) {

          ws[ref].s = {
            font: {
              bold: true,
              color: {
                rgb: "FFFFFF"
              }
            },
            alignment: {
              horizontal: "center"
            },
            fill: {
              patternType: "solid",
              fgColor: {
                rgb: "2563EB"
              }
            }
          };
        }
      }
    }
  });

  // ============================================================
  // COLUMN WIDTHS
  // ============================================================

  ws["!cols"] = [
    { wch: 8 },
    { wch: 28 },
    { wch: 20 },
    { wch: 12 },

    // Godown columns
    ...allGodowns.map(() => ({
      wch: 15
    })),

    // TOTAL
    { wch: 15 }
  ];

  // ============================================================
  // WORKBOOK
  // ============================================================

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    ws,
    "Consumptions"
  );

  // ============================================================
  // DOWNLOAD
  // ============================================================

  XLSX.writeFile(
    wb,
    fromDate || toDate
      ? `Consumption_Report_${fromDate || "start"}_to_${toDate || "end"}.xlsx`
      : "All_Consumption_Report.xlsx"
  );
};
  return (
    <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
          <span style={{ color: '#6366f1', fontWeight: '500' }}>Daily Consumptions</span>
        </h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
            <input 
              type="text" placeholder="Search..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', fontWeight: '600', width: '200px', outline: 'none' }}
            />
          </div>
          <div
  style={{
    display: "flex",
    gap: "10px",
    alignItems: "center"
  }}
>
  <input
    type="date"
    value={fromDate}
    onChange={(e) => setFromDate(e.target.value)}
    style={{
      padding: "10px 12px",
      borderRadius: "10px",
      border: "1px solid #e2e8f0",
      fontSize: "13px"
    }}
  />

  <span
    style={{
      fontSize: "12px",
      color: "#64748b"
    }}
  >
    to
  </span>

  <input
    type="date"
    value={toDate}
    onChange={(e) => setToDate(e.target.value)}
    style={{
      padding: "10px 12px",
      borderRadius: "10px",
      border: "1px solid #e2e8f0",
      fontSize: "13px"
    }}
  />

  {(fromDate || toDate) && (
    <button
      onClick={() => {
        setFromDate("");
        setToDate("");
      }}
      style={{
        padding: "10px 12px",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        background: "#fff",
        cursor: "pointer"
      }}
    >
      Clear
    </button>
  )}
</div><button
  onClick={handleDownloadAllConsumptionsExcel}
  style={{
    background: "#10b981",
    border: "none",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px"
  }}
>
  <FileSpreadsheet size={16} />
  Export All Consumptions
</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
        {/* Sidebar: List of Records */}
        <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>
            {searchQuery ? 'SEARCH RESULTS' : 'RECENT RECORDS'} ({processedRows.length})
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {processedRows.map(r => (
              <div 
                key={r._id} onClick={() => setSelectedId(r._id)}
                style={{ 
                  padding: '16px', 
                  borderRadius: '16px', 
                  cursor: 'pointer', 
                  background: selectedId === r._id ? '#fff' : 'transparent', 
                  border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent', 
                  transition: 'all 0.2s',
                  boxShadow: selectedId === r._id ? '0 4px 12px rgba(99, 102, 241, 0.08)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b', fontSize: '14px' }}>{r.userId?.name}</div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "6px"
  }}
>
  <span
    style={{
      padding: "4px 10px",
      borderRadius: "999px",
      fontSize: "10px",
      fontWeight: "700",
      background:
        r.recordType === "dailyUsage"
          ? "#DCFCE7"
          : "#DBEAFE",
      color:
        r.recordType === "dailyUsage"
          ? "#166534"
          : "#1D4ED8",
      border:
        r.recordType === "dailyUsage"
          ? "1px solid #86EFAC"
          : "1px solid #93C5FD"
    }}
  >
    {r.recordType === "dailyUsage"
      ? "DAILY USAGE"
      : "CONSUMPTION"}
  </span>

  <span
    style={{
      fontSize: "11px",
      color: "#94a3b8",
      fontWeight: "600"
    }}
  >
    {r.date
  ? new Date(r.date).toLocaleDateString()
  : new Date(r.createdAt).toLocaleDateString()}
    {/* {new Date(r.createdAt).toLocaleDateString()} */}
  </span>
</div>

<div
  style={{
    fontSize: "12px",
    color: "#64748b",
    marginTop: "8px"
  }}
>
  {r.items?.length} items • {r.godownId?.name}
</div>
                {/* <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{r.items?.length} items • {r.godownId?.name}</div> */}
              </div>
            ))}
          </div>
        </div>

        {/* Detailed View */}
        <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          {activeRecord ? (
            <>
              {/* Detail Header */}
              <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>DATE</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{activeRecord.date
  ? new Date(activeRecord.date).toLocaleDateString()
  : new Date(activeRecord.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TIME</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{new Date(activeRecord.createdAt).toLocaleTimeString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>AUTHORISED BY</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{activeRecord.userId?.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{activeRecord.godownId?.name}</div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left' }}>
                      <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>STOCK ITEM</th>
                      <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>STOCK GROUP</th>
                      <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>QUANTITY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(editingRecordId === activeRecord._id ? editItems : activeRecord.items).map((item, idx) => {
                      const originalItem = activeRecord.items?.[idx];
                      return (
                        <tr key={item.stockItemId?._id || item.stockItemId || idx}>
                          <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
                            <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.stockItemId?.name || item.name}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                              ID: {(item.stockItemId?._id || item.stockItemId)?.slice(-6).toUpperCase()}
                            </div>
                          </td>
                          <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
                            <span style={{ fontSize: '10px', color: '#6366f1', background: '#eef2ff', padding: '4px 10px', borderRadius: '100px', fontWeight: '700', border: '1px solid #e0e7ff' }}>
                              {editingRecordId === activeRecord._id
                                ? (originalItem ? getGroupName(originalItem) : "General")
                                : getGroupName(item)}
                            </span>
                          </td>
                          <td style={{ padding: '20px 0', textAlign: 'right', borderBottom: '1px solid #f8fafc' }}>
                            {editingRecordId === activeRecord._id ? (
                              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                                <input
  type="text"
  inputMode="decimal"
  value={item.qtyBaseUnit}
  onChange={e => updateEditQuantity(idx, e.target.value)}
  onBlur={e => {
    const value = e.target.value;

    if (value !== "") {
      updateEditQuantity(
        idx,
        Number(value).toFixed(3).replace(/\.?0+$/, "")
      );
    }
  }}
  placeholder="0.000"
  style={{
    width: '100px',
    padding: '8px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    textAlign: 'right',
    fontWeight: '800'
  }}
/>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>{item.unit || item.stockItemId?.unitId?.symbol || ""}</span>
                                <button
                                  onClick={() => removeEditItem(idx)}
                                  title="Remove item"
                                  style={{ border: 'none', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', padding: '7px', cursor: 'pointer' }}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span style={{ fontWeight: '800', color: '#0f172a' }}>{item.qtyBaseUnit}</span>
                                <span style={{ marginLeft: '4px', fontSize: '12px', color: '#64748b' }}>{item.stockItemId?.unitId?.symbol}</span>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {(
  activeRecord.recordType === "consumption" ||
  activeRecord.recordType === "dailyUsage" ||
  !activeRecord.recordType
) &&
  editingRecordId !== activeRecord._id && (
    <>
      <button
        onClick={() => startEditing(activeRecord)}
        style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          color: '#92400e',
          padding: '12px 18px',
          borderRadius: '12px',
          fontWeight: '700',
          fontSize: '13px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <Pencil size={16} />
        Edit Quantities
      </button>

      <button
        onClick={() =>
          activeRecord.recordType === "dailyUsage"
            ? deleteDailyUsage(activeRecord)
            : deleteConsumption(activeRecord)
        }
        style={{
          background: '#fee2e2',
          border: '1px solid #ef4444',
          color: '#b91c1c',
          padding: '12px 18px',
          borderRadius: '12px',
          fontWeight: '700',
          fontSize: '13px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <Trash2 size={16} />
        Delete
      </button>
    </>
)}

                  {editingRecordId === activeRecord._id && (
                    <>
                      <button onClick={
  activeRecord.recordType === "dailyUsage"
    ? saveDailyUsageEdit
    : saveConsumptionEdit
} disabled={savingEdit}
                        style={{ background: '#16a34a', border: 'none', color: '#fff', padding: '12px 18px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: savingEdit ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: savingEdit ? 0.7 : 1 }}>
                        <Save size={16} /> {savingEdit ? "Saving..." : "Save Changes"}
                      </button>
                      <button onClick={cancelEditing} disabled={savingEdit}
                        style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#475569', padding: '12px 18px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <X size={16} /> Cancel
                      </button>
                    </>
                  )}
                </div>

                <button onClick={handleDownloadExcel}
                  style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileSpreadsheet size={16} /> Export to Excel (.xlsx)
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              <div style={{ textAlign: 'center' }}>
                <Search size={40} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <div style={{ fontWeight: '600' }}>No matching records found</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
