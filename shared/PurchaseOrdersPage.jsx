// // // // // // // // // // // // // // // // // // import { useEffect, useState } from "react";
// // // // // // // // // // // // // // // // // // import { api } from "../api.js";

// // // // // // // // // // // // // // // // // // export const PurchaseOrdersPage = () => {
// // // // // // // // // // // // // // // // // //   const [indents, setIndents] = useState([]);
// // // // // // // // // // // // // // // // // //   const [purchaseOrders, setPurchaseOrders] = useState([]);
// // // // // // // // // // // // // // // // // //   const [selectedIndentId, setSelectedIndentId] = useState("");

// // // // // // // // // // // // // // // // // //   const load = async () => {
// // // // // // // // // // // // // // // // // //     const [indRes, poRes] = await Promise.all([api.get("/purchase-orders/purchased-indents"), api.get("/purchase-orders")]);
// // // // // // // // // // // // // // // // // //     setIndents(indRes.data);
// // // // // // // // // // // // // // // // // //     setPurchaseOrders(poRes.data);
// // // // // // // // // // // // // // // // // //   };
// // // // // // // // // // // // // // // // // //   useEffect(() => {
// // // // // // // // // // // // // // // // // //     load();
// // // // // // // // // // // // // // // // // //   }, []);

// // // // // // // // // // // // // // // // // //   const createPO = async () => {
// // // // // // // // // // // // // // // // // //     const indent = indents.find((i) => i._id === selectedIndentId);
// // // // // // // // // // // // // // // // // //     if (!indent) return;
// // // // // // // // // // // // // // // // // //     const items = indent.items.map((it) => ({
// // // // // // // // // // // // // // // // // //       stockItemId: it.stockItemId,
// // // // // // // // // // // // // // // // // //       orderedQty: it.orderedQty,
// // // // // // // // // // // // // // // // // //       receivedQty: it.orderedQty,
// // // // // // // // // // // // // // // // // //       unitPrice: it.unitPrice,
// // // // // // // // // // // // // // // // // //       amount: (it.orderedQty || 0) * (it.unitPrice || 0)
// // // // // // // // // // // // // // // // // //     }));
// // // // // // // // // // // // // // // // // //     await api.post("/purchase-orders", { indentId: selectedIndentId, items });
// // // // // // // // // // // // // // // // // //     await load();
// // // // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // // // //   return (
// // // // // // // // // // // // // // // // // //     <section>
// // // // // // // // // // // // // // // // // //       <h1>Purchase Orders</h1>
// // // // // // // // // // // // // // // // // //       <select value={selectedIndentId} onChange={(e) => setSelectedIndentId(e.target.value)}>
// // // // // // // // // // // // // // // // // //         <option value="">Select Purchased Indent</option>
// // // // // // // // // // // // // // // // // //         {indents.map((i) => <option key={i._id} value={i._id}>{i.indentNo}</option>)}
// // // // // // // // // // // // // // // // // //       </select>
// // // // // // // // // // // // // // // // // //       <button onClick={createPO}>Create Purchase Order</button>
// // // // // // // // // // // // // // // // // //       <table className="table">
// // // // // // // // // // // // // // // // // //         <thead><tr><th>PO ID</th><th>Indent</th><th>Total</th><th>Received At</th></tr></thead>
// // // // // // // // // // // // // // // // // //         <tbody>
// // // // // // // // // // // // // // // // // //           {purchaseOrders.map((po) => (
// // // // // // // // // // // // // // // // // //             <tr key={po._id}>
// // // // // // // // // // // // // // // // // //               <td>{po._id}</td>
// // // // // // // // // // // // // // // // // //               <td>{po.indentId}</td>
// // // // // // // // // // // // // // // // // //               <td>{po.totalAmount}</td>
// // // // // // // // // // // // // // // // // //               <td>{new Date(po.receivedAt).toLocaleString()}</td>
// // // // // // // // // // // // // // // // // //             </tr>
// // // // // // // // // // // // // // // // // //           ))}
// // // // // // // // // // // // // // // // // //         </tbody>
// // // // // // // // // // // // // // // // // //       </table>
// // // // // // // // // // // // // // // // // //     </section>
// // // // // // // // // // // // // // // // // //   );
// // // // // // // // // // // // // // // // // // };



// // // // // // // // // import { useEffect, useState, useMemo, useCallback } from "react";
// // // // // // // // // import { api } from "../api.js";

// // // // // // // // // export const PurchaseOrdersPage = () => {
// // // // // // // // //   const [activeTab, setActiveTab] = useState("process");
// // // // // // // // //   const [indents, setIndents] = useState([]);
// // // // // // // // //   const [purchaseOrders, setPurchaseOrders] = useState([]);
// // // // // // // // //   const [stockItems, setStockItems] = useState([]);
// // // // // // // // //   const [selectedIndentId, setSelectedIndentId] = useState("");
// // // // // // // // //   const [editableItems, setEditableItems] = useState([]);
// // // // // // // // //   const [loading, setLoading] = useState(false);

// // // // // // // // //   // 1. Load All Necessary Data
// // // // // // // // //   const load = useCallback(async () => {
// // // // // // // // //     setLoading(true);
// // // // // // // // //     try {
// // // // // // // // //       const [indRes, poRes, stockRes] = await Promise.all([
// // // // // // // // //         api.get("/purchase-orders/purchased-indents"),
// // // // // // // // //         api.get("/purchase-orders"),
// // // // // // // // //         api.get("/inventory/stock-items"),
// // // // // // // // //       ]);

// // // // // // // // //       setIndents(indRes.data || []);
// // // // // // // // //       setStockItems(stockRes.data || []);
// // // // // // // // //       setPurchaseOrders(poRes.data || []);
// // // // // // // // //     } catch (error) {
// // // // // // // // //       console.error("Fetch Error:", error);
// // // // // // // // //     } finally {
// // // // // // // // //       setLoading(false);
// // // // // // // // //     }
// // // // // // // // //   }, []);

// // // // // // // // //   useEffect(() => {
// // // // // // // // //     load();
// // // // // // // // //   }, [load]);

// // // // // // // // //   // HELPER: Resolves the Indent Applied Date from populated object or local state backup
// // // // // // // // //   const getIndentDate = (po) => {
// // // // // // // // //     // 1. Try to get it from the populated backend object
// // // // // // // // //     if (po.indentId?.createdAt) return po.indentId.createdAt;

// // // // // // // // //     // 2. Backup: Find the ID in our locally loaded 'indents' state
// // // // // // // // //     const targetId = typeof po.indentId === "string" ? po.indentId : po.indentId?._id;
// // // // // // // // //     const localMatch = indents.find((i) => i._id === targetId);

// // // // // // // // //     return localMatch?.createdAt || null;
// // // // // // // // //   };

// // // // // // // // //   // 2. Map Selected Indent Items for Processing
// // // // // // // // //   useEffect(() => {
// // // // // // // // //     if (selectedIndentId) {
// // // // // // // // //       const indent = indents.find((i) => i._id === selectedIndentId);
// // // // // // // // //       if (indent && indent.items) {
// // // // // // // // //         const formattedItems = indent.items.map((it) => {
// // // // // // // // //           const sId = it.stockItemId?._id || it.stockItemId;
// // // // // // // // //           const lookupName = stockItems.find((s) => s._id === sId)?.name;
// // // // // // // // //           return {
// // // // // // // // //             stockItemId: sId,
// // // // // // // // //             name: it.stockItemId?.name || it.name || lookupName || "Unknown Item",
// // // // // // // // //             orderedQty: Number(it.orderedQty || 0),
// // // // // // // // //             receivedQty: Number(it.orderedQty || 0),
// // // // // // // // //             unitPrice: Number(it.unitPrice || 0),
// // // // // // // // //           };
// // // // // // // // //         });
// // // // // // // // //         setEditableItems(formattedItems);
// // // // // // // // //       }
// // // // // // // // //     } else {
// // // // // // // // //       setEditableItems([]);
// // // // // // // // //     }
// // // // // // // // //   }, [selectedIndentId, indents, stockItems]);

// // // // // // // // //   const handleItemChange = (index, field, value) => {
// // // // // // // // //     const updated = [...editableItems];
// // // // // // // // //     updated[index][field] = Number(value);
// // // // // // // // //     setEditableItems(updated);
// // // // // // // // //   };

// // // // // // // // //   const totalAmount = useMemo(() => {
// // // // // // // // //     return editableItems.reduce((sum, it) => sum + it.receivedQty * it.unitPrice, 0);
// // // // // // // // //   }, [editableItems]);

// // // // // // // // //   // 3. Submit Purchase Order
// // // // // // // // //   const createPO = async () => {
// // // // // // // // //     if (!selectedIndentId) return alert("Select an indent");
// // // // // // // // //     try {
// // // // // // // // //       setLoading(true);
// // // // // // // // //       const payload = {
// // // // // // // // //         indentId: selectedIndentId,
// // // // // // // // //         items: editableItems.map((it) => ({
// // // // // // // // //           ...it,
// // // // // // // // //           amount: it.receivedQty * it.unitPrice,
// // // // // // // // //         })),
// // // // // // // // //         totalAmount,
// // // // // // // // //         receivedAt: new Date().toISOString(),
// // // // // // // // //       };
// // // // // // // // //       await api.post("/purchase-orders", payload);
// // // // // // // // //       alert("Purchase Order Created Successfully!");
// // // // // // // // //       setSelectedIndentId("");
// // // // // // // // //       load();
// // // // // // // // //       setActiveTab("history");
// // // // // // // // //     } catch (e) {
// // // // // // // // //       alert(e.response?.data?.message || "Error creating PO");
// // // // // // // // //     } finally {
// // // // // // // // //       setLoading(false);
// // // // // // // // //     }
// // // // // // // // //   };

// // // // // // // // //   return (
// // // // // // // // //     <section className="p-6 max-w-6xl mx-auto animate-in fade-in duration-500">
// // // // // // // // //       {/* Header */}
// // // // // // // // //       <div className="flex justify-between items-end mb-6 border-b-2 border-gray-100 pb-6">
// // // // // // // // //         <div>
// // // // // // // // //           <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900">
// // // // // // // // //             Purchase Orders
// // // // // // // // //           </h1>
// // // // // // // // //           <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">
// // // // // // // // //             Inventory Intake & Fulfillment
// // // // // // // // //           </p>
// // // // // // // // //         </div>
// // // // // // // // //         <div className="bg-slate-900 p-4 rounded-2xl text-white shadow-xl border border-slate-800">
// // // // // // // // //           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
// // // // // // // // //             Calculated Valuation
// // // // // // // // //           </span>
// // // // // // // // //           <p className="text-3xl font-black">₹{totalAmount.toLocaleString("en-IN")}</p>
// // // // // // // // //         </div>
// // // // // // // // //       </div>

// // // // // // // // //       {/* Tabs */}
// // // // // // // // //       <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 w-fit border border-slate-200">
// // // // // // // // //         <button
// // // // // // // // //           onClick={() => setActiveTab("process")}
// // // // // // // // //           className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
// // // // // // // // //             activeTab === "process"
// // // // // // // // //               ? "bg-white text-blue-600 shadow-md"
// // // // // // // // //               : "text-slate-500 hover:text-slate-800"
// // // // // // // // //           }`}
// // // // // // // // //         >
// // // // // // // // //           Create PO
// // // // // // // // //         </button>
// // // // // // // // //         <button
// // // // // // // // //           onClick={() => setActiveTab("history")}
// // // // // // // // //           className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
// // // // // // // // //             activeTab === "history"
// // // // // // // // //               ? "bg-white text-slate-900 shadow-md"
// // // // // // // // //               : "text-slate-500 hover:text-slate-800"
// // // // // // // // //           }`}
// // // // // // // // //         >
// // // // // // // // //           Purchase History
// // // // // // // // //         </button>
// // // // // // // // //       </div>

// // // // // // // // //       {/* TAB 1: PROCESS NEW PO */}
// // // // // // // // //       {activeTab === "process" && (
// // // // // // // // //         <div className="animate-in slide-in-from-left-4 duration-500">
// // // // // // // // //           <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 mb-10 shadow-2xl shadow-slate-200/50">
// // // // // // // // //             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
// // // // // // // // //               <div className="md:col-span-2">
// // // // // // // // //                 <label className="block text-[11px] font-black text-slate-400 mb-3 uppercase tracking-wider">
// // // // // // // // //                   Select Pending Purchased Indent
// // // // // // // // //                 </label>
// // // // // // // // //                 <select
// // // // // // // // //                   className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:border-blue-500 focus:bg-white outline-none transition-all"
// // // // // // // // //                   value={selectedIndentId}
// // // // // // // // //                   onChange={(e) => setSelectedIndentId(e.target.value)}
// // // // // // // // //                 >
// // // // // // // // //                   <option value="">Choose an indent to process...</option>
// // // // // // // // //                   {indents.map((i) => (
// // // // // // // // //                     <option key={i._id} value={i._id}>
// // // // // // // // //                       {i.indentNo || `REF: ${i._id.slice(-6)}`} — ₹
// // // // // // // // //                       {i.totalAmount?.toLocaleString()}
// // // // // // // // //                     </option>
// // // // // // // // //                   ))}
// // // // // // // // //                 </select>
// // // // // // // // //               </div>
// // // // // // // // //               <button
// // // // // // // // //                 onClick={createPO}
// // // // // // // // //                 disabled={!selectedIndentId || loading}
// // // // // // // // //                 className="bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl uppercase text-xs tracking-widest shadow-xl shadow-blue-100 disabled:bg-slate-200 disabled:shadow-none transition-all"
// // // // // // // // //               >
// // // // // // // // //                 {loading ? "Processing..." : "Confirm Intake"}
// // // // // // // // //               </button>
// // // // // // // // //             </div>
// // // // // // // // //           </div>

// // // // // // // // //           {selectedIndentId ? (
// // // // // // // // //             <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-12">
// // // // // // // // //               <table className="w-full text-left border-collapse">
// // // // // // // // //                 <thead className="bg-slate-50 border-b border-slate-100">
// // // // // // // // //                   <tr className="text-[10px] font-black text-slate-500 uppercase">
// // // // // // // // //                     <th className="p-5 w-20 text-center">S.No</th>
// // // // // // // // //                     <th className="p-5">Item Name</th>
// // // // // // // // //                     <th className="p-5 text-center">Req. Qty</th>
// // // // // // // // //                     <th className="p-5 text-center">Rec. Qty</th>
// // // // // // // // //                     <th className="p-5 text-right">Subtotal</th>
// // // // // // // // //                   </tr>
// // // // // // // // //                 </thead>
// // // // // // // // //                 <tbody>
// // // // // // // // //                   {editableItems.map((item, idx) => (
// // // // // // // // //                     <tr key={idx} className="border-b last:border-0 hover:bg-blue-50/30 transition-colors">
// // // // // // // // //                       <td className="p-5 text-center font-bold text-slate-300">{idx + 1}</td>
// // // // // // // // //                       <td className="p-5 font-black text-slate-800 uppercase text-xs">{item.name}</td>
// // // // // // // // //                       <td className="p-5 text-center font-bold text-slate-400">{item.orderedQty}</td>
// // // // // // // // //                       <td className="p-5 text-center">
// // // // // // // // //                         <input
// // // // // // // // //                           type="number"
// // // // // // // // //                           className="w-24 p-2 border-2 border-slate-100 rounded-lg text-center font-black text-blue-600 focus:border-blue-400 outline-none"
// // // // // // // // //                           value={item.receivedQty}
// // // // // // // // //                           onChange={(e) => handleItemChange(idx, "receivedQty", e.target.value)}
// // // // // // // // //                         />
// // // // // // // // //                       </td>
// // // // // // // // //                       <td className="p-5 text-right font-mono font-black text-slate-900">
// // // // // // // // //                         ₹{(item.receivedQty * item.unitPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
// // // // // // // // //                       </td>
// // // // // // // // //                     </tr>
// // // // // // // // //                   ))}
// // // // // // // // //                 </tbody>
// // // // // // // // //               </table>
// // // // // // // // //             </div>
// // // // // // // // //           ) : (
// // // // // // // // //             <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
// // // // // // // // //               <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
// // // // // // // // //                 Waiting for indent selection...
// // // // // // // // //               </p>
// // // // // // // // //             </div>
// // // // // // // // //           )}
// // // // // // // // //         </div>
// // // // // // // // //       )}

