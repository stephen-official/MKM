
// // // // // // // // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // // // // // // // import { api } from "../api.js";
// // // // // // // // // import { toast } from "react-hot-toast";
// // // // // // // // // import * as XLSX from "xlsx";
// // // // // // // // // import { 
// // // // // // // // //   Search, 
// // // // // // // // //   ChevronRight, 
// // // // // // // // //   Layers, 
// // // // // // // // //   Plus, 
// // // // // // // // //   Trash2,
// // // // // // // // //   Download 
// // // // // // // // // } from "lucide-react";

// // // // // // // // // export const StockDistributionPage = () => {
// // // // // // // // //   const [purchaseOrders, setPurchaseOrders] = useState([]);
// // // // // // // // //   const [godowns, setGodowns] = useState([]);
// // // // // // // // //   const [stockItems, setStockItems] = useState([]);
// // // // // // // // //   const [distLogs, setDistLogs] = useState([]);

// // // // // // // // //   const [activeTab, setActiveTab] = useState("pending"); // Only "pending" or "completed"
// // // // // // // // //   const [selectedId, setSelectedId] = useState(null);
// // // // // // // // //   const [searchQuery, setSearchQuery] = useState("");
// // // // // // // // //   const [loading, setLoading] = useState(false);
// // // // // // // // //   const [allocations, setAllocations] = useState([]);

// // // // // // // // //   const loadData = useCallback(async () => {
// // // // // // // // //     setLoading(true);
// // // // // // // // //     try {
// // // // // // // // //       const [poRes, godownRes, stockRes, logRes] = await Promise.all([
// // // // // // // // //         api.get("/purchase-orders"),
// // // // // // // // //         api.get("/inventory/godowns"),
// // // // // // // // //         api.get("/inventory/stock-items"),
// // // // // // // // //         api.get("/distributions/logs"), 
// // // // // // // // //       ]);
      
// // // // // // // // //       const validPOs = (poRes.data || []).filter(po => 
// // // // // // // // //         po.items?.some(it => (it.receivedQty || 0) > 0)
// // // // // // // // //       );

// // // // // // // // //       setPurchaseOrders(validPOs);
// // // // // // // // //       setGodowns(godownRes.data || []);
// // // // // // // // //       setStockItems(stockRes.data || []);
// // // // // // // // //       setDistLogs(logRes.data || []);
// // // // // // // // //     } catch (error) {
// // // // // // // // //       toast.error("Failed to sync inventory data");
// // // // // // // // //     } finally {
// // // // // // // // //       setLoading(false);
// // // // // // // // //     }
// // // // // // // // //   }, []);

// // // // // // // // //   useEffect(() => { loadData(); }, [loadData]);

// // // // // // // // //   const getStockDetails = useCallback((id) => {
// // // // // // // // //     const item = stockItems.find((s) => String(s._id) === String(id));
// // // // // // // // //     if (!item) return { name: "Unknown Item", unit: "-" };
// // // // // // // // //     const unitSymbol = item.unitId?.symbol || item.unitId?.name || item.unit || "unit";
// // // // // // // // //     return { name: item.name, unit: unitSymbol };
// // // // // // // // //   }, [stockItems]);

// // // // // // // // //   const getGodownName = (id) => {
// // // // // // // // //     const godown = godowns.find(g => String(g._id) === String(id));
// // // // // // // // //     return godown ? godown.name : "Not Assigned";
// // // // // // // // //   };

// // // // // // // // //   const activeRecord = useMemo(() => {
// // // // // // // // //     if (!selectedId) return null;
// // // // // // // // //     if (activeTab === "completed") return distLogs.find(d => d._id === selectedId);
// // // // // // // // //     return purchaseOrders.find(p => p._id === selectedId);
// // // // // // // // //   }, [selectedId, activeTab, purchaseOrders, distLogs]);

// // // // // // // // //   useEffect(() => {
// // // // // // // // //     if (!activeRecord) {
// // // // // // // // //       setAllocations([]);
// // // // // // // // //       return;
// // // // // // // // //     }

// // // // // // // // //     if (activeTab === "completed") {
// // // // // // // // //       setAllocations((activeRecord.allocations || []).map((it, idx) => ({
// // // // // // // // //         tempId: `log-${it._id || idx}`,
// // // // // // // // //         stockItemId: it.stockItemId?._id || it.stockItemId,
// // // // // // // // //         godownId: it.godownId?._id || it.godownId || "",
// // // // // // // // //         qtyBaseUnit: it.qtyBaseUnit,
// // // // // // // // //         maxQty: it.qtyBaseUnit, 
// // // // // // // // //         isLog: true
// // // // // // // // //       })));
// // // // // // // // //       return;
// // // // // // // // //     }

// // // // // // // // //     if (activeTab === "pending") {
// // // // // // // // //       const filteredItems = activeRecord.items.filter(it => (it.receivedQty || 0) > 0);
// // // // // // // // //       setAllocations(filteredItems.map((it, idx) => ({
// // // // // // // // //         tempId: `po-${idx}`,
// // // // // // // // //         stockItemId: it.stockItemId?._id || it.stockItemId,
// // // // // // // // //         godownId: "",
// // // // // // // // //         qtyBaseUnit: 0,
// // // // // // // // //         maxQty: it.receivedQty || 0,
// // // // // // // // //       })));
// // // // // // // // //     }
// // // // // // // // //   }, [activeRecord, activeTab]);

// // // // // // // // //   const sidebarItems = useMemo(() => {
// // // // // // // // //     let list = activeTab === "pending" 
// // // // // // // // //       ? purchaseOrders.filter(p => p.status === "pending" || !p.status)
// // // // // // // // //       : distLogs;

// // // // // // // // //     if (searchQuery.trim()) {
// // // // // // // // //       const q = searchQuery.toLowerCase();
// // // // // // // // //       list = list.filter(i => {
// // // // // // // // //         const indentNo = (i.indentId?.indentNo || i.purchaseOrderId?.indentId?.indentNo || "").toLowerCase();
// // // // // // // // //         const itemName = getStockDetails(i.stockItemId).name.toLowerCase();
// // // // // // // // //         return indentNo.includes(q) || itemName.includes(q);
// // // // // // // // //       });
// // // // // // // // //     }
// // // // // // // // //     return list;
// // // // // // // // //   }, [activeTab, purchaseOrders, distLogs, searchQuery, getStockDetails]);

// // // // // // // // //   const updateAllocation = (tempId, field, value) => {
// // // // // // // // //     if (activeTab === "completed") return;
// // // // // // // // //     setAllocations((prev) => {
// // // // // // // // //       const currentRow = prev.find(a => a.tempId === tempId);
// // // // // // // // //       if (!currentRow) return prev;
// // // // // // // // //       let newValue = field === "qtyBaseUnit" ? Number(value) : value;
// // // // // // // // //       if (field === "qtyBaseUnit") {
// // // // // // // // //         const otherRowsTotal = prev
// // // // // // // // //           .filter(a => a.tempId !== tempId && String(a.stockItemId) === String(currentRow.stockItemId))
// // // // // // // // //           .reduce((sum, a) => sum + (Number(a.qtyBaseUnit) || 0), 0);
// // // // // // // // //         const currentAvailableLimit = currentRow.maxQty - otherRowsTotal;
// // // // // // // // //         if (newValue > currentAvailableLimit) {
// // // // // // // // //           toast.error(`Max ${currentAvailableLimit} available`);
// // // // // // // // //           newValue = currentAvailableLimit;
// // // // // // // // //         }
// // // // // // // // //         if (newValue < 0) newValue = 0;
// // // // // // // // //       }
// // // // // // // // //       return prev.map((a) => (a.tempId === tempId ? { ...a, [field]: newValue } : a));
// // // // // // // // //     });
// // // // // // // // //   };

// // // // // // // // //   const addAllocationRow = (index, baseAlloc) => {
// // // // // // // // //     const newRow = { ...baseAlloc, tempId: `extra-${Math.random()}`, qtyBaseUnit: 0, godownId: "" };
// // // // // // // // //     setAllocations(prev => {
// // // // // // // // //       const updated = [...prev];
// // // // // // // // //       updated.splice(index + 1, 0, newRow);
// // // // // // // // //       return updated;
// // // // // // // // //     });
// // // // // // // // //   };

// // // // // // // // //   const removeAllocationRow = (tempId) => {
// // // // // // // // //     setAllocations(prev => prev.filter(a => a.tempId !== tempId));
// // // // // // // // //   };

// // // // // // // // //   const handleDistributionSubmit = async () => {
// // // // // // // // //     const validAllocations = allocations.filter((a) => a.godownId && a.qtyBaseUnit > 0);
// // // // // // // // //     if (validAllocations.length === 0) return toast.error("Assign destinations and quantities.");

// // // // // // // // //     // Validation: Enforce full distribution
// // // // // // // // //     const stockItemIds = [...new Set(allocations.map(a => String(a.stockItemId)))];
// // // // // // // // //     for (const sId of stockItemIds) {
// // // // // // // // //       const firstRow = allocations.find(a => String(a.stockItemId) === sId);
// // // // // // // // //       const totalAllocated = allocations
// // // // // // // // //         .filter(a => String(a.stockItemId) === sId)
// // // // // // // // //         .reduce((sum, a) => sum + (Number(a.qtyBaseUnit) || 0), 0);
      
// // // // // // // // //       if (totalAllocated !== firstRow.maxQty) {
// // // // // // // // //         const details = getStockDetails(sId);
// // // // // // // // //         return toast.error(`Incomplete: Must distribute all ${firstRow.maxQty} of ${details.name}.`);
// // // // // // // // //       }
// // // // // // // // //     }

// // // // // // // // //     try {
// // // // // // // // //       setLoading(true);
// // // // // // // // //       const payload = {
// // // // // // // // //         purchaseOrderId: activeRecord._id,
// // // // // // // // //         allocations: validAllocations.map(({ stockItemId, godownId, qtyBaseUnit }) => ({
// // // // // // // // //           stockItemId, 
// // // // // // // // //           godownId, 
// // // // // // // // //           qtyBaseUnit,
// // // // // // // // //         })),
// // // // // // // // //         leftovers: [] 
// // // // // // // // //       };

// // // // // // // // //       await api.post("/distributions", payload);
// // // // // // // // //       toast.success("Inventory distributed successfully!");
// // // // // // // // //       setSelectedId(null);
// // // // // // // // //       await loadData(); 
// // // // // // // // //     } catch (error) {
// // // // // // // // //       toast.error(error.response?.data?.message || "Distribution failed");
// // // // // // // // //     } finally {
// // // // // // // // //       setLoading(false);
// // // // // // // // //     }
// // // // // // // // //   };

// // // // // // // // //   const downloadAsExcel = () => {
// // // // // // // // //     if (!allocations.length) return toast.error("No data to export");
// // // // // // // // //     const ref = activeTab === 'completed' ? "Log" : "Pending";
// // // // // // // // //     const data = allocations.map(a => {
// // // // // // // // //       const details = getStockDetails(a.stockItemId);
// // // // // // // // //       return {
// // // // // // // // //         "Item": details.name,
// // // // // // // // //         "Godown": getGodownName(a.godownId),
// // // // // // // // //         "Qty": a.qtyBaseUnit,
// // // // // // // // //         "Unit": details.unit
// // // // // // // // //       };
// // // // // // // // //     });
// // // // // // // // //     const ws = XLSX.utils.json_to_sheet(data);
// // // // // // // // //     const wb = XLSX.utils.book_new();
// // // // // // // // //     XLSX.utils.book_append_sheet(wb, ws, "Stock");
// // // // // // // // //     XLSX.writeFile(wb, `Stock_Distribution_${ref}.xlsx`);
// // // // // // // // //   };

// // // // // // // // //   const styles = {
// // // // // // // // //     container: { height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" },
// // // // // // // // //     header: { padding: '16px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
// // // // // // // // //     tabBtn: (active) => ({
// // // // // // // // //         padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
// // // // // // // // //         background: active ? '#6366f1' : 'transparent', color: active ? '#fff' : '#64748b', border: 'none'
// // // // // // // // //     }),
// // // // // // // // //     sidebar: { width: '350px', display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px' },
// // // // // // // // //     canvas: { flex: 1, background: '#fff', borderRadius: '20px', margin: '20px 20px 20px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' },
// // // // // // // // //     card: (sel) => ({
// // // // // // // // //         padding: '14px', borderRadius: '12px', cursor: 'pointer', background: sel ? '#fff' : 'transparent',
// // // // // // // // //         border: sel ? '1px solid #6366f1' : '1px solid transparent', boxShadow: sel ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
// // // // // // // // //     })
// // // // // // // // //   };

// // // // // // // // //   return (
// // // // // // // // //     <div style={styles.container}>
// // // // // // // // //       <div style={styles.header}>
// // // // // // // // //         <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Stock <span style={{ color: '#6366f1' }}>Distribution</span></h1>
// // // // // // // // //         <div style={{ display: 'flex', gap: '12px' }}>
// // // // // // // // //           <div style={{ display: 'flex', background: '#f8fafc', padding: '4px', borderRadius: '10px' }}>
// // // // // // // // //             {["pending", "completed"].map(t => (
// // // // // // // // //               <button key={t} onClick={() => {setActiveTab(t); setSelectedId(null);}} style={styles.tabBtn(activeTab === t)}>
// // // // // // // // //                 {t.charAt(0).toUpperCase() + t.slice(1)}
// // // // // // // // //               </button>
// // // // // // // // //             ))}
// // // // // // // // //           </div>
// // // // // // // // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // // // // //             <Search size={14} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
// // // // // // // // //             <input 
// // // // // // // // //               type="text" placeholder="Search..." value={searchQuery}
// // // // // // // // //               onChange={(e) => setSearchQuery(e.target.value)}
// // // // // // // // //               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 8px 8px 30px', fontSize: '12px' }}
// // // // // // // // //             />
// // // // // // // // //           </div>
// // // // // // // // //         </div>
// // // // // // // // //       </div>

// // // // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
// // // // // // // // //         <div style={styles.sidebar}>
// // // // // // // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // // // //             {sidebarItems.map(item => (
// // // // // // // // //               <div key={item._id} onClick={() => setSelectedId(item._id)} style={styles.card(selectedId === item._id)}>
// // // // // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // //                   <div style={{ fontWeight: '700', fontSize: '13px', color: selectedId === item._id ? '#6366f1' : '#1e293b' }}>
// // // // // // // // //                     {item.indentId?.indentNo || 
// // // // // // // // //                      item.purchaseOrderId?.indentId?.indentNo || 
// // // // // // // // //                      item.purchaseOrderId?.indentNo ||
// // // // // // // // //                      getStockDetails(item.stockItemId).name}
// // // // // // // // //                   </div>
// // // // // // // // //                   <ChevronRight size={14} color="#cbd5e1" />
// // // // // // // // //                 </div>
// // // // // // // // //                 <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
// // // // // // // // //                     {activeTab === 'completed' 
// // // // // // // // //                       ? `Distributed: ${new Date(item.createdAt).toLocaleDateString()}` 
// // // // // // // // //                       : `${item.items?.filter(i => (i.receivedQty || 0) > 0).length || 0} items`}
// // // // // // // // //                 </div>
// // // // // // // // //               </div>
// // // // // // // // //             ))}
// // // // // // // // //           </div>
// // // // // // // // //         </div>

// // // // // // // // //         <div style={styles.canvas}>
// // // // // // // // //           {activeRecord ? (
// // // // // // // // //             <>
// // // // // // // // //               <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9' }}>
// // // // // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
// // // // // // // // //                   <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>
// // // // // // // // //                     {activeRecord.indentId?.indentNo || 
// // // // // // // // //                      activeRecord.purchaseOrderId?.indentId?.indentNo || 
// // // // // // // // //                      (activeTab === "completed" ? "Distribution Log" : "New Distribution")}
// // // // // // // // //                   </h2>
// // // // // // // // //                   <div style={{ display: 'flex', gap: '10px' }}>
// // // // // // // // //                     <button onClick={downloadAsExcel} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
// // // // // // // // //                       <Download size={14} /> Export
// // // // // // // // //                     </button>
// // // // // // // // //                     {activeTab !== 'completed' && (
// // // // // // // // //                       <button onClick={handleDistributionSubmit} disabled={loading} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
// // // // // // // // //                           {loading ? "Saving..." : "Distribute"}
// // // // // // // // //                       </button>
// // // // // // // // //                     )}
// // // // // // // // //                   </div>
// // // // // // // // //                 </div>
// // // // // // // // //               </div>

// // // // // // // // //               <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
// // // // // // // // //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // //                   <thead>
// // // // // // // // //                     <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // // // // //                       <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8' }}>ITEM</th>
// // // // // // // // //                       <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8' }}>DESTINATION</th>
// // // // // // // // //                       <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>QUANTITY</th>
// // // // // // // // //                       <th style={{ padding: '12px' }}></th>
// // // // // // // // //                     </tr>
// // // // // // // // //                   </thead>
// // // // // // // // //                   <tbody>
// // // // // // // // //                     {allocations.map((alloc, idx) => {
// // // // // // // // //                       const details = getStockDetails(alloc.stockItemId);
// // // // // // // // //                       const isSubRow = idx > 0 && String(allocations[idx-1].stockItemId) === String(alloc.stockItemId);
                      
// // // // // // // // //                       const currentItemAllocations = allocations.filter(a => String(a.stockItemId) === String(alloc.stockItemId));
// // // // // // // // //                       const totalAllocated = currentItemAllocations.reduce((sum, a) => sum + (Number(a.qtyBaseUnit) || 0), 0);
// // // // // // // // //                       const remaining = alloc.maxQty - totalAllocated;

