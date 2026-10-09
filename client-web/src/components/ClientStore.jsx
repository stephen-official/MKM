import React, { useState, useEffect, useMemo, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from "../api";
import { toast } from 'react-hot-toast';
import { socket } from "../socket"; 
import InventoryCard from './InventoryCard';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import DailyUsageCard from "./DailyUsageCard";
import { UserTransferPage } from "./UserTransferPage";
import KitchenHome from "./kitchen/KitchenHome";
import KitchenHeader from "./kitchen/KitchenHeader";
import KitchenBottomNav from "./kitchen/KitchenBottomNav";
import KitchenStock from "./kitchen/KitchenStock";
import KitchenUsageScreen from "./kitchen/KitchenUsageScreen";
import SupplyRequestsDeliveries from "./kitchen/SupplyRequestsDeliveries";

const CustomDateInput = forwardRef(({ value, onClick, placeholder }, ref) => (
  <button
    className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-xs font-bold text-gray-800 flex items-center justify-center gap-3 hover:border-blue-500 transition-all active:scale-[0.98] shadow-sm"
    onClick={onClick}
    ref={ref}
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
    </svg>
    <span className="text-center">{value || placeholder || "Select Date"}</span>
  </button>
));
const limitTo3Decimals = (value) => {
  if (value === "" || value === ".") return value;

  const num = Number(value);
  if (isNaN(num)) return "";

  return Number(num.toFixed(3));
};
const ClientStore = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [stockFilter, setStockFilter] = useState("all");
  const [supplyInitialTab, setSupplyInitialTab] = useState("requests");
  const [userInfo, setUserInfo] = useState(null);
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]); 
  const [dailyUsageHistory, setDailyUsageHistory] = useState([]);
  const [requests, setRequests] = useState([]); 
  const [indents, setIndents] = useState([]);
  const [loading, setLoading] = useState(true);