// // // // // // // // //       {/* TAB 2: PURCHASE HISTORY */}
// // // // // // // // //       {activeTab === "history" && (
// // // // // // // // //         <div className="animate-in slide-in-from-right-4 duration-500">
// // // // // // // // //           <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
// // // // // // // // //             <table className="w-full text-left border-collapse">
// // // // // // // // //               <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
// // // // // // // // //                 <tr>
// // // // // // // // //                   <th className="p-5 w-20 text-center">S.No</th>
// // // // // // // // //                   <th className="p-5">Indent Applied Date</th>
// // // // // // // // //                   <th className="p-5">Received Date</th>
// // // // // // // // //                   <th className="p-5 text-right">Total Valuation</th>
// // // // // // // // //                 </tr>
// // // // // // // // //               </thead>
// // // // // // // // //               <tbody className="text-sm">
// // // // // // // // //                 {purchaseOrders.length === 0 ? (
// // // // // // // // //                   <tr>
// // // // // // // // //                     <td colSpan="4" className="p-12 text-center text-slate-400 font-bold italic">
// // // // // // // // //                       No purchase records found.
// // // // // // // // //                     </td>
// // // // // // // // //                   </tr>
// // // // // // // // //                 ) : (
// // // // // // // // //                   purchaseOrders.map((po, index) => {
// // // // // // // // //                     const appliedDate = getIndentDate(po);
// // // // // // // // //                     return (
// // // // // // // // //                       <tr key={po._id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
// // // // // // // // //                         <td className="p-5 text-center font-bold text-slate-300">{index + 1}</td>
// // // // // // // // //                         <td className="p-5">
// // // // // // // // //                           <span className="font-bold text-slate-700">
// // // // // // // // //                             {appliedDate
// // // // // // // // //                               ? new Date(appliedDate).toLocaleDateString("en-GB", {
// // // // // // // // //                                   day: "2-digit",
// // // // // // // // //                                   month: "short",
// // // // // // // // //                                   year: "numeric",
// // // // // // // // //                                 })
// // // // // // // // //                               : "N/A"}
// // // // // // // // //                           </span>
// // // // // // // // //                         </td>
// // // // // // // // //                         <td className="p-5">
// // // // // // // // //                           <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-black">
// // // // // // // // //                             {new Date(po.receivedAt || po.createdAt).toLocaleDateString("en-GB", {
// // // // // // // // //                               day: "2-digit",
// // // // // // // // //                               month: "short",
// // // // // // // // //                               year: "numeric",
// // // // // // // // //                             })}
// // // // // // // // //                           </span>
// // // // // // // // //                         </td>
// // // // // // // // //                         <td className="p-5 text-right font-black text-slate-900 text-base">
// // // // // // // // //                           ₹{po.totalAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
// // // // // // // // //                         </td>
// // // // // // // // //                       </tr>
// // // // // // // // //                     );
// // // // // // // // //                   })
// // // // // // // // //                 )}
// // // // // // // // //               </tbody>
// // // // // // // // //             </table>
// // // // // // // // //           </div>
// // // // // // // // //         </div>
// // // // // // // // //       )}
// // // // // // // // //     </section>
// // // // // // // // //   );
// // // // // // // // // };




// // // // // // // import { useEffect, useState, useMemo, useCallback } from "react";
// // // // // // // import { api } from "../api.js";

// // // // // // // export const PurchaseOrdersPage = () => {
// // // // // // //   const [activeTab, setActiveTab] = useState("process"); // 'process' or 'history'
// // // // // // //   const [viewMode, setViewMode] = useState("list"); // 'list' or 'details'
  
// // // // // // //   const [indents, setIndents] = useState([]);
// // // // // // //   const [purchaseOrders, setPurchaseOrders] = useState([]);
// // // // // // //   const [stockItems, setStockItems] = useState([]);
// // // // // // //   const [selectedIndentId, setSelectedIndentId] = useState("");
// // // // // // //   const [editableItems, setEditableItems] = useState([]);
// // // // // // //   const [loading, setLoading] = useState(false);
// // // // // // //   const [selectedViewData, setSelectedViewData] = useState(null);

// // // // // // //   const load = useCallback(async () => {
// // // // // // //     setLoading(true);
// // // // // // //     try {
// // // // // // //       const [indRes, poRes, stockRes] = await Promise.all([
// // // // // // //         api.get("/purchase-orders/purchased-indents"),
// // // // // // //         api.get("/purchase-orders"),
// // // // // // //         api.get("/inventory/stock-items"),
// // // // // // //       ]);

// // // // // // //       setIndents(indRes.data || []);
// // // // // // //       setStockItems(stockRes.data || []);
// // // // // // //       setPurchaseOrders(poRes.data || []);
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Fetch Error:", error);
// // // // // // //     } finally {
// // // // // // //       setLoading(false);
// // // // // // //     }
// // // // // // //   }, []);

// // // // // // //   useEffect(() => {
// // // // // // //     load();
// // // // // // //   }, [load]);

// // // // // // //   // Helper to find stock name by ID
// // // // // // //   const getStockName = useCallback((id) => {
// // // // // // //     const item = stockItems.find(s => s._id === id);
// // // // // // //     return item ? item.name : "Unknown Item";
// // // // // // //   }, [stockItems]);

// // // // // // //   const getIndentInfo = (po) => {
// // // // // // //     const targetId = typeof po.indentId === "string" ? po.indentId : po.indentId?._id;
// // // // // // //     const localMatch = indents.find((i) => i._id === targetId);
// // // // // // //     const finalObj = po.indentId?.createdAt ? po.indentId : localMatch;

// // // // // // //     return {
// // // // // // //       date: finalObj?.createdAt || null,
// // // // // // //       id: finalObj?.indentNo || (targetId ? `REF-${targetId.slice(-6).toUpperCase()}` : "N/A"),
// // // // // // //       total: finalObj?.totalAmount || 0,
// // // // // // //       raw: finalObj
// // // // // // //     };
// // // // // // //   };

// // // // // // //   useEffect(() => {
// // // // // // //     if (selectedIndentId) {
// // // // // // //       const indent = indents.find((i) => i._id === selectedIndentId);
// // // // // // //       if (indent && indent.items) {
// // // // // // //         const formattedItems = indent.items.map((it) => {
// // // // // // //           const sId = it.stockItemId?._id || it.stockItemId;
// // // // // // //           return {
// // // // // // //             stockItemId: sId,
// // // // // // //             name: it.stockItemId?.name || it.name || getStockName(sId),
// // // // // // //             orderedQty: Number(it.orderedQty || 0),
// // // // // // //             receivedQty: Number(it.orderedQty || 0),
// // // // // // //             unitPrice: Number(it.unitPrice || 0),
// // // // // // //           };
// // // // // // //         });
// // // // // // //         setEditableItems(formattedItems);
// // // // // // //       }
// // // // // // //     } else {
// // // // // // //       setEditableItems([]);
// // // // // // //     }
// // // // // // //   }, [selectedIndentId, indents, getStockName]);

// // // // // // //   const handleItemChange = (index, field, value) => {
// // // // // // //     const updated = [...editableItems];
// // // // // // //     updated[index][field] = Number(value);
// // // // // // //     setEditableItems(updated);
// // // // // // //   };

// // // // // // //   const totalAmount = useMemo(() => {
// // // // // // //     return editableItems.reduce((sum, it) => sum + it.receivedQty * it.unitPrice, 0);
// // // // // // //   }, [editableItems]);

// // // // // // //   const createPO = async () => {
// // // // // // //     if (!selectedIndentId) return alert("Select an indent");
// // // // // // //     try {
// // // // // // //       setLoading(true);
// // // // // // //       const payload = {
// // // // // // //         indentId: selectedIndentId,
// // // // // // //         items: editableItems.map((it) => ({
// // // // // // //           ...it,
// // // // // // //           amount: it.receivedQty * it.unitPrice,
// // // // // // //         })),
// // // // // // //         totalAmount,
// // // // // // //         receivedAt: new Date().toISOString(),
// // // // // // //       };
// // // // // // //       await api.post("/purchase-orders", payload);
// // // // // // //       alert("Purchase Order Created Successfully!");
// // // // // // //       setSelectedIndentId("");
// // // // // // //       load();
// // // // // // //       setActiveTab("history");
// // // // // // //     } catch (e) {
// // // // // // //       alert(e.response?.data?.message || "Error creating PO");
// // // // // // //     } finally {
// // // // // // //       setLoading(false);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   // Switch to "Details Page"
// // // // // // //   const handleViewDetails = (indent) => {
// // // // // // //     setSelectedViewData(indent);
// // // // // // //     setViewMode("details");
// // // // // // //   };

// // // // // // //   if (viewMode === "details" && selectedViewData) {
// // // // // // //     return (
// // // // // // //       <section className="p-8 max-w-5xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
// // // // // // //         <button 
// // // // // // //           onClick={() => setViewMode("list")}
// // // // // // //           className="mb-6 text-slate-400 hover:text-slate-900 font-black uppercase text-[10px] tracking-widest flex items-center gap-2"
// // // // // // //         >
// // // // // // //           ← Back to List
// // // // // // //         </button>

// // // // // // //         <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-2xl overflow-hidden">
// // // // // // //           <div className="p-10 bg-slate-50 border-b flex justify-between items-center">
// // // // // // //             <div>
// // // // // // //               <p className="text-blue-600 font-black uppercase text-[10px] tracking-[0.3em] mb-2">Indent Record</p>
// // // // // // //               <h2 className="text-4xl font-black text-slate-900 italic uppercase">
// // // // // // //                 {selectedViewData.indentNo || "IND-REF"}
// // // // // // //               </h2>
// // // // // // //               <p className="text-slate-400 font-bold mt-2">
// // // // // // //                 Date: {new Date(selectedViewData.createdAt).toLocaleDateString("en-GB")}
// // // // // // //               </p>
// // // // // // //             </div>
// // // // // // //             <div className="text-right">
// // // // // // //               <p className="text-slate-400 font-black uppercase text-[10px] mb-1">Total Valuation</p>
// // // // // // //               <p className="text-4xl font-black text-slate-900">₹{selectedViewData.totalAmount?.toLocaleString()}</p>
// // // // // // //             </div>
// // // // // // //           </div>

// // // // // // //           <table className="w-full text-left">
// // // // // // //             <thead className="bg-white border-b text-[10px] font-black uppercase text-slate-400">
// // // // // // //               <tr>
// // // // // // //                 <th className="p-6">Item Name</th>
// // // // // // //                 <th className="p-6 text-center">Qty</th>
// // // // // // //                 <th className="p-6 text-right">Price</th>
// // // // // // //                 <th className="p-6 text-right">Subtotal</th>
// // // // // // //               </tr>
// // // // // // //             </thead>
// // // // // // //             <tbody>
// // // // // // //               {selectedViewData.items?.map((item, idx) => (
// // // // // // //                 <tr key={idx} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
// // // // // // //                   <td className="p-6 font-black text-slate-800 uppercase text-xs">
// // // // // // //                     {item.stockItemId?.name || item.name || getStockName(item.stockItemId?._id || item.stockItemId)}
// // // // // // //                   </td>
// // // // // // //                   <td className="p-6 text-center font-bold text-slate-600">{item.orderedQty || item.receivedQty}</td>
// // // // // // //                   <td className="p-6 text-right text-slate-500">₹{item.unitPrice.toLocaleString()}</td>
// // // // // // //                   <td className="p-6 text-right font-black text-slate-900">
// // // // // // //                     ₹{((item.orderedQty || item.receivedQty) * item.unitPrice).toLocaleString()}
// // // // // // //                   </td>
// // // // // // //                 </tr>
// // // // // // //               ))}
// // // // // // //             </tbody>
// // // // // // //           </table>
// // // // // // //           <div className="p-8 bg-slate-900 text-white flex justify-end">
// // // // // // //              <div className="text-right">
// // // // // // //                 <span className="text-[10px] font-black uppercase opacity-50 block">Grand Total</span>
// // // // // // //                 <span className="text-2xl font-black italic">₹{selectedViewData.totalAmount?.toLocaleString()}</span>
// // // // // // //              </div>
// // // // // // //           </div>
// // // // // // //         </div>
// // // // // // //       </section>
// // // // // // //     );
// // // // // // //   }

// // // // // // //   return (
// // // // // // //     <section className="p-6 max-w-6xl mx-auto animate-in fade-in duration-500">
// // // // // // //       {/* Header */}
// // // // // // //       <div className="flex justify-between items-end mb-6 border-b-2 border-gray-100 pb-6">
// // // // // // //         <div>
// // // // // // //           <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900">
// // // // // // //             Purchase Orders
// // // // // // //           </h1>
// // // // // // //           <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">
// // // // // // //             Inventory Intake & Fulfillment
// // // // // // //           </p>
// // // // // // //         </div>
// // // // // // //         <div className="bg-slate-900 p-4 rounded-2xl text-white shadow-xl border border-slate-800">
// // // // // // //           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
// // // // // // //             Calculated Valuation
// // // // // // //           </span>
// // // // // // //           <p className="text-3xl font-black">₹{totalAmount.toLocaleString("en-IN")}</p>
// // // // // // //         </div>
// // // // // // //       </div>

// // // // // // //       {/* Tabs */}
// // // // // // //       <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 w-fit border border-slate-200">
// // // // // // //         <button
// // // // // // //           onClick={() => setActiveTab("process")}
// // // // // // //           className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
// // // // // // //             activeTab === "process" ? "bg-white text-blue-600 shadow-md" : "text-slate-500 hover:text-slate-800"
// // // // // // //           }`}
// // // // // // //         >
// // // // // // //           Create PO
// // // // // // //         </button>
// // // // // // //         <button
// // // // // // //           onClick={() => setActiveTab("history")}
// // // // // // //           className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
// // // // // // //             activeTab === "history" ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-800"
// // // // // // //           }`}
// // // // // // //         >
// // // // // // //           Purchase History
// // // // // // //         </button>
// // // // // // //       </div>

// // // // // // //       {activeTab === "process" && (
// // // // // // //         <div className="animate-in slide-in-from-left-4 duration-500">
// // // // // // //           <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 mb-10 shadow-2xl shadow-slate-200/50">
// // // // // // //             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
// // // // // // //               <div className="md:col-span-2">
// // // // // // //                 <label className="block text-[11px] font-black text-slate-400 mb-3 uppercase tracking-wider">
// // // // // // //                   Select Pending Purchased Indent
// // // // // // //                 </label>
// // // // // // //                 <select
// // // // // // //                   className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:border-blue-500 focus:bg-white outline-none transition-all"
// // // // // // //                   value={selectedIndentId}
// // // // // // //                   onChange={(e) => setSelectedIndentId(e.target.value)}
// // // // // // //                 >
// // // // // // //                   <option value="">Choose an indent to process...</option>
// // // // // // //                   {indents.map((i) => (
// // // // // // //                     <option key={i._id} value={i._id}>
// // // // // // //                       {i.indentNo || `REF: ${i._id.slice(-6).toUpperCase()}`} — ₹{i.totalAmount?.toLocaleString()}
// // // // // // //                     </option>
// // // // // // //                   ))}
// // // // // // //                 </select>
// // // // // // //               </div>
              
