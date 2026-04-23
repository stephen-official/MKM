

// // // // // // // // // // import React, { useState, useEffect, useMemo, forwardRef } from 'react';
// // // // // // // // // // import { useNavigate } from 'react-router-dom';
// // // // // // // // // // import { api } from "../api";
// // // // // // // // // // import { toast } from 'react-hot-toast';
// // // // // // // // // // import { socket } from "../socket"; 
// // // // // // // // // // import InventoryCard from './InventoryCard';
// // // // // // // // // // import DatePicker from "react-datepicker";
// // // // // // // // // // import "react-datepicker/dist/react-datepicker.css";

// // // // // // // // // // // --- Sub-Components ---
// // // // // // // // // // const CustomDateInput = forwardRef(({ value, onClick, placeholder }, ref) => (
// // // // // // // // // //   <button
// // // // // // // // // //     className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-xs font-bold text-gray-800 flex items-center justify-between hover:border-blue-500 transition-all active:scale-[0.98] shadow-sm"
// // // // // // // // // //     onClick={onClick}
// // // // // // // // // //     ref={ref}
// // // // // // // // // //   >
// // // // // // // // // //     <span>{value || placeholder || "Select Date"}</span>
// // // // // // // // // //     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // // // // // // // // //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
// // // // // // // // // //     </svg>
// // // // // // // // // //   </button>
// // // // // // // // // // ));

// // // // // // // // // // export const ClientStore = () => {
// // // // // // // // // //   // --- State: Data ---
// // // // // // // // // //   const [items, setItems] = useState([]);
// // // // // // // // // //   const [cart, setCart] = useState([]);
// // // // // // // // // //   const [orders, setOrders] = useState([]); 
// // // // // // // // // //   const [requests, setRequests] = useState([]); 
// // // // // // // // // //   const [loading, setLoading] = useState(true);

// // // // // // // // // //   // --- State: UI & Filters ---
// // // // // // // // // //   const [selectedHistoryDate, setSelectedHistoryDate] = useState(""); 
// // // // // // // // // //   const [isCartOpen, setIsCartOpen] = useState(false);
// // // // // // // // // //   const [isOrdersOpen, setIsOrdersOpen] = useState(false); 
// // // // // // // // // //   const [isRequestsOpen, setIsRequestsOpen] = useState(false); 

// // // // // // // // // //   // --- State: Request Mode Specifics ---
// // // // // // // // // //   const [isRequestMode, setIsRequestMode] = useState(false); 
// // // // // // // // // //   const [requestReason, setRequestReason] = useState(""); 
// // // // // // // // // //   const [requestDate, setRequestDate] = useState(new Date());

// // // // // // // // // //   const navigate = useNavigate();

// // // // // // // // // //   // --- Logout Logic ---
// // // // // // // // // //   const handleLogout = () => {
// // // // // // // // // //     // 1. Clear local storage/cookies
// // // // // // // // // //     localStorage.removeItem("token"); 
// // // // // // // // // //     // 2. Disconnect socket
// // // // // // // // // //     socket.disconnect();
// // // // // // // // // //     // 3. Notify user
// // // // // // // // // //     toast.success("Logged out successfully");
// // // // // // // // // //     // 4. Redirect
// // // // // // // // // //     navigate("/login");
// // // // // // // // // //   };

// // // // // // // // // //   useEffect(() => {
// // // // // // // // // //     const init = async () => {
// // // // // // // // // //       await Promise.all([fetchItems(), fetchMyOrders(), fetchMyRequests()]);
// // // // // // // // // //       setLoading(false);
// // // // // // // // // //     };
// // // // // // // // // //     init();
    
// // // // // // // // // //     socket.on("low_stock_alert", (data) => {
// // // // // // // // // //       toast.error(`⚠️ ${data.payload.message}`, {
// // // // // // // // // //         duration: 6000,
// // // // // // // // // //         position: "top-right",
// // // // // // // // // //         style: { border: '2px solid #ef4444', padding: '16px', fontWeight: '900', background: '#fff', color: '#000' }
// // // // // // // // // //       });
// // // // // // // // // //     });
    
// // // // // // // // // //     return () => socket.off("low_stock_alert");
// // // // // // // // // //   }, [navigate]);

// // // // // // // // // //   // --- API Fetchers ---
// // // // // // // // // //   const fetchItems = async () => {
// // // // // // // // // //     try {
// // // // // // // // // //       const res = await api.get('/my-kitchen-stock'); 
// // // // // // // // // //       const formattedItems = res.data.map(item => ({
// // // // // // // // // //         stockRecordId: item.stockRecordId, 
// // // // // // // // // //         _id: item.stockItemId?._id || item.stockItemId,
// // // // // // // // // //         name: item.name || item.stockItemId?.name || "Unknown Item",
// // // // // // // // // //         currentQty: Number(item.currentQty) || 0, 
// // // // // // // // // //         unit: item.unit || item.stockItemId?.unit || "Units", 
// // // // // // // // // //         image: item.image || item.stockItemId?.image || ""
// // // // // // // // // //       })).sort((a, b) => a.name.localeCompare(b.name));
// // // // // // // // // //       setItems(formattedItems);
// // // // // // // // // //     } catch (err) {
// // // // // // // // // //       console.error("Fetch Error:", err);
// // // // // // // // // //       toast.error("Failed to sync inventory");
// // // // // // // // // //     }
// // // // // // // // // //   };

// // // // // // // // // //   const fetchMyOrders = async () => {
// // // // // // // // // //     try {
// // // // // // // // // //       const res = await api.get('/consumptions/me');
// // // // // // // // // //       setOrders(res.data);
// // // // // // // // // //     } catch (err) { console.error("Failed to fetch orders"); }
// // // // // // // // // //   };

// // // // // // // // // //   const fetchMyRequests = async () => {
// // // // // // // // // //     try {
// // // // // // // // // //       const res = await api.get('/requests');
// // // // // // // // // //       setRequests(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
// // // // // // // // // //     } catch (err) { console.error("Failed to fetch requests"); }
// // // // // // // // // //   };

// // // // // // // // // //   // --- Logic Helpers ---
// // // // // // // // // //   const getItemDetails = (id, fallbackObj) => {
// // // // // // // // // //     const found = items.find(i => i.stockRecordId === id || i._id === id);
// // // // // // // // // //     if (found) return found;
// // // // // // // // // //     return {
// // // // // // // // // //       name: fallbackObj.name || fallbackObj.stockItemId?.name || "Unknown Item",
// // // // // // // // // //       unit: fallbackObj.unit || fallbackObj.stockItemId?.unit || "Units", 
// // // // // // // // // //       image: fallbackObj.image || fallbackObj.stockItemId?.image || "",
// // // // // // // // // //       stockRecordId: fallbackObj.stockRecordId,
// // // // // // // // // //       _id: fallbackObj.stockItemId?._id || id
// // // // // // // // // //     };
// // // // // // // // // //   };

// // // // // // // // // //   const filteredOrders = useMemo(() => {
// // // // // // // // // //     if (!orders) return [];
// // // // // // // // // //     let list = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // // // // //     if (!selectedHistoryDate) return list;
// // // // // // // // // //     return list.filter(order => new Date(order.createdAt).toISOString().split('T')[0] === selectedHistoryDate);
// // // // // // // // // //   }, [orders, selectedHistoryDate]);

// // // // // // // // // //   // --- Action Handlers ---
// // // // // // // // // //   const startNewRequest = () => {
// // // // // // // // // //     setIsRequestMode(true);
// // // // // // // // // //     setCart([]);
// // // // // // // // // //     setRequestReason("");
// // // // // // // // // //     setRequestDate(new Date());
// // // // // // // // // //     setIsRequestsOpen(false);
// // // // // // // // // //     toast("Pick items for your request", { icon: '📅' });
// // // // // // // // // //   };

// // // // // // // // // //   const addToCart = (product, newRequestedQty) => {
// // // // // // // // // //     const sanitizedQty = Math.max(0, parseInt(newRequestedQty, 10) || 0);
// // // // // // // // // //     const existingInCart = cart.find(i => i.stockRecordId === product.stockRecordId);
// // // // // // // // // //     const oldQty = existingInCart ? Number(existingInCart.requestedQty) || 0 : 0;
// // // // // // // // // //     const diff = sanitizedQty - oldQty;

// // // // // // // // // //     const targetItem = items.find(i => i.stockRecordId === product.stockRecordId);
    
// // // // // // // // // //     if (!isRequestMode && diff > 0 && (!targetItem || targetItem.currentQty < diff)) {
// // // // // // // // // //         return toast.error("Insufficient Stock");
// // // // // // // // // //     }

// // // // // // // // // //     if (sanitizedQty <= 0) {
// // // // // // // // // //       removeFromCart(product);
// // // // // // // // // //       return;
// // // // // // // // // //     }

// // // // // // // // // //     if (!isRequestMode) {
// // // // // // // // // //       setItems(prev => prev.map(item =>
// // // // // // // // // //         item.stockRecordId === product.stockRecordId ? { ...item, currentQty: item.currentQty - diff } : item
// // // // // // // // // //       ));
// // // // // // // // // //     }

// // // // // // // // // //     setCart(prev => {
// // // // // // // // // //       if (existingInCart) return prev.map(i => i.stockRecordId === product.stockRecordId ? { ...i, requestedQty: sanitizedQty } : i);
// // // // // // // // // //       return [...prev, { ...product, requestedQty: sanitizedQty }];
// // // // // // // // // //     });
// // // // // // // // // //   };

// // // // // // // // // //   const removeFromCart = (itemToRemove) => {
// // // // // // // // // //     if (!isRequestMode) {
// // // // // // // // // //       setItems(prev => prev.map(item =>
// // // // // // // // // //         item.stockRecordId === itemToRemove.stockRecordId 
// // // // // // // // // //         ? { ...item, currentQty: item.currentQty + (Number(itemToRemove.requestedQty) || 0) } : item
// // // // // // // // // //       ));
// // // // // // // // // //     }
// // // // // // // // // //     setCart(prev => prev.filter(i => i.stockRecordId !== itemToRemove.stockRecordId));
// // // // // // // // // //   };

// // // // // // // // // //   const handleSubmitOrder = async () => {
// // // // // // // // // //     const validItems = cart.map(item => ({
// // // // // // // // // //       stockItemId: item._id,
// // // // // // // // // //       qtyBaseUnit: Number(item.requestedQty), 
// // // // // // // // // //       stockRecordId: item.stockRecordId 
// // // // // // // // // //     })).filter(it => it.qtyBaseUnit > 0);

// // // // // // // // // //     if (validItems.length === 0) return toast.error("Please add items");
// // // // // // // // // //     if (isRequestMode && !requestReason.trim()) return toast.error("Please provide a reason");

// // // // // // // // // //     const loadingToast = toast.loading("Processing...");
// // // // // // // // // //     try {
// // // // // // // // // //       const endpoint = isRequestMode ? '/requests' : '/orders'; 
// // // // // // // // // //       const payload = isRequestMode ? {
// // // // // // // // // //         items: validItems,
// // // // // // // // // //         reason: requestReason,
// // // // // // // // // //         targetDate: requestDate.toISOString(),
// // // // // // // // // //       } : {
// // // // // // // // // //         items: validItems,
// // // // // // // // // //         date: new Date().toISOString()
// // // // // // // // // //       };

// // // // // // // // // //       await api.post(endpoint, payload);
// // // // // // // // // //       toast.dismiss(loadingToast);
// // // // // // // // // //       toast.success(isRequestMode ? "Request sent for approval!" : "Order placed!");

// // // // // // // // // //       setCart([]);
// // // // // // // // // //       setRequestReason("");
// // // // // // // // // //       setIsCartOpen(false);
// // // // // // // // // //       setIsRequestMode(false); 
// // // // // // // // // //       await Promise.all([fetchItems(), fetchMyOrders(), fetchMyRequests()]);
// // // // // // // // // //     } catch (err) {
// // // // // // // // // //       toast.dismiss(loadingToast);
// // // // // // // // // //       toast.error(err.response?.data?.error || "Submission Failed");
// // // // // // // // // //     }
// // // // // // // // // //   };

// // // // // // // // // //   return (
// // // // // // // // // //     <div className="min-h-screen bg-[#F8F9FA] pb-24 font-sans text-slate-900">
// // // // // // // // // //       {/* --- HEADER --- */}
// // // // // // // // // //       <header className="bg-white sticky top-0 z-40 p-4 shadow-sm flex justify-between items-center px-4 md:px-6 border-b border-gray-100">
// // // // // // // // // //         <h1 className="text-lg md:text-xl font-black italic uppercase">
// // // // // // // // // //           <span className="text-green-600">GODOWN Stock</span>
// // // // // // // // // //         </h1>
        
// // // // // // // // // //         <div className="flex gap-2 items-center">
// // // // // // // // // //           {/* Requests Button */}
// // // // // // // // // //           <button onClick={() => setIsRequestsOpen(true)} className="hidden md:block bg-blue-50 text-blue-600 px-4 py-2 rounded-full font-black text-[10px] uppercase active:scale-95 border border-blue-100">
// // // // // // // // // //             Requests {requests.filter(r => r.status === 'pending').length > 0 && <span className="ml-1 animate-pulse">●</span>}
// // // // // // // // // //           </button>

// // // // // // // // // //           {/* History Button */}
// // // // // // // // // //           <button onClick={() => setIsOrdersOpen(true)} className="hidden md:block bg-gray-100 text-gray-800 px-4 py-2 rounded-full font-black text-[10px] uppercase active:scale-95">
// // // // // // // // // //             History
// // // // // // // // // //           </button>

// // // // // // // // // //           {/* Cart/List Button */}
// // // // // // // // // //           <button 
// // // // // // // // // //             onClick={() => setIsCartOpen(true)}
// // // // // // // // // //             className={`${isRequestMode ? 'bg-blue-600' : 'bg-black'} text-white px-4 py-2 rounded-full font-black text-[10px] flex items-center gap-2 active:scale-95 shadow-lg uppercase transition-colors`}
// // // // // // // // // //           >
// // // // // // // // // //             {isRequestMode ? "List" : "Cart"} <span className="bg-white text-black px-1.5 py-0.5 rounded text-[9px]">{cart.length}</span>
// // // // // // // // // //           </button>

// // // // // // // // // //           {/* --- LOGOUT BUTTON --- */}
// // // // // // // // // //           <button 
// // // // // // // // // //             onClick={handleLogout}
// // // // // // // // // //             className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors group"
// // // // // // // // // //             title="Logout"
// // // // // // // // // //           >
// // // // // // // // // //             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // // // // // // // // //               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
// // // // // // // // // //             </svg>
// // // // // // // // // //           </button>
// // // // // // // // // //         </div>
// // // // // // // // // //       </header>

// // // // // // // // // //       {/* --- MAIN GRID --- */}
// // // // // // // // // //       <main className="max-w-7xl mx-auto p-4 md:p-8">
// // // // // // // // // //         {isRequestMode && (
// // // // // // // // // //             <div className="mb-6 bg-blue-50 border-2 border-blue-200 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
// // // // // // // // // //                 <div>
// // // // // // // // // //                   <p className="text-blue-700 font-black text-[10px] uppercase tracking-wider">📅 Creating New Request</p>
// // // // // // // // // //                   <p className="text-blue-900 text-xs font-bold">Target Date: {requestDate.toLocaleDateString()}</p>
// // // // // // // // // //                 </div>
// // // // // // // // // //                 <div className="flex gap-3 w-full md:w-auto">
// // // // // // // // // //                    <button onClick={() => setIsCartOpen(true)} className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase">Review & Send</button>
// // // // // // // // // //                    <button onClick={() => { setIsRequestMode(false); setCart([]); fetchItems(); }} className="flex-1 md:flex-none bg-white text-red-500 border border-red-100 px-6 py-2 rounded-xl font-black text-[10px] uppercase">Cancel</button>
// // // // // // // // // //                 </div>
// // // // // // // // // //             </div>
// // // // // // // // // //         )}
// // // // // // // // // //         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-8">
// // // // // // // // // //           {items.map((item) => (
// // // // // // // // // //             <InventoryCard 
// // // // // // // // // //                 key={item.stockRecordId} 
// // // // // // // // // //                 item={item} 
// // // // // // // // // //                 cartQty={cart.find(c => c.stockRecordId === item.stockRecordId)?.requestedQty || 0} 
// // // // // // // // // //                 onAddToCart={addToCart} 
// // // // // // // // // //             />
// // // // // // // // // //           ))}
// // // // // // // // // //         </div>
// // // // // // // // // //       </main>

// // // // // // // // // //       {/* --- REQUESTS DRAWER --- */}
// // // // // // // // // //       {isRequestsOpen && (
// // // // // // // // // //         <div className="fixed inset-0 z-[110] flex justify-end">
// // // // // // // // // //           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsRequestsOpen(false)} />
// // // // // // // // // //           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
// // // // // // // // // //             <div className="p-6 border-b flex justify-between items-center bg-blue-600 text-white">
// // // // // // // // // //               <h2 className="text-lg font-black uppercase italic">Inventory Requests</h2>
// // // // // // // // // //               <button onClick={() => setIsRequestsOpen(false)} className="text-2xl font-light">✕</button>
// // // // // // // // // //             </div>
            
// // // // // // // // // //             <div className="p-4 border-b bg-blue-50">
// // // // // // // // // //                 <button 
// // // // // // // // // //                   onClick={startNewRequest}
// // // // // // // // // //                   className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-all"
// // // // // // // // // //                 >
// // // // // // // // // //                   + Add New Request
// // // // // // // // // //                 </button>
// // // // // // // // // //             </div>

// // // // // // // // // //             <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
// // // // // // // // // //               {requests.length === 0 ? (
// // // // // // // // // //                 <div className="h-full flex flex-col items-center justify-center text-gray-400 uppercase text-[10px] font-black">No requests found</div>
// // // // // // // // // //               ) : requests.map((r) => (
// // // // // // // // // //                 <div key={r._id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
// // // // // // // // // //                   <div className="flex justify-between items-start mb-3">
// // // // // // // // // //                     <div>
// // // // // // // // // //                       <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
// // // // // // // // // //                         r.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 
// // // // // // // // // //                         r.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
// // // // // // // // // //                       }`}>
// // // // // // // // // //                         {r.status}
// // // // // // // // // //                       </span>
// // // // // // // // // //                       <p className="text-[10px] font-bold text-gray-900 mt-1">For: {new Date(r.targetDate).toLocaleDateString()}</p>
// // // // // // // // // //                     </div>
// // // // // // // // // //                   </div>
// // // // // // // // // //                   <div className="space-y-1.5">
// // // // // // // // // //                     {r.items.map((it, idx) => {
// // // // // // // // // //                       const details = getItemDetails(it.stockItemId?._id || it.stockRecordId, it);
// // // // // // // // // //                       return (
// // // // // // // // // //                         <div key={idx} className="flex justify-between text-[10px] font-bold uppercase text-gray-500 bg-gray-50 p-2 rounded-lg">
// // // // // // // // // //                           <span>{details.name}</span>
// // // // // // // // // //                           <span className="text-blue-600">{it.qtyBaseUnit || it.quantity} {details.unit}</span>
// // // // // // // // // //                         </div>
// // // // // // // // // //                       );
// // // // // // // // // //                     })}
// // // // // // // // // //                   </div>
// // // // // // // // // //                 </div>
// // // // // // // // // //               ))}
// // // // // // // // // //             </div>
// // // // // // // // // //           </div>
// // // // // // // // // //         </div>
// // // // // // // // // //       )}

// // // // // // // // // //       {/* --- HISTORY DRAWER (Read Only) --- */}
// // // // // // // // // //       {isOrdersOpen && (
// // // // // // // // // //         <div className="fixed inset-0 z-[110] flex justify-end">
// // // // // // // // // //           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsOrdersOpen(false)} />
// // // // // // // // // //           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
// // // // // // // // // //             <div className="p-6 border-b flex justify-between items-center">
// // // // // // // // // //               <h2 className="text-lg font-black uppercase italic text-gray-800">Order History</h2>
// // // // // // // // // //               <button onClick={() => setIsOrdersOpen(false)} className="text-2xl font-light">✕</button>
// // // // // // // // // //             </div>
// // // // // // // // // //             <div className="px-6 py-4 bg-gray-50 flex items-center gap-2 border-b">
// // // // // // // // // //               <DatePicker 
// // // // // // // // // //                 selected={selectedHistoryDate ? new Date(selectedHistoryDate) : null} 
// // // // // // // // // //                 onChange={(date) => setSelectedHistoryDate(date ? date.toISOString().split('T')[0] : "")} 
// // // // // // // // // //                 customInput={<CustomDateInput placeholder="Filter by Date" />} 
// // // // // // // // // //                 dateFormat="yyyy-MM-dd" 
// // // // // // // // // //               />
// // // // // // // // // //               {selectedHistoryDate && <button onClick={() => setSelectedHistoryDate("")} className="text-[9px] font-black text-red-500 uppercase px-2">Clear</button>}
// // // // // // // // // //             </div>
// // // // // // // // // //             <div className="flex-1 overflow-y-auto p-4 space-y-4">
// // // // // // // // // //               {filteredOrders.map((order) => (
// // // // // // // // // //                 <details key={order._id} className="group bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
// // // // // // // // // //                   <summary className="list-none cursor-pointer p-4 flex justify-between items-center">
// // // // // // // // // //                     <div className="space-y-1 text-left">
// // // // // // // // // //                         <span className="text-[8px] font-black bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase">Completed</span>
// // // // // // // // // //                         <p className="text-[10px] font-bold text-gray-400">{new Date(order.createdAt).toLocaleString()}</p>
// // // // // // // // // //                         <h3 className="text-xs font-black uppercase text-gray-800">{order.items.length} Items</h3>
// // // // // // // // // //                     </div>
// // // // // // // // // //                     <div className="text-gray-300 group-open:rotate-180 transition-transform">▼</div>
// // // // // // // // // //                   </summary>
// // // // // // // // // //                   <div className="px-4 pb-4 bg-gray-50/50 border-t pt-3 space-y-2">
// // // // // // // // // //                     {order.items.map((it, idx) => {
// // // // // // // // // //                       const details = getItemDetails(it.stockRecordId || it.stockItemId?._id, it);
// // // // // // // // // //                       return (
// // // // // // // // // //                         <div key={idx} className="flex justify-between text-[10px] font-black uppercase text-gray-600 bg-white p-2 rounded-lg border border-gray-100">
// // // // // // // // // //                           <span>{details.name}</span>
// // // // // // // // // //                           <span className="text-green-600">{it.qtyBaseUnit || it.quantity} {details.unit}</span>
// // // // // // // // // //                         </div>
// // // // // // // // // //                       );
// // // // // // // // // //                     })}
// // // // // // // // // //                   </div>
// // // // // // // // // //                 </details>
// // // // // // // // // //               ))}
// // // // // // // // // //             </div>
// // // // // // // // // //           </div>
// // // // // // // // // //         </div>
// // // // // // // // // //       )}

// // // // // // // // // //       {/* --- CART / REQUEST REVIEW DRAWER --- */}
// // // // // // // // // //       {isCartOpen && (
// // // // // // // // // //         <div className="fixed inset-0 z-[110] flex justify-end">
// // // // // // // // // //           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCartOpen(false)} />
// // // // // // // // // //           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
// // // // // // // // // //             <div className="p-6 border-b flex justify-between items-center">
// // // // // // // // // //               <h2 className="text-lg font-black uppercase italic">{isRequestMode ? "Review Request" : "Checkout Cart"}</h2>
// // // // // // // // // //               <button onClick={() => setIsCartOpen(false)} className="text-2xl font-light">✕</button>
// // // // // // // // // //             </div>
            
// // // // // // // // // //             <div className="flex-1 overflow-y-auto p-4 space-y-4">
// // // // // // // // // //               {isRequestMode && (
// // // // // // // // // //                 <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-4 mb-2">
// // // // // // // // // //                   <div>
// // // // // // // // // //                     <label className="text-[9px] font-black uppercase text-blue-600 ml-1">Needed By Date</label>
// // // // // // // // // //                     <DatePicker 
// // // // // // // // // //                       selected={requestDate} 
// // // // // // // // // //                       onChange={(date) => setRequestDate(date)} 
// // // // // // // // // //                       customInput={<CustomDateInput />} 
// // // // // // // // // //                     />
// // // // // // // // // //                   </div>
// // // // // // // // // //                   <div>
// // // // // // // // // //                     <label className="text-[9px] font-black uppercase text-blue-600 ml-1">Reason / Note</label>
// // // // // // // // // //                     <textarea 
// // // // // // // // // //                       rows="2"
// // // // // // // // // //                       placeholder="Why do you need these items?"
// // // // // // // // // //                       className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 ring-blue-500"
// // // // // // // // // //                       value={requestReason}
// // // // // // // // // //                       onChange={(e) => setRequestReason(e.target.value)}
// // // // // // // // // //                     />
// // // // // // // // // //                   </div>
// // // // // // // // // //                 </div>
// // // // // // // // // //               )}

// // // // // // // // // //               {cart.length === 0 ? (
// // // // // // // // // //                 <div className="text-center py-20 text-gray-400 uppercase text-[10px] font-black">No items selected</div>
// // // // // // // // // //               ) : cart.map(item => (
// // // // // // // // // //                 <div key={item.stockRecordId || item._id} className="flex gap-4 items-center bg-gray-50 p-3 rounded-2xl border border-gray-100">
// // // // // // // // // //                     <div className="w-10 h-10 bg-white rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center p-1">
// // // // // // // // // //                       <img 
// // // // // // // // // //                         src={item.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=f8f9fa&color=10b981&bold=true`} 
// // // // // // // // // //                         alt="" className="w-full h-full object-contain"
// // // // // // // // // //                       />
// // // // // // // // // //                     </div>
// // // // // // // // // //                     <div className="flex-1">
// // // // // // // // // //                       <p className="text-[10px] font-black uppercase text-gray-800 line-clamp-1">{item.name}</p>
// // // // // // // // // //                       <p className="text-[8px] text-gray-400 font-bold uppercase">{item.unit}</p>
// // // // // // // // // //                     </div>
// // // // // // // // // //                     <div className="flex items-center gap-2">
// // // // // // // // // //                       <button onClick={() => addToCart(item, item.requestedQty - 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-black">-</button>
// // // // // // // // // //                       <span className="text-[11px] font-black w-4 text-center">{item.requestedQty}</span>
// // // // // // // // // //                       <button onClick={() => addToCart(item, item.requestedQty + 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-black">+</button>
// // // // // // // // // //                     </div>
// // // // // // // // // //                 </div>
// // // // // // // // // //               ))}
// // // // // // // // // //             </div>

// // // // // // // // // //             {cart.length > 0 && (
// // // // // // // // // //               <div className="p-6 border-t bg-white">
// // // // // // // // // //                 <button onClick={handleSubmitOrder} className={`w-full py-4 rounded-2xl font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all ${isRequestMode ? "bg-blue-600 text-white" : "bg-black text-white"}`}>
// // // // // // // // // //                   {isRequestMode ? "Submit to Admin" : "Place Order"}
// // // // // // // // // //                 </button>
// // // // // // // // // //               </div>
// // // // // // // // // //             )}
// // // // // // // // // //           </div>
// // // // // // // // // //         </div>
// // // // // // // // // //       )}
// // // // // // // // // //     </div>
// // // // // // // // // //   );
// // // // // // // // // // };












// // // // // // // // // // 9-4-2026







// // // // // // // // // import React, { useState, useEffect, useMemo, forwardRef } from 'react';
// // // // // // // // // import { useNavigate } from 'react-router-dom';
// // // // // // // // // import { api } from "../api";
// // // // // // // // // import { toast } from 'react-hot-toast';
// // // // // // // // // import { socket } from "../socket"; 
// // // // // // // // // import InventoryCard from './InventoryCard';
// // // // // // // // // import DatePicker from "react-datepicker";
// // // // // // // // // import "react-datepicker/dist/react-datepicker.css";

// // // // // // // // // // --- Sub-Components ---
// // // // // // // // // const CustomDateInput = forwardRef(({ value, onClick, placeholder }, ref) => (
// // // // // // // // //   <button
// // // // // // // // //     className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-xs font-bold text-gray-800 flex items-center justify-between hover:border-blue-500 transition-all active:scale-[0.98] shadow-sm"
// // // // // // // // //     onClick={onClick}
// // // // // // // // //     ref={ref}
// // // // // // // // //   >
// // // // // // // // //     <span>{value || placeholder || "Select Date"}</span>
// // // // // // // // //     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // // // // // // // //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
// // // // // // // // //     </svg>
// // // // // // // // //   </button>
// // // // // // // // // ));

// // // // // // // // // export const ClientStore = () => {
// // // // // // // // //   // --- State: Data ---
// // // // // // // // //   const [items, setItems] = useState([]);
// // // // // // // // //   const [cart, setCart] = useState([]);
// // // // // // // // //   const [orders, setOrders] = useState([]); 
// // // // // // // // //   const [requests, setRequests] = useState([]); 
// // // // // // // // //   const [loading, setLoading] = useState(true);

// // // // // // // // //   // --- State: UI & Filters ---
// // // // // // // // //   const [searchQuery, setSearchQuery] = useState(""); // <--- NEW STATE
// // // // // // // // //   const [selectedHistoryDate, setSelectedHistoryDate] = useState(""); 
// // // // // // // // //   const [isCartOpen, setIsCartOpen] = useState(false);
// // // // // // // // //   const [isOrdersOpen, setIsOrdersOpen] = useState(false); 
// // // // // // // // //   const [isRequestsOpen, setIsRequestsOpen] = useState(false); 

// // // // // // // // //   // --- State: Request Mode Specifics ---
// // // // // // // // //   const [isRequestMode, setIsRequestMode] = useState(false); 
// // // // // // // // //   const [requestReason, setRequestReason] = useState(""); 
// // // // // // // // //   const [requestDate, setRequestDate] = useState(new Date());

// // // // // // // // //   const navigate = useNavigate();

// // // // // // // // //   // --- Logout Logic ---
// // // // // // // // //   const handleLogout = () => {
// // // // // // // // //     localStorage.removeItem("token"); 
// // // // // // // // //     socket.disconnect();
// // // // // // // // //     toast.success("Logged out successfully");
// // // // // // // // //     navigate("/login");
// // // // // // // // //   };

// // // // // // // // //   useEffect(() => {
// // // // // // // // //     const init = async () => {
// // // // // // // // //       await Promise.all([fetchItems(), fetchMyOrders(), fetchMyRequests()]);
// // // // // // // // //       setLoading(false);
// // // // // // // // //     };
// // // // // // // // //     init();
    
// // // // // // // // //     socket.on("low_stock_alert", (data) => {
// // // // // // // // //       toast.error(`⚠️ ${data.payload.message}`, {
// // // // // // // // //         duration: 6000,
// // // // // // // // //         position: "top-right",
// // // // // // // // //         style: { border: '2px solid #ef4444', padding: '16px', fontWeight: '900', background: '#fff', color: '#000' }
// // // // // // // // //       });
// // // // // // // // //     });
    
// // // // // // // // //     return () => socket.off("low_stock_alert");
// // // // // // // // //   }, [navigate]);

// // // // // // // // //   // --- API Fetchers ---
// // // // // // // // //   const fetchItems = async () => {
// // // // // // // // //     try {
// // // // // // // // //       const res = await api.get('/my-kitchen-stock'); 
// // // // // // // // //       const formattedItems = res.data.map(item => ({
// // // // // // // // //         stockRecordId: item.stockRecordId, 
// // // // // // // // //         _id: item.stockItemId?._id || item.stockItemId,
// // // // // // // // //         name: item.name || item.stockItemId?.name || "Unknown Item",
// // // // // // // // //         currentQty: Number(item.currentQty) || 0, 
// // // // // // // // //         unit: item.unit || item.stockItemId?.unit || "Units", 
// // // // // // // // //         image: item.image || item.stockItemId?.image || ""
// // // // // // // // //       })).sort((a, b) => a.name.localeCompare(b.name));
// // // // // // // // //       setItems(formattedItems);
// // // // // // // // //     } catch (err) {
// // // // // // // // //       console.error("Fetch Error:", err);
// // // // // // // // //       toast.error("Failed to sync inventory");
// // // // // // // // //     }
// // // // // // // // //   };

// // // // // // // // //   const fetchMyOrders = async () => {
// // // // // // // // //     try {
// // // // // // // // //       const res = await api.get('/consumptions/me');
// // // // // // // // //       setOrders(res.data);
// // // // // // // // //     } catch (err) { console.error("Failed to fetch orders"); }
// // // // // // // // //   };