// // // // // // // // //                       return (
// // // // // // // // //                         <tr key={alloc.tempId} style={{ borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // //                           <td style={{ padding: '16px 12px' }}>
// // // // // // // // //                             {!isSubRow ? (
// // // // // // // // //                               <>
// // // // // // // // //                                 <div style={{ fontWeight: '700', fontSize: '13px' }}>{details.name}</div>
// // // // // // // // //                                 <div style={{ fontSize: '10px', color: '#94a3b8' }}>Total: {alloc.maxQty} {details.unit}</div>
// // // // // // // // //                                 <div style={{ 
// // // // // // // // //                                   fontSize: '10px', 
// // // // // // // // //                                   fontWeight: 'bold', 
// // // // // // // // //                                   color: remaining === 0 ? '#10b981' : '#ef4444',
// // // // // // // // //                                   marginTop: '2px'
// // // // // // // // //                                 }}>
// // // // // // // // //                                   {remaining === 0 ? '✓ Fully Allocated' : `Remaining: ${remaining} ${details.unit}`}
// // // // // // // // //                                 </div>
// // // // // // // // //                               </>
// // // // // // // // //                             ) : <div style={{ fontSize: '10px', color: '#6366f1' }}>↳ Extra split</div>}
// // // // // // // // //                           </td>
// // // // // // // // //                           <td style={{ padding: '16px 12px' }}>
// // // // // // // // //                             {activeTab === 'completed' ? getGodownName(alloc.godownId) : (
// // // // // // // // //                               <select 
// // // // // // // // //                                 value={alloc.godownId} 
// // // // // // // // //                                 onChange={(e) => updateAllocation(alloc.tempId, "godownId", e.target.value)}
// // // // // // // // //                                 style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', width: '180px', fontSize: '12px' }}
// // // // // // // // //                               >
// // // // // // // // //                                 <option value="">Select Godown</option>
// // // // // // // // //                                 {godowns.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
// // // // // // // // //                               </select>
// // // // // // // // //                             )}
// // // // // // // // //                           </td>
// // // // // // // // //                           <td style={{ padding: '16px 12px', textAlign: 'center' }}>
// // // // // // // // //                             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
// // // // // // // // //                               {activeTab === 'completed' ? alloc.qtyBaseUnit : (
// // // // // // // // //                                 <input 
// // // // // // // // //                                   type="number" value={alloc.qtyBaseUnit}
// // // // // // // // //                                   onChange={(e) => updateAllocation(alloc.tempId, "qtyBaseUnit", e.target.value)}
// // // // // // // // //                                   style={{ width: '60px', padding: '4px', border: '1px solid #e2e8f0', borderRadius: '4px', textAlign: 'center' }}
// // // // // // // // //                                 />
// // // // // // // // //                               )}
// // // // // // // // //                               <span style={{ fontSize: '11px', color: '#64748b' }}>{details.unit}</span>
// // // // // // // // //                             </div>
// // // // // // // // //                           </td>
// // // // // // // // //                           <td style={{ padding: '16px 12px', textAlign: 'right' }}>
// // // // // // // // //                             {activeTab !== 'completed' && (
// // // // // // // // //                               <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
// // // // // // // // //                                 <Plus size={16} color="#6366f1" onClick={() => addAllocationRow(idx, alloc)} style={{ cursor: 'pointer' }} />
// // // // // // // // //                                 {isSubRow && <Trash2 size={16} color="#ef4444" onClick={() => removeAllocationRow(alloc.tempId)} style={{ cursor: 'pointer' }} />}
// // // // // // // // //                               </div>
// // // // // // // // //                             )}
// // // // // // // // //                           </td>
// // // // // // // // //                         </tr>
// // // // // // // // //                       );
// // // // // // // // //                     })}
// // // // // // // // //                   </tbody>
// // // // // // // // //                 </table>
// // // // // // // // //               </div>
// // // // // // // // //             </>
// // // // // // // // //           ) : (
// // // // // // // // //             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// // // // // // // // //               <Layers size={40} style={{ marginBottom: '10px', opacity: 0.3 }} />
// // // // // // // // //               <div style={{ fontSize: '13px' }}>Select an order to begin distribution</div>
// // // // // // // // //             </div>
// // // // // // // // //           )}
// // // // // // // // //         </div>
// // // // // // // // //       </div>
// // // // // // // // //     </div>
// // // // // // // // //   );
// // // // // // // // // };






// // // // // // // // // above is final







// // // // // // // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // // // // // // import { api } from "../api.js";
// // // // // // // // import { toast } from "react-hot-toast";
// // // // // // // // import * as XLSX from "xlsx";
// // // // // // // // import { 
// // // // // // // //   Search, 
// // // // // // // //   ChevronRight, 
// // // // // // // //   Layers, 
// // // // // // // //   Plus, 
// // // // // // // //   Trash2,
// // // // // // // //   Download 
// // // // // // // // } from "lucide-react";

// // // // // // // // export const StockDistributionPage = () => {
// // // // // // // //   const [purchaseOrders, setPurchaseOrders] = useState([]);
// // // // // // // //   const [godowns, setGodowns] = useState([]);
// // // // // // // //   const [stockItems, setStockItems] = useState([]);
// // // // // // // //   const [distLogs, setDistLogs] = useState([]);

// // // // // // // //   const [activeTab, setActiveTab] = useState("pending"); 
// // // // // // // //   const [selectedId, setSelectedId] = useState(null);
// // // // // // // //   const [searchQuery, setSearchQuery] = useState("");
// // // // // // // //   const [loading, setLoading] = useState(false);
// // // // // // // //   const [allocations, setAllocations] = useState([]);

// // // // // // // //   const loadData = useCallback(async () => {
// // // // // // // //     setLoading(true);
// // // // // // // //     try {
// // // // // // // //       const [poRes, godownRes, stockRes, logRes] = await Promise.all([
// // // // // // // //         api.get("/purchase-orders"),
// // // // // // // //         api.get("/inventory/godowns"),
// // // // // // // //         api.get("/inventory/stock-items"),
// // // // // // // //         api.get("/distributions/logs"), 
// // // // // // // //       ]);
      
// // // // // // // //       const validPOs = (poRes.data || []).filter(po => 
// // // // // // // //         po.items?.some(it => (it.receivedQty || 0) > 0)
// // // // // // // //       );

// // // // // // // //       setPurchaseOrders(validPOs);
// // // // // // // //       setGodowns(godownRes.data || []);
// // // // // // // //       setStockItems(stockRes.data || []);
// // // // // // // //       setDistLogs(logRes.data || []);
// // // // // // // //     } catch (error) {
// // // // // // // //       toast.error("Failed to sync inventory data");
// // // // // // // //     } finally {
// // // // // // // //       setLoading(false);
// // // // // // // //     }
// // // // // // // //   }, []);

// // // // // // // //   useEffect(() => { loadData(); }, [loadData]);

// // // // // // // //   const getStockDetails = useCallback((id) => {
// // // // // // // //     const item = stockItems.find((s) => String(s._id) === String(id));
// // // // // // // //     if (!item) return { name: "Unknown Item", unit: "-" };
// // // // // // // //     const unitSymbol = item.unitId?.symbol || item.unitId?.name || item.unit || "unit";
// // // // // // // //     return { name: item.name, unit: unitSymbol, category: item.categoryId?.name || "General" };
// // // // // // // //   }, [stockItems]);

// // // // // // // //   const getGodownName = (id) => {
// // // // // // // //     const godown = godowns.find(g => String(g._id) === String(id));
// // // // // // // //     return godown ? godown.name : "Not Assigned";
// // // // // // // //   };

// // // // // // // //   const activeRecord = useMemo(() => {
// // // // // // // //     if (!selectedId) return null;
// // // // // // // //     if (activeTab === "completed") return distLogs.find(d => d._id === selectedId);
// // // // // // // //     return purchaseOrders.find(p => p._id === selectedId);
// // // // // // // //   }, [selectedId, activeTab, purchaseOrders, distLogs]);

// // // // // // // //   useEffect(() => {
// // // // // // // //     if (!activeRecord) {
// // // // // // // //       setAllocations([]);
// // // // // // // //       return;
// // // // // // // //     }

// // // // // // // //     if (activeTab === "completed") {
// // // // // // // //       setAllocations((activeRecord.allocations || []).map((it, idx) => ({
// // // // // // // //         tempId: `log-${it._id || idx}`,
// // // // // // // //         stockItemId: it.stockItemId?._id || it.stockItemId,
// // // // // // // //         godownId: it.godownId?._id || it.godownId || "",
// // // // // // // //         qtyBaseUnit: it.qtyBaseUnit,
// // // // // // // //         maxQty: it.qtyBaseUnit, 
// // // // // // // //         isLog: true
// // // // // // // //       })));
// // // // // // // //       return;
// // // // // // // //     }

// // // // // // // //     if (activeTab === "pending") {
// // // // // // // //       const filteredItems = activeRecord.items.filter(it => (it.receivedQty || 0) > 0);
// // // // // // // //       setAllocations(filteredItems.map((it, idx) => ({
// // // // // // // //         tempId: `po-${idx}`,
// // // // // // // //         stockItemId: it.stockItemId?._id || it.stockItemId,
// // // // // // // //         godownId: "",
// // // // // // // //         qtyBaseUnit: 0,
// // // // // // // //         maxQty: it.receivedQty || 0,
// // // // // // // //       })));
// // // // // // // //     }
// // // // // // // //   }, [activeRecord, activeTab]);

// // // // // // // //   const sidebarItems = useMemo(() => {
// // // // // // // //     let list = activeTab === "pending" 
// // // // // // // //       ? purchaseOrders.filter(p => p.status === "pending" || !p.status)
// // // // // // // //       : distLogs;

// // // // // // // //     if (searchQuery.trim()) {
// // // // // // // //       const q = searchQuery.toLowerCase();
// // // // // // // //       list = list.filter(i => {
// // // // // // // //         const indentNo = (i.indentId?.indentNo || i.purchaseOrderId?.indentId?.indentNo || "").toLowerCase();
// // // // // // // //         const itemName = getStockDetails(i.stockItemId).name.toLowerCase();
// // // // // // // //         return indentNo.includes(q) || itemName.includes(q);
// // // // // // // //       });
// // // // // // // //     }
// // // // // // // //     return list;
// // // // // // // //   }, [activeTab, purchaseOrders, distLogs, searchQuery, getStockDetails]);

// // // // // // // //   const updateAllocation = (tempId, field, value) => {
// // // // // // // //     if (activeTab === "completed") return;
// // // // // // // //     setAllocations((prev) => {
// // // // // // // //       const currentRow = prev.find(a => a.tempId === tempId);
// // // // // // // //       if (!currentRow) return prev;
// // // // // // // //       let newValue = field === "qtyBaseUnit" ? Number(value) : value;
// // // // // // // //       if (field === "qtyBaseUnit") {
// // // // // // // //         const otherRowsTotal = prev
// // // // // // // //           .filter(a => a.tempId !== tempId && String(a.stockItemId) === String(currentRow.stockItemId))
// // // // // // // //           .reduce((sum, a) => sum + (Number(a.qtyBaseUnit) || 0), 0);
// // // // // // // //         const currentAvailableLimit = currentRow.maxQty - otherRowsTotal;
// // // // // // // //         if (newValue > currentAvailableLimit) {
// // // // // // // //           toast.error(`Max ${currentAvailableLimit} available`);
// // // // // // // //           newValue = currentAvailableLimit;
// // // // // // // //         }
// // // // // // // //         if (newValue < 0) newValue = 0;
// // // // // // // //       }
// // // // // // // //       return prev.map((a) => (a.tempId === tempId ? { ...a, [field]: newValue } : a));
// // // // // // // //     });
// // // // // // // //   };

// // // // // // // //   const addAllocationRow = (index, baseAlloc) => {
// // // // // // // //     const newRow = { ...baseAlloc, tempId: `extra-${Math.random()}`, qtyBaseUnit: 0, godownId: "" };
// // // // // // // //     setAllocations(prev => {
// // // // // // // //       const updated = [...prev];
// // // // // // // //       updated.splice(index + 1, 0, newRow);
// // // // // // // //       return updated;
// // // // // // // //     });
// // // // // // // //   };

// // // // // // // //   const removeAllocationRow = (tempId) => {
// // // // // // // //     setAllocations(prev => prev.filter(a => a.tempId !== tempId));
// // // // // // // //   };

// // // // // // // //   const handleDistributionSubmit = async () => {
// // // // // // // //     const validAllocations = allocations.filter((a) => a.godownId && a.qtyBaseUnit > 0);
// // // // // // // //     if (validAllocations.length === 0) return toast.error("Assign destinations and quantities.");

// // // // // // // //     const stockItemIds = [...new Set(allocations.map(a => String(a.stockItemId)))];
// // // // // // // //     for (const sId of stockItemIds) {
// // // // // // // //       const firstRow = allocations.find(a => String(a.stockItemId) === sId);
// // // // // // // //       const totalAllocated = allocations
// // // // // // // //         .filter(a => String(a.stockItemId) === sId)
// // // // // // // //         .reduce((sum, a) => sum + (Number(a.qtyBaseUnit) || 0), 0);
      
// // // // // // // //       if (totalAllocated !== firstRow.maxQty) {
// // // // // // // //         const details = getStockDetails(sId);
// // // // // // // //         return toast.error(`Incomplete: Must distribute all ${firstRow.maxQty} of ${details.name}.`);
// // // // // // // //       }
// // // // // // // //     }

// // // // // // // //     try {
// // // // // // // //       setLoading(true);
// // // // // // // //       const payload = {
// // // // // // // //         purchaseOrderId: activeRecord._id,
// // // // // // // //         allocations: validAllocations.map(({ stockItemId, godownId, qtyBaseUnit }) => ({
// // // // // // // //           stockItemId, 
// // // // // // // //           godownId, 
// // // // // // // //           qtyBaseUnit,
// // // // // // // //         })),
// // // // // // // //         leftovers: [] 
// // // // // // // //       };

// // // // // // // //       await api.post("/distributions", payload);
// // // // // // // //       toast.success("Inventory distributed successfully!");
// // // // // // // //       setSelectedId(null);
// // // // // // // //       await loadData(); 
// // // // // // // //     } catch (error) {
// // // // // // // //       toast.error(error.response?.data?.message || "Distribution failed");
// // // // // // // //     } finally {
// // // // // // // //       setLoading(false);
// // // // // // // //     }
// // // // // // // //   };

// // // // // // // //   const downloadAsExcel = (mode = "current") => {
// // // // // // // //     let dataToExport = [];
// // // // // // // //     let fileName = "";

// // // // // // // //     if (mode === "master") {
// // // // // // // //       if (!distLogs.length) return toast.error("No completed distributions found");

// // // // // // // //       const itemMap = {};
// // // // // // // //       distLogs.forEach(log => {
// // // // // // // //         (log.allocations || []).forEach(a => {
// // // // // // // //           const details = getStockDetails(a.stockItemId?._id || a.stockItemId);
// // // // // // // //           const godownName = getGodownName(a.godownId?._id || a.godownId);
          
// // // // // // // //           const key = details.name;
// // // // // // // //           if (!itemMap[key]) {
// // // // // // // //             itemMap[key] = {
// // // // // // // //               "Stock Item": details.name,
// // // // // // // //               "Stock Group": details.category,
// // // // // // // //               "Units": details.unit,
// // // // // // // //               "Total Quantity": 0
// // // // // // // //             };
// // // // // // // //           }

// // // // // // // //           itemMap[key][godownName] = (itemMap[key][godownName] || 0) + a.qtyBaseUnit;
// // // // // // // //           itemMap[key]["Total Quantity"] += a.qtyBaseUnit;
// // // // // // // //         });
// // // // // // // //       });

// // // // // // // //       dataToExport = Object.values(itemMap).map((row, index) => ({
// // // // // // // //         "S.No": index + 1,
// // // // // // // //         ...row
// // // // // // // //       }));

// // // // // // // //       fileName = `Master_Inventory_Pivoted_${new Date().toLocaleDateString().replace(/\//g, '_')}.xlsx`;
// // // // // // // //     } else {
// // // // // // // //       if (!allocations.length) return toast.error("No data to export");
// // // // // // // //       const ref = activeTab === 'completed' ? "Log" : "Pending";
// // // // // // // //       dataToExport = allocations.map((a, idx) => {
// // // // // // // //         const details = getStockDetails(a.stockItemId);
// // // // // // // //         return {
// // // // // // // //           "S.No": idx + 1,
// // // // // // // //           "Stock Item": details.name,
// // // // // // // //           "Godown": getGodownName(a.godownId),
// // // // // // // //           "Quantity": a.qtyBaseUnit,
// // // // // // // //           "Units": details.unit
// // // // // // // //         };
// // // // // // // //       });
// // // // // // // //       fileName = `Stock_Distribution_${ref}.xlsx`;
// // // // // // // //     }

// // // // // // // //     const ws = XLSX.utils.json_to_sheet(dataToExport);
// // // // // // // //     const wscols = [{wch: 5}, {wch: 25}, {wch: 15}, {wch: 8}];
// // // // // // // //     ws['!cols'] = wscols;

// // // // // // // //     const wb = XLSX.utils.book_new();
// // // // // // // //     XLSX.utils.book_append_sheet(wb, ws, "Master_Stock");
// // // // // // // //     XLSX.writeFile(wb, fileName);
// // // // // // // //   };