// // // // // // //               <button
// // // // // // //                 disabled={!selectedIndentId}
// // // // // // //                 onClick={() => handleViewDetails(indents.find(i => i._id === selectedIndentId))}
// // // // // // //                 className="bg-white border-2 border-slate-200 text-slate-600 font-black py-5 rounded-2xl uppercase text-[10px] tracking-widest hover:border-slate-400 disabled:opacity-30 transition-all"
// // // // // // //               >
// // // // // // //                 👁 View Items
// // // // // // //               </button>

// // // // // // //               <button
// // // // // // //                 onClick={createPO}
// // // // // // //                 disabled={!selectedIndentId || loading}
// // // // // // //                 className="bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl uppercase text-xs tracking-widest shadow-xl shadow-blue-100 disabled:bg-slate-200 transition-all"
// // // // // // //               >
// // // // // // //                 {loading ? "Processing..." : "Confirm Intake"}
// // // // // // //               </button>
// // // // // // //             </div>
// // // // // // //           </div>

// // // // // // //           {selectedIndentId ? (
// // // // // // //             <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-12 animate-in slide-in-from-bottom-4">
// // // // // // //               <table className="w-full text-left border-collapse">
// // // // // // //                 <thead className="bg-slate-50 border-b border-slate-100">
// // // // // // //                   <tr className="text-[10px] font-black text-slate-500 uppercase">
// // // // // // //                     <th className="p-5 w-20 text-center">S.No</th>
// // // // // // //                     <th className="p-5">Item Name</th>
// // // // // // //                     <th className="p-5 text-center">Req. Qty</th>
// // // // // // //                     <th className="p-5 text-center">Rec. Qty</th>
// // // // // // //                     <th className="p-5 text-right">Subtotal</th>
// // // // // // //                   </tr>
// // // // // // //                 </thead>
// // // // // // //                 <tbody>
// // // // // // //                   {editableItems.map((item, idx) => (
// // // // // // //                     <tr key={idx} className="border-b last:border-0 hover:bg-blue-50/30 transition-colors">
// // // // // // //                       <td className="p-5 text-center font-bold text-slate-300">{idx + 1}</td>
// // // // // // //                       <td className="p-5 font-black text-slate-800 uppercase text-xs">{item.name}</td>
// // // // // // //                       <td className="p-5 text-center font-bold text-slate-400">{item.orderedQty}</td>
// // // // // // //                       <td className="p-5 text-center">
// // // // // // //                         <input
// // // // // // //                           type="number"
// // // // // // //                           className="w-24 p-2 border-2 border-slate-100 rounded-lg text-center font-black text-blue-600 focus:border-blue-400 outline-none"
// // // // // // //                           value={item.receivedQty}
// // // // // // //                           onChange={(e) => handleItemChange(idx, "receivedQty", e.target.value)}
// // // // // // //                         />
// // // // // // //                       </td>
// // // // // // //                       <td className="p-5 text-right font-mono font-black text-slate-900">
// // // // // // //                         ₹{(item.receivedQty * item.unitPrice).toLocaleString("en-IN")}
// // // // // // //                       </td>
// // // // // // //                     </tr>
// // // // // // //                   ))}
// // // // // // //                 </tbody>
// // // // // // //               </table>
// // // // // // //             </div>
// // // // // // //           ) : (
// // // // // // //             <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
// // // // // // //               <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
// // // // // // //                 Waiting for indent selection...
// // // // // // //               </p>
// // // // // // //             </div>
// // // // // // //           )}
// // // // // // //         </div>
// // // // // // //       )}

// // // // // // //       {activeTab === "history" && (
// // // // // // //         <div className="animate-in slide-in-from-right-4 duration-500">
// // // // // // //           <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
// // // // // // //             <table className="w-full text-left border-collapse">
// // // // // // //               <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
// // // // // // //                 <tr>
// // // // // // //                   <th className="p-5 w-16 text-center">S.No</th>
// // // // // // //                   <th className="p-5">Indent ID</th>
// // // // // // //                   <th className="p-5">Indent Date</th>
// // // // // // //                   <th className="p-5">Received Date</th>
// // // // // // //                   <th className="p-5 text-right">Total Valuation</th>
// // // // // // //                   <th className="p-5 text-center">View</th>
// // // // // // //                 </tr>
// // // // // // //               </thead>
// // // // // // //               <tbody className="text-sm">
// // // // // // //                 {purchaseOrders.length === 0 ? (
// // // // // // //                   <tr>
// // // // // // //                     <td colSpan="6" className="p-12 text-center text-slate-400 font-bold italic">No records found.</td>
// // // // // // //                   </tr>
// // // // // // //                 ) : (
// // // // // // //                   purchaseOrders.map((po, index) => {
// // // // // // //                     const indentInfo = getIndentInfo(po);
// // // // // // //                     return (
// // // // // // //                       <tr key={po._id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
// // // // // // //                         <td className="p-5 text-center font-bold text-slate-300">{index + 1}</td>
// // // // // // //                         <td className="p-5">
// // // // // // //                           <span className="font-black text-slate-900 uppercase text-xs">{indentInfo.id}</span>
// // // // // // //                         </td>
// // // // // // //                         <td className="p-5 font-bold text-slate-600">
// // // // // // //                           {indentInfo.date ? new Date(indentInfo.date).toLocaleDateString("en-GB") : "N/A"}
// // // // // // //                         </td>
// // // // // // //                         <td className="p-5">
// // // // // // //                           <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase">
// // // // // // //                             {new Date(po.receivedAt || po.createdAt).toLocaleDateString("en-GB")}
// // // // // // //                           </span>
// // // // // // //                         </td>
// // // // // // //                         <td className="p-5 text-right font-black text-slate-900">
// // // // // // //                           ₹{po.totalAmount?.toLocaleString()}
// // // // // // //                         </td>
// // // // // // //                         <td className="p-5 text-center">
// // // // // // //                           <button 
// // // // // // //                             onClick={() => handleViewDetails(indentInfo.raw)}
// // // // // // //                             className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
// // // // // // //                           >👁</button>
// // // // // // //                         </td>
// // // // // // //                       </tr>
// // // // // // //                     );
// // // // // // //                   })
// // // // // // //                 )}
// // // // // // //               </tbody>
// // // // // // //             </table>
// // // // // // //           </div>
// // // // // // //         </div>
// // // // // // //       )}
// // // // // // //     </section>
// // // // // // //   );
// // // // // // // };













// // // // // // //wowowowoow











// // // // // // import { useEffect, useState, useMemo, useCallback } from "react";
// // // // // // import { api } from "../api.js";
// // // // // // import { useToast } from "../toast.jsx";
// // // // // // import { Search, CheckCircle2, Eye, PackageCheck, History } from "lucide-react";

// // // // // // export const PurchaseOrdersPage = () => {
// // // // // //   const { showToast } = useToast();
// // // // // //   const [view, setView] = useState("history"); // 'history' or 'create'
// // // // // //   const [searchTerm, setSearchTerm] = useState("");
  
// // // // // //   const [indents, setIndents] = useState([]);
// // // // // //   const [purchaseOrders, setPurchaseOrders] = useState([]);
// // // // // //   const [stockItems, setStockItems] = useState([]);
// // // // // //   const [selectedIndentId, setSelectedIndentId] = useState("");
// // // // // //   const [editableItems, setEditableItems] = useState([]);
// // // // // //   const [loading, setLoading] = useState(false);
// // // // // //   const [selectedPoId, setSelectedPoId] = useState(null);

// // // // // //   const load = useCallback(async () => {
// // // // // //     setLoading(true);
// // // // // //     try {
// // // // // //       const [indRes, poRes, stockRes] = await Promise.all([
// // // // // //         api.get("/purchase-orders/purchased-indents"),
// // // // // //         api.get("/purchase-orders"),
// // // // // //         api.get("/inventory/stock-items"),
// // // // // //       ]);

// // // // // //       const sortedPOs = (poRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // //       setIndents(indRes.data || []);
// // // // // //       setStockItems(stockRes.data || []);
// // // // // //       setPurchaseOrders(sortedPOs);
      
// // // // // //       if (sortedPOs.length > 0 && !selectedPoId) {
// // // // // //         setSelectedPoId(sortedPOs[0]._id);
// // // // // //       }
// // // // // //     } catch (error) {
// // // // // //       showToast("Failed to load records", "error");
// // // // // //     } finally {
// // // // // //       setLoading(false);
// // // // // //     }
// // // // // //   }, [showToast, selectedPoId]);

// // // // // //   useEffect(() => { load(); }, [load]);

// // // // // //   // Filters
// // // // // //   const filteredPOs = useMemo(() => {
// // // // // //     return purchaseOrders.filter(po => 
// // // // // //       (po.indentId?.indentNo || "").toLowerCase().includes(searchTerm.toLowerCase())
// // // // // //     );
// // // // // //   }, [purchaseOrders, searchTerm]);

// // // // // //   const activePO = useMemo(() => 
// // // // // //     purchaseOrders.find(p => p._id === selectedPoId), 
// // // // // //   [selectedPoId, purchaseOrders]);

// // // // // //   const getStockName = useCallback((id) => {
// // // // // //     const item = stockItems.find(s => s._id === id);
// // // // // //     return item ? item.name : "Unknown Item";
// // // // // //   }, [stockItems]);

// // // // // //   // Handle Indent Selection for new PO
// // // // // //   useEffect(() => {
// // // // // //     if (selectedIndentId) {
// // // // // //       const indent = indents.find((i) => i._id === selectedIndentId);
// // // // // //       if (indent?.items) {
// // // // // //         setEditableItems(indent.items.map((it) => ({
// // // // // //           stockItemId: it.stockItemId?._id || it.stockItemId,
// // // // // //           name: it.stockItemId?.name || it.name || getStockName(it.stockItemId?._id || it.stockItemId),
// // // // // //           orderedQty: Number(it.orderedQty || 0),
// // // // // //           receivedQty: Number(it.orderedQty || 0),
// // // // // //           unitPrice: Number(it.unitPrice || 0),
// // // // // //         })));
// // // // // //       }
// // // // // //     } else {
// // // // // //       setEditableItems([]);
// // // // // //     }
// // // // // //   }, [selectedIndentId, indents, getStockName]);

// // // // // //   const createPO = async () => {
// // // // // //     if (!selectedIndentId) return showToast("Select an indent", "info");
// // // // // //     try {
// // // // // //       setLoading(true);
// // // // // //       const totalAmount = editableItems.reduce((sum, it) => sum + it.receivedQty * it.unitPrice, 0);
// // // // // //       const payload = {
// // // // // //         indentId: selectedIndentId,
// // // // // //         items: editableItems.map((it) => ({ ...it, amount: it.receivedQty * it.unitPrice })),
// // // // // //         totalAmount,
// // // // // //         receivedAt: new Date().toISOString(),
// // // // // //       };
// // // // // //       await api.post("/purchase-orders", payload);
// // // // // //       showToast("Inventory intake confirmed!", "success");
// // // // // //       setSelectedIndentId("");
// // // // // //       setView("history");
// // // // // //       load();
// // // // // //     } catch (e) {
// // // // // //       showToast("Error creating PO", "error");
// // // // // //     } finally {
// // // // // //       setLoading(false);
// // // // // //     }
// // // // // //   };

// // // // // //   return (
// // // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // // //       {/* Header */}
// // // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
// // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // // // //             Purchase <span style={{ color: '#6366f1' }}>Orders</span>
// // // // // //           </h1>
// // // // // //           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
// // // // // //             <button
// // // // // //               onClick={() => setView("history")}
// // // // // //               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'history' ? '#fff' : 'transparent', color: view === 'history' ? '#6366f1' : '#64748b', boxShadow: view === 'history' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
// // // // // //               <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><History size={14}/> History</div>
// // // // // //             </button>
// // // // // //             <button
// // // // // //               onClick={() => setView("create")}
// // // // // //               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'create' ? '#fff' : 'transparent', color: view === 'create' ? '#6366f1' : '#64748b', boxShadow: view === 'create' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
// // // // // //               <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><PackageCheck size={14}/> Intake</div>
// // // // // //             </button>
// // // // // //           </div>
// // // // // //         </div>

// // // // // //         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // //           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // // //           <input
// // // // // //             type="text"
// // // // // //             placeholder="Search POs..."
// // // // // //             value={searchTerm}
// // // // // //             onChange={(e) => setSearchTerm(e.target.value)}
// // // // // //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
// // // // // //           />
// // // // // //         </div>
// // // // // //       </div>

// // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // //         {view === "history" ? (
// // // // // //           <>
// // // // // //             {/* Sidebar List */}
// // // // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px' }}>COMPLETED ORDERS ({filteredPOs.length})</div>
// // // // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // //                 {filteredPOs.map(po => (
// // // // // //                   <div
// // // // // //                     key={po._id}
// // // // // //                     onClick={() => setSelectedPoId(po._id)}
// // // // // //                     style={{
// // // // // //                       padding: '16px', borderRadius: '16px', cursor: 'pointer',
// // // // // //                       background: selectedPoId === po._id ? '#fff' : 'transparent',
// // // // // //                       border: selectedPoId === po._id ? '1px solid #6366f1' : '1px solid transparent',
// // // // // //                       boxShadow: selectedPoId === po._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// // // // // //                     }}
// // // // // //                   >
// // // // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // //                       <div style={{ fontWeight: '700', color: selectedPoId === po._id ? '#6366f1' : '#1e293b' }}>
// // // // // //                         {po.indentId?.indentNo || `PO-${po._id.slice(-4).toUpperCase()}`}
// // // // // //                       </div>
// // // // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
// // // // // //                         {new Date(po.receivedAt).toLocaleDateString()}
// // // // // //                       </div>
// // // // // //                     </div>
// // // // // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
// // // // // //                       ₹{po.totalAmount?.toLocaleString()} • {po.items?.length || 0} Items
// // // // // //                     </div>
// // // // // //                   </div>
// // // // // //                 ))}
// // // // // //               </div>
// // // // // //             </div>