// // // // // // // // //   const fetchMyRequests = async () => {
// // // // // // // // //     try {
// // // // // // // // //       const res = await api.get('/requests');
// // // // // // // // //       setRequests(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
// // // // // // // // //     } catch (err) { console.error("Failed to fetch requests"); }
// // // // // // // // //   };

// // // // // // // // //   // --- Search & Filter Logic ---
// // // // // // // // //   const filteredItems = useMemo(() => {
// // // // // // // // //     return items.filter(item => 
// // // // // // // // //       item.name.toLowerCase().includes(searchQuery.toLowerCase())
// // // // // // // // //     );
// // // // // // // // //   }, [items, searchQuery]);

// // // // // // // // //   const getItemDetails = (id, fallbackObj) => {
// // // // // // // // //     const found = items.find(i => i.stockRecordId === id || i._id === id);
// // // // // // // // //     if (found) return found;
// // // // // // // // //     return {
// // // // // // // // //       name: fallbackObj.name || fallbackObj.stockItemId?.name || "Unknown Item",
// // // // // // // // //       unit: fallbackObj.unit || fallbackObj.stockItemId?.unit || "Units", 
// // // // // // // // //       image: fallbackObj.image || fallbackObj.stockItemId?.image || "",
// // // // // // // // //       stockRecordId: fallbackObj.stockRecordId,
// // // // // // // // //       _id: fallbackObj.stockItemId?._id || id
// // // // // // // // //     };
// // // // // // // // //   };

// // // // // // // // //   const filteredOrders = useMemo(() => {
// // // // // // // // //     if (!orders) return [];
// // // // // // // // //     let list = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // // // //     if (!selectedHistoryDate) return list;
// // // // // // // // //     return list.filter(order => new Date(order.createdAt).toISOString().split('T')[0] === selectedHistoryDate);
// // // // // // // // //   }, [orders, selectedHistoryDate]);

// // // // // // // // //   // --- Action Handlers ---
// // // // // // // // //   const startNewRequest = () => {
// // // // // // // // //     setIsRequestMode(true);
// // // // // // // // //     setCart([]);
// // // // // // // // //     setRequestReason("");
// // // // // // // // //     setRequestDate(new Date());
// // // // // // // // //     setIsRequestsOpen(false);
// // // // // // // // //     toast("Pick items for your request", { icon: '📅' });
// // // // // // // // //   };

// // // // // // // // //   const addToCart = (product, newRequestedQty) => {
// // // // // // // // //     const sanitizedQty = Math.max(0, parseInt(newRequestedQty, 10) || 0);
// // // // // // // // //     const existingInCart = cart.find(i => i.stockRecordId === product.stockRecordId);
// // // // // // // // //     const oldQty = existingInCart ? Number(existingInCart.requestedQty) || 0 : 0;
// // // // // // // // //     const diff = sanitizedQty - oldQty;

// // // // // // // // //     const targetItem = items.find(i => i.stockRecordId === product.stockRecordId);
    
// // // // // // // // //     if (!isRequestMode && diff > 0 && (!targetItem || targetItem.currentQty < diff)) {
// // // // // // // // //         return toast.error("Insufficient Stock");
// // // // // // // // //     }

// // // // // // // // //     if (sanitizedQty <= 0) {
// // // // // // // // //       removeFromCart(product);
// // // // // // // // //       return;
// // // // // // // // //     }

// // // // // // // // //     if (!isRequestMode) {
// // // // // // // // //       setItems(prev => prev.map(item =>
// // // // // // // // //         item.stockRecordId === product.stockRecordId ? { ...item, currentQty: item.currentQty - diff } : item
// // // // // // // // //       ));
// // // // // // // // //     }

// // // // // // // // //     setCart(prev => {
// // // // // // // // //       if (existingInCart) return prev.map(i => i.stockRecordId === product.stockRecordId ? { ...i, requestedQty: sanitizedQty } : i);
// // // // // // // // //       return [...prev, { ...product, requestedQty: sanitizedQty }];
// // // // // // // // //     });
// // // // // // // // //   };

// // // // // // // // //   const removeFromCart = (itemToRemove) => {
// // // // // // // // //     if (!isRequestMode) {
// // // // // // // // //       setItems(prev => prev.map(item =>
// // // // // // // // //         item.stockRecordId === itemToRemove.stockRecordId 
// // // // // // // // //         ? { ...item, currentQty: item.currentQty + (Number(itemToRemove.requestedQty) || 0) } : item
// // // // // // // // //       ));
// // // // // // // // //     }
// // // // // // // // //     setCart(prev => prev.filter(i => i.stockRecordId !== itemToRemove.stockRecordId));
// // // // // // // // //   };

// // // // // // // // //   const handleSubmitOrder = async () => {
// // // // // // // // //     const validItems = cart.map(item => ({
// // // // // // // // //       stockItemId: item._id,
// // // // // // // // //       qtyBaseUnit: Number(item.requestedQty), 
// // // // // // // // //       stockRecordId: item.stockRecordId 
// // // // // // // // //     })).filter(it => it.qtyBaseUnit > 0);

// // // // // // // // //     if (validItems.length === 0) return toast.error("Please add items");
// // // // // // // // //     if (isRequestMode && !requestReason.trim()) return toast.error("Please provide a reason");

// // // // // // // // //     const loadingToast = toast.loading("Processing...");
// // // // // // // // //     try {
// // // // // // // // //       const endpoint = isRequestMode ? '/requests' : '/orders'; 
// // // // // // // // //       const payload = isRequestMode ? {
// // // // // // // // //         items: validItems,
// // // // // // // // //         reason: requestReason,
// // // // // // // // //         targetDate: requestDate.toISOString(),
// // // // // // // // //       } : {
// // // // // // // // //         items: validItems,
// // // // // // // // //         date: new Date().toISOString()
// // // // // // // // //       };

// // // // // // // // //       await api.post(endpoint, payload);
// // // // // // // // //       toast.dismiss(loadingToast);
// // // // // // // // //       toast.success(isRequestMode ? "Request sent for approval!" : "Order placed!");

// // // // // // // // //       setCart([]);
// // // // // // // // //       setRequestReason("");
// // // // // // // // //       setIsCartOpen(false);
// // // // // // // // //       setIsRequestMode(false); 
// // // // // // // // //       await Promise.all([fetchItems(), fetchMyOrders(), fetchMyRequests()]);
// // // // // // // // //     } catch (err) {
// // // // // // // // //       toast.dismiss(loadingToast);
// // // // // // // // //       toast.error(err.response?.data?.error || "Submission Failed");
// // // // // // // // //     }
// // // // // // // // //   };

// // // // // // // // //   return (
// // // // // // // // //     <div className="min-h-screen bg-[#F8F9FA] pb-24 font-sans text-slate-900">
// // // // // // // // //       {/* --- HEADER --- */}
// // // // // // // // //       <header className="bg-white sticky top-0 z-40 p-4 shadow-sm flex flex-col md:flex-row justify-between items-center px-4 md:px-6 border-b border-gray-100 gap-4">
// // // // // // // // //         <h1 className="text-lg md:text-xl font-black italic uppercase shrink-0">
// // // // // // // // //           <span className="text-green-600">GODOWN Stock</span>
// // // // // // // // //         </h1>
        
// // // // // // // // //         {/* --- SEARCH BAR --- */}
// // // // // // // // //         <div className="relative w-full max-w-md">
// // // // // // // // //           <input 
// // // // // // // // //             type="text" 
// // // // // // // // //             placeholder="Search items..."
// // // // // // // // //             value={searchQuery}
// // // // // // // // //             onChange={(e) => setSearchQuery(e.target.value)}
// // // // // // // // //             className="w-full bg-gray-100 border-none rounded-full py-2.5 px-10 text-xs font-bold outline-none focus:ring-2 ring-green-500/20 transition-all"
// // // // // // // // //           />
// // // // // // // // //           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // // // // // // // //             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
// // // // // // // // //           </svg>
// // // // // // // // //           {searchQuery && (
// // // // // // // // //             <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
// // // // // // // // //               ✕
// // // // // // // // //             </button>
// // // // // // // // //           )}
// // // // // // // // //         </div>
        
// // // // // // // // //         <div className="flex gap-2 items-center shrink-0">
// // // // // // // // //           <button onClick={() => setIsRequestsOpen(true)} className="hidden md:block bg-blue-50 text-blue-600 px-4 py-2 rounded-full font-black text-[10px] uppercase active:scale-95 border border-blue-100">
// // // // // // // // //             Requests {requests.filter(r => r.status === 'pending').length > 0 && <span className="ml-1 animate-pulse">●</span>}
// // // // // // // // //           </button>

// // // // // // // // //           <button onClick={() => setIsOrdersOpen(true)} className="hidden md:block bg-gray-100 text-gray-800 px-4 py-2 rounded-full font-black text-[10px] uppercase active:scale-95">
// // // // // // // // //             History
// // // // // // // // //           </button>

// // // // // // // // //           <button 
// // // // // // // // //             onClick={() => setIsCartOpen(true)}
// // // // // // // // //             className={`${isRequestMode ? 'bg-blue-600' : 'bg-black'} text-white px-4 py-2 rounded-full font-black text-[10px] flex items-center gap-2 active:scale-95 shadow-lg uppercase transition-colors`}
// // // // // // // // //           >
// // // // // // // // //             {isRequestMode ? "List" : "Cart"} <span className="bg-white text-black px-1.5 py-0.5 rounded text-[9px]">{cart.length}</span>
// // // // // // // // //           </button>

// // // // // // // // //           <button 
// // // // // // // // //             onClick={handleLogout}
// // // // // // // // //             className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors group"
// // // // // // // // //             title="Logout"
// // // // // // // // //           >
// // // // // // // // //             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // // // // // // // //               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
// // // // // // // // //             </svg>
// // // // // // // // //           </button>
// // // // // // // // //         </div>
// // // // // // // // //       </header>

// // // // // // // // //       {/* --- MAIN GRID --- */}
// // // // // // // // //       <main className="max-w-7xl mx-auto p-4 md:p-8">
// // // // // // // // //         {isRequestMode && (
// // // // // // // // //             <div className="mb-6 bg-blue-50 border-2 border-blue-200 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
// // // // // // // // //                 <div>
// // // // // // // // //                   <p className="text-blue-700 font-black text-[10px] uppercase tracking-wider">📅 Creating New Request</p>
// // // // // // // // //                   <p className="text-blue-900 text-xs font-bold">Target Date: {requestDate.toLocaleDateString()}</p>
// // // // // // // // //                 </div>
// // // // // // // // //                 <div className="flex gap-3 w-full md:w-auto">
// // // // // // // // //                    <button onClick={() => setIsCartOpen(true)} className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase">Review & Send</button>
// // // // // // // // //                    <button onClick={() => { setIsRequestMode(false); setCart([]); fetchItems(); }} className="flex-1 md:flex-none bg-white text-red-500 border border-red-100 px-6 py-2 rounded-xl font-black text-[10px] uppercase">Cancel</button>
// // // // // // // // //                 </div>
// // // // // // // // //             </div>
// // // // // // // // //         )}

// // // // // // // // //         {/* --- GRID RENDERING FILTERED ITEMS --- */}
// // // // // // // // //         {filteredItems.length > 0 ? (
// // // // // // // // //           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-8">
// // // // // // // // //             {filteredItems.map((item) => (
// // // // // // // // //               <InventoryCard 
// // // // // // // // //                   key={item.stockRecordId} 
// // // // // // // // //                   item={item} 
// // // // // // // // //                   cartQty={cart.find(c => c.stockRecordId === item.stockRecordId)?.requestedQty || 0} 
// // // // // // // // //                   onAddToCart={addToCart} 
// // // // // // // // //               />
// // // // // // // // //             ))}
// // // // // // // // //           </div>
// // // // // // // // //         ) : (
// // // // // // // // //           <div className="py-20 text-center">
// // // // // // // // //             <p className="text-gray-400 font-black uppercase text-xs">No items match your search "{searchQuery}"</p>
// // // // // // // // //           </div>
// // // // // // // // //         )}
// // // // // // // // //       </main>

// // // // // // // // //       {/* ... (Rest of the drawers remain unchanged) ... */}
// // // // // // // // //     </div>
// // // // // // // // //   );
// // // // // // // // // };






// // // // // // // // import React, { useState, useEffect, useMemo, forwardRef } from 'react';
// // // // // // // // import { useNavigate } from 'react-router-dom';
// // // // // // // // import { api } from "../api";
// // // // // // // // import { toast } from 'react-hot-toast';
// // // // // // // // import { socket } from "../socket"; 
// // // // // // // // import InventoryCard from './InventoryCard';
// // // // // // // // import DatePicker from "react-datepicker";
// // // // // // // // import "react-datepicker/dist/react-datepicker.css";

// // // // // // // // // --- Sub-Components ---
// // // // // // // // const CustomDateInput = forwardRef(({ value, onClick, placeholder }, ref) => (
// // // // // // // //   <button
// // // // // // // //     className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-xs font-bold text-gray-800 flex items-center justify-between hover:border-blue-500 transition-all active:scale-[0.98] shadow-sm"
// // // // // // // //     onClick={onClick}
// // // // // // // //     ref={ref}
// // // // // // // //   >
// // // // // // // //     <span>{value || placeholder || "Select Date"}</span>
// // // // // // // //     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // // // // // // //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
// // // // // // // //     </svg>
// // // // // // // //   </button>
// // // // // // // // ));

// // // // // // // // export const ClientStore = () => {
// // // // // // // //   // --- State: Data ---
// // // // // // // //   const [items, setItems] = useState([]);
// // // // // // // //   const [cart, setCart] = useState([]);
// // // // // // // //   const [orders, setOrders] = useState([]); 
// // // // // // // //   const [requests, setRequests] = useState([]); 
// // // // // // // //   const [loading, setLoading] = useState(true);

// // // // // // // //   // --- State: UI & Filters ---
// // // // // // // //   const [searchQuery, setSearchQuery] = useState("");
// // // // // // // //   const [selectedHistoryDate, setSelectedHistoryDate] = useState(""); 
// // // // // // // //   const [isCartOpen, setIsCartOpen] = useState(false);
// // // // // // // //   const [isOrdersOpen, setIsOrdersOpen] = useState(false); 
// // // // // // // //   const [isRequestsOpen, setIsRequestsOpen] = useState(false); 

// // // // // // // //   // --- State: Request Mode Specifics ---
// // // // // // // //   const [isRequestMode, setIsRequestMode] = useState(false); 
// // // // // // // //   const [requestReason, setRequestReason] = useState(""); 
// // // // // // // //   const [requestDate, setRequestDate] = useState(new Date());

// // // // // // // //   const navigate = useNavigate();

// // // // // // // //   // --- Logout Logic ---
// // // // // // // //   const handleLogout = () => {
// // // // // // // //     localStorage.removeItem("token"); 
// // // // // // // //     socket.disconnect();
// // // // // // // //     toast.success("Logged out successfully");
// // // // // // // //     navigate("/login");
// // // // // // // //   };

// // // // // // // //   useEffect(() => {
// // // // // // // //     const init = async () => {
// // // // // // // //       await Promise.all([fetchItems(), fetchMyOrders(), fetchMyRequests()]);
// // // // // // // //       setLoading(false);
// // // // // // // //     };
// // // // // // // //     init();
    
// // // // // // // //     socket.on("low_stock_alert", (data) => {
// // // // // // // //       toast.error(`⚠️ ${data.payload.message}`, {
// // // // // // // //         duration: 6000,
// // // // // // // //         position: "top-right",
// // // // // // // //         style: { border: '2px solid #ef4444', padding: '16px', fontWeight: '900', background: '#fff', color: '#000' }
// // // // // // // //       });
// // // // // // // //     });
    
// // // // // // // //     return () => socket.off("low_stock_alert");
// // // // // // // //   }, [navigate]);

// // // // // // // //   // --- API Fetchers ---
// // // // // // // //   const fetchItems = async () => {
// // // // // // // //     try {
// // // // // // // //       const res = await api.get('/my-kitchen-stock'); 
// // // // // // // //       const formattedItems = res.data.map(item => ({
// // // // // // // //         stockRecordId: item.stockRecordId, 
// // // // // // // //         _id: item.stockItemId?._id || item.stockItemId,
// // // // // // // //         name: item.name || item.stockItemId?.name || "Unknown Item",
// // // // // // // //         currentQty: Number(item.currentQty) || 0, 
// // // // // // // //         unit: item.unit || item.stockItemId?.unit || "Units", 
// // // // // // // //         image: item.image || item.stockItemId?.image || ""
// // // // // // // //       })).sort((a, b) => a.name.localeCompare(b.name));
// // // // // // // //       setItems(formattedItems);
// // // // // // // //     } catch (err) {
// // // // // // // //       console.error("Fetch Error:", err);
// // // // // // // //       toast.error("Failed to sync inventory");
// // // // // // // //     }
// // // // // // // //   };

// // // // // // // //   const fetchMyOrders = async () => {
// // // // // // // //     try {
// // // // // // // //       const res = await api.get('/consumptions/me');
// // // // // // // //       setOrders(res.data);
// // // // // // // //     } catch (err) { console.error("Failed to fetch orders"); }
// // // // // // // //   };

// // // // // // // //   const fetchMyRequests = async () => {
// // // // // // // //     try {
// // // // // // // //       const res = await api.get('/requests');
// // // // // // // //       setRequests(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
// // // // // // // //     } catch (err) { console.error("Failed to fetch requests"); }
// // // // // // // //   };

// // // // // // // //   // --- Search & Filter Logic ---
// // // // // // // //   const filteredItems = useMemo(() => {
// // // // // // // //     return items.filter(item => 
// // // // // // // //       item.name.toLowerCase().includes(searchQuery.toLowerCase())
// // // // // // // //     );
// // // // // // // //   }, [items, searchQuery]);

// // // // // // // //   const getItemDetails = (id, fallbackObj) => {
// // // // // // // //     const found = items.find(i => i.stockRecordId === id || i._id === id);
// // // // // // // //     if (found) return found;
// // // // // // // //     return {
// // // // // // // //       name: fallbackObj.name || fallbackObj.stockItemId?.name || "Unknown Item",
// // // // // // // //       unit: fallbackObj.unit || fallbackObj.stockItemId?.unit || "Units", 
// // // // // // // //       image: fallbackObj.image || fallbackObj.stockItemId?.image || "",
// // // // // // // //       stockRecordId: fallbackObj.stockRecordId,
// // // // // // // //       _id: fallbackObj.stockItemId?._id || id
// // // // // // // //     };
// // // // // // // //   };

// // // // // // // //   const filteredOrders = useMemo(() => {
// // // // // // // //     if (!orders) return [];
// // // // // // // //     let list = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // // //     if (!selectedHistoryDate) return list;
// // // // // // // //     return list.filter(order => new Date(order.createdAt).toISOString().split('T')[0] === selectedHistoryDate);
// // // // // // // //   }, [orders, selectedHistoryDate]);

// // // // // // // //   // --- Action Handlers ---
// // // // // // // //   const startNewRequest = () => {
// // // // // // // //     setIsRequestMode(true);
// // // // // // // //     setCart([]);
// // // // // // // //     setRequestReason("");
// // // // // // // //     setRequestDate(new Date());
// // // // // // // //     setIsRequestsOpen(false);
// // // // // // // //     toast("Pick items for your request", { icon: '📅' });
// // // // // // // //   };

// // // // // // // //   const addToCart = (product, newRequestedQty) => {
// // // // // // // //     const sanitizedQty = Math.max(0, parseInt(newRequestedQty, 10) || 0);
// // // // // // // //     const existingInCart = cart.find(i => i.stockRecordId === product.stockRecordId);
// // // // // // // //     const oldQty = existingInCart ? Number(existingInCart.requestedQty) || 0 : 0;
// // // // // // // //     const diff = sanitizedQty - oldQty;

// // // // // // // //     const targetItem = items.find(i => i.stockRecordId === product.stockRecordId);
    
// // // // // // // //     if (!isRequestMode && diff > 0 && (!targetItem || targetItem.currentQty < diff)) {
// // // // // // // //         return toast.error("Insufficient Stock");
// // // // // // // //     }

// // // // // // // //     if (sanitizedQty <= 0) {
// // // // // // // //       removeFromCart(product);
// // // // // // // //       return;
// // // // // // // //     }

// // // // // // // //     if (!isRequestMode) {
// // // // // // // //       setItems(prev => prev.map(item =>
// // // // // // // //         item.stockRecordId === product.stockRecordId ? { ...item, currentQty: item.currentQty - diff } : item
// // // // // // // //       ));
// // // // // // // //     }

// // // // // // // //     setCart(prev => {
// // // // // // // //       if (existingInCart) return prev.map(i => i.stockRecordId === product.stockRecordId ? { ...i, requestedQty: sanitizedQty } : i);
// // // // // // // //       return [...prev, { ...product, requestedQty: sanitizedQty }];
// // // // // // // //     });
// // // // // // // //   };

// // // // // // // //   const removeFromCart = (itemToRemove) => {
// // // // // // // //     if (!isRequestMode) {
// // // // // // // //       setItems(prev => prev.map(item =>
// // // // // // // //         item.stockRecordId === itemToRemove.stockRecordId 
// // // // // // // //         ? { ...item, currentQty: item.currentQty + (Number(itemToRemove.requestedQty) || 0) } : item
// // // // // // // //       ));
// // // // // // // //     }
// // // // // // // //     setCart(prev => prev.filter(i => i.stockRecordId !== itemToRemove.stockRecordId));
// // // // // // // //   };

// // // // // // // //   const handleSubmitOrder = async () => {
// // // // // // // //     const validItems = cart.map(item => ({
// // // // // // // //       stockItemId: item._id,
// // // // // // // //       qtyBaseUnit: Number(item.requestedQty), 
// // // // // // // //       stockRecordId: item.stockRecordId 
// // // // // // // //     })).filter(it => it.qtyBaseUnit > 0);

// // // // // // // //     if (validItems.length === 0) return toast.error("Please add items");
// // // // // // // //     if (isRequestMode && !requestReason.trim()) return toast.error("Please provide a reason");

// // // // // // // //     const loadingToast = toast.loading("Processing...");
// // // // // // // //     try {
// // // // // // // //       const endpoint = isRequestMode ? '/requests' : '/orders'; 
// // // // // // // //       const payload = isRequestMode ? {
// // // // // // // //         items: validItems,
// // // // // // // //         reason: requestReason,
// // // // // // // //         targetDate: requestDate.toISOString(),
// // // // // // // //       } : {
// // // // // // // //         items: validItems,
// // // // // // // //         date: new Date().toISOString()
// // // // // // // //       };

// // // // // // // //       await api.post(endpoint, payload);
// // // // // // // //       toast.dismiss(loadingToast);
// // // // // // // //       toast.success(isRequestMode ? "Request sent for approval!" : "Order placed!");

// // // // // // // //       setCart([]);
// // // // // // // //       setRequestReason("");
// // // // // // // //       setIsCartOpen(false);
// // // // // // // //       setIsRequestMode(false); 
// // // // // // // //       await Promise.all([fetchItems(), fetchMyOrders(), fetchMyRequests()]);
// // // // // // // //     } catch (err) {
// // // // // // // //       toast.dismiss(loadingToast);
// // // // // // // //       toast.error(err.response?.data?.error || "Submission Failed");
// // // // // // // //     }
// // // // // // // //   };

// // // // // // // //   return (
// // // // // // // //     <div className="min-h-screen bg-[#F8F9FA] pb-24 font-sans text-slate-900">
// // // // // // // //       {/* --- MAIN HEADER --- */}
// // // // // // // //       <header className="bg-white sticky top-0 z-40 p-4 shadow-sm border-b border-gray-100">
// // // // // // // //         <div className="max-w-7xl mx-auto flex justify-between items-center px-0 md:px-2">
// // // // // // // //           <h1 className="text-lg md:text-xl font-black italic uppercase">
// // // // // // // //             <span className="text-green-600">GODOWN Stock</span>
// // // // // // // //           </h1>
          
// // // // // // // //           <div className="flex gap-2 items-center">
// // // // // // // //             <button onClick={() => setIsRequestsOpen(true)} className="hidden md:block bg-blue-50 text-blue-600 px-4 py-2 rounded-full font-black text-[10px] uppercase active:scale-95 border border-blue-100">
// // // // // // // //               Requests {requests.filter(r => r.status === 'pending').length > 0 && <span className="ml-1 animate-pulse">●</span>}
// // // // // // // //             </button>

// // // // // // // //             <button onClick={() => setIsOrdersOpen(true)} className="hidden md:block bg-gray-100 text-gray-800 px-4 py-2 rounded-full font-black text-[10px] uppercase active:scale-95">
// // // // // // // //               History
// // // // // // // //             </button>

// // // // // // // //             <button 
// // // // // // // //               onClick={() => setIsCartOpen(true)}
// // // // // // // //               className={`${isRequestMode ? 'bg-blue-600' : 'bg-black'} text-white px-4 py-2 rounded-full font-black text-[10px] flex items-center gap-2 active:scale-95 shadow-lg uppercase transition-colors`}
// // // // // // // //             >
// // // // // // // //               {isRequestMode ? "List" : "Cart"} <span className="bg-white text-black px-1.5 py-0.5 rounded text-[9px]">{cart.length}</span>
// // // // // // // //             </button>

// // // // // // // //             <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
// // // // // // // //               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // // // // // // //                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
// // // // // // // //               </svg>
// // // // // // // //             </button>
// // // // // // // //           </div>
// // // // // // // //         </div>
// // // // // // // //       </header>

// // // // // // // //       {/* --- SEARCH SUB-HEADER --- */}
// // // // // // // //       <div className="bg-white border-b border-gray-100 p-3 sticky top-[68px] z-30 shadow-sm">
// // // // // // // //         <div className="max-w-7xl mx-auto px-1">
// // // // // // // //           <div className="relative">
// // // // // // // //             <input 
// // // // // // // //               type="text" 
// // // // // // // //               placeholder="Search items by name..."
// // // // // // // //               value={searchQuery}
// // // // // // // //               onChange={(e) => setSearchQuery(e.target.value)}
// // // // // // // //               className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-11 text-xs font-bold outline-none focus:ring-2 ring-green-500/20 focus:bg-white focus:border-green-500 transition-all shadow-sm"
// // // // // // // //             />
// // // // // // // //             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // // // // // // //               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
// // // // // // // //             </svg>
// // // // // // // //             {searchQuery && (
// // // // // // // //               <button 
// // // // // // // //                 onClick={() => setSearchQuery("")} 
// // // // // // // //                 className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-500 w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-colors"
// // // // // // // //               >
// // // // // // // //                 ✕
// // // // // // // //               </button>
// // // // // // // //             )}
// // // // // // // //           </div>
// // // // // // // //         </div>
// // // // // // // //       </div>

// // // // // // // //       {/* --- MAIN CONTENT --- */}
// // // // // // // //       <main className="max-w-7xl mx-auto p-4 md:p-8">
// // // // // // // //         {isRequestMode && (
// // // // // // // //             <div className="mb-6 bg-blue-50 border-2 border-blue-200 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
// // // // // // // //                 <div>
// // // // // // // //                   <p className="text-blue-700 font-black text-[10px] uppercase tracking-wider">📅 Creating New Request</p>
// // // // // // // //                   <p className="text-blue-900 text-xs font-bold">Target Date: {requestDate.toLocaleDateString()}</p>
// // // // // // // //                 </div>
// // // // // // // //                 <div className="flex gap-3 w-full md:w-auto">
// // // // // // // //                    <button onClick={() => setIsCartOpen(true)} className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase">Review & Send</button>
// // // // // // // //                    <button onClick={() => { setIsRequestMode(false); setCart([]); fetchItems(); }} className="flex-1 md:flex-none bg-white text-red-500 border border-red-100 px-6 py-2 rounded-xl font-black text-[10px] uppercase">Cancel</button>
// // // // // // // //                 </div>
// // // // // // // //             </div>
// // // // // // // //         )}

// // // // // // // //         {filteredItems.length > 0 ? (
// // // // // // // //           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-8">
// // // // // // // //             {filteredItems.map((item) => (
// // // // // // // //               <InventoryCard 
// // // // // // // //                   key={item.stockRecordId} 
// // // // // // // //                   item={item} 
// // // // // // // //                   cartQty={cart.find(c => c.stockRecordId === item.stockRecordId)?.requestedQty || 0} 
// // // // // // // //                   onAddToCart={addToCart} 
// // // // // // // //               />
// // // // // // // //             ))}
// // // // // // // //           </div>
// // // // // // // //         ) : (
// // // // // // // //           <div className="py-20 text-center">
// // // // // // // //             <p className="text-gray-400 font-black uppercase text-xs">No items match your search "{searchQuery}"</p>
// // // // // // // //           </div>
// // // // // // // //         )}
// // // // // // // //       </main>

// // // // // // // //       {/* --- REQUESTS DRAWER --- */}
// // // // // // // //       {isRequestsOpen && (
// // // // // // // //         <div className="fixed inset-0 z-[110] flex justify-end">
// // // // // // // //           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsRequestsOpen(false)} />
// // // // // // // //           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
// // // // // // // //             <div className="p-6 border-b flex justify-between items-center bg-blue-600 text-white">
// // // // // // // //               <h2 className="text-lg font-black uppercase italic">Inventory Requests</h2>
// // // // // // // //               <button onClick={() => setIsRequestsOpen(false)} className="text-2xl font-light">✕</button>
// // // // // // // //             </div>
// // // // // // // //             <div className="p-4 border-b bg-blue-50">
// // // // // // // //                 <button onClick={startNewRequest} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-all">+ Add New Request</button>
// // // // // // // //             </div>
// // // // // // // //             <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
// // // // // // // //               {requests.length === 0 ? (
// // // // // // // //                 <div className="h-full flex flex-col items-center justify-center text-gray-400 uppercase text-[10px] font-black">No requests found</div>
// // // // // // // //               ) : requests.map((r) => (
// // // // // // // //                 <div key={r._id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
// // // // // // // //                   <div className="flex justify-between items-start mb-3">
// // // // // // // //                     <div>
// // // // // // // //                       <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
// // // // // // // //                         r.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 
// // // // // // // //                         r.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
// // // // // // // //                       }`}>{r.status}</span>
// // // // // // // //                       <p className="text-[10px] font-bold text-gray-900 mt-1">For: {new Date(r.targetDate).toLocaleDateString()}</p>
// // // // // // // //                     </div>
// // // // // // // //                   </div>
// // // // // // // //                   <div className="space-y-1.5">
// // // // // // // //                     {r.items.map((it, idx) => {
// // // // // // // //                       const details = getItemDetails(it.stockItemId?._id || it.stockRecordId, it);
// // // // // // // //                       return (
// // // // // // // //                         <div key={idx} className="flex justify-between text-[10px] font-bold uppercase text-gray-500 bg-gray-50 p-2 rounded-lg">
// // // // // // // //                           <span>{details.name}</span>
// // // // // // // //                           <span className="text-blue-600">{it.qtyBaseUnit || it.quantity} {details.unit}</span>
// // // // // // // //                         </div>
// // // // // // // //                       );
// // // // // // // //                     })}
// // // // // // // //                   </div>
// // // // // // // //                 </div>
// // // // // // // //               ))}
// // // // // // // //             </div>
// // // // // // // //           </div>
// // // // // // // //         </div>
// // // // // // // //       )}