// // // // // // // //   const styles = {
// // // // // // // //     container: { height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" },
// // // // // // // //     header: { padding: '16px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
// // // // // // // //     tabBtn: (active) => ({
// // // // // // // //         padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
// // // // // // // //         background: active ? '#6366f1' : 'transparent', color: active ? '#fff' : '#64748b', border: 'none'
// // // // // // // //     }),
// // // // // // // //     sidebar: { width: '350px', display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px' },
// // // // // // // //     canvas: { flex: 1, background: '#fff', borderRadius: '20px', margin: '20px 20px 20px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' },
// // // // // // // //     card: (sel) => ({
// // // // // // // //         padding: '14px', borderRadius: '12px', cursor: 'pointer', background: sel ? '#fff' : 'transparent',
// // // // // // // //         border: sel ? '1px solid #6366f1' : '1px solid transparent', boxShadow: sel ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
// // // // // // // //     })
// // // // // // // //   };

// // // // // // // //   return (
// // // // // // // //     <div style={styles.container}>
// // // // // // // //       <div style={styles.header}>
// // // // // // // //         <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Stock <span style={{ color: '#6366f1' }}>Distribution</span></h1>
        
// // // // // // // //         <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
// // // // // // // //           <button 
// // // // // // // //             onClick={() => downloadAsExcel("master")} 
// // // // // // // //             style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
// // // // // // // //           >
// // // // // // // //             <Download size={14} /> Master Report
// // // // // // // //           </button>

// // // // // // // //           <div style={{ display: 'flex', background: '#f8fafc', padding: '4px', borderRadius: '10px' }}>
// // // // // // // //             {["pending", "completed"].map(t => (
// // // // // // // //               <button key={t} onClick={() => {setActiveTab(t); setSelectedId(null);}} style={styles.tabBtn(activeTab === t)}>
// // // // // // // //                 {t.charAt(0).toUpperCase() + t.slice(1)}
// // // // // // // //               </button>
// // // // // // // //             ))}
// // // // // // // //           </div>
// // // // // // // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // // // //             <Search size={14} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
// // // // // // // //             <input 
// // // // // // // //               type="text" placeholder="Search..." value={searchQuery}
// // // // // // // //               onChange={(e) => setSearchQuery(e.target.value)}
// // // // // // // //               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 8px 8px 30px', fontSize: '12px' }}
// // // // // // // //             />
// // // // // // // //           </div>
// // // // // // // //         </div>
// // // // // // // //       </div>

// // // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
// // // // // // // //         <div style={styles.sidebar}>
// // // // // // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // // //             {sidebarItems.map(item => (
// // // // // // // //               <div key={item._id} onClick={() => setSelectedId(item._id)} style={styles.card(selectedId === item._id)}>
// // // // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // //                   <div style={{ fontWeight: '700', fontSize: '13px', color: selectedId === item._id ? '#6366f1' : '#1e293b' }}>
// // // // // // // //                     {item.indentId?.indentNo || 
// // // // // // // //                      item.purchaseOrderId?.indentId?.indentNo || 
// // // // // // // //                      item.purchaseOrderId?.indentNo ||
// // // // // // // //                      getStockDetails(item.stockItemId).name}
// // // // // // // //                   </div>
// // // // // // // //                   <ChevronRight size={14} color="#cbd5e1" />
// // // // // // // //                 </div>
// // // // // // // //                 <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
// // // // // // // //                     {activeTab === 'completed' 
// // // // // // // //                       ? `Distributed: ${new Date(item.createdAt).toLocaleDateString()}` 
// // // // // // // //                       : `${item.items?.filter(i => (i.receivedQty || 0) > 0).length || 0} items`}
// // // // // // // //                 </div>
// // // // // // // //               </div>
// // // // // // // //             ))}
// // // // // // // //           </div>
// // // // // // // //         </div>

// // // // // // // //         <div style={styles.canvas}>
// // // // // // // //           {activeRecord ? (
// // // // // // // //             <>
// // // // // // // //               <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9' }}>
// // // // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
// // // // // // // //                   <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>
// // // // // // // //                     {activeRecord.indentId?.indentNo || 
// // // // // // // //                      activeRecord.purchaseOrderId?.indentId?.indentNo || 
// // // // // // // //                      (activeTab === "completed" ? "Distribution Log" : "New Distribution")}
// // // // // // // //                   </h2>
// // // // // // // //                   <div style={{ display: 'flex', gap: '10px' }}>
// // // // // // // //                     <button onClick={() => downloadAsExcel("current")} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
// // // // // // // //                       <Download size={14} /> Export Current
// // // // // // // //                     </button>
// // // // // // // //                     {activeTab !== 'completed' && (
// // // // // // // //                       <button onClick={handleDistributionSubmit} disabled={loading} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
// // // // // // // //                           {loading ? "Saving..." : "Distribute"}
// // // // // // // //                       </button>
// // // // // // // //                     )}
// // // // // // // //                   </div>
// // // // // // // //                 </div>
// // // // // // // //               </div>

// // // // // // // //               <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
// // // // // // // //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // //                   <thead>
// // // // // // // //                     <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // // // //                       <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8' }}>ITEM</th>
// // // // // // // //                       <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8' }}>DESTINATION</th>
// // // // // // // //                       <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>QUANTITY</th>
// // // // // // // //                       <th style={{ padding: '12px' }}></th>
// // // // // // // //                     </tr>
// // // // // // // //                   </thead>
// // // // // // // //                   <tbody>
// // // // // // // //                     {allocations.map((alloc, idx) => {
// // // // // // // //                       const details = getStockDetails(alloc.stockItemId);
// // // // // // // //                       const isSubRow = idx > 0 && String(allocations[idx-1].stockItemId) === String(alloc.stockItemId);
                      
// // // // // // // //                       const currentItemAllocations = allocations.filter(a => String(a.stockItemId) === String(alloc.stockItemId));
// // // // // // // //                       const totalAllocated = currentItemAllocations.reduce((sum, a) => sum + (Number(a.qtyBaseUnit) || 0), 0);
// // // // // // // //                       const remaining = alloc.maxQty - totalAllocated;

// // // // // // // //                       return (
// // // // // // // //                         <tr key={alloc.tempId} style={{ borderBottom: '1px solid #f8fafc' }}>
// // // // // // // //                           <td style={{ padding: '16px 12px' }}>
// // // // // // // //                             {!isSubRow ? (
// // // // // // // //                               <>
// // // // // // // //                                 <div style={{ fontWeight: '700', fontSize: '13px' }}>{details.name}</div>
// // // // // // // //                                 <div style={{ fontSize: '10px', color: '#94a3b8' }}>Total: {alloc.maxQty} {details.unit}</div>
// // // // // // // //                                 <div style={{ 
// // // // // // // //                                   fontSize: '10px', 
// // // // // // // //                                   fontWeight: 'bold', 
// // // // // // // //                                   color: remaining === 0 ? '#10b981' : '#ef4444',
// // // // // // // //                                   marginTop: '2px'
// // // // // // // //                                 }}>
// // // // // // // //                                   {remaining === 0 ? '✓ Fully Allocated' : `Remaining: ${remaining} ${details.unit}`}
// // // // // // // //                                 </div>
// // // // // // // //                               </>
// // // // // // // //                             ) : <div style={{ fontSize: '10px', color: '#6366f1' }}>↳ Extra split</div>}
// // // // // // // //                           </td>
// // // // // // // //                           <td style={{ padding: '16px 12px' }}>
// // // // // // // //                             {activeTab === 'completed' ? getGodownName(alloc.godownId) : (
// // // // // // // //                               <select 
// // // // // // // //                                 value={alloc.godownId} 
// // // // // // // //                                 onChange={(e) => updateAllocation(alloc.tempId, "godownId", e.target.value)}
// // // // // // // //                                 style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', width: '180px', fontSize: '12px' }}
// // // // // // // //                               >
// // // // // // // //                                 <option value="">Select Godown</option>
// // // // // // // //                                 {godowns.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
// // // // // // // //                               </select>
// // // // // // // //                             )}
// // // // // // // //                           </td>
// // // // // // // //                           <td style={{ padding: '16px 12px', textAlign: 'center' }}>
// // // // // // // //                             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
// // // // // // // //                               {activeTab === 'completed' ? alloc.qtyBaseUnit : (
// // // // // // // //                                 <input 
// // // // // // // //                                   type="number" value={alloc.qtyBaseUnit}
// // // // // // // //                                   onChange={(e) => updateAllocation(alloc.tempId, "qtyBaseUnit", e.target.value)}
// // // // // // // //                                   style={{ width: '60px', padding: '4px', border: '1px solid #e2e8f0', borderRadius: '4px', textAlign: 'center' }}
// // // // // // // //                                 />
// // // // // // // //                               )}
// // // // // // // //                               <span style={{ fontSize: '11px', color: '#64748b' }}>{details.unit}</span>
// // // // // // // //                             </div>
// // // // // // // //                           </td>
// // // // // // // //                           <td style={{ padding: '16px 12px', textAlign: 'right' }}>
// // // // // // // //                             {activeTab !== 'completed' && (
// // // // // // // //                               <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
// // // // // // // //                                 <Plus size={16} color="#6366f1" onClick={() => addAllocationRow(idx, alloc)} style={{ cursor: 'pointer' }} />
// // // // // // // //                                 {isSubRow && <Trash2 size={16} color="#ef4444" onClick={() => removeAllocationRow(alloc.tempId)} style={{ cursor: 'pointer' }} />}
// // // // // // // //                               </div>
// // // // // // // //                             )}
// // // // // // // //                           </td>
// // // // // // // //                         </tr>
// // // // // // // //                       );
// // // // // // // //                     })}
// // // // // // // //                   </tbody>
// // // // // // // //                 </table>
// // // // // // // //               </div>
// // // // // // // //             </>
// // // // // // // //           ) : (
// // // // // // // //             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// // // // // // // //               <Layers size={40} style={{ marginBottom: '10px', opacity: 0.3 }} />
// // // // // // // //               <div style={{ fontSize: '13px' }}>Select an order to begin distribution</div>
// // // // // // // //             </div>
// // // // // // // //           )}
// // // // // // // //         </div>
// // // // // // // //       </div>
// // // // // // // //     </div>
// // // // // // // //   );
// // // // // // // // };





// // // // // // // // above also final







// // // // // // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // // // // // import { api } from "../api.js";
// // // // // // // import { toast } from "react-hot-toast";
// // // // // // // import * as XLSX from "xlsx";
// // // // // // // import { 
// // // // // // //   Search, 
// // // // // // //   ChevronRight, 
// // // // // // //   Layers, 
// // // // // // //   Plus, 
// // // // // // //   Trash2,
// // // // // // //   Download 
// // // // // // // } from "lucide-react";

// // // // // // // export const StockDistributionPage = () => {
// // // // // // //   const [purchaseOrders, setPurchaseOrders] = useState([]);
// // // // // // //   const [godowns, setGodowns] = useState([]);
// // // // // // //   const [stockItems, setStockItems] = useState([]);
// // // // // // //   const [distLogs, setDistLogs] = useState([]);

// // // // // // //   const [activeTab, setActiveTab] = useState("pending"); 
// // // // // // //   const [selectedId, setSelectedId] = useState(null);
// // // // // // //   const [searchQuery, setSearchQuery] = useState("");
// // // // // // //   const [loading, setLoading] = useState(false);
// // // // // // //   const [allocations, setAllocations] = useState([]);

// // // // // // //   const loadData = useCallback(async () => {
// // // // // // //     setLoading(true);
// // // // // // //     try {
// // // // // // //       const [poRes, godownRes, stockRes, logRes] = await Promise.all([
// // // // // // //         api.get("/purchase-orders"),
// // // // // // //         api.get("/inventory/godowns"),
// // // // // // //         api.get("/inventory/stock-items"),
// // // // // // //         api.get("/distributions/logs"), 
// // // // // // //       ]);
      
// // // // // // //       const validPOs = (poRes.data || []).filter(po => 
// // // // // // //         po.items?.some(it => (it.receivedQty || 0) > 0)
// // // // // // //       );

// // // // // // //       setPurchaseOrders(validPOs);
// // // // // // //       setGodowns(godownRes.data || []);
// // // // // // //       setStockItems(stockRes.data || []);
// // // // // // //       setDistLogs(logRes.data || []);
// // // // // // //     } catch (error) {
// // // // // // //       toast.error("Failed to sync inventory data");
// // // // // // //     } finally {
// // // // // // //       setLoading(false);
// // // // // // //     }
// // // // // // //   }, []);

// // // // // // //   useEffect(() => { loadData(); }, [loadData]);

// // // // // // //   const getStockDetails = useCallback((id) => {
// // // // // // //     const item = stockItems.find((s) => String(s._id) === String(id));
// // // // // // //     if (!item) return { name: "Unknown Item", unit: "-", category: "General" };
// // // // // // //     const unitSymbol = item.unitId?.symbol || item.unitId?.name || item.unit || "unit";
// // // // // // //     return { name: item.name, unit: unitSymbol, category: item.categoryId?.name || "General" };
// // // // // // //   }, [stockItems]);

// // // // // // //   const getGodownName = (id) => {
// // // // // // //     const godown = godowns.find(g => String(g._id) === String(id));
// // // // // // //     return godown ? godown.name : "Not Assigned";
// // // // // // //   };

// // // // // // //   const activeRecord = useMemo(() => {
// // // // // // //     if (!selectedId) return null;
// // // // // // //     if (activeTab === "completed") return distLogs.find(d => d._id === selectedId);
// // // // // // //     return purchaseOrders.find(p => p._id === selectedId);
// // // // // // //   }, [selectedId, activeTab, purchaseOrders, distLogs]);

// // // // // // //   useEffect(() => {
// // // // // // //     if (!activeRecord) {
// // // // // // //       setAllocations([]);
// // // // // // //       return;
// // // // // // //     }

// // // // // // //     if (activeTab === "completed") {
// // // // // // //       setAllocations((activeRecord.allocations || []).map((it, idx) => ({
// // // // // // //         tempId: `log-${it._id || idx}`,
// // // // // // //         stockItemId: it.stockItemId?._id || it.stockItemId,
// // // // // // //         godownId: it.godownId?._id || it.godownId || "",
// // // // // // //         qtyBaseUnit: it.qtyBaseUnit,
// // // // // // //         maxQty: it.qtyBaseUnit, 
// // // // // // //         isLog: true
// // // // // // //       })));
// // // // // // //       return;
// // // // // // //     }

// // // // // // //     if (activeTab === "pending") {
// // // // // // //       const filteredItems = activeRecord.items.filter(it => (it.receivedQty || 0) > 0);
// // // // // // //       setAllocations(filteredItems.map((it, idx) => ({
// // // // // // //         tempId: `po-${idx}`,
// // // // // // //         stockItemId: it.stockItemId?._id || it.stockItemId,
// // // // // // //         godownId: "",
// // // // // // //         qtyBaseUnit: 0,
// // // // // // //         maxQty: it.receivedQty || 0,
// // // // // // //       })));
// // // // // // //     }
// // // // // // //   }, [activeRecord, activeTab]);

// // // // // // //   const sidebarItems = useMemo(() => {
// // // // // // //     let list = activeTab === "pending" 
// // // // // // //       ? purchaseOrders.filter(p => p.status === "pending" || !p.status)
// // // // // // //       : distLogs;

// // // // // // //     if (searchQuery.trim()) {
// // // // // // //       const q = searchQuery.toLowerCase();
// // // // // // //       list = list.filter(i => {
// // // // // // //         const indentNo = (i.indentId?.indentNo || i.purchaseOrderId?.indentId?.indentNo || "").toLowerCase();
// // // // // // //         const itemName = getStockDetails(i.stockItemId).name.toLowerCase();
// // // // // // //         return indentNo.includes(q) || itemName.includes(q);
// // // // // // //       });
// // // // // // //     }
// // // // // // //     return list;
// // // // // // //   }, [activeTab, purchaseOrders, distLogs, searchQuery, getStockDetails]);

// // // // // // //   const updateAllocation = (tempId, field, value) => {
// // // // // // //     if (activeTab === "completed") return;
// // // // // // //     setAllocations((prev) => {
// // // // // // //       const currentRow = prev.find(a => a.tempId === tempId);
// // // // // // //       if (!currentRow) return prev;
// // // // // // //       let newValue = field === "qtyBaseUnit" ? Number(value) : value;
// // // // // // //       if (field === "qtyBaseUnit") {
// // // // // // //         const otherRowsTotal = prev
// // // // // // //           .filter(a => a.tempId !== tempId && String(a.stockItemId) === String(currentRow.stockItemId))
// // // // // // //           .reduce((sum, a) => sum + (Number(a.qtyBaseUnit) || 0), 0);
// // // // // // //         const currentAvailableLimit = currentRow.maxQty - otherRowsTotal;
// // // // // // //         if (newValue > currentAvailableLimit) {
// // // // // // //           toast.error(`Max ${currentAvailableLimit} available`);
// // // // // // //           newValue = currentAvailableLimit;
// // // // // // //         }
// // // // // // //         if (newValue < 0) newValue = 0;
// // // // // // //       }
// // // // // // //       return prev.map((a) => (a.tempId === tempId ? { ...a, [field]: newValue } : a));
// // // // // // //     });
// // // // // // //   };

// // // // // // //   const addAllocationRow = (index, baseAlloc) => {
// // // // // // //     const newRow = { ...baseAlloc, tempId: `extra-${Math.random()}`, qtyBaseUnit: 0, godownId: "" };
// // // // // // //     setAllocations(prev => {
// // // // // // //       const updated = [...prev];
// // // // // // //       updated.splice(index + 1, 0, newRow);
// // // // // // //       return updated;
// // // // // // //     });
// // // // // // //   };