// // // // // //             {/* Details Area */}
// // // // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // //               {activePO ? (
// // // // // //                 <>
// // // // // //                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
// // // // // //                     <div>
// // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>ORDER RECEIVED</div>
// // // // // //                       <div style={{ fontSize: '18px', fontWeight: '800' }}>{new Date(activePO.receivedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
// // // // // //                     </div>
// // // // // //                     <div style={{ textAlign: 'right' }}>
// // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
// // // // // //                       <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activePO.totalAmount?.toLocaleString()}</div>
// // // // // //                     </div>
// // // // // //                   </div>
// // // // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // //                       <thead>
// // // // // //                         <tr style={{ textAlign: 'left' }}>
// // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>PRODUCT</th>
// // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
// // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// // // // // //                         </tr>
// // // // // //                       </thead>
// // // // // //                       <tbody>
// // // // // //                         {activePO.items.map((item, idx) => (
// // // // // //                           <tr key={idx}>
// // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getStockName(item.stockItemId)}</div>
// // // // // //                               <div style={{ fontSize: '11px', color: '#94a3b8' }}>Rate: ₹{item.unitPrice}</div>
// // // // // //                             </td>
// // // // // //                             <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700' }}>{item.receivedQty}</td>
// // // // // //                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>₹{item.amount?.toLocaleString()}</td>
// // // // // //                           </tr>
// // // // // //                         ))}
// // // // // //                       </tbody>
// // // // // //                     </table>
// // // // // //                   </div>
// // // // // //                 </>
// // // // // //               ) : (
// // // // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No records selected</div>
// // // // // //               )}
// // // // // //             </div>
// // // // // //           </>
// // // // // //         ) : (
// // // // // //           /* Intake Creation Area */
// // // // // //           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
// // // // // //             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '24px', alignItems: 'center' }}>
// // // // // //               <div style={{ flex: 1 }}>
// // // // // //                 <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '8px' }}>SELECT PENDING INDENT</label>
// // // // // //                 <select 
// // // // // //                   value={selectedIndentId} 
// // // // // //                   onChange={(e) => setSelectedIndentId(e.target.value)}
// // // // // //                   style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: '700', outline: 'none' }}>
// // // // // //                   <option value="">Choose an indent to process...</option>
// // // // // //                   {indents.map(i => (
// // // // // //                     <option key={i._id} value={i._id}>{i.indentNo} — ₹{i.totalAmount?.toLocaleString()}</option>
// // // // // //                   ))}
// // // // // //                 </select>
// // // // // //               </div>
// // // // // //               <div style={{ textAlign: 'right' }}>
// // // // // //                 <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>INTAKE TOTAL</div>
// // // // // //                 <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{editableItems.reduce((sum, it) => sum + it.receivedQty * it.unitPrice, 0).toLocaleString()}</div>
// // // // // //               </div>
// // // // // //             </div>

// // // // // //             <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px' }}>
// // // // // //               {editableItems.length > 0 ? (
// // // // // //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // //                   <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
// // // // // //                     <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // //                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8' }}>ITEM DESCRIPTION</th>
// // // // // //                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>REQ. QTY</th>
// // // // // //                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'center', width: '150px' }}>REC. QTY</th>
// // // // // //                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>VALUATION</th>
// // // // // //                     </tr>
// // // // // //                   </thead>
// // // // // //                   <tbody>
// // // // // //                     {editableItems.map((item, idx) => (
// // // // // //                       <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
// // // // // //                         <td style={{ padding: '20px 0' }}>
// // // // // //                           <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.name}</div>
// // // // // //                           <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
// // // // // //                         </td>
// // // // // //                         <td style={{ textAlign: 'center', color: '#64748b', fontWeight: '600' }}>{item.orderedQty}</td>
// // // // // //                         <td style={{ textAlign: 'center' }}>
// // // // // //                           <input 
// // // // // //                             type="number"
// // // // // //                             value={item.receivedQty}
// // // // // //                             onChange={(e) => {
// // // // // //                               const newItems = [...editableItems];
// // // // // //                               newItems[idx].receivedQty = Number(e.target.value);
// // // // // //                               setEditableItems(newItems);
// // // // // //                             }}
// // // // // //                             style={{ width: '80px', padding: '8px', borderRadius: '8px', border: '2px solid #f1f5f9', textAlign: 'center', fontWeight: '800', color: '#6366f1' }}
// // // // // //                           />
// // // // // //                         </td>
// // // // // //                         <td style={{ textAlign: 'right', fontWeight: '800' }}>₹{(item.receivedQty * item.unitPrice).toLocaleString()}</td>
// // // // // //                       </tr>
// // // // // //                     ))}
// // // // // //                   </tbody>
// // // // // //                 </table>
// // // // // //               ) : (
// // // // // //                 <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>
// // // // // //                   Please select a pending indent from the dropdown above
// // // // // //                 </div>
// // // // // //               )}
// // // // // //             </div>

// // // // // //             {editableItems.length > 0 && (
// // // // // //               <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // // // // //                 <button
// // // // // //                   onClick={createPO}
// // // // // //                   disabled={loading}
// // // // // //                   style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' }}>
// // // // // //                   <CheckCircle2 size={18}/> {loading ? "Updating Stock..." : "Confirm Intake & Update Stock"}
// // // // // //                 </button>
// // // // // //               </div>
// // // // // //             )}
// // // // // //           </div>
// // // // // //         )}
// // // // // //       </div>
// // // // // //     </div>
// // // // // //   );
// // // // // // };
















// // // // // // good














// // // // // import { useEffect, useState, useMemo, useCallback } from "react";
// // // // // import { api } from "../api.js";
// // // // // import { useToast } from "../toast.jsx";
// // // // // import { Search, CheckCircle2, Eye, PackageCheck, History, Download } from "lucide-react";
// // // // // import * as XLSX from "xlsx";

// // // // // export const PurchaseOrdersPage = () => {
// // // // //   const { showToast } = useToast();
// // // // //   const [view, setView] = useState("history"); // 'history' or 'create'
// // // // //   const [searchTerm, setSearchTerm] = useState("");
  
// // // // //   const [indents, setIndents] = useState([]);
// // // // //   const [purchaseOrders, setPurchaseOrders] = useState([]);
// // // // //   const [stockItems, setStockItems] = useState([]);
// // // // //   const [selectedIndentId, setSelectedIndentId] = useState("");
// // // // //   const [editableItems, setEditableItems] = useState([]);
// // // // //   const [loading, setLoading] = useState(false);
// // // // //   const [selectedPoId, setSelectedPoId] = useState(null);

// // // // //   const load = useCallback(async () => {
// // // // //     setLoading(true);
// // // // //     try {
// // // // //       const [indRes, poRes, stockRes] = await Promise.all([
// // // // //         api.get("/purchase-orders/purchased-indents"),
// // // // //         api.get("/purchase-orders"),
// // // // //         api.get("/inventory/stock-items"),
// // // // //       ]);

// // // // //       const sortedPOs = (poRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // //       setIndents(indRes.data || []);
// // // // //       setStockItems(stockRes.data || []);
// // // // //       setPurchaseOrders(sortedPOs);
      
// // // // //       if (sortedPOs.length > 0 && !selectedPoId) {
// // // // //         setSelectedPoId(sortedPOs[0]._id);
// // // // //       }
// // // // //     } catch (error) {
// // // // //       showToast("Failed to load records", "error");
// // // // //     } finally {
// // // // //       setLoading(false);
// // // // //     }
// // // // //   }, [showToast, selectedPoId]);

// // // // //   useEffect(() => { load(); }, [load]);

// // // // //   const getStockName = useCallback((id) => {
// // // // //     const item = stockItems.find(s => s._id === id);
// // // // //     return item ? item.name : "Unknown Item";
// // // // //   }, [stockItems]);

// // // // //   // Filters
// // // // //   const filteredPOs = useMemo(() => {
// // // // //     return purchaseOrders.filter(po => 
// // // // //       (po.indentId?.indentNo || "").toLowerCase().includes(searchTerm.toLowerCase())
// // // // //     );
// // // // //   }, [purchaseOrders, searchTerm]);

// // // // //   const activePO = useMemo(() => 
// // // // //     purchaseOrders.find(p => p._id === selectedPoId), 
// // // // //   [selectedPoId, purchaseOrders]);

// // // // //   // Excel Export Logic
// // // // //   const downloadExcel = () => {
// // // // //     if (!activePO) return;

// // // // //     const excelData = activePO.items.map((item) => ({
// // // // //       "Order Date": new Date(activePO.receivedAt).toLocaleDateString(),
// // // // //       "Indent No": activePO.indentId?.indentNo || "N/A",
// // // // //       "Product Name": getStockName(item.stockItemId),
// // // // //       "Unit Price": item.unitPrice,
// // // // //       "Received Qty": item.receivedQty,
// // // // //       "Subtotal": item.amount,
// // // // //     }));

// // // // //     const worksheet = XLSX.utils.json_to_sheet(excelData);
// // // // //     const workbook = XLSX.utils.book_new();
// // // // //     XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Order");
// // // // //     XLSX.writeFile(workbook, `PO_${activePO.indentId?.indentNo || activePO._id}.xlsx`);
// // // // //   };

// // // // //   // Handle Indent Selection for new PO
// // // // //   useEffect(() => {
// // // // //     if (selectedIndentId) {
// // // // //       const indent = indents.find((i) => i._id === selectedIndentId);
// // // // //       if (indent?.items) {
// // // // //         setEditableItems(indent.items.map((it) => ({
// // // // //           stockItemId: it.stockItemId?._id || it.stockItemId,
// // // // //           name: it.stockItemId?.name || it.name || getStockName(it.stockItemId?._id || it.stockItemId),
// // // // //           orderedQty: Number(it.orderedQty || 0),
// // // // //           receivedQty: Number(it.orderedQty || 0),
// // // // //           unitPrice: Number(it.unitPrice || 0),
// // // // //         })));
// // // // //       }
// // // // //     } else {
// // // // //       setEditableItems([]);
// // // // //     }
// // // // //   }, [selectedIndentId, indents, getStockName]);

// // // // //   const createPO = async () => {
// // // // //     if (!selectedIndentId) return showToast("Select an indent", "info");
// // // // //     try {
// // // // //       setLoading(true);
// // // // //       const totalAmount = editableItems.reduce((sum, it) => sum + it.receivedQty * it.unitPrice, 0);
// // // // //       const payload = {
// // // // //         indentId: selectedIndentId,
// // // // //         items: editableItems.map((it) => ({ ...it, amount: it.receivedQty * it.unitPrice })),
// // // // //         totalAmount,
// // // // //         receivedAt: new Date().toISOString(),
// // // // //       };
// // // // //       await api.post("/purchase-orders", payload);
// // // // //       showToast("Inventory intake confirmed!", "success");
// // // // //       setSelectedIndentId("");
// // // // //       setView("history");
// // // // //       load();
// // // // //     } catch (e) {
// // // // //       showToast("Error creating PO", "error");
// // // // //     } finally {
// // // // //       setLoading(false);
// // // // //     }
// // // // //   };

// // // // //   return (
// // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // //       {/* Header */}
// // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
// // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // // //             Purchase <span style={{ color: '#6366f1' }}>Orders</span>
// // // // //           </h1>
// // // // //           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
// // // // //             <button
// // // // //               onClick={() => setView("history")}
// // // // //               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'history' ? '#fff' : 'transparent', color: view === 'history' ? '#6366f1' : '#64748b', boxShadow: view === 'history' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
// // // // //               <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><History size={14}/> History</div>
// // // // //             </button>
// // // // //             <button
// // // // //               onClick={() => setView("create")}
// // // // //               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'create' ? '#fff' : 'transparent', color: view === 'create' ? '#6366f1' : '#64748b', boxShadow: view === 'create' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
// // // // //               <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><PackageCheck size={14}/> Intake</div>
// // // // //             </button>
// // // // //           </div>
// // // // //         </div>

// // // // //         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // //           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // //           <input
// // // // //             type="text"
// // // // //             placeholder="Search POs..."
// // // // //             value={searchTerm}
// // // // //             onChange={(e) => setSearchTerm(e.target.value)}
// // // // //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
// // // // //           />
// // // // //         </div>
// // // // //       </div>

// // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // //         {view === "history" ? (
// // // // //           <>
// // // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px' }}>COMPLETED ORDERS ({filteredPOs.length})</div>
// // // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // //                 {filteredPOs.map(po => (
// // // // //                   <div
// // // // //                     key={po._id}
// // // // //                     onClick={() => setSelectedPoId(po._id)}
// // // // //                     style={{
// // // // //                       padding: '16px', borderRadius: '16px', cursor: 'pointer',
// // // // //                       background: selectedPoId === po._id ? '#fff' : 'transparent',
// // // // //                       border: selectedPoId === po._id ? '1px solid #6366f1' : '1px solid transparent',
// // // // //                       boxShadow: selectedPoId === po._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// // // // //                     }}
// // // // //                   >
// // // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // //                       <div style={{ fontWeight: '700', color: selectedPoId === po._id ? '#6366f1' : '#1e293b' }}>
// // // // //                         {po.indentId?.indentNo || `PO-${po._id.slice(-4).toUpperCase()}`}
// // // // //                       </div>
// // // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
// // // // //                         {new Date(po.receivedAt).toLocaleDateString()}
// // // // //                       </div>
// // // // //                     </div>
// // // // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
// // // // //                       ₹{po.totalAmount?.toLocaleString()} • {po.items?.length || 0} Items
// // // // //                     </div>
// // // // //                   </div>
// // // // //                 ))}
// // // // //               </div>
// // // // //             </div>

// // // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // //               {activePO ? (
// // // // //                 <>
// // // // //                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // //                     <div>
// // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>ORDER RECEIVED</div>
// // // // //                       <div style={{ fontSize: '18px', fontWeight: '800' }}>{new Date(activePO.receivedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
// // // // //                     </div>

// // // // //                     <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
// // // // //                       <button 
// // // // //                         onClick={downloadExcel}
// // // // //                         style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}
// // // // //                       >
// // // // //                         <Download size={16}/> Export Excel (.xlsx)
// // // // //                       </button>

// // // // //                       <div style={{ textAlign: 'right' }}>
// // // // //                         <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
// // // // //                         <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activePO.totalAmount?.toLocaleString()}</div>
// // // // //                       </div>
// // // // //                     </div>
// // // // //                   </div>
// // // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // //                       <thead>
// // // // //                         <tr style={{ textAlign: 'left' }}>
// // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>PRODUCT</th>
// // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
// // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// // // // //                         </tr>
// // // // //                       </thead>
// // // // //                       <tbody>
// // // // //                         {activePO.items.map((item, idx) => (
// // // // //                           <tr key={idx}>
// // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getStockName(item.stockItemId)}</div>
// // // // //                               <div style={{ fontSize: '11px', color: '#94a3b8' }}>Rate: ₹{item.unitPrice}</div>
// // // // //                             </td>
// // // // //                             <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700' }}>{item.receivedQty}</td>
// // // // //                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>₹{item.amount?.toLocaleString()}</td>
// // // // //                           </tr>
// // // // //                         ))}
// // // // //                       </tbody>
// // // // //                     </table>
// // // // //                   </div>
// // // // //                 </>
// // // // //               ) : (
// // // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No records selected</div>
// // // // //               )}
// // // // //             </div>
// // // // //           </>
// // // // //         ) : (
// // // // //           /* Intake Creation Area */
// // // // //           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
// // // // //             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '24px', alignItems: 'center' }}>
// // // // //               <div style={{ flex: 1 }}>
// // // // //                 <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '8px' }}>SELECT PENDING INDENT</label>
// // // // //                 <select 
// // // // //                   value={selectedIndentId} 
// // // // //                   onChange={(e) => setSelectedIndentId(e.target.value)}
// // // // //                   style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: '700', outline: 'none' }}>
// // // // //                   <option value="">Choose an indent to process...</option>
// // // // //                   {indents.map(i => (
// // // // //                     <option key={i._id} value={i._id}>{i.indentNo} — ₹{i.totalAmount?.toLocaleString()}</option>
// // // // //                   ))}
// // // // //                 </select>
// // // // //               </div>
// // // // //               <div style={{ textAlign: 'right' }}>
// // // // //                 <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>INTAKE TOTAL</div>
// // // // //                 <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{editableItems.reduce((sum, it) => sum + it.receivedQty * it.unitPrice, 0).toLocaleString()}</div>
// // // // //               </div>
// // // // //             </div>

