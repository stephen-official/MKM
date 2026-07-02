// 01-07-2026









import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../api.js";
import { X, Calendar, Plus, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "react-hot-toast";
import { IncomingTransfers } from "./IncomingTransfers";

export const UserTransferPage = ({ onClose }) => {
//   const [transferTab, setTransferTab] = useState("to"); // "to" (Outbound) or "from" (Inbound)
  const [godowns, setGodowns] = useState([]);
  const [stockGroups, setStockGroups] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [itemSearch, setItemSearch] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);
//   const fetchTransfers = useCallback(async () => {
//   try {
//     const res = await api.get("/user-transfers/history");

//     const sorted = (res.data || []).sort(
//       (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
//     );

//     setTransfers(sorted);
//   } catch (err) {
//     toast.error("Failed to load transfers");
//   }
// }, []);
const fetchTransfers = useCallback(async () => {
  try {
    const [historyRes, incomingRes] = await Promise.all([
      api.get("/user-transfers/history"),
      api.get("/user-transfers/incoming"),
    ]);

    const history = historyRes.data || [];
    const incoming = incomingRes.data || [];

    // Mark incoming requests
   const incomingMarked = incoming.map((t) => ({
  ...t,
  isIncoming: true,
}));

const map = new Map();

history.forEach((t) => {
  map.set(t._id, {
    ...t,
    isIncoming: false,
  });
});

incomingMarked.forEach((t) => {
  map.set(t._id, t);
});
    const merged = [...map.values()].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    setTransfers(merged);
  } catch (err) {
    toast.error("Failed to load transfers");
  }
}, []);

  const [form, setForm] = useState({
    toGodownId: "",
    stockGroupId: "",
    stockItemId: "",
    qtyBaseUnit: "",
    note: "",
  });

  const loadInitialData = useCallback(async () => {
  try {
    const [gRes, tRes, grpRes] = await Promise.all([
      api.get("/inventory/godowns"),
      api.get("/user-transfers/history"),
      api.get("/inventory/stock-groups"),
    ]);

    setGodowns(gRes.data || []);
    setStockGroups(grpRes.data || []);

   if ((tRes.data || []).length > 0) {
  setSelectedTransfer(tRes.data[0]);
}
  } catch (error) {
    console.log(error);
    console.log(error.response);

    toast.error(error.response?.data?.error || error.message);
  }
}, []);


const loadGodownStock = useCallback(async () => {
  try {
    const res = await api.get("/procurement/my-stock");
    setStockItems(res.data || []);
  } catch (error) {
    console.log(error);
    console.log(error.response);

    toast.error(error.response?.data?.error || error.message);
  }
}, []);



  useEffect(() => {
  loadInitialData();
  loadGodownStock();
  fetchTransfers();   // ✅ ADD THIS
}, [loadInitialData, loadGodownStock, fetchTransfers]);

  const currentSelectedItem = useMemo(() => {
    return stockItems.find(
      (item) => (item.stockItemId?._id || item.stockItemId) === form.stockItemId
    );
  }, [stockItems, form.stockItemId]);

  const filteredItems = useMemo(() => {
    return stockItems.filter((item) => {
      const matchesSearch = (item.stockItemId?.name || "")
        .toLowerCase()
        .includes(itemSearch.toLowerCase());
      const matchesGroup = form.stockGroupId
        ? (item.stockItemId?.stockGroupId?._id || item.stockItemId?.stockGroupId) ===
          form.stockGroupId
        : true;
      return matchesSearch && matchesGroup;
    });
  }, [stockItems, itemSearch, form.stockGroupId]);

  const handleTransfer = async () => {
    const qty = Number(form.qtyBaseUnit);
    if (!form.toGodownId || !form.stockItemId || !form.qtyBaseUnit) {
      toast.error("Please fill all fields");
      return;
    }

    const available = currentSelectedItem?.qtyBaseUnit || 0;
    if (qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    if (qty > available) {
      toast.error(`Insufficient Stock! Available: ${available}`);
      return;
    }

    try {
      await api.post("/user-transfers", {
        toGodownId: form.toGodownId,
        note: form.note,
        items: [
          {
            stockItemId: form.stockItemId,
            qtyBaseUnit: qty,
          },
        ],
      });

      toast.success("Transfer Request Sent");
      setForm({
        toGodownId: "",
        stockGroupId: "",
        stockItemId: "",
        qtyBaseUnit: "",
        note: "",
      });
      setItemSearch("");
      await loadInitialData();
await loadGodownStock();
await fetchTransfers();
    } catch (error) {
      toast.error(error.response?.data?.error || "Transfer failed");
    }
  };

  const downloadExcel = () => {
    if (!selectedTransfer) return;
    const data = selectedTransfer.items.map((item) => ({
      "Transfer ID": `TRN-${selectedTransfer._id.slice(-6).toUpperCase()}`,
      Date: new Date(selectedTransfer.createdAt).toLocaleString(),
      Source: selectedTransfer.fromGodownId?.name || "N/A",
      Destination: selectedTransfer.toGodownId?.name || "N/A",
      Item: item.stockItemId?.name || "N/A",
      Group: item.stockItemId?.stockGroupId?.name || "General",
      Quantity: item.qtyBaseUnit,
      Unit: item.stockItemId?.unitId?.symbol || "units",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "TransferDetails");
    XLSX.writeFile(workbook, `Transfer_${selectedTransfer._id.slice(-6)}.xlsx`);
    toast.success("Excel Downloaded");
  };

  const isQtyInvalid = Number(form.qtyBaseUnit) > (currentSelectedItem?.qtyBaseUnit || 0);
// const sortedTransfers = useMemo(() => {
//   return [...transfers].sort(
//     (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
//   );
// }, [transfers]);
  return (
  <div className="flex flex-col h-full bg-gray-50/50 p-2 space-y-3">

    {/* BUTTON (ONLY ONE) */}
    {/* <button
      onClick={() => {
        // open your transfer create modal or logic
        toast("Open transfer form here");
      }}
      className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[11px] uppercase"
    >
      + Transfer Stock
    </button> */}

    {/* LIST */}
    <div className="flex-1 overflow-y-auto space-y-3">

      {transfers.length > 0 ? (
        transfers.map((t) => (
          <div
            key={t._id}
            className="bg-white p-4 rounded-2xl border shadow-sm"
          >

            {/* TOP ROW */}
            <div className="flex justify-between mb-2">
              <span className={`text-[9px] font-black px-2 py-1 rounded uppercase ${
                t.status === "accepted"
                  ? "bg-green-100 text-green-600"
                  : t.status === "rejected"
                  ? "bg-red-100 text-red-600"
                  : "bg-orange-100 text-orange-600"
              }`}>
                {t.status || "pending"}
              </span>

              <span className="text-[10px] font-black text-gray-600">
                {new Date(t.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* FLOW */}
            <div className="flex justify-between mb-2">

  <div className="text-[10px] font-black text-gray-500">
    {t.fromGodownId?.name} ➜ {t.toGodownId?.name}
  </div>

  <span
    className={`text-[9px] px-2 py-1 rounded-full font-bold ${
      t.isIncoming
        ? "bg-blue-100 text-blue-700"
        : "bg-gray-100 text-gray-700"
    }`}
  >
    {t.isIncoming ? "Incoming" : "Outgoing"}
  </span>

</div>

{/* ITEMS */}
<div className="space-y-1">
  {t.items?.map((it, i) => (
    <div key={i} className="flex justify-between text-xs">
      <span className="font-black text-blue-600 uppercase">
        {it.stockItemId?.name}
      </span>

      <span className="font-bold">
        -{it.qtyBaseUnit}
      </span>
    </div>
  ))}
</div>

{/* SHOW ONLY FOR INCOMING PENDING REQUESTS */}
{t.isIncoming && t.status === "pending" && (
  <div className="flex gap-2 mt-4">

    <button
      onClick={async () => {
        try {
          await api.post(`/user-transfers/${t._id}/accept`);

          toast.success("Transfer Accepted");

          fetchTransfers();
          loadGodownStock();
        } catch (err) {
          toast.error(err.response?.data?.error || "Accept failed");
        }
      }}
      className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold"
    >
      Accept
    </button>

    <button
      onClick={async () => {
        try {
          await api.post(`/user-transfers/${t._id}/reject`);

          toast.success("Transfer Rejected");

          fetchTransfers();
        } catch (err) {
          toast.error(err.response?.data?.error || "Reject failed");
        }
      }}
      className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold"
    >
      Reject
    </button>

  </div>
)}

</div>
        ))
      ) : (
        <div className="text-center py-10 text-gray-400 font-black text-xs uppercase">
          No transfers found
        </div>
      )}

    </div>
  </div>
);
};