const [editIndentId, setEditIndentId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(""); 
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [logTab, setLogTab] = useState("usage"); 
const [activeTransactionType, setActiveTransactionType] = useState("usage"); // usage | request | indent | transfer

const [requestType, setRequestType] = useState("stock_request");

const [mode, setMode] = useState("stock");

const [transferDestination, setTransferDestination] = useState("");
const [godowns, setGodowns] = useState([]);
const [dailyItems, setDailyItems] = useState([]);
  const [requestReason, setRequestReason] = useState(""); 
  const [requestDate, setRequestDate] = useState(new Date());

  const [isReceiveView, setIsReceiveView] = useState(false);
  const [activeReceiveIndent, setActiveReceiveIndent] = useState(null);
  const [receiveItems, setReceiveItems] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const navigate = useNavigate();

  const isSameDay = (dateString, filterDate) => {
    if (!filterDate) return true;
    return new Date(dateString).toISOString().split('T')[0] === filterDate;
  };
const fetchGodowns = async () => {
  try {
    const res = await api.get("/inventory/godowns");
    setGodowns(res.data || []);
  } catch (error) {
    console.error("Failed to fetch kitchens", error);
  }
};
  const fetchUserInfo = async () => {
    try {
      const res = await api.get("/auth/me");
      setUserInfo(res.data);
    } catch { console.error("Failed to fetch user info"); }
  };

  const handleLogout = () => {
    localStorage.removeItem("token"); 
    socket.disconnect();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const fetchIndents = async () => {
    try {
      const res = await api.get("/indent-requests/me");
      setIndents(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch { setIndents([]); }
  };

  const fetchItems = async (isForIndent = false) => {
   
    try {
         const dailyRes = await api.get("/inventory/stock-items");

setDailyItems(
  dailyRes.data
    .filter(item => item.itemType === "daily_use")
    .map(item => ({
      stockItemId: item._id,
      stockRecordId: item._id,
      _id: item._id,
      name: item.name,
      unit: item.unitId?.symbol || "Nos",
      image: item.imageUrl || ""
    }))
);
      let res;
     if (isForIndent) {
 res = await api.get("/inventory/stock-items");

const formatted = res.data
  .filter(item => item.itemType !== "daily_use") // ✅ THIS IS THE FIX
  .map(item => ({
    stockRecordId: item._id,
    _id: item._id,
    name: item.name,
    unit: item.unitId?.symbol || "Units",
    currentQty: item.kitchenQty || 0,
    image: item.imageUrl || item.image || ""
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

setItems(formatted);
} else {
        res = await api.get('/my-kitchen-stock'); 
        const formattedItems = res.data
  .filter(item => item.itemType !== "daily_use")
  .map(item => ({
          stockRecordId: item.stockRecordId, 
          _id: item.stockItemId?._id || item.stockItemId,
          name: item.name || item.stockItemId?.name || "Unknown Item",
          currentQty: Number(item.currentQty) || 0, 
          thresholdBaseUnit: Number(item.thresholdBaseUnit) || 0,
          unit: item.stockItemId?.unitId?.symbol || item.unit || "Units", 
          image: item.image || item.stockItemId?.imageUrl || ""
        })).sort((a, b) => a.name.localeCompare(b.name));
        setItems(formattedItems);
      }
    } catch { toast.error("Failed to sync inventory"); }
  };




  const fetchMyOrders = async () => {
    try {
      const res = await api.get('/consumptions/me');
      setOrders(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch { console.error("Failed to fetch orders"); }
  };
  const fetchDailyUsage = async () => {
  try {
    const res = await api.get("/daily-usage/me");

    setDailyUsageHistory(
      res.data.sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      )
    );
  } catch (error) {
    console.error("Failed to fetch daily usage", error);
  }
};

  const fetchMyRequests = async () => {
    try {
      const res = await api.get('/requests');
      setRequests(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch { setRequests([]); }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
 await Promise.all([
  fetchUserInfo(),
  fetchItems(false),
  fetchMyOrders(),
  fetchMyRequests(),
  fetchIndents(),
  fetchDailyUsage(),
  fetchGodowns()
]);
      setLoading(false);
    };
    init();
  }, []);

  const filteredItems = useMemo(() => {
  const source =
    mode === "daily"
      ? dailyItems
      : items;

  return source.filter(item =>
    item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );
}, [
  items,
  dailyItems,
  searchQuery,
  mode
]);


const usageHistory = useMemo(() => {
  const consumptions = orders.map(order => ({
    ...order,
    type: "consumption",
    historyTime: order.createdAt
  }));

  const dailyUsage = dailyUsageHistory.map(row => ({
    ...row,
    type: "daily",
    historyTime: row.createdAt
  }));

  return [...consumptions, ...dailyUsage]
    .filter(row =>
      isSameDay(
        row.date || row.createdAt,
        selectedHistoryDate
      )
    )
    .sort(
      (a, b) =>
        new Date(b.historyTime) -
        new Date(a.historyTime)
    );
}, [orders, dailyUsageHistory, selectedHistoryDate]);

  const addToCart = (product, newQty) => {
    // Prevent empty or partial decimal issues
    if (newQty === "" || newQty === ".") {
      updateCartState(product, newQty);
      return;
    }

    const parsedQty = limitTo3Decimals(newQty);

// Allow negative ONLY for request mode
if (parsedQty < 0 && activeTransactionType !== "request") return;

if (isNaN(parsedQty)) return;
    
    if (activeTransactionType === "usage") {
        if (parsedQty < 0) return; 
      const existingInCart = cart.find(i => i.stockRecordId === product.stockRecordId);
      const oldQty = existingInCart ? parseFloat(existingInCart.requestedQty) || 0 : 0;
      const diff = parsedQty - oldQty;
      const targetItem = items.find(i => i.stockRecordId === product.stockRecordId);
      
      if (diff > 0 && (!targetItem || targetItem.currentQty < diff)) return toast.error("Insufficient Kitchen Stock");
      
      setItems(prev => prev.map(item =>
        item.stockRecordId === product.stockRecordId 
        ? { ...item, currentQty: Math.round((item.currentQty - diff) * 100) / 100 } : item
      ));
    }
    updateCartState(product, parsedQty);
  };

  const updateCartState = (product, qty) => {
    setCart(prev => {
      const exists = prev.find(i => i.stockRecordId === product.stockRecordId);
      if (exists) {
       
        return prev.map(i => i.stockRecordId === product.stockRecordId ? { ...i, requestedQty: qty } : i);
      }
      return [...prev, { ...product, requestedQty: qty, unit: product.unit }];
    });
  };


  const handleDailyUsageAdd = (item, qty) => {
  setCart(prev => {
    const existing = prev.find(
      x => x.stockItemId === item.stockItemId
    );

    if (existing) {
  return prev.map(x =>
    x.stockItemId === item.stockItemId
      ? {
          ...x,
          qtyBaseUnit: qty,
          image: item.image || x.image
        }
      : x
  );
}

    return [
  ...prev,
  {
    stockItemId: item.stockItemId,
    qtyBaseUnit: qty,
    name: item.name,
    unit: item.unit,
    image: item.image || ""
  }
];
  });
};

  const handleSubmit = async () => {

  console.log("===== SUBMIT =====");
// DIRECT DAILY USAGE ONLY
if (
  mode === "daily" &&
  activeTransactionType === "usage"
) {
  try {
    await api.post("/daily-usage", {
      date: selectedDate,
      items: cart.map(item => ({
        stockItemId: item.stockItemId,
        qtyBaseUnit: Number(item.qtyBaseUnit)
      }))
    });

    toast.success("Daily Usage Saved!");

    await fetchDailyUsage();

    setCart([]);
    setIsCartOpen(false);

    return;
  } catch (err) {
    toast.error(
      err.response?.data?.message ||
      err.response?.data?.error ||
      "Failed to save daily usage"
    );

    return;
  }
}


  console.log("editIndentId =", editIndentId);
  console.log("activeTransactionType =", activeTransactionType);
    const validItems = cart.map(item => ({
  stockItemId: item.stockItemId || item._id || item.stockRecordId,
  qtyBaseUnit: limitTo3Decimals(
    mode === "daily"
      ? item.qtyBaseUnit
      : item.requestedQty
  ),
  stockRecordId: item.stockRecordId
})).filter(it =>
  !isNaN(it.qtyBaseUnit) &&
  Number(it.qtyBaseUnit) !== 0
); // Only submit quantities > 0

    if (validItems.length === 0) return toast.error("Add valid quantities");
    if (
  (activeTransactionType === "request" ||
   activeTransactionType === "indent") &&
  !requestReason.trim()
) {
  return toast.error("Reason required");
}

    const loadingToast = toast.loading("Processing...");
    try {
        if (activeTransactionType === "transfer") {

  if (!transferDestination) {
    toast.error("Select destination godown");
    return;
  }

  await api.post("/user-transfers", {
    toGodownId: transferDestination,
    items: validItems.map(item => ({
      stockItemId: item.stockItemId,
      qtyBaseUnit: item.qtyBaseUnit
    }))
  });

  toast.success("Transfer Sent");

  setTransferDestination("");
  setCart([]);
  setIsCartOpen(false);

  await fetchItems(false);

  return;
}
      if (activeTransactionType === "indent") {
        const payload = { items: validItems, note: requestReason, targetDate: requestDate.toISOString() };
 console.log("Submitting with ID:", editIndentId);

if (editIndentId !== null && editIndentId !== undefined) {
  await api.put(
    `/indent-requests/${editIndentId}`,
    payload
  );

  toast.success("Indent Updated!");
} else {
  await api.post(
    "/indent-requests",
    payload
  );

  toast.success("Indent Sent!");
}
       
      } else if (activeTransactionType === "request") {

  await api.post("/requests", {
    requestType,
    items: validItems,
    reason: requestReason,
    targetDate: requestDate.toISOString()
  });

  toast.success(
    requestType === "daily_usage"
      ? "Daily Usage Request Sent!"
      : "Stock Request Sent!"
  );
} else {


        await api.post("/orders", {
  items: validItems,
  date: selectedDate
});
        toast.success("Usage Logged!");
      }

      setCart([]);
      setRequestReason("");
      setIsCartOpen(false);
    setEditIndentId(null);  
    setActiveTransactionType("usage");
    setRequestType("stock_request");
      await Promise.all([fetchItems(false), fetchIndents(), fetchMyRequests(), fetchMyOrders()]);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const submitReceive = async () => {
   const payload = Object.entries(receiveItems)
  .map(([stockItemId, qty]) => {
    const item = activeReceiveIndent.items.find(
      i => i.stockItemId._id === stockItemId
    );

    return {
      stockItemId,
      receivedQty: Number(limitTo3Decimals(qty)),
      status: item?.status
    };
  })
  .filter(p => {
  const item = activeReceiveIndent.items.find(
    i => i.stockItemId._id === p.stockItemId
  );

  const balance =
    Number(item.qtyBaseUnit || 0) -
    Number(item.receivedQty || 0);

  return (
    p.status === "approved" &&
    p.receivedQty > 0 &&
    balance > 0
  );
});
    if (payload.length === 0) return toast.error("Enter items to receive");

    const loadingToast = toast.loading("Updating Inventory...");
    try {
      await api.post(`/indent-requests/${activeReceiveIndent._id}/receive`, { items: payload });
      toast.success("Stock received!");
      setIsReceiveView(false);
      setActiveReceiveIndent(null);
      setReceiveItems({});
      await Promise.all([fetchItems(false), fetchIndents()]);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to receive stock");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const handleEditIndent = async (indent) => {
    console.log("EDIT CLICKED:", indent._id);
    setActiveTransactionType("indent");
    setMode("stock");
    const mappedCart = indent.items.map(it => {
  const inventoryItem = items.find(
    x => x._id === it.stockItemId?._id ||
         x.stockRecordId === it.stockItemId?._id
  );

  return {
    stockRecordId: it.stockItemId?._id,
    stockItemId: it.stockItemId?._id,
    name: it.stockItemId?.name || "Unknown Item",
    unit: it.stockItemId?.unitId?.symbol || it.unit || "unit",
    requestedQty: it.qtyBaseUnit || 0,

    image:
      it.stockItemId?.imageUrl ||
      it.stockItemId?.image ||
      inventoryItem?.image ||
      ""
  };
});

    setCart(mappedCart);
    setRequestReason(indent.note || "");
    setRequestDate(new Date(indent.targetDate || indent.createdAt));
setEditIndentId(indent._id);
    setActiveTab("request-builder");
    setIsActivityLogOpen(false);
    await fetchItems(true); 
    setItems(prevItems => {
  // Add missing items from inventory
  const merged = prevItems.map(item => {
    const inCart = mappedCart.find(c => c.stockRecordId === item.stockRecordId);
    return inCart ? { ...item, currentQty: item.currentQty } : item;
  });

  return merged;
});
    setIsCartOpen(true);
  };

  const openStock = () => {
    setActiveTab("stock");
    setActiveTransactionType("usage");
    setMode("stock");
    setCart([]);
    fetchItems(false);
  };

  const openUsage = () => {
    setActiveTab("usage");
    setActiveTransactionType("usage");
    setMode("stock");
    setCart([]);
    fetchItems(false);
  };

  const openSupplyRequest = () => {
    setActiveTab("request-builder");
    setActiveTransactionType("indent");
    setMode("stock");
    setCart([]);
    setRequestReason("");
    setEditIndentId(null);
    fetchItems(true);
  };

  const openDeliveries = () => {
    setSupplyInitialTab("deliveries");
    setActiveTab("requests");
  };

  const openActivity = (tab = "usage") => {
    setLogTab(tab);
    setIsReceiveView(false);
    setIsActivityLogOpen(true);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "home") return;
    if (tab === "stock") return openStock();
    if (tab === "usage") return openUsage();
    if (tab === "requests") {
      setSupplyInitialTab("requests");
      return;
    }
    if (tab === "more") return openActivity("usage");
  };

  const deleteSupplyRequest = async (indent) => {
    if (!indent?._id || !window.confirm("Delete this supply request?")) return;
    try {
      await api.delete(`/indent-requests/${indent._id}`);
      toast.success("Supply request deleted");
      await fetchIndents();
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not delete request");
    }
  };

  const receiveDelivery = (indent) => {
    setActiveReceiveIndent(indent);
    setReceiveItems({});
    setIsReceiveView(true);
    setIsActivityLogOpen(true);
  };

  const usageItems = items.map((item) => {
    const selected = cart.find((entry) => entry.stockRecordId === item.stockRecordId);
    return {
      ...item,
      currentQty: Number(item.currentQty || 0) + Number(selected?.requestedQty || 0),
    };
  });

  const attentionCount =
    requests.filter((request) => request.status === "pending").length +
    indents.filter((indent) =>
      ["confirmed", "partially_received"].includes(indent.status)
    ).length;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 font-sans text-slate-900">
      <KitchenHeader
        kitchenName={userInfo?.godown?.name || "Kitchen"}
        attentionCount={attentionCount}
        onNotificationsClick={() => openActivity("indents")}
        onLogout={handleLogout}
      />

      {activeTab === "home" ? (
        <KitchenHome
          userInfo={userInfo}
          items={items}
          requests={requests}
          indents={indents}
          dailyUsageHistory={dailyUsageHistory}
          orders={orders}
          onRecordUsage={openUsage}
          onViewStock={openStock}
          onRequestSupplies={openSupplyRequest}
          onReceiveDelivery={openDeliveries}
          onOpenActivity={() => openActivity("usage")}
        />
      ) : activeTab === "stock" ? (
        <KitchenStock
          items={items}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filter={stockFilter}
          onFilterChange={setStockFilter}
          onRefresh={() => fetchItems(false)}
          onRecordUsage={(item) => {
            openUsage();
            addToCart(item, 1);
          }}
        />
      ) : activeTab === "usage" ? (
        <KitchenUsageScreen
          items={usageItems}
          loading={loading}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          cart={cart}
          onQuantityChange={addToCart}
          onReview={() => setIsCartOpen(true)}
        />
      ) : activeTab === "requests" ? (
        <SupplyRequestsDeliveries
          key={supplyInitialTab}
          indents={indents}
          loading={loading}
          initialTab={supplyInitialTab}
          onCreateRequest={openSupplyRequest}
          onEditRequest={handleEditIndent}
          onDeleteRequest={deleteSupplyRequest}
          onReceiveDelivery={receiveDelivery}
          refresh={fetchIndents}
        />
      ) : activeTab === "more" ? (
        <main className="max-w-2xl mx-auto p-4 space-y-3">
          <h1 className="text-2xl font-bold">More</h1>
          <p className="text-sm text-gray-500">Activity, transfers and account actions.</p>
          <button type="button" onClick={() => openActivity("usage")} className="w-full text-left bg-white border rounded-2xl p-4 font-bold">Activity history</button>
          <button type="button" onClick={() => openActivity("transfer")} className="w-full text-left bg-white border rounded-2xl p-4 font-bold">Kitchen transfers</button>
          <button type="button" onClick={handleLogout} className="w-full text-left bg-red-50 text-red-700 border border-red-100 rounded-2xl p-4 font-bold">Log out</button>
        </main>
      ) : (
      <>

      <div className="bg-white border-b border-gray-100 p-3 sticky top-[125px] z-30 shadow-sm">
        <div className="max-w-7xl mx-auto">
          {activeTransactionType !== 'usage' && (
              <div className={`mb-3 p-3 rounded-xl flex justify-between items-center ${activeTransactionType === 'indent' ? 'bg-orange-50 border border-orange-100' : 'bg-blue-50 border border-blue-100'}`}>
                <p className={`text-[10px] font-black uppercase ${activeTransactionType === 'indent' ? 'text-orange-700' : 'text-blue-700'}`}>
                  🚀 Mode:
{
activeTransactionType === "indent"
? "Warehouse Indent"
: requestType === "daily_usage"
? "Daily Usage Request"
: "Stock Request"
}
                </p>
                <button
  onClick={() => {
    setActiveTransactionType("usage");
    setRequestType("stock_request");

    
    setEditIndentId(null);
    setRequestReason("");
    setRequestDate(new Date());
    setCart([]);
    setMode("stock");
    fetchItems(false);
   }} className="text-[10px] font-bold text-red-500 underline uppercase">Exit Mode</button>
              </div>
          )}
          <div className="relative">
            <div className="flex gap-2 mb-3">
  <button
  disabled={
    activeTransactionType === "request" &&
    requestType === "daily_usage"
  }
  onClick={() => {
    if (
      activeTransactionType === "request" &&
      requestType === "daily_usage"
    )
      return;

    setMode("stock");
    setCart([]);
  }}
  className={`px-4 py-2 rounded-xl font-bold transition ${
    activeTransactionType === "request" &&
    requestType === "daily_usage"
      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
      : mode === "stock"
      ? "bg-green-600 text-white"
      : "bg-white border"
  }`}
>
  Stock Consumption
</button>

<button
  disabled={
    activeTransactionType === "indent" ||
    (
      activeTransactionType === "request" &&
      requestType === "stock_request"
    )
  }
  onClick={() => {
    if (
      activeTransactionType === "indent" ||
      (
        activeTransactionType === "request" &&
        requestType === "stock_request"
      )
    )
      return;

    setMode("daily");
    setCart([]);
  }}
  className={`px-4 py-2 rounded-xl font-bold transition ${
    activeTransactionType === "indent" ||
    (
      activeTransactionType === "request" &&
      requestType === "stock_request"
    )
      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
      : mode === "daily"
      ? "bg-blue-600 text-white"
      : "bg-white border"
  }`}
>
  Daily Usage
</button>
</div>
            <input type="text" placeholder={`Search items...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-11 text-xs font-bold outline-none" />
            {/* <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> */}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {loading ? (
            <div className="py-20 text-center uppercase font-black text-xs text-gray-400 animate-pulse">Syncing...</div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-8">
            {filteredItems.map((item) =>
  mode === "daily" ? (
    <DailyUsageCard
      key={item.stockItemId}
      item={item}
      onAdd={handleDailyUsageAdd}
    />
  ) : (
    <InventoryCard
      key={item.stockRecordId}
      item={item}
      isRequestMode={activeTransactionType !== "usage"}
      cartQty={
        cart.find(
          c => c.stockRecordId === item.stockRecordId
        )?.requestedQty || 0
      }
      onAddToCart={addToCart}
    />
  )
)}
          </div>
        ) : (
          <div className="py-20 text-center text-gray-400 font-black uppercase text-xs">No items found</div>
        )}
      </main>
      </>
      )}

      {isActivityLogOpen && (
        <div className="fixed inset-0 z-[110] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsActivityLogOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            
            <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                {isReceiveView && (
                  <button onClick={() => setIsReceiveView(false)} className="p-2 bg-gray-100 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                )}
                <h2 className="text-lg font-black uppercase italic">
                  {isReceiveView ? "Receive Stock" : "Activity & History"}
                </h2>
              </div>
              <button onClick={() => setIsActivityLogOpen(false)} className="text-2xl font-light">✕</button>
            </div>

            {!isReceiveView ? (
              <>
                <div className="px-4 py-2 border-b bg-gray-50 flex gap-1 overflow-x-auto">
                    {[
  { id: 'usage', label: 'Usage' },
  { id: 'requests', label: 'Requests' },
  { id: 'indents', label: 'Indents' },
  { id: 'transfer', label: 'Transfer' }
].map((tab) => (
                      <button key={tab.id} onClick={() => { setLogTab(tab.id); setSelectedHistoryDate(""); }} className={`flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${logTab === tab.id ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-400 border-gray-200'}`}>{tab.label}</button>
                    ))}
                </div>
                <div className="px-4 py-3 bg-white border-b">
                   <DatePicker selected={selectedHistoryDate ? new Date(selectedHistoryDate) : null} onChange={(date) => setSelectedHistoryDate(date ? date.toISOString().split('T')[0] : "")} customInput={<CustomDateInput placeholder={`Filter by Date`} />} wrapperClassName="w-full" isClearable />
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {logTab === "transfer" && (
  <div className="space-y-4">

   <div className="space-y-3">

  <button
    onClick={() => {
      setActiveTransactionType("transfer");
      setMode("stock");
      setCart([]);
      setTransferDestination("");
      fetchItems(false);

      setIsActivityLogOpen(false);
    }}
    className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[11px] uppercase"
  >
    + Transfer Stock
  </button>
  

  <UserTransferPage />

</div>

  </div>
)}

                  {logTab === "usage" && (
  <>
    {/* DAILY USAGE */}
  {usageHistory.map(row => (
  <div
    key={`${row.type}-${row._id}`}
    className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"
  >
    <div className="flex justify-between mb-3">

     <div>
  <div className="text-[10px] font-black">
    {new Date(row.historyTime).toLocaleDateString()}
  </div>

  <div className="text-[9px] text-gray-500 font-bold">
    {new Date(row.historyTime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })}
  </div>
</div>

      <span
        className={`text-[8px] font-black px-2 py-1 rounded ${
          row.type === "daily"
            ? "bg-blue-100 text-blue-700"
            : "bg-green-100 text-green-700"
        }`}
      >
        {row.type === "daily"
          ? "DAILY USAGE"
          : "CONSUMPTION"}
      </span>

    </div>

    {row.items.map((it, idx) => (
      <div
        key={idx}
        className="flex items-center text-[10px]"
      >
        <span className="font-medium whitespace-nowrap">
          {it.stockItemId?.name}
        </span>

        <span className="flex-1 border-b border-dotted border-gray-400 mx-2"></span>

        <span className="font-bold whitespace-nowrap">
          {it.qtyBaseUnit}
        </span>
      </div>
    ))}
  </div>
))}
  </>
)}
                    
                    {logTab === 'requests' && (
                        <>
                         <div className="grid grid-cols-2 gap-2 mb-4">

  <button
    onClick={() => {
  setActiveTransactionType("request");
  setRequestType("stock_request");
  setMode("stock");
  setCart([]);
  setIsActivityLogOpen(false);
  fetchItems(false);
}}
    className="bg-blue-600 text-white py-3 rounded-xl font-black text-[11px] uppercase"
  >
    + Stock Request
  </button>

  <button
    onClick={() => {
  setActiveTransactionType("request");
  setRequestType("daily_usage");
  setMode("daily");
  setCart([]);
  setIsActivityLogOpen(false);
  fetchItems(true);
}}
    className="bg-indigo-600 text-white py-3 rounded-xl font-black text-[11px] uppercase"
  >
    + Daily Usage Request
  </button>

</div>
                          
{requests.filter(r =>
  isSameDay(
    r.targetDate || r.createdAt,
    selectedHistoryDate
  )
).map((req) => (
                            
                            <div key={req._id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                <span className={`text-[8px] font-black px-2 py-1 rounded uppercase ${req.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>{req.status}</span>
                                {req.requestType === "daily_usage" ? (
  <span className="ml-2 text-[8px] font-black px-2 py-1 rounded uppercase bg-blue-100 text-blue-700">
    DAILY USAGE
  </span>
) : (
  <span className="ml-2 text-[8px] font-black px-2 py-1 rounded uppercase bg-green-100 text-green-700">
    STOCK REQUEST
  </span>
)}
                                <span className="text-[9px] font-black text-gray-800">
  {new Date(
    req.targetDate || req.createdAt
  ).toLocaleDateString()}
</span>
                                {/* <span className="text-[9px] font-black text-gray-800">{new Date(req.createdAt).toLocaleDateString()}</span> */}
                              </div>
                              <p className="text-[10px] font-bold text-gray-500 mb-2 italic">"{req.reason || 'No reason'}"</p>
                              <div className="space-y-1">
                                {req.items.map((it, idx) => (
  <div
    key={idx}
    className="flex items-center text-[10px] font-black text-blue-600"
  >
    <span className="uppercase whitespace-nowrap">
      {it.stockItemId?.name}
    </span>

    <span className="flex-1 border-b border-dotted border-gray-400 mx-2"></span>

    <span className="whitespace-nowrap">
      {it.qtyBaseUnit} {it.stockItemId?.unitId?.symbol || it.unit}
    </span>
  </div>
))}
                              </div>
                            </div>
                          ))}
                        </>
                    )}

                    {logTab === 'indents' && (
                        <>
                          <button onClick={() => {
  setActiveTransactionType("indent");
  setMode("stock");      // Force Stock mode
  setCart([]);
  setIsActivityLogOpen(false);
  fetchItems(true);
}} className="w-full bg-orange-600 text-white py-3 rounded-xl font-black text-[11px] uppercase shadow-md mb-4">+ Create Indent</button>
                          {indents.filter(i => isSameDay(i.createdAt, selectedHistoryDate)).map((indent) => (
                             <details key={indent._id} className="group bg-white border border-gray-100 rounded-2xl mb-3 shadow-sm overflow-hidden">
                              <summary className="list-none cursor-pointer p-4 flex justify-between items-center">
                                <div className="flex-1">
                                  <span className={`text-[8px] font-black px-2 py-1 rounded uppercase ${
                                    indent.status === 'confirmed' ? 'bg-green-100 text-green-600' : 
                                    (indent.status === 'received' || indent.status === 'partially_received') ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
                                  }`}>
                                    {indent.status.replace('_', ' ')}
                                  </span>
                                  <p className="text-[10px] font-bold text-gray-900 mt-1">Ref: {new Date(indent.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {indent.status === "pending" && (
  <div className="flex gap-1">
                                  {/* {!["confirmed", "received", "partially_received"].includes(indent.status) && (
                                   <div className="flex gap-1"> */}
  <button
    onClick={(e) => {
      e.preventDefault();
      handleEditIndent(indent);
    }}
    className="text-[8px] px-2 py-1 bg-yellow-500 text-white rounded font-black uppercase"
  >
    EDIT
  </button>

  <button
    onClick={async (e) => {
      e.preventDefault();

      if (!window.confirm("Delete this indent?")) return;

      try {
        await api.delete(`/indent-requests/${indent._id}`);
        toast.success("Indent deleted");
        fetchIndents();
      } catch {
        toast.error("Delete failed");
      }
    }}
    className="text-[8px] px-2 py-1 bg-red-600 text-white rounded font-black uppercase"
  >
    DELETE
  </button>
</div>
                                  )}
                                  {indent.items?.some(i => i.status === "approved") &&
 indent.status === "confirmed" && (
                                    <button onClick={(e) => { e.preventDefault(); setActiveReceiveIndent(indent); setIsReceiveView(true); }} className="text-[8px] px-2 py-1 bg-green-600 text-white rounded font-black uppercase">RECEIVE</button>
                                  )}
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-300 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>
                              </summary>
                              <div className="px-4 pb-4 border-t pt-3 bg-gray-50/30">
                                <div className="flex justify-between text-[8px] font-black uppercase text-gray-400 mb-2 px-1">
                                  <span>Item</span>
                                  <div className="flex gap-6">
                                    <span>Ordered</span>
                                    <span>Received</span>
                                  </div>
                                </div>
                                {indent.items.map((it, idx) => (
  <div
    key={`${it.stockItemId?._id || idx}-${idx}`}
    className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
  >
  <span className="text-[10px] font-black uppercase text-gray-700">
    {it.stockItemId?.name}
  </span>

  <div className="flex gap-6 items-center">

    {/* STATUS */}
    <span className={`text-[8px] font-black uppercase px-2 py-1 rounded ${
      it.status === "approved"
        ? "bg-green-100 text-green-600"
        : "bg-red-100 text-red-600"
    }`}>
      {it.status}
    </span>

    {/* ORDERED */}
    <span className="text-[10px] font-bold text-gray-400">
      {Number(it.qtyBaseUnit || 0).toFixed(3)}{" "}
{it.stockItemId?.unitId?.symbol || "unit"}
    </span>

    {/* RECEIVED */}
    <span
  className={`text-[10px] font-black ${
    Number(it.receivedQty) > 0
      ? 'text-green-600'
      : 'text-gray-300'
  }`}
>
  {Number(it.receivedQty || 0).toFixed(3)}{" "}
  {it.stockItemId?.unitId?.symbol || "unit"}
</span>

  </div>
</div>
                                ))}
                              </div>
                             </details>
                          ))}
                        </>
                    )}




                    
                </div>
              </>
            ) : (
              /* RECEIVE VIEW */
              <div className="flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="bg-green-50 p-4 rounded-2xl mb-4 border border-green-100">
                    <p className="text-[10px] font-black text-green-800 uppercase">Updating Kitchen Stock</p>
                    <p className="text-[8px] font-bold text-green-600">Enter physical quantities received from warehouse.</p>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="text-[9px] font-black uppercase text-gray-400 border-b">
                        <th className="pb-2 text-left">Item</th>
                        <th className="pb-2 text-center">Ordered</th>
<th className="pb-2 text-center">Status</th>
<th className="pb-2 text-right">Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
  {activeReceiveIndent?.items
?.filter(item =>
  item.status === "approved" &&
  Number(item.receivedQty || 0) < Number(item.qtyBaseUnit || 0)
)
.map((item) => {
    const isApproved = item.status === "approved";

    return (
                        <tr key={item.stockItemId?._id}>
  <td className="py-4 text-[10px] font-black uppercase leading-tight pr-2">
    {item.stockItemId?.name}
  </td>

  <td className="py-4 text-center text-[10px] font-bold text-gray-500">
    {Number(item.qtyBaseUnit || 0).toFixed(3)}{" "}
{item.stockItemId?.unitId?.symbol || "unit"}
  </td>

  {/* ✅ STATUS */}
  <td className="text-[8px] font-black uppercase text-center">
    {item.status === "approved" && (
      <span className="text-green-600">APPROVED</span>
    )}
    {item.status === "rejected" && (
      <span className="text-red-500">REJECTED</span>
    )}
  </td>

  <td className="py-4 text-right">
<input
  type="number"
  min="0"
  max={Math.max(0, Number(item.qtyBaseUnit || 0) - Number(item.receivedQty || 0))}
  step="0.001"
  value={receiveItems[item.stockItemId?._id] ?? ""}
  disabled={!isApproved}
  placeholder={isApproved ? "0.000" : "Rejected"}
      className={`w-20 p-2 text-right text-xs font-black rounded-xl border ${
        isApproved 
          ? "bg-gray-50 border-gray-200 focus:border-green-500"
          : "bg-red-50 border-red-200 text-red-400 cursor-not-allowed"
      }`}
      onChange={(e) => {
  if (!isApproved) return;

  const raw = e.target.value;

  // Allow only 3 digits after decimal
  if (!/^\d*(\.\d{0,3})?$/.test(raw)) {
    return;
  }

  setReceiveItems(prev => ({
    ...prev,
    [item.stockItemId?._id]: raw
  }));
}}
    />
  </td>
</tr>    );
  }
  
  
  
  
  )}
                    
                    </tbody>
                  </table>
                </div>
                <div className="p-6 border-t bg-white sticky bottom-0">
                  <button onClick={submitReceive} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase italic shadow-xl hover:bg-green-700 transition-colors">
                    Confirm & Update Stock
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- CART DRAWER --- */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[110] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-lg font-black uppercase italic">
{
activeTransactionType === "request"
? requestType === "daily_usage"
    ? "Review Daily Usage Request"
    : "Review Stock Request"
: `Review ${activeTransactionType}`
}
</h2>
              <button onClick={() => { setIsCartOpen(false);  }} className="text-2xl font-light">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeTransactionType !== "usage" && (
                <div className={`p-4 rounded-2xl border space-y-4 ${activeTransactionType === "indent" ? "bg-orange-50 border-orange-100" : "bg-blue-50 border-blue-100"}`}>
                  <DatePicker selected={requestDate} onChange={(date) => setRequestDate(date)} customInput={<CustomDateInput />} wrapperClassName="w-full" />
                  <textarea rows="2" placeholder="Note/Reason..." className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none" value={requestReason} onChange={(e) => setRequestReason(e.target.value)} />
                </div>
              )}
            
              {cart.map(item => (
                <div key={item.stockRecordId} className="flex gap-4 items-center p-3 rounded-2xl border bg-gray-50 border-gray-100">
                    <div className="w-10 h-10 bg-white rounded-xl overflow-hidden flex items-center justify-center border border-gray-200">
                      <img 
                        src={(item.image && item.image !== "null") ? item.image : `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}`} 
                        alt="" 
                        className="w-full h-full object-contain"
                        onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}`; }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase text-gray-800 line-clamp-1">{item.name}</p>
                      <p className="text-[8px] text-gray-400 font-bold uppercase">{item.unit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                           const current =
  parseFloat(
    mode === "daily"
      ? item.qtyBaseUnit
      : item.requestedQty
  ) || 0;
                            // Only allow decrement if > 0
                            if (current > 0) {
  if (mode === "daily") {
    handleDailyUsageAdd(
      item,
      limitTo3Decimals(current - 1)
    );
  } else {
    addToCart(
      item,
      limitTo3Decimals(current - 1)
    );
  }
}
                        }} 
                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-black"
                      >
                        -
                      </button>
                      <input
  type="text"
  inputMode="decimal"
  className="text-[11px] font-black w-12 text-center bg-transparent outline-none"
  value={
    mode === "daily"
      ? item.qtyBaseUnit ?? ""
      : item.requestedQty ?? ""
  }
                        onChange={(e) => {
                          const val = e.target.value;
                          // REGEX PROTECTION: Only allows positive digits and a single dot. 
                          // No '-' allowed.
                          if (
  val === "" ||
  (activeTransactionType === "request"
    ? /^-?\d*(\.\d{0,3})?$/.test(val)
    : /^\d*(\.\d{0,3})?$/.test(val))
) {
  if (mode === "daily") {
  handleDailyUsageAdd(item, val);
} else {
  addToCart(item, val);
}
}
                        }}
                      />
                      <button
  onClick={() => {
    const current =
      parseFloat(
        mode === "daily"
          ? item.qtyBaseUnit
          : item.requestedQty
      ) || 0;

    if (mode === "daily") {
      handleDailyUsageAdd(
        item,
        limitTo3Decimals(current + 1)
      );
    } else {
      addToCart(
        item,
        limitTo3Decimals(current + 1)
      );
    }
  }}
  className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-black"
>
  +
</button>
                      <button
  onClick={() => {
    setCart(prev =>
      prev.filter(i =>
  mode === "daily"
    ? i.stockItemId !== item.stockItemId
    : i.stockRecordId !== item.stockRecordId
)
    );
  }}
  className="w-7 h-7 rounded-lg bg-red-500 text-white flex items-center justify-center text-sm font-black"
>
  ✕
</button>
                    </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
  <div className="p-6 border-t bg-white space-y-3">
{activeTransactionType === "transfer" && (
  <div>
    <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">
      Destination Godown
    </label>

    <select
      value={transferDestination}
      onChange={(e) => setTransferDestination(e.target.value)}
      className="w-full border rounded-xl px-3 py-3 text-xs font-bold"
    >
      <option value="">Select Godown</option>

      {godowns
        .filter(g => g._id !== userInfo?.godown?._id)
        .map(g => (
          <option key={g._id} value={g._id}>
            {g.name}
          </option>
      ))}
    </select>
  </div>
)}
    {activeTransactionType === "usage" && (
      <div>
        <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">
          Select Date
        </label>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) =>
            setSelectedDate(e.target.value)
          }
          className="w-full border rounded-xl px-3 py-3 text-xs font-bold"
        />
      </div>
    )}

    <button
      onClick={handleSubmit}
      className={`w-full py-4 rounded-2xl font-black uppercase italic tracking-widest shadow-xl ${
        activeTransactionType === "indent"
          ? "bg-orange-600"
          : activeTransactionType === "request"
          ? "bg-blue-600"
          : "bg-black"
      } text-white`}
    >
      {
activeTransactionType === "request"
? requestType === "daily_usage"
    ? "Submit Daily Usage Request"
    : "Submit Stock Request"
: `Submit ${activeTransactionType}`
}
    </button>

  </div>
)}
            
          </div>
        </div>
      )}
      <KitchenBottomNav
        activeTab={activeTab === "request-builder" ? "requests" : activeTab}
        onTabChange={handleTabChange}
        requestCount={attentionCount}
      />
    </div>
  );
};

export default ClientStore;