// // // // // // //   const removeAllocationRow = (tempId) => {
// // // // // // //     setAllocations(prev => prev.filter(a => a.tempId !== tempId));
// // // // // // //   };

// // // // // // //   const handleDistributionSubmit = async () => {
// // // // // // //     const validAllocations = allocations.filter((a) => a.godownId && a.qtyBaseUnit > 0);
// // // // // // //     if (validAllocations.length === 0) return toast.error("Assign destinations and quantities.");

// // // // // // //     const stockItemIds = [...new Set(allocations.map(a => String(a.stockItemId)))];
// // // // // // //     for (const sId of stockItemIds) {
// // // // // // //       const firstRow = allocations.find(a => String(a.stockItemId) === sId);
// // // // // // //       const totalAllocated = allocations
// // // // // // //         .filter(a => String(a.stockItemId) === sId)
// // // // // // //         .reduce((sum, a) => sum + (Number(a.qtyBaseUnit) || 0), 0);
      
// // // // // // //       if (totalAllocated !== firstRow.maxQty) {
// // // // // // //         const details = getStockDetails(sId);
// // // // // // //         return toast.error(`Incomplete: Must distribute all ${firstRow.maxQty} of ${details.name}.`);
// // // // // // //       }
// // // // // // //     }

// // // // // // //     try {
// // // // // // //       setLoading(true);
// // // // // // //       const payload = {
// // // // // // //         purchaseOrderId: activeRecord._id,
// // // // // // //         allocations: validAllocations.map(({ stockItemId, godownId, qtyBaseUnit }) => ({
// // // // // // //           stockItemId, 
// // // // // // //           godownId, 
// // // // // // //           qtyBaseUnit,
// // // // // // //         })),
// // // // // // //         leftovers: [] 
// // // // // // //       };

// // // // // // //       await api.post("/distributions", payload);
// // // // // // //       toast.success("Inventory distributed successfully!");
// // // // // // //       setSelectedId(null);
// // // // // // //       await loadData(); 
// // // // // // //     } catch (error) {
// // // // // // //       toast.error(error.response?.data?.message || "Distribution failed");
// // // // // // //     } finally {
// // // // // // //       setLoading(false);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const downloadAsExcel = (mode = "current") => {
// // // // // // //     let dataToExport = [];
// // // // // // //     let fileName = "";

// // // // // // //     if (mode === "master") {
// // // // // // //       if (!distLogs.length) return toast.error("No completed distributions found");

// // // // // // //       const itemMap = {};
// // // // // // //       distLogs.forEach(log => {
// // // // // // //         (log.allocations || []).forEach(a => {
// // // // // // //           const details = getStockDetails(a.stockItemId?._id || a.stockItemId);
// // // // // // //           const godownName = getGodownName(a.godownId?._id || a.godownId);
          
// // // // // // //           const key = details.name;
// // // // // // //           if (!itemMap[key]) {
// // // // // // //             itemMap[key] = {
// // // // // // //               "Stock Item": details.name,
// // // // // // //               "Stock Group": details.category,
// // // // // // //               "Units": details.unit,
// // // // // // //               "Total Quantity": 0
// // // // // // //             };
// // // // // // //           }

// // // // // // //           itemMap[key][godownName] = (itemMap[key][godownName] || 0) + a.qtyBaseUnit;
// // // // // // //           itemMap[key]["Total Quantity"] += a.qtyBaseUnit;
// // // // // // //         });
// // // // // // //       });

// // // // // // //       dataToExport = Object.values(itemMap).map((row, index) => ({
// // // // // // //         "S.No": index + 1,
// // // // // // //         ...row
// // // // // // //       }));

// // // // // // //       fileName = `Master_Inventory_Pivoted_${new Date().toLocaleDateString().replace(/\//g, '_')}.xlsx`;
// // // // // // //     } else {
// // // // // // //       if (!allocations.length) return toast.error("No data to export");
      
// // // // // // //       const currentItemMap = {};
      
// // // // // // //       allocations.forEach(a => {
// // // // // // //         const details = getStockDetails(a.stockItemId);
// // // // // // //         const godownName = a.godownId ? getGodownName(a.godownId) : "Unassigned";
        
// // // // // // //         const key = details.name;
// // // // // // //         if (!currentItemMap[key]) {
// // // // // // //           currentItemMap[key] = {
// // // // // // //             "Stock Item": details.name,
// // // // // // //             "Stock Group": details.category,
// // // // // // //             "Units": details.unit,
// // // // // // //             "Total Quantity": 0
// // // // // // //           };
// // // // // // //         }

// // // // // // //         currentItemMap[key][godownName] = (currentItemMap[key][godownName] || 0) + a.qtyBaseUnit;
// // // // // // //         currentItemMap[key]["Total Quantity"] += a.qtyBaseUnit;
// // // // // // //       });

// // // // // // //       dataToExport = Object.values(currentItemMap).map((row, index) => ({
// // // // // // //         "S.No": index + 1,
// // // // // // //         ...row
// // // // // // //       }));

// // // // // // //       const ref = activeTab === 'completed' ? "Log" : "Pending";
// // // // // // //       fileName = `Stock_Distribution_${ref}_${new Date().getTime()}.xlsx`;
// // // // // // //     }

// // // // // // //     const ws = XLSX.utils.json_to_sheet(dataToExport);
    
// // // // // // //     const wscols = [
// // // // // // //       { wch: 6 },  // S.No
// // // // // // //       { wch: 25 }, // Stock Item
// // // // // // //       { wch: 15 }, // Stock Group
// // // // // // //       { wch: 10 }, // Units
// // // // // // //       { wch: 12 }, // Total Qty
// // // // // // //       ...godowns.map(() => ({ wch: 15 })) // Godown columns
// // // // // // //     ];
// // // // // // //     ws['!cols'] = wscols;

// // // // // // //     const wb = XLSX.utils.book_new();
// // // // // // //     XLSX.utils.book_append_sheet(wb, ws, "Stock_Report");
// // // // // // //     XLSX.writeFile(wb, fileName);
// // // // // // //   };

// // // // // // //   const styles = {
// // // // // // //     container: { height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" },
// // // // // // //     header: { padding: '16px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
// // // // // // //     tabBtn: (active) => ({
// // // // // // //         padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
// // // // // // //         background: active ? '#6366f1' : 'transparent', color: active ? '#fff' : '#64748b', border: 'none'
// // // // // // //     }),
// // // // // // //     sidebar: { width: '350px', display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px' },
// // // // // // //     canvas: { flex: 1, background: '#fff', borderRadius: '20px', margin: '20px 20px 20px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' },
// // // // // // //     card: (sel) => ({
// // // // // // //         padding: '14px', borderRadius: '12px', cursor: 'pointer', background: sel ? '#fff' : 'transparent',
// // // // // // //         border: sel ? '1px solid #6366f1' : '1px solid transparent', boxShadow: sel ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
// // // // // // //     })
// // // // // // //   };

// // // // // // //   return (
// // // // // // //     <div style={styles.container}>
// // // // // // //       <div style={styles.header}>
// // // // // // //         <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Stock <span style={{ color: '#6366f1' }}>Distribution</span></h1>
        
// // // // // // //         <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
// // // // // // //           <button 
// // // // // // //             onClick={() => downloadAsExcel("master")} 
// // // // // // //             style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
// // // // // // //           >
// // // // // // //             <Download size={14} /> Master Report
// // // // // // //           </button>

// // // // // // //           <div style={{ display: 'flex', background: '#f8fafc', padding: '4px', borderRadius: '10px' }}>
// // // // // // //             {["pending", "completed"].map(t => (
// // // // // // //               <button key={t} onClick={() => {setActiveTab(t); setSelectedId(null);}} style={styles.tabBtn(activeTab === t)}>
// // // // // // //                 {t.charAt(0).toUpperCase() + t.slice(1)}
// // // // // // //               </button>
// // // // // // //             ))}
// // // // // // //           </div>
// // // // // // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // // //             <Search size={14} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
// // // // // // //             <input 
// // // // // // //               type="text" placeholder="Search..." value={searchQuery}
// // // // // // //               onChange={(e) => setSearchQuery(e.target.value)}
// // // // // // //               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 8px 8px 30px', fontSize: '12px' }}
// // // // // // //             />
// // // // // // //           </div>
// // // // // // //         </div>
// // // // // // //       </div>

// // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
// // // // // // //         <div style={styles.sidebar}>
// // // // // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // //             {sidebarItems.map(item => (
// // // // // // //               <div key={item._id} onClick={() => setSelectedId(item._id)} style={styles.card(selectedId === item._id)}>
// // // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // //                   <div style={{ fontWeight: '700', fontSize: '13px', color: selectedId === item._id ? '#6366f1' : '#1e293b' }}>
// // // // // // //                     {item.indentId?.indentNo || 
// // // // // // //                      item.purchaseOrderId?.indentId?.indentNo || 
// // // // // // //                      item.purchaseOrderId?.indentNo ||
// // // // // // //                      getStockDetails(item.stockItemId).name}
// // // // // // //                   </div>
// // // // // // //                   <ChevronRight size={14} color="#cbd5e1" />
// // // // // // //                 </div>
// // // // // // //                 <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
// // // // // // //                     {activeTab === 'completed' 
// // // // // // //                       ? `Distributed: ${new Date(item.createdAt).toLocaleDateString()}` 
// // // // // // //                       : `${item.items?.filter(i => (i.receivedQty || 0) > 0).length || 0} items`}
// // // // // // //                 </div>
// // // // // // //               </div>
// // // // // // //             ))}
// // // // // // //           </div>
// // // // // // //         </div>

// // // // // // //         <div style={styles.canvas}>
// // // // // // //           {activeRecord ? (
// // // // // // //             <>
// // // // // // //               <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9' }}>
// // // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
// // // // // // //                   <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>
// // // // // // //                     {activeRecord.indentId?.indentNo || 
// // // // // // //                      activeRecord.purchaseOrderId?.indentId?.indentNo || 
// // // // // // //                      (activeTab === "completed" ? "Distribution Log" : "New Distribution")}
// // // // // // //                   </h2>
// // // // // // //                   <div style={{ display: 'flex', gap: '10px' }}>
// // // // // // //                     <button onClick={() => downloadAsExcel("current")} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
// // // // // // //                       <Download size={14} /> Export Current
// // // // // // //                     </button>
// // // // // // //                     {activeTab !== 'completed' && (
// // // // // // //                       <button onClick={handleDistributionSubmit} disabled={loading} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
// // // // // // //                           {loading ? "Saving..." : "Distribute"}
// // // // // // //                       </button>
// // // // // // //                     )}
// // // // // // //                   </div>
// // // // // // //                 </div>
// // // // // // //               </div>

// // // // // // //               <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
// // // // // // //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // //                   <thead>
// // // // // // //                     <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // // //                       <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8' }}>ITEM</th>
// // // // // // //                       <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8' }}>DESTINATION</th>
// // // // // // //                       <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>QUANTITY</th>
// // // // // // //                       <th style={{ padding: '12px' }}></th>
// // // // // // //                     </tr>
// // // // // // //                   </thead>
// // // // // // //                   <tbody>
// // // // // // //                     {allocations.map((alloc, idx) => {
// // // // // // //                       const details = getStockDetails(alloc.stockItemId);
// // // // // // //                       const isSubRow = idx > 0 && String(allocations[idx-1].stockItemId) === String(alloc.stockItemId);
                      
// // // // // // //                       const currentItemAllocations = allocations.filter(a => String(a.stockItemId) === String(alloc.stockItemId));
// // // // // // //                       const totalAllocated = currentItemAllocations.reduce((sum, a) => sum + (Number(a.qtyBaseUnit) || 0), 0);
// // // // // // //                       const remaining = alloc.maxQty - totalAllocated;

// // // // // // //                       return (
// // // // // // //                         <tr key={alloc.tempId} style={{ borderBottom: '1px solid #f8fafc' }}>
// // // // // // //                           <td style={{ padding: '16px 12px' }}>
// // // // // // //                             {!isSubRow ? (
// // // // // // //                               <>
// // // // // // //                                 <div style={{ fontWeight: '700', fontSize: '13px' }}>{details.name}</div>
// // // // // // //                                 <div style={{ fontSize: '10px', color: '#94a3b8' }}>Total: {alloc.maxQty} {details.unit}</div>
// // // // // // //                                 <div style={{ 
// // // // // // //                                   fontSize: '10px', 
// // // // // // //                                   fontWeight: 'bold', 
// // // // // // //                                   color: remaining === 0 ? '#10b981' : '#ef4444',
// // // // // // //                                   marginTop: '2px'
// // // // // // //                                 }}>
// // // // // // //                                   {remaining === 0 ? '✓ Fully Allocated' : `Remaining: ${remaining} ${details.unit}`}
// // // // // // //                                 </div>
// // // // // // //                               </>
// // // // // // //                             ) : <div style={{ fontSize: '10px', color: '#6366f1' }}>↳ Extra split</div>}
// // // // // // //                           </td>
// // // // // // //                           <td style={{ padding: '16px 12px' }}>
// // // // // // //                             {activeTab === 'completed' ? getGodownName(alloc.godownId) : (
// // // // // // //                               <select 
// // // // // // //                                 value={alloc.godownId} 
// // // // // // //                                 onChange={(e) => updateAllocation(alloc.tempId, "godownId", e.target.value)}
// // // // // // //                                 style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', width: '180px', fontSize: '12px' }}
// // // // // // //                               >
// // // // // // //                                 <option value="">Select Godown</option>
// // // // // // //                                 {godowns.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
// // // // // // //                               </select>
// // // // // // //                             )}
// // // // // // //                           </td>
// // // // // // //                           <td style={{ padding: '16px 12px', textAlign: 'center' }}>
// // // // // // //                             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
// // // // // // //                               {activeTab === 'completed' ? alloc.qtyBaseUnit : (
// // // // // // //                                 <input 
// // // // // // //                                   type="number" value={alloc.qtyBaseUnit}
// // // // // // //                                   onChange={(e) => updateAllocation(alloc.tempId, "qtyBaseUnit", e.target.value)}
// // // // // // //                                   style={{ width: '60px', padding: '4px', border: '1px solid #e2e8f0', borderRadius: '4px', textAlign: 'center' }}
// // // // // // //                                 />
// // // // // // //                               )}
// // // // // // //                               <span style={{ fontSize: '11px', color: '#64748b' }}>{details.unit}</span>
// // // // // // //                             </div>
// // // // // // //                           </td>
// // // // // // //                           <td style={{ padding: '16px 12px', textAlign: 'right' }}>
// // // // // // //                             {activeTab !== 'completed' && (
// // // // // // //                               <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
// // // // // // //                                 <Plus size={16} color="#6366f1" onClick={() => addAllocationRow(idx, alloc)} style={{ cursor: 'pointer' }} />
// // // // // // //                                 {isSubRow && <Trash2 size={16} color="#ef4444" onClick={() => removeAllocationRow(alloc.tempId)} style={{ cursor: 'pointer' }} />}
// // // // // // //                               </div>
// // // // // // //                             )}
// // // // // // //                           </td>
// // // // // // //                         </tr>
// // // // // // //                       );
// // // // // // //                     })}
// // // // // // //                   </tbody>
// // // // // // //                 </table>
// // // // // // //               </div>
// // // // // // //             </>
// // // // // // //           ) : (
// // // // // // //             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// // // // // // //               <Layers size={40} style={{ marginBottom: '10px', opacity: 0.3 }} />
// // // // // // //               <div style={{ fontSize: '13px' }}>Select an order to begin distribution</div>
// // // // // // //             </div>
// // // // // // //           )}
// // // // // // //         </div>
// // // // // // //       </div>
// // // // // // //     </div>
// // // // // // //   );
// // // // // // // };





// // // // // // // 9-4-2026





// // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // import { api } from "../api.js";
// // // import { toast } from "react-hot-toast";
// // // import * as XLSX from "xlsx";
// // // import { 
// // //   Search, 
// // //   ChevronRight, 
// // //   Layers, 
// // //   Plus, 
// // //   Trash2,
// // //   Download 
// // // } from "lucide-react";

// // // export const StockDistributionPage = () => {
// // //   const [purchaseOrders, setPurchaseOrders] = useState([]);
// // //   const [godowns, setGodowns] = useState([]);
// // //   const [stockItems, setStockItems] = useState([]);
// // //   const [distLogs, setDistLogs] = useState([]);

// // //   const [activeTab, setActiveTab] = useState("pending"); 
// // //   const [selectedId, setSelectedId] = useState(null);
// // //   const [searchQuery, setSearchQuery] = useState("");
// // //   const [loading, setLoading] = useState(false);
// // //   const [allocations, setAllocations] = useState([]);

// // //   const loadData = useCallback(async () => {
// // //     setLoading(true);
// // //     try {
// // //       const [poRes, godownRes, stockRes, logRes] = await Promise.all([
// // //         api.get("/purchase-orders"),
// // //         api.get("/inventory/godowns"),
// // //         api.get("/inventory/stock-items"),
// // //         api.get("/distributions/logs"), 
// // //       ]);
      
// // //       const validPOs = (poRes.data || []).filter(po => 
// // //         po.items?.some(it => (it.receivedQty || 0) > 0)
// // //       );

// // //       setPurchaseOrders(validPOs);
// // //       setGodowns(godownRes.data || []);
// // //       setStockItems(stockRes.data || []);
// // //       setDistLogs(logRes.data || []);
// // //     } catch (error) {
// // //       toast.error("Failed to sync inventory data");
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   }, []);