// // // // //             <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px' }}>
// // // // //               {editableItems.length > 0 ? (
// // // // //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // //                   <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
// // // // //                     <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // //                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8' }}>ITEM DESCRIPTION</th>
// // // // //                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>REQ. QTY</th>
// // // // //                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'center', width: '150px' }}>REC. QTY</th>
// // // // //                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>VALUATION</th>
// // // // //                     </tr>
// // // // //                   </thead>
// // // // //                   <tbody>
// // // // //                     {editableItems.map((item, idx) => (
// // // // //                       <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
// // // // //                         <td style={{ padding: '20px 0' }}>
// // // // //                           <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.name}</div>
// // // // //                           <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
// // // // //                         </td>
// // // // //                         <td style={{ textAlign: 'center', color: '#64748b', fontWeight: '600' }}>{item.orderedQty}</td>
// // // // //                         <td style={{ textAlign: 'center' }}>
// // // // //                           <input 
// // // // //                             type="number"
// // // // //                             value={item.receivedQty}
// // // // //                             onChange={(e) => {
// // // // //                               const newItems = [...editableItems];
// // // // //                               newItems[idx].receivedQty = Number(e.target.value);
// // // // //                               setEditableItems(newItems);
// // // // //                             }}
// // // // //                             style={{ width: '80px', padding: '8px', borderRadius: '8px', border: '2px solid #f1f5f9', textAlign: 'center', fontWeight: '800', color: '#6366f1' }}
// // // // //                           />
// // // // //                         </td>
// // // // //                         <td style={{ textAlign: 'right', fontWeight: '800' }}>₹{(item.receivedQty * item.unitPrice).toLocaleString()}</td>
// // // // //                       </tr>
// // // // //                     ))}
// // // // //                   </tbody>
// // // // //                 </table>
// // // // //               ) : (
// // // // //                 <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>
// // // // //                   Please select a pending indent from the dropdown above
// // // // //                 </div>
// // // // //               )}
// // // // //             </div>

// // // // //             {editableItems.length > 0 && (
// // // // //               <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // // // //                 <button
// // // // //                   onClick={createPO}
// // // // //                   disabled={loading}
// // // // //                   style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' }}>
// // // // //                   <CheckCircle2 size={18}/> {loading ? "Updating Stock..." : "Confirm Intake & Update Stock"}
// // // // //                 </button>
// // // // //               </div>
// // // // //             )}
// // // // //           </div>
// // // // //         )}
// // // // //       </div>
// // // // //     </div>
// // // // //   );
// // // // // };





















// // // // import { useEffect, useState, useMemo, useCallback } from "react";
// // // // import { api } from "../api.js";
// // // // import { useToast } from "../toast.jsx";
// // // // import { Search, CheckCircle2, Eye, PackageCheck, History, Download } from "lucide-react";
// // // // import * as XLSX from "xlsx";

// // // // export const PurchaseOrdersPage = () => {
// // // //   const { showToast } = useToast();
// // // //   const [view, setView] = useState("history"); // 'history' or 'create'
// // // //   const [searchTerm, setSearchTerm] = useState("");
  
// // // //   const [indents, setIndents] = useState([]);
// // // //   const [purchaseOrders, setPurchaseOrders] = useState([]);
// // // //   const [stockItems, setStockItems] = useState([]);
// // // //   const [selectedIndentId, setSelectedIndentId] = useState("");
// // // //   const [editableItems, setEditableItems] = useState([]);
// // // //   const [loading, setLoading] = useState(false);
// // // //   const [selectedPoId, setSelectedPoId] = useState(null);

// // // //   const load = useCallback(async () => {
// // // //     setLoading(true);
// // // //     try {
// // // //       const [indRes, poRes, stockRes] = await Promise.all([
// // // //         api.get("/purchase-orders/purchased-indents"),
// // // //         api.get("/purchase-orders"),
// // // //         api.get("/inventory/stock-items"),
// // // //       ]);

// // // //       const sortedPOs = (poRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // //       setIndents(indRes.data || []);
// // // //       setStockItems(stockRes.data || []);
// // // //       setPurchaseOrders(sortedPOs);
      
// // // //       if (sortedPOs.length > 0 && !selectedPoId) {
// // // //         setSelectedPoId(sortedPOs[0]._id);
// // // //       }
// // // //     } catch (error) {
// // // //       showToast("Failed to load records", "error");
// // // //     } finally {
// // // //       setLoading(false);
// // // //     }
// // // //   }, [showToast, selectedPoId]);

// // // //   useEffect(() => { load(); }, [load]);

// // // //   const getStockName = useCallback((id) => {
// // // //     const item = stockItems.find(s => s._id === id);
// // // //     return item ? item.name : "Unknown Item";
// // // //   }, [stockItems]);

// // // //   const filteredPOs = useMemo(() => {
// // // //     return purchaseOrders.filter(po => 
// // // //       (po.indentId?.indentNo || "").toLowerCase().includes(searchTerm.toLowerCase())
// // // //     );
// // // //   }, [purchaseOrders, searchTerm]);

// // // //   const activePO = useMemo(() => 
// // // //     purchaseOrders.find(p => p._id === selectedPoId), 
// // // //   [selectedPoId, purchaseOrders]);

// // // //   const downloadExcel = () => {
// // // //     if (!activePO) return;

// // // //     const excelData = activePO.items.map((item) => ({
// // // //       "Order Date": new Date(activePO.receivedAt).toLocaleDateString(),
// // // //       "Indent No": activePO.indentId?.indentNo || "N/A",
// // // //       "Product Name": getStockName(item.stockItemId),
// // // //       "Unit Price": item.unitPrice,
// // // //       "Received Qty": item.receivedQty,
// // // //       "Subtotal": item.amount,
// // // //     }));

// // // //     const worksheet = XLSX.utils.json_to_sheet(excelData);
// // // //     const workbook = XLSX.utils.book_new();
// // // //     XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Order");
// // // //     XLSX.writeFile(workbook, `PO_${activePO.indentId?.indentNo || activePO._id}.xlsx`);
// // // //   };

// // // //   useEffect(() => {
// // // //     if (selectedIndentId) {
// // // //       const indent = indents.find((i) => i._id === selectedIndentId);
// // // //       if (indent?.items) {
// // // //         setEditableItems(indent.items.map((it) => ({
// // // //           stockItemId: it.stockItemId?._id || it.stockItemId,
// // // //           name: it.stockItemId?.name || it.name || getStockName(it.stockItemId?._id || it.stockItemId),
// // // //           orderedQty: Number(it.orderedQty || 0),
// // // //           receivedQty: Number(it.orderedQty || 0),
// // // //           unitPrice: Number(it.unitPrice || 0),
// // // //         })));
// // // //       }
// // // //     } else {
// // // //       setEditableItems([]);
// // // //     }
// // // //   }, [selectedIndentId, indents, getStockName]);

// // // //   const createPO = async () => {
// // // //     if (!selectedIndentId) return showToast("Select an indent", "info");
// // // //     try {
// // // //       setLoading(true);
// // // //       const totalAmount = editableItems.reduce((sum, it) => sum + it.receivedQty * it.unitPrice, 0);
// // // //       const payload = {
// // // //         indentId: selectedIndentId,
// // // //         items: editableItems.map((it) => ({ ...it, amount: it.receivedQty * it.unitPrice })),
// // // //         totalAmount,
// // // //         receivedAt: new Date().toISOString(),
// // // //       };
// // // //       await api.post("/purchase-orders", payload);
// // // //       showToast("Inventory intake confirmed!", "success");
// // // //       setSelectedIndentId("");
// // // //       setView("history");
// // // //       load();
// // // //     } catch (e) {
// // // //       showToast("Error creating PO", "error");
// // // //     } finally {
// // // //       setLoading(false);
// // // //     }
// // // //   };

// // // //   return (
// // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // //       {/* Header */}
// // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
// // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // //             Purchase <span style={{ color: '#6366f1' }}>Orders</span>
// // // //           </h1>
// // // //           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
// // // //             <button
// // // //               onClick={() => setView("history")}
// // // //               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'history' ? '#fff' : 'transparent', color: view === 'history' ? '#6366f1' : '#64748b', boxShadow: view === 'history' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
// // // //               <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><History size={14}/> History</div>
// // // //             </button>
// // // //             <button
// // // //               onClick={() => setView("create")}
// // // //               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'create' ? '#fff' : 'transparent', color: view === 'create' ? '#6366f1' : '#64748b', boxShadow: view === 'create' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
// // // //               <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><PackageCheck size={14}/> Intake</div>
// // // //             </button>
// // // //           </div>
// // // //         </div>

// // // //         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // //           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // //           <input
// // // //             type="text"
// // // //             placeholder="Search POs..."
// // // //             value={searchTerm}
// // // //             onChange={(e) => setSearchTerm(e.target.value)}
// // // //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
// // // //           />
// // // //         </div>
// // // //       </div>

// // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // //         {view === "history" ? (
// // // //           <>
// // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px' }}>COMPLETED ORDERS ({filteredPOs.length})</div>
// // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // //                 {filteredPOs.map(po => (
// // // //                   <div
// // // //                     key={po._id}
// // // //                     onClick={() => setSelectedPoId(po._id)}
// // // //                     style={{
// // // //                       padding: '16px', borderRadius: '16px', cursor: 'pointer',
// // // //                       background: selectedPoId === po._id ? '#fff' : 'transparent',
// // // //                       border: selectedPoId === po._id ? '1px solid #6366f1' : '1px solid transparent',
// // // //                       boxShadow: selectedPoId === po._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// // // //                     }}
// // // //                   >
// // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // //                       <div style={{ fontWeight: '700', color: selectedPoId === po._id ? '#6366f1' : '#1e293b' }}>
// // // //                         {po.indentId?.indentNo || `PO-${po._id.slice(-4).toUpperCase()}`}
// // // //                       </div>
// // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
// // // //                         {new Date(po.receivedAt).toLocaleDateString()}
// // // //                       </div>
// // // //                     </div>
// // // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
// // // //                       ₹{po.totalAmount?.toLocaleString()} • {po.items?.length || 0} Items
// // // //                     </div>
// // // //                   </div>
// // // //                 ))}
// // // //               </div>
// // // //             </div>

// // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // //               {activePO ? (
// // // //                 <>
// // // //                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // //                     <div>
// // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>ORDER RECEIVED</div>
// // // //                       <div style={{ fontSize: '18px', fontWeight: '800' }}>{new Date(activePO.receivedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
// // // //                     </div>
// // // //                     <div style={{ textAlign: 'right' }}>
// // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
// // // //                       <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activePO.totalAmount?.toLocaleString()}</div>
// // // //                     </div>
// // // //                   </div>

// // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // //                       <thead>
// // // //                         <tr style={{ textAlign: 'left' }}>
// // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>PRODUCT</th>
// // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
// // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// // // //                         </tr>
// // // //                       </thead>
// // // //                       <tbody>
// // // //                         {activePO.items.map((item, idx) => (
// // // //                           <tr key={idx}>
// // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getStockName(item.stockItemId)}</div>
// // // //                               <div style={{ fontSize: '11px', color: '#94a3b8' }}>Rate: ₹{item.unitPrice}</div>
// // // //                             </td>
// // // //                             <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700' }}>{item.receivedQty}</td>
// // // //                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>₹{item.amount?.toLocaleString()}</td>
// // // //                           </tr>
// // // //                         ))}
// // // //                       </tbody>
// // // //                     </table>
// // // //                   </div>

// // // //                   {/* Footer Action Area for History View */}
// // // //                   <div style={{ padding: '24px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // // //                     <button 
// // // //                       onClick={downloadExcel}
// // // //                       style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '13px', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2)' }}
// // // //                     >
// // // //                       <Download size={18}/> Export Excel (.xlsx)
// // // //                     </button>
// // // //                   </div>
// // // //                 </>
// // // //               ) : (
// // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No records selected</div>
// // // //               )}
// // // //             </div>
// // // //           </>
// // // //         ) : (
// // // //           /* Intake Creation Area */
// // // //           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
// // // //             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '24px', alignItems: 'center' }}>
// // // //               <div style={{ flex: 1 }}>
// // // //                 <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '8px' }}>SELECT PENDING INDENT</label>
// // // //                 <select 
// // // //                   value={selectedIndentId} 
// // // //                   onChange={(e) => setSelectedIndentId(e.target.value)}
// // // //                   style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: '700', outline: 'none' }}>
// // // //                   <option value="">Choose an indent to process...</option>
// // // //                   {indents.map(i => (
// // // //                     <option key={i._id} value={i._id}>{i.indentNo} — ₹{i.totalAmount?.toLocaleString()}</option>
// // // //                   ))}
// // // //                 </select>
// // // //               </div>
// // // //               <div style={{ textAlign: 'right' }}>
// // // //                 <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>INTAKE TOTAL</div>
// // // //                 <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{editableItems.reduce((sum, it) => sum + it.receivedQty * it.unitPrice, 0).toLocaleString()}</div>
// // // //               </div>
// // // //             </div>

// // // //             <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px' }}>
// // // //               {editableItems.length > 0 ? (
// // // //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // //                   <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
// // // //                     <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // //                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8' }}>ITEM DESCRIPTION</th>
// // // //                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>REQ. QTY</th>
// // // //                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'center', width: '150px' }}>REC. QTY</th>
// // // //                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>VALUATION</th>
// // // //                     </tr>
// // // //                   </thead>
// // // //                   <tbody>
// // // //                     {editableItems.map((item, idx) => (
// // // //                       <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
// // // //                         <td style={{ padding: '20px 0' }}>
// // // //                           <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.name}</div>
// // // //                           <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
// // // //                         </td>
// // // //                         <td style={{ textAlign: 'center', color: '#64748b', fontWeight: '600' }}>{item.orderedQty}</td>
// // // //                         <td style={{ textAlign: 'center' }}>
// // // //                           <input 
// // // //                             type="number"
// // // //                             value={item.receivedQty}
// // // //                             onChange={(e) => {
// // // //                               const newItems = [...editableItems];
// // // //                               newItems[idx].receivedQty = Number(e.target.value);
// // // //                               setEditableItems(newItems);
// // // //                             }}
// // // //                             style={{ width: '80px', padding: '8px', borderRadius: '8px', border: '2px solid #f1f5f9', textAlign: 'center', fontWeight: '800', color: '#6366f1' }}
// // // //                           />
// // // //                         </td>
// // // //                         <td style={{ textAlign: 'right', fontWeight: '800' }}>₹{(item.receivedQty * item.unitPrice).toLocaleString()}</td>
// // // //                       </tr>
// // // //                     ))}
// // // //                   </tbody>
// // // //                 </table>
// // // //               ) : (
// // // //                 <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>
// // // //                   Please select a pending indent from the dropdown above
// // // //                 </div>
// // // //               )}
// // // //             </div>

// // // //             {editableItems.length > 0 && (
// // // //               <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // // //                 <button
// // // //                   onClick={createPO}
// // // //                   disabled={loading}
// // // //                   style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' }}>
// // // //                   <CheckCircle2 size={18}/> {loading ? "Updating Stock..." : "Confirm Intake & Update Stock"}
// // // //                 </button>
// // // //               </div>
// // // //             )}
// // // //           </div>
// // // //         )}
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // };










// // // import { useEffect, useState, useMemo, useCallback } from "react";
// // // import { api } from "../api.js";
// // // import { useToast } from "../toast.jsx";
// // // import { Search, CheckCircle2, PackageCheck, History, Download } from "lucide-react";
// // // import * as XLSX from "xlsx";

