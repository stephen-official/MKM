import React, { useState, useEffect, useMemo, useRef, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from "../api";
import { toast } from 'react-hot-toast';
import { socket } from "../socket"; 
import { useKitchenChanges, useRefetchOnReturn } from "../liveUpdates";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { UserTransferPage } from "./UserTransferPage";
import KitchenHome from "./kitchen/KitchenHome";
import KitchenHeader from "./kitchen/KitchenHeader";
import KitchenBottomNav from "./kitchen/KitchenBottomNav";
import KitchenStock from "./kitchen/KitchenStock";
import KitchenUsageScreen from "./kitchen/KitchenUsageScreen";
import SupplyRequestsDeliveries from "./kitchen/SupplyRequestsDeliveries";
import KitchenOrders from "./kitchen/KitchenOrders";
import KitchenActivity from "./kitchen/KitchenActivity";
import KitchenTransfers from "./kitchen/KitchenTransfers";
import KitchenReceiveDelivery from "./kitchen/KitchenReceiveDelivery";
import KitchenItemBuilder from "./kitchen/KitchenItemBuilder";
import KitchenReviewPanel from "./kitchen/KitchenReviewPanel";
import KitchenSectionNav from "./kitchen/KitchenSectionNav";
import { isSameLocalDate, localDateFromKey, toLocalDateKey } from "../utils/date";
import { buildReceiptPayload, buildTransactionItems, canRecordUsage } from "../features/kitchen/workflows";
import { withPackaging } from "../features/kitchen";
import { clearSession } from "../utils/session";
import { FEATURE_DISABLED_EVENT, canOpenView, draftFeature, featureForView, fetchKitchenFlags, hiddenTabs as computeHidden, isDraftBlocked, isFeatureOn, isViewHidden, sameFlags, tabTarget } from "../features.js";
import { toastFeatureDisabled } from "../featureToast.js";
import Select from "./ui/Select";
import { useConfirm } from "./ui/ConfirmDialog";
import { hasArriving } from "../features/kitchen/orders";

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
const KITCHEN_VIEWS = new Set(["home", "stock", "usage", "requests", "past-requests", "activity", "transfers"]);
const legacyUiEnabled = import.meta.env.VITE_ENABLE_LEGACY_KITCHEN_UI === "true";
const DISCARD_DRAFT = Object.freeze({
  title: "Discard your unfinished entry?",
  message: "The quantities you entered will be lost.",
  confirmLabel: "Discard",
  cancelLabel: "Keep editing",
  danger: true,
});
const DELETE_REQUEST = Object.freeze({ title: "Delete this request?", message: "This can’t be undone.", confirmLabel: "Delete", danger: true });

const viewFromLocation = () => {
  const view = window.location.hash.replace(/^#\/?/, "");
  return KITCHEN_VIEWS.has(view) ? view : "home";
};

const ClientStore = () => {
  const [activeTab, setActiveTabState] = useState(viewFromLocation);
  const [stockFilter, setStockFilter] = useState("all");
  const [supplyInitialTab, setSupplyInitialTab] = useState("requests");
  const [userInfo, setUserInfo] = useState(null);
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]); 
  // Day-by-day usage account from GET /usage-days (today, missed, days); null while loading or when usage is off.
  const [usageDays, setUsageDays] = useState(null);
  const [requests, setRequests] = useState([]); 
  const [indents, setIndents] = useState([]);
  // Shared orders, kept here only to count deliveries waiting on the header bell and the home screen.
  const [sharedOrders, setSharedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
const [editIndentId, setEditIndentId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(""); 
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [logTab, setLogTab] = useState("usage"); 
const [activeTransactionType, setActiveTransactionType] = useState("usage"); // usage | request | indent | transfer

const [transferDestination, setTransferDestination] = useState("");
const [godowns, setGodowns] = useState([]);
  const [requestReason, setRequestReason] = useState(""); 
  const [requestDate, setRequestDate] = useState(new Date());

  const [isReceiveView, setIsReceiveView] = useState(false);
  const [activeReceiveIndent, setActiveReceiveIndent] = useState(null);
  const [receiveItems, setReceiveItems] = useState({});
  const [receiveDetails, setReceiveDetails] = useState({});
  const [selectedDate, setSelectedDate] = useState(toLocalDateKey());
  const [flags, setFlags] = useState(null);
  const flagsRef = useRef(null);
  const hidden = useMemo(() => computeHidden(flags), [flags]);

  const navigate = useNavigate();
  const [confirm, confirmDialog] = useConfirm();

  // True (after toasting) when the feature behind the view is off, so open* helpers can refuse before changing any state.
  const isBlocked = (view, transactionType) => {
    if (canOpenView(flags, view, transactionType)) return false;
    toastFeatureDisabled(featureForView(view, transactionType));
    return true;
  };

  const setActiveTab = (nextView, options = {}) => {
    // "request-builder" is exempt: its feature depends on the transaction type, which settles after this call,
    // so the redirect effect below evaluates it with current state.
    if (nextView !== "request-builder" && hidden.has(nextView)) {
      toastFeatureDisabled(featureForView(nextView));
      setActiveTabState("home");
      window.history.replaceState({ kitchenView: "home" }, "", `${window.location.pathname}${window.location.search}#/home`);
      return;
    }
    setActiveTabState(nextView);
    const nextUrl = `${window.location.pathname}${window.location.search}#/${nextView}`;
    window.history[options.replace ? "replaceState" : "pushState"]({ kitchenView: nextView }, "", nextUrl);
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
    clearSession();
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
      let res;
     if (isForIndent) {
 res = await api.get("/inventory/stock-items");

const formatted = res.data.map(item => ({
    stockRecordId: item._id,
    _id: item._id,
    name: item.name,
    unit: item.unitId?.symbol || "Units",
    currentQty: item.kitchenQty || 0,
    soldInPacks: Boolean(item.soldInPacks),
    packs: item.packs || [],
    image: item.imageUrl || item.image || ""
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

setItems(formatted);
} else {
        res = await api.get('/my-kitchen-stock'); 
        const formattedItems = res.data.map(item => ({
          // False when the product's catalog details are incomplete or it is archived (see backend catalog/).
          available: item.available !== false,
          archived: Boolean(item.archived),
          stockRecordId: item.stockRecordId, 
          _id: item.stockItemId?._id || item.stockItemId,
          name: item.name || item.stockItemId?.name || "Unknown Item",
          currentQty: Number(item.currentQty) || 0, 
          thresholdBaseUnit: Number(item.thresholdBaseUnit) || 0,
          unit: item.stockItemId?.unitId?.symbol || item.unit || "Units", 
          image: item.image || item.stockItemId?.imageUrl || "",
          soldInPacks: Boolean(item.soldInPacks),
          packs: item.packs || [],
          // Dated lots the kitchen holds, soonest first: [{ date, qtyBaseUnit }] (features/kitchen/expiry.js reads them).
          expiries: Array.isArray(item.expiries) ? item.expiries : [],
          suppliers: Array.isArray(item.suppliers) ? item.suppliers : []
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
  const fetchUsageDays = async () => {
    try {
      const res = await api.get("/usage-days");
      setUsageDays(res.data);
    } catch { setUsageDays(null); }
  };
  const fetchSharedOrders = async () => {
    try {
      const res = await api.get("/procurement/collaborative-purchase-orders", { params: { limit: 100 } });
      setSharedOrders(res.data.items || []);
    } catch { setSharedOrders([]); }
  };
  const fetchMyRequests = async () => {
    try {
      const res = await api.get('/requests');
      setRequests(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch { setRequests([]); }
  };

  // Loads the lists that belong to the given features; disabled features are never requested.
  const fetchFeatureData = (nextFlags, only = null) => {
    const wants = (key) => isFeatureOn(nextFlags, key) && (!only || only.includes(key));
    return Promise.all([
      wants("consumption") && fetchMyOrders(),
      wants("consumption") && fetchUsageDays(),
      wants("requests") && fetchMyRequests(),
      wants("indent") && fetchIndents(),
      wants("purchase-orders") && fetchSharedOrders()
    ]);
  };

  // Applies freshly loaded flags: empties lists of newly disabled features, fetches newly enabled ones.
  const applyFlags = (nextFlags) => {
    const previous = flagsRef.current;
    if (sameFlags(previous, nextFlags)) return;
    flagsRef.current = nextFlags;
    setFlags(nextFlags);
    const newlyOff = (key) => isFeatureOn(previous, key) && !isFeatureOn(nextFlags, key);
    const newlyOn = ["consumption", "requests", "indent", "purchase-orders"].filter((key) => !isFeatureOn(previous, key) && isFeatureOn(nextFlags, key));
    if (newlyOff("consumption")) { setOrders([]); setUsageDays(null); }
    if (newlyOff("requests")) setRequests([]);
    if (newlyOff("indent")) setIndents([]);
    if (newlyOff("purchase-orders")) setSharedOrders([]);
    if (newlyOn.length) fetchFeatureData(nextFlags, newlyOn);
  };

  // Live updates: the server names what changed and only that list is re-fetched (a burst settles into one fetch).
  // Lists of disabled features are never requested. Everything at once after a reconnect, on coming back to the app,
  // and from the header's Refresh button.
  const liveFetchers = {
    stock: () => fetchItems(false),
    orders: () => isFeatureOn(flagsRef.current, "purchase-orders") && fetchSharedOrders(),
    requests: () => isFeatureOn(flagsRef.current, "requests") && fetchMyRequests(),
    usage: () => isFeatureOn(flagsRef.current, "consumption") && Promise.all([fetchMyOrders(), fetchUsageDays()]),
    indents: () => isFeatureOn(flagsRef.current, "indent") && fetchIndents(),
    flags: () => fetchKitchenFlags().then(applyFlags).catch(() => {}),
  };
  useKitchenChanges(Object.keys(liveFetchers), (topic) => liveFetchers[topic]?.());
  const [refreshing, setRefreshing] = useState(false);
  const refetchAll = async () => {
    setRefreshing(true);
    try { await Promise.all([fetchItems(false), fetchFeatureData(flagsRef.current), liveFetchers.flags()]); } finally { setRefreshing(false); }
  };
  useRefetchOnReturn(refetchAll);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const loadFlags = fetchKitchenFlags().catch(() => null).then((loaded) => {
        flagsRef.current = loaded;
        setFlags(loaded);
        return loaded;
      });
      await Promise.all([
        fetchUserInfo(),
        fetchItems(false),
        fetchGodowns(),
        loadFlags.then((loaded) => fetchFeatureData(loaded))
      ]);
      setLoading(false);
    };
    init();
    // Mount-only load; the fetch helpers are re-created every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pick up admin changes to this kitchen's features on focus and whenever the server reports a disabled feature
  // (coming back to the app re-fetches everything, flags included: see useRefetchOnReturn above).
  useEffect(() => {
    let inFlight = false;
    const refreshFlags = () => {
      if (inFlight) return;
      inFlight = true;
      fetchKitchenFlags().then(applyFlags).catch(() => {}).finally(() => { inFlight = false; });
    };
    window.addEventListener("focus", refreshFlags);
    window.addEventListener(FEATURE_DISABLED_EVENT, refreshFlags);
    return () => {
      window.removeEventListener("focus", refreshFlags);
      window.removeEventListener(FEATURE_DISABLED_EVENT, refreshFlags);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applyFlags only touches refs and state setters
  }, []);

  const hasDraft = cart.some((item) => Number(item.requestedQty) > 0);

  // A view can become hidden after load (deep link, or flags changed on focus): fall back to home.
  // A draft whose feature was switched off is dropped silently (nothing visible to discard) so it cannot
  // trigger "Discard your unfinished draft?" prompts or the beforeunload warning. applyFlags feeds this via `flags`.
  useEffect(() => {
    const viewHidden = isViewHidden(flags, activeTab, activeTransactionType);
    const draftBlocked = hasDraft && isDraftBlocked(flags, activeTransactionType);
    if (!viewHidden && !draftBlocked) return;
    toastFeatureDisabled(viewHidden ? featureForView(activeTab, activeTransactionType) : draftFeature(activeTransactionType));
    if (draftBlocked) {
      setCart([]);
      setRequestReason("");
      setEditIndentId(null);
      setTransferDestination("");
      setActiveTransactionType("usage");
    }
    if (viewHidden) {
      setActiveTabState("home");
      window.history.replaceState({ kitchenView: "home" }, "", `${window.location.pathname}${window.location.search}#/home`);
    }
  }, [flags, activeTab, activeTransactionType, hasDraft]);

  useEffect(() => {
    const warnBeforeLeaving = (event) => {
      if (!hasDraft) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [hasDraft]);

  useEffect(() => {
    const handleHistoryNavigation = () => {
      const nextView = viewFromLocation();
      if (nextView === activeTab) return;
      if (hasDraft) {
        // Stay on this screen while asking; move only if the cook agrees to lose the draft.
        const currentUrl = `${window.location.pathname}${window.location.search}#/${activeTab}`;
        window.history.pushState({ kitchenView: activeTab }, "", currentUrl);
        confirm(DISCARD_DRAFT).then((discard) => {
          if (!discard) return;
          setCart([]);
          setActiveTabState(nextView);
          window.history.pushState({ kitchenView: nextView }, "", `${window.location.pathname}${window.location.search}#/${nextView}`);
        });
        return;
      }
      setActiveTabState(nextView);
    };
    window.addEventListener("popstate", handleHistoryNavigation);
    return () => window.removeEventListener("popstate", handleHistoryNavigation);
  }, [activeTab, hasDraft, confirm]);

  // Products a kitchen may pick for usage, requests and transfers; the stock screen still lists the rest.
  const usableItems = useMemo(() => items.filter((item) => item.available !== false), [items]);

  const filteredItems = useMemo(() => {
  return usableItems.filter(item =>
    item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );
}, [
  usableItems,
  searchQuery,
]);


const usageHistory = useMemo(() => {
  return orders.map(order => ({
    ...order,
    type: "consumption",
    historyTime: order.createdAt
  }))
    .filter(row =>
      isSameLocalDate(
        row.date || row.createdAt,
        selectedHistoryDate
      )
    )
    .sort(
      (a, b) =>
        new Date(b.historyTime) -
        new Date(a.historyTime)
    );
}, [orders, selectedHistoryDate]);

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
      const targetItem = items.find(i => i.stockRecordId === product.stockRecordId);

      // Inventory is server state. Keep it immutable while a usage draft is
      // edited and derive the projected balance in the usage screen. A count in bags is compared in kilograms.
      const packSize = product.packId && Number(product.packSize) > 0 ? Number(product.packSize) : 1;
      if (!targetItem || !canRecordUsage(targetItem.currentQty, parsedQty * packSize)) {
        return toast.error("Insufficient Kitchen Stock");
      }
    }
    if (activeTransactionType === "transfer" && parsedQty > Number(product.currentQty || 0)) {
      return toast.error("Transfer quantity exceeds available stock");
    }
    updateCartState(product, parsedQty);
  };

  const updateCartState = (product, qty) => {
    setCart(prev => {
      const exists = prev.find(i => i.stockRecordId === product.stockRecordId);
      if (exists) {
       
        // A product that arrives with a pack chosen (bags on the Use screen) brings that pack onto the existing entry.
        const pack = product.packId ? { packId: product.packId, packName: product.packName, packSize: product.packSize } : {};
        return prev.map(i => i.stockRecordId === product.stockRecordId ? { ...i, ...pack, requestedQty: qty } : i);
      }
      return [...prev, { ...product, requestedQty: qty, unit: product.unit }];
    });
  };

  const updateCartPackaging = (product, packId) => {
    setCart((previous) => {
      const exists = previous.some((item) => item.stockRecordId === product.stockRecordId);
      if (!exists) return [...previous, { ...withPackaging(product, packId), requestedQty: "", unit: product.unit }];
      return previous.map((item) => item.stockRecordId === product.stockRecordId
        ? { ...withPackaging({ ...item, packs: product.packs, soldInPacks: product.soldInPacks }, packId), requestedQty: "" }
        : item);
    });
  };


  const handleSubmit = async () => {

  console.log("===== SUBMIT =====");
  if (activeTransactionType === "usage" && !selectedDate) {
    return toast.error("Select a usage date");
  }
  console.log("editIndentId =", editIndentId);
  console.log("activeTransactionType =", activeTransactionType);
    const validItems = buildTransactionItems(cart, "stock", { allowNegative: activeTransactionType === "request" });

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
  setActiveTransactionType("usage");
  setActiveTab("more");

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

  toast.success("Supply request updated");
} else {
  await api.post(
    "/indent-requests",
    payload
  );

  toast.success("Supply request sent");
}
       
      } else if (activeTransactionType === "request") {

  await api.post("/requests", {
    requestType: "usage",
    items: validItems,
    reason: requestReason,
    targetDate: requestDate.toISOString()
  });

  toast.success("Usage Request Sent!");
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
      if (activeTransactionType === "indent") {
        setSupplyInitialTab("requests");
        setActiveTab("past-requests");
      }
      setActiveTransactionType("usage");
      await Promise.all([fetchItems(false), fetchIndents(), fetchMyRequests(), fetchMyOrders()]);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const submitReceive = async () => {
   const payload = buildReceiptPayload(activeReceiveIndent, receiveItems, receiveDetails);
    if (payload.length === 0) return toast.error("Enter items to receive");

    const loadingToast = toast.loading("Updating Inventory...");
    try {
      await api.post(`/indent-requests/${activeReceiveIndent._id}/receive`, { items: payload });
      toast.success("Stock received!");
      setIsReceiveView(false);
      setActiveReceiveIndent(null);
      setReceiveItems({});
      setReceiveDetails({});
      setSupplyInitialTab("deliveries");
      setActiveTab("past-requests");
      await Promise.all([fetchItems(false), fetchIndents()]);
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || "Failed to receive stock");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const handleEditIndent = async (indent) => {
    console.log("EDIT CLICKED:", indent._id);
    setActiveTransactionType("indent");
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
    ...(it.packId ? {
      requestedQty: it.packQuantity,
      packId: it.packId,
      packName: it.packName,
      packSize: it.packSize,
    } : {}),
    soldInPacks: Boolean(inventoryItem?.soldInPacks || it.stockItemId?.soldInPacks),
    packs: inventoryItem?.packs || it.stockItemId?.packs || [],

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

  // Asks before an unfinished draft is thrown away; runs `proceed` when there is none or the cook agrees.
  const leaveDraft = async (proceed) => {
    if (hasDraft && !(await confirm(DISCARD_DRAFT))) return false;
    return proceed();
  };

  const openStock = (skipDraftCheck = false) => {
    const go = () => {
      setActiveTab("stock");
      setActiveTransactionType("usage");
      setCart([]);
      fetchItems(false);
      return true;
    };
    return skipDraftCheck === true ? go() : leaveDraft(go);
  };

  // date: the usage date to start on (Home's missed-days list opens a past day).
  const openUsage = (skipDraftCheck = false, date = toLocalDateKey()) => {
    if (isBlocked("usage")) return false;
    const go = () => {
      setActiveTab("usage");
      setActiveTransactionType("usage");
      setCart([]);
      setSelectedDate(date);
      fetchItems(false);
      return true;
    };
    return skipDraftCheck === true || activeTab === "usage" ? go() : leaveDraft(go);
  };

  // "No usage today" (or on a missed day): the day counts as accounted for. Recording usage later replaces the mark.
  const markNoUsage = async (date, reason) => {
    try {
      await api.post("/usage-days/none", { date, reason });
      toast.success(date === toLocalDateKey() ? "Marked: no usage today" : "Marked as a day with no usage");
      await fetchUsageDays();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not mark the day. Try again.");
      return false;
    }
  };
  const undoNoUsage = async (date) => {
    try {
      await api.delete(`/usage-days/none/${date}`);
      await fetchUsageDays();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not undo. Try again.");
      return false;
    }
  };

  const openDeliveries = () => {
    if (isBlocked("past-requests")) return false;
    return leaveDraft(() => {
      setCart([]);
      setSupplyInitialTab("deliveries");
      setActiveTab("past-requests");
      return true;
    });
  };

  // "Ask for supplies": shared orders, where every new request now starts.
  const openOrders = () => {
    if (isBlocked("requests")) return false;
    return leaveDraft(() => {
      setCart([]);
      setActiveTab("requests");
      return true;
    });
  };

  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    leaveDraft(() => {
      setCart([]);
      const target = tabTarget(tab);
      if (!target) return;
      if (target.view === "stock") return openStock(true);
      if (target.view === "usage") return openUsage(true);
      if (target.supplyTab) setSupplyInitialTab(target.supplyTab);
      setActiveTab(target.view);
    });
  };

  const deleteSupplyRequest = async (indent) => {
    if (!indent?._id || !(await confirm(DELETE_REQUEST))) return;
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
    setReceiveDetails({});
    setActiveTab("receive-delivery");
  };

  const usageItems = usableItems;

  const oldDeliveriesWaiting = indents.filter((indent) =>
    ["confirmed", "partially_received"].includes(indent.status)
  ).length;
  const sharedToReceive = sharedOrders.filter((order) => hasArriving(order, userInfo?.godown?._id)).length;
  const attentionCount =
    requests.filter((request) => request.status === "pending").length + oldDeliveriesWaiting + sharedToReceive;

  // Deliveries now arrive through shared orders; only an old-style delivery on its own still opens Past requests.
  const openWaitingDeliveries = () => (oldDeliveriesWaiting > 0 && sharedToReceive === 0 ? openDeliveries() : openOrders());

  return (
    <div className="kitchen-app-shell min-h-screen bg-[#F8F9FA] pb-24 font-sans text-slate-900">
      {confirmDialog}
      <KitchenHeader
        kitchenName={userInfo?.godown?.name || "Kitchen"}
        attentionCount={attentionCount}
        onNotificationsClick={openWaitingDeliveries}
        onLogout={handleLogout}
        onRefresh={refetchAll}
        refreshing={refreshing}
      />

      {activeTab === "home" ? (
        <KitchenHome
          userInfo={userInfo}
          items={items}
          requests={requests}
          indents={indents}
          orders={orders}
          sharedOrders={sharedOrders}
          onRecordUsage={openUsage}
          onRecordUsageOn={(date) => openUsage(false, date)}
          usageDays={usageDays}
          onNoUsage={markNoUsage}
          onUndoNoUsage={undoNoUsage}
          onViewStock={openStock}
          onRequestSupplies={openOrders}
          sharedToReceive={sharedToReceive}
          hidden={hidden}
        />
      ) : activeTab === "stock" ? (
        <>
          <KitchenSectionNav
            label="Stock sections"
            value="stock"
            items={[
              { value: "stock", label: "Stock levels" },
              ...(!hidden.has("transfers") ? [{ value: "transfers", label: "Transfers" }] : [])
            ]}
            onChange={(view) => setActiveTab(view)}
          />
          <KitchenStock
            items={items}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filter={stockFilter}
            onFilterChange={setStockFilter}
            hidden={hidden}
            canRequestProduct={isFeatureOn(flags, "products")}
          />
        </>
      ) : activeTab === "usage" ? (
        <>
          <KitchenSectionNav
            label="Usage sections"
            value="usage"
            items={[{ value: "usage", label: "Record usage" }, { value: "activity", label: "History" }]}
            onChange={(view) => setActiveTab(view)}
          />
          <KitchenUsageScreen
            items={usageItems}
            loading={loading}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            cart={cart}
            onQuantityChange={addToCart}
            onPackagingChange={updateCartPackaging}
            onClear={() => setCart([])}
            onSubmit={handleSubmit}
            onReview={() => setIsCartOpen(true)}
          />
        </>
      ) : activeTab === "requests" ? (
        <KitchenOrders
          products={usableItems}
          onOrdersLoaded={setSharedOrders}
          godownId={userInfo?.godown?._id}
          canShowPast={!hidden.has("past-requests")}
          onShowPast={() => { setSupplyInitialTab("requests"); setActiveTab("past-requests"); }}
        />
      ) : activeTab === "past-requests" ? (
        <SupplyRequestsDeliveries
          key={supplyInitialTab}
          indents={indents}
          loading={loading}
          initialTab={supplyInitialTab}
          onBack={openOrders}
          onEditRequest={handleEditIndent}
          onDeleteRequest={deleteSupplyRequest}
          onReceiveDelivery={receiveDelivery}
          refresh={fetchIndents}
        />
      ) : activeTab === "activity" ? (
        <>
          <KitchenSectionNav
            label="Usage sections"
            value="activity"
            items={[{ value: "usage", label: "Record usage" }, { value: "activity", label: "History" }]}
            onChange={(view) => setActiveTab(view)}
          />
          <KitchenActivity entries={usageHistory} />
        </>
      ) : activeTab === "transfers" ? (
        <>
          <KitchenSectionNav
            label="Stock sections"
            value="transfers"
            items={[{ value: "stock", label: "Stock levels" }, { value: "transfers", label: "Transfers" }]}
            onChange={(view) => setActiveTab(view)}
          />
          <KitchenTransfers
            onCreate={() => {
              setActiveTransactionType("transfer");
              setActiveTab("request-builder");
              setCart([]);
              setTransferDestination("");
              fetchItems(false);
            }}
          />
        </>
      ) : activeTab === "receive-delivery" ? (
        <KitchenReceiveDelivery
          indent={activeReceiveIndent}
          values={receiveItems}
          details={receiveDetails}
          onChange={(stockItemId, raw, remaining) => {
            if (!/^\d*(\.\d{0,3})?$/.test(raw)) return;
            if (raw !== "" && Number(raw) > remaining) {
              toast.error(`Only ${remaining.toFixed(3)} remains to receive`);
              return;
            }
            setReceiveItems((previous) => ({ ...previous, [stockItemId]: raw }));
          }}
          onDetailsChange={(stockItemId, change) => setReceiveDetails((previous) => ({
            ...previous,
            [stockItemId]: { ...previous[stockItemId], ...change },
          }))}
          onBack={() => {
            setActiveReceiveIndent(null);
            setReceiveItems({});
            setReceiveDetails({});
            openDeliveries();
          }}
          onSubmit={submitReceive}
        />
      ) : (
        <KitchenItemBuilder
          type={activeTransactionType}
          items={filteredItems}
          cart={cart}
          loading={loading}
          search={searchQuery}
          onSearch={setSearchQuery}
          onQuantityChange={addToCart}
          onPackagingChange={updateCartPackaging}
          onCancel={() => {
            setCart([]);
            setEditIndentId(null);
            setActiveTab(activeTransactionType === "transfer" ? "transfers" : "past-requests");
          }}
          destination={transferDestination}
          destinations={godowns}
          currentGodownId={userInfo?.godown?._id}
          onDestinationChange={setTransferDestination}
          onClear={() => setCart([])}
          onSubmit={handleSubmit}
          onReview={() => setIsCartOpen(true)}
        />
      )}

      {legacyUiEnabled && isActivityLogOpen && (
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
                   <DatePicker selected={selectedHistoryDate ? localDateFromKey(selectedHistoryDate) : null} onChange={(date) => setSelectedHistoryDate(date ? toLocalDateKey(date) : "")} customInput={<CustomDateInput placeholder={`Filter by Date`} />} wrapperClassName="w-full" isClearable />
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {logTab === "transfer" && (
  <div className="space-y-4">

   <div className="space-y-3">

  <button
    onClick={() => {
      setActiveTransactionType("transfer");
      setActiveTab("request-builder");
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
                         {isFeatureOn(flags, "requests") && <div className="grid grid-cols-1 gap-2 mb-4">

  <button
    onClick={() => {
  setActiveTransactionType("request");
  setCart([]);
  setIsActivityLogOpen(false);
  fetchItems(false);
}}
    className="bg-blue-600 text-white py-3 rounded-xl font-black text-[11px] uppercase"
  >
    + Usage Request
  </button>

</div>}
                          
{requests.filter(r =>
  isSameLocalDate(
    r.targetDate || r.createdAt,
    selectedHistoryDate
  )
).map((req) => (
                            
                            <div key={req._id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                <span className={`text-[8px] font-black px-2 py-1 rounded uppercase ${req.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>{req.status}</span>
  <span className="ml-2 text-[8px] font-black px-2 py-1 rounded uppercase bg-green-100 text-green-700">
    USAGE REQUEST
  </span>
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
  setCart([]);
  setIsActivityLogOpen(false);
  fetchItems(true);
}} className="w-full bg-orange-600 text-white py-3 rounded-xl font-black text-[11px] uppercase shadow-md mb-4">+ Create Indent</button>
                          {indents.filter(i => isSameLocalDate(i.createdAt, selectedHistoryDate)).map((indent) => (
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

      if (!(await confirm(DELETE_REQUEST))) return;

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
    const stockItemId = String(item.stockItemId?._id || item.stockItemId);
    const remainingQuantity = Math.max(
      0,
      Number(item.qtyBaseUnit || 0) - Number(item.receivedQty || 0)
    );

    return (
                        <tr key={stockItemId}>
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
  max={remainingQuantity}
  step="0.001"
  value={receiveItems[stockItemId] ?? ""}
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

  if (raw !== "" && Number(raw) > remainingQuantity) {
    toast.error(`Only ${remainingQuantity.toFixed(3)} remains to receive`);
    return;
  }

  setReceiveItems(prev => ({
    ...prev,
    [stockItemId]: raw
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
      {legacyUiEnabled && isCartOpen && (
        <div className="fixed inset-0 z-[110] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-lg font-black uppercase italic">
{
activeTransactionType === "request"
? "Review Usage Request"
: activeTransactionType === "indent"
? "Review Supply Request"
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
                           const current = parseFloat(item.requestedQty) || 0;
                            // Only allow decrement if > 0
                            if (current > 0) {
    addToCart(
      item,
      limitTo3Decimals(current - 1)
    );
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
  value={item.requestedQty ?? ""}
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
  addToCart(item, val);
}
                        }}
                      />
                      <button
  onClick={() => {
    const current = parseFloat(item.requestedQty) || 0;
      addToCart(
        item,
        limitTo3Decimals(current + 1)
      );
  }}
  className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-black"
>
  +
</button>
                      <button
  onClick={() => {
    setCart(prev =>
      prev.filter(i => i.stockRecordId !== item.stockRecordId)
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

    <Select
      value={transferDestination}
      onChange={(e) => setTransferDestination(e.target.value)}
    >
      <option value="">Select Godown</option>

      {godowns
        .filter(g => g._id !== userInfo?.godown?._id)
        .map(g => (
          <option key={g._id} value={g._id}>
            {g.name}
          </option>
      ))}
    </Select>
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
          max={toLocalDateKey()}
          required
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
? "Submit Usage Request"
: activeTransactionType === "indent"
? editIndentId ? "Update Supply Request" : "Submit Supply Request"
: `Submit ${activeTransactionType}`
}
    </button>

  </div>
)}
            
          </div>
        </div>
      )}
      {isCartOpen && (
        <KitchenReviewPanel
          type={activeTransactionType}
          items={cart}
          usageDate={selectedDate}
          onUsageDateChange={setSelectedDate}
          requestDate={toLocalDateKey(requestDate)}
          onRequestDateChange={(value) => setRequestDate(localDateFromKey(value) || new Date())}
          reason={requestReason}
          onReasonChange={setRequestReason}
          destination={transferDestination}
          onDestinationChange={setTransferDestination}
          destinations={godowns}
          currentGodownId={userInfo?.godown?._id}
          onQuantityChange={addToCart}
          onRemove={(item) => setCart((previous) => previous.filter((entry) => entry.stockRecordId !== item.stockRecordId))}
          onClose={() => setIsCartOpen(false)}
          onSubmit={handleSubmit}
        />
      )}
      <KitchenBottomNav
        activeTab={
          activeTab === "request-builder"
              ? activeTransactionType === "transfer" ? "stock" : "requests"
            : activeTab === "activity" ? "usage"
            : activeTab === "transfers" ? "stock"
            : ["receive-delivery", "past-requests"].includes(activeTab) ? "requests"
            : activeTab
        }
        onTabChange={handleTabChange}
        requestCount={attentionCount}
        hiddenTabs={hidden}
      />
    </div>
  );
};

export default ClientStore;