// // //   useEffect(() => { loadData(); }, [loadData]);

// // //   // Integrated getStockDetails: Pulls Stock Group/Category and Units
// // //   const getStockDetails = useCallback((id) => {
// // //     const item = stockItems.find((s) => String(s._id) === String(id));
// // //     if (!item) return { name: "Unknown Item", unit: "-", group: "General" };
    
// // //     const unitSymbol = item.unitId?.symbol || item.unitId?.name || item.unit || "unit";
// // //     // Checks for categoryId or stockGroupId based on your schema population
// // //     const groupName = item.categoryId?.name || item.stockGroupId?.name || "General";
    
// // //     return { 
// // //       name: item.name, 
// // //       unit: unitSymbol, 
// // //       group: groupName 
// // //     };
// // //   }, [stockItems]);

// // //   const getGodownName = (id) => {
// // //     const godown = godowns.find(g => String(g._id) === String(id));
// // //     return godown ? godown.name : "Not Assigned";
// // //   };

// // //   const activeRecord = useMemo(() => {
// // //     if (!selectedId) return null;
// // //     if (activeTab === "completed") return distLogs.find(d => d._id === selectedId);
// // //     return purchaseOrders.find(p => p._id === selectedId);
// // //   }, [selectedId, activeTab, purchaseOrders, distLogs]);

// // //   useEffect(() => {
// // //     if (!activeRecord) {
// // //       setAllocations([]);
// // //       return;
// // //     }

// // //     if (activeTab === "completed") {
// // //       setAllocations((activeRecord.allocations || []).map((it, idx) => ({
// // //         tempId: `log-${it._id || idx}`,
// // //         stockItemId: it.stockItemId?._id || it.stockItemId,
// // //         godownId: it.godownId?._id || it.godownId || "",
// // //         qtyBaseUnit: it.qtyBaseUnit,
// // //         maxQty: it.qtyBaseUnit, 
// // //         isLog: true
// // //       })));
// // //       return;
// // //     }

// // //     if (activeTab === "pending") {
// // //       const filteredItems = activeRecord.items.filter(it => (it.receivedQty || 0) > 0);
// // //       setAllocations(filteredItems.map((it, idx) => ({
// // //         tempId: `po-${idx}`,
// // //         stockItemId: it.stockItemId?._id || it.stockItemId,
// // //         godownId: "",
// // //         qtyBaseUnit: 0,
// // //         maxQty: it.receivedQty || 0,
// // //       })));
// // //     }
// // //   }, [activeRecord, activeTab]);

// // //   const sidebarItems = useMemo(() => {
// // //     let list = activeTab === "pending" 
// // //       ? purchaseOrders.filter(p => p.status === "pending" || !p.status)
// // //       : distLogs;

// // //     if (searchQuery.trim()) {
// // //       const q = searchQuery.toLowerCase();
// // //       list = list.filter(i => {
// // //         const indentNo = (i.indentId?.indentNo || i.purchaseOrderId?.indentId?.indentNo || "").toLowerCase();
// // //         const details = getStockDetails(i.stockItemId || i.items?.[0]?.stockItemId);
// // //         return indentNo.includes(q) || details.name.toLowerCase().includes(q) || details.group.toLowerCase().includes(q);
// // //       });
// // //     }
// // //     return list;
// // //   }, [activeTab, purchaseOrders, distLogs, searchQuery, getStockDetails]);

// // //   const updateAllocation = (tempId, field, value) => {
// // //     if (activeTab === "completed") return;
// // //     setAllocations((prev) => {
// // //       const currentRow = prev.find(a => a.tempId === tempId);
// // //       if (!currentRow) return prev;
// // //       let newValue = field === "qtyBaseUnit" ? Number(value) : value;
// // //       if (field === "qtyBaseUnit") {
// // //         const otherRowsTotal = prev
// // //           .filter(a => a.tempId !== tempId && String(a.stockItemId) === String(currentRow.stockItemId))
// // //           .reduce((sum, a) => sum + (Number(a.qtyBaseUnit) || 0), 0);
// // //         const currentAvailableLimit = currentRow.maxQty - otherRowsTotal;
// // //         if (newValue > currentAvailableLimit) {
// // //           toast.error(`Max ${currentAvailableLimit} available`);
// // //           newValue = currentAvailableLimit;
// // //         }
// // //         if (newValue < 0) newValue = 0;
// // //       }
// // //       return prev.map((a) => (a.tempId === tempId ? { ...a, [field]: newValue } : a));
// // //     });
// // //   };

// // //   const addAllocationRow = (index, baseAlloc) => {
// // //     const newRow = { ...baseAlloc, tempId: `extra-${Math.random()}`, qtyBaseUnit: 0, godownId: "" };
// // //     setAllocations(prev => {
// // //       const updated = [...prev];
// // //       updated.splice(index + 1, 0, newRow);
// // //       return updated;
// // //     });
// // //   };

// // //   const removeAllocationRow = (tempId) => {
// // //     setAllocations(prev => prev.filter(a => a.tempId !== tempId));
// // //   };

// // //   const handleDistributionSubmit = async () => {
// // //     const validAllocations = allocations.filter((a) => a.godownId && a.qtyBaseUnit > 0);
// // //     if (validAllocations.length === 0) return toast.error("Assign destinations and quantities.");

// // //     const stockItemIds = [...new Set(allocations.map(a => String(a.stockItemId)))];
// // //     for (const sId of stockItemIds) {
// // //       const firstRow = allocations.find(a => String(a.stockItemId) === sId);
// // //       const totalAllocated = allocations
// // //         .filter(a => String(a.stockItemId) === sId)
// // //         .reduce((sum, a) => sum + (Number(a.qtyBaseUnit) || 0), 0);
      
// // //       if (totalAllocated !== firstRow.maxQty) {
// // //         const details = getStockDetails(sId);
// // //         return toast.error(`Incomplete: Must distribute all ${firstRow.maxQty} of ${details.name}.`);
// // //       }
// // //     }

// // //     try {
// // //       setLoading(true);
// // //       const payload = {
// // //         purchaseOrderId: activeRecord._id,
// // //         allocations: validAllocations.map(({ stockItemId, godownId, qtyBaseUnit }) => ({
// // //           stockItemId, 
// // //           godownId, 
// // //           qtyBaseUnit,
// // //         })),
// // //         leftovers: [] 
// // //       };

// // //       await api.post("/distributions", payload);
// // //       toast.success("Inventory distributed successfully!");
// // //       setSelectedId(null);
// // //       await loadData(); 
// // //     } catch (error) {
// // //       toast.error(error.response?.data?.message || "Distribution failed");
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   };

// // //   const downloadAsExcel = (mode = "current") => {
// // //     let dataToExport = [];
// // //     let fileName = "";

// // //     if (mode === "master") {
// // //       if (!distLogs.length) return toast.error("No completed distributions found");
// // //       const itemMap = {};
// // //       distLogs.forEach(log => {
// // //         (log.allocations || []).forEach(a => {
// // //           const details = getStockDetails(a.stockItemId?._id || a.stockItemId);
// // //           const godownName = getGodownName(a.godownId?._id || a.godownId);
// // //           const key = details.name;
// // //           if (!itemMap[key]) {
// // //             itemMap[key] = {
// // //               "Stock Item": details.name,
// // //               "Stock Group": details.group,
// // //               "Units": details.unit,
// // //               "Total Quantity": 0
// // //             };
// // //           }
// // //           itemMap[key][godownName] = (itemMap[key][godownName] || 0) + a.qtyBaseUnit;
// // //           itemMap[key]["Total Quantity"] += a.qtyBaseUnit;
// // //         });
// // //       });
// // //       dataToExport = Object.values(itemMap).map((row, index) => ({ "S.No": index + 1, ...row }));
// // //       fileName = `Master_Inventory_Pivoted_${new Date().toLocaleDateString().replace(/\//g, '_')}.xlsx`;
// // //     } else {
// // //       if (!allocations.length) return toast.error("No data to export");
// // //       const currentItemMap = {};
// // //       allocations.forEach(a => {
// // //         const details = getStockDetails(a.stockItemId);
// // //         const godownName = a.godownId ? getGodownName(a.godownId) : "Unassigned";
// // //         const key = details.name;
// // //         if (!currentItemMap[key]) {
// // //           currentItemMap[key] = {
// // //             "Stock Item": details.name,
// // //             "Stock Group": details.group,
// // //             "Units": details.unit,
// // //             "Total Quantity": 0
// // //           };
// // //         }
// // //         currentItemMap[key][godownName] = (currentItemMap[key][godownName] || 0) + a.qtyBaseUnit;
// // //         currentItemMap[key]["Total Quantity"] += a.qtyBaseUnit;
// // //       });
// // //       dataToExport = Object.values(currentItemMap).map((row, index) => ({ "S.No": index + 1, ...row }));
// // //       const ref = activeTab === 'completed' ? "Log" : "Pending";
// // //       fileName = `Stock_Distribution_${ref}_${new Date().getTime()}.xlsx`;
// // //     }

// // //     const ws = XLSX.utils.json_to_sheet(dataToExport);
// // //     ws['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, ...godowns.map(() => ({ wch: 15 }))];
// // //     const wb = XLSX.utils.book_new();
// // //     XLSX.utils.book_append_sheet(wb, ws, "Stock_Report");
// // //     XLSX.writeFile(wb, fileName);
// // //   };

// // //   const styles = {
// // //     container: { height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" },
// // //     header: { padding: '16px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
// // //     tabBtn: (active) => ({
// // //         padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
// // //         background: active ? '#6366f1' : 'transparent', color: active ? '#fff' : '#64748b', border: 'none'
// // //     }),
// // //     sidebar: { width: '350px', display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px' },
// // //     canvas: { flex: 1, background: '#fff', borderRadius: '20px', margin: '20px 20px 20px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' },
// // //     card: (sel) => ({
// // //         padding: '14px', borderRadius: '12px', cursor: 'pointer', background: sel ? '#fff' : 'transparent',
// // //         border: sel ? '1px solid #6366f1' : '1px solid transparent', boxShadow: sel ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
// // //     }),
// // //     badge: { display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', background: '#f1f5f9', color: '#64748b', marginTop: '4px' }
// // //   };

// // //   return (
// // //     <div style={styles.container}>
// // //       <div style={styles.header}>
// // //         <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Stock <span style={{ color: '#6366f1' }}>Distribution</span></h1>
        
// // //         <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
// // //           <button onClick={() => downloadAsExcel("master")} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
// // //             <Download size={14} /> Master Report
// // //           </button>

// // //           <div style={{ display: 'flex', background: '#f8fafc', padding: '4px', borderRadius: '10px' }}>
// // //             {["pending", "completed"].map(t => (
// // //               <button key={t} onClick={() => {setActiveTab(t); setSelectedId(null);}} style={styles.tabBtn(activeTab === t)}>
// // //                 {t.charAt(0).toUpperCase() + t.slice(1)}
// // //               </button>
// // //             ))}
// // //           </div>
// // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // //             <Search size={14} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
// // //             <input type="text" placeholder="Search item or group..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 8px 8px 30px', fontSize: '12px' }} />
// // //           </div>
// // //         </div>
// // //       </div>

// // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
// // //         <div style={styles.sidebar}>
// // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // //             {sidebarItems.map(item => (
// // //               <div key={item._id} onClick={() => setSelectedId(item._id)} style={styles.card(selectedId === item._id)}>
// // //                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // //                   <div style={{ fontWeight: '700', fontSize: '13px', color: selectedId === item._id ? '#6366f1' : '#1e293b' }}>
// // //                     {item.indentId?.indentNo || item.purchaseOrderId?.indentId?.indentNo || getStockDetails(item.stockItemId).name}
// // //                   </div>
// // //                   <ChevronRight size={14} color="#cbd5e1" />
// // //                 </div>
// // //                 <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
// // //                     {activeTab === 'completed' 
// // //                       ? `Distributed: ${new Date(item.createdAt).toLocaleDateString()}` 
// // //                       : `${item.items?.filter(i => (i.receivedQty || 0) > 0).length || 0} items pending`}
// // //                 </div>
// // //               </div>
// // //             ))}
// // //           </div>
// // //         </div>

// // //         <div style={styles.canvas}>
// // //           {activeRecord ? (
// // //             <>
// // //               <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9' }}>
// // //                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
// // //                   <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>
// // //                     {activeRecord.indentId?.indentNo || activeRecord.purchaseOrderId?.indentId?.indentNo || "Distribution View"}
// // //                   </h2>
// // //                   <div style={{ display: 'flex', gap: '10px' }}>
// // //                     <button onClick={() => downloadAsExcel("current")} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
// // //                       <Download size={14} /> Export Current
// // //                     </button>
// // //                     {activeTab !== 'completed' && (
// // //                       <button onClick={handleDistributionSubmit} disabled={loading} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
// // //                           {loading ? "Saving..." : "Distribute"}
// // //                       </button>
// // //                     )}
// // //                   </div>
// // //                 </div>
// // //               </div>

// // //               <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
// // //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // //                   <thead>
// // //                     <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // //                       <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8' }}>ITEM & GROUP</th>
// // //                       <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8' }}>DESTINATION</th>
// // //                       <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>QUANTITY</th>
// // //                       <th style={{ padding: '12px' }}></th>
// // //                     </tr>
// // //                   </thead>
// // //                   <tbody>
// // //                     {allocations.map((alloc, idx) => {
// // //                       const details = getStockDetails(alloc.stockItemId);
// // //                       const isSubRow = idx > 0 && String(allocations[idx-1].stockItemId) === String(alloc.stockItemId);
// // //                       const currentItemAllocations = allocations.filter(a => String(a.stockItemId) === String(alloc.stockItemId));
// // //                       const totalAllocated = currentItemAllocations.reduce((sum, a) => sum + (Number(a.qtyBaseUnit) || 0), 0);
// // //                       const remaining = alloc.maxQty - totalAllocated;

// // //                       return (
// // //                         <tr key={alloc.tempId} style={{ borderBottom: '1px solid #f8fafc' }}>
// // //                           <td style={{ padding: '16px 12px' }}>
// // //                             {!isSubRow ? (
// // //                               <>
// // //                                 <div style={{ fontWeight: '700', fontSize: '13px' }}>{details.name}</div>
// // //                                 <div style={styles.badge}>{details.group}</div>
// // //                                 <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>Total to Distribute: {alloc.maxQty} {details.unit}</div>
// // //                                 <div style={{ fontSize: '10px', fontWeight: 'bold', color: remaining === 0 ? '#10b981' : '#ef4444', marginTop: '2px' }}>
// // //                                   {remaining === 0 ? '✓ Balanced' : `Pending: ${remaining} ${details.unit}`}
// // //                                 </div>
// // //                               </>
// // //                             ) : <div style={{ fontSize: '10px', color: '#6366f1', paddingLeft: '12px' }}>↳ Split Allocation</div>}
// // //                           </td>
// // //                           <td style={{ padding: '16px 12px' }}>
// // //                             {activeTab === 'completed' ? getGodownName(alloc.godownId) : (
// // //                               <select value={alloc.godownId} onChange={(e) => updateAllocation(alloc.tempId, "godownId", e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', width: '180px', fontSize: '12px' }}>
// // //                                 <option value="">Select Godown</option>
// // //                                 {godowns.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
// // //                               </select>
// // //                             )}
// // //                           </td>
// // //                           <td style={{ padding: '16px 12px', textAlign: 'center' }}>
// // //                             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
// // //                               {activeTab === 'completed' ? alloc.qtyBaseUnit : (
// // //                                 <input type="number" value={alloc.qtyBaseUnit} onChange={(e) => updateAllocation(alloc.tempId, "qtyBaseUnit", e.target.value)} style={{ width: '65px', padding: '4px', border: '1px solid #e2e8f0', borderRadius: '4px', textAlign: 'center', fontSize: '12px' }} />
// // //                               )}
// // //                               <span style={{ fontSize: '11px', color: '#64748b' }}>{details.unit}</span>
// // //                             </div>
// // //                           </td>
// // //                           <td style={{ padding: '16px 12px', textAlign: 'right' }}>
// // //                             {activeTab !== 'completed' && (
// // //                               <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
// // //                                 <Plus size={16} color="#6366f1" onClick={() => addAllocationRow(idx, alloc)} style={{ cursor: 'pointer' }} />
// // //                                 {isSubRow && <Trash2 size={16} color="#ef4444" onClick={() => removeAllocationRow(alloc.tempId)} style={{ cursor: 'pointer' }} />}
// // //                               </div>
// // //                             )}
// // //                           </td>
// // //                         </tr>
// // //                       );
// // //                     })}
// // //                   </tbody>
// // //                 </table>
// // //               </div>
// // //             </>
// // //           ) : (
// // //             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// // //               <Layers size={40} style={{ marginBottom: '10px', opacity: 0.3 }} />
// // //               <div style={{ fontSize: '13px' }}>Select an indent or PO to distribute stock</div>
// // //             </div>
// // //           )}
// // //         </div>
// // //       </div>
// // //     </div>
// // //   );
// // // };














// // // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // // import { api } from "../api.js";
// // // // import { toast } from "react-hot-toast";
// // // // import * as XLSX from "xlsx";
// // // // import { 
// // // //   Search, 
// // // //   ChevronRight, 
// // // //   Layers, 
// // // //   Plus, 
// // // //   Trash2,
// // // //   Download 
// // // // } from "lucide-react";