// // // // // // // //       {/* --- HISTORY DRAWER --- */}
// // // // // // // //       {isOrdersOpen && (
// // // // // // // //         <div className="fixed inset-0 z-[110] flex justify-end">
// // // // // // // //           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsOrdersOpen(false)} />
// // // // // // // //           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
// // // // // // // //             <div className="p-6 border-b flex justify-between items-center">
// // // // // // // //               <h2 className="text-lg font-black uppercase italic text-gray-800">Order History</h2>
// // // // // // // //               <button onClick={() => setIsOrdersOpen(false)} className="text-2xl font-light">✕</button>
// // // // // // // //             </div>
// // // // // // // //             <div className="px-6 py-4 bg-gray-50 flex items-center gap-2 border-b">
// // // // // // // //               <DatePicker 
// // // // // // // //                 selected={selectedHistoryDate ? new Date(selectedHistoryDate) : null} 
// // // // // // // //                 onChange={(date) => setSelectedHistoryDate(date ? date.toISOString().split('T')[0] : "")} 
// // // // // // // //                 customInput={<CustomDateInput placeholder="Filter by Date" />} 
// // // // // // // //                 dateFormat="yyyy-MM-dd" 
// // // // // // // //               />
// // // // // // // //               {selectedHistoryDate && <button onClick={() => setSelectedHistoryDate("")} className="text-[9px] font-black text-red-500 uppercase px-2">Clear</button>}
// // // // // // // //             </div>
// // // // // // // //             <div className="flex-1 overflow-y-auto p-4 space-y-4">
// // // // // // // //               {filteredOrders.map((order) => (
// // // // // // // //                 <details key={order._id} className="group bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
// // // // // // // //                   <summary className="list-none cursor-pointer p-4 flex justify-between items-center text-left">
// // // // // // // //                     <div className="space-y-1">
// // // // // // // //                         <span className="text-[8px] font-black bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase">Completed</span>
// // // // // // // //                         <p className="text-[10px] font-bold text-gray-400">{new Date(order.createdAt).toLocaleString()}</p>
// // // // // // // //                         <h3 className="text-xs font-black uppercase text-gray-800">{order.items.length} Items</h3>
// // // // // // // //                     </div>
// // // // // // // //                     <div className="text-gray-300 group-open:rotate-180 transition-transform">▼</div>
// // // // // // // //                   </summary>
// // // // // // // //                   <div className="px-4 pb-4 bg-gray-50/50 border-t pt-3 space-y-2">
// // // // // // // //                     {order.items.map((it, idx) => {
// // // // // // // //                       const details = getItemDetails(it.stockRecordId || it.stockItemId?._id, it);
// // // // // // // //                       return (
// // // // // // // //                         <div key={idx} className="flex justify-between text-[10px] font-black uppercase text-gray-600 bg-white p-2 rounded-lg border border-gray-100">
// // // // // // // //                           <span>{details.name}</span>
// // // // // // // //                           <span className="text-green-600">{it.qtyBaseUnit || it.quantity} {details.unit}</span>
// // // // // // // //                         </div>
// // // // // // // //                       );
// // // // // // // //                     })}
// // // // // // // //                   </div>
// // // // // // // //                 </details>
// // // // // // // //               ))}
// // // // // // // //             </div>
// // // // // // // //           </div>
// // // // // // // //         </div>
// // // // // // // //       )}

// // // // // // // //       {/* --- CART DRAWER --- */}
// // // // // // // //       {isCartOpen && (
// // // // // // // //         <div className="fixed inset-0 z-[110] flex justify-end">
// // // // // // // //           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCartOpen(false)} />
// // // // // // // //           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
// // // // // // // //             <div className="p-6 border-b flex justify-between items-center">
// // // // // // // //               <h2 className="text-lg font-black uppercase italic">{isRequestMode ? "Review Request" : "Checkout Cart"}</h2>
// // // // // // // //               <button onClick={() => setIsCartOpen(false)} className="text-2xl font-light">✕</button>
// // // // // // // //             </div>
// // // // // // // //             <div className="flex-1 overflow-y-auto p-4 space-y-4">
// // // // // // // //               {isRequestMode && (
// // // // // // // //                 <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-4 mb-2">
// // // // // // // //                   <div>
// // // // // // // //                     <label className="text-[9px] font-black uppercase text-blue-600 ml-1">Needed By Date</label>
// // // // // // // //                     <DatePicker selected={requestDate} onChange={(date) => setRequestDate(date)} customInput={<CustomDateInput />} />
// // // // // // // //                   </div>
// // // // // // // //                   <div>
// // // // // // // //                     <label className="text-[9px] font-black uppercase text-blue-600 ml-1">Reason / Note</label>
// // // // // // // //                     <textarea rows="2" placeholder="Why do you need these items?" className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 ring-blue-500" value={requestReason} onChange={(e) => setRequestReason(e.target.value)} />
// // // // // // // //                   </div>
// // // // // // // //                 </div>
// // // // // // // //               )}
// // // // // // // //               {cart.length === 0 ? (
// // // // // // // //                 <div className="text-center py-20 text-gray-400 uppercase text-[10px] font-black">No items selected</div>
// // // // // // // //               ) : cart.map(item => (
// // // // // // // //                 <div key={item.stockRecordId || item._id} className="flex gap-4 items-center bg-gray-50 p-3 rounded-2xl border border-gray-100">
// // // // // // // //                     <div className="w-10 h-10 bg-white rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center p-1">
// // // // // // // //                       <img src={item.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=f8f9fa&color=10b981&bold=true`} alt="" className="w-full h-full object-contain" />
// // // // // // // //                     </div>
// // // // // // // //                     <div className="flex-1">
// // // // // // // //                       <p className="text-[10px] font-black uppercase text-gray-800 line-clamp-1">{item.name}</p>
// // // // // // // //                       <p className="text-[8px] text-gray-400 font-bold uppercase">{item.unit}</p>
// // // // // // // //                     </div>
// // // // // // // //                     <div className="flex items-center gap-2">
// // // // // // // //                       <button onClick={() => addToCart(item, item.requestedQty - 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-black">-</button>
// // // // // // // //                       <span className="text-[11px] font-black w-4 text-center">{item.requestedQty}</span>
// // // // // // // //                       <button onClick={() => addToCart(item, item.requestedQty + 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-black">+</button>
// // // // // // // //                     </div>
// // // // // // // //                 </div>
// // // // // // // //               ))}
// // // // // // // //             </div>
// // // // // // // //             {cart.length > 0 && (
// // // // // // // //               <div className="p-6 border-t bg-white">
// // // // // // // //                 <button onClick={handleSubmitOrder} className={`w-full py-4 rounded-2xl font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all ${isRequestMode ? "bg-blue-600 text-white" : "bg-black text-white"}`}>
// // // // // // // //                   {isRequestMode ? "Submit to Admin" : "Place Order"}
// // // // // // // //                 </button>
// // // // // // // //               </div>
// // // // // // // //             )}
// // // // // // // //           </div>
// // // // // // // //         </div>
// // // // // // // //       )}
// // // // // // // //     </div>
// // // // // // // //   );
// // // // // // // // };








// // // // // // // // 10














// // // // // // // import React, { useState, useEffect, useMemo, forwardRef } from 'react';
// // // // // // // import { useNavigate } from 'react-router-dom';
// // // // // // // import { api } from "../api";
// // // // // // // import { toast } from 'react-hot-toast';
// // // // // // // import { socket } from "../socket"; 
// // // // // // // import InventoryCard from './InventoryCard';
// // // // // // // import DatePicker from "react-datepicker";
// // // // // // // import "react-datepicker/dist/react-datepicker.css";

// // // // // // // // --- Sub-Components ---
// // // // // // // const CustomDateInput = forwardRef(({ value, onClick, placeholder }, ref) => (
// // // // // // //   <button
// // // // // // //     className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-xs font-bold text-gray-800 flex items-center justify-between hover:border-blue-500 transition-all active:scale-[0.98] shadow-sm"
// // // // // // //     onClick={onClick}
// // // // // // //     ref={ref}
// // // // // // //   >
// // // // // // //     <span>{value || placeholder || "Select Date"}</span>
// // // // // // //     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // // // // // //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
// // // // // // //     </svg>
// // // // // // //   </button>
// // // // // // // ));

// // // // // // // export const ClientStore = () => {
// // // // // // //   // --- State: Data ---
// // // // // // //   const [items, setItems] = useState([]);
// // // // // // //   const [cart, setCart] = useState([]);
// // // // // // //   const [orders, setOrders] = useState([]); 
// // // // // // //   const [requests, setRequests] = useState([]); 
// // // // // // //   const [loading, setLoading] = useState(true);

// // // // // // //   // --- State: UI & Filters ---
// // // // // // //   const [searchQuery, setSearchQuery] = useState("");
// // // // // // //   const [selectedHistoryDate, setSelectedHistoryDate] = useState(""); 
// // // // // // //   const [isCartOpen, setIsCartOpen] = useState(false);
// // // // // // //   const [isOrdersOpen, setIsOrdersOpen] = useState(false); 
// // // // // // //   const [isRequestsOpen, setIsRequestsOpen] = useState(false); 

// // // // // // //   // --- State: Request Mode Specifics ---
// // // // // // //   const [isRequestMode, setIsRequestMode] = useState(false); 
// // // // // // //   const [requestReason, setRequestReason] = useState(""); 
// // // // // // //   const [requestDate, setRequestDate] = useState(new Date());

// // // // // // //   const navigate = useNavigate();

// // // // // // //   const handleLogout = () => {
// // // // // // //     localStorage.removeItem("token"); 
// // // // // // //     socket.disconnect();
// // // // // // //     toast.success("Logged out successfully");
// // // // // // //     navigate("/login");
// // // // // // //   };

// // // // // // //   useEffect(() => {
// // // // // // //     const init = async () => {
// // // // // // //       await Promise.all([fetchItems(), fetchMyOrders(), fetchMyRequests()]);
// // // // // // //       setLoading(false);
// // // // // // //     };
// // // // // // //     init();
    
// // // // // // //     socket.on("low_stock_alert", (data) => {
// // // // // // //       toast.error(`⚠️ ${data.payload.message}`, {
// // // // // // //         duration: 6000,
// // // // // // //         position: "top-right",
// // // // // // //         style: { border: '2px solid #ef4444', padding: '16px', fontWeight: '900', background: '#fff', color: '#000' }
// // // // // // //       });
// // // // // // //     });
    
// // // // // // //     return () => socket.off("low_stock_alert");
// // // // // // //   }, [navigate]);