// // // export const PurchaseOrdersPage = () => {
// // //   const { showToast } = useToast();
// // //   const [view, setView] = useState("history"); // 'history' or 'create'
// // //   const [searchTerm, setSearchTerm] = useState("");
  
// // //   const [indents, setIndents] = useState([]);
// // //   const [purchaseOrders, setPurchaseOrders] = useState([]);
// // //   const [stockItems, setStockItems] = useState([]);
// // //   const [selectedIndentId, setSelectedIndentId] = useState("");
// // //   const [editableItems, setEditableItems] = useState([]);
// // //   const [loading, setLoading] = useState(false);
// // //   const [selectedPoId, setSelectedPoId] = useState(null);

// // //   const load = useCallback(async () => {
// // //     setLoading(true);
// // //     try {
// // //       const [indRes, poRes, stockRes] = await Promise.all([
// // //         api.get("/purchase-orders/purchased-indents"),
// // //         api.get("/purchase-orders"),
// // //         api.get("/inventory/stock-items"),
// // //       ]);

// // //       const sortedPOs = (poRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // //       setIndents(indRes.data || []);
// // //       setStockItems(stockRes.data || []);
// // //       setPurchaseOrders(sortedPOs);
      
// // //       if (sortedPOs.length > 0 && !selectedPoId) {
// // //         setSelectedPoId(sortedPOs[0]._id);
// // //       }
// // //     } catch (error) {
// // //       showToast("Failed to load records", "error");
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   }, [showToast, selectedPoId]);

// // //   useEffect(() => { load(); }, [load]);

// // //   // Helper to get Stock Details (Name and Unit)
// // //   const getStockDetails = useCallback((id) => {
// // //     const item = stockItems.find(s => s._id === id);
// // //     return {
// // //       name: item ? item.name : "Unknown Item",
// // //       unit: item ? (item.unit || "units") : ""
// // //     };
// // //   }, [stockItems]);

// // //   const filteredPOs = useMemo(() => {
// // //     return purchaseOrders.filter(po => 
// // //       (po.indentId?.indentNo || "").toLowerCase().includes(searchTerm.toLowerCase())
// // //     );
// // //   }, [purchaseOrders, searchTerm]);

// // //   const activePO = useMemo(() => 
// // //     purchaseOrders.find(p => p._id === selectedPoId), 
// // //   [selectedPoId, purchaseOrders]);

// // //   const downloadExcel = () => {
// // //     if (!activePO) return;

// // //     const excelData = activePO.items.map((item) => {
// // //       const details = getStockDetails(item.stockItemId);
// // //       return {
// // //         "Order Date": new Date(activePO.receivedAt).toLocaleDateString(),
// // //         "Indent No": activePO.indentId?.indentNo || "N/A",
// // //         "Product Name": details.name,
// // //         "Unit": details.unit,
// // //         "Unit Price": item.unitPrice,
// // //         "Received Qty": item.receivedQty,
// // //         "Subtotal": item.amount,
// // //       };
// // //     });

// // //     const worksheet = XLSX.utils.json_to_sheet(excelData);
// // //     const workbook = XLSX.utils.book_new();
// // //     XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Order");
// // //     XLSX.writeFile(workbook, `PO_${activePO.indentId?.indentNo || activePO._id}.xlsx`);
// // //   };

// // //   useEffect(() => {
// // //     if (selectedIndentId) {
// // //       const indent = indents.find((i) => i._id === selectedIndentId);
// // //       if (indent?.items) {
// // //         setEditableItems(indent.items.map((it) => {
// // //           const sId = it.stockItemId?._id || it.stockItemId;
// // //           const details = getStockDetails(sId);
// // //           return {
// // //             stockItemId: sId,
// // //             name: details.name,
// // //             unit: details.unit,
// // //             orderedQty: Number(it.orderedQty || 0),
// // //             receivedQty: Number(it.orderedQty || 0),
// // //             unitPrice: Number(it.unitPrice || 0),
// // //           };
// // //         }));
// // //       }
// // //     } else {
// // //       setEditableItems([]);
// // //     }
// // //   }, [selectedIndentId, indents, getStockDetails]);

// // //   const createPO = async () => {
// // //     if (!selectedIndentId) return showToast("Select an indent", "info");
// // //     try {
// // //       setLoading(true);
// // //       const totalAmount = editableItems.reduce((sum, it) => sum + it.receivedQty * it.unitPrice, 0);
// // //       const payload = {
// // //         indentId: selectedIndentId,
// // //         items: editableItems.map((it) => ({ ...it, amount: it.receivedQty * it.unitPrice })),
// // //         totalAmount,
// // //         receivedAt: new Date().toISOString(),
// // //       };
// // //       await api.post("/purchase-orders", payload);
// // //       showToast("Inventory intake confirmed!", "success");
// // //       setSelectedIndentId("");
// // //       setView("history");
// // //       load();
// // //     } catch (e) {
// // //       showToast("Error creating PO", "error");
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   };

// // //   return (
// // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // //       {/* Header */}
// // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // //         <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
// // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // //             Purchase <span style={{ color: '#6366f1' }}>Orders</span>
// // //           </h1>
// // //           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
// // //             <button
// // //               onClick={() => setView("history")}
// // //               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'history' ? '#fff' : 'transparent', color: view === 'history' ? '#6366f1' : '#64748b', boxShadow: view === 'history' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
// // //               <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><History size={14}/> History</div>
// // //             </button>
// // //             <button
// // //               onClick={() => setView("create")}
// // //               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'create' ? '#fff' : 'transparent', color: view === 'create' ? '#6366f1' : '#64748b', boxShadow: view === 'create' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
// // //               <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><PackageCheck size={14}/> Intake</div>
// // //             </button>
// // //           </div>
// // //         </div>

// // //         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // //           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // //           <input
// // //             type="text"
// // //             placeholder="Search POs..."
// // //             value={searchTerm}
// // //             onChange={(e) => setSearchTerm(e.target.value)}
// // //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
// // //           />
// // //         </div>
// // //       </div>

// // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // //         {view === "history" ? (
// // //           <>
// // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px' }}>COMPLETED ORDERS ({filteredPOs.length})</div>
// // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // //                 {filteredPOs.map(po => (
// // //                   <div
// // //                     key={po._id}
// // //                     onClick={() => setSelectedPoId(po._id)}
// // //                     style={{
// // //                       padding: '16px', borderRadius: '16px', cursor: 'pointer',
// // //                       background: selectedPoId === po._id ? '#fff' : 'transparent',
// // //                       border: selectedPoId === po._id ? '1px solid #6366f1' : '1px solid transparent',
// // //                       boxShadow: selectedPoId === po._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// // //                     }}
// // //                   >
// // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // //                       <div style={{ fontWeight: '700', color: selectedPoId === po._id ? '#6366f1' : '#1e293b' }}>
// // //                         {po.indentId?.indentNo || `PO-${po._id.slice(-4).toUpperCase()}`}
// // //                       </div>
// // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
// // //                         {new Date(po.receivedAt).toLocaleDateString()}
// // //                       </div>
// // //                     </div>
// // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
// // //                       ₹{po.totalAmount?.toLocaleString()} • {po.items?.length || 0} Items
// // //                     </div>
// // //                   </div>
// // //                 ))}
// // //               </div>
// // //             </div>

// // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // //               {activePO ? (
// // //                 <>
// // //                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // //                     <div>
// // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>ORDER RECEIVED</div>
// // //                       <div style={{ fontSize: '18px', fontWeight: '800' }}>{new Date(activePO.receivedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
// // //                     </div>
// // //                     <div style={{ textAlign: 'right' }}>
// // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
// // //                       <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activePO.totalAmount?.toLocaleString()}</div>
// // //                     </div>
// // //                   </div>

// // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // //                       <thead>
// // //                         <tr style={{ textAlign: 'left' }}>
// // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>PRODUCT</th>
// // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
// // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// // //                         </tr>
// // //                       </thead>
// // //                       <tbody>
// // //                         {activePO.items.map((item, idx) => {
// // //                           const details = getStockDetails(item.stockItemId);
// // //                           return (
// // //                             <tr key={idx}>
// // //                               <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // //                                 <div style={{ fontWeight: '700', color: '#1e293b' }}>{details.name}</div>
// // //                                 <div style={{ fontSize: '11px', color: '#94a3b8' }}>Rate: ₹{item.unitPrice} / {details.unit}</div>
// // //                               </td>
// // //                               <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700' }}>
// // //                                 {item.receivedQty} <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '400' }}>{details.unit}</span>
// // //                               </td>
// // //                               <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>₹{item.amount?.toLocaleString()}</td>
// // //                             </tr>
// // //                           );
// // //                         })}
// // //                       </tbody>
// // //                     </table>
// // //                   </div>

// // //                   <div style={{ padding: '24px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // //                     <button 
// // //                       onClick={downloadExcel}
// // //                       style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '13px', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2)' }}
// // //                     >
// // //                       <Download size={18}/> Export Excel (.xlsx)
// // //                     </button>
// // //                   </div>
// // //                 </>
// // //               ) : (
// // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No records selected</div>
// // //               )}
// // //             </div>
// // //           </>
// // //         ) : (
// // //           /* Intake Creation Area */
// // //           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
// // //             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '24px', alignItems: 'center' }}>
// // //               <div style={{ flex: 1 }}>
// // //                 <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '8px' }}>SELECT PENDING INDENT</label>
// // //                 <select 
// // //                   value={selectedIndentId} 
// // //                   onChange={(e) => setSelectedIndentId(e.target.value)}
// // //                   style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: '700', outline: 'none' }}>
// // //                   <option value="">Choose an indent to process...</option>
// // //                   {indents.map(i => (
// // //                     <option key={i._id} value={i._id}>{i.indentNo} — ₹{i.totalAmount?.toLocaleString()}</option>
// // //                   ))}
// // //                 </select>
// // //               </div>
// // //               <div style={{ textAlign: 'right' }}>
// // //                 <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>INTAKE TOTAL</div>
// // //                 <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{editableItems.reduce((sum, it) => sum + it.receivedQty * it.unitPrice, 0).toLocaleString()}</div>
// // //               </div>
// // //             </div>

// // //             <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px' }}>
// // //               {editableItems.length > 0 ? (
// // //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // //                   <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
// // //                     <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // //                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8' }}>ITEM DESCRIPTION</th>
// // //                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>REQ. QTY</th>
// // //                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'center', width: '180px' }}>REC. QTY</th>
// // //                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>VALUATION</th>
// // //                     </tr>
// // //                   </thead>
// // //                   <tbody>
// // //                     {editableItems.map((item, idx) => (
// // //                       <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
// // //                         <td style={{ padding: '20px 0' }}>
// // //                           <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.name}</div>
// // //                           <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice} / {item.unit}</div>
// // //                         </td>
// // //                         <td style={{ textAlign: 'center', color: '#64748b', fontWeight: '600' }}>
// // //                           {item.orderedQty} <span style={{ fontSize: '10px', fontWeight: '400' }}>{item.unit}</span>
// // //                         </td>
// // //                         <td style={{ textAlign: 'center' }}>
// // //                           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
// // //                             <input 
// // //                               type="number"
// // //                               value={item.receivedQty}
// // //                               onChange={(e) => {
// // //                                 const newItems = [...editableItems];
// // //                                 newItems[idx].receivedQty = Number(e.target.value);
// // //                                 setEditableItems(newItems);
// // //                               }}
// // //                               style={{ width: '80px', padding: '8px', borderRadius: '8px', border: '2px solid #f1f5f9', textAlign: 'center', fontWeight: '800', color: '#6366f1' }}
// // //                             />
// // //                             <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', width: '30px', textAlign: 'left' }}>{item.unit}</span>
// // //                           </div>
// // //                         </td>
// // //                         <td style={{ textAlign: 'right', fontWeight: '800' }}>₹{(item.receivedQty * item.unitPrice).toLocaleString()}</td>
// // //                       </tr>
// // //                     ))}
// // //                   </tbody>
// // //                 </table>
// // //               ) : (
// // //                 <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>
// // //                   Please select a pending indent from the dropdown above
// // //                 </div>
// // //               )}
// // //             </div>

// // //             {editableItems.length > 0 && (
// // //               <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // //                 <button
// // //                   onClick={createPO}
// // //                   disabled={loading}
// // //                   style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' }}>
// // //                   <CheckCircle2 size={18}/> {loading ? "Updating Stock..." : "Confirm Intake & Update Stock"}
// // //                 </button>
// // //               </div>
// // //             )}
// // //           </div>
// // //         )}
// // //       </div>
// // //     </div>
// // //   );
// // // };












// // import { useEffect, useState, useMemo, useCallback } from "react";
// // import { api } from "../api.js";
// // import { useToast } from "../toast.jsx";
// // import { Search, CheckCircle2, PackageCheck, History, Download } from "lucide-react";
// // import * as XLSX from "xlsx";

// // export const PurchaseOrdersPage = () => {
// //   const { showToast } = useToast();
// //   const [view, setView] = useState("history"); // 'history' or 'create'
// //   const [searchTerm, setSearchTerm] = useState("");
  
// //   const [indents, setIndents] = useState([]);
// //   const [purchaseOrders, setPurchaseOrders] = useState([]);
// //   const [stockItems, setStockItems] = useState([]);
// //   const [selectedIndentId, setSelectedIndentId] = useState("");
// //   const [editableItems, setEditableItems] = useState([]);
// //   const [loading, setLoading] = useState(false);
// //   const [selectedPoId, setSelectedPoId] = useState(null);

// //   const load = useCallback(async () => {
// //     setLoading(true);
// //     try {
// //       const [indRes, poRes, stockRes] = await Promise.all([
// //         api.get("/purchase-orders/purchased-indents"),
// //         api.get("/purchase-orders"),
// //         api.get("/inventory/stock-items"),
// //       ]);

// //       const sortedPOs = (poRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// //       setIndents(indRes.data || []);
// //       setStockItems(stockRes.data || []);
// //       setPurchaseOrders(sortedPOs);
      
// //       if (sortedPOs.length > 0 && !selectedPoId) {
// //         setSelectedPoId(sortedPOs[0]._id);
// //       }
// //     } catch (error) {
// //       showToast("Failed to load records", "error");
// //     } finally {
// //       setLoading(false);
// //     }
// //   }, [showToast, selectedPoId]);

// //   useEffect(() => { load(); }, [load]);

// //   // FIX: Robust helper to extract unit symbol regardless of population state
// //   const getStockDetails = useCallback((id) => {
// //     const item = stockItems.find(s => s._id === id);
// //     if (!item) return { name: "Unknown Item", unit: "units" };

// //     // Checks for populated unitId object first, then fallback to unit string
// //     const unitSymbol = item.unitId?.symbol || item.unit || "units";
    
// //     return {
// //       name: item.name,
// //       unit: unitSymbol
// //     };
// //   }, [stockItems]);

// //   const filteredPOs = useMemo(() => {
// //     return purchaseOrders.filter(po => 
// //       (po.indentId?.indentNo || "").toLowerCase().includes(searchTerm.toLowerCase())
// //     );
// //   }, [purchaseOrders, searchTerm]);

// //   const activePO = useMemo(() => 
// //     purchaseOrders.find(p => p._id === selectedPoId), 
// //   [selectedPoId, purchaseOrders]);

// //   const downloadExcel = () => {
// //     if (!activePO) return;

// //     const excelData = activePO.items.map((item) => {
// //       const details = getStockDetails(item.stockItemId?._id || item.stockItemId);
// //       return {
// //         "Order Date": new Date(activePO.receivedAt).toLocaleDateString(),
// //         "Indent No": activePO.indentId?.indentNo || "N/A",
// //         "Product Name": details.name,
// //         "Unit": details.unit,
// //         "Unit Price": item.unitPrice,
// //         "Received Qty": item.receivedQty,
// //         "Subtotal": item.amount,
// //       };
// //     });

// //     const worksheet = XLSX.utils.json_to_sheet(excelData);
// //     const workbook = XLSX.utils.book_new();
// //     XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Order");
// //     XLSX.writeFile(workbook, `PO_${activePO.indentId?.indentNo || activePO._id}.xlsx`);
// //   };

// //   // Sync editable items when an indent is selected for intake
// //   useEffect(() => {
// //     if (selectedIndentId) {
// //       const indent = indents.find((i) => i._id === selectedIndentId);
// //       if (indent?.items) {
// //         setEditableItems(indent.items.map((it) => {
// //           const sId = it.stockItemId?._id || it.stockItemId;
// //           const details = getStockDetails(sId);
// //           return {
// //             stockItemId: sId,
// //             name: details.name,
// //             unit: details.unit,
// //             orderedQty: Number(it.orderedQty || 0),
// //             receivedQty: Number(it.orderedQty || 0),
// //             unitPrice: Number(it.unitPrice || 0),
// //           };
// //         }));
// //       }
// //     } else {
// //       setEditableItems([]);
// //     }
// //   }, [selectedIndentId, indents, getStockDetails]);

// //   const createPO = async () => {
// //     if (!selectedIndentId) return showToast("Select an indent", "info");
// //     try {
// //       setLoading(true);
// //       const totalAmount = editableItems.reduce((sum, it) => sum + it.receivedQty * it.unitPrice, 0);
// //       const payload = {
// //         indentId: selectedIndentId,
// //         items: editableItems.map((it) => ({ ...it, amount: it.receivedQty * it.unitPrice })),
// //         totalAmount,
// //         receivedAt: new Date().toISOString(),
// //       };
// //       await api.post("/purchase-orders", payload);
// //       showToast("Inventory intake confirmed!", "success");
// //       setSelectedIndentId("");
// //       setView("history");
// //       load();
// //     } catch (e) {
// //       showToast("Error creating PO", "error");
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   return (
// //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// //       {/* Header */}
// //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// //         <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
// //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// //             Purchase <span style={{ color: '#6366f1' }}>Orders</span>
// //           </h1>
// //           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
// //             <button
// //               onClick={() => setView("history")}
// //               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'history' ? '#fff' : 'transparent', color: view === 'history' ? '#6366f1' : '#64748b', boxShadow: view === 'history' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
// //               <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><History size={14}/> History</div>
// //             </button>
// //             <button
// //               onClick={() => setView("create")}
// //               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'create' ? '#fff' : 'transparent', color: view === 'create' ? '#6366f1' : '#64748b', boxShadow: view === 'create' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
// //               <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><PackageCheck size={14}/> Intake</div>
// //             </button>
// //           </div>
// //         </div>

// //         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// //           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// //           <input
// //             type="text"
// //             placeholder="Search POs..."
// //             value={searchTerm}
// //             onChange={(e) => setSearchTerm(e.target.value)}
// //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
// //           />
// //         </div>
// //       </div>

// //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// //         {view === "history" ? (
// //           <>
// //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px' }}>COMPLETED ORDERS ({filteredPOs.length})</div>
// //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// //                 {filteredPOs.map(po => (
// //                   <div
// //                     key={po._id}
// //                     onClick={() => setSelectedPoId(po._id)}
// //                     style={{
// //                       padding: '16px', borderRadius: '16px', cursor: 'pointer',
// //                       background: selectedPoId === po._id ? '#fff' : 'transparent',
// //                       border: selectedPoId === po._id ? '1px solid #6366f1' : '1px solid transparent',
// //                       boxShadow: selectedPoId === po._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// //                     }}
// //                   >
// //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// //                       <div style={{ fontWeight: '700', color: selectedPoId === po._id ? '#6366f1' : '#1e293b' }}>
// //                         {po.indentId?.indentNo || `PO-${po._id.slice(-4).toUpperCase()}`}
// //                       </div>
// //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
// //                         {new Date(po.receivedAt).toLocaleDateString()}
// //                       </div>
// //                     </div>
// //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
// //                       ₹{po.totalAmount?.toLocaleString()} • {po.items?.length || 0} Items
// //                     </div>
// //                   </div>
// //                 ))}
// //               </div>
// //             </div>

// //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// //               {activePO ? (
// //                 <>
// //                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// //                     <div>
// //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>ORDER RECEIVED</div>
// //                       <div style={{ fontSize: '18px', fontWeight: '800' }}>{new Date(activePO.receivedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
// //                     </div>
// //                     <div style={{ textAlign: 'right' }}>
// //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
// //                       <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activePO.totalAmount?.toLocaleString()}</div>
// //                     </div>
// //                   </div>

// //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// //                       <thead>
// //                         <tr style={{ textAlign: 'left' }}>
// //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>PRODUCT</th>
// //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
// //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// //                         </tr>
// //                       </thead>
// //                       <tbody>
// //                         {activePO.items.map((item, idx) => {
// //                           const details = getStockDetails(item.stockItemId?._id || item.stockItemId);
// //                           return (
// //                             <tr key={idx}>
// //                               <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// //                                 <div style={{ fontWeight: '700', color: '#1e293b' }}>{details.name}</div>
// //                                 <div style={{ fontSize: '11px', color: '#94a3b8' }}>Rate: ₹{item.unitPrice} / {details.unit}</div>
// //                               </td>
// //                               <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700' }}>
// //                                 {item.receivedQty} <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '400' }}>{details.unit}</span>
// //                               </td>
// //                               <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>₹{item.amount?.toLocaleString()}</td>
// //                             </tr>
// //                           );
// //                         })}
// //                       </tbody>
// //                     </table>
// //                   </div>

// //                   <div style={{ padding: '24px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// //                     <button 
// //                       onClick={downloadExcel}
// //                       style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '13px', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2)' }}
// //                     >
// //                       <Download size={18}/> Export Excel (.xlsx)
// //                     </button>
// //                   </div>
// //                 </>
// //               ) : (
// //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No records selected</div>
// //               )}
// //             </div>
// //           </>
// //         ) : (
// //           /* Intake Creation Area */
// //           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
// //             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '24px', alignItems: 'center' }}>
// //               <div style={{ flex: 1 }}>
// //                 <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '8px' }}>SELECT PENDING INDENT</label>
// //                 <select 
// //                   value={selectedIndentId} 
// //                   onChange={(e) => setSelectedIndentId(e.target.value)}
// //                   style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: '700', outline: 'none' }}>
// //                   <option value="">Choose an indent to process...</option>
// //                   {indents.map(i => (
// //                     <option key={i._id} value={i._id}>{i.indentNo} — ₹{i.totalAmount?.toLocaleString()}</option>
// //                   ))}
// //                 </select>
// //               </div>
// //               <div style={{ textAlign: 'right' }}>
// //                 <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>INTAKE TOTAL</div>
// //                 <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{editableItems.reduce((sum, it) => sum + it.receivedQty * it.unitPrice, 0).toLocaleString()}</div>
// //               </div>
// //             </div>

// //             <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px' }}>
// //               {editableItems.length > 0 ? (
// //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// //                   <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
// //                     <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// //                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8' }}>ITEM DESCRIPTION</th>
// //                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>REQ. QTY</th>
// //                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'center', width: '180px' }}>REC. QTY</th>
// //                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>VALUATION</th>
// //                     </tr>
// //                   </thead>
// //                   <tbody>
// //                     {editableItems.map((item, idx) => (
// //                       <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
// //                         <td style={{ padding: '20px 0' }}>
// //                           <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.name}</div>
// //                           <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice} / {item.unit}</div>
// //                         </td>
// //                         <td style={{ textAlign: 'center', color: '#64748b', fontWeight: '600' }}>
// //                           {item.orderedQty} <span style={{ fontSize: '10px', fontWeight: '400' }}>{item.unit}</span>
// //                         </td>
// //                         <td style={{ textAlign: 'center' }}>
// //                           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
// //                             <input 
// //                               type="number"
// //                               value={item.receivedQty}
// //                               onChange={(e) => {
// //                                 const newItems = [...editableItems];
// //                                 newItems[idx].receivedQty = Number(e.target.value);
// //                                 setEditableItems(newItems);
// //                               }}
// //                               style={{ width: '80px', padding: '8px', borderRadius: '8px', border: '2px solid #f1f5f9', textAlign: 'center', fontWeight: '800', color: '#6366f1' }}
// //                             />
// //                             <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', width: '30px', textAlign: 'left' }}>{item.unit}</span>
// //                           </div>
// //                         </td>
// //                         <td style={{ textAlign: 'right', fontWeight: '800' }}>₹{(item.receivedQty * item.unitPrice).toLocaleString()}</td>
// //                       </tr>
// //                     ))}
// //                   </tbody>
// //                 </table>
// //               ) : (
// //                 <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>
// //                   Please select a pending indent from the dropdown above
// //                 </div>
// //               )}
// //             </div>

// //             {editableItems.length > 0 && (
// //               <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// //                 <button
// //                   onClick={createPO}
// //                   disabled={loading}
// //                   style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' }}>
// //                   <CheckCircle2 size={18}/> {loading ? "Updating Stock..." : "Confirm Intake & Update Stock"}
// //                 </button>
// //               </div>
// //             )}
// //           </div>
// //         )}
// //       </div>
// //     </div>
// //   );
// // };










// import { useEffect, useState, useMemo, useCallback } from "react";
// import { api } from "../api.js";
// import { useToast } from "../toast.jsx";
// import { Search, CheckCircle2, PackageCheck, History, Download, Loader2 } from "lucide-react";
// import * as XLSX from "xlsx";

// export const PurchaseOrdersPage = () => {
//   const { showToast } = useToast();
//   const [view, setView] = useState("history"); 
//   const [searchTerm, setSearchTerm] = useState("");
  
//   const [indents, setIndents] = useState([]);
//   const [purchaseOrders, setPurchaseOrders] = useState([]);
//   const [stockItems, setStockItems] = useState([]);
//   const [selectedIndentId, setSelectedIndentId] = useState("");
//   const [editableItems, setEditableItems] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [selectedPoId, setSelectedPoId] = useState(null);

//   // FIX: Updated endpoints to match your Express router structure (/api/procurement/...)
//   const load = useCallback(async () => {
//     setLoading(true);
//     try {
//       const [indRes, poRes, stockRes] = await Promise.all([
//         api.get("/procurement/indents"), // Fetch all indents
//         api.get("/procurement/purchase-orders"), 
//         api.get("/procurement/godown-stocks"), // Better source for current stock context
//       ]);

//       const sortedPOs = (poRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
//       // Filter indents that are ready for intake (status: "purchased")
//       const pendingIntake = (indRes.data || []).filter(i => i.status === "purchased");
      
//       setIndents(pendingIntake);
//       setStockItems(stockRes.data || []);
//       setPurchaseOrders(sortedPOs);
      
//       if (sortedPOs.length > 0 && !selectedPoId) {
//         setSelectedPoId(sortedPOs[0]._id);
//       }
//     } catch (error) {
//       console.error("Load Error:", error);
//       showToast("Failed to connect to procurement service", "error");
//     } finally {
//       setLoading(false);
//     }
//   }, [showToast, selectedPoId]);

//   useEffect(() => { load(); }, [load]);

//   const getStockDetails = useCallback((id) => {
//     // Look through godown stocks to find the item details
//     const stockRecord = stockItems.find(s => s.stockItemId?._id === id || s.stockItemId === id);
//     if (!stockRecord?.stockItemId) return { name: "Unknown Item", unit: "units" };

//     const item = stockRecord.stockItemId;
//     return {
//       name: item.name,
//       unit: item.unitId?.symbol || "units"
//     };
//   }, [stockItems]);

//   const filteredPOs = useMemo(() => {
//     return purchaseOrders.filter(po => 
//       (po.indentId?.indentNo || "").toLowerCase().includes(searchTerm.toLowerCase())
//     );
//   }, [purchaseOrders, searchTerm]);

//   const activePO = useMemo(() => 
//     purchaseOrders.find(p => p._id === selectedPoId), 
//   [selectedPoId, purchaseOrders]);

//   const createPO = async () => {
//     if (!selectedIndentId) return showToast("Select an indent", "info");
//     try {
//       setLoading(true);
//       const totalAmount = editableItems.reduce((sum, it) => sum + it.receivedQty * it.unitPrice, 0);
      
//       const payload = {
//         indentId: selectedIndentId,
//         items: editableItems.map((it) => ({
//           stockItemId: it.stockItemId,
//           orderedQty: it.orderedQty,
//           receivedQty: it.receivedQty,
//           unitPrice: it.unitPrice,
//           amount: it.receivedQty * it.unitPrice 
//         })),
//         totalAmount,
//         receivedAt: new Date().toISOString(),
//       };

//       await api.post("/procurement/purchase-orders", payload);
//       showToast("Stock successfully added to inventory!", "success");
//       setSelectedIndentId("");
//       setView("history");
//       load();
//     } catch (e) {
//       showToast(e.response?.data?.message || "Error creating PO", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const downloadExcel = () => {
//     if (!activePO) return;
//     const excelData = activePO.items.map((item) => {
//       const details = getStockDetails(item.stockItemId?._id || item.stockItemId);
//       return {
//         "Order Date": new Date(activePO.receivedAt).toLocaleDateString(),
//         "Indent No": activePO.indentId?.indentNo || "N/A",
//         "Product Name": details.name,
//         "Unit": details.unit,
//         "Unit Price": item.unitPrice,
//         "Received Qty": item.receivedQty,
//         "Subtotal": item.amount,
//       };
//     });
//     const worksheet = XLSX.utils.json_to_sheet(excelData);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Order");
//     XLSX.writeFile(workbook, `PO_${activePO.indentId?.indentNo || "Export"}.xlsx`);
//   };

//   useEffect(() => {
//     if (selectedIndentId) {
//       const indent = indents.find((i) => i._id === selectedIndentId);
//       if (indent?.items) {
//         setEditableItems(indent.items.map((it) => {
//           const sId = it.stockItemId?._id || it.stockItemId;
//           const details = getStockDetails(sId);
//           return {
//             stockItemId: sId,
//             name: details.name,
//             unit: details.unit,
//             orderedQty: Number(it.orderedQty || 0),
//             receivedQty: Number(it.orderedQty || 0),
//             unitPrice: Number(it.unitPrice || 0),
//           };
//         }));
//       }
//     } else {
//       setEditableItems([]);
//     }
//   }, [selectedIndentId, indents, getStockDetails]);

//   return (
//     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
//       {/* Header */}
//       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
//           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
//             Purchase <span style={{ color: '#6366f1' }}>Orders</span>
//           </h1>
//           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
//             <button
//               onClick={() => setView("history")}
//               className="tab-btn"
//               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'history' ? '#fff' : 'transparent', color: view === 'history' ? '#6366f1' : '#64748b', boxShadow: view === 'history' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
//               <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><History size={14}/> History</div>
//             </button>
//             <button
//               onClick={() => setView("create")}
//               className="tab-btn"
//               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'create' ? '#fff' : 'transparent', color: view === 'create' ? '#6366f1' : '#64748b', boxShadow: view === 'create' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
//               <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><PackageCheck size={14}/> Intake</div>
//             </button>
//           </div>
//         </div>

//         <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '15px' }}>
//           {loading && <Loader2 size={16} className="animate-spin" style={{ color: '#6366f1' }} />}
//           <div style={{ position: 'relative' }}>
//             <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
//             <input
//               type="text"
//               placeholder="Search POs..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
//             />
//           </div>
//         </div>
//       </div>

//       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
//         {view === "history" ? (
//           <>
//             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
//               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px' }}>COMPLETED ORDERS ({filteredPOs.length})</div>
//               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
//                 {filteredPOs.length === 0 ? (
//                   <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '13px' }}>No orders found</div>
//                 ) : (
//                   filteredPOs.map(po => (
//                     <div
//                       key={po._id}
//                       onClick={() => setSelectedPoId(po._id)}
//                       style={{
//                         padding: '16px', borderRadius: '16px', cursor: 'pointer',
//                         background: selectedPoId === po._id ? '#fff' : 'transparent',
//                         border: selectedPoId === po._id ? '1px solid #6366f1' : '1px solid transparent',
//                         boxShadow: selectedPoId === po._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
//                       }}
//                     >
//                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//                         <div style={{ fontWeight: '700', color: selectedPoId === po._id ? '#6366f1' : '#1e293b' }}>
//                           {po.indentId?.indentNo || `PO-${po._id.slice(-4).toUpperCase()}`}
//                         </div>
//                         <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
//                           {new Date(po.receivedAt || po.createdAt).toLocaleDateString()}
//                         </div>
//                       </div>
//                       <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
//                         ₹{po.totalAmount?.toLocaleString()} • {po.items?.length || 0} Items
//                       </div>
//                     </div>
//                   ))
//                 )}
//               </div>
//             </div>

//             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
//               {activePO ? (
//                 <>
//                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//                     <div>
//                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>ORDER RECEIVED</div>
//                       <div style={{ fontSize: '18px', fontWeight: '800' }}>{new Date(activePO.receivedAt || activePO.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
//                     </div>
//                     <div style={{ textAlign: 'right' }}>
//                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
//                       <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activePO.totalAmount?.toLocaleString()}</div>
//                     </div>
//                   </div>

//                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
//                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//                       <thead>
//                         <tr style={{ textAlign: 'left' }}>
//                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>PRODUCT</th>
//                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
//                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {activePO.items.map((item, idx) => {
//                           const details = getStockDetails(item.stockItemId?._id || item.stockItemId);
//                           return (
//                             <tr key={idx}>
//                               <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
//                                 <div style={{ fontWeight: '700', color: '#1e293b' }}>{details.name}</div>
//                                 <div style={{ fontSize: '11px', color: '#94a3b8' }}>Rate: ₹{item.unitPrice} / {details.unit}</div>
//                               </td>
//                               <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700' }}>
//                                 {item.receivedQty} <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '400' }}>{details.unit}</span>
//                               </td>
//                               <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>₹{item.amount?.toLocaleString()}</td>
//                             </tr>
//                           );
//                         })}
//                       </tbody>
//                     </table>
//                   </div>

//                   <div style={{ padding: '24px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
//                     <button 
//                       onClick={downloadExcel}
//                       style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '13px', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2)' }}
//                     >
//                       <Download size={18}/> Export Excel (.xlsx)
//                     </button>
//                   </div>
//                 </>
//               ) : (
//                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Select an order from the list</div>
//               )}
//             </div>
//           </>
//         ) : (
//           /* Intake Creation Area */
//           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
//             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '24px', alignItems: 'center' }}>
//               <div style={{ flex: 1 }}>
//                 <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '8px' }}>SELECT PENDING INDENT</label>
//                 <select 
//                   value={selectedIndentId} 
//                   onChange={(e) => setSelectedIndentId(e.target.value)}
//                   style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: '700', outline: 'none' }}>
//                   <option value="">Choose an indent to process...</option>
//                   {indents.map(i => (
//                     <option key={i._id} value={i._id}>{i.indentNo} — ₹{i.totalAmount?.toLocaleString()}</option>
//                   ))}
//                 </select>
//               </div>
//               <div style={{ textAlign: 'right' }}>
//                 <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>INTAKE TOTAL</div>
//                 <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{editableItems.reduce((sum, it) => sum + it.receivedQty * it.unitPrice, 0).toLocaleString()}</div>
//               </div>
//             </div>

//             <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px' }}>
//               {editableItems.length > 0 ? (
//                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//                   <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
//                     <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
//                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8' }}>ITEM DESCRIPTION</th>
//                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>REQ. QTY</th>
//                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'center', width: '180px' }}>REC. QTY</th>
//                       <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>VALUATION</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {editableItems.map((item, idx) => (
//                       <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
//                         <td style={{ padding: '20px 0' }}>
//                           <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.name}</div>
//                           <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice} / {item.unit}</div>
//                         </td>
//                         <td style={{ textAlign: 'center', color: '#64748b', fontWeight: '600' }}>
//                           {item.orderedQty} <span style={{ fontSize: '10px', fontWeight: '400' }}>{item.unit}</span>
//                         </td>
//                         <td style={{ textAlign: 'center' }}>
//                           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
//                             <input 
//                               type="number"
//                               value={item.receivedQty}
//                               onChange={(e) => {
//                                 const newItems = [...editableItems];
//                                 newItems[idx].receivedQty = Number(e.target.value);
//                                 setEditableItems(newItems);
//                               }}
//                               style={{ width: '80px', padding: '8px', borderRadius: '8px', border: '2px solid #f1f5f9', textAlign: 'center', fontWeight: '800', color: '#6366f1' }}
//                             />
//                             <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', width: '30px', textAlign: 'left' }}>{item.unit}</span>
//                           </div>
//                         </td>
//                         <td style={{ textAlign: 'right', fontWeight: '800' }}>₹{(item.receivedQty * item.unitPrice).toLocaleString()}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               ) : (
//                 <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>
//                   Please select a pending indent (marked as 'Purchased') to begin intake.
//                 </div>
//               )}
//             </div>

//             {editableItems.length > 0 && (
//               <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
//                 <button
//                   onClick={createPO}
//                   disabled={loading}
//                   style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' }}>
//                   <CheckCircle2 size={18}/> {loading ? "Updating Stock..." : "Confirm Intake & Update Stock"}
//                 </button>
//               </div>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };




import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { api } from "../api.js";
import { useToast } from "../toast.jsx";
import { Search, CheckCircle2, PackageCheck, History, Download, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

export const PurchaseOrdersPage = () => {
  const { showToast } = useToast();
  const [view, setView] = useState("history"); 
  const [searchTerm, setSearchTerm] = useState("");
  
  const [indents, setIndents] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [selectedIndentId, setSelectedIndentId] = useState("");
  const [editableItems, setEditableItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState(null);

  // Use a ref to track if we've already set the initial PO selection
  const initialSelectionDone = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Note: Ensure your axios 'api' instance has the correct baseURL 
      // or add '/api' prefix here if needed.
      const [indRes, poRes, stockRes] = await Promise.all([
        api.get("/procurement/indents"), 
        api.get("/procurement/purchase-orders"), 
        api.get("/procurement/godown-stocks"), 
      ]);

      const sortedPOs = (poRes.data || []).sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      const pendingIntake = (indRes.data || []).filter(i => i.status === "purchased");
      
      setIndents(pendingIntake);
      setStockItems(stockRes.data || []);
      setPurchaseOrders(sortedPOs);
      
      // Only auto-select the first PO on the very first successful load
      if (sortedPOs.length > 0 && !initialSelectionDone.current) {
        setSelectedPoId(sortedPOs[0]._id);
        initialSelectionDone.current = true;
      }
    } catch (error) {
      console.error("Load Error:", error);
      showToast("Failed to connect to procurement service", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getStockDetails = useCallback((id) => {
    const stockRecord = stockItems.find(s => 
      s.stockItemId?._id === id || s.stockItemId === id
    );
    if (!stockRecord?.stockItemId) return { name: "Unknown Item", unit: "units" };

    const item = stockRecord.stockItemId;
    return {
      name: item.name,
      unit: item.unitId?.symbol || "units"
    };
  }, [stockItems]);

  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter(po => 
      (po.indentId?.indentNo || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [purchaseOrders, searchTerm]);

  const activePO = useMemo(() => 
    purchaseOrders.find(p => p._id === selectedPoId), 
  [selectedPoId, purchaseOrders]);

  const createPO = async () => {
    if (!selectedIndentId) return showToast("Select an indent", "info");
    try {
      setLoading(true);
      const totalAmount = editableItems.reduce((sum, it) => 
        sum + (Number(it.receivedQty || 0) * Number(it.unitPrice || 0)), 0
      );
      
      const payload = {
        indentId: selectedIndentId,
        items: editableItems.map((it) => ({
          stockItemId: it.stockItemId,
          orderedQty: it.orderedQty,
          receivedQty: it.receivedQty,
          unitPrice: it.unitPrice,
          amount: it.receivedQty * it.unitPrice 
        })),
        totalAmount,
        receivedAt: new Date().toISOString(),
      };

      await api.post("/procurement/purchase-orders", payload);
      showToast("Stock successfully added to inventory!", "success");
      
      // Reset and Refresh
      setSelectedIndentId("");
      setView("history");
      initialSelectionDone.current = false; // Allow re-selection of the new PO
      loadData();
    } catch (e) {
      showToast(e.response?.data?.message || "Error creating PO", "error");
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    if (!activePO) return;
    const excelData = activePO.items.map((item) => {
      const details = getStockDetails(item.stockItemId?._id || item.stockItemId);
      return {
        "Order Date": new Date(activePO.receivedAt || activePO.createdAt).toLocaleDateString(),
        "Indent No": activePO.indentId?.indentNo || "N/A",
        "Product Name": details.name,
        "Unit": details.unit,
        "Unit Price": item.unitPrice,
        "Received Qty": item.receivedQty,
        "Subtotal": item.amount,
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Order");
    XLSX.writeFile(workbook, `PO_${activePO.indentId?.indentNo || "Export"}.xlsx`);
  };

  // Sync editable items when an indent is selected
  useEffect(() => {
    if (selectedIndentId) {
      const indent = indents.find((i) => i._id === selectedIndentId);
      if (indent?.items) {
        setEditableItems(indent.items.map((it) => {
          const sId = it.stockItemId?._id || it.stockItemId;
          const details = getStockDetails(sId);
          return {
            stockItemId: sId,
            name: details.name,
            unit: details.unit,
            orderedQty: Number(it.orderedQty || 0),
            receivedQty: Number(it.orderedQty || 0),
            unitPrice: Number(it.unitPrice || 0),
          };
        }));
      }
    } else {
      setEditableItems([]);
    }
  }, [selectedIndentId, indents, getStockDetails]);

  return (
    <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Header */}
      <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
            Purchase <span style={{ color: '#6366f1' }}>Orders</span>
          </h1>
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
            <button
              onClick={() => setView("history")}
              style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'history' ? '#fff' : 'transparent', color: view === 'history' ? '#6366f1' : '#64748b', boxShadow: view === 'history' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><History size={14}/> History</div>
            </button>
            <button
              onClick={() => setView("create")}
              style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'create' ? '#fff' : 'transparent', color: view === 'create' ? '#6366f1' : '#64748b', boxShadow: view === 'create' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><PackageCheck size={14}/> Intake</div>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {loading && <Loader2 size={16} className="animate-spin" style={{ color: '#6366f1' }} />}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search Indent No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
        {view === "history" ? (
          <>
            <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px' }}>COMPLETED ORDERS ({filteredPOs.length})</div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredPOs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '13px' }}>No orders found</div>
                ) : (
                  filteredPOs.map(po => (
                    <div
                      key={po._id}
                      onClick={() => setSelectedPoId(po._id)}
                      style={{
                        padding: '16px', borderRadius: '16px', cursor: 'pointer',
                        background: selectedPoId === po._id ? '#fff' : 'transparent',
                        border: selectedPoId === po._id ? '1px solid #6366f1' : '1px solid transparent',
                        boxShadow: selectedPoId === po._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: '700', color: selectedPoId === po._id ? '#6366f1' : '#1e293b' }}>
                          {po.indentId?.indentNo || `PO-${po._id.slice(-4).toUpperCase()}`}
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
                          {new Date(po.receivedAt || po.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        ₹{po.totalAmount?.toLocaleString()} • {po.items?.length || 0} Items
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              {activePO ? (
                <>
                  <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>ORDER RECEIVED</div>
                      <div style={{ fontSize: '18px', fontWeight: '800' }}>{new Date(activePO.receivedAt || activePO.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
                      <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activePO.totalAmount?.toLocaleString()}</div>
                    </div>
                  </div>

                  <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ textAlign: 'left' }}>
                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>PRODUCT</th>
                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activePO.items.map((item, idx) => {
                          const details = getStockDetails(item.stockItemId?._id || item.stockItemId);
                          return (
                            <tr key={idx}>
                              <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
                                <div style={{ fontWeight: '700', color: '#1e293b' }}>{details.name}</div>
                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Rate: ₹{item.unitPrice} / {details.unit}</div>
                              </td>
                              <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700' }}>
                                {item.receivedQty} <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '400' }}>{details.unit}</span>
                              </td>
                              <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>₹{item.amount?.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ padding: '24px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={downloadExcel}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '13px', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2)' }}
                    >
                      <Download size={18}/> Export Excel (.xlsx)
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Select an order from the list</div>
              )}
            </div>
          </>
        ) : (
          /* Intake Creation Area */
          <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '8px' }}>SELECT PENDING INDENT</label>
                <select 
                  value={selectedIndentId} 
                  onChange={(e) => setSelectedIndentId(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: '700', outline: 'none' }}>
                  <option value="">Choose an indent to process...</option>
                  {indents.map(i => (
                    <option key={i._id} value={i._id}>{i.indentNo} — ₹{i.totalAmount?.toLocaleString()}</option>
                  ))}
                </select>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>INTAKE TOTAL</div>
                <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{editableItems.reduce((sum, it) => sum + it.receivedQty * it.unitPrice, 0).toLocaleString()}</div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px' }}>
              {editableItems.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
                      <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8' }}>ITEM DESCRIPTION</th>
                      <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>REQ. QTY</th>
                      <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'center', width: '180px' }}>REC. QTY</th>
                      <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>VALUATION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editableItems.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '20px 0' }}>
                          <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.name}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice} / {item.unit}</div>
                        </td>
                        <td style={{ textAlign: 'center', color: '#64748b', fontWeight: '600' }}>
                          {item.orderedQty} <span style={{ fontSize: '10px', fontWeight: '400' }}>{item.unit}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <input 
                              type="number"
                              value={item.receivedQty}
                              onChange={(e) => {
                                const newItems = [...editableItems];
                                newItems[idx].receivedQty = Number(e.target.value);
                                setEditableItems(newItems);
                              }}
                              style={{ width: '80px', padding: '8px', borderRadius: '8px', border: '2px solid #f1f5f9', textAlign: 'center', fontWeight: '800', color: '#6366f1' }}
                            />
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', width: '30px', textAlign: 'left' }}>{item.unit}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '800' }}>₹{(item.receivedQty * item.unitPrice).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>
                  Select a pending indent (marked as 'Purchased') to begin intake.
                </div>
              )}
            </div>

            {editableItems.length > 0 && (
              <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={createPO}
                  disabled={loading}
                  style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' }}>
                  <CheckCircle2 size={18}/> {loading ? "Updating Stock..." : "Confirm Intake & Update Stock"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};