// // // // export const StockDistributionPage = () => {
// // // //   const [purchaseOrders, setPurchaseOrders] = useState([]);
// // // //   const [godowns, setGodowns] = useState([]);
// // // //   const [stockItems, setStockItems] = useState([]);
// // // //   const [distLogs, setDistLogs] = useState([]);

// // // //   const [activeTab, setActiveTab] = useState("pending"); 
// // // //   const [selectedId, setSelectedId] = useState(null);
// // // //   const [searchQuery, setSearchQuery] = useState("");
// // // //   const [loading, setLoading] = useState(false);
// // // //   const [allocations, setAllocations] = useState([]);

// // // //   const loadData = useCallback(async () => {
// // // //     setLoading(true);
// // // //     try {
// // // //       const [poRes, godownRes, stockRes, logRes] = await Promise.all([
// // // //         api.get("/purchase-orders"),
// // // //         api.get("/inventory/godowns"),
// // // //         api.get("/inventory/stock-items"),
// // // //         api.get("/distributions/logs"), 
// // // //       ]);
      
// // // //       const validPOs = (poRes.data || []).filter(po => 
// // // //         po.items?.some(it => (it.receivedQty || 0) > 0)
// // // //       );

// // // //       setPurchaseOrders(validPOs);
// // // //       setGodowns(godownRes.data || []);
// // // //       setStockItems(stockRes.data || []);
// // // //       setDistLogs(logRes.data || []);
// // // //     } catch (error) {
// // // //       toast.error("Failed to sync inventory data");
// // // //     } finally {
// // // //       setLoading(false);
// // // //     }
// // // //   }, []);

// // // //   useEffect(() => { loadData(); }, [loadData]);

// // // //   const getStockDetails = useCallback((id) => {
// // // //     const item = stockItems.find((s) => String(s._id) === String(id));
// // // //     if (!item) return { name: "Unknown Item", unit: "-", group: "General" };
    
// // // //     const unitSymbol = item.unitId?.symbol || item.unitId?.name || item.unit || "unit";
// // // //     const groupName = item.categoryId?.name || item.stockGroupId?.name || "General";
    
// // // //     return { 
// // // //       name: item.name, 
// // // //       unit: unitSymbol, 
// // // //       group: groupName 
// // // //     };
// // // //   }, [stockItems]);

// // // //   const getGodownName = (id) => {
// // // //     const godown = godowns.find(g => String(g._id) === String(id));
// // // //     return godown ? godown.name : "Not Assigned";
// // // //   };

// // // //   const activeRecord = useMemo(() => {
// // // //     if (!selectedId) return null;
// // // //     if (activeTab === "completed") return distLogs.find(d => d._id === selectedId);
// // // //     return purchaseOrders.find(p => p._id === selectedId);
// // // //   }, [selectedId, activeTab, purchaseOrders, distLogs]);

// // // //   useEffect(() => {
// // // //     if (!activeRecord) {
// // // //       setAllocations([]);
// // // //       return;
// // // //     }

// // // //     if (activeTab === "completed") {
// // // //       setAllocations((activeRecord.allocations || []).map((it, idx) => ({
// // // //         tempId: `log-${it._id || idx}`,
// // // //         stockItemId: it.stockItemId?._id || it.stockItemId,
// // // //         godownId: it.godownId?._id || it.godownId || "",
// // // //         qtyBaseUnit: it.qtyBaseUnit,
// // // //         unitPrice: it.unitPrice || 0,
// // // //         maxQty: it.qtyBaseUnit, 
// // // //         isLog: true
// // // //       })));
// // // //       return;
// // // //     }

// // // //     if (activeTab === "pending") {
// // // //       const filteredItems = activeRecord.items.filter(it => (it.receivedQty || 0) > 0);
// // // //       setAllocations(filteredItems.map((it, idx) => ({
// // // //         tempId: `po-${idx}`,
// // // //         stockItemId: it.stockItemId?._id || it.stockItemId,
// // // //         godownId: "",
// // // //         qtyBaseUnit: 0,
// // // //         unitPrice: it.unitPrice || 0,
// // // //         maxQty: it.receivedQty || 0,
// // // //       })));
// // // //     }
// // // //   }, [activeRecord, activeTab]);

// // // //   const sidebarItems = useMemo(() => {
// // // //     let list = activeTab === "pending" 
// // // //       ? purchaseOrders.filter(p => p.status === "pending" || !p.status)
// // // //       : distLogs;

// // // //     if (searchQuery.trim()) {
// // // //       const q = searchQuery.toLowerCase();
// // // //       list = list.filter(i => {
// // // //         const indentNo = (i.indentId?.indentNo || i.purchaseOrderId?.indentId?.indentNo || "").toLowerCase();
// // // //         const details = getStockDetails(i.stockItemId || i.items?.[0]?.stockItemId);
// // // //         return indentNo.includes(q) || details.name.toLowerCase().includes(q) || details.group.toLowerCase().includes(q);
// // // //       });
// // // //     }
// // // //     return list;
// // // //   }, [activeTab, purchaseOrders, distLogs, searchQuery, getStockDetails]);

// // // //   const updateAllocation = (tempId, field, value) => {
// // // //     if (activeTab === "completed") return;
// // // //     setAllocations((prev) => {
// // // //       const currentRow = prev.find(a => a.tempId === tempId);
// // // //       if (!currentRow) return prev;
// // // //       let newValue = field === "qtyBaseUnit" ? Number(value) : value;
// // // //       if (field === "qtyBaseUnit") {
// // // //         const otherRowsTotal = prev
// // // //           .filter(a => a.tempId !== tempId && String(a.stockItemId) === String(currentRow.stockItemId))
// // // //           .reduce((sum, a) => sum + (Number(a.qtyBaseUnit) || 0), 0);
// // // //         const currentAvailableLimit = currentRow.maxQty - otherRowsTotal;
// // // //         if (newValue > currentAvailableLimit) {
// // // //           toast.error(`Max ${currentAvailableLimit} available`);
// // // //           newValue = currentAvailableLimit;
// // // //         }
// // // //         if (newValue < 0) newValue = 0;
// // // //       }
// // // //       return prev.map((a) => (a.tempId === tempId ? { ...a, [field]: newValue } : a));
// // // //     });
// // // //   };

// // // //   const addAllocationRow = (index, baseAlloc) => {
// // // //     const newRow = { ...baseAlloc, tempId: `extra-${Math.random()}`, qtyBaseUnit: 0, godownId: "" };
// // // //     setAllocations(prev => {
// // // //       const updated = [...prev];
// // // //       updated.splice(index + 1, 0, newRow);
// // // //       return updated;
// // // //     });
// // // //   };

// // // //   const removeAllocationRow = (tempId) => {
// // // //     setAllocations(prev => prev.filter(a => a.tempId !== tempId));
// // // //   };

// // // //   const handleDistributionSubmit = async () => {
// // // //     const validAllocations = allocations.filter((a) => a.godownId && a.qtyBaseUnit > 0);
// // // //     if (validAllocations.length === 0) return toast.error("Assign destinations and quantities.");

// // // //     const stockItemIds = [...new Set(allocations.map(a => String(a.stockItemId)))];
// // // //     for (const sId of stockItemIds) {
// // // //       const firstRow = allocations.find(a => String(a.stockItemId) === sId);
// // // //       const totalAllocated = allocations
// // // //         .filter(a => String(a.stockItemId) === sId)
// // // //         .reduce((sum, a) => sum + (Number(a.qtyBaseUnit) || 0), 0);
      
// // // //       if (totalAllocated !== firstRow.maxQty) {
// // // //         const details = getStockDetails(sId);
// // // //         return toast.error(`Incomplete: Must distribute all ${firstRow.maxQty} of ${details.name}.`);
// // // //       }
// // // //     }

// // // //     try {
// // // //       setLoading(true);
// // // //       const payload = {
// // // //         purchaseOrderId: activeRecord._id,
// // // //         allocations: validAllocations.map(({ stockItemId, godownId, qtyBaseUnit, unitPrice }) => ({
// // // //           stockItemId, 
// // // //           godownId, 
// // // //           qtyBaseUnit,
// // // //           unitPrice,
// // // //           amount: qtyBaseUnit * unitPrice
// // // //         })),
// // // //         totalAmount: validAllocations.reduce((sum, a) => sum + (a.qtyBaseUnit * a.unitPrice), 0),
// // // //         leftovers: [] 
// // // //       };

// // // //       await api.post("/distributions", payload);
// // // //       toast.success("Inventory distributed successfully!");
// // // //       setSelectedId(null);
// // // //       await loadData(); 
// // // //     } catch (error) {
// // // //       toast.error(error.response?.data?.message || "Distribution failed");
// // // //     } finally {
// // // //       setLoading(false);
// // // //     }
// // // //   };

// // // //   const downloadAsExcel = (mode = "current") => {
// // // //     let dataToExport = [];
// // // //     let fileName = "";

// // // //     if (mode === "master") {
// // // //       if (!distLogs.length) return toast.error("No completed distributions found");
// // // //       const itemMap = {};
// // // //       distLogs.forEach(log => {
// // // //         (log.allocations || []).forEach(a => {
// // // //           const details = getStockDetails(a.stockItemId?._id || a.stockItemId);
// // // //           const godownName = getGodownName(a.godownId?._id || a.godownId);
// // // //           const key = details.name;
// // // //           if (!itemMap[key]) {
// // // //             itemMap[key] = {
// // // //               "Stock Item": details.name,
// // // //               "Stock Group": details.group,
// // // //               "Units": details.unit,
// // // //               "Unit Price": a.unitPrice || 0,
// // // //               "Total Quantity": 0
// // // //             };
// // // //           }
// // // //           itemMap[key][godownName] = (itemMap[key][godownName] || 0) + a.qtyBaseUnit;
// // // //           itemMap[key]["Total Quantity"] += a.qtyBaseUnit;
// // // //           itemMap[key]["Total Amount"] = itemMap[key]["Total Quantity"] * itemMap[key]["Unit Price"];
// // // //         });
// // // //       });
// // // //       dataToExport = Object.values(itemMap).map((row, index) => ({ "S.No": index + 1, ...row }));
// // // //       fileName = `Master_Inventory_Report_${new Date().toLocaleDateString().replace(/\//g, '_')}.xlsx`;
// // // //     } else {
// // // //       if (!allocations.length) return toast.error("No data to export");
// // // //       const currentItemMap = {};
// // // //       allocations.forEach(a => {
// // // //         const details = getStockDetails(a.stockItemId);
// // // //         const godownName = a.godownId ? getGodownName(a.godownId) : "Unassigned";
// // // //         const key = details.name;
// // // //         if (!currentItemMap[key]) {
// // // //           currentItemMap[key] = {
// // // //             "Stock Item": details.name,
// // // //             "Stock Group": details.group,
// // // //             "Units": details.unit,
// // // //             "Unit Price": a.unitPrice || 0,
// // // //             "Total Quantity": 0
// // // //           };
// // // //         }
// // // //         currentItemMap[key][godownName] = (currentItemMap[key][godownName] || 0) + a.qtyBaseUnit;
// // // //         currentItemMap[key]["Total Quantity"] += a.qtyBaseUnit;
// // // //         currentItemMap[key]["Total Amount"] = currentItemMap[key]["Total Quantity"] * currentItemMap[key]["Unit Price"];
// // // //       });
// // // //       dataToExport = Object.values(currentItemMap).map((row, index) => ({ "S.No": index + 1, ...row }));
// // // //       const ref = activeTab === 'completed' ? "Log" : "Pending";
// // // //       fileName = `Stock_Distribution_${ref}_${new Date().getTime()}.xlsx`;
// // // //     }

// // // //     const ws = XLSX.utils.json_to_sheet(dataToExport);
// // // //     ws['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, ...godowns.map(() => ({ wch: 15 }))];
// // // //     const wb = XLSX.utils.book_new();
// // // //     XLSX.utils.book_append_sheet(wb, ws, "Stock_Report");
// // // //     XLSX.writeFile(wb, fileName);
// // // //   };

// // // //   const styles = {
// // // //     container: { height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" },
// // // //     header: { padding: '16px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
// // // //     tabBtn: (active) => ({
// // // //         padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
// // // //         background: active ? '#6366f1' : 'transparent', color: active ? '#fff' : '#64748b', border: 'none'
// // // //     }),
// // // //     sidebar: { width: '350px', display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px' },
// // // //     canvas: { flex: 1, background: '#fff', borderRadius: '20px', margin: '20px 20px 20px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' },
// // // //     card: (sel) => ({
// // // //         padding: '14px', borderRadius: '12px', cursor: 'pointer', background: sel ? '#fff' : 'transparent',
// // // //         border: sel ? '1px solid #6366f1' : '1px solid transparent', boxShadow: sel ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
// // // //     }),
// // // //     badge: { display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', background: '#f1f5f9', color: '#64748b', marginTop: '4px' }
// // // //   };

// // // //   return (
// // // //     <div style={styles.container}>
// // // //       <div style={styles.header}>
// // // //         <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Stock <span style={{ color: '#6366f1' }}>Distribution</span></h1>
        
// // // //         <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
// // // //           <button onClick={() => downloadAsExcel("master")} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
// // // //             <Download size={14} /> Master Report
// // // //           </button>

// // // //           <div style={{ display: 'flex', background: '#f8fafc', padding: '4px', borderRadius: '10px' }}>
// // // //             {["pending", "completed"].map(t => (
// // // //               <button key={t} onClick={() => {setActiveTab(t); setSelectedId(null);}} style={styles.tabBtn(activeTab === t)}>
// // // //                 {t.charAt(0).toUpperCase() + t.slice(1)}
// // // //               </button>
// // // //             ))}
// // // //           </div>
// // // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // //             <Search size={14} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
// // // //             <input type="text" placeholder="Search item or group..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 8px 8px 30px', fontSize: '12px' }} />
// // // //           </div>
// // // //         </div>
// // // //       </div>

// // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
// // // //         <div style={styles.sidebar}>
// // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // //             {sidebarItems.map(item => (
// // // //               <div key={item._id} onClick={() => setSelectedId(item._id)} style={styles.card(selectedId === item._id)}>
// // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // //                   <div style={{ fontWeight: '700', fontSize: '13px', color: selectedId === item._id ? '#6366f1' : '#1e293b' }}>
// // // //                     {item.indentId?.indentNo || item.purchaseOrderId?.indentId?.indentNo || getStockDetails(item.stockItemId).name}
// // // //                   </div>
// // // //                   <ChevronRight size={14} color="#cbd5e1" />
// // // //                 </div>
// // // //                 <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
// // // //                     {activeTab === 'completed' 
// // // //                       ? `Distributed: ${new Date(item.createdAt).toLocaleDateString()}` 
// // // //                       : `${item.items?.filter(i => (i.receivedQty || 0) > 0).length || 0} items pending`}
// // // //                 </div>
// // // //               </div>
// // // //             ))}
// // // //           </div>
// // // //         </div>

// // // //         <div style={styles.canvas}>
// // // //           {activeRecord ? (
// // // //             <>
// // // //               <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9' }}>
// // // //                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
// // // //                   <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>
// // // //                     {activeRecord.indentId?.indentNo || activeRecord.purchaseOrderId?.indentId?.indentNo || "Distribution View"}
// // // //                   </h2>
// // // //                   <div style={{ display: 'flex', gap: '10px' }}>
// // // //                     <button onClick={() => downloadAsExcel("current")} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
// // // //                       <Download size={14} /> Export Current
// // // //                     </button>
// // // //                     {activeTab !== 'completed' && (
// // // //                       <button onClick={handleDistributionSubmit} disabled={loading} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
// // // //                           {loading ? "Saving..." : "Distribute"}
// // // //                       </button>
// // // //                     )}
// // // //                   </div>
// // // //                 </div>
// // // //               </div>

// // // //               <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
// // // //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // //                   <thead>
// // // //                     <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // //                       <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8' }}>ITEM & GROUP</th>
// // // //                       <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8' }}>DESTINATION</th>
// // // //                       <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>QUANTITY</th>
// // // //                       <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>AMOUNT</th>
// // // //                       <th style={{ padding: '12px' }}></th>
// // // //                     </tr>
// // // //                   </thead>
// // // //                   <tbody>
// // // //                     {allocations.map((alloc, idx) => {
// // // //                       const details = getStockDetails(alloc.stockItemId);
// // // //                       const isSubRow = idx > 0 && String(allocations[idx-1].stockItemId) === String(alloc.stockItemId);
// // // //                       const currentItemAllocations = allocations.filter(a => String(a.stockItemId) === String(alloc.stockItemId));
// // // //                       const totalAllocated = currentItemAllocations.reduce((sum, a) => sum + (Number(a.qtyBaseUnit) || 0), 0);
// // // //                       const remaining = alloc.maxQty - totalAllocated;
// // // //                       const rowAmount = (Number(alloc.qtyBaseUnit) || 0) * (Number(alloc.unitPrice) || 0);