// // // // // // //   const fetchItems = async () => {
// // // // // // //     try {
// // // // // // //       const res = await api.get('/my-kitchen-stock'); 
// // // // // // //       const formattedItems = res.data.map(item => ({
// // // // // // //         stockRecordId: item.stockRecordId, 
// // // // // // //         _id: item.stockItemId?._id || item.stockItemId,
// // // // // // //         name: item.name || item.stockItemId?.name || "Unknown Item",
// // // // // // //         currentQty: Number(item.currentQty) || 0, 
// // // // // // //         unit: item.unit || item.stockItemId?.unit || "Units", 
// // // // // // //         image: item.image || item.stockItemId?.image || ""
// // // // // // //       })).sort((a, b) => a.name.localeCompare(b.name));
// // // // // // //       setItems(formattedItems);
// // // // // // //     } catch (err) {
// // // // // // //       console.error("Fetch Error:", err);
// // // // // // //       toast.error("Failed to sync inventory");
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const fetchMyOrders = async () => {
// // // // // // //     try {
// // // // // // //       const res = await api.get('/consumptions/me');
// // // // // // //       setOrders(res.data);
// // // // // // //     } catch (err) { console.error("Failed to fetch orders"); }
// // // // // // //   };

// // // // // // //   const fetchMyRequests = async () => {
// // // // // // //     try {
// // // // // // //       const res = await api.get('/requests');
// // // // // // //       setRequests(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
// // // // // // //     } catch (err) { console.error("Failed to fetch requests"); }
// // // // // // //   };

// // // // // // //   const filteredItems = useMemo(() => {
// // // // // // //     return items.filter(item => 
// // // // // // //       item.name.toLowerCase().includes(searchQuery.toLowerCase())
// // // // // // //     );
// // // // // // //   }, [items, searchQuery]);

// // // // // // //   const getItemDetails = (id, fallbackObj) => {
// // // // // // //     const found = items.find(i => i.stockRecordId === id || i._id === id);
// // // // // // //     if (found) return found;
// // // // // // //     return {
// // // // // // //       name: fallbackObj.name || fallbackObj.stockItemId?.name || "Unknown Item",
// // // // // // //       unit: fallbackObj.unit || fallbackObj.stockItemId?.unit || "Units", 
// // // // // // //       image: fallbackObj.image || fallbackObj.stockItemId?.image || "",
// // // // // // //       stockRecordId: fallbackObj.stockRecordId,
// // // // // // //       _id: fallbackObj.stockItemId?._id || id
// // // // // // //     };
// // // // // // //   };

// // // // // // //   const filteredOrders = useMemo(() => {
// // // // // // //     if (!orders) return [];
// // // // // // //     let list = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // //     if (!selectedHistoryDate) return list;
// // // // // // //     return list.filter(order => new Date(order.createdAt).toISOString().split('T')[0] === selectedHistoryDate);
// // // // // // //   }, [orders, selectedHistoryDate]);

// // // // // // //   const startNewRequest = () => {
// // // // // // //     setIsRequestMode(true);
// // // // // // //     setCart([]);
// // // // // // //     setRequestReason("");
// // // // // // //     setRequestDate(new Date());
// // // // // // //     setIsRequestsOpen(false);
// // // // // // //     toast("Pick items for your request", { icon: '📅' });
// // // // // // //   };

// // // // // // //   const addToCart = (product, newRequestedQty) => {
// // // // // // //     // UPDATED: Use parseFloat instead of parseInt to support decimal quantities
// // // // // // //     const rawVal = parseFloat(newRequestedQty);
// // // // // // //     const sanitizedQty = Math.max(0, Math.round(rawVal * 10) / 10 || 0);
    
// // // // // // //     const existingInCart = cart.find(i => i.stockRecordId === product.stockRecordId);
// // // // // // //     const oldQty = existingInCart ? parseFloat(existingInCart.requestedQty) || 0 : 0;
// // // // // // //     const diff = sanitizedQty - oldQty;

// // // // // // //     const targetItem = items.find(i => i.stockRecordId === product.stockRecordId);
    
// // // // // // //     if (!isRequestMode && diff > 0 && (!targetItem || targetItem.currentQty < diff)) {
// // // // // // //         return toast.error("Insufficient Stock");
// // // // // // //     }

// // // // // // //     if (sanitizedQty <= 0) {
// // // // // // //       removeFromCart(product);
// // // // // // //       return;
// // // // // // //     }

// // // // // // //     if (!isRequestMode) {
// // // // // // //       setItems(prev => prev.map(item =>
// // // // // // //         item.stockRecordId === product.stockRecordId ? { ...item, currentQty: Math.round((item.currentQty - diff) * 10) / 10 } : item
// // // // // // //       ));
// // // // // // //     }

// // // // // // //     setCart(prev => {
// // // // // // //       if (existingInCart) return prev.map(i => i.stockRecordId === product.stockRecordId ? { ...i, requestedQty: sanitizedQty } : i);
// // // // // // //       return [...prev, { ...product, requestedQty: sanitizedQty }];
// // // // // // //     });
// // // // // // //   };

// // // // // // //   const removeFromCart = (itemToRemove) => {
// // // // // // //     if (!isRequestMode) {
// // // // // // //       setItems(prev => prev.map(item =>
// // // // // // //         item.stockRecordId === itemToRemove.stockRecordId 
// // // // // // //         ? { ...item, currentQty: Math.round((item.currentQty + (parseFloat(itemToRemove.requestedQty) || 0)) * 10) / 10 } : item
// // // // // // //       ));
// // // // // // //     }
// // // // // // //     setCart(prev => prev.filter(i => i.stockRecordId !== itemToRemove.stockRecordId));
// // // // // // //   };

// // // // // // //   const handleSubmitOrder = async () => {
// // // // // // //     const validItems = cart.map(item => ({
// // // // // // //       stockItemId: item._id,
// // // // // // //       qtyBaseUnit: Number(item.requestedQty), // Number handles decimals correctly for the API
// // // // // // //       stockRecordId: item.stockRecordId 
// // // // // // //     })).filter(it => it.qtyBaseUnit > 0);

// // // // // // //     if (validItems.length === 0) return toast.error("Please add items");
// // // // // // //     if (isRequestMode && !requestReason.trim()) return toast.error("Please provide a reason");

// // // // // // //     const loadingToast = toast.loading("Processing...");
// // // // // // //     try {
// // // // // // //       const endpoint = isRequestMode ? '/requests' : '/orders'; 
// // // // // // //       const payload = isRequestMode ? {
// // // // // // //         items: validItems,
// // // // // // //         reason: requestReason,
// // // // // // //         targetDate: requestDate.toISOString(),
// // // // // // //       } : {
// // // // // // //         items: validItems,
// // // // // // //         date: new Date().toISOString()
// // // // // // //       };

// // // // // // //       await api.post(endpoint, payload);
// // // // // // //       toast.dismiss(loadingToast);
// // // // // // //       toast.success(isRequestMode ? "Request sent for approval!" : "Order placed!");

// // // // // // //       setCart([]);
// // // // // // //       setRequestReason("");
// // // // // // //       setIsCartOpen(false);
// // // // // // //       setIsRequestMode(false); 
// // // // // // //       await Promise.all([fetchItems(), fetchMyOrders(), fetchMyRequests()]);
// // // // // // //     } catch (err) {
// // // // // // //       toast.dismiss(loadingToast);
// // // // // // //       toast.error(err.response?.data?.error || "Submission Failed");
// // // // // // //     }
// // // // // // //   };

// // // // // // //   return (
// // // // // // //     <div className="min-h-screen bg-[#F8F9FA] pb-24 font-sans text-slate-900">
// // // // // // //       <header className="bg-white sticky top-0 z-40 p-4 shadow-sm border-b border-gray-100">
// // // // // // //         <div className="max-w-7xl mx-auto flex justify-between items-center px-0 md:px-2">
// // // // // // //           <h1 className="text-lg md:text-xl font-black italic uppercase">
// // // // // // //             <span className="text-green-600">GODOWN Stock</span>
// // // // // // //           </h1>
          
// // // // // // //           <div className="flex gap-2 items-center">
// // // // // // //             <button onClick={() => setIsRequestsOpen(true)} className="hidden md:block bg-blue-50 text-blue-600 px-4 py-2 rounded-full font-black text-[10px] uppercase active:scale-95 border border-blue-100">
// // // // // // //               Requests {requests.filter(r => r.status === 'pending').length > 0 && <span className="ml-1 animate-pulse">●</span>}
// // // // // // //             </button>

// // // // // // //             <button onClick={() => setIsOrdersOpen(true)} className="hidden md:block bg-gray-100 text-gray-800 px-4 py-2 rounded-full font-black text-[10px] uppercase active:scale-95">
// // // // // // //               History
// // // // // // //             </button>

// // // // // // //             <button 
// // // // // // //               onClick={() => setIsCartOpen(true)}
// // // // // // //               className={`${isRequestMode ? 'bg-blue-600' : 'bg-black'} text-white px-4 py-2 rounded-full font-black text-[10px] flex items-center gap-2 active:scale-95 shadow-lg uppercase transition-colors`}
// // // // // // //             >
// // // // // // //               {isRequestMode ? "List" : "Cart"} <span className="bg-white text-black px-1.5 py-0.5 rounded text-[9px]">{cart.length}</span>
// // // // // // //             </button>

// // // // // // //             <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
// // // // // // //               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // // // // // //                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
// // // // // // //               </svg>
// // // // // // //             </button>
// // // // // // //           </div>
// // // // // // //         </div>
// // // // // // //       </header>

// // // // // // //       <div className="bg-white border-b border-gray-100 p-3 sticky top-[68px] z-30 shadow-sm">
// // // // // // //         <div className="max-w-7xl mx-auto px-1">
// // // // // // //           <div className="relative">
// // // // // // //             <input 
// // // // // // //               type="text" 
// // // // // // //               placeholder="Search items by name..."
// // // // // // //               value={searchQuery}
// // // // // // //               onChange={(e) => setSearchQuery(e.target.value)}
// // // // // // //               className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-11 text-xs font-bold outline-none focus:ring-2 ring-green-500/20 focus:bg-white focus:border-green-500 transition-all shadow-sm"
// // // // // // //             />
// // // // // // //             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // // // // // //               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
// // // // // // //             </svg>
// // // // // // //             {searchQuery && (
// // // // // // //               <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-500 w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-colors">✕</button>
// // // // // // //             )}
// // // // // // //           </div>
// // // // // // //         </div>
// // // // // // //       </div>

// // // // // // //       <main className="max-w-7xl mx-auto p-4 md:p-8">
// // // // // // //         {isRequestMode && (
// // // // // // //             <div className="mb-6 bg-blue-50 border-2 border-blue-200 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
// // // // // // //                 <div>
// // // // // // //                   <p className="text-blue-700 font-black text-[10px] uppercase tracking-wider">📅 Creating New Request</p>
// // // // // // //                   <p className="text-blue-900 text-xs font-bold">Target Date: {requestDate.toLocaleDateString()}</p>
// // // // // // //                 </div>
// // // // // // //                 <div className="flex gap-3 w-full md:w-auto">
// // // // // // //                    <button onClick={() => setIsCartOpen(true)} className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase">Review & Send</button>
// // // // // // //                    <button onClick={() => { setIsRequestMode(false); setCart([]); fetchItems(); }} className="flex-1 md:flex-none bg-white text-red-500 border border-red-100 px-6 py-2 rounded-xl font-black text-[10px] uppercase">Cancel</button>
// // // // // // //                 </div>
// // // // // // //             </div>
// // // // // // //         )}

// // // // // // //         {filteredItems.length > 0 ? (
// // // // // // //           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-8">
// // // // // // //             {filteredItems.map((item) => (
// // // // // // //               <InventoryCard 
// // // // // // //                   key={item.stockRecordId} 
// // // // // // //                   item={item} 
// // // // // // //                   isRequestMode={isRequestMode} // NEW: Pass the mode to the card
// // // // // // //                   cartQty={cart.find(c => c.stockRecordId === item.stockRecordId)?.requestedQty || 0} 
// // // // // // //                   onAddToCart={addToCart} 
// // // // // // //               />
// // // // // // //             ))}
// // // // // // //           </div>
// // // // // // //         ) : (
// // // // // // //           <div className="py-20 text-center">
// // // // // // //             <p className="text-gray-400 font-black uppercase text-xs">No items match your search "{searchQuery}"</p>
// // // // // // //           </div>
// // // // // // //         )}
// // // // // // //       </main>

// // // // // // //       {/* --- REQUESTS DRAWER --- */}
// // // // // // //       {isRequestsOpen && (
// // // // // // //         <div className="fixed inset-0 z-[110] flex justify-end">
// // // // // // //           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsRequestsOpen(false)} />
// // // // // // //           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
// // // // // // //             <div className="p-6 border-b flex justify-between items-center bg-blue-600 text-white">
// // // // // // //               <h2 className="text-lg font-black uppercase italic">Inventory Requests</h2>
// // // // // // //               <button onClick={() => setIsRequestsOpen(false)} className="text-2xl font-light">✕</button>
// // // // // // //             </div>
// // // // // // //             <div className="p-4 border-b bg-blue-50">
// // // // // // //                 <button onClick={startNewRequest} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-all">+ Add New Request</button>
// // // // // // //             </div>
// // // // // // //             <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
// // // // // // //               {requests.length === 0 ? (
// // // // // // //                 <div className="h-full flex flex-col items-center justify-center text-gray-400 uppercase text-[10px] font-black">No requests found</div>
// // // // // // //               ) : requests.map((r) => (
// // // // // // //                 <div key={r._id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
// // // // // // //                   <div className="flex justify-between items-start mb-3">
// // // // // // //                     <div>
// // // // // // //                       <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
// // // // // // //                         r.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 
// // // // // // //                         r.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
// // // // // // //                       }`}>{r.status}</span>
// // // // // // //                       <p className="text-[10px] font-bold text-gray-900 mt-1">For: {new Date(r.targetDate).toLocaleDateString()}</p>
// // // // // // //                     </div>
// // // // // // //                   </div>
// // // // // // //                   <div className="space-y-1.5">
// // // // // // //                     {r.items.map((it, idx) => {
// // // // // // //                       const details = getItemDetails(it.stockItemId?._id || it.stockRecordId, it);
// // // // // // //                       return (
// // // // // // //                         <div key={idx} className="flex justify-between text-[10px] font-bold uppercase text-gray-500 bg-gray-50 p-2 rounded-lg">
// // // // // // //                           <span>{details.name}</span>
// // // // // // //                           <span className="text-blue-600">{it.qtyBaseUnit || it.quantity} {details.unit}</span>
// // // // // // //                         </div>
// // // // // // //                       );
// // // // // // //                     })}
// // // // // // //                   </div>
// // // // // // //                 </div>
// // // // // // //               ))}
// // // // // // //             </div>
// // // // // // //           </div>
// // // // // // //         </div>
// // // // // // //       )}

// // // // // // //       {/* --- HISTORY DRAWER --- */}
// // // // // // //       {isOrdersOpen && (
// // // // // // //         <div className="fixed inset-0 z-[110] flex justify-end">
// // // // // // //           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsOrdersOpen(false)} />
// // // // // // //           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
// // // // // // //             <div className="p-6 border-b flex justify-between items-center text-gray-800">
// // // // // // //               <h2 className="text-lg font-black uppercase italic">Order History</h2>
// // // // // // //               <button onClick={() => setIsOrdersOpen(false)} className="text-2xl font-light">✕</button>
// // // // // // //             </div>
// // // // // // //             <div className="px-6 py-4 bg-gray-50 flex items-center gap-2 border-b">
// // // // // // //               <DatePicker 
// // // // // // //                 selected={selectedHistoryDate ? new Date(selectedHistoryDate) : null} 
// // // // // // //                 onChange={(date) => setSelectedHistoryDate(date ? date.toISOString().split('T')[0] : "")} 
// // // // // // //                 customInput={<CustomDateInput placeholder="Filter by Date" />} 
// // // // // // //                 dateFormat="yyyy-MM-dd" 
// // // // // // //               />
// // // // // // //               {selectedHistoryDate && <button onClick={() => setSelectedHistoryDate("")} className="text-[9px] font-black text-red-500 uppercase px-2">Clear</button>}
// // // // // // //             </div>
// // // // // // //             <div className="flex-1 overflow-y-auto p-4 space-y-4">
// // // // // // //               {filteredOrders.map((order) => (
// // // // // // //                 <details key={order._id} className="group bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
// // // // // // //                   <summary className="list-none cursor-pointer p-4 flex justify-between items-center">
// // // // // // //                     <div className="space-y-1">
// // // // // // //                         <span className="text-[8px] font-black bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase">Completed</span>
// // // // // // //                         <p className="text-[10px] font-bold text-gray-400">{new Date(order.createdAt).toLocaleString()}</p>
// // // // // // //                         <h3 className="text-xs font-black uppercase text-gray-800">{order.items.length} Items</h3>
// // // // // // //                     </div>
// // // // // // //                     <div className="text-gray-300 group-open:rotate-180 transition-transform">▼</div>
// // // // // // //                   </summary>
// // // // // // //                   <div className="px-4 pb-4 bg-gray-50/50 border-t pt-3 space-y-2">
// // // // // // //                     {order.items.map((it, idx) => {
// // // // // // //                       const details = getItemDetails(it.stockRecordId || it.stockItemId?._id, it);
// // // // // // //                       return (
// // // // // // //                         <div key={idx} className="flex justify-between text-[10px] font-black uppercase text-gray-600 bg-white p-2 rounded-lg border border-gray-100">
// // // // // // //                           <span>{details.name}</span>
// // // // // // //                           <span className="text-green-600">{it.qtyBaseUnit || it.quantity} {details.unit}</span>
// // // // // // //                         </div>
// // // // // // //                       );
// // // // // // //                     })}
// // // // // // //                   </div>
// // // // // // //                 </details>
// // // // // // //               ))}
// // // // // // //             </div>
// // // // // // //           </div>
// // // // // // //         </div>
// // // // // // //       )}

// // // // // // //       {/* --- CART DRAWER --- */}
// // // // // // //       {isCartOpen && (
// // // // // // //         <div className="fixed inset-0 z-[110] flex justify-end">
// // // // // // //           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCartOpen(false)} />
// // // // // // //           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
// // // // // // //             <div className="p-6 border-b flex justify-between items-center">
// // // // // // //               <h2 className="text-lg font-black uppercase italic">{isRequestMode ? "Review Request" : "Checkout Cart"}</h2>
// // // // // // //               <button onClick={() => setIsCartOpen(false)} className="text-2xl font-light">✕</button>
// // // // // // //             </div>
// // // // // // //             <div className="flex-1 overflow-y-auto p-4 space-y-4">
// // // // // // //               {isRequestMode && (
// // // // // // //                 <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-4 mb-2">
// // // // // // //                   <div>
// // // // // // //                     <label className="text-[9px] font-black uppercase text-blue-600 ml-1">Needed By Date</label>
// // // // // // //                     <DatePicker selected={requestDate} onChange={(date) => setRequestDate(date)} customInput={<CustomDateInput />} />
// // // // // // //                   </div>
// // // // // // //                   <div>
// // // // // // //                     <label className="text-[9px] font-black uppercase text-blue-600 ml-1">Reason / Note</label>
// // // // // // //                     <textarea rows="2" placeholder="Why do you need these items?" className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 ring-blue-500" value={requestReason} onChange={(e) => setRequestReason(e.target.value)} />
// // // // // // //                   </div>
// // // // // // //                 </div>
// // // // // // //               )}
// // // // // // //               {cart.length === 0 ? (
// // // // // // //                 <div className="text-center py-20 text-gray-400 uppercase text-[10px] font-black">No items selected</div>
// // // // // // //               ) : cart.map(item => (
// // // // // // //                 <div key={item.stockRecordId || item._id} className="flex gap-4 items-center bg-gray-50 p-3 rounded-2xl border border-gray-100">
// // // // // // //                     <div className="w-10 h-10 bg-white rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center p-1">
// // // // // // //                       <img src={item.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=f8f9fa&color=10b981&bold=true`} alt="" className="w-full h-full object-contain" />
// // // // // // //                     </div>
// // // // // // //                     <div className="flex-1">
// // // // // // //                       <p className="text-[10px] font-black uppercase text-gray-800 line-clamp-1">{item.name}</p>
// // // // // // //                       <p className="text-[8px] text-gray-400 font-bold uppercase">{item.unit}</p>
// // // // // // //                     </div>
// // // // // // //                     <div className="flex items-center gap-2">
// // // // // // //                       {/* UPDATED: Decrement by 0.1 for precision */}
// // // // // // //                       <button onClick={() => addToCart(item, item.requestedQty - 0.1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-black">-</button>
// // // // // // //                       <span className="text-[11px] font-black w-8 text-center">{item.requestedQty}</span>
// // // // // // //                       {/* UPDATED: Increment by 0.1 for precision */}
// // // // // // //                       <button onClick={() => addToCart(item, item.requestedQty + 0.1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-black">+</button>
// // // // // // //                     </div>
// // // // // // //                 </div>
// // // // // // //               ))}
// // // // // // //             </div>
// // // // // // //             {cart.length > 0 && (
// // // // // // //               <div className="p-6 border-t bg-white">
// // // // // // //                 <button onClick={handleSubmitOrder} className={`w-full py-4 rounded-2xl font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all ${isRequestMode ? "bg-blue-600 text-white" : "bg-black text-white"}`}>
// // // // // // //                   {isRequestMode ? "Submit to Admin" : "Place Order"}
// // // // // // //                 </button>
// // // // // // //               </div>
// // // // // // //             )}
// // // // // // //           </div>
// // // // // // //         </div>
// // // // // // //       )}
// // // // // // //     </div>
// // // // // // //   );
// // // // // // // };











// // // // // // // 2









// // // // // // import React, { useState, useEffect, useMemo, forwardRef } from 'react';
// // // // // // import { useNavigate } from 'react-router-dom';
// // // // // // import { api } from "../api";
// // // // // // import { toast } from 'react-hot-toast';
// // // // // // import { socket } from "../socket"; 
// // // // // // import InventoryCard from './InventoryCard';
// // // // // // import DatePicker from "react-datepicker";
// // // // // // import "react-datepicker/dist/react-datepicker.css";

// // // // // // // --- Sub-Components ---
// // // // // // const CustomDateInput = forwardRef(({ value, onClick, placeholder }, ref) => (
// // // // // //   <button
// // // // // //     className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-xs font-bold text-gray-800 flex items-center justify-between hover:border-blue-500 transition-all active:scale-[0.98] shadow-sm"
// // // // // //     onClick={onClick}
// // // // // //     ref={ref}
// // // // // //   >
// // // // // //     <span>{value || placeholder || "Select Date"}</span>
// // // // // //     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // // // // //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
// // // // // //     </svg>
// // // // // //   </button>
// // // // // // ));

// // // // // // export const ClientStore = () => {
// // // // // //   // --- State: Data ---
// // // // // //   const [items, setItems] = useState([]);
// // // // // //   const [cart, setCart] = useState([]);
// // // // // //   const [orders, setOrders] = useState([]); 
// // // // // //   const [requests, setRequests] = useState([]); 
// // // // // //   const [loading, setLoading] = useState(true);

// // // // // //   // --- State: UI & Filters ---
// // // // // //   const [searchQuery, setSearchQuery] = useState("");
// // // // // //   const [selectedHistoryDate, setSelectedHistoryDate] = useState(""); 
// // // // // //   const [isCartOpen, setIsCartOpen] = useState(false);
// // // // // //   const [isOrdersOpen, setIsOrdersOpen] = useState(false); 
// // // // // //   const [isRequestsOpen, setIsRequestsOpen] = useState(false); 

// // // // // //   // --- State: Request Mode Specifics ---
// // // // // //   const [isRequestMode, setIsRequestMode] = useState(false); 
// // // // // //   const [requestReason, setRequestReason] = useState(""); 
// // // // // //   const [requestDate, setRequestDate] = useState(new Date());

// // // // // //   const navigate = useNavigate();

// // // // // //   const handleLogout = () => {
// // // // // //     localStorage.removeItem("token"); 
// // // // // //     socket.disconnect();
// // // // // //     toast.success("Logged out successfully");
// // // // // //     navigate("/login");
// // // // // //   };

// // // // // //   useEffect(() => {
// // // // // //     const init = async () => {
// // // // // //       await Promise.all([fetchItems(), fetchMyOrders(), fetchMyRequests()]);
// // // // // //       setLoading(false);
// // // // // //     };
// // // // // //     init();
    
// // // // // //     socket.on("low_stock_alert", (data) => {
// // // // // //       toast.error(`⚠️ ${data.payload.message}`, {
// // // // // //         duration: 6000,
// // // // // //         position: "top-right",
// // // // // //         style: { border: '2px solid #ef4444', padding: '16px', fontWeight: '900', background: '#fff', color: '#000' }
// // // // // //       });
// // // // // //     });
    
// // // // // //     return () => socket.off("low_stock_alert");
// // // // // //   }, [navigate]);

// // // // // //   const fetchItems = async () => {
// // // // // //     try {
// // // // // //       const res = await api.get('/my-kitchen-stock'); 
// // // // // //       const formattedItems = res.data.map(item => ({
// // // // // //         stockRecordId: item.stockRecordId, 
// // // // // //         _id: item.stockItemId?._id || item.stockItemId,
// // // // // //         name: item.name || item.stockItemId?.name || "Unknown Item",
// // // // // //         currentQty: Number(item.currentQty) || 0, 
// // // // // //         unit: item.unit || item.stockItemId?.unit || "Units", 
// // // // // //         image: item.image || item.stockItemId?.image || ""
// // // // // //       })).sort((a, b) => a.name.localeCompare(b.name));
// // // // // //       setItems(formattedItems);
// // // // // //     } catch (err) {
// // // // // //       console.error("Fetch Error:", err);
// // // // // //       toast.error("Failed to sync inventory");
// // // // // //     }
// // // // // //   };

// // // // // //   const fetchMyOrders = async () => {
// // // // // //     try {
// // // // // //       const res = await api.get('/consumptions/me');
// // // // // //       setOrders(res.data);
// // // // // //     } catch (err) { console.error("Failed to fetch orders"); }
// // // // // //   };

// // // // // //   const fetchMyRequests = async () => {
// // // // // //     try {
// // // // // //       const res = await api.get('/requests');
// // // // // //       setRequests(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
// // // // // //     } catch (err) { console.error("Failed to fetch requests"); }
// // // // // //   };

// // // // // //   const filteredItems = useMemo(() => {
// // // // // //     return items.filter(item => 
// // // // // //       item.name.toLowerCase().includes(searchQuery.toLowerCase())
// // // // // //     );
// // // // // //   }, [items, searchQuery]);

// // // // // //   const getItemDetails = (id, fallbackObj) => {
// // // // // //     const found = items.find(i => i.stockRecordId === id || i._id === id);
// // // // // //     if (found) return found;
// // // // // //     return {
// // // // // //       name: fallbackObj.name || fallbackObj.stockItemId?.name || "Unknown Item",
// // // // // //       unit: fallbackObj.unit || fallbackObj.stockItemId?.unit || "Units", 
// // // // // //       image: fallbackObj.image || fallbackObj.stockItemId?.image || "",
// // // // // //       stockRecordId: fallbackObj.stockRecordId,
// // // // // //       _id: fallbackObj.stockItemId?._id || id
// // // // // //     };
// // // // // //   };

// // // // // //   const filteredOrders = useMemo(() => {
// // // // // //     if (!orders) return [];
// // // // // //     let list = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // //     if (!selectedHistoryDate) return list;
// // // // // //     return list.filter(order => new Date(order.createdAt).toISOString().split('T')[0] === selectedHistoryDate);
// // // // // //   }, [orders, selectedHistoryDate]);

// // // // // //   const startNewRequest = () => {
// // // // // //     setIsRequestMode(true);
// // // // // //     setCart([]);
// // // // // //     setRequestReason("");
// // // // // //     setRequestDate(new Date());
// // // // // //     setIsRequestsOpen(false);
// // // // // //     toast("Pick items for your request", { icon: '📅' });
// // // // // //   };

// // // // // //   const addToCart = (product, newRequestedQty) => {
// // // // // //     // 1. Handle raw input (empty strings allowed while typing)
// // // // // //     if (newRequestedQty === "") {
// // // // // //         updateCartState(product, 0);
// // // // // //         return;
// // // // // //     }

// // // // // //     const sanitizedQty = Math.max(0, Math.round(parseFloat(newRequestedQty) * 10) / 10 || 0);
    
// // // // // //     const existingInCart = cart.find(i => i.stockRecordId === product.stockRecordId);
// // // // // //     const oldQty = existingInCart ? parseFloat(existingInCart.requestedQty) || 0 : 0;
// // // // // //     const diff = sanitizedQty - oldQty;

// // // // // //     const targetItem = items.find(i => i.stockRecordId === product.stockRecordId);
    
// // // // // //     // 2. Stock validation (Only in normal Order mode)
// // // // // //     if (!isRequestMode && diff > 0) {
// // // // // //         if (!targetItem || targetItem.currentQty < diff) {
// // // // // //             toast.error("Insufficient Stock");
// // // // // //             return;
// // // // // //         }
// // // // // //     }

// // // // // //     // 3. Update main items list (Live Stock Deduction)
// // // // // //     if (!isRequestMode) {
// // // // // //       setItems(prev => prev.map(item =>
// // // // // //         item.stockRecordId === product.stockRecordId 
// // // // // //         ? { ...item, currentQty: Math.round((item.currentQty - diff) * 10) / 10 } 
// // // // // //         : item
// // // // // //       ));
// // // // // //     }

// // // // // //     updateCartState(product, sanitizedQty);
// // // // // //   };

// // // // // //   const updateCartState = (product, qty) => {
// // // // // //     setCart(prev => {
// // // // // //         const exists = prev.find(i => i.stockRecordId === product.stockRecordId);
// // // // // //         if (qty <= 0) return prev.filter(i => i.stockRecordId !== product.stockRecordId);
// // // // // //         if (exists) return prev.map(i => i.stockRecordId === product.stockRecordId ? { ...i, requestedQty: qty } : i);
// // // // // //         return [...prev, { ...product, requestedQty: qty }];
// // // // // //     });
// // // // // //   };

// // // // // //   const removeFromCart = (itemToRemove) => {
// // // // // //     if (!isRequestMode) {
// // // // // //       setItems(prev => prev.map(item =>
// // // // // //         item.stockRecordId === itemToRemove.stockRecordId 
// // // // // //         ? { ...item, currentQty: Math.round((item.currentQty + (parseFloat(itemToRemove.requestedQty) || 0)) * 10) / 10 } : item
// // // // // //       ));
// // // // // //     }
// // // // // //     setCart(prev => prev.filter(i => i.stockRecordId !== itemToRemove.stockRecordId));
// // // // // //   };

// // // // // //   const handleSubmitOrder = async () => {
// // // // // //     const validItems = cart.map(item => ({
// // // // // //       stockItemId: item._id,
// // // // // //       qtyBaseUnit: Number(item.requestedQty),
// // // // // //       stockRecordId: item.stockRecordId 
// // // // // //     })).filter(it => it.qtyBaseUnit > 0);

// // // // // //     if (validItems.length === 0) return toast.error("Please add items");
// // // // // //     if (isRequestMode && !requestReason.trim()) return toast.error("Please provide a reason");

// // // // // //     const loadingToast = toast.loading("Processing...");
// // // // // //     try {
// // // // // //       const endpoint = isRequestMode ? '/requests' : '/orders'; 
// // // // // //       const payload = isRequestMode ? {
// // // // // //         items: validItems,
// // // // // //         reason: requestReason,
// // // // // //         targetDate: requestDate.toISOString(),
// // // // // //       } : {
// // // // // //         items: validItems,
// // // // // //         date: new Date().toISOString()
// // // // // //       };

// // // // // //       await api.post(endpoint, payload);
// // // // // //       toast.dismiss(loadingToast);
// // // // // //       toast.success(isRequestMode ? "Request sent for approval!" : "Order placed!");

// // // // // //       setCart([]);
// // // // // //       setRequestReason("");
// // // // // //       setIsCartOpen(false);
// // // // // //       setIsRequestMode(false); 
// // // // // //       await Promise.all([fetchItems(), fetchMyOrders(), fetchMyRequests()]);
// // // // // //     } catch (err) {
// // // // // //       toast.dismiss(loadingToast);
// // // // // //       toast.error(err.response?.data?.error || "Submission Failed");
// // // // // //     }
// // // // // //   };

// // // // // //   return (
// // // // // //     <div className="min-h-screen bg-[#F8F9FA] pb-24 font-sans text-slate-900">
// // // // // //       <header className="bg-white sticky top-0 z-40 p-4 shadow-sm border-b border-gray-100">
// // // // // //         <div className="max-w-7xl mx-auto flex justify-between items-center px-0 md:px-2">
// // // // // //           <h1 className="text-lg md:text-xl font-black italic uppercase">
// // // // // //             <span className="text-green-600">GODOWN Stock</span>
// // // // // //           </h1>
          
// // // // // //           <div className="flex gap-2 items-center">
// // // // // //             <button onClick={() => setIsRequestsOpen(true)} className="hidden md:block bg-blue-50 text-blue-600 px-4 py-2 rounded-full font-black text-[10px] uppercase active:scale-95 border border-blue-100">
// // // // // //               Requests {requests.filter(r => r.status === 'pending').length > 0 && <span className="ml-1 animate-pulse">●</span>}
// // // // // //             </button>

// // // // // //             <button onClick={() => setIsOrdersOpen(true)} className="hidden md:block bg-gray-100 text-gray-800 px-4 py-2 rounded-full font-black text-[10px] uppercase active:scale-95">
// // // // // //               History
// // // // // //             </button>

// // // // // //             <button 
// // // // // //               onClick={() => setIsCartOpen(true)}
// // // // // //               className={`${isRequestMode ? 'bg-blue-600' : 'bg-black'} text-white px-4 py-2 rounded-full font-black text-[10px] flex items-center gap-2 active:scale-95 shadow-lg uppercase transition-colors`}
// // // // // //             >
// // // // // //               {isRequestMode ? "List" : "Cart"} <span className="bg-white text-black px-1.5 py-0.5 rounded text-[9px]">{cart.length}</span>
// // // // // //             </button>

// // // // // //             <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
// // // // // //               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // // // // //                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
// // // // // //               </svg>
// // // // // //             </button>
// // // // // //           </div>
// // // // // //         </div>
// // // // // //       </header>

// // // // // //       <div className="bg-white border-b border-gray-100 p-3 sticky top-[68px] z-30 shadow-sm">
// // // // // //         <div className="max-w-7xl mx-auto px-1">
// // // // // //           <div className="relative">
// // // // // //             <input 
// // // // // //               type="text" 
// // // // // //               placeholder="Search items by name..."
// // // // // //               value={searchQuery}
// // // // // //               onChange={(e) => setSearchQuery(e.target.value)}
// // // // // //               className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-11 text-xs font-bold outline-none focus:ring-2 ring-green-500/20 focus:bg-white focus:border-green-500 transition-all shadow-sm"
// // // // // //             />
// // // // // //             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // // // // //               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
// // // // // //             </svg>
// // // // // //             {searchQuery && (
// // // // // //               <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-500 w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-colors">✕</button>
// // // // // //             )}
// // // // // //           </div>
// // // // // //         </div>
// // // // // //       </div>

// // // // // //       <main className="max-w-7xl mx-auto p-4 md:p-8">
// // // // // //         {isRequestMode && (
// // // // // //             <div className="mb-6 bg-blue-50 border-2 border-blue-200 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
// // // // // //                 <div>
// // // // // //                   <p className="text-blue-700 font-black text-[10px] uppercase tracking-wider">📅 Creating New Request</p>
// // // // // //                   <p className="text-blue-900 text-xs font-bold">Target Date: {requestDate.toLocaleDateString()}</p>
// // // // // //                 </div>
// // // // // //                 <div className="flex gap-3 w-full md:w-auto">
// // // // // //                    <button onClick={() => setIsCartOpen(true)} className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase">Review & Send</button>
// // // // // //                    <button onClick={() => { setIsRequestMode(false); setCart([]); fetchItems(); }} className="flex-1 md:flex-none bg-white text-red-500 border border-red-100 px-6 py-2 rounded-xl font-black text-[10px] uppercase">Cancel</button>
// // // // // //                 </div>
// // // // // //             </div>
// // // // // //         )}

// // // // // //         {filteredItems.length > 0 ? (
// // // // // //           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-8">
// // // // // //             {filteredItems.map((item) => (
// // // // // //               <InventoryCard 
// // // // // //                   key={item.stockRecordId} 
// // // // // //                   item={item} 
// // // // // //                   isRequestMode={isRequestMode} 
// // // // // //                   cartQty={cart.find(c => c.stockRecordId === item.stockRecordId)?.requestedQty || 0} 
// // // // // //                   onAddToCart={addToCart} 
// // // // // //               />
// // // // // //             ))}
// // // // // //           </div>
// // // // // //         ) : (
// // // // // //           <div className="py-20 text-center">
// // // // // //             <p className="text-gray-400 font-black uppercase text-xs">No items match your search "{searchQuery}"</p>
// // // // // //           </div>
// // // // // //         )}
// // // // // //       </main>

// // // // // //       {/* --- REQUESTS DRAWER --- */}
// // // // // //       {isRequestsOpen && (
// // // // // //         <div className="fixed inset-0 z-[110] flex justify-end">
// // // // // //           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsRequestsOpen(false)} />
// // // // // //           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
// // // // // //             <div className="p-6 border-b flex justify-between items-center bg-blue-600 text-white">
// // // // // //               <h2 className="text-lg font-black uppercase italic">Inventory Requests</h2>
// // // // // //               <button onClick={() => setIsRequestsOpen(false)} className="text-2xl font-light">✕</button>
// // // // // //             </div>
// // // // // //             <div className="p-4 border-b bg-blue-50">
// // // // // //                 <button onClick={startNewRequest} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-all">+ Add New Request</button>
// // // // // //             </div>
// // // // // //             <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
// // // // // //               {requests.length === 0 ? (
// // // // // //                 <div className="h-full flex flex-col items-center justify-center text-gray-400 uppercase text-[10px] font-black">No requests found</div>
// // // // // //               ) : requests.map((r) => (
// // // // // //                 <div key={r._id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
// // // // // //                   <div className="flex justify-between items-start mb-3">
// // // // // //                     <div>
// // // // // //                       <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
// // // // // //                         r.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 
// // // // // //                         r.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
// // // // // //                       }`}>{r.status}</span>
// // // // // //                       <p className="text-[10px] font-bold text-gray-900 mt-1">For: {new Date(r.targetDate).toLocaleDateString()}</p>
// // // // // //                     </div>
// // // // // //                   </div>
// // // // // //                   <div className="space-y-1.5">
// // // // // //                     {r.items.map((it, idx) => {
// // // // // //                       const details = getItemDetails(it.stockItemId?._id || it.stockRecordId, it);
// // // // // //                       return (
// // // // // //                         <div key={idx} className="flex justify-between text-[10px] font-bold uppercase text-gray-500 bg-gray-50 p-2 rounded-lg">
// // // // // //                           <span>{details.name}</span>
// // // // // //                           <span className="text-blue-600">{it.qtyBaseUnit || it.quantity} {details.unit}</span>
// // // // // //                         </div>
// // // // // //                       );
// // // // // //                     })}
// // // // // //                   </div>
// // // // // //                 </div>
// // // // // //               ))}
// // // // // //             </div>
// // // // // //           </div>
// // // // // //         </div>
// // // // // //       )}

// // // // // //       {/* --- HISTORY DRAWER --- */}
// // // // // //       {isOrdersOpen && (
// // // // // //         <div className="fixed inset-0 z-[110] flex justify-end">
// // // // // //           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsOrdersOpen(false)} />
// // // // // //           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
// // // // // //             <div className="p-6 border-b flex justify-between items-center text-gray-800">
// // // // // //               <h2 className="text-lg font-black uppercase italic">Order History</h2>
// // // // // //               <button onClick={() => setIsOrdersOpen(false)} className="text-2xl font-light">✕</button>
// // // // // //             </div>
// // // // // //             <div className="px-6 py-4 bg-gray-50 flex items-center gap-2 border-b">
// // // // // //               <DatePicker 
// // // // // //                 selected={selectedHistoryDate ? new Date(selectedHistoryDate) : null} 
// // // // // //                 onChange={(date) => setSelectedHistoryDate(date ? date.toISOString().split('T')[0] : "")} 
// // // // // //                 customInput={<CustomDateInput placeholder="Filter by Date" />} 
// // // // // //                 dateFormat="yyyy-MM-dd" 
// // // // // //               />
// // // // // //               {selectedHistoryDate && <button onClick={() => setSelectedHistoryDate("")} className="text-[9px] font-black text-red-500 uppercase px-2">Clear</button>}
// // // // // //             </div>
// // // // // //             <div className="flex-1 overflow-y-auto p-4 space-y-4">
// // // // // //               {filteredOrders.map((order) => (
// // // // // //                 <details key={order._id} className="group bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
// // // // // //                   <summary className="list-none cursor-pointer p-4 flex justify-between items-center">
// // // // // //                     <div className="space-y-1">
// // // // // //                         <span className="text-[8px] font-black bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase">Completed</span>
// // // // // //                         <p className="text-[10px] font-bold text-gray-400">{new Date(order.createdAt).toLocaleString()}</p>
// // // // // //                         <h3 className="text-xs font-black uppercase text-gray-800">{order.items.length} Items</h3>
// // // // // //                     </div>
// // // // // //                     <div className="text-gray-300 group-open:rotate-180 transition-transform">▼</div>
// // // // // //                   </summary>
// // // // // //                   <div className="px-4 pb-4 bg-gray-50/50 border-t pt-3 space-y-2">
// // // // // //                     {order.items.map((it, idx) => {
// // // // // //                       const details = getItemDetails(it.stockRecordId || it.stockItemId?._id, it);
// // // // // //                       return (
// // // // // //                         <div key={idx} className="flex justify-between text-[10px] font-black uppercase text-gray-600 bg-white p-2 rounded-lg border border-gray-100">
// // // // // //                           <span>{details.name}</span>
// // // // // //                           <span className="text-green-600">{it.qtyBaseUnit || it.quantity} {details.unit}</span>
// // // // // //                         </div>
// // // // // //                       );
// // // // // //                     })}
// // // // // //                   </div>
// // // // // //                 </details>
// // // // // //               ))}
// // // // // //             </div>
// // // // // //           </div>
// // // // // //         </div>
// // // // // //       )}

// // // // // //       {/* --- CART DRAWER --- */}
// // // // // //       {isCartOpen && (
// // // // // //         <div className="fixed inset-0 z-[110] flex justify-end">
// // // // // //           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCartOpen(false)} />
// // // // // //           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
// // // // // //             <div className="p-6 border-b flex justify-between items-center">
// // // // // //               <h2 className="text-lg font-black uppercase italic">{isRequestMode ? "Review Request" : "Checkout Cart"}</h2>
// // // // // //               <button onClick={() => setIsCartOpen(false)} className="text-2xl font-light">✕</button>
// // // // // //             </div>
// // // // // //             <div className="flex-1 overflow-y-auto p-4 space-y-4">
// // // // // //               {isRequestMode && (
// // // // // //                 <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-4 mb-2">
// // // // // //                   <div>
// // // // // //                     <label className="text-[9px] font-black uppercase text-blue-600 ml-1">Needed By Date</label>
// // // // // //                     <DatePicker selected={requestDate} onChange={(date) => setRequestDate(date)} customInput={<CustomDateInput />} />
// // // // // //                   </div>
// // // // // //                   <div>
// // // // // //                     <label className="text-[9px] font-black uppercase text-blue-600 ml-1">Reason / Note</label>
// // // // // //                     <textarea rows="2" placeholder="Why do you need these items?" className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 ring-blue-500" value={requestReason} onChange={(e) => setRequestReason(e.target.value)} />
// // // // // //                   </div>
// // // // // //                 </div>
// // // // // //               )}
// // // // // //               {cart.length === 0 ? (
// // // // // //                 <div className="text-center py-20 text-gray-400 uppercase text-[10px] font-black">No items selected</div>
// // // // // //               ) : cart.map(item => (
// // // // // //                 <div key={item.stockRecordId || item._id} className="flex gap-4 items-center bg-gray-50 p-3 rounded-2xl border border-gray-100">
// // // // // //                     <div className="w-10 h-10 bg-white rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center p-1">
// // // // // //                       <img src={item.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=f8f9fa&color=10b981&bold=true`} alt="" className="w-full h-full object-contain" />
// // // // // //                     </div>
// // // // // //                     <div className="flex-1">
// // // // // //                       <p className="text-[10px] font-black uppercase text-gray-800 line-clamp-1">{item.name}</p>
// // // // // //                       <p className="text-[8px] text-gray-400 font-bold uppercase">{item.unit}</p>
// // // // // //                     </div>
// // // // // //                     <div className="flex items-center gap-2">
// // // // // //                       <button onClick={() => addToCart(item, item.requestedQty - 0.1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-black">-</button>
                      
// // // // // //                       {/* UPDATED: Changed span to input for manual typing */}
// // // // // //                       <input 
// // // // // //                         type="number"
// // // // // //                         step="0.1"
// // // // // //                         min="0"
// // // // // //                         className="text-[11px] font-black w-12 text-center bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none"
// // // // // //                         value={item.requestedQty}
// // // // // //                         onChange={(e) => addToCart(item, e.target.value)}
// // // // // //                         onBlur={(e) => {
// // // // // //                             if(e.target.value === "" || parseFloat(e.target.value) <= 0) {
// // // // // //                                 removeFromCart(item);
// // // // // //                             }
// // // // // //                         }}
// // // // // //                       />

// // // // // //                       <button onClick={() => addToCart(item, item.requestedQty + 0.1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-black">+</button>
// // // // // //                     </div>
// // // // // //                 </div>
// // // // // //               ))}
// // // // // //             </div>
// // // // // //             {cart.length > 0 && (
// // // // // //               <div className="p-6 border-t bg-white">
// // // // // //                 <button onClick={handleSubmitOrder} className={`w-full py-4 rounded-2xl font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all ${isRequestMode ? "bg-blue-600 text-white" : "bg-black text-white"}`}>
// // // // // //                   {isRequestMode ? "Submit to Admin" : "Place Order"}
// // // // // //                 </button>
// // // // // //               </div>
// // // // // //             )}
// // // // // //           </div>
// // // // // //         </div>
// // // // // //       )}
// // // // // //     </div>
// // // // // //   );
// // // // // // };


















// // // // // // 333









// // // // // import React, { useState, useEffect, useMemo, forwardRef } from 'react';
// // // // // import { useNavigate } from 'react-router-dom';
// // // // // import { api } from "../api";
// // // // // import { toast } from 'react-hot-toast';
// // // // // import { socket } from "../socket"; 
// // // // // import InventoryCard from './InventoryCard';
// // // // // import DatePicker from "react-datepicker";
// // // // // import "react-datepicker/dist/react-datepicker.css";

// // // // // // --- Sub-Components ---
// // // // // const CustomDateInput = forwardRef(({ value, onClick, placeholder }, ref) => (
// // // // //   <button
// // // // //     className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-xs font-bold text-gray-800 flex items-center justify-between hover:border-blue-500 transition-all active:scale-[0.98] shadow-sm"
// // // // //     onClick={onClick}
// // // // //     ref={ref}
// // // // //   >
// // // // //     <span>{value || placeholder || "Select Date"}</span>
// // // // //     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // // // //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
// // // // //     </svg>
// // // // //   </button>
// // // // // ));

// // // // // export const ClientStore = () => {
// // // // //   // --- State: Data ---
// // // // //   const [items, setItems] = useState([]);
// // // // //   const [cart, setCart] = useState([]);
// // // // //   const [orders, setOrders] = useState([]); 
// // // // //   const [requests, setRequests] = useState([]); 
// // // // //   const [loading, setLoading] = useState(true);

// // // // //   // --- State: UI & Filters ---
// // // // //   const [searchQuery, setSearchQuery] = useState("");
// // // // //   const [selectedHistoryDate, setSelectedHistoryDate] = useState(""); 
// // // // //   const [isCartOpen, setIsCartOpen] = useState(false);
// // // // //   const [isOrdersOpen, setIsOrdersOpen] = useState(false); 
// // // // //   const [isRequestsOpen, setIsRequestsOpen] = useState(false); 

// // // // //   // --- State: Request Mode Specifics ---
// // // // //   const [isRequestMode, setIsRequestMode] = useState(false); 
// // // // //   const [requestReason, setRequestReason] = useState(""); 
// // // // //   const [requestDate, setRequestDate] = useState(new Date());

// // // // //   const navigate = useNavigate();

// // // // //   const handleLogout = () => {
// // // // //     localStorage.removeItem("token"); 
// // // // //     socket.disconnect();
// // // // //     toast.success("Logged out successfully");
// // // // //     navigate("/login");
// // // // //   };

// // // // //   useEffect(() => {
// // // // //     const init = async () => {
// // // // //       await Promise.all([fetchItems(), fetchMyOrders(), fetchMyRequests()]);
// // // // //       setLoading(false);
// // // // //     };
// // // // //     init();
    
// // // // //     socket.on("low_stock_alert", (data) => {
// // // // //       toast.error(`⚠️ ${data.payload.message}`, {
// // // // //         duration: 6000,
// // // // //         position: "top-right",
// // // // //         style: { border: '2px solid #ef4444', padding: '16px', fontWeight: '900', background: '#fff', color: '#000' }
// // // // //       });
// // // // //     });
    
// // // // //     return () => socket.off("low_stock_alert");
// // // // //   }, [navigate]);

// // // // //   const fetchItems = async () => {
// // // // //     try {
// // // // //       const res = await api.get('/my-kitchen-stock'); 
// // // // //       const formattedItems = res.data.map(item => ({
// // // // //         stockRecordId: item.stockRecordId, 
// // // // //         _id: item.stockItemId?._id || item.stockItemId,
// // // // //         name: item.name || item.stockItemId?.name || "Unknown Item",
// // // // //         currentQty: Number(item.currentQty) || 0, 
// // // // //         unit: item.unit || item.stockItemId?.unit || "Units", 
// // // // //         image: item.image || item.stockItemId?.image || ""
// // // // //       })).sort((a, b) => a.name.localeCompare(b.name));
// // // // //       setItems(formattedItems);
// // // // //     } catch (err) {
// // // // //       console.error("Fetch Error:", err);
// // // // //       toast.error("Failed to sync inventory");
// // // // //     }
// // // // //   };

// // // // //   const fetchMyOrders = async () => {
// // // // //     try {
// // // // //       const res = await api.get('/consumptions/me');
// // // // //       setOrders(res.data);
// // // // //     } catch (err) { console.error("Failed to fetch orders"); }
// // // // //   };

// // // // //   const fetchMyRequests = async () => {
// // // // //     try {
// // // // //       const res = await api.get('/requests');
// // // // //       setRequests(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
// // // // //     } catch (err) { console.error("Failed to fetch requests"); }
// // // // //   };

// // // // //   const filteredItems = useMemo(() => {
// // // // //     return items.filter(item => 
// // // // //       item.name.toLowerCase().includes(searchQuery.toLowerCase())
// // // // //     );
// // // // //   }, [items, searchQuery]);

// // // // //   const getItemDetails = (id, fallbackObj) => {
// // // // //     const found = items.find(i => i.stockRecordId === id || i._id === id);
// // // // //     if (found) return found;
// // // // //     return {
// // // // //       name: fallbackObj.name || fallbackObj.stockItemId?.name || "Unknown Item",
// // // // //       unit: fallbackObj.unit || fallbackObj.stockItemId?.unit || "Units", 
// // // // //       image: fallbackObj.image || fallbackObj.stockItemId?.image || "",
// // // // //       stockRecordId: fallbackObj.stockRecordId,
// // // // //       _id: fallbackObj.stockItemId?._id || id
// // // // //     };
// // // // //   };

// // // // //   const filteredOrders = useMemo(() => {
// // // // //     if (!orders) return [];
// // // // //     let list = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // //     if (!selectedHistoryDate) return list;
// // // // //     return list.filter(order => new Date(order.createdAt).toISOString().split('T')[0] === selectedHistoryDate);
// // // // //   }, [orders, selectedHistoryDate]);

// // // // //   const startNewRequest = () => {
// // // // //     setIsRequestMode(true);
// // // // //     setCart([]);
// // // // //     setRequestReason("");
// // // // //     setRequestDate(new Date());
// // // // //     setIsRequestsOpen(false);
// // // // //     toast("Pick items for your request", { icon: '📅' });
// // // // //   };

// // // // //   // --- UPDATED LOGIC FOR RETURN SUPPORT & TEXT INPUTS ---
// // // // //   const addToCart = (product, newRequestedQty) => {
// // // // //     if (newRequestedQty === "-" || newRequestedQty === "") {
// // // // //       updateCartState(product, newRequestedQty);
// // // // //       return;
// // // // //     }

// // // // //     const parsedQty = parseFloat(newRequestedQty);
// // // // //     if (isNaN(parsedQty)) return;

// // // // //     const sanitizedQty = Math.round(parsedQty * 10) / 10;
    
// // // // //     const existingInCart = cart.find(i => i.stockRecordId === product.stockRecordId);
// // // // //     const oldQty = existingInCart ? parseFloat(existingInCart.requestedQty) || 0 : 0;
// // // // //     const diff = sanitizedQty - oldQty;

// // // // //     const targetItem = items.find(i => i.stockRecordId === product.stockRecordId);
    
// // // // //     if (!isRequestMode) {
// // // // //       if (sanitizedQty < 0) {
// // // // //          toast.error("Cannot order negative amounts");
// // // // //          return;
// // // // //       }
// // // // //       if (diff > 0) {
// // // // //         if (!targetItem || targetItem.currentQty < diff) {
// // // // //           toast.error("Insufficient Stock");
// // // // //           return;
// // // // //         }
// // // // //       }

// // // // //       setItems(prev => prev.map(item =>
// // // // //         item.stockRecordId === product.stockRecordId 
// // // // //         ? { ...item, currentQty: Math.round((item.currentQty - diff) * 10) / 10 } 
// // // // //         : item
// // // // //       ));
// // // // //     }

// // // // //     updateCartState(product, sanitizedQty);
// // // // //   };

// // // // //   const updateCartState = (product, qty) => {
// // // // //     setCart(prev => {
// // // // //       const exists = prev.find(i => i.stockRecordId === product.stockRecordId);
      
// // // // //       // CHANGE: Only remove if it's 0 AND not in request mode (to allow potential returns)
// // // // //       if (qty === 0 && !isRequestMode) { 
// // // // //           return prev.filter(i => i.stockRecordId !== product.stockRecordId);
// // // // //       }
      
// // // // //       if (exists) {
// // // // //         return prev.map(i => i.stockRecordId === product.stockRecordId ? { ...i, requestedQty: qty } : i);
// // // // //       }
// // // // //       return [...prev, { ...product, requestedQty: qty }];
// // // // //     });
// // // // //   };

// // // // //   const removeFromCart = (itemToRemove) => {
// // // // //     if (!isRequestMode) {
// // // // //       setItems(prev => prev.map(item =>
// // // // //         item.stockRecordId === itemToRemove.stockRecordId 
// // // // //         ? { ...item, currentQty: Math.round((item.currentQty + (parseFloat(itemToRemove.requestedQty) || 0)) * 10) / 10 } : item
// // // // //       ));
// // // // //     }
// // // // //     setCart(prev => prev.filter(i => i.stockRecordId !== itemToRemove.stockRecordId));
// // // // //   };

// // // // //   const handleSubmitOrder = async () => {
// // // // //     const validItems = cart.map(item => ({
// // // // //       stockItemId: item._id,
// // // // //       qtyBaseUnit: Number(item.requestedQty),
// // // // //       stockRecordId: item.stockRecordId 
// // // // //     })).filter(it => it.qtyBaseUnit !== 0 && !isNaN(it.qtyBaseUnit));

// // // // //     if (validItems.length === 0) return toast.error("Please add items");
// // // // //     if (isRequestMode && !requestReason.trim()) return toast.error("Please provide a reason");

// // // // //     const loadingToast = toast.loading("Processing...");
// // // // //     try {
// // // // //       const endpoint = isRequestMode ? '/requests' : '/orders'; 
// // // // //       const payload = isRequestMode ? {
// // // // //         items: validItems,
// // // // //         reason: requestReason,
// // // // //         targetDate: requestDate.toISOString(),
// // // // //       } : {
// // // // //         items: validItems,
// // // // //         date: new Date().toISOString()
// // // // //       };

// // // // //       await api.post(endpoint, payload);
// // // // //       toast.dismiss(loadingToast);
// // // // //       toast.success(isRequestMode ? "Request sent for approval!" : "Order placed!");

// // // // //       setCart([]);
// // // // //       setRequestReason("");
// // // // //       setIsCartOpen(false);
// // // // //       setIsRequestMode(false); 
// // // // //       await Promise.all([fetchItems(), fetchMyOrders(), fetchMyRequests()]);
// // // // //     } catch (err) {
// // // // //       toast.dismiss(loadingToast);
// // // // //       toast.error(err.response?.data?.error || "Submission Failed");
// // // // //     }
// // // // //   };

// // // // //   return (
// // // // //     <div className="min-h-screen bg-[#F8F9FA] pb-24 font-sans text-slate-900">
// // // // //       <header className="bg-white sticky top-0 z-40 p-4 shadow-sm border-b border-gray-100">
// // // // //         <div className="max-w-7xl mx-auto flex justify-between items-center px-0 md:px-2">
// // // // //           <h1 className="text-lg md:text-xl font-black italic uppercase">
// // // // //             <span className="text-green-600">GODOWN Stock</span>
// // // // //           </h1>
          
// // // // //           <div className="flex gap-2 items-center">
// // // // //             <button onClick={() => setIsRequestsOpen(true)} className="hidden md:block bg-blue-50 text-blue-600 px-4 py-2 rounded-full font-black text-[10px] uppercase active:scale-95 border border-blue-100">
// // // // //               Requests {requests.filter(r => r.status === 'pending').length > 0 && <span className="ml-1 animate-pulse">●</span>}
// // // // //             </button>

// // // // //             <button onClick={() => setIsOrdersOpen(true)} className="hidden md:block bg-gray-100 text-gray-800 px-4 py-2 rounded-full font-black text-[10px] uppercase active:scale-95">
// // // // //               History
// // // // //             </button>

// // // // //             <button 
// // // // //               onClick={() => setIsCartOpen(true)}
// // // // //               className={`${isRequestMode ? 'bg-blue-600' : 'bg-black'} text-white px-4 py-2 rounded-full font-black text-[10px] flex items-center gap-2 active:scale-95 shadow-lg uppercase transition-colors`}
// // // // //             >
// // // // //               {isRequestMode ? "List" : "Cart"} <span className="bg-white text-black px-1.5 py-0.5 rounded text-[9px]">{cart.length}</span>
// // // // //             </button>

// // // // //             <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
// // // // //               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // // // //                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
// // // // //               </svg>
// // // // //             </button>
// // // // //           </div>
// // // // //         </div>
// // // // //       </header>

// // // // //       <div className="bg-white border-b border-gray-100 p-3 sticky top-[68px] z-30 shadow-sm">
// // // // //         <div className="max-w-7xl mx-auto px-1">
// // // // //           <div className="relative">
// // // // //             <input 
// // // // //               type="text" 
// // // // //               placeholder="Search items by name..."
// // // // //               value={searchQuery}
// // // // //               onChange={(e) => setSearchQuery(e.target.value)}
// // // // //               className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-11 text-xs font-bold outline-none focus:ring-2 ring-green-500/20 focus:bg-white focus:border-green-500 transition-all shadow-sm"
// // // // //             />
// // // // //             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // // // //               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
// // // // //             </svg>
// // // // //             {searchQuery && (
// // // // //               <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-500 w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-colors">✕</button>
// // // // //             )}
// // // // //           </div>
// // // // //         </div>
// // // // //       </div>

// // // // //       <main className="max-w-7xl mx-auto p-4 md:p-8">
// // // // //         {isRequestMode && (
// // // // //             <div className="mb-6 bg-blue-50 border-2 border-blue-200 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
// // // // //                 <div>
// // // // //                   <p className="text-blue-700 font-black text-[10px] uppercase tracking-wider">📅 Creating New Request</p>
// // // // //                   <p className="text-blue-900 text-xs font-bold">Target Date: {requestDate.toLocaleDateString()}</p>
// // // // //                 </div>
// // // // //                 <div className="flex gap-3 w-full md:w-auto">
// // // // //                    <button onClick={() => setIsCartOpen(true)} className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase">Review & Send</button>
// // // // //                    <button onClick={() => { setIsRequestMode(false); setCart([]); fetchItems(); }} className="flex-1 md:flex-none bg-white text-red-500 border border-red-100 px-6 py-2 rounded-xl font-black text-[10px] uppercase">Cancel</button>
// // // // //                 </div>
// // // // //             </div>
// // // // //         )}

// // // // //         {filteredItems.length > 0 ? (
// // // // //           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-8">
// // // // //             {filteredItems.map((item) => (
// // // // //               <InventoryCard 
// // // // //                   key={item.stockRecordId} 
// // // // //                   item={item} 
// // // // //                   isRequestMode={isRequestMode} 
// // // // //                   cartQty={cart.find(c => c.stockRecordId === item.stockRecordId)?.requestedQty || 0} 
// // // // //                   onAddToCart={addToCart} 
// // // // //               />
// // // // //             ))}
// // // // //           </div>
// // // // //         ) : (
// // // // //           <div className="py-20 text-center">
// // // // //             <p className="text-gray-400 font-black uppercase text-xs">No items match your search "{searchQuery}"</p>
// // // // //           </div>
// // // // //         )}
// // // // //       </main>

// // // // //       {/* --- REQUESTS DRAWER --- */}
// // // // //       {isRequestsOpen && (
// // // // //         <div className="fixed inset-0 z-[110] flex justify-end">
// // // // //           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsRequestsOpen(false)} />
// // // // //           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
// // // // //             <div className="p-6 border-b flex justify-between items-center bg-blue-600 text-white">
// // // // //               <h2 className="text-lg font-black uppercase italic">Inventory Requests</h2>
// // // // //               <button onClick={() => setIsRequestsOpen(false)} className="text-2xl font-light">✕</button>
// // // // //             </div>
// // // // //             <div className="p-4 border-b bg-blue-50">
// // // // //                 <button onClick={startNewRequest} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-all">+ Add New Request</button>
// // // // //             </div>
// // // // //             <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
// // // // //               {requests.length === 0 ? (
// // // // //                 <div className="h-full flex flex-col items-center justify-center text-gray-400 uppercase text-[10px] font-black">No requests found</div>
// // // // //               ) : requests.map((r) => (
// // // // //                 <div key={r._id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
// // // // //                   <div className="flex justify-between items-start mb-3">
// // // // //                     <div>
// // // // //                       <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
// // // // //                         r.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 
// // // // //                         r.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
// // // // //                       }`}>{r.status}</span>
// // // // //                       <p className="text-[10px] font-bold text-gray-900 mt-1">For: {new Date(r.targetDate).toLocaleDateString()}</p>
// // // // //                     </div>
// // // // //                   </div>
// // // // //                   <div className="space-y-1.5">
// // // // //                     {r.items.map((it, idx) => {
// // // // //                       const details = getItemDetails(it.stockItemId?._id || it.stockRecordId, it);
// // // // //                       return (
// // // // //                         <div key={idx} className={`flex justify-between text-[10px] font-bold uppercase p-2 rounded-lg ${it.qtyBaseUnit < 0 ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-500'}`}>
// // // // //                           <span>{details.name} {it.qtyBaseUnit < 0 && "[RETURN]"}</span>
// // // // //                           <span className={it.qtyBaseUnit < 0 ? "text-orange-700" : "text-blue-600"}>{it.qtyBaseUnit || it.quantity} {details.unit}</span>
// // // // //                         </div>
// // // // //                       );
// // // // //                     })}
// // // // //                   </div>
// // // // //                 </div>
// // // // //               ))}
// // // // //             </div>
// // // // //           </div>
// // // // //         </div>
// // // // //       )}

// // // // //       {/* --- HISTORY DRAWER --- */}
// // // // //       {isOrdersOpen && (
// // // // //         <div className="fixed inset-0 z-[110] flex justify-end">
// // // // //           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsOrdersOpen(false)} />
// // // // //           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
// // // // //             <div className="p-6 border-b flex justify-between items-center text-gray-800">
// // // // //               <h2 className="text-lg font-black uppercase italic">Order History</h2>
// // // // //               <button onClick={() => setIsOrdersOpen(false)} className="text-2xl font-light">✕</button>
// // // // //             </div>
// // // // //             <div className="px-6 py-4 bg-gray-50 flex items-center gap-2 border-b">
// // // // //               <DatePicker 
// // // // //                 selected={selectedHistoryDate ? new Date(selectedHistoryDate) : null} 
// // // // //                 onChange={(date) => setSelectedHistoryDate(date ? date.toISOString().split('T')[0] : "")} 
// // // // //                 customInput={<CustomDateInput placeholder="Filter by Date" />} 
// // // // //                 dateFormat="yyyy-MM-dd" 
// // // // //               />
// // // // //               {selectedHistoryDate && <button onClick={() => setSelectedHistoryDate("")} className="text-[9px] font-black text-red-500 uppercase px-2">Clear</button>}
// // // // //             </div>
// // // // //             <div className="flex-1 overflow-y-auto p-4 space-y-4">
// // // // //               {filteredOrders.map((order) => (
// // // // //                 <details key={order._id} className="group bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
// // // // //                   <summary className="list-none cursor-pointer p-4 flex justify-between items-center">
// // // // //                     <div className="space-y-1">
// // // // //                         <span className="text-[8px] font-black bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase">Completed</span>
// // // // //                         <p className="text-[10px] font-bold text-gray-400">{new Date(order.createdAt).toLocaleString()}</p>
// // // // //                         <h3 className="text-xs font-black uppercase text-gray-800">{order.items.length} Items</h3>
// // // // //                     </div>
// // // // //                     <div className="text-gray-300 group-open:rotate-180 transition-transform">▼</div>
// // // // //                   </summary>
// // // // //                   <div className="px-4 pb-4 bg-gray-50/50 border-t pt-3 space-y-2">
// // // // //                     {order.items.map((it, idx) => {
// // // // //                       const details = getItemDetails(it.stockRecordId || it.stockItemId?._id, it);
// // // // //                       return (
// // // // //                         <div key={idx} className="flex justify-between text-[10px] font-black uppercase text-gray-600 bg-white p-2 rounded-lg border border-gray-100">
// // // // //                           <span>{details.name}</span>
// // // // //                           <span className="text-green-600">{it.qtyBaseUnit || it.quantity} {details.unit}</span>
// // // // //                         </div>
// // // // //                       );
// // // // //                     })}
// // // // //                   </div>
// // // // //                 </details>
// // // // //               ))}
// // // // //             </div>
// // // // //           </div>
// // // // //         </div>
// // // // //       )}

// // // // //       {/* --- CART DRAWER --- */}
// // // // //       {isCartOpen && (
// // // // //         <div className="fixed inset-0 z-[110] flex justify-end">
// // // // //           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCartOpen(false)} />
// // // // //           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
// // // // //             <div className="p-6 border-b flex justify-between items-center">
// // // // //               <h2 className="text-lg font-black uppercase italic">{isRequestMode ? "Review Request" : "Checkout Cart"}</h2>
// // // // //               <button onClick={() => setIsCartOpen(false)} className="text-2xl font-light">✕</button>
// // // // //             </div>
// // // // //             <div className="flex-1 overflow-y-auto p-4 space-y-4">
// // // // //               {isRequestMode && (
// // // // //                 <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-4 mb-2">
// // // // //                   <div>
// // // // //                     <label className="text-[9px] font-black uppercase text-blue-600 ml-1">Needed By Date</label>
// // // // //                     <DatePicker selected={requestDate} onChange={(date) => setRequestDate(date)} customInput={<CustomDateInput />} />
// // // // //                   </div>
// // // // //                   <div>
// // // // //                     <label className="text-[9px] font-black uppercase text-blue-600 ml-1">Reason / Note</label>
// // // // //                     <textarea rows="2" placeholder="Why do you need these items?" className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 ring-blue-500" value={requestReason} onChange={(e) => setRequestReason(e.target.value)} />
// // // // //                   </div>
// // // // //                 </div>
// // // // //               )}
// // // // //               {cart.length === 0 ? (
// // // // //                 <div className="text-center py-20 text-gray-400 uppercase text-[10px] font-black">No items selected</div>
// // // // //               ) : cart.map(item => (
// // // // //                 <div key={item.stockRecordId || item._id} className={`flex gap-4 items-center p-3 rounded-2xl border ${item.requestedQty < 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
// // // // //                     <div className="w-10 h-10 bg-white rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center p-1">
// // // // //                       <img src={item.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=f8f9fa&color=10b981&bold=true`} alt="" className="w-full h-full object-contain" />
// // // // //                     </div>
// // // // //                     <div className="flex-1">
// // // // //                       <p className="text-[10px] font-black uppercase text-gray-800 line-clamp-1">
// // // // //                         {item.name} {item.requestedQty < 0 && <span className="text-orange-600 ml-1">[RETURN]</span>}
// // // // //                       </p>
// // // // //                       <p className="text-[8px] text-gray-400 font-bold uppercase">{item.unit}</p>
// // // // //                     </div>
// // // // //                     <div className="flex items-center gap-2">
// // // // //                       <button onClick={() => addToCart(item, (parseFloat(item.requestedQty) || 0) - 0.1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-black">-</button>
                      
// // // // //                       <input 
// // // // //                         type="text" 
// // // // //                         inputMode="decimal" 
// // // // //                         className="text-[11px] font-black w-12 text-center bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none"
// // // // //                         value={item.requestedQty}
// // // // //                         onChange={(e) => addToCart(item, e.target.value)}
// // // // //                         onBlur={(e) => {
// // // // //                           const val = parseFloat(e.target.value);
// // // // //                           // deciding if item stays or goes on blur
// // // // //                           if(e.target.value === "" || isNaN(val) || (val === 0 && !isRequestMode)) {
// // // // //                               removeFromCart(item);
// // // // //                           } else {
// // // // //                               updateCartState(item, val);
// // // // //                           }
// // // // //                         }}
// // // // //                       />

// // // // //                       <button onClick={() => addToCart(item, (parseFloat(item.requestedQty) || 0) + 0.1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-black">+</button>
// // // // //                     </div>
// // // // //                 </div>
// // // // //               ))}
// // // // //             </div>
// // // // //             {cart.length > 0 && (
// // // // //               <div className="p-6 border-t bg-white">
// // // // //                 <button onClick={handleSubmitOrder} className={`w-full py-4 rounded-2xl font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all ${isRequestMode ? "bg-blue-600 text-white" : "bg-black text-white"}`}>
// // // // //                   {isRequestMode ? "Submit to Admin" : "Place Order"}
// // // // //                 </button>
// // // // //               </div>
// // // // //             )}
// // // // //           </div>
// // // // //         </div>
// // // // //       )}
// // // // //     </div>
// // // // //   );
// // // // // };
















// // // // // 15















// // // // import React, { useState, useEffect, useMemo, forwardRef } from 'react';
// // // // import { useNavigate } from 'react-router-dom';
// // // // import { api } from "../api";
// // // // import { toast } from 'react-hot-toast';
// // // // import { socket } from "../socket"; 
// // // // import InventoryCard from './InventoryCard';
// // // // import DatePicker from "react-datepicker";
// // // // import "react-datepicker/dist/react-datepicker.css";

// // // // // --- Sub-Components ---
// // // // const CustomDateInput = forwardRef(({ value, onClick, placeholder }, ref) => (
// // // //   <button
// // // //     className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-xs font-bold text-gray-800 flex items-center justify-between hover:border-blue-500 transition-all active:scale-[0.98] shadow-sm"
// // // //     onClick={onClick}
// // // //     ref={ref}
// // // //   >
// // // //     <span>{value || placeholder || "Select Date"}</span>
// // // //     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // // //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
// // // //     </svg>
// // // //   </button>
// // // // ));

// // // // export const ClientStore = () => {
// // // //   // --- State: Core Mode ---
// // // //   const [mode, setMode] = useState("request"); // "request" (Kitchen/Local) | "indent" (Main Godown)

// // // //   // --- State: Data ---
// // // //   const [items, setItems] = useState([]);
// // // //   const [cart, setCart] = useState([]);
// // // //   const [orders, setOrders] = useState([]); 
// // // //   const [requests, setRequests] = useState([]); 
// // // //   const [loading, setLoading] = useState(true);

// // // //   // --- State: UI & Filters ---
// // // //   const [searchQuery, setSearchQuery] = useState("");
// // // //   const [selectedHistoryDate, setSelectedHistoryDate] = useState(""); 
// // // //   const [isCartOpen, setIsCartOpen] = useState(false);
// // // //   const [isOrdersOpen, setIsOrdersOpen] = useState(false); 
// // // //   const [isRequestsOpen, setIsRequestsOpen] = useState(false); 

// // // //   // --- State: Request Mode Specifics ---
// // // //   const [isRequestMode, setIsRequestMode] = useState(false); 
// // // //   const [requestReason, setRequestReason] = useState(""); 
// // // //   const [requestDate, setRequestDate] = useState(new Date());

// // // //   const navigate = useNavigate();

// // // //   const handleLogout = () => {
// // // //     localStorage.removeItem("token"); 
// // // //     socket.disconnect();
// // // //     toast.success("Logged out successfully");
// // // //     navigate("/login");
// // // //   };

// // // //   // Re-fetch items whenever mode changes
// // // //   useEffect(() => {
// // // //     const init = async () => {
// // // //       setLoading(true);
// // // //       await Promise.all([fetchItems(), fetchMyOrders(), fetchMyRequests()]);
// // // //       setLoading(false);
// // // //     };
// // // //     init();
// // // //   }, [mode]);

// // // //   useEffect(() => {
// // // //     socket.on("low_stock_alert", (data) => {
// // // //       toast.error(`⚠️ ${data.payload.message}`, {
// // // //         duration: 6000,
// // // //         position: "top-right",
// // // //         style: { border: '2px solid #ef4444', padding: '16px', fontWeight: '900', background: '#fff', color: '#000' }
// // // //       });
// // // //     });
    
// // // //     return () => socket.off("low_stock_alert");
// // // //   }, [navigate]);

// // // //   const fetchItems = async () => {
// // // //     try {
// // // //       let res;
// // // //       if (mode === "indent") {
// // // //         // Fetch all available items for Indenting from main stock
// // // //         res = await api.get("/inventory/stock-items");
// // // //         const formatted = res.data.map(item => ({
// // // //           stockRecordId: item._id, // Use item ID as record ID for indents
// // // //           _id: item._id,
// // // //           name: item.name,
// // // //           unit: item.unitId?.symbol || "Units",
// // // //           currentQty: 0, // Indent starts with 0
// // // //           image: item.imageUrl || ""
// // // //         })).sort((a, b) => a.name.localeCompare(b.name));
// // // //         setItems(formatted);
// // // //       } else {
// // // //         // Fetch items currently in the user's specific kitchen/store
// // // //         res = await api.get('/my-kitchen-stock'); 
// // // //         const formattedItems = res.data.map(item => ({
// // // //           stockRecordId: item.stockRecordId, 
// // // //           _id: item.stockItemId?._id || item.stockItemId,
// // // //           name: item.name || item.stockItemId?.name || "Unknown Item",
// // // //           currentQty: Number(item.currentQty) || 0, 
// // // //           unit: item.unit || item.stockItemId?.unit || "Units", 
// // // //           image: item.image || item.stockItemId?.image || ""
// // // //         })).sort((a, b) => a.name.localeCompare(b.name));
// // // //         setItems(formattedItems);
// // // //       }
// // // //     } catch (err) {
// // // //       console.error("Fetch Error:", err);
// // // //       toast.error("Failed to sync inventory");
// // // //     }
// // // //   };

// // // //   const fetchMyOrders = async () => {
// // // //     try {
// // // //       const res = await api.get('/consumptions/me');
// // // //       setOrders(res.data);
// // // //     } catch (err) { console.error("Failed to fetch orders"); }
// // // //   };

// // // //   const fetchMyRequests = async () => {
// // // //     try {
// // // //       const res = await api.get('/requests');
// // // //       setRequests(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
// // // //     } catch (err) { console.error("Failed to fetch requests"); }
// // // //   };

// // // //   const filteredItems = useMemo(() => {
// // // //     return items.filter(item => 
// // // //       item.name.toLowerCase().includes(searchQuery.toLowerCase())
// // // //     );
// // // //   }, [items, searchQuery]);

// // // //   const getItemDetails = (id, fallbackObj) => {
// // // //     const found = items.find(i => i.stockRecordId === id || i._id === id);
// // // //     if (found) return found;
// // // //     return {
// // // //       name: fallbackObj.name || fallbackObj.stockItemId?.name || "Unknown Item",
// // // //       unit: fallbackObj.unit || fallbackObj.stockItemId?.unit || "Units", 
// // // //       image: fallbackObj.image || fallbackObj.stockItemId?.image || "",
// // // //       stockRecordId: fallbackObj.stockRecordId,
// // // //       _id: fallbackObj.stockItemId?._id || id
// // // //     };
// // // //   };

// // // //   const filteredOrders = useMemo(() => {
// // // //     if (!orders) return [];
// // // //     let list = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // //     if (!selectedHistoryDate) return list;
// // // //     return list.filter(order => new Date(order.createdAt).toISOString().split('T')[0] === selectedHistoryDate);
// // // //   }, [orders, selectedHistoryDate]);

// // // //   const startNewRequest = () => {
// // // //     setIsRequestMode(true);
// // // //     setCart([]);
// // // //     setRequestReason("");
// // // //     setRequestDate(new Date());
// // // //     setIsRequestsOpen(false);
// // // //     toast("Pick items for your list", { icon: '📅' });
// // // //   };

// // // //   const addToCart = (product, newRequestedQty) => {
// // // //     if (newRequestedQty === "-" || newRequestedQty === "") {
// // // //       updateCartState(product, newRequestedQty);
// // // //       return;
// // // //     }

// // // //     const parsedQty = parseFloat(newRequestedQty);
// // // //     if (isNaN(parsedQty)) return;
// // // //     const sanitizedQty = Math.round(parsedQty * 10) / 10;
    
// // // //     const existingInCart = cart.find(i => i.stockRecordId === product.stockRecordId);
// // // //     const oldQty = existingInCart ? parseFloat(existingInCart.requestedQty) || 0 : 0;
// // // //     const diff = sanitizedQty - oldQty;

// // // //     const targetItem = items.find(i => i.stockRecordId === product.stockRecordId);
    
// // // //     // Only check local stock if we are NOT in Indent mode and NOT in Request mode
// // // //     if (mode !== "indent" && !isRequestMode) {
// // // //       if (sanitizedQty < 0) {
// // // //           toast.error("Cannot order negative amounts");
// // // //           return;
// // // //       }
// // // //       if (diff > 0) {
// // // //         if (!targetItem || targetItem.currentQty < diff) {
// // // //           toast.error("Insufficient Stock");
// // // //           return;
// // // //         }
// // // //       }

// // // //       setItems(prev => prev.map(item =>
// // // //         item.stockRecordId === product.stockRecordId 
// // // //         ? { ...item, currentQty: Math.round((item.currentQty - diff) * 10) / 10 } 
// // // //         : item
// // // //       ));
// // // //     }

// // // //     updateCartState(product, sanitizedQty);
// // // //   };

// // // //   const updateCartState = (product, qty) => {
// // // //     setCart(prev => {
// // // //       const exists = prev.find(i => i.stockRecordId === product.stockRecordId);
// // // //       if (qty === 0 && !isRequestMode && mode !== "indent") { 
// // // //           return prev.filter(i => i.stockRecordId !== product.stockRecordId);
// // // //       }
// // // //       if (exists) {
// // // //         return prev.map(i => i.stockRecordId === product.stockRecordId ? { ...i, requestedQty: qty } : i);
// // // //       }
// // // //       return [...prev, { ...product, requestedQty: qty }];
// // // //     });
// // // //   };

// // // //   const removeFromCart = (itemToRemove) => {
// // // //     if (mode !== "indent" && !isRequestMode) {
// // // //       setItems(prev => prev.map(item =>
// // // //         item.stockRecordId === itemToRemove.stockRecordId 
// // // //         ? { ...item, currentQty: Math.round((item.currentQty + (parseFloat(itemToRemove.requestedQty) || 0)) * 10) / 10 } : item
// // // //       ));
// // // //     }
// // // //     setCart(prev => prev.filter(i => i.stockRecordId !== itemToRemove.stockRecordId));
// // // //   };

// // // //   const handleSubmitOrder = async () => {
// // // //     const validItems = cart.map(item => ({
// // // //       stockItemId: item._id,
// // // //       qtyBaseUnit: Number(item.requestedQty),
// // // //       stockRecordId: item.stockRecordId 
// // // //     })).filter(it => it.qtyBaseUnit !== 0 && !isNaN(it.qtyBaseUnit));

// // // //     if (validItems.length === 0) return toast.error("Please add items");
    
// // // //     // In Indent or Request mode, a reason is often helpful/required
// // // //     if ((mode === "indent" || isRequestMode) && !requestReason.trim()) {
// // // //         return toast.error("Please provide a reason/note");
// // // //     }

// // // //     const loadingToast = toast.loading("Processing...");
// // // //     try {
// // // //       if (mode === "indent") {
// // // //         await api.post("/indent-requests", {
// // // //             items: validItems,
// // // //             note: requestReason,
// // // //             targetDate: requestDate.toISOString(),
// // // //         });
// // // //         toast.success("Indent Request sent to Warehouse!");
// // // //       } else {
// // // //         const endpoint = isRequestMode ? '/requests' : '/orders'; 
// // // //         const payload = isRequestMode ? {
// // // //           items: validItems,
// // // //           reason: requestReason,
// // // //           targetDate: requestDate.toISOString(),
// // // //         } : {
// // // //           items: validItems,
// // // //           date: new Date().toISOString()
// // // //         };
// // // //         await api.post(endpoint, payload);
// // // //         toast.success(isRequestMode ? "Request sent for approval!" : "Order placed!");
// // // //       }

// // // //       toast.dismiss(loadingToast);
// // // //       setCart([]);
// // // //       setRequestReason("");
// // // //       setIsCartOpen(false);
// // // //       setIsRequestMode(false); 
// // // //       await Promise.all([fetchItems(), fetchMyOrders(), fetchMyRequests()]);
// // // //     } catch (err) {
// // // //       toast.dismiss(loadingToast);
// // // //       toast.error(err.response?.data?.error || "Submission Failed");
// // // //     }
// // // //   };

// // // //   return (
// // // //     <div className="min-h-screen bg-[#F8F9FA] pb-24 font-sans text-slate-900">
// // // //       <header className="bg-white sticky top-0 z-40 p-4 shadow-sm border-b border-gray-100">
// // // //         <div className="max-w-7xl mx-auto flex justify-between items-center px-0 md:px-2">
// // // //           <div className="flex flex-col">
// // // //             <h1 className="text-lg md:text-xl font-black italic uppercase leading-none">
// // // //               <span className="text-green-600">GODOWN Stock</span>
// // // //             </h1>
// // // //             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
// // // //                 Mode: {mode === "request" ? "Kitchen Store" : "Warehouse Indent"}
// // // //             </span>
// // // //           </div>

// // // //           <div className="flex gap-2 items-center">
// // // //             {/* Mode Switcher */}
// // // //             <div className="flex bg-gray-100 p-1 rounded-full border border-gray-200 mr-2">
// // // //                 <button 
// // // //                     onClick={() => { setMode("request"); setCart([]); }} 
// // // //                     className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all ${mode === 'request' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
// // // //                 >
// // // //                     Usage
// // // //                 </button>
// // // //                 <button 
// // // //                     onClick={() => { setMode("indent"); setCart([]); }} 
// // // //                     className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all ${mode === 'indent' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400'}`}
// // // //                 >
// // // //                     Indent
// // // //                 </button>
// // // //             </div>

// // // //             <button onClick={() => setIsRequestsOpen(true)} className="hidden md:block bg-blue-50 text-blue-600 px-4 py-2 rounded-full font-black text-[10px] uppercase active:scale-95 border border-blue-100">
// // // //               Requests {requests.filter(r => r.status === 'pending').length > 0 && <span className="ml-1 animate-pulse">●</span>}
// // // //             </button>

// // // //             <button onClick={() => setIsOrdersOpen(true)} className="hidden md:block bg-gray-100 text-gray-800 px-4 py-2 rounded-full font-black text-[10px] uppercase active:scale-95">
// // // //               History
// // // //             </button>

// // // //             <button 
// // // //               onClick={() => setIsCartOpen(true)}
// // // //               className={`${(isRequestMode || mode === "indent") ? 'bg-blue-600' : 'bg-black'} text-white px-4 py-2 rounded-full font-black text-[10px] flex items-center gap-2 active:scale-95 shadow-lg uppercase transition-colors`}
// // // //             >
// // // //               {(isRequestMode || mode === "indent") ? "List" : "Cart"} <span className="bg-white text-black px-1.5 py-0.5 rounded text-[9px]">{cart.length}</span>
// // // //             </button>

// // // //             <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
// // // //               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // // //                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
// // // //               </svg>
// // // //             </button>
// // // //           </div>
// // // //         </div>
// // // //       </header>

// // // //       <div className="bg-white border-b border-gray-100 p-3 sticky top-[68px] z-30 shadow-sm">
// // // //         <div className="max-w-7xl mx-auto px-1">
// // // //           <div className="relative">
// // // //             <input 
// // // //               type="text" 
// // // //               placeholder={mode === "indent" ? "Search warehouse items..." : "Search local store items..."}
// // // //               value={searchQuery}
// // // //               onChange={(e) => setSearchQuery(e.target.value)}
// // // //               className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-11 text-xs font-bold outline-none focus:ring-2 ring-green-500/20 focus:bg-white focus:border-green-500 transition-all shadow-sm"
// // // //             />
// // // //             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // // //               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
// // // //             </svg>
// // // //           </div>
// // // //         </div>
// // // //       </div>

// // // //       <main className="max-w-7xl mx-auto p-4 md:p-8">
// // // //         {(isRequestMode || mode === "indent") && (
// // // //             <div className={`mb-6 border-2 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${mode === "indent" ? "bg-orange-50 border-orange-200" : "bg-blue-50 border-blue-200"}`}>
// // // //                 <div>
// // // //                   <p className={`${mode === "indent" ? "text-orange-700" : "text-blue-700"} font-black text-[10px] uppercase tracking-wider`}>
// // // //                     📅 {mode === "indent" ? "Creating Main Godown Indent" : "Creating New Usage Request"}
// // // //                   </p>
// // // //                   <p className={`${mode === "indent" ? "text-orange-900" : "text-blue-900"} text-xs font-bold`}>Target Date: {requestDate.toLocaleDateString()}</p>
// // // //                 </div>
// // // //                 <div className="flex gap-3 w-full md:w-auto">
// // // //                    <button onClick={() => setIsCartOpen(true)} className={`flex-1 md:flex-none px-6 py-2 rounded-xl font-black text-[10px] uppercase text-white shadow-md ${mode === "indent" ? "bg-orange-600" : "bg-blue-600"}`}>Review & Send</button>
// // // //                    <button onClick={() => { setIsRequestMode(false); setMode("request"); setCart([]); fetchItems(); }} className="flex-1 md:flex-none bg-white text-red-500 border border-red-100 px-6 py-2 rounded-xl font-black text-[10px] uppercase">Cancel</button>
// // // //                 </div>
// // // //             </div>
// // // //         )}

// // // //         {filteredItems.length > 0 ? (
// // // //           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-8">
// // // //             {filteredItems.map((item) => (
// // // //               <InventoryCard 
// // // //                   key={item.stockRecordId} 
// // // //                   item={item} 
// // // //                   isRequestMode={isRequestMode || mode === "indent"} 
// // // //                   cartQty={cart.find(c => c.stockRecordId === item.stockRecordId)?.requestedQty || 0} 
// // // //                   onAddToCart={addToCart} 
// // // //               />
// // // //             ))}
// // // //           </div>
// // // //         ) : (
// // // //           <div className="py-20 text-center">
// // // //             <p className="text-gray-400 font-black uppercase text-xs">No items found</p>
// // // //           </div>
// // // //         )}
// // // //       </main>

// // // //       {/* --- REQUESTS DRAWER --- */}
// // // //       {isRequestsOpen && (
// // // //         <div className="fixed inset-0 z-[110] flex justify-end">
// // // //           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsRequestsOpen(false)} />
// // // //           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
// // // //             <div className="p-6 border-b flex justify-between items-center bg-blue-600 text-white">
// // // //               <h2 className="text-lg font-black uppercase italic">Inventory Requests</h2>
// // // //               <button onClick={() => setIsRequestsOpen(false)} className="text-2xl font-light">✕</button>
// // // //             </div>
// // // //             <div className="p-4 border-b bg-blue-50">
// // // //                 <button onClick={startNewRequest} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-all">+ Add New Request</button>
// // // //             </div>
// // // //             <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
// // // //               {requests.length === 0 ? (
// // // //                 <div className="h-full flex flex-col items-center justify-center text-gray-400 uppercase text-[10px] font-black">No requests found</div>
// // // //               ) : requests.map((r) => (
// // // //                 <div key={r._id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
// // // //                   <div className="flex justify-between items-start mb-3">
// // // //                     <div>
// // // //                       <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
// // // //                         r.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 
// // // //                         r.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
// // // //                       }`}>{r.status}</span>
// // // //                       <p className="text-[10px] font-bold text-gray-900 mt-1">For: {new Date(r.targetDate).toLocaleDateString()}</p>
// // // //                     </div>
// // // //                   </div>
// // // //                   <div className="space-y-1.5">
// // // //                     {r.items.map((it, idx) => {
// // // //                       const details = getItemDetails(it.stockItemId?._id || it.stockRecordId, it);
// // // //                       return (
// // // //                         <div key={idx} className={`flex justify-between text-[10px] font-bold uppercase p-2 rounded-lg ${it.qtyBaseUnit < 0 ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-500'}`}>
// // // //                           <span>{details.name} {it.qtyBaseUnit < 0 && "[RETURN]"}</span>
// // // //                           <span className={it.qtyBaseUnit < 0 ? "text-orange-700" : "text-blue-600"}>{it.qtyBaseUnit || it.quantity} {details.unit}</span>
// // // //                         </div>
// // // //                       );
// // // //                     })}
// // // //                   </div>
// // // //                 </div>
// // // //               ))}
// // // //             </div>
// // // //           </div>
// // // //         </div>
// // // //       )}

// // // //       {/* --- HISTORY DRAWER --- */}
// // // //       {isOrdersOpen && (
// // // //         <div className="fixed inset-0 z-[110] flex justify-end">
// // // //           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsOrdersOpen(false)} />
// // // //           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
// // // //             <div className="p-6 border-b flex justify-between items-center text-gray-800">
// // // //               <h2 className="text-lg font-black uppercase italic">Order History</h2>
// // // //               <button onClick={() => setIsOrdersOpen(false)} className="text-2xl font-light">✕</button>
// // // //             </div>
// // // //             <div className="px-6 py-4 bg-gray-50 flex items-center gap-2 border-b">
// // // //               <DatePicker 
// // // //                 selected={selectedHistoryDate ? new Date(selectedHistoryDate) : null} 
// // // //                 onChange={(date) => setSelectedHistoryDate(date ? date.toISOString().split('T')[0] : "")} 
// // // //                 customInput={<CustomDateInput placeholder="Filter by Date" />} 
// // // //                 dateFormat="yyyy-MM-dd" 
// // // //               />
// // // //               {selectedHistoryDate && <button onClick={() => setSelectedHistoryDate("")} className="text-[9px] font-black text-red-500 uppercase px-2">Clear</button>}
// // // //             </div>
// // // //             <div className="flex-1 overflow-y-auto p-4 space-y-4">
// // // //               {filteredOrders.map((order) => (
// // // //                 <details key={order._id} className="group bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
// // // //                   <summary className="list-none cursor-pointer p-4 flex justify-between items-center">
// // // //                     <div className="space-y-1">
// // // //                         <span className="text-[8px] font-black bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase">Completed</span>
// // // //                         <p className="text-[10px] font-bold text-gray-400">{new Date(order.createdAt).toLocaleString()}</p>
// // // //                         <h3 className="text-xs font-black uppercase text-gray-800">{order.items.length} Items</h3>
// // // //                     </div>
// // // //                     <div className="text-gray-300 group-open:rotate-180 transition-transform">▼</div>
// // // //                   </summary>
// // // //                   <div className="px-4 pb-4 bg-gray-50/50 border-t pt-3 space-y-2">
// // // //                     {order.items.map((it, idx) => {
// // // //                       const details = getItemDetails(it.stockRecordId || it.stockItemId?._id, it);
// // // //                       return (
// // // //                         <div key={idx} className="flex justify-between text-[10px] font-black uppercase text-gray-600 bg-white p-2 rounded-lg border border-gray-100">
// // // //                           <span>{details.name}</span>
// // // //                           <span className="text-green-600">{it.qtyBaseUnit || it.quantity} {details.unit}</span>
// // // //                         </div>
// // // //                       );
// // // //                     })}
// // // //                   </div>
// // // //                 </details>
// // // //               ))}
// // // //             </div>
// // // //           </div>
// // // //         </div>
// // // //       )}

// // // //       {/* --- CART DRAWER --- */}
// // // //       {isCartOpen && (
// // // //         <div className="fixed inset-0 z-[110] flex justify-end">
// // // //           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCartOpen(false)} />
// // // //           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
// // // //             <div className="p-6 border-b flex justify-between items-center">
// // // //               <h2 className="text-lg font-black uppercase italic">
// // // //                 {mode === "indent" ? "Review Indent" : (isRequestMode ? "Review Request" : "Checkout Cart")}
// // // //               </h2>
// // // //               <button onClick={() => setIsCartOpen(false)} className="text-2xl font-light">✕</button>
// // // //             </div>
// // // //             <div className="flex-1 overflow-y-auto p-4 space-y-4">
// // // //               {(isRequestMode || mode === "indent") && (
// // // //                 <div className={`p-4 rounded-2xl border space-y-4 mb-2 ${mode === "indent" ? "bg-orange-50 border-orange-100" : "bg-blue-50 border-blue-100"}`}>
// // // //                   <div>
// // // //                     <label className={`text-[9px] font-black uppercase ml-1 ${mode === "indent" ? "text-orange-600" : "text-blue-600"}`}>Needed By Date</label>
// // // //                     <DatePicker selected={requestDate} onChange={(date) => setRequestDate(date)} customInput={<CustomDateInput />} />
// // // //                   </div>
// // // //                   <div>
// // // //                     <label className={`text-[9px] font-black uppercase ml-1 ${mode === "indent" ? "text-orange-600" : "text-blue-600"}`}>Reason / Note</label>
// // // //                     <textarea rows="2" placeholder="Note for the storekeeper..." className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 ring-blue-500" value={requestReason} onChange={(e) => setRequestReason(e.target.value)} />
// // // //                   </div>
// // // //                 </div>
// // // //               )}
// // // //               {cart.length === 0 ? (
// // // //                 <div className="text-center py-20 text-gray-400 uppercase text-[10px] font-black">No items selected</div>
// // // //               ) : cart.map(item => (
// // // //                 <div key={item.stockRecordId || item._id} className={`flex gap-4 items-center p-3 rounded-2xl border ${item.requestedQty < 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
// // // //                     <div className="w-10 h-10 bg-white rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center p-1">
// // // //                       <img src={item.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=f8f9fa&color=10b981&bold=true`} alt="" className="w-full h-full object-contain" />
// // // //                     </div>
// // // //                     <div className="flex-1">
// // // //                       <p className="text-[10px] font-black uppercase text-gray-800 line-clamp-1">
// // // //                         {item.name} {item.requestedQty < 0 && <span className="text-orange-600 ml-1">[RETURN]</span>}
// // // //                       </p>
// // // //                       <p className="text-[8px] text-gray-400 font-bold uppercase">{item.unit}</p>
// // // //                     </div>
// // // //                     <div className="flex items-center gap-2">
// // // //                       <button onClick={() => addToCart(item, (parseFloat(item.requestedQty) || 0) - 0.1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-black">-</button>
                      
// // // //                       <input 
// // // //                         type="text" 
// // // //                         inputMode="decimal" 
// // // //                         className="text-[11px] font-black w-12 text-center bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none"
// // // //                         value={item.requestedQty}
// // // //                         onChange={(e) => addToCart(item, e.target.value)}
// // // //                         onBlur={(e) => {
// // // //                           const val = parseFloat(e.target.value);
// // // //                           if(e.target.value === "" || isNaN(val) || (val === 0 && !isRequestMode && mode !== "indent")) {
// // // //                               removeFromCart(item);
// // // //                           } else {
// // // //                               updateCartState(item, val);
// // // //                           }
// // // //                         }}
// // // //                       />

// // // //                       <button onClick={() => addToCart(item, (parseFloat(item.requestedQty) || 0) + 0.1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-black">+</button>
// // // //                     </div>
// // // //                 </div>
// // // //               ))}
// // // //             </div>
// // // //             {cart.length > 0 && (
// // // //               <div className="p-6 border-t bg-white">
// // // //                 <button onClick={handleSubmitOrder} className={`w-full py-4 rounded-2xl font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all ${mode === "indent" ? "bg-orange-600 text-white" : (isRequestMode ? "bg-blue-600 text-white" : "bg-black text-white")}`}>
// // // //                   {mode === "indent" ? "Send Indent" : (isRequestMode ? "Submit to Admin" : "Place Order")}
// // // //                 </button>
// // // //               </div>
// // // //             )}
// // // //           </div>
// // // //         </div>
// // // //       )}
// // // //     </div>
// // // //   );
// // // // };


















// // // // 18


















// // // import React, { useState, useEffect, useMemo, forwardRef } from 'react';
// // // import { useNavigate } from 'react-router-dom';
// // // import { api } from "../api";
// // // import { toast } from 'react-hot-toast';
// // // import { socket } from "../socket"; 
// // // import InventoryCard from './InventoryCard';
// // // import DatePicker from "react-datepicker";
// // // import "react-datepicker/dist/react-datepicker.css";

// // // // --- Sub-Components ---
// // // const CustomDateInput = forwardRef(({ value, onClick, placeholder }, ref) => (
// // //   <button
// // //     className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-xs font-bold text-gray-800 flex items-center justify-between hover:border-blue-500 transition-all active:scale-[0.98] shadow-sm"
// // //     onClick={onClick}
// // //     ref={ref}
// // //   >
// // //     <span>{value || placeholder || "Select Date"}</span>
// // //     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
// // //     </svg>
// // //   </button>
// // // ));

// // // export const ClientStore = () => {
// // //   // --- State: User Info ---
// // //   const [userInfo, setUserInfo] = useState(null); // ✅ Added

// // //   // --- State: Data ---
// // //   const [items, setItems] = useState([]);
// // //   const [cart, setCart] = useState([]);
// // //   const [orders, setOrders] = useState([]); 
// // //   const [requests, setRequests] = useState([]); 
// // //   const [indents, setIndents] = useState([]);
// // //   const [loading, setLoading] = useState(true);

// // //   // --- State: UI & Filters ---
// // //   const [searchQuery, setSearchQuery] = useState("");
// // //   const [selectedHistoryDate, setSelectedHistoryDate] = useState(""); 
// // //   const [isCartOpen, setIsCartOpen] = useState(false);
// // //   const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
// // //   const [logTab, setLogTab] = useState("usage"); 

// // //   // --- State: Transaction Modes ---
// // //   const [activeTransactionType, setActiveTransactionType] = useState("usage"); 
// // //   const [requestReason, setRequestReason] = useState(""); 
// // //   const [requestDate, setRequestDate] = useState(new Date());

// // //   const navigate = useNavigate();

// // //   // --- Fetch Logic ---
// // //   const fetchUserInfo = async () => {
// // //     try {
// // //       const res = await api.get("/auth/me");
// // //       setUserInfo(res.data);
// // //     } catch (err) {
// // //       console.error("Failed to fetch user info");
// // //     }
// // //   };

// // //   const handleLogout = () => {
// // //     localStorage.removeItem("token"); 
// // //     socket.disconnect();
// // //     toast.success("Logged out successfully");
// // //     navigate("/login");
// // //   };

// // //   const fetchIndents = async () => {
// // //     try {
// // //       const res = await api.get("/indent-requests/me");
// // //       setIndents(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
// // //     } catch (err) { setIndents([]); }
// // //   };

// // //   const fetchItems = async (isForIndent = false) => {
// // //     try {
// // //       let res;
// // //       if (isForIndent) {
// // //         res = await api.get("/inventory/stock-items");
// // //         const formatted = res.data.map(item => ({
// // //           stockRecordId: item._id,
// // //           _id: item._id,
// // //           name: item.name,
// // //           unit: item.unitId?.symbol || "Units", 
// // //           currentQty: 0, 
// // //           image: item.imageUrl || ""
// // //         })).sort((a, b) => a.name.localeCompare(b.name));
// // //         setItems(formatted);
// // //       } else {
// // //         res = await api.get('/my-kitchen-stock'); 
// // //         const formattedItems = res.data.map(item => ({
// // //           stockRecordId: item.stockRecordId, 
// // //           _id: item.stockItemId?._id || item.stockItemId,
// // //           name: item.name || item.stockItemId?.name || "Unknown Item",
// // //           currentQty: Number(item.currentQty) || 0, 
// // //           unit: item.unitId?.symbol || item.unit || item.stockItemId?.unitId?.symbol || "Units", 
// // //           image: item.image || item.stockItemId?.imageUrl || ""
// // //         })).sort((a, b) => a.name.localeCompare(b.name));
// // //         setItems(formattedItems);
// // //       }
// // //     } catch (err) { toast.error("Failed to sync inventory"); }
// // //   };

// // //   const fetchMyOrders = async () => {
// // //     try {
// // //       const res = await api.get('/consumptions/me');
// // //       setOrders(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
// // //     } catch (err) { console.error("Failed to fetch orders"); }
// // //   };

// // //   const fetchMyRequests = async () => {
// // //     try {
// // //       const res = await api.get('/requests');
// // //       setRequests(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
// // //     } catch (err) { setRequests([]); }
// // //   };

// // //   // --- Initial Mount ---
// // //   useEffect(() => {
// // //     const init = async () => {
// // //       setLoading(true);
// // //       await Promise.all([
// // //         fetchUserInfo(),   // ✅ Integrated
// // //         fetchItems(false), 
// // //         fetchMyOrders(), 
// // //         fetchMyRequests(), 
// // //         fetchIndents()
// // //       ]);
// // //       setLoading(false);
// // //     };
// // //     init();
// // //   }, []);

// // //   useEffect(() => {
// // //     socket.on("low_stock_alert", (data) => {
// // //       toast.error(`⚠️ ${data.payload.message}`, {
// // //         duration: 6000,
// // //         position: "top-right",
// // //         style: { border: '2px solid #ef4444', padding: '16px', fontWeight: '900' }
// // //       });
// // //     });
// // //     return () => socket.off("low_stock_alert");
// // //   }, []);

// // //   const filteredItems = useMemo(() => {
// // //     return items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
// // //   }, [items, searchQuery]);

// // //   // --- Cart Actions ---
// // //   const addToCart = (product, newQty) => {
// // //     if (newQty === "-" || newQty === "") {
// // //         updateCartState(product, newQty);
// // //         return;
// // //     }
// // //     const parsedQty = Math.round(parseFloat(newQty) * 10) / 10;
// // //     if (isNaN(parsedQty)) return;

// // //     const existingInCart = cart.find(i => i.stockRecordId === product.stockRecordId);
// // //     const oldQty = existingInCart ? parseFloat(existingInCart.requestedQty) || 0 : 0;
// // //     const diff = parsedQty - oldQty;

// // //     if (activeTransactionType === "usage") {
// // //       if (parsedQty < 0) return toast.error("Negative amounts not allowed");
// // //       const targetItem = items.find(i => i.stockRecordId === product.stockRecordId);
// // //       if (diff > 0 && (!targetItem || targetItem.currentQty < diff)) {
// // //         return toast.error("Insufficient Local Stock");
// // //       }
// // //       setItems(prev => prev.map(item =>
// // //         item.stockRecordId === product.stockRecordId 
// // //         ? { ...item, currentQty: Math.round((item.currentQty - diff) * 10) / 10 } : item
// // //       ));
// // //     }
// // //     updateCartState(product, parsedQty);
// // //   };

// // //   const updateCartState = (product, qty) => {
// // //     setCart(prev => {
// // //       const exists = prev.find(i => i.stockRecordId === product.stockRecordId);
// // //       if (qty === 0 && activeTransactionType === "usage") {
// // //           return prev.filter(i => i.stockRecordId !== product.stockRecordId);
// // //       }
// // //       if (exists) return prev.map(i => i.stockRecordId === product.stockRecordId ? { ...i, requestedQty: qty } : i);
// // //       return [...prev, { ...product, requestedQty: qty }];
// // //     });
// // //   };

// // //   const handleSubmit = async () => {
// // //     const validItems = cart.map(item => ({
// // //       stockItemId: item._id,
// // //       qtyBaseUnit: Number(item.requestedQty),
// // //       stockRecordId: item.stockRecordId 
// // //     })).filter(it => it.qtyBaseUnit > 0);

// // //     if (validItems.length === 0) return toast.error("Add valid quantities");
// // //     if (activeTransactionType !== "usage" && !requestReason.trim()) return toast.error("Reason required");

// // //     const loadingToast = toast.loading("Processing...");
// // //     try {
// // //       if (activeTransactionType === "indent") {
// // //         await api.post("/indent-requests", { items: validItems, note: requestReason, targetDate: requestDate.toISOString() });
// // //         toast.success("Indent Sent!");
// // //       } else if (activeTransactionType === "request") {
// // //         await api.post("/requests", { items: validItems, reason: requestReason, targetDate: requestDate.toISOString() });
// // //         toast.success("Request Sent!");
// // //       } else {
// // //         await api.post("/orders", { items: validItems, date: new Date().toISOString() });
// // //         toast.success("Usage Logged!");
// // //       }

// // //       setCart([]);
// // //       setRequestReason("");
// // //       setIsCartOpen(false);
// // //       setActiveTransactionType("usage");
// // //       await Promise.all([fetchItems(false), fetchIndents(), fetchMyRequests(), fetchMyOrders()]);
// // //     } catch (err) {
// // //       toast.error(err.response?.data?.error || "Failed");
// // //     } finally {
// // //       toast.dismiss(loadingToast);
// // //     }
// // //   };

// // //   return (
// // //     <div className="min-h-screen bg-[#F8F9FA] pb-24 font-sans text-slate-900">
// // //       {/* --- REFINED HEADER --- */}
// // //       <header className="bg-white sticky top-0 z-40 shadow-sm border-b border-gray-100">
// // //         <div className="max-w-7xl mx-auto px-4 py-3">
// // //           <div className="flex justify-between items-center mb-3">
// // //             <div className="flex flex-col">
// // //               {/* ✅ DYNAMIC GODOWN NAME */}
// // //               <h1 className="text-xl font-black italic uppercase leading-none">
// // //                 <span className="text-green-600">
// // //                   {userInfo?.godown?.name || "Inventory"}
// // //                 </span> Store
// // //               </h1>
// // //               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
// // //                   {activeTransactionType === 'indent' ? 'Warehouse Mode' : 'Kitchen Mode'}
// // //               </span>
// // //             </div>

// // //             <button onClick={handleLogout} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase active:scale-95 transition-all">
// // //               <span>Logout</span>
// // //               <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // //                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
// // //               </svg>
// // //             </button>
// // //           </div>

// // //           <div className="flex gap-2">
// // //             <button 
// // //               onClick={() => setIsActivityLogOpen(true)} 
// // //               className="flex-1 bg-gray-100 text-gray-800 py-2.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 active:scale-95"
// // //             >
// // //               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // //                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
// // //               </svg>
// // //               History {indents.some(i => i.status === 'pending') && <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />}
// // //             </button>

// // //             <button 
// // //               onClick={() => setIsCartOpen(true)} 
// // //               className={`flex-1 ${activeTransactionType === 'indent' ? 'bg-orange-600' : (activeTransactionType === 'request' ? 'bg-blue-600' : 'bg-black')} text-white py-2.5 rounded-xl font-black text-[10px] flex items-center justify-center gap-2 shadow-lg uppercase active:scale-95 transition-all`}
// // //             >
// // //               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // //                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
// // //               </svg>
// // //               {activeTransactionType === 'usage' ? 'Cart' : 'Review List'} 
// // //               <span className="bg-white/20 px-2 py-0.5 rounded text-[9px]">{cart.length}</span>
// // //             </button>
// // //           </div>
// // //         </div>
// // //       </header>

// // //       {/* --- SEARCH & MODE BANNER --- */}
// // //       <div className="bg-white border-b border-gray-100 p-3 sticky top-[125px] z-30 shadow-sm">
// // //         <div className="max-w-7xl mx-auto">
// // //           {activeTransactionType !== 'usage' && (
// // //               <div className={`mb-3 p-3 rounded-xl flex justify-between items-center ${activeTransactionType === 'indent' ? 'bg-orange-50 border border-orange-100' : 'bg-blue-50 border border-blue-100'}`}>
// // //                 <p className={`text-[10px] font-black uppercase ${activeTransactionType === 'indent' ? 'text-orange-700' : 'text-blue-700'}`}>
// // //                   🚀 Mode: {activeTransactionType === 'indent' ? 'Warehouse Indent' : 'Local Request'}
// // //                 </p>
// // //                 <button onClick={() => { setActiveTransactionType('usage'); setCart([]); fetchItems(false); }} className="text-[10px] font-bold text-red-500 underline uppercase">Exit Mode</button>
// // //               </div>
// // //           )}
// // //           <div className="relative">
// // //             <input 
// // //               type="text" 
// // //               placeholder={`Search ${activeTransactionType === 'indent' ? 'all' : 'local'} items...`}
// // //               value={searchQuery}
// // //               onChange={(e) => setSearchQuery(e.target.value)}
// // //               className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-11 text-xs font-bold outline-none focus:ring-2 ring-green-500/20 transition-all"
// // //             />
// // //             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// // //               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
// // //             </svg>
// // //           </div>
// // //         </div>
// // //       </div>

// // //       <main className="max-w-7xl mx-auto p-4 md:p-8">
// // //         {loading ? (
// // //             <div className="py-20 text-center uppercase font-black text-xs text-gray-400 animate-pulse">Syncing...</div>
// // //         ) : filteredItems.length > 0 ? (
// // //           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-8">
// // //             {filteredItems.map((item) => (
// // //               <InventoryCard 
// // //                   key={item.stockRecordId} 
// // //                   item={item} 
// // //                   isRequestMode={activeTransactionType !== 'usage'} 
// // //                   cartQty={cart.find(c => c.stockRecordId === item.stockRecordId)?.requestedQty || 0} 
// // //                   onAddToCart={addToCart} 
// // //               />
// // //             ))}
// // //           </div>
// // //         ) : (
// // //           <div className="py-20 text-center text-gray-400 font-black uppercase text-xs">No items found</div>
// // //         )}
// // //       </main>

// // //       {/* --- ACTIVITY LOG DRAWER --- */}
// // //       {isActivityLogOpen && (
// // //         <div className="fixed inset-0 z-[110] flex justify-end">
// // //           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsActivityLogOpen(false)} />
// // //           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
// // //             <div className="p-6 border-b flex justify-between items-center">
// // //               <h2 className="text-lg font-black uppercase italic">Activity & History</h2>
// // //               <button onClick={() => setIsActivityLogOpen(false)} className="text-2xl font-light">✕</button>
// // //             </div>
            
// // //             <div className="px-4 py-2 border-b bg-gray-50 flex gap-1 overflow-x-auto">
// // //                 {[
// // //                     { id: 'usage', label: 'Local Usage' }, 
// // //                     { id: 'requests', label: 'Local Requests' },
// // //                     { id: 'indents', label: 'Warehouse Indents' }
// // //                 ].map((tab) => (
// // //                   <button 
// // //                     key={tab.id} 
// // //                     onClick={() => setLogTab(tab.id)}
// // //                     className={`flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${logTab === tab.id ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-400 border-gray-200'}`}
// // //                   >{tab.label}</button>
// // //                 ))}
// // //             </div>

// // //             <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
// // //                 {logTab === 'usage' && (
// // //                   <>
// // //                     <DatePicker selected={selectedHistoryDate ? new Date(selectedHistoryDate) : null} onChange={(date) => setSelectedHistoryDate(date ? date.toISOString().split('T')[0] : "")} customInput={<CustomDateInput placeholder="Filter by Date" />} />
// // //                     {orders.filter(o => !selectedHistoryDate || new Date(o.createdAt).toISOString().split('T')[0] === selectedHistoryDate).map((order) => (
// // //                         <details key={order._id} className="group bg-white border border-gray-100 rounded-2xl shadow-sm mb-3">
// // //                           <summary className="list-none cursor-pointer p-4 flex justify-between items-center">
// // //                             <div>
// // //                                 <p className="text-[10px] font-bold text-gray-400">{new Date(order.createdAt).toLocaleString()}</p>
// // //                                 <h3 className="text-xs font-black uppercase text-gray-800">{order.items.length} Items Used</h3>
// // //                             </div>
// // //                             <div className="text-gray-300 group-open:rotate-180 transition-transform">▼</div>
// // //                           </summary>
// // //                           <div className="px-4 pb-4 bg-gray-50/50 border-t pt-3 space-y-1">
// // //                             {order.items.map((it, idx) => (
// // //                                 <div key={idx} className="flex justify-between text-[10px] font-black uppercase text-gray-600">
// // //                                   <span>{it.stockItemId?.name || it.name}</span>
// // //                                   <span className="text-green-600">{it.qtyBaseUnit || it.quantity} {it.stockItemId?.unitId?.symbol || it.unitId?.symbol || it.unit || 'Units'}</span>
// // //                                 </div>
// // //                             ))}
// // //                           </div>
// // //                         </details>
// // //                     ))}
// // //                   </>
// // //                 )}

// // //                 {logTab === 'requests' && (
// // //                   <>
// // //                     <button onClick={() => { setActiveTransactionType('request'); setIsActivityLogOpen(false); fetchItems(false); }} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[11px] uppercase shadow-md mb-4">+ New Local Request</button>
// // //                     {requests.map((r) => (
// // //                         <details key={r._id} className="group bg-white border border-gray-100 rounded-2xl mb-3 shadow-sm">
// // //                            <summary className="list-none cursor-pointer p-4 flex justify-between items-center">
// // //                              <div>
// // //                                <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${r.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
// // //                                  {r.status}
// // //                                </span>
// // //                                <p className="text-[10px] font-bold text-gray-900 mt-1">Due: {new Date(r.targetDate).toLocaleDateString()}</p>
// // //                              </div>
// // //                              <div className="text-gray-300 group-open:rotate-180 transition-transform">▼</div>
// // //                            </summary>
// // //                            <div className="px-4 pb-4 space-y-1 border-t pt-3">
// // //                              {r.items.map((it, idx) => (
// // //                                  <div key={idx} className="flex justify-between text-[10px] font-bold uppercase p-2 bg-gray-50 rounded-lg">
// // //                                    <span>{it.stockItemId?.name}</span>
// // //                                    <span className="text-blue-600">{it.qtyBaseUnit} {it.stockItemId?.unitId?.symbol || it.unit || 'Units'}</span>
// // //                                  </div>
// // //                              ))}
// // //                            </div>
// // //                         </details>
// // //                     ))}
// // //                   </>
// // //                 )}

// // //                 {logTab === 'indents' && (
// // //                    <>
// // //                      <button onClick={() => { setActiveTransactionType('indent'); setIsActivityLogOpen(false); fetchItems(true); }} className="w-full bg-orange-600 text-white py-3 rounded-xl font-black text-[11px] uppercase shadow-md mb-4">+ Create Warehouse Indent</button>
// // //                      {indents.map((indent) => (
// // //                         <details key={indent._id} className="group bg-white border border-orange-100 rounded-2xl mb-3 shadow-sm">
// // //                           <summary className="list-none cursor-pointer p-4 flex justify-between items-center">
// // //                             <div>
// // //                                 <span className={`text-[8px] font-black px-2 py-1 rounded uppercase ${indent.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
// // //                                     {indent.status}
// // //                                 </span>
// // //                                 <p className="text-[10px] font-bold text-gray-900 mt-1">Ref: {new Date(indent.createdAt).toLocaleDateString()}</p>
// // //                             </div>
// // //                             <div className="text-gray-300 group-open:rotate-180 transition-transform">▼</div>
// // //                           </summary>
// // //                           <div className="px-4 pb-4 space-y-1 border-t pt-3">
// // //                             {indent.items.map((it, idx) => (
// // //                               <div key={idx} className="flex justify-between text-[10px] font-bold bg-gray-50 p-2 rounded-lg">
// // //                                 <span className="uppercase text-gray-700">{it.stockItemId?.name || "Unknown Item"}</span>
// // //                                 <span className="text-orange-600 font-black">
// // //                                     {it.qtyBaseUnit} {it.stockItemId?.unitId?.symbol || it.unit || 'Units'}
// // //                                 </span>
// // //                               </div>
// // //                             ))}
// // //                           </div>
// // //                         </details>
// // //                      ))}
// // //                    </>
// // //                 )}
// // //             </div>
// // //           </div>
// // //         </div>
// // //       )}

// // //       {/* --- CART/LIST DRAWER --- */}
// // //       {isCartOpen && (
// // //         <div className="fixed inset-0 z-[110] flex justify-end">
// // //           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCartOpen(false)} />
// // //           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
// // //             <div className="p-6 border-b flex justify-between items-center">
// // //               <h2 className="text-lg font-black uppercase italic">
// // //                 {activeTransactionType === "indent" ? "Review Indent" : (activeTransactionType === "request" ? "Review Request" : "Confirm Usage")}
// // //               </h2>
// // //               <button onClick={() => setIsCartOpen(false)} className="text-2xl font-light">✕</button>
// // //             </div>
            
// // //             <div className="flex-1 overflow-y-auto p-4 space-y-4">
// // //               {activeTransactionType !== "usage" && (
// // //                 <div className={`p-4 rounded-2xl border space-y-4 ${activeTransactionType === "indent" ? "bg-orange-50 border-orange-100" : "bg-blue-50 border-blue-100"}`}>
// // //                   <div>
// // //                     <label className="text-[9px] font-black uppercase opacity-60">Target Delivery Date</label>
// // //                     <DatePicker selected={requestDate} onChange={(date) => setRequestDate(date)} customInput={<CustomDateInput />} />
// // //                   </div>
// // //                   <div>
// // //                     <label className="text-[9px] font-black uppercase opacity-60">Note / Reason</label>
// // //                     <textarea rows="2" placeholder="Explain why this is needed..." className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none" value={requestReason} onChange={(e) => setRequestReason(e.target.value)} />
// // //                   </div>
// // //                 </div>
// // //               )}
              
// // //               {cart.length === 0 ? (
// // //                 <div className="text-center py-20 text-gray-400 uppercase text-[10px] font-black">List is empty</div>
// // //               ) : cart.map(item => (
// // //                     <div key={item.stockRecordId} className="flex gap-4 items-center p-3 rounded-2xl border bg-gray-50 border-gray-100">
// // //                         <div className="w-10 h-10 bg-white rounded-xl overflow-hidden flex items-center justify-center border border-gray-200">
// // //                           <img src={item.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=f8f9fa&color=10b981&bold=true`} alt="" className="w-full h-full object-contain" />
// // //                         </div>
// // //                         <div className="flex-1">
// // //                           <p className="text-[10px] font-black uppercase text-gray-800 line-clamp-1">{item.name}</p>
// // //                           <p className="text-[8px] text-gray-400 font-bold uppercase">{item.unit}</p>
// // //                         </div>
// // //                         <div className="flex items-center gap-2">
// // //                           <button onClick={() => addToCart(item, (parseFloat(item.requestedQty) || 0) - 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-black">-</button>
// // //                           <input type="text" className="text-[11px] font-black w-10 text-center bg-transparent outline-none" value={item.requestedQty} onChange={(e) => addToCart(item, e.target.value)} />
// // //                           <button onClick={() => addToCart(item, (parseFloat(item.requestedQty) || 0) + 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-black">+</button>
// // //                         </div>
// // //                     </div>
// // //                 ))
// // //               }
// // //             </div>

// // //             {cart.length > 0 && (
// // //               <div className="p-6 border-t bg-white">
// // //                 <button onClick={handleSubmit} className={`w-full py-4 rounded-2xl font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all ${activeTransactionType === "indent" ? "bg-orange-600" : (activeTransactionType === "request" ? "bg-blue-600" : "bg-black")} text-white`}>
// // //                   Submit {activeTransactionType}
// // //                 </button>
// // //               </div>
// // //             )}
// // //           </div>
// // //         </div>
// // //       )}
// // //     </div>
// // //   );
// // // };





// // // 20






// // import React, { useState, useEffect, useMemo, forwardRef } from 'react';
// // import { useNavigate } from 'react-router-dom';
// // import { api } from "../api";
// // import { toast } from 'react-hot-toast';
// // import { socket } from "../socket"; 
// // import InventoryCard from './InventoryCard';
// // import DatePicker from "react-datepicker";
// // import "react-datepicker/dist/react-datepicker.css";

// // // --- Sub-Components ---
// // const CustomDateInput = forwardRef(({ value, onClick, placeholder }, ref) => (
// //   <button
// //     className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-xs font-bold text-gray-800 flex items-center justify-center gap-3 hover:border-blue-500 transition-all active:scale-[0.98] shadow-sm"
// //     onClick={onClick}
// //     ref={ref}
// //   >
// //     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
// //     </svg>
// //     <span className="text-center">{value || placeholder || "Select Date"}</span>
// //   </button>
// // ));

// // export const ClientStore = () => {
// //   // --- State: User Info ---
// //   const [userInfo, setUserInfo] = useState(null);

// //   // --- State: Data ---
// //   const [items, setItems] = useState([]);
// //   const [cart, setCart] = useState([]);
// //   const [orders, setOrders] = useState([]); 
// //   const [requests, setRequests] = useState([]); 
// //   const [indents, setIndents] = useState([]);
// //   const [loading, setLoading] = useState(true);

// //   // --- State: UI & Filters ---
// //   const [searchQuery, setSearchQuery] = useState("");
// //   const [selectedHistoryDate, setSelectedHistoryDate] = useState(""); 
// //   const [isCartOpen, setIsCartOpen] = useState(false);
// //   const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
// //   const [logTab, setLogTab] = useState("usage"); 

// //   // --- State: Transaction Modes ---
// //   const [activeTransactionType, setActiveTransactionType] = useState("usage"); 
// //   const [editingIndentId, setEditingIndentId] = useState(null);
// //   const [requestReason, setRequestReason] = useState(""); 
// //   const [requestDate, setRequestDate] = useState(new Date());

// //   const navigate = useNavigate();

// //   // --- Helper: Date Comparison ---
// //   const isSameDay = (dateString, filterDate) => {
// //     if (!filterDate) return true;
// //     return new Date(dateString).toISOString().split('T')[0] === filterDate;
// //   };

// //   // --- Fetch Logic ---
// //   const fetchUserInfo = async () => {
// //     try {
// //       const res = await api.get("/auth/me");
// //       setUserInfo(res.data);
// //     } catch (err) {
// //       console.error("Failed to fetch user info");
// //     }
// //   };

// //   const handleLogout = () => {
// //     localStorage.removeItem("token"); 
// //     socket.disconnect();
// //     toast.success("Logged out successfully");
// //     navigate("/login");
// //   };

// //   const fetchIndents = async () => {
// //     try {
// //       const res = await api.get("/indent-requests/me");
// //       setIndents(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
// //     } catch (err) { setIndents([]); }
// //   };

// //   const fetchItems = async (isForIndent = false) => {
// //     try {
// //       let res;
// //       if (isForIndent) {
// //         res = await api.get("/inventory/stock-items");
// //         const formatted = res.data.map(item => ({
// //           stockRecordId: item._id,
// //           _id: item._id,
// //           name: item.name,
// //           unit: item.unitId?.symbol || "Units", 
// //           currentQty: 0, 
// //           image: item.imageUrl || ""
// //         })).sort((a, b) => a.name.localeCompare(b.name));
// //         setItems(formatted);
// //       } else {
// //         res = await api.get('/my-kitchen-stock'); 
// //         const formattedItems = res.data.map(item => ({
// //           stockRecordId: item.stockRecordId, 
// //           _id: item.stockItemId?._id || item.stockItemId,
// //           name: item.name || item.stockItemId?.name || "Unknown Item",
// //           currentQty: Number(item.currentQty) || 0, 
// //           unit: item.unitId?.symbol || item.unit || item.stockItemId?.unitId?.symbol || "Units", 
// //           image: item.image || item.stockItemId?.imageUrl || ""
// //         })).sort((a, b) => a.name.localeCompare(b.name));
// //         setItems(formattedItems);
// //       }
// //     } catch (err) { toast.error("Failed to sync inventory"); }
// //   };

// //   const fetchMyOrders = async () => {
// //     try {
// //       const res = await api.get('/consumptions/me');
// //       setOrders(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
// //     } catch (err) { console.error("Failed to fetch orders"); }
// //   };

// //   const fetchMyRequests = async () => {
// //     try {
// //       const res = await api.get('/requests');
// //       setRequests(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
// //     } catch (err) { setRequests([]); }
// //   };

// //   useEffect(() => {
// //     const init = async () => {
// //       setLoading(true);
// //       await Promise.all([
// //         fetchUserInfo(),
// //         fetchItems(false), 
// //         fetchMyOrders(), 
// //         fetchMyRequests(), 
// //         fetchIndents()
// //       ]);
// //       setLoading(false);
// //     };
// //     init();
// //   }, []);

// //   useEffect(() => {
// //     socket.on("low_stock_alert", (data) => {
// //       toast.error(`⚠️ ${data.payload.message}`, {
// //         duration: 6000,
// //         position: "top-right",
// //         style: { border: '2px solid #ef4444', padding: '16px', fontWeight: '900' }
// //       });
// //     });
// //     return () => socket.off("low_stock_alert");
// //   }, []);

// //   const filteredItems = useMemo(() => {
// //     return items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
// //   }, [items, searchQuery]);

// //   const addToCart = (product, newQty) => {
// //     if (newQty === "-" || newQty === "") {
// //         updateCartState(product, newQty);
// //         return;
// //     }
// //     const parsedQty = Math.round(parseFloat(newQty) * 10) / 10;
// //     if (isNaN(parsedQty)) return;

// //     const existingInCart = cart.find(i => i.stockRecordId === product.stockRecordId);
// //     const oldQty = existingInCart ? parseFloat(existingInCart.requestedQty) || 0 : 0;
// //     const diff = parsedQty - oldQty;

// //     if (activeTransactionType === "usage") {
// //       if (parsedQty < 0) return toast.error("Negative amounts not allowed");
// //       const targetItem = items.find(i => i.stockRecordId === product.stockRecordId);
// //       if (diff > 0 && (!targetItem || targetItem.currentQty < diff)) {
// //         return toast.error("Insufficient Local Stock");
// //       }
// //       setItems(prev => prev.map(item =>
// //         item.stockRecordId === product.stockRecordId 
// //         ? { ...item, currentQty: Math.round((item.currentQty - diff) * 10) / 10 } : item
// //       ));
// //     }
// //     updateCartState(product, parsedQty);
// //   };

// //   const updateCartState = (product, qty) => {
// //     setCart(prev => {
// //       const exists = prev.find(i => i.stockRecordId === product.stockRecordId);
// //       if (qty === 0 && activeTransactionType === "usage") {
// //           return prev.filter(i => i.stockRecordId !== product.stockRecordId);
// //       }
// //       if (exists) return prev.map(i => i.stockRecordId === product.stockRecordId ? { ...i, requestedQty: qty } : i);
// //       return [...prev, { ...product, requestedQty: qty }];
// //     });
// //   };

// //   const handleSubmit = async () => {
// //     const validItems = cart.map(item => ({
// //       stockItemId: item._id,
// //       qtyBaseUnit: Number(item.requestedQty),
// //       stockRecordId: item.stockRecordId 
// //     })).filter(it => it.qtyBaseUnit > 0);

// //     if (validItems.length === 0) return toast.error("Add valid quantities");
// //     if (activeTransactionType !== "usage" && !requestReason.trim()) return toast.error("Reason required");

// //     const loadingToast = toast.loading("Processing...");
// //     try {
// //       if (activeTransactionType === "indent") {
// //         if (editingIndentId) {
// //           await api.patch(`/indent-requests/${editingIndentId}`, {
// //             items: validItems,
// //             note: requestReason,
// //             targetDate: requestDate.toISOString()
// //           });
// //           toast.success("Indent Updated!");
// //         } else {
// //           await api.post("/indent-requests", {
// //             items: validItems,
// //             note: requestReason,
// //             targetDate: requestDate.toISOString()
// //           });
// //           toast.success("Indent Sent!");
// //         }
// //       } else if (activeTransactionType === "request") {
// //         await api.post("/requests", { items: validItems, reason: requestReason, targetDate: requestDate.toISOString() });
// //         toast.success("Request Sent!");
// //       } else {
// //         await api.post("/orders", { items: validItems, date: new Date().toISOString() });
// //         toast.success("Usage Logged!");
// //       }

// //       setCart([]);
// //       setRequestReason("");
// //       setIsCartOpen(false);
// //       setActiveTransactionType("usage");
// //       setEditingIndentId(null); 
// //       await Promise.all([fetchItems(false), fetchIndents(), fetchMyRequests(), fetchMyOrders()]);
// //     } catch (err) {
// //       toast.error(err.response?.data?.error || "Failed");
// //     } finally {
// //       toast.dismiss(loadingToast);
// //     }
// //   };

// //   return (
// //     <div className="min-h-screen bg-[#F8F9FA] pb-24 font-sans text-slate-900">
// //       <header className="bg-white sticky top-0 z-40 shadow-sm border-b border-gray-100">
// //         <div className="max-w-7xl mx-auto px-4 py-3">
// //           <div className="flex justify-between items-center mb-3">
// //             <div className="flex flex-col">
// //               <h1 className="text-xl font-black italic uppercase leading-none">
// //                 <span className="text-green-600">
// //                   {userInfo?.godown?.name || "Inventory"}
// //                 </span> Store
// //               </h1>
// //               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
// //                 {editingIndentId ? "Editing Indent" : (activeTransactionType === 'indent' ? 'Warehouse Mode' : 'Kitchen Mode')}
// //               </span>
// //             </div>

// //             <button onClick={handleLogout} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase active:scale-95 transition-all">
// //               <span>Logout</span>
// //               <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// //                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
// //               </svg>
// //             </button>
// //           </div>

// //           <div className="flex gap-2">
// //             <button 
// //               onClick={() => setIsActivityLogOpen(true)} 
// //               className="flex-1 bg-gray-100 text-gray-800 py-2.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 active:scale-95"
// //             >
// //               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// //                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
// //               </svg>
// //               History {indents.some(i => i.status === 'pending') && <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />}
// //             </button>

// //             <button 
// //               onClick={() => setIsCartOpen(true)} 
// //               className={`flex-1 ${activeTransactionType === 'indent' ? 'bg-orange-600' : (activeTransactionType === 'request' ? 'bg-blue-600' : 'bg-black')} text-white py-2.5 rounded-xl font-black text-[10px] flex items-center justify-center gap-2 shadow-lg uppercase active:scale-95 transition-all`}
// //             >
// //               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// //                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
// //               </svg>
// //               {activeTransactionType === 'usage' ? 'Cart' : 'Review List'} 
// //               <span className="bg-white/20 px-2 py-0.5 rounded text-[9px]">{cart.length}</span>
// //             </button>
// //           </div>
// //         </div>
// //       </header>

// //       {/* --- SEARCH & MODE BANNER --- */}
// //       <div className="bg-white border-b border-gray-100 p-3 sticky top-[125px] z-30 shadow-sm">
// //         <div className="max-w-7xl mx-auto">
// //           {activeTransactionType !== 'usage' && (
// //               <div className={`mb-3 p-3 rounded-xl flex justify-between items-center ${activeTransactionType === 'indent' ? 'bg-orange-50 border border-orange-100' : 'bg-blue-50 border border-blue-100'}`}>
// //                 <p className={`text-[10px] font-black uppercase ${activeTransactionType === 'indent' ? 'text-orange-700' : 'text-blue-700'}`}>
// //                   🚀 Mode: {editingIndentId ? 'Editing Indent' : (activeTransactionType === 'indent' ? 'Warehouse Indent' : 'Local Request')}
// //                 </p>
// //                 <button onClick={() => { setActiveTransactionType('usage'); setEditingIndentId(null); setCart([]); fetchItems(false); }} className="text-[10px] font-bold text-red-500 underline uppercase">Exit Mode</button>
// //               </div>
// //           )}
// //           <div className="relative">
// //             <input 
// //               type="text" 
// //               placeholder={`Search ${activeTransactionType === 'indent' ? 'all' : 'local'} items...`}
// //               value={searchQuery}
// //               onChange={(e) => setSearchQuery(e.target.value)}
// //               className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-11 text-xs font-bold outline-none focus:ring-2 ring-green-500/20 transition-all"
// //             />
// //             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
// //               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
// //             </svg>
// //           </div>
// //         </div>
// //       </div>

// //       <main className="max-w-7xl mx-auto p-4 md:p-8">
// //         {loading ? (
// //             <div className="py-20 text-center uppercase font-black text-xs text-gray-400 animate-pulse">Syncing...</div>
// //         ) : filteredItems.length > 0 ? (
// //           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-8">
// //             {filteredItems.map((item) => (
// //               <InventoryCard 
// //                   key={item.stockRecordId} 
// //                   item={item} 
// //                   isRequestMode={activeTransactionType !== 'usage'} 
// //                   cartQty={cart.find(c => c.stockRecordId === item.stockRecordId)?.requestedQty || 0} 
// //                   onAddToCart={addToCart} 
// //               />
// //             ))}
// //           </div>
// //         ) : (
// //           <div className="py-20 text-center text-gray-400 font-black uppercase text-xs">No items found</div>
// //         )}
// //       </main>

// //       {/* --- ACTIVITY LOG DRAWER --- */}
// //       {isActivityLogOpen && (
// //         <div className="fixed inset-0 z-[110] flex justify-end">
// //           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsActivityLogOpen(false)} />
// //           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
// //             <div className="p-6 border-b flex justify-between items-center">
// //               <h2 className="text-lg font-black uppercase italic">Activity & History</h2>
// //               <button onClick={() => setIsActivityLogOpen(false)} className="text-2xl font-light">✕</button>
// //             </div>
            
// //             <div className="px-4 py-2 border-b bg-gray-50 flex gap-1 overflow-x-auto">
// //                 {[
// //                     { id: 'usage', label: 'Usage' }, 
// //                     { id: 'requests', label: 'Requests' },
// //                     { id: 'indents', label: 'Indents' }
// //                 ].map((tab) => (
// //                   <button 
// //                     key={tab.id} 
// //                     onClick={() => { setLogTab(tab.id); setSelectedHistoryDate(""); }}
// //                     className={`flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${logTab === tab.id ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-400 border-gray-200'}`}
// //                   >{tab.label}</button>
// //                 ))}
// //             </div>

// //             {/* SHARED CALENDAR FILTER FOR ALL TABS */}
// //             <div className="px-4 py-3 bg-white border-b">
// //                <DatePicker 
// //                   selected={selectedHistoryDate ? new Date(selectedHistoryDate) : null} 
// //                   onChange={(date) => setSelectedHistoryDate(date ? date.toISOString().split('T')[0] : "")} 
// //                   customInput={<CustomDateInput placeholder={`Filter ${logTab} by Date`} />} 
// //                   wrapperClassName="w-full"
// //                   isClearable
// //                 />
// //             </div>

// //             <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
// //                 {/* --- USAGE TAB --- */}
// //                 {logTab === 'usage' && (
// //                   <>
// //                     {orders.filter(o => isSameDay(o.createdAt, selectedHistoryDate)).length > 0 ? (
// //                       orders.filter(o => isSameDay(o.createdAt, selectedHistoryDate)).map((order) => (
// //                         <details key={order._id} className="group bg-white border border-gray-100 rounded-2xl shadow-sm mb-3">
// //                           <summary className="list-none cursor-pointer p-4 flex justify-between items-center">
// //                             <div>
// //                                 <p className="text-[10px] font-bold text-gray-400">{new Date(order.createdAt).toLocaleString()}</p>
// //                                 <h3 className="text-xs font-black uppercase text-gray-800">{order.items.length} Items Used</h3>
// //                             </div>
// //                             <div className="text-gray-300 group-open:rotate-180 transition-transform">▼</div>
// //                           </summary>
// //                           <div className="px-4 pb-4 bg-gray-50/50 border-t pt-3 space-y-1">
// //                             {order.items.map((it, idx) => (
// //                                 <div key={idx} className="flex justify-between text-[10px] font-black uppercase text-gray-600">
// //                                   <span>{it.stockItemId?.name || it.name}</span>
// //                                   <span className="text-green-600">{it.qtyBaseUnit || it.quantity} {it.stockItemId?.unitId?.symbol || it.unitId?.symbol || it.unit || 'Units'}</span>
// //                                 </div>
// //                             ))}
// //                           </div>
// //                         </details>
// //                       ))
// //                     ) : (
// //                       <div className="text-center py-10 text-[10px] font-black text-gray-400 uppercase">No usage found for this date</div>
// //                     )}
// //                   </>
// //                 )}

// //                 {/* --- REQUESTS TAB --- */}
// //                 {logTab === 'requests' && (
// //                   <>
// //                     <button onClick={() => { setActiveTransactionType('request'); setIsActivityLogOpen(false); fetchItems(false); }} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[11px] uppercase shadow-md mb-4">+ New Request</button>
// //                     {requests.filter(r => isSameDay(r.createdAt, selectedHistoryDate)).length > 0 ? (
// //                       requests.filter(r => isSameDay(r.createdAt, selectedHistoryDate)).map((r) => (
// //                         <details key={r._id} className="group bg-white border border-gray-100 rounded-2xl mb-3 shadow-sm">
// //                            <summary className="list-none cursor-pointer p-4 flex justify-between items-center">
// //                              <div>
// //                                <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${r.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
// //                                  {r.status}
// //                                </span>
// //                                <p className="text-[10px] font-bold text-gray-900 mt-1">Due: {new Date(r.targetDate).toLocaleDateString()}</p>
// //                              </div>
// //                              <div className="text-gray-300 group-open:rotate-180 transition-transform">▼</div>
// //                            </summary>
// //                            <div className="px-4 pb-4 space-y-1 border-t pt-3">
// //                              {r.items.map((it, idx) => (
// //                                  <div key={idx} className="flex justify-between text-[10px] font-bold uppercase p-2 bg-gray-50 rounded-lg">
// //                                    <span>{it.stockItemId?.name}</span>
// //                                    <span className="text-blue-600">{it.qtyBaseUnit} {it.stockItemId?.unitId?.symbol || it.unit || 'Units'}</span>
// //                                  </div>
// //                              ))}
// //                            </div>
// //                         </details>
// //                       ))
// //                     ) : (
// //                       <div className="text-center py-10 text-[10px] font-black text-gray-400 uppercase">No requests found for this date</div>
// //                     )}
// //                   </>
// //                 )}

// //                 {/* --- INDENTS TAB --- */}
// //                 {logTab === 'indents' && (
// //                    <>
// //                      <button onClick={() => { setActiveTransactionType('indent'); setEditingIndentId(null); setIsActivityLogOpen(false); fetchItems(true); }} className="w-full bg-orange-600 text-white py-3 rounded-xl font-black text-[11px] uppercase shadow-md mb-4">+ Create Indent</button>
// //                      {indents.filter(i => isSameDay(i.createdAt, selectedHistoryDate)).length > 0 ? (
// //                        indents.filter(i => isSameDay(i.createdAt, selectedHistoryDate)).map((indent) => (
// //                         <details key={indent._id} className="group bg-white border border-orange-100 rounded-2xl mb-3 shadow-sm">
// //                           <summary className="list-none cursor-pointer p-4 flex justify-between items-center">
// //                             <div className="flex-1">
// //                                 <div className="flex items-center gap-2 mb-1">
// //                                     <span className={`text-[8px] font-black px-2 py-1 rounded uppercase ${indent.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
// //                                         {indent.status}
// //                                     </span>
// //                                     {indent.status === "pending" && (
// //                                     <button
// //                                         onClick={(e) => {
// //                                         e.preventDefault();
// //                                         e.stopPropagation();
// //                                         setEditingIndentId(indent._id);
// //                                         setActiveTransactionType("indent");
// //                                         setIsActivityLogOpen(false);
// //                                         const mapped = indent.items.map(it => ({
// //                                             stockRecordId: it.stockItemId?._id || it.stockItemId,
// //                                             _id: it.stockItemId?._id || it.stockItemId,
// //                                             name: it.stockItemId?.name,
// //                                             unit: it.stockItemId?.unitId?.symbol || "Units",
// //                                             requestedQty: it.qtyBaseUnit
// //                                         }));
// //                                         setCart(mapped);
// //                                         setRequestReason(indent.note || "");
// //                                         setRequestDate(new Date(indent.targetDate || new Date()));
// //                                         fetchItems(true); 
// //                                         }}
// //                                         className="text-[8px] px-2 py-1 bg-blue-600 text-white rounded font-black uppercase hover:bg-blue-700 transition-colors"
// //                                     >
// //                                         EDIT
// //                                     </button>
// //                                     )}
// //                                 </div>
// //                                 <p className="text-[10px] font-bold text-gray-900">Ref: {new Date(indent.createdAt).toLocaleDateString()}</p>
// //                             </div>
// //                             <div className="text-gray-300 group-open:rotate-180 transition-transform">▼</div>
// //                           </summary>
// //                           <div className="px-4 pb-4 space-y-1 border-t pt-3">
// //                             {indent.items.map((it, idx) => (
// //                               <div key={idx} className="flex justify-between text-[10px] font-bold bg-gray-50 p-2 rounded-lg">
// //                                 <span className="uppercase text-gray-700">{it.stockItemId?.name || "Unknown Item"}</span>
// //                                 <span className="text-orange-600 font-black">
// //                                     {it.qtyBaseUnit} {it.stockItemId?.unitId?.symbol || it.unit || 'Units'}
// //                                 </span>
// //                               </div>
// //                             ))}
// //                           </div>
// //                         </details>
// //                       ))
// //                      ) : (
// //                       <div className="text-center py-10 text-[10px] font-black text-gray-400 uppercase">No indents found for this date</div>
// //                      )}
// //                    </>
// //                 )}
// //             </div>
// //           </div>
// //         </div>
// //       )}

// //       {/* --- CART/LIST DRAWER --- */}
// //       {isCartOpen && (
// //         <div className="fixed inset-0 z-[110] flex justify-end">
// //           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCartOpen(false)} />
// //           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
// //             <div className="p-6 border-b flex justify-between items-center">
// //               <h2 className="text-lg font-black uppercase italic">
// //                 {activeTransactionType === "indent" ? (editingIndentId ? "Edit Indent" : "Review Indent") : (activeTransactionType === "request" ? "Review Request" : "Confirm Usage")}
// //               </h2>
// //               <button onClick={() => setIsCartOpen(false)} className="text-2xl font-light">✕</button>
// //             </div>
            
// //             <div className="flex-1 overflow-y-auto p-4 space-y-4">
// //               {activeTransactionType !== "usage" && (
// //                 <div className={`p-4 rounded-2xl border space-y-4 ${activeTransactionType === "indent" ? "bg-orange-50 border-orange-100" : "bg-blue-50 border-blue-100"}`}>
// //                   <div>
// //                     <label className="text-[9px] font-black uppercase opacity-60 mb-1 block text-center">Target Delivery Date</label>
// //                     <DatePicker 
// //                       selected={requestDate} 
// //                       onChange={(date) => setRequestDate(date)} 
// //                       customInput={<CustomDateInput />} 
// //                       wrapperClassName="w-full"
// //                     />
// //                   </div>
// //                   <div>
// //                     <label className="text-[9px] font-black uppercase opacity-60 mb-1 block">Note / Reason</label>
// //                     <textarea rows="2" placeholder="Explain why this is needed..." className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-blue-500" value={requestReason} onChange={(e) => setRequestReason(e.target.value)} />
// //                   </div>
// //                 </div>
// //               )}
              
// //               {cart.length === 0 ? (
// //                 <div className="text-center py-20 text-gray-400 uppercase text-[10px] font-black">List is empty</div>
// //               ) : cart.map(item => (
// //                     <div key={item.stockRecordId} className="flex gap-4 items-center p-3 rounded-2xl border bg-gray-50 border-gray-100">
// //                         <div className="w-10 h-10 bg-white rounded-xl overflow-hidden flex items-center justify-center border border-gray-200">
// //                           <img src={item.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=f8f9fa&color=10b981&bold=true`} alt="" className="w-full h-full object-contain" />
// //                         </div>
// //                         <div className="flex-1">
// //                           <p className="text-[10px] font-black uppercase text-gray-800 line-clamp-1">{item.name}</p>
// //                           <p className="text-[8px] text-gray-400 font-bold uppercase">{item.unit}</p>
// //                         </div>
// //                         <div className="flex items-center gap-2">
// //                           <button onClick={() => addToCart(item, (parseFloat(item.requestedQty) || 0) - 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-black active:bg-gray-100">-</button>
// //                           <input type="text" className="text-[11px] font-black w-10 text-center bg-transparent outline-none" value={item.requestedQty} onChange={(e) => addToCart(item, e.target.value)} />
// //                           <button onClick={() => addToCart(item, (parseFloat(item.requestedQty) || 0) + 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-black active:bg-gray-100">+</button>
// //                         </div>
// //                     </div>
// //                 ))
// //               }
// //             </div>

// //             {cart.length > 0 && (
// //               <div className="p-6 border-t bg-white">
// //                 <button onClick={handleSubmit} className={`w-full py-4 rounded-2xl font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all ${activeTransactionType === "indent" ? "bg-orange-600" : (activeTransactionType === "request" ? "bg-blue-600" : "bg-black")} text-white`}>
// //                   {editingIndentId ? "Update Indent" : `Submit ${activeTransactionType}`}
// //                 </button>
// //               </div>
// //             )}
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // };















// import React, { useState, useEffect, useMemo, forwardRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { api } from "../api";
// import { toast } from 'react-hot-toast';
// import { socket } from "../socket"; 
// import InventoryCard from './InventoryCard';
// import DatePicker from "react-datepicker";
// import "react-datepicker/dist/react-datepicker.css";

// // --- Sub-Components ---
// const CustomDateInput = forwardRef(({ value, onClick, placeholder }, ref) => (
//   <button
//     className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-xs font-bold text-gray-800 flex items-center justify-center gap-3 hover:border-blue-500 transition-all active:scale-[0.98] shadow-sm"
//     onClick={onClick}
//     ref={ref}
//   >
//     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
//     </svg>
//     <span className="text-center">{value || placeholder || "Select Date"}</span>
//   </button>
// ));

// export const ClientStore = () => {
//   // --- State: User Info ---
//   const [userInfo, setUserInfo] = useState(null);

//   // --- State: Data ---
//   const [items, setItems] = useState([]);
//   const [cart, setCart] = useState([]);
//   const [orders, setOrders] = useState([]); 
//   const [requests, setRequests] = useState([]); 
//   const [indents, setIndents] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // --- State: UI & Filters ---
//   const [searchQuery, setSearchQuery] = useState("");
//   const [selectedHistoryDate, setSelectedHistoryDate] = useState(""); 
//   const [isCartOpen, setIsCartOpen] = useState(false);
//   const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
//   const [logTab, setLogTab] = useState("usage"); 

//   // --- State: Transaction Modes ---
//   const [activeTransactionType, setActiveTransactionType] = useState("usage"); 
//   const [editingIndentId, setEditingIndentId] = useState(null);
//   const [requestReason, setRequestReason] = useState(""); 
//   const [requestDate, setRequestDate] = useState(new Date());

//   const navigate = useNavigate();

//   // --- Helper Functions ---
//   const isSameDay = (dateString, filterDate) => {
//     if (!filterDate) return true;
//     return new Date(dateString).toISOString().split('T')[0] === filterDate;
//   };

//   const mapIndentItemsWithInventory = (indentItems, inventoryItems) => {
//     return indentItems.map(it => {
//       const id = it.stockItemId?._id || it.stockItemId;
//       const inventoryMatch = inventoryItems.find(
//         inv => inv._id === id || inv.stockRecordId === id
//       );

//       return {
//         stockRecordId: inventoryMatch?.stockRecordId || id,
//         _id: id,
//         name: inventoryMatch?.name || it.stockItemId?.name || "Unknown Item",
//         unit: inventoryMatch?.unit || it.stockItemId?.unitId?.symbol || "Units",
//         requestedQty: it.qtyBaseUnit,
//         // ✅ PRIORITY FIX: Ensure image is pulled from inventory context or history
//         image: inventoryMatch?.image || it.stockItemId?.imageUrl || ""
//       };
//     });
//   };

//   // --- Fetch Logic ---
//   const fetchUserInfo = async () => {
//     try {
//       const res = await api.get("/auth/me");
//       setUserInfo(res.data);
//     } catch (err) {
//       console.error("Failed to fetch user info");
//     }
//   };

//   const handleLogout = () => {
//     localStorage.removeItem("token"); 
//     socket.disconnect();
//     toast.success("Logged out successfully");
//     navigate("/login");
//   };

//   const fetchIndents = async () => {
//     try {
//       const res = await api.get("/indent-requests/me");
//       setIndents(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
//     } catch (err) { setIndents([]); }
//   };

//   const fetchItems = async (isForIndent = false) => {
//     try {
//       let res;
//       if (isForIndent) {
//         res = await api.get("/inventory/stock-items");
//         const formatted = res.data.map(item => ({
//           stockRecordId: item._id,
//           _id: item._id,
//           name: item.name,
//           unit: item.unitId?.symbol || "Units", 
//           currentQty: 0, 
//           image: item.imageUrl || "" 
//         })).sort((a, b) => a.name.localeCompare(b.name));
//         setItems(formatted);
//         return formatted; // Return for sequential processing
//       } else {
//         res = await api.get('/my-kitchen-stock'); 
//         const formattedItems = res.data.map(item => ({
//           stockRecordId: item.stockRecordId, 
//           _id: item.stockItemId?._id || item.stockItemId,
//           name: item.name || item.stockItemId?.name || "Unknown Item",
//           currentQty: Number(item.currentQty) || 0, 
//           unit: item.unitId?.symbol || item.unit || item.stockItemId?.unitId?.symbol || "Units", 
//           image: item.image || item.stockItemId?.imageUrl || ""
//         })).sort((a, b) => a.name.localeCompare(b.name));
//         setItems(formattedItems);
//         return formattedItems;
//       }
//     } catch (err) { toast.error("Failed to sync inventory"); }
//   };

//   const fetchMyOrders = async () => {
//     try {
//       const res = await api.get('/consumptions/me');
//       setOrders(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
//     } catch (err) { console.error("Failed to fetch orders"); }
//   };

//   const fetchMyRequests = async () => {
//     try {
//       const res = await api.get('/requests');
//       setRequests(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
//     } catch (err) { setRequests([]); }
//   };

//   useEffect(() => {
//     const init = async () => {
//       setLoading(true);
//       await Promise.all([
//         fetchUserInfo(),
//         fetchItems(false), 
//         fetchMyOrders(), 
//         fetchMyRequests(), 
//         fetchIndents()
//       ]);
//       setLoading(false);
//     };
//     init();
//   }, []);

//   useEffect(() => {
//     socket.on("low_stock_alert", (data) => {
//       toast.error(`⚠️ ${data.payload.message}`, {
//         duration: 6000,
//         position: "top-right",
//         style: { border: '2px solid #ef4444', padding: '16px', fontWeight: '900' }
//       });
//     });
//     return () => socket.off("low_stock_alert");
//   }, []);

//   const filteredItems = useMemo(() => {
//     return items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
//   }, [items, searchQuery]);

//   // --- CART LOGIC ---
//   const addToCart = (product, newQty) => {
//     if (newQty === "" || newQty === "-" || newQty === ".") {
//       updateCartState(product, newQty);
//       return;
//     }

//     const isTypingDecimal = typeof newQty === "string" && newQty.endsWith(".");
//     const parsedQty = parseFloat(newQty);
//     if (isNaN(parsedQty) && !isTypingDecimal) return;

//     if (parsedQty < 0 && activeTransactionType !== "request") {
//       return toast.error(`${activeTransactionType} cannot be negative`);
//     }

//     const existingInCart = cart.find(i => i.stockRecordId === product.stockRecordId);
//     const oldQty = existingInCart ? parseFloat(existingInCart.requestedQty) || 0 : 0;
//     const diff = parsedQty - oldQty;

//     if (activeTransactionType === "usage") {
//       const targetItem = items.find(i => i.stockRecordId === product.stockRecordId);
//       if (diff > 0 && (!targetItem || targetItem.currentQty < diff)) {
//         return toast.error("Insufficient Local Stock");
//       }
//       setItems(prev => prev.map(item =>
//         item.stockRecordId === product.stockRecordId 
//         ? { ...item, currentQty: Math.round((item.currentQty - diff) * 100) / 100 } : item
//       ));
//     }

//     updateCartState(product, newQty);
//   };

//   const updateCartState = (product, qty) => {
//     setCart(prev => {
//       const exists = prev.find(i => i.stockRecordId === product.stockRecordId);
//       if (parseFloat(qty) === 0 && activeTransactionType === "usage") {
//           return prev.filter(i => i.stockRecordId !== product.stockRecordId);
//       }
//       if (exists) return prev.map(i => i.stockRecordId === product.stockRecordId ? { ...i, requestedQty: qty } : i);
//       return [...prev, { ...product, requestedQty: qty }];
//     });
//   };

//   const handleSubmit = async () => {
//     const validItems = cart.map(item => ({
//       stockItemId: item._id,
//       qtyBaseUnit: Number(item.requestedQty),
//       stockRecordId: item.stockRecordId 
//     })).filter(it => it.qtyBaseUnit !== 0);

//     if (validItems.length === 0) return toast.error("Add valid quantities");
//     if (activeTransactionType !== "usage" && !requestReason.trim()) return toast.error("Reason required");

//     const loadingToast = toast.loading("Processing...");
//     try {
//       if (activeTransactionType === "indent") {
//         if (editingIndentId) {
//           await api.patch(`/indent-requests/${editingIndentId}`, {
//             items: validItems,
//             note: requestReason,
//             targetDate: requestDate.toISOString()
//           });
//           toast.success("Indent Updated!");
//         } else {
//           await api.post("/indent-requests", {
//             items: validItems,
//             note: requestReason,
//             targetDate: requestDate.toISOString()
//           });
//           toast.success("Indent Sent!");
//         }
//       } else if (activeTransactionType === "request") {
//         await api.post("/requests", { items: validItems, reason: requestReason, targetDate: requestDate.toISOString() });
//         toast.success("Request Sent!");
//       } else {
//         await api.post("/orders", { items: validItems, date: new Date().toISOString() });
//         toast.success("Usage Logged!");
//       }

//       setCart([]);
//       setRequestReason("");
//       setIsCartOpen(false);
//       setActiveTransactionType("usage");
//       setEditingIndentId(null); 
//       await Promise.all([fetchItems(false), fetchIndents(), fetchMyRequests(), fetchMyOrders()]);
//     } catch (err) {
//       toast.error(err.response?.data?.error || "Failed");
//     } finally {
//       toast.dismiss(loadingToast);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-[#F8F9FA] pb-24 font-sans text-slate-900">
//       <header className="bg-white sticky top-0 z-40 shadow-sm border-b border-gray-100">
//         <div className="max-w-7xl mx-auto px-4 py-3">
//           <div className="flex justify-between items-center mb-3">
//             <div className="flex flex-col">
//               <h1 className="text-xl font-black italic uppercase leading-none">
//                 <span className="text-green-600">
//                   {userInfo?.godown?.name || "Inventory"}
//                 </span> Store
//               </h1>
//               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
//                 {editingIndentId ? "Editing Indent" : (activeTransactionType === 'indent' ? 'Warehouse Mode' : activeTransactionType === 'request' ? 'Request/Return Mode' : 'Kitchen Mode')}
//               </span>
//             </div>

//             <button onClick={handleLogout} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase active:scale-95 transition-all">
//               <span>Logout</span>
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
//               </svg>
//             </button>
//           </div>

//           <div className="flex gap-2">
//             <button 
//               onClick={() => setIsActivityLogOpen(true)} 
//               className="flex-1 bg-gray-100 text-gray-800 py-2.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 active:scale-95"
//             >
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
//               </svg>
//               History {indents.some(i => i.status === 'pending') && <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />}
//             </button>

//             <button 
//               onClick={() => setIsCartOpen(true)} 
//               className={`flex-1 ${activeTransactionType === 'indent' ? 'bg-orange-600' : (activeTransactionType === 'request' ? 'bg-blue-600' : 'bg-black')} text-white py-2.5 rounded-xl font-black text-[10px] flex items-center justify-center gap-2 shadow-lg uppercase active:scale-95 transition-all`}
//             >
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
//               </svg>
//               {activeTransactionType === 'usage' ? 'Cart' : 'Review List'} 
//               <span className="bg-white/20 px-2 py-0.5 rounded text-[9px]">{cart.length}</span>
//             </button>
//           </div>
//         </div>
//       </header>

//       {/* --- SEARCH & MODE BANNER --- */}
//       <div className="bg-white border-b border-gray-100 p-3 sticky top-[125px] z-30 shadow-sm">
//         <div className="max-w-7xl mx-auto">
//           {activeTransactionType !== 'usage' && (
//               <div className={`mb-3 p-3 rounded-xl flex justify-between items-center ${activeTransactionType === 'indent' ? 'bg-orange-50 border border-orange-100' : 'bg-blue-50 border border-blue-100'}`}>
//                 <p className={`text-[10px] font-black uppercase ${activeTransactionType === 'indent' ? 'text-orange-700' : 'text-blue-700'}`}>
//                   🚀 Mode: {editingIndentId ? 'Editing Indent' : (activeTransactionType === 'indent' ? 'Warehouse Indent' : 'Request (Returns Allowed)')}
//                 </p>
//                 <button onClick={() => { setActiveTransactionType('usage'); setEditingIndentId(null); setCart([]); fetchItems(false); }} className="text-[10px] font-bold text-red-500 underline uppercase">Exit Mode</button>
//               </div>
//           )}
//           <div className="relative">
//             <input 
//               type="text" 
//               placeholder={`Search ${activeTransactionType === 'indent' ? 'all' : 'local'} items...`}
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-11 text-xs font-bold outline-none focus:ring-2 ring-green-500/20 transition-all"
//             />
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
//             </svg>
//           </div>
//         </div>
//       </div>

//       <main className="max-w-7xl mx-auto p-4 md:p-8">
//         {loading ? (
//             <div className="py-20 text-center uppercase font-black text-xs text-gray-400 animate-pulse">Syncing...</div>
//         ) : filteredItems.length > 0 ? (
//           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-8">
//             {filteredItems.map((item) => (
//               <InventoryCard 
//                   key={item.stockRecordId} 
//                   item={item} 
//                   isRequestMode={activeTransactionType !== 'usage'} 
//                   cartQty={cart.find(c => c.stockRecordId === item.stockRecordId)?.requestedQty || 0} 
//                   onAddToCart={addToCart} 
//               />
//             ))}
//           </div>
//         ) : (
//           <div className="py-20 text-center text-gray-400 font-black uppercase text-xs">No items found</div>
//         )}
//       </main>

//       {/* --- ACTIVITY LOG DRAWER --- */}
//       {isActivityLogOpen && (
//         <div className="fixed inset-0 z-[110] flex justify-end">
//           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsActivityLogOpen(false)} />
//           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
//             <div className="p-6 border-b flex justify-between items-center">
//               <h2 className="text-lg font-black uppercase italic">Activity & History</h2>
//               <button onClick={() => setIsActivityLogOpen(false)} className="text-2xl font-light">✕</button>
//             </div>
            
//             <div className="px-4 py-2 border-b bg-gray-50 flex gap-1 overflow-x-auto">
//                 {[
//                     { id: 'usage', label: 'Usage' }, 
//                     { id: 'requests', label: 'Requests' },
//                     { id: 'indents', label: 'Indents' }
//                 ].map((tab) => (
//                   <button 
//                     key={tab.id} 
//                     onClick={() => { setLogTab(tab.id); setSelectedHistoryDate(""); }}
//                     className={`flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${logTab === tab.id ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-400 border-gray-200'}`}
//                   >{tab.label}</button>
//                 ))}
//             </div>

//             <div className="px-4 py-3 bg-white border-b">
//                <DatePicker 
//                   selected={selectedHistoryDate ? new Date(selectedHistoryDate) : null} 
//                   onChange={(date) => setSelectedHistoryDate(date ? date.toISOString().split('T')[0] : "")} 
//                   customInput={<CustomDateInput placeholder={`Filter ${logTab} by Date`} />} 
//                   wrapperClassName="w-full"
//                   isClearable
//                 />
//             </div>

//             <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
//                 {logTab === 'usage' && (
//                   <>
//                     {orders.filter(o => isSameDay(o.createdAt, selectedHistoryDate)).length > 0 ? (
//                       orders.filter(o => isSameDay(o.createdAt, selectedHistoryDate)).map((order) => (
//                         <details key={order._id} className="group bg-white border border-gray-100 rounded-2xl shadow-sm mb-3">
//                           <summary className="list-none cursor-pointer p-4 flex justify-between items-center">
//                             <div>
//                                 <p className="text-[10px] font-bold text-gray-400">{new Date(order.createdAt).toLocaleString()}</p>
//                                 <h3 className="text-xs font-black uppercase text-gray-800">{order.items.length} Items Used</h3>
//                             </div>
//                             <div className="text-gray-300 group-open:rotate-180 transition-transform">▼</div>
//                           </summary>
//                           <div className="px-4 pb-4 bg-gray-50/50 border-t pt-3 space-y-1">
//                             {order.items.map((it, idx) => (
//                                 <div key={idx} className="flex justify-between text-[10px] font-black uppercase text-gray-600">
//                                   <span>{it.stockItemId?.name || it.name}</span>
//                                   <span className="text-green-600">{it.qtyBaseUnit || it.quantity} {it.stockItemId?.unitId?.symbol || it.unitId?.symbol || it.unit || 'Units'}</span>
//                                 </div>
//                             ))}
//                           </div>
//                         </details>
//                       ))
//                     ) : (
//                       <div className="text-center py-10 text-[10px] font-black text-gray-400 uppercase">No usage found for this date</div>
//                     )}
//                   </>
//                 )}

//                 {logTab === 'requests' && (
//                   <>
//                     <button onClick={() => { setActiveTransactionType('request'); setIsActivityLogOpen(false); fetchItems(false); }} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[11px] uppercase shadow-md mb-4">+ New Request</button>
//                     {requests.filter(r => isSameDay(r.createdAt, selectedHistoryDate)).length > 0 ? (
//                       requests.filter(r => isSameDay(r.createdAt, selectedHistoryDate)).map((r) => (
//                         <details key={r._id} className="group bg-white border border-gray-100 rounded-2xl mb-3 shadow-sm">
//                            <summary className="list-none cursor-pointer p-4 flex justify-between items-center">
//                              <div>
//                                <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${r.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
//                                  {r.status}
//                                </span>
//                                <p className="text-[10px] font-bold text-gray-900 mt-1">Due: {new Date(r.targetDate).toLocaleDateString()}</p>
//                              </div>
//                              <div className="text-gray-300 group-open:rotate-180 transition-transform">▼</div>
//                            </summary>
//                            <div className="px-4 pb-4 space-y-1 border-t pt-3">
//                              {r.items.map((it, idx) => (
//                                  <div key={idx} className="flex justify-between text-[10px] font-bold uppercase p-2 bg-gray-50 rounded-lg">
//                                    <span>{it.stockItemId?.name}</span>
//                                    <span className={it.qtyBaseUnit < 0 ? "text-red-600" : "text-blue-600"}>{it.qtyBaseUnit} {it.stockItemId?.unitId?.symbol || it.unit || 'Units'}</span>
//                                  </div>
//                              ))}
//                            </div>
//                         </details>
//                       ))
//                     ) : (
//                       <div className="text-center py-10 text-[10px] font-black text-gray-400 uppercase">No requests found for this date</div>
//                     )}
//                   </>
//                 )}

//                 {logTab === 'indents' && (
//                     <>
//                       <button onClick={() => { setActiveTransactionType('indent'); setEditingIndentId(null); setIsActivityLogOpen(false); fetchItems(true); }} className="w-full bg-orange-600 text-white py-3 rounded-xl font-black text-[11px] uppercase shadow-md mb-4">+ Create Indent</button>
//                       {indents.filter(i => isSameDay(i.createdAt, selectedHistoryDate)).length > 0 ? (
//                         indents.filter(i => isSameDay(i.createdAt, selectedHistoryDate)).map((indent) => (
//                          <details key={indent._id} className="group bg-white border border-orange-100 rounded-2xl mb-3 shadow-sm">
//                           <summary className="list-none cursor-pointer p-4 flex justify-between items-center">
//                             <div className="flex-1">
//                                 <div className="flex items-center gap-2 mb-1">
//                                     <span className={`text-[8px] font-black px-2 py-1 rounded uppercase ${indent.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
//                                         {indent.status}
//                                     </span>
//                                     {indent.status === "pending" && (
//                                     <button
//                                         onClick={async (e) => {
//                                           e.preventDefault();
//                                           e.stopPropagation();

//                                           setEditingIndentId(indent._id);
//                                           setActiveTransactionType("indent");
//                                           setIsActivityLogOpen(false);

//                                           try {
//                                             // ✅ Fetch latest inventory FIRST
//                                             const res = await api.get("/inventory/stock-items");

//                                             const inventory = res.data.map(item => ({
//                                               stockRecordId: item._id,
//                                               _id: item._id,
//                                               name: item.name,
//                                               unit: item.unitId?.symbol || "Units",
//                                               currentQty: 0,
//                                               image: item.imageUrl || ""
//                                             }));

//                                             setItems(inventory);

//                                             // ✅ Merge indent items with inventory using helper
//                                             const mapped = mapIndentItemsWithInventory(indent.items, inventory);

//                                             setCart(mapped);
//                                             setRequestReason(indent.note || "");
//                                             setRequestDate(new Date(indent.targetDate || new Date()));

//                                           } catch (err) {
//                                             toast.error("Failed to load indent for editing");
//                                           }
//                                         }}
//                                         className="text-[8px] px-2 py-1 bg-blue-600 text-white rounded font-black uppercase hover:bg-blue-700 transition-colors"
//                                     >
//                                         EDIT
//                                     </button>
//                                     )}
//                                 </div>
//                                 <p className="text-[10px] font-bold text-gray-900">Ref: {new Date(indent.createdAt).toLocaleDateString()}</p>
//                             </div>
//                             <div className="text-gray-300 group-open:rotate-180 transition-transform">▼</div>
//                           </summary>
//                           <div className="px-4 pb-4 space-y-1 border-t pt-3">
//                             {indent.items.map((it, idx) => (
//                               <div key={idx} className="flex justify-between text-[10px] font-bold bg-gray-50 p-2 rounded-lg">
//                                 <span className="uppercase text-gray-700">{it.stockItemId?.name || "Unknown Item"}</span>
//                                 <span className="text-orange-600 font-black">
//                                     {it.qtyBaseUnit} {it.stockItemId?.unitId?.symbol || it.unit || 'Units'}
//                                 </span>
//                               </div>
//                             ))}
//                           </div>
//                          </details>
//                       ))
//                       ) : (
//                        <div className="text-center py-10 text-[10px] font-black text-gray-400 uppercase">No indents found for this date</div>
//                       )}
//                     </>
//                 )}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* --- CART/LIST DRAWER --- */}
//       {isCartOpen && (
//         <div className="fixed inset-0 z-[110] flex justify-end">
//           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCartOpen(false)} />
//           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
//             <div className="p-6 border-b flex justify-between items-center">
//               <h2 className="text-lg font-black uppercase italic">
//                 {activeTransactionType === "indent" ? (editingIndentId ? "Edit Indent" : "Review Indent") : (activeTransactionType === "request" ? "Review Request" : "Confirm Usage")}
//               </h2>
//               <button onClick={() => setIsCartOpen(false)} className="text-2xl font-light">✕</button>
//             </div>
            
//             <div className="flex-1 overflow-y-auto p-4 space-y-4">
//               {activeTransactionType !== "usage" && (
//                 <div className={`p-4 rounded-2xl border space-y-4 ${activeTransactionType === "indent" ? "bg-orange-50 border-orange-100" : "bg-blue-50 border-blue-100"}`}>
//                   <div>
//                     <label className="text-[9px] font-black uppercase opacity-60 mb-1 block text-center">Target Delivery Date</label>
//                     <DatePicker 
//                       selected={requestDate} 
//                       onChange={(date) => setRequestDate(date)} 
//                       customInput={<CustomDateInput />} 
//                       wrapperClassName="w-full"
//                     />
//                   </div>
//                   <div>
//                     <label className="text-[9px] font-black uppercase opacity-60 mb-1 block">Note / Reason</label>
//                     <textarea rows="2" placeholder="Explain why this is needed..." className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-blue-500" value={requestReason} onChange={(e) => setRequestReason(e.target.value)} />
//                   </div>
//                 </div>
//               )}
              
//               {cart.length === 0 ? (
//                 <div className="text-center py-20 text-gray-400 uppercase text-[10px] font-black">List is empty</div>
//               ) : cart.map(item => (
//                     <div key={item.stockRecordId} className="flex gap-4 items-center p-3 rounded-2xl border bg-gray-50 border-gray-100">
//                         <div className="w-10 h-10 bg-white rounded-xl overflow-hidden flex items-center justify-center border border-gray-200">
//                           {/* ✅ BULLETPROOF IMAGE RENDERING */}
//                           <img 
//                             src={
//                               item.image && item.image !== "null"
//                                 ? item.image
//                                 : `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=f8f9fa&color=10b981&bold=true`
//                             }
//                             alt=""
//                             className="w-full h-full object-contain"
//                             onError={(e) => {
//                               e.target.onerror = null;
//                               e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=f8f9fa&color=10b981&bold=true`;
//                             }}
//                           />
//                         </div>
//                         <div className="flex-1">
//                           <p className="text-[10px] font-black uppercase text-gray-800 line-clamp-1">{item.name}</p>
//                           <p className="text-[8px] text-gray-400 font-bold uppercase">{item.unit}</p>
//                         </div>
//                         <div className="flex items-center gap-2">
//                           <button onClick={() => addToCart(item, (parseFloat(item.requestedQty) || 0) - 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-black active:bg-gray-100">-</button>
//                           <input 
//                             type="text" 
//                             inputMode="decimal"
//                             className="text-[11px] font-black w-12 text-center bg-transparent outline-none border-b border-transparent focus:border-gray-300" 
//                             value={item.requestedQty} 
//                             onChange={(e) => addToCart(item, e.target.value)} 
//                           />
//                           <button onClick={() => addToCart(item, (parseFloat(item.requestedQty) || 0) + 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-black active:bg-gray-100">+</button>
//                         </div>
//                     </div>
//                 ))
//               }
//             </div>

//             {cart.length > 0 && (
//               <div className="p-6 border-t bg-white">
//                 <button onClick={handleSubmit} className={`w-full py-4 rounded-2xl font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all ${activeTransactionType === "indent" ? "bg-orange-600" : (activeTransactionType === "request" ? "bg-blue-600" : "bg-black")} text-white`}>
//                   {editingIndentId ? "Update Indent" : `Submit ${activeTransactionType}`}
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };





// 23



import React, { useState, useEffect, useMemo, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from "../api";
import { toast } from 'react-hot-toast';
import { socket } from "../socket"; 
import InventoryCard from './InventoryCard';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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

const ClientStore = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]); 
  const [requests, setRequests] = useState([]); 
  const [indents, setIndents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editIndent, setEditIndent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(""); 
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [logTab, setLogTab] = useState("usage"); 

  const [activeTransactionType, setActiveTransactionType] = useState("usage"); 
  const [requestReason, setRequestReason] = useState(""); 
  const [requestDate, setRequestDate] = useState(new Date());

  const [isReceiveView, setIsReceiveView] = useState(false);
  const [activeReceiveIndent, setActiveReceiveIndent] = useState(null);
  const [receiveItems, setReceiveItems] = useState({});

  const navigate = useNavigate();

  const isSameDay = (dateString, filterDate) => {
    if (!filterDate) return true;
    return new Date(dateString).toISOString().split('T')[0] === filterDate;
  };

  const fetchUserInfo = async () => {
    try {
      const res = await api.get("/auth/me");
      setUserInfo(res.data);
    } catch (err) { console.error("Failed to fetch user info"); }
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
    } catch (err) { setIndents([]); }
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
          image: item.imageUrl || item.image || ""
        })).sort((a, b) => a.name.localeCompare(b.name));
        setItems(formatted);
      } else {
        res = await api.get('/my-kitchen-stock'); 
        const formattedItems = res.data.map(item => ({
          stockRecordId: item.stockRecordId, 
          _id: item.stockItemId?._id || item.stockItemId,
          name: item.name || item.stockItemId?.name || "Unknown Item",
          currentQty: Number(item.currentQty) || 0, 
          unit: item.stockItemId?.unitId?.symbol || item.unit || "Units", 
          image: item.image || item.stockItemId?.imageUrl || ""
        })).sort((a, b) => a.name.localeCompare(b.name));
        setItems(formattedItems);
      }
    } catch (err) { toast.error("Failed to sync inventory"); }
  };

  const fetchMyOrders = async () => {
    try {
      const res = await api.get('/consumptions/me');
      setOrders(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) { console.error("Failed to fetch orders"); }
  };

  const fetchMyRequests = async () => {
    try {
      const res = await api.get('/requests');
      setRequests(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) { setRequests([]); }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchUserInfo(), fetchItems(false), fetchMyOrders(), fetchMyRequests(), fetchIndents()]);
      setLoading(false);
    };
    init();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [items, searchQuery]);

  const addToCart = (product, newQty) => {
    // Prevent empty or partial decimal issues
    if (newQty === "" || newQty === ".") {
      updateCartState(product, newQty);
      return;
    }

    const parsedQty = parseFloat(newQty);

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
        // If qty is 0 or empty, we keep it in cart for user visibility or remove it? 
        // Here we allow 0 but filter it out during submit.
        return prev.map(i => i.stockRecordId === product.stockRecordId ? { ...i, requestedQty: qty } : i);
      }
      return [...prev, { ...product, requestedQty: qty, unit: product.unit }];
    });
  };

  const handleSubmit = async () => {
    const validItems = cart.map(item => ({
      stockItemId: item.stockItemId || item._id || item.stockRecordId,
      qtyBaseUnit: Number(item.requestedQty),
      stockRecordId: item.stockRecordId
    })).filter(it => Number(it.qtyBaseUnit) !== 0); // Only submit quantities > 0

    if (validItems.length === 0) return toast.error("Add valid quantities");
    if (activeTransactionType !== "usage" && !requestReason.trim()) return toast.error("Reason required");

    const loadingToast = toast.loading("Processing...");
    try {
      if (activeTransactionType === "indent") {
        const payload = { items: validItems, note: requestReason, targetDate: requestDate.toISOString() };
        if (editIndent) {
          await api.put(`/indent-requests/${editIndent._id}`, payload);
          toast.success("Indent Updated!");
        } else {
          await api.post("/indent-requests", payload);
          toast.success("Indent Sent!");
        } 
      } else if (activeTransactionType === "request") {
        await api.post("/requests", { items: validItems, reason: requestReason, targetDate: requestDate.toISOString() });
        toast.success("Request Sent!");
      } else {
        await api.post("/orders", { items: validItems, date: new Date().toISOString() });
        toast.success("Usage Logged!");
      }

      setCart([]);
      setRequestReason("");
      setIsCartOpen(false);
      setEditIndent(null);
      setActiveTransactionType("usage");
      await Promise.all([fetchItems(false), fetchIndents(), fetchMyRequests(), fetchMyOrders()]);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const submitReceive = async () => {
    const payload = Object.entries(receiveItems)
      .map(([stockItemId, qty]) => ({ stockItemId, receivedQty: Number(qty) }))
      .filter(p => p.receivedQty >= 0);

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

  const handleEditIndent = (indent) => {
    setActiveTransactionType("indent");
    const mappedCart = indent.items.map(it => ({
      stockRecordId: it.stockItemId?._id,
      stockItemId: it.stockItemId?._id,
      name: it.stockItemId?.name || "Unknown Item",
      unit: it.stockItemId?.unitId?.symbol || it.unit || "unit", 
      requestedQty: it.qtyBaseUnit || 0,
      image: it.stockItemId?.imageUrl || it.stockItemId?.image || ""
    }));

    setCart(mappedCart);
    setRequestReason(indent.note || "");
    setRequestDate(new Date(indent.targetDate || indent.createdAt));
    setEditIndent(indent);
    setIsActivityLogOpen(false);
    fetchItems(true); 
    setIsCartOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 font-sans text-slate-900">
      <header className="bg-white sticky top-0 z-40 shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center mb-3">
            <div className="flex flex-col">
              <h1 className="text-xl font-black italic uppercase leading-none">
                <span className="text-green-600">{userInfo?.godown?.name || "Inventory"}</span> Store
              </h1>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                {activeTransactionType === 'indent' ? 'Warehouse Mode' : activeTransactionType === 'request' ? 'Request Mode' : 'Kitchen Mode'}
              </span>
            </div>
            <button onClick={handleLogout} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase">Logout</button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setIsActivityLogOpen(true); setIsReceiveView(false); }} className="flex-1 bg-gray-100 text-gray-800 py-2.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              History {indents.some(i => i.status === 'confirmed') && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
            </button>
            <button onClick={() => setIsCartOpen(true)} className={`flex-1 ${activeTransactionType === 'indent' ? 'bg-orange-600' : (activeTransactionType === 'request' ? 'bg-blue-600' : 'bg-black')} text-white py-2.5 rounded-xl font-black text-[10px] flex items-center justify-center gap-2 shadow-lg uppercase transition-all`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              Cart <span className="bg-white/20 px-2 py-0.5 rounded text-[9px]">{cart.length}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-100 p-3 sticky top-[125px] z-30 shadow-sm">
        <div className="max-w-7xl mx-auto">
          {activeTransactionType !== 'usage' && (
              <div className={`mb-3 p-3 rounded-xl flex justify-between items-center ${activeTransactionType === 'indent' ? 'bg-orange-50 border border-orange-100' : 'bg-blue-50 border border-blue-100'}`}>
                <p className={`text-[10px] font-black uppercase ${activeTransactionType === 'indent' ? 'text-orange-700' : 'text-blue-700'}`}>
                  🚀 Mode: {activeTransactionType === 'indent' ? 'Warehouse Indent' : 'External Request'}
                </p>
                <button onClick={() => { setActiveTransactionType('usage'); setCart([]); fetchItems(false); setEditIndent(null); }} className="text-[10px] font-bold text-red-500 underline uppercase">Exit Mode</button>
              </div>
          )}
          <div className="relative">
            <input type="text" placeholder={`Search items...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-11 text-xs font-bold outline-none" />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {loading ? (
            <div className="py-20 text-center uppercase font-black text-xs text-gray-400 animate-pulse">Syncing...</div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-8">
            {filteredItems.map((item) => (
              <InventoryCard key={item.stockRecordId} item={item} isRequestMode={activeTransactionType !== 'usage'} cartQty={cart.find(c => c.stockRecordId === item.stockRecordId)?.requestedQty || 0} onAddToCart={addToCart} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-gray-400 font-black uppercase text-xs">No items found</div>
        )}
      </main>

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
                    {[{ id: 'usage', label: 'Usage' }, { id: 'requests', label: 'Requests' }, { id: 'indents', label: 'Indents' }].map((tab) => (
                      <button key={tab.id} onClick={() => { setLogTab(tab.id); setSelectedHistoryDate(""); }} className={`flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${logTab === tab.id ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-400 border-gray-200'}`}>{tab.label}</button>
                    ))}
                </div>
                <div className="px-4 py-3 bg-white border-b">
                   <DatePicker selected={selectedHistoryDate ? new Date(selectedHistoryDate) : null} onChange={(date) => setSelectedHistoryDate(date ? date.toISOString().split('T')[0] : "")} customInput={<CustomDateInput placeholder={`Filter by Date`} />} wrapperClassName="w-full" isClearable />
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                    {logTab === 'usage' && orders.filter(o => isSameDay(o.createdAt, selectedHistoryDate)).map((order) => (
                       <div key={order._id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                          <div className="flex justify-between items-start mb-3 border-b border-dashed pb-2">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase text-gray-800">{new Date(order.createdAt).toLocaleDateString()}</span>
                              <span className="text-[8px] font-bold text-gray-400">{new Date(order.createdAt).toLocaleTimeString()}</span>
                            </div>
                            <span className="text-[8px] font-black bg-green-50 text-green-600 px-2 py-1 rounded-md uppercase">Usage Log</span>
                          </div>
                          <div className="space-y-2">
                            {order.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between text-[10px] font-bold">
                                <span className="text-gray-600 uppercase">{it.stockItemId?.name}</span>
                                <span className="font-black">{it.qtyBaseUnit} {it.stockItemId?.unitId?.symbol || it.unit}</span>
                              </div>
                            ))}
                          </div>
                       </div>
                    ))}

                    {logTab === 'requests' && (
                        <>
                          <button onClick={() => { setActiveTransactionType('request'); setIsActivityLogOpen(false); fetchItems(false); }} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[11px] uppercase shadow-md mb-4">+ New Request</button>
                          {requests.filter(r => isSameDay(r.createdAt, selectedHistoryDate)).map((req) => (
                            <div key={req._id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                <span className={`text-[8px] font-black px-2 py-1 rounded uppercase ${req.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>{req.status}</span>
                                <span className="text-[9px] font-black text-gray-800">{new Date(req.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="text-[10px] font-bold text-gray-500 mb-2 italic">"{req.reason || 'No reason'}"</p>
                              <div className="space-y-1">
                                {req.items.map((it, idx) => (
                                  <div key={idx} className="flex justify-between text-[10px] font-black text-blue-600">
                                    <span className="uppercase">{it.stockItemId?.name}</span>
                                    <span>{it.qtyBaseUnit} {it.stockItemId?.unitId?.symbol || it.unit}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </>
                    )}

                    {logTab === 'indents' && (
                        <>
                          <button onClick={() => { setActiveTransactionType('indent'); setIsActivityLogOpen(false); fetchItems(true); }} className="w-full bg-orange-600 text-white py-3 rounded-xl font-black text-[11px] uppercase shadow-md mb-4">+ Create Indent</button>
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
                                  {!["confirmed", "received", "partially_received"].includes(indent.status) && (
                                    <button onClick={(e) => { e.preventDefault(); handleEditIndent(indent); }} className="text-[8px] px-2 py-1 bg-yellow-500 text-white rounded font-black uppercase">EDIT</button>
                                  )}
                                  {indent.status === "confirmed" && (
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
                                  <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                    <span className="text-[10px] font-black uppercase text-gray-700">{it.stockItemId?.name}</span>
                                    <div className="flex gap-8">
                                      <span className="text-[10px] font-bold text-gray-400">{it.qtyBaseUnit} {it.stockItemId?.unitId?.symbol || 'unit'}</span>
                                      <span className={`text-[10px] font-black ${it.receivedQty > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                                        {it.receivedQty || 0} {it.stockItemId?.unitId?.symbol || 'unit'}
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
                        <th className="pb-2 text-right">Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {activeReceiveIndent?.items.map((item) => (
                        <tr key={item.stockItemId?._id}>
                          <td className="py-4 text-[10px] font-black uppercase leading-tight pr-2">{item.stockItemId?.name}</td>
                          <td className="py-4 text-center text-[10px] font-bold text-gray-500">{item.qtyBaseUnit || 0} {item.stockItemId?.unitId?.symbol || 'unit'}</td>
                          <td className="py-4 text-right">
                            <input 
                              type="number" 
                              min="0" // HTML protection
                              placeholder="0"
                              className="w-20 bg-gray-50 border border-gray-200 rounded-xl p-2 text-right text-xs font-black outline-none focus:border-green-500 transition-all" 
                              onChange={(e) => {
                                  // Logic protection: ensures value never goes below 0
                                  const val = Math.max(0, Number(e.target.value));
                                  setReceiveItems(prev => ({ ...prev, [item.stockItemId?._id]: val }));
                              }} 
                            />
                          </td>
                        </tr>
                      ))}
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
              <h2 className="text-lg font-black uppercase italic">Review {activeTransactionType}</h2>
              <button onClick={() => { setIsCartOpen(false); setEditIndent(null); }} className="text-2xl font-light">✕</button>
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
                            if (current > 0) addToCart(item, current - 1);
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
    ? /^-?\d*\.?\d*$/.test(val)   // allow negative
    : /^\d*\.?\d*$/.test(val))   // normal
) {
  addToCart(item, val);
}
                        }}
                      />
                      <button onClick={() => addToCart(item, (parseFloat(item.requestedQty) || 0) + 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-black">+</button>
                    </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="p-6 border-t bg-white">
                <button onClick={handleSubmit} className={`w-full py-4 rounded-2xl font-black uppercase italic tracking-widest shadow-xl ${activeTransactionType === "indent" ? "bg-orange-600" : (activeTransactionType === "request" ? "bg-blue-600" : "bg-black")} text-white`}>
                  Submit {activeTransactionType}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { ClientStore }; 
export default ClientStore;