// // // //                       return (
// // // //                         <tr key={alloc.tempId} style={{ borderBottom: '1px solid #f8fafc' }}>
// // // //                           <td style={{ padding: '16px 12px' }}>
// // // //                             {!isSubRow ? (
// // // //                               <>
// // // //                                 <div style={{ fontWeight: '700', fontSize: '13px' }}>{details.name}</div>
// // // //                                 <div style={styles.badge}>{details.group}</div>
// // // //                                 <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>Total to Distribute: {alloc.maxQty} {details.unit}</div>
// // // //                                 <div style={{ fontSize: '10px', fontWeight: 'bold', color: remaining === 0 ? '#10b981' : '#ef4444', marginTop: '2px' }}>
// // // //                                   {remaining === 0 ? '✓ Balanced' : `Pending: ${remaining} ${details.unit}`}
// // // //                                 </div>
// // // //                               </>
// // // //                             ) : <div style={{ fontSize: '10px', color: '#6366f1', paddingLeft: '12px' }}>↳ Split Allocation</div>}
// // // //                           </td>
// // // //                           <td style={{ padding: '16px 12px' }}>
// // // //                             {activeTab === 'completed' ? getGodownName(alloc.godownId) : (
// // // //                               <select value={alloc.godownId} onChange={(e) => updateAllocation(alloc.tempId, "godownId", e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', width: '180px', fontSize: '12px' }}>
// // // //                                 <option value="">Select Godown</option>
// // // //                                 {godowns.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
// // // //                               </select>
// // // //                             )}
// // // //                           </td>
// // // //                           <td style={{ padding: '16px 12px', textAlign: 'center' }}>
// // // //                             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
// // // //                               {activeTab === 'completed' ? alloc.qtyBaseUnit : (
// // // //                                 <input type="number" value={alloc.qtyBaseUnit} onChange={(e) => updateAllocation(alloc.tempId, "qtyBaseUnit", e.target.value)} style={{ width: '65px', padding: '4px', border: '1px solid #e2e8f0', borderRadius: '4px', textAlign: 'center', fontSize: '12px' }} />
// // // //                               )}
// // // //                               <span style={{ fontSize: '11px', color: '#64748b' }}>{details.unit}</span>
// // // //                             </div>
// // // //                           </td>
// // // //                           {/* NEW AMOUNT COLUMN */}
// // // //                           <td style={{ padding: '16px 12px', textAlign: 'right' }}>
// // // //                             <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>
// // // //                               ₹{rowAmount.toLocaleString()}
// // // //                             </div>
// // // //                             <div style={{ fontSize: '10px', color: '#94a3b8' }}>
// // // //                               @ ₹{alloc.unitPrice}/{details.unit}
// // // //                             </div>
// // // //                           </td>
// // // //                           <td style={{ padding: '16px 12px', textAlign: 'right' }}>
// // // //                             {activeTab !== 'completed' && (
// // // //                               <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
// // // //                                 <Plus size={16} color="#6366f1" onClick={() => addAllocationRow(idx, alloc)} style={{ cursor: 'pointer' }} />
// // // //                                 {isSubRow && <Trash2 size={16} color="#ef4444" onClick={() => removeAllocationRow(alloc.tempId)} style={{ cursor: 'pointer' }} />}
// // // //                               </div>
// // // //                             )}
// // // //                           </td>
// // // //                         </tr>
// // // //                       );
// // // //                     })}
// // // //                   </tbody>
// // // //                 </table>
// // // //               </div>
// // // //             </>
// // // //           ) : (
// // // //             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// // // //               <Layers size={40} style={{ marginBottom: '10px', opacity: 0.3 }} />
// // // //               <div style={{ fontSize: '13px' }}>Select an indent or PO to distribute stock</div>
// // // //             </div>
// // // //           )}
// // // //         </div>
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // };




// // // 11















import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "../api.js";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import { 
  Search, 
  ChevronRight, 
  Layers, 
  Plus, 
  Trash2,
  Download 
} from "lucide-react";

export const StockDistributionPage = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [distLogs, setDistLogs] = useState([]);

  const [activeTab, setActiveTab] = useState("pending"); 
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [allocations, setAllocations] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [poRes, godownRes, stockRes, logRes] = await Promise.all([
        api.get("/purchase-orders"),
        api.get("/inventory/godowns"),
        api.get("/inventory/stock-items"),
        api.get("/distributions/logs"), 
      ]);
      
      const validPOs = (poRes.data || []).filter(po => 
        po.items?.some(it => (it.receivedQty || 0) > 0)
      );

      setPurchaseOrders(validPOs);
      setGodowns(godownRes.data || []);
      setStockItems(stockRes.data || []);
      setDistLogs(logRes.data || []);
    } catch (error) {
      toast.error("Failed to sync inventory data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getStockDetails = useCallback((id) => {
    const item = stockItems.find((s) => String(s._id) === String(id));
    if (!item) return { name: "Unknown Item", unit: "-", group: "General" };
    const unitSymbol = item.unitId?.symbol || item.unitId?.name || item.unit || "unit";
    const groupName = item.categoryId?.name || item.stockGroupId?.name || "General";
    return { name: item.name, unit: unitSymbol, group: groupName };
  }, [stockItems]);

  const getGodownName = (id) => {
    const godown = godowns.find(g => String(g._id) === String(id));
    return godown ? godown.name : "Not Assigned";
  };

  const activeRecord = useMemo(() => {
    if (!selectedId) return null;
    if (activeTab === "completed") return distLogs.find(d => d._id === selectedId);
    return purchaseOrders.find(p => p._id === selectedId);
  }, [selectedId, activeTab, purchaseOrders, distLogs]);

  useEffect(() => {
    if (!activeRecord) {
      setAllocations([]);
      return;
    }

    if (activeTab === "completed") {
      setAllocations((activeRecord.allocations || []).map((it, idx) => ({
        tempId: `log-${it._id || idx}`,
        stockItemId: it.stockItemId?._id || it.stockItemId,
        godownId: it.godownId?._id || it.godownId || "",
        qtyBaseUnit: it.qtyBaseUnit,
        unitPrice: it.unitPrice || 0,
        maxQty: it.qtyBaseUnit, 
        isLog: true
      })));
      return;
    }

    if (activeTab === "pending") {
      const filteredItems = activeRecord.items.filter(it => (it.receivedQty || 0) > 0);
      setAllocations(filteredItems.map((it, idx) => ({
        tempId: `po-${idx}`,
        stockItemId: it.stockItemId?._id || it.stockItemId,
        godownId: "",
        qtyBaseUnit: 0,
        unitPrice: it.unitPrice || 0,
        maxQty: it.receivedQty || 0,
      })));
    }
  }, [activeRecord, activeTab]);

  const sidebarItems = useMemo(() => {
    let list = activeTab === "pending" 
      ? purchaseOrders.filter(p => p.status === "pending" || !p.status)
      : distLogs;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => {
        const indentNo = (i.indentId?.indentNo || i.purchaseOrderId?.indentId?.indentNo || "").toLowerCase();
        const details = getStockDetails(i.stockItemId || i.items?.[0]?.stockItemId);
        return indentNo.includes(q) || details.name.toLowerCase().includes(q) || details.group.toLowerCase().includes(q);
      });
    }
    return list;
  }, [activeTab, purchaseOrders, distLogs, searchQuery, getStockDetails]);

  const updateAllocation = (tempId, field, value) => {
    if (activeTab === "completed") return;
    setAllocations((prev) => {
      const currentRow = prev.find(a => a.tempId === tempId);
      if (!currentRow) return prev;
      let newValue = field === "qtyBaseUnit" ? Number(value) : value;
      if (field === "qtyBaseUnit") {
        const otherRowsTotal = prev
          .filter(a => a.tempId !== tempId && String(a.stockItemId) === String(currentRow.stockItemId))
          .reduce((sum, a) => sum + (Number(a.qtyBaseUnit) || 0), 0);
        const currentAvailableLimit = currentRow.maxQty - otherRowsTotal;
        if (newValue > currentAvailableLimit) {
          toast.error(`Max ${currentAvailableLimit} available`);
          newValue = currentAvailableLimit;
        }
        if (newValue < 0) newValue = 0;
      }
      return prev.map((a) => (a.tempId === tempId ? { ...a, [field]: newValue } : a));
    });
  };

  const addAllocationRow = (index, baseAlloc) => {
    const newRow = { ...baseAlloc, tempId: `extra-${Math.random()}`, qtyBaseUnit: 0, godownId: "" };
    setAllocations(prev => {
      const updated = [...prev];
      updated.splice(index + 1, 0, newRow);
      return updated;
    });
  };

  const removeAllocationRow = (tempId) => {
    setAllocations(prev => prev.filter(a => a.tempId !== tempId));
  };

  const handleDistributionSubmit = async () => {
    const validAllocations = allocations.filter((a) => a.godownId && a.qtyBaseUnit > 0);
    if (validAllocations.length === 0) return toast.error("Assign destinations and quantities.");

    const stockItemIds = [...new Set(allocations.map(a => String(a.stockItemId)))];
    for (const sId of stockItemIds) {
      const firstRow = allocations.find(a => String(a.stockItemId) === sId);
      const totalAllocated = allocations
        .filter(a => String(a.stockItemId) === sId)
        .reduce((sum, a) => sum + (Number(a.qtyBaseUnit) || 0), 0);
      
      if (totalAllocated !== firstRow.maxQty) {
        const details = getStockDetails(sId);
        return toast.error(`Incomplete: Must distribute all ${firstRow.maxQty} of ${details.name}.`);
      }
    }

    try {
      setLoading(true);
      const payload = {
        purchaseOrderId: activeRecord._id,
        allocations: validAllocations.map(({ stockItemId, godownId, qtyBaseUnit, unitPrice }) => ({
          stockItemId, 
          godownId, 
          qtyBaseUnit,
          unitPrice // Sending price to backend for historical tracking
        })),
        leftovers: [] 
      };

      await api.post("/distributions", payload);
      toast.success("Inventory distributed successfully!");
      setSelectedId(null);
      await loadData(); 
    } catch (error) {
      toast.error(error.response?.data?.message || "Distribution failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadAsExcel = (mode = "current") => {
    let dataToExport = [];
    let fileName = "";

    if (mode === "master") {
      if (!distLogs.length) return toast.error("No completed distributions found");
      const itemMap = {};
      distLogs.forEach(log => {
        (log.allocations || []).forEach(a => {
          const details = getStockDetails(a.stockItemId?._id || a.stockItemId);
          const godownName = getGodownName(a.godownId?._id || a.godownId);
          const key = details.name;
          if (!itemMap[key]) {
            itemMap[key] = {
              "Stock Item": details.name,
              "Stock Group": details.group,
              "Unit Price": a.unitPrice || 0,
              "Units": details.unit,
              "Total Quantity": 0,
              "Total Valuation": 0
            };
          }
          itemMap[key][godownName] = (itemMap[key][godownName] || 0) + a.qtyBaseUnit;
          itemMap[key]["Total Quantity"] += a.qtyBaseUnit;
          itemMap[key]["Total Valuation"] += (a.qtyBaseUnit * (a.unitPrice || 0));
        });
      });
      dataToExport = Object.values(itemMap).map((row, index) => ({ "S.No": index + 1, ...row }));
      fileName = `Master_Inventory_Valuation_${new Date().toLocaleDateString().replace(/\//g, '_')}.xlsx`;
    } else {
      if (!allocations.length) return toast.error("No data to export");
      dataToExport = allocations.map((a, idx) => {
        const details = getStockDetails(a.stockItemId);
        return {
          "S.No": idx + 1,
          "Item": details.name,
          "Group": details.group,
          "Destination": getGodownName(a.godownId),
          "Quantity": a.qtyBaseUnit,
          "Unit": details.unit,
          "Unit Price": a.unitPrice || 0,
          "Total Amount": (a.qtyBaseUnit * (a.unitPrice || 0))
        };
      });
      const ref = activeTab === 'completed' ? "Log" : "Pending";
      fileName = `Stock_Distribution_Amount_${ref}_${new Date().getTime()}.xlsx`;
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financial_Report");
    XLSX.writeFile(wb, fileName);
  };

  const styles = {
    container: { height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" },
    header: { padding: '16px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    tabBtn: (active) => ({
        padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
        background: active ? '#6366f1' : 'transparent', color: active ? '#fff' : '#64748b', border: 'none'
    }),
    sidebar: { width: '350px', display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px' },
    canvas: { flex: 1, background: '#fff', borderRadius: '20px', margin: '20px 20px 20px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' },
    card: (sel) => ({
        padding: '14px', borderRadius: '12px', cursor: 'pointer', background: sel ? '#fff' : 'transparent',
        border: sel ? '1px solid #6366f1' : '1px solid transparent', boxShadow: sel ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
    }),
    badge: { display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', background: '#f1f5f9', color: '#64748b', marginTop: '4px' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Stock <span style={{ color: '#6366f1' }}>Distribution</span></h1>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={() => downloadAsExcel("master")} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
            <Download size={14} /> Valuation Report
          </button>

          <div style={{ display: 'flex', background: '#f8fafc', padding: '4px', borderRadius: '10px' }}>
            {["pending", "completed"].map(t => (
              <button key={t} onClick={() => {setActiveTab(t); setSelectedId(null);}} style={styles.tabBtn(activeTab === t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 8px 8px 30px', fontSize: '12px' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={styles.sidebar}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sidebarItems.map(item => (
              <div key={item._id} onClick={() => setSelectedId(item._id)} style={styles.card(selectedId === item._id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: selectedId === item._id ? '#6366f1' : '#1e293b' }}>
                    {item.indentId?.indentNo || item.purchaseOrderId?.indentId?.indentNo || getStockDetails(item.stockItemId).name}
                  </div>
                  <ChevronRight size={14} color="#cbd5e1" />
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    {activeTab === 'completed' 
                      ? `Distributed: ${new Date(item.createdAt).toLocaleDateString()}` 
                      : `${item.items?.filter(i => (i.receivedQty || 0) > 0).length || 0} items pending`}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.canvas}>
          {activeRecord ? (
            <>
              <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>
                    {activeRecord.indentId?.indentNo || activeRecord.purchaseOrderId?.indentId?.indentNo || "Distribution View"}
                  </h2>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => downloadAsExcel("current")} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                      <Download size={14} /> Export Amount
                    </button>
                    {activeTab !== 'completed' && (
                      <button onClick={handleDistributionSubmit} disabled={loading} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                          {loading ? "Saving..." : "Distribute"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
                      <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8' }}>ITEM & GROUP</th>
                      <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8' }}>DESTINATION</th>
                      <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>QUANTITY</th>
                      <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>AMOUNT</th>
                      <th style={{ padding: '12px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map((alloc, idx) => {
                      const details = getStockDetails(alloc.stockItemId);
                      const isSubRow = idx > 0 && String(allocations[idx-1].stockItemId) === String(alloc.stockItemId);
                      const currentItemAllocations = allocations.filter(a => String(a.stockItemId) === String(alloc.stockItemId));
                      const totalAllocated = currentItemAllocations.reduce((sum, a) => sum + (Number(a.qtyBaseUnit) || 0), 0);
                      const remaining = alloc.maxQty - totalAllocated;
                      const rowAmount = (alloc.qtyBaseUnit * (alloc.unitPrice || 0));

                      return (
                        <tr key={alloc.tempId} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '16px 12px' }}>
                            {!isSubRow ? (
                              <>
                                <div style={{ fontWeight: '700', fontSize: '13px' }}>{details.name}</div>
                                <div style={styles.badge}>{details.group}</div>
                                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>Rate: ₹{alloc.unitPrice} / {details.unit}</div>
                                <div style={{ fontSize: '10px', fontWeight: 'bold', color: remaining === 0 ? '#10b981' : '#ef4444', marginTop: '2px' }}>
                                  {remaining === 0 ? '✓ Balanced' : `Pending: ${remaining} ${details.unit}`}
                                </div>
                              </>
                            ) : <div style={{ fontSize: '10px', color: '#6366f1', paddingLeft: '12px' }}>↳ Split Allocation</div>}
                          </td>
                          <td style={{ padding: '16px 12px' }}>
                            {activeTab === 'completed' ? getGodownName(alloc.godownId) : (
                              <select value={alloc.godownId} onChange={(e) => updateAllocation(alloc.tempId, "godownId", e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', width: '180px', fontSize: '12px' }}>
                                <option value="">Select Godown</option>
                                {godowns.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
                              </select>
                            )}
                          </td>
                          <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              {activeTab === 'completed' ? alloc.qtyBaseUnit : (
                                <input type="number" value={alloc.qtyBaseUnit} onChange={(e) => updateAllocation(alloc.tempId, "qtyBaseUnit", e.target.value)} style={{ width: '65px', padding: '4px', border: '1px solid #e2e8f0', borderRadius: '4px', textAlign: 'center', fontSize: '12px' }} />
                              )}
                              <span style={{ fontSize: '11px', color: '#64748b' }}>{details.unit}</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: '800', color: '#1e293b', fontSize: '13px' }}>
                            ₹{rowAmount.toLocaleString()}
                          </td>
                          <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                            {activeTab !== 'completed' && (
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <Plus size={16} color="#6366f1" onClick={() => addAllocationRow(idx, alloc)} style={{ cursor: 'pointer' }} />
                                {isSubRow && <Trash2 size={16} color="#ef4444" onClick={() => removeAllocationRow(alloc.tempId)} style={{ cursor: 'pointer' }} />}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Total Distribution Value Footer */}
              <div style={{ padding: '16px 32px', borderTop: '2px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '20px', background: '#f8fafc' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '900', letterSpacing: '0.05em' }}>TOTAL DISTRIBUTION VALUE</div>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: '#6366f1' }}>
                    ₹{allocations.reduce((sum, a) => sum + (a.qtyBaseUnit * (a.unitPrice || 0)), 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              <Layers size={40} style={{ marginBottom: '10px', opacity: 0.3 }} />
              <div style={{ fontSize: '13px' }}>Select an indent or PO to distribute stock</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};







// import { useEffect, useMemo, useState, useCallback } from "react";
// import { api } from "../api.js";
// import { toast } from "react-hot-toast";
// import * as XLSX from "xlsx";
// import { 
//   Search, 
//   ChevronRight, 
//   Layers, 
//   Plus, 
//   Trash2,
//   Download 
// } from "lucide-react";

// export const StockDistributionPage = () => {
//   const [purchaseOrders, setPurchaseOrders] = useState([]);
//   const [godowns, setGodowns] = useState([]);
//   const [stockItems, setStockItems] = useState([]);
//   const [distLogs, setDistLogs] = useState([]);

//   const [activeTab, setActiveTab] = useState("pending"); 
//   const [selectedId, setSelectedId] = useState(null);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [allocations, setAllocations] = useState([]);

//   const loadData = useCallback(async () => {
//     setLoading(true);
//     try {
//       const [poRes, godownRes, stockRes, logRes] = await Promise.all([
//         api.get("/purchase-orders"),
//         api.get("/inventory/godowns"),
//         api.get("/inventory/stock-items"),
//         api.get("/distributions/logs"), 
//       ]);
      
//       const validPOs = (poRes.data || []).filter(po => 
//         po.items?.some(it => (it.receivedQty || 0) > 0)
//       );

//       setPurchaseOrders(validPOs);
//       setGodowns(godownRes.data || []);
//       setStockItems(stockRes.data || []);
//       setDistLogs(logRes.data || []);
//     } catch (error) {
//       toast.error("Failed to sync inventory data");
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => { loadData(); }, [loadData]);

//   const getStockDetails = useCallback((id) => {
//     const item = stockItems.find((s) => String(s._id) === String(id));
//     if (!item) return { name: "Unknown Item", unit: "-", group: "General" };
//     const unitSymbol = item.unitId?.symbol || item.unitId?.name || item.unit || "unit";
//     const groupName = item.categoryId?.name || item.stockGroupId?.name || "General";
//     return { name: item.name, unit: unitSymbol, group: groupName };
//   }, [stockItems]);

//   const getGodownName = (id) => {
//     const godown = godowns.find(g => String(g._id) === String(id));
//     return godown ? godown.name : "Not Assigned";
//   };

//   const activeRecord = useMemo(() => {
//     if (!selectedId) return null;
//     if (activeTab === "completed") return distLogs.find(d => d._id === selectedId);
//     return purchaseOrders.find(p => p._id === selectedId);
//   }, [selectedId, activeTab, purchaseOrders, distLogs]);

//   useEffect(() => {
//     if (!activeRecord) {
//       setAllocations([]);
//       return;
//     }

//     if (activeTab === "completed") {
//       setAllocations((activeRecord.allocations || []).map((it, idx) => ({
//         tempId: `log-${it._id || idx}`,
//         stockItemId: it.stockItemId?._id || it.stockItemId,
//         godownId: it.godownId?._id || it.godownId || "",
//         qtyBaseUnit: it.qtyBaseUnit,
//         unitPrice: it.unitPrice || 0,
//         maxQty: it.qtyBaseUnit, 
//         isLog: true
//       })));
//       return;
//     }

//     if (activeTab === "pending") {
//       const filteredItems = activeRecord.items.filter(it => (it.receivedQty || 0) > 0);
//       setAllocations(filteredItems.map((it, idx) => ({
//         tempId: `po-${idx}`,
//         stockItemId: it.stockItemId?._id || it.stockItemId,
//         godownId: "",
//         qtyBaseUnit: 0,
//         unitPrice: it.unitPrice || 0,
//         maxQty: it.receivedQty || 0,
//       })));
//     }
//   }, [activeRecord, activeTab]);

//   const sidebarItems = useMemo(() => {
//     let list = activeTab === "pending" 
//       ? purchaseOrders.filter(p => p.status === "pending" || !p.status)
//       : distLogs;

//     if (searchQuery.trim()) {
//       const q = searchQuery.toLowerCase();
//       list = list.filter(i => {
//         const indentNo = (i.indentId?.indentNo || i.purchaseOrderId?.indentId?.indentNo || "").toLowerCase();
//         const details = getStockDetails(i.stockItemId || i.items?.[0]?.stockItemId);
//         return indentNo.includes(q) || details.name.toLowerCase().includes(q) || details.group.toLowerCase().includes(q);
//       });
//     }
//     return list;
//   }, [activeTab, purchaseOrders, distLogs, searchQuery, getStockDetails]);

//   const updateAllocation = (tempId, field, value) => {
//     if (activeTab === "completed") return;
//     setAllocations((prev) => {
//       const currentRow = prev.find(a => a.tempId === tempId);
//       if (!currentRow) return prev;
//       let newValue = field === "qtyBaseUnit" ? Number(value) : value;
//       if (field === "qtyBaseUnit") {
//         const otherRowsTotal = prev
//           .filter(a => a.tempId !== tempId && String(a.stockItemId) === String(currentRow.stockItemId))
//           .reduce((sum, a) => sum + (Number(a.qtyBaseUnit) || 0), 0);
//         const currentAvailableLimit = currentRow.maxQty - otherRowsTotal;
//         if (newValue > currentAvailableLimit) {
//           toast.error(`Max ${currentAvailableLimit} available`);
//           newValue = currentAvailableLimit;
//         }
//         if (newValue < 0) newValue = 0;
//       }
//       return prev.map((a) => (a.tempId === tempId ? { ...a, [field]: newValue } : a));
//     });
//   };

//   const addAllocationRow = (index, baseAlloc) => {
//     const newRow = { ...baseAlloc, tempId: `extra-${Math.random()}`, qtyBaseUnit: 0, godownId: "" };
//     setAllocations(prev => {
//       const updated = [...prev];
//       updated.splice(index + 1, 0, newRow);
//       return updated;
//     });
//   };

//   const removeAllocationRow = (tempId) => {
//     setAllocations(prev => prev.filter(a => a.tempId !== tempId));
//   };

//   const handleDistributionSubmit = async () => {
//     const validAllocations = allocations.filter((a) => a.godownId && a.qtyBaseUnit > 0);
//     if (validAllocations.length === 0) return toast.error("Assign destinations and quantities.");

//     const stockItemIds = [...new Set(allocations.map(a => String(a.stockItemId)))];
//     for (const sId of stockItemIds) {
//       const firstRow = allocations.find(a => String(a.stockItemId) === sId);
//       const totalAllocated = allocations
//         .filter(a => String(a.stockItemId) === sId)
//         .reduce((sum, a) => sum + (Number(a.qtyBaseUnit) || 0), 0);
      
//       if (totalAllocated !== firstRow.maxQty) {
//         const details = getStockDetails(sId);
//         return toast.error(`Incomplete: Must distribute all ${firstRow.maxQty} of ${details.name}.`);
//       }
//     }

//     try {
//       setLoading(true);
//       const payload = {
//         purchaseOrderId: activeRecord._id,
//         allocations: validAllocations.map(({ stockItemId, godownId, qtyBaseUnit, unitPrice }) => ({
//           stockItemId, 
//           godownId, 
//           qtyBaseUnit,
//           unitPrice 
//         })),
//         leftovers: [] 
//       };

//       await api.post("/distributions", payload);
//       toast.success("Inventory distributed successfully!");
//       setSelectedId(null);
//       await loadData(); 
//     } catch (error) {
//       toast.error(error.response?.data?.message || "Distribution failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const downloadAsExcel = (mode = "current") => {
//     let dataToExport = [];
//     let fileName = "";

//     // Helper to generate dynamic columns for godowns
//     const itemMap = {};
//     const godownColumns = godowns.reduce((acc, g) => {
//       acc[g.name] = 0;
//       return acc;
//     }, {});

//     if (mode === "master") {
//       if (!distLogs.length) return toast.error("No completed distributions found");
      
//       distLogs.forEach(log => {
//         (log.allocations || []).forEach(a => {
//           const details = getStockDetails(a.stockItemId?._id || a.stockItemId);
//           const godownName = getGodownName(a.godownId?._id || a.godownId);
//           const key = details.name;

//           if (!itemMap[key]) {
//             itemMap[key] = {
//               "Stock Item": details.name,
//               "Stock Group": details.group,
//               "Unit Price": a.unitPrice || 0,
//               "Units": details.unit,
//               ...godownColumns, // Initialize all godown columns with 0
//               "Total Quantity": 0,
//               "Total Valuation": 0
//             };
//           }
//           itemMap[key][godownName] = (itemMap[key][godownName] || 0) + a.qtyBaseUnit;
//           itemMap[key]["Total Quantity"] += a.qtyBaseUnit;
//           itemMap[key]["Total Valuation"] += (a.qtyBaseUnit * (a.unitPrice || 0));
//         });
//       });
//       dataToExport = Object.values(itemMap).map((row, index) => ({ "S.No": index + 1, ...row }));
//       fileName = `Master_Inventory_Valuation_${new Date().toLocaleDateString().replace(/\//g, '_')}.xlsx`;
//     } else {
//       if (!allocations.length) return toast.error("No data to export");
      
//       allocations.forEach((a) => {
//         const details = getStockDetails(a.stockItemId);
//         const godownName = getGodownName(a.godownId);
//         const key = details.name;

//         if (!itemMap[key]) {
//           itemMap[key] = {
//             "Item": details.name,
//             "Group": details.group,
//             "Unit Price": a.unitPrice || 0,
//             "Unit": details.unit,
//             ...godownColumns,
//             "Total Qty": 0,
//             "Total Amount": 0
//           };
//         }
//         if(godownName !== "Not Assigned") {
//             itemMap[key][godownName] = (itemMap[key][godownName] || 0) + a.qtyBaseUnit;
//         }
//         itemMap[key]["Total Qty"] += a.qtyBaseUnit;
//         itemMap[key]["Total Amount"] += (a.qtyBaseUnit * (a.unitPrice || 0));
//       });

//       dataToExport = Object.values(itemMap).map((row, index) => ({ "S.No": index + 1, ...row }));
//       const ref = activeTab === 'completed' ? "Log" : "Pending";
//       fileName = `Stock_Distribution_${ref}_${new Date().getTime()}.xlsx`;
//     }

//     const ws = XLSX.utils.json_to_sheet(dataToExport);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "Financial_Report");
//     XLSX.writeFile(wb, fileName);
//   };

//   const styles = {
//     container: { height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" },
//     header: { padding: '16px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
//     tabBtn: (active) => ({
//         padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
//         background: active ? '#6366f1' : 'transparent', color: active ? '#fff' : '#64748b', border: 'none'
//     }),
//     sidebar: { width: '350px', display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px' },
//     canvas: { flex: 1, background: '#fff', borderRadius: '20px', margin: '20px 20px 20px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' },
//     card: (sel) => ({
//         padding: '14px', borderRadius: '12px', cursor: 'pointer', background: sel ? '#fff' : 'transparent',
//         border: sel ? '1px solid #6366f1' : '1px solid transparent', boxShadow: sel ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
//     }),
//     badge: { display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', background: '#f1f5f9', color: '#64748b', marginTop: '4px' }
//   };

//   return (
//     <div style={styles.container}>
//       <div style={styles.header}>
//         <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Stock <span style={{ color: '#6366f1' }}>Distribution</span></h1>
        
//         <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
//           <button onClick={() => downloadAsExcel("master")} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
//             <Download size={14} /> Valuation Report
//           </button>

//           <div style={{ display: 'flex', background: '#f8fafc', padding: '4px', borderRadius: '10px' }}>
//             {["pending", "completed"].map(t => (
//               <button key={t} onClick={() => {setActiveTab(t); setSelectedId(null);}} style={styles.tabBtn(activeTab === t)}>
//                 {t.charAt(0).toUpperCase() + t.slice(1)}
//               </button>
//             ))}
//           </div>
//           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
//             <Search size={14} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
//             <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 8px 8px 30px', fontSize: '12px' }} />
//           </div>
//         </div>
//       </div>

//       <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
//         <div style={styles.sidebar}>
//           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
//             {sidebarItems.map(item => (
//               <div key={item._id} onClick={() => setSelectedId(item._id)} style={styles.card(selectedId === item._id)}>
//                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//                   <div style={{ fontWeight: '700', fontSize: '13px', color: selectedId === item._id ? '#6366f1' : '#1e293b' }}>
//                     {item.indentId?.indentNo || item.purchaseOrderId?.indentId?.indentNo || getStockDetails(item.stockItemId).name}
//                   </div>
//                   <ChevronRight size={14} color="#cbd5e1" />
//                 </div>
//                 <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
//                     {activeTab === 'completed' 
//                       ? `Distributed: ${new Date(item.createdAt).toLocaleDateString()}` 
//                       : `${item.items?.filter(i => (i.receivedQty || 0) > 0).length || 0} items pending`}
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>

//         <div style={styles.canvas}>
//           {activeRecord ? (
//             <>
//               <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9' }}>
//                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
//                   <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>
//                     {activeRecord.indentId?.indentNo || activeRecord.purchaseOrderId?.indentId?.indentNo || "Distribution View"}
//                   </h2>
//                   <div style={{ display: 'flex', gap: '10px' }}>
//                     <button onClick={() => downloadAsExcel("current")} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
//                       <Download size={14} /> Export Table
//                     </button>
//                     {activeTab !== 'completed' && (
//                       <button onClick={handleDistributionSubmit} disabled={loading} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
//                           {loading ? "Saving..." : "Distribute"}
//                       </button>
//                     )}
//                   </div>
//                 </div>
//               </div>

//               <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
//                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//                   <thead>
//                     <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
//                       <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8' }}>ITEM & GROUP</th>
//                       <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8' }}>DESTINATION</th>
//                       <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>QUANTITY</th>
//                       <th style={{ padding: '12px', fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>AMOUNT</th>
//                       <th style={{ padding: '12px' }}></th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {allocations.map((alloc, idx) => {
//                       const details = getStockDetails(alloc.stockItemId);
//                       const isSubRow = idx > 0 && String(allocations[idx-1].stockItemId) === String(alloc.stockItemId);
//                       const currentItemAllocations = allocations.filter(a => String(a.stockItemId) === String(alloc.stockItemId));
//                       const totalAllocated = currentItemAllocations.reduce((sum, a) => sum + (Number(a.qtyBaseUnit) || 0), 0);
//                       const remaining = alloc.maxQty - totalAllocated;
//                       const rowAmount = (alloc.qtyBaseUnit * (alloc.unitPrice || 0));

//                       return (
//                         <tr key={alloc.tempId} style={{ borderBottom: '1px solid #f8fafc' }}>
//                           <td style={{ padding: '16px 12px' }}>
//                             {!isSubRow ? (
//                               <>
//                                 <div style={{ fontWeight: '700', fontSize: '13px' }}>{details.name}</div>
//                                 <div style={styles.badge}>{details.group}</div>
//                                 <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>Rate: ₹{alloc.unitPrice} / {details.unit}</div>
//                                 <div style={{ fontSize: '10px', fontWeight: 'bold', color: remaining === 0 ? '#10b981' : '#ef4444', marginTop: '2px' }}>
//                                   {remaining === 0 ? '✓ Balanced' : `Pending: ${remaining} ${details.unit}`}
//                                 </div>
//                               </>
//                             ) : <div style={{ fontSize: '10px', color: '#6366f1', paddingLeft: '12px' }}>↳ Split Allocation</div>}
//                           </td>
//                           <td style={{ padding: '16px 12px' }}>
//                             {activeTab === 'completed' ? getGodownName(alloc.godownId) : (
//                               <select value={alloc.godownId} onChange={(e) => updateAllocation(alloc.tempId, "godownId", e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', width: '180px', fontSize: '12px' }}>
//                                 <option value="">Select Godown</option>
//                                 {godowns.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
//                               </select>
//                             )}
//                           </td>
//                           <td style={{ padding: '16px 12px', textAlign: 'center' }}>
//                             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
//                               {activeTab === 'completed' ? alloc.qtyBaseUnit : (
//                                 <input type="number" value={alloc.qtyBaseUnit} onChange={(e) => updateAllocation(alloc.tempId, "qtyBaseUnit", e.target.value)} style={{ width: '65px', padding: '4px', border: '1px solid #e2e8f0', borderRadius: '4px', textAlign: 'center', fontSize: '12px' }} />
//                               )}
//                               <span style={{ fontSize: '11px', color: '#64748b' }}>{details.unit}</span>
//                             </div>
//                           </td>
//                           <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: '800', color: '#1e293b', fontSize: '13px' }}>
//                             ₹{rowAmount.toLocaleString()}
//                           </td>
//                           <td style={{ padding: '16px 12px', textAlign: 'right' }}>
//                             {activeTab !== 'completed' && (
//                               <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
//                                 <Plus size={16} color="#6366f1" onClick={() => addAllocationRow(idx, alloc)} style={{ cursor: 'pointer' }} />
//                                 {isSubRow && <Trash2 size={16} color="#ef4444" onClick={() => removeAllocationRow(alloc.tempId)} style={{ cursor: 'pointer' }} />}
//                               </div>
//                             )}
//                           </td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>

//               <div style={{ padding: '16px 32px', borderTop: '2px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '20px', background: '#f8fafc' }}>
//                 <div style={{ textAlign: 'right' }}>
//                   <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '900', letterSpacing: '0.05em' }}>TOTAL DISTRIBUTION VALUE</div>
//                   <div style={{ fontSize: '22px', fontWeight: '900', color: '#6366f1' }}>
//                     ₹{allocations.reduce((sum, a) => sum + (a.qtyBaseUnit * (a.unitPrice || 0)), 0).toLocaleString()}
//                   </div>
//                 </div>
//               </div>
//             </>
//           ) : (
//             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
//               <Layers size={40} style={{ marginBottom: '10px', opacity: 0.3 }} />
//               <div style={{ fontSize: '13px' }}>Select an indent or PO to distribute stock</div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };