
// // // // // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // // // // import { api } from "../api.js";
// // // // // // import { toast } from "react-hot-toast";
// // // // // // import * as XLSX from "xlsx";
// // // // // // import { 
// // // // // //   Search, 
// // // // // //   ChevronRight, 
// // // // // //   AlertTriangle, 
// // // // // //   Download,
// // // // // //   CheckCircle2,
// // // // // //   Package
// // // // // // } from "lucide-react";

// // // // // // export const GodownsPage = () => {
// // // // // //   const [godowns, setGodowns] = useState([]);
// // // // // //   const [stocks, setStocks] = useState([]);
// // // // // //   const [loading, setLoading] = useState(true);
// // // // // //   const [selectedGodownId, setSelectedGodownId] = useState(null);
// // // // // //   const [searchQuery, setSearchQuery] = useState("");
// // // // // //   const [viewMode, setViewMode] = useState("all"); // "all" or "low-stock"
// // // // // //   const [localThresholds, setLocalThresholds] = useState({});

// // // // // //   const loadData = useCallback(async () => {
// // // // // //     setLoading(true);
// // // // // //     try {
// // // // // //       const [godRes, stockRes] = await Promise.all([
// // // // // //         api.get("/inventory/godowns"),
// // // // // //         api.get("/godown-stocks")
// // // // // //       ]);
// // // // // //       setGodowns(godRes.data || []);
// // // // // //       setStocks(stockRes.data || []);
      
// // // // // //       if (godRes.data?.length > 0 && !selectedGodownId) {
// // // // // //         setSelectedGodownId(godRes.data[0]._id);
// // // // // //       }
// // // // // //     } catch (error) {
// // // // // //       toast.error("Failed to sync inventory data");
// // // // // //     } finally {
// // // // // //       setLoading(false);
// // // // // //     }
// // // // // //   }, [selectedGodownId]);

// // // // // //   useEffect(() => { loadData(); }, [loadData]);

// // // // // //   // Data for the main table
// // // // // //   const activeStocks = useMemo(() => {
// // // // // //     let filtered = stocks;
// // // // // //     if (viewMode === "low-stock") {
// // // // // //       filtered = stocks.filter(s => s.qtyBaseUnit <= (s.thresholdBaseUnit || 0));
// // // // // //     } else {
// // // // // //       filtered = stocks.filter(s => (s.godownId?._id || s.godownId) === selectedGodownId);
// // // // // //     }

// // // // // //     if (searchQuery.trim()) {
// // // // // //       const q = searchQuery.toLowerCase();
// // // // // //       filtered = filtered.filter(it => 
// // // // // //         (it.stockItemId?.name || "").toLowerCase().includes(q)
// // // // // //       );
// // // // // //     }
// // // // // //     return filtered;
// // // // // //   }, [stocks, selectedGodownId, viewMode, searchQuery]);

// // // // // //   const updateThreshold = async (rowId) => {
// // // // // //     const value = localThresholds[rowId];
// // // // // //     if (value === undefined) return;
// // // // // //     try {
// // // // // //       await api.post(`/godown-stocks/${rowId}/threshold`, { thresholdBaseUnit: Number(value) });
// // // // // //       toast.success("Threshold updated");
// // // // // //       setLocalThresholds(prev => {
// // // // // //         const next = { ...prev };
// // // // // //         delete next[rowId];
// // // // // //         return next;
// // // // // //       });
// // // // // //       loadData(); 
// // // // // //     } catch (error) {
// // // // // //       toast.error("Update failed");
// // // // // //     }
// // // // // //   };

// // // // // //   const downloadExcel = () => {
// // // // // //     const data = activeStocks.map(it => ({
// // // // // //       "Godown": it.godownId?.name || "N/A",
// // // // // //       "Item": it.stockItemId?.name || "N/A",
// // // // // //       "Current Qty": it.qtyBaseUnit,
// // // // // //       "Unit": it.stockItemId?.unitId?.symbol || "", // Added Unit to Excel
// // // // // //       "Threshold": it.thresholdBaseUnit || 0,
// // // // // //       "Status": it.qtyBaseUnit <= (it.thresholdBaseUnit || 0) ? "LOW" : "OK"
// // // // // //     }));
// // // // // //     const worksheet = XLSX.utils.json_to_sheet(data);
// // // // // //     const workbook = XLSX.utils.book_new();
// // // // // //     XLSX.utils.book_append_sheet(workbook, worksheet, "Stock_Report");
// // // // // //     XLSX.writeFile(workbook, `Stock_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
// // // // // //   };

// // // // // //   const styles = {
// // // // // //     container: { height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" },
// // // // // //     header: { padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
// // // // // //     sidebar: { width: '380px', display: 'flex', flexDirection: 'column', gap: '12px', padding: '24px' },
// // // // // //     canvas: { flex: 1, background: '#fff', borderRadius: '24px', margin: '24px 24px 24px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' },
// // // // // //     tabBtn: (active) => ({
// // // // // //         padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
// // // // // //         background: active ? '#6366f1' : 'transparent', color: active ? '#fff' : '#64748b', border: 'none', transition: '0.2s'
// // // // // //     }),
// // // // // //     card: (selected) => ({
// // // // // //         padding: '16px', borderRadius: '16px', cursor: 'pointer', background: selected ? '#fff' : 'transparent',
// // // // // //         border: selected ? '1px solid #6366f1' : '1px solid transparent', boxShadow: selected ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', transition: 'all 0.2s'
// // // // // //     })
// // // // // //   };

// // // // // //   return (
// // // // // //     <div style={styles.container}>
// // // // // //       <div style={styles.header}>
// // // // // //         <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // // // //           Stock <span style={{ color: '#6366f1', fontWeight: '500' }}>Control</span>
// // // // // //         </h1>
        
// // // // // //         <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
// // // // // //           <div style={{ display: 'flex', background: '#f8fafc', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
// // // // // //             <button onClick={() => setViewMode("all")} style={styles.tabBtn(viewMode === "all")}>All Godowns</button>
// // // // // //             <button onClick={() => setViewMode("low-stock")} style={styles.tabBtn(viewMode === "low-stock")}>
// // // // // //               Low Stock {stocks.filter(s => s.qtyBaseUnit <= (s.thresholdBaseUnit || 0)).length > 0 && "!"}
// // // // // //             </button>
// // // // // //           </div>
          
// // // // // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // //             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // // //             <input 
// // // // // //               type="text" placeholder="Search..." value={searchQuery}
// // // // // //               onChange={(e) => setSearchQuery(e.target.value)}
// // // // // //               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '180px', outline: 'none' }}
// // // // // //             />
// // // // // //           </div>
// // // // // //         </div>
// // // // // //       </div>

// // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
// // // // // //         <div style={styles.sidebar}>
// // // // // //           <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
// // // // // //             {viewMode === "all" ? "Warehouse List" : "Critical Stock"}
// // // // // //           </div>
// // // // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // //             {viewMode === "all" ? (
// // // // // //               godowns.map(g => (
// // // // // //                 <div key={g._id} onClick={() => setSelectedGodownId(g._id)} style={styles.card(selectedGodownId === g._id)}>
// // // // // //                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // //                     <div style={{ fontWeight: '700', color: selectedGodownId === g._id ? '#6366f1' : '#1e293b', fontSize: '14px' }}>{g.name}</div>
// // // // // //                     <ChevronRight size={14} color={selectedGodownId === g._id ? '#6366f1' : '#cbd5e1'} />
// // // // // //                   </div>
// // // // // //                   <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Monitoring {stocks.filter(s => (s.godownId?._id || s.godownId) === g._id).length} items</div>
// // // // // //                 </div>
// // // // // //               ))
// // // // // //             ) : (
// // // // // //               <div style={{ padding: '20px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #fee2e2' }}>
// // // // // //                 <AlertTriangle size={24} color="#ef4444" style={{ margin: '0 auto 8px' }} />
// // // // // //                 <div style={{ fontSize: '13px', fontWeight: '800', color: '#991b1b' }}>{activeStocks.length} Items Low</div>
// // // // // //               </div>
// // // // // //             )}
// // // // // //           </div>
// // // // // //         </div>

// // // // // //         <div style={styles.canvas}>
// // // // // //           <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', background: '#fcfcfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // //             <div>
// // // // // //               <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '4px', textTransform: 'uppercase' }}>Current Monitoring</div>
// // // // // //               <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
// // // // // //                 {viewMode === "low-stock" ? "Low Stock Alerts" : (godowns.find(g => g._id === selectedGodownId)?.name || "Select Godown")}
// // // // // //               </h2>
// // // // // //             </div>
// // // // // //             <button onClick={downloadExcel} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
// // // // // //               <Download size={16} /> Export Report
// // // // // //             </button>
// // // // // //           </div>

// // // // // //           <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
// // // // // //             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // //               <thead>
// // // // // //                 <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // //                   <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Stock Item</th>
// // // // // //                   <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Current Qty</th>
// // // // // //                   <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Threshold</th>
// // // // // //                   <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Update Limit</th>
// // // // // //                 </tr>
// // // // // //               </thead>
// // // // // //               <tbody>
// // // // // //                 {activeStocks.map((it) => {
// // // // // //                   const isLow = it.qtyBaseUnit <= (it.thresholdBaseUnit || 0);
// // // // // //                   const unitSymbol = it.stockItemId?.unitId?.symbol || "";
                  
// // // // // //                   return (
// // // // // //                     <tr key={it._id} style={{ borderBottom: '1px solid #f8fafc' }}>
// // // // // //                       <td style={{ padding: '20px 12px' }}>
// // // // // //                         <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{it.stockItemId?.name || "Standard Item"}</div>
// // // // // //                         {viewMode === "low-stock" && <div style={{ fontSize: '11px', color: '#94a3b8' }}>Location: {it.godownId?.name}</div>}
// // // // // //                       </td>
// // // // // //                       <td style={{ padding: '20px 12px', textAlign: 'center' }}>
// // // // // //                         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
// // // // // //                           <span style={{ 
// // // // // //                             padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '800',
// // // // // //                             background: isLow ? '#fee2e2' : '#e0f2fe', color: isLow ? '#ef4444' : '#0284c7'
// // // // // //                           }}>
// // // // // //                             {it.qtyBaseUnit}
// // // // // //                           </span>
// // // // // //                           <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>{unitSymbol}</span>
// // // // // //                         </div>
// // // // // //                       </td>
// // // // // //                       <td style={{ padding: '20px 12px', textAlign: 'center', color: '#64748b', fontWeight: '600', fontSize: '13px' }}>
// // // // // //                         {it.thresholdBaseUnit || 0} <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{unitSymbol}</span>
// // // // // //                       </td>
// // // // // //                       <td style={{ padding: '20px 12px', textAlign: 'right' }}>
// // // // // //                         <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
// // // // // //                           <div style={{ position: 'relative' }}>
// // // // // //                             <input 
// // // // // //                               type="number" placeholder="Set"
// // // // // //                               value={localThresholds[it._id] ?? ""}
// // // // // //                               onChange={(e) => setLocalThresholds(prev => ({...prev, [it._id]: e.target.value}))}
// // // // // //                               style={{ width: '80px', padding: '6px 24px 6px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center', fontSize: '12px', fontWeight: '700' }}
// // // // // //                             />
// // // // // //                             <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', color: '#94a3b8' }}>{unitSymbol}</span>
// // // // // //                           </div>
// // // // // //                           <button 
// // // // // //                             onClick={() => updateThreshold(it._id)}
// // // // // //                             style={{ 
// // // // // //                               background: localThresholds[it._id] ? '#0f172a' : '#f1f5f9', 
// // // // // //                               color: localThresholds[it._id] ? '#fff' : '#cbd5e1',
// // // // // //                               border: 'none', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer' 
// // // // // //                             }}>
// // // // // //                             <CheckCircle2 size={16} />
// // // // // //                           </button>
// // // // // //                         </div>
// // // // // //                       </td>
// // // // // //                     </tr>
// // // // // //                   );
// // // // // //                 })}
// // // // // //               </tbody>
// // // // // //             </table>
// // // // // //             {activeStocks.length === 0 && (
// // // // // //               <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>
// // // // // //                 <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
// // // // // //                 <div style={{ fontWeight: '700' }}>No stock items found in this view</div>
// // // // // //               </div>
// // // // // //             )}
// // // // // //           </div>
// // // // // //         </div>
// // // // // //       </div>
// // // // // //     </div>
// // // // // //   );
// // // // // // };





// // // // // //  8-4-2026
















// // // // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // // // import { api } from "../api.js";
// // // // // import { toast } from "react-hot-toast";
// // // // // import * as XLSX from "xlsx";
// // // // // import { 
// // // // //   Search, 
// // // // //   ChevronRight, 
// // // // //   AlertTriangle, 
// // // // //   Download,
// // // // //   CheckCircle2,
// // // // //   Package,
// // // // //   Trash2 
// // // // // } from "lucide-react";

// // // // // export const GodownsPage = () => {
// // // // //   const [godowns, setGodowns] = useState([]);
// // // // //   const [stocks, setStocks] = useState([]);
// // // // //   const [loading, setLoading] = useState(true);
// // // // //   const [selectedGodownId, setSelectedGodownId] = useState(null);
// // // // //   const [searchQuery, setSearchQuery] = useState("");
// // // // //   const [viewMode, setViewMode] = useState("all"); // "all" or "low-stock"
// // // // //   const [localThresholds, setLocalThresholds] = useState({});

// // // // //   const loadData = useCallback(async () => {
// // // // //     setLoading(true);
// // // // //     try {
// // // // //       const [godRes, stockRes] = await Promise.all([
// // // // //         api.get("/inventory/godowns"),
// // // // //         api.get("/godown-stocks")
// // // // //       ]);
// // // // //       setGodowns(godRes.data || []);
// // // // //       setStocks(stockRes.data || []);
      
// // // // //       if (godRes.data?.length > 0 && !selectedGodownId) {
// // // // //         setSelectedGodownId(godRes.data[0]._id);
// // // // //       }
// // // // //     } catch (error) {
// // // // //       toast.error("Failed to sync inventory data");
// // // // //     } finally {
// // // // //       setLoading(false);
// // // // //     }
// // // // //   }, [selectedGodownId]);

// // // // //   useEffect(() => { loadData(); }, [loadData]);

// // // // //   // --- ACTIONS ---
// // // // //   const deleteStockItem = async (e, rowId) => {
// // // // //     e.stopPropagation(); // Prevents interaction with the row if you add row clicks later
// // // // //     if (!window.confirm("Are you sure you want to remove this item from stock records?")) return;
    
// // // // //     try {
// // // // //       await api.delete(`/godown-stocks/${rowId}`);
// // // // //       toast.success("Item removed from stock");
// // // // //       // Optimistic UI update: Remove from local state immediately
// // // // //       setStocks(prev => prev.filter(item => item._id !== rowId));
// // // // //     } catch (error) {
// // // // //       console.error(error);
// // // // //       toast.error("Failed to delete item. Check console for details.");
// // // // //     }
// // // // //   };

// // // // //   const updateThreshold = async (rowId) => {
// // // // //     const value = localThresholds[rowId];
// // // // //     if (value === undefined || value === "") {
// // // // //       toast.error("Please enter a value first");
// // // // //       return;
// // // // //     }
// // // // //     try {
// // // // //       await api.post(`/godown-stocks/${rowId}/threshold`, { thresholdBaseUnit: Number(value) });
// // // // //       toast.success("Threshold updated");
// // // // //       setLocalThresholds(prev => {
// // // // //         const next = { ...prev };
// // // // //         delete next[rowId];
// // // // //         return next;
// // // // //       });
// // // // //       loadData(); 
// // // // //     } catch (error) {
// // // // //       toast.error("Update failed");
// // // // //     }
// // // // //   };

// // // // //   // --- FILTERS & EXPORT ---
// // // // //   const activeStocks = useMemo(() => {
// // // // //     let filtered = stocks;
// // // // //     if (viewMode === "low-stock") {
// // // // //       filtered = stocks.filter(s => s.qtyBaseUnit <= (s.thresholdBaseUnit || 0));
// // // // //     } else {
// // // // //       filtered = stocks.filter(s => (s.godownId?._id || s.godownId) === selectedGodownId);
// // // // //     }

// // // // //     if (searchQuery.trim()) {
// // // // //       const q = searchQuery.toLowerCase();
// // // // //       filtered = filtered.filter(it => 
// // // // //         (it.stockItemId?.name || "").toLowerCase().includes(q)
// // // // //       );
// // // // //     }
// // // // //     return filtered;
// // // // //   }, [stocks, selectedGodownId, viewMode, searchQuery]);

// // // // //   const downloadExcel = () => {
// // // // //     const data = activeStocks.map(it => ({
// // // // //       "Godown": it.godownId?.name || "N/A",
// // // // //       "Item": it.stockItemId?.name || "N/A",
// // // // //       "Current Qty": it.qtyBaseUnit,
// // // // //       "Unit": it.stockItemId?.unitId?.symbol || "",
// // // // //       "Threshold": it.thresholdBaseUnit || 0,
// // // // //       "Status": it.qtyBaseUnit <= (it.thresholdBaseUnit || 0) ? "LOW" : "OK"
// // // // //     }));
// // // // //     const worksheet = XLSX.utils.json_to_sheet(data);
// // // // //     const workbook = XLSX.utils.book_new();
// // // // //     XLSX.utils.book_append_sheet(workbook, worksheet, "Stock_Report");
// // // // //     XLSX.writeFile(workbook, `Stock_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
// // // // //   };

// // // // //   const styles = {
// // // // //     container: { height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" },
// // // // //     header: { padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
// // // // //     sidebar: { width: '380px', display: 'flex', flexDirection: 'column', gap: '12px', padding: '24px' },
// // // // //     canvas: { flex: 1, background: '#fff', borderRadius: '24px', margin: '24px 24px 24px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' },
// // // // //     tabBtn: (active) => ({
// // // // //         padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
// // // // //         background: active ? '#6366f1' : 'transparent', color: active ? '#fff' : '#64748b', border: 'none', transition: '0.2s'
// // // // //     }),
// // // // //     card: (selected) => ({
// // // // //         padding: '16px', borderRadius: '16px', cursor: 'pointer', background: selected ? '#fff' : 'transparent',
// // // // //         border: selected ? '1px solid #6366f1' : '1px solid transparent', boxShadow: selected ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', transition: 'all 0.2s'
// // // // //     }),
// // // // //     actionBtn: { border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }
// // // // //   };

// // // // //   return (
// // // // //     <div style={styles.container}>
// // // // //       {/* Header Section */}
// // // // //       <div style={styles.header}>
// // // // //         <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // // //           Stock <span style={{ color: '#6366f1', fontWeight: '500' }}>Control</span>
// // // // //         </h1>
        
// // // // //         <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
// // // // //           <div style={{ display: 'flex', background: '#f8fafc', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
// // // // //             <button onClick={() => setViewMode("all")} style={styles.tabBtn(viewMode === "all")}>All Godowns</button>
// // // // //             <button onClick={() => setViewMode("low-stock")} style={styles.tabBtn(viewMode === "low-stock")}>
// // // // //               Low Stock {stocks.filter(s => s.qtyBaseUnit <= (s.thresholdBaseUnit || 0)).length > 0 && "!"}
// // // // //             </button>
// // // // //           </div>
          
// // // // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // //             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // //             <input 
// // // // //               type="text" placeholder="Search..." value={searchQuery}
// // // // //               onChange={(e) => setSearchQuery(e.target.value)}
// // // // //               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '180px', outline: 'none' }}
// // // // //             />
// // // // //           </div>
// // // // //         </div>
// // // // //       </div>

// // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
// // // // //         {/* Sidebar Section */}
// // // // //         <div style={styles.sidebar}>
// // // // //           <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
// // // // //             {viewMode === "all" ? "Warehouse List" : "Critical Stock"}
// // // // //           </div>
// // // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // //             {viewMode === "all" ? (
// // // // //               godowns.map(g => (
// // // // //                 <div key={g._id} onClick={() => setSelectedGodownId(g._id)} style={styles.card(selectedGodownId === g._id)}>
// // // // //                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // //                     <div style={{ fontWeight: '700', color: selectedGodownId === g._id ? '#6366f1' : '#1e293b', fontSize: '14px' }}>{g.name}</div>
// // // // //                     <ChevronRight size={14} color={selectedGodownId === g._id ? '#6366f1' : '#cbd5e1'} />
// // // // //                   </div>
// // // // //                   <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Monitoring {stocks.filter(s => (s.godownId?._id || s.godownId) === g._id).length} items</div>
// // // // //                 </div>
// // // // //               ))
// // // // //             ) : (
// // // // //               <div style={{ padding: '20px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #fee2e2' }}>
// // // // //                 <AlertTriangle size={24} color="#ef4444" style={{ margin: '0 auto 8px' }} />
// // // // //                 <div style={{ fontSize: '13px', fontWeight: '800', color: '#991b1b' }}>{activeStocks.length} Items Low</div>
// // // // //               </div>
// // // // //             )}
// // // // //           </div>
// // // // //         </div>

// // // // //         {/* Main Canvas Section */}
// // // // //         <div style={styles.canvas}>
// // // // //           <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', background: '#fcfcfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // //             <div>
// // // // //               <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '4px', textTransform: 'uppercase' }}>Current Monitoring</div>
// // // // //               <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
// // // // //                 {viewMode === "low-stock" ? "Low Stock Alerts" : (godowns.find(g => g._id === selectedGodownId)?.name || "Select Godown")}
// // // // //               </h2>
// // // // //             </div>
// // // // //             <button onClick={downloadExcel} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
// // // // //               <Download size={16} /> Export Report
// // // // //             </button>
// // // // //           </div>

// // // // //           <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
// // // // //             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // //               <thead>
// // // // //                 <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // //                   <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Stock Item</th>
// // // // //                   <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Current Qty</th>
// // // // //                   <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Threshold</th>
// // // // //                   <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
// // // // //                 </tr>
// // // // //               </thead>
// // // // //               <tbody>
// // // // //                 {activeStocks.map((it) => {
// // // // //                   const isLow = it.qtyBaseUnit <= (it.thresholdBaseUnit || 0);
// // // // //                   const unitSymbol = it.stockItemId?.unitId?.symbol || "";
// // // // //                   const rowId = it._id;
                  
// // // // //                   return (
// // // // //                     <tr key={rowId} style={{ borderBottom: '1px solid #f8fafc' }}>
// // // // //                       <td style={{ padding: '20px 12px' }}>
// // // // //                         <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{it.stockItemId?.name || "Standard Item"}</div>
// // // // //                         {viewMode === "low-stock" && <div style={{ fontSize: '11px', color: '#94a3b8' }}>Location: {it.godownId?.name}</div>}
// // // // //                       </td>
                      
// // // // //                       <td style={{ padding: '20px 12px', textAlign: 'center' }}>
// // // // //                         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
// // // // //                           <span style={{ 
// // // // //                             padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '800',
// // // // //                             background: isLow ? '#fee2e2' : '#e0f2fe', color: isLow ? '#ef4444' : '#0284c7'
// // // // //                           }}>
// // // // //                             {it.qtyBaseUnit}
// // // // //                           </span>
// // // // //                           <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>{unitSymbol}</span>
// // // // //                         </div>
// // // // //                       </td>

// // // // //                       <td style={{ padding: '20px 12px', textAlign: 'center', color: '#64748b', fontWeight: '600', fontSize: '13px' }}>
// // // // //                         {it.thresholdBaseUnit || 0} <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{unitSymbol}</span>
// // // // //                       </td>

// // // // //                       <td style={{ padding: '20px 12px', textAlign: 'right' }}>
// // // // //                         <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
// // // // //                           {/* Threshold Input */}
// // // // //                           <div style={{ position: 'relative' }}>
// // // // //                             <input 
// // // // //                               type="number" placeholder="Set"
// // // // //                               value={localThresholds[rowId] ?? ""}
// // // // //                               onChange={(e) => setLocalThresholds(prev => ({...prev, [rowId]: e.target.value}))}
// // // // //                               style={{ width: '80px', padding: '6px 24px 6px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center', fontSize: '12px', fontWeight: '700' }}
// // // // //                             />
// // // // //                             <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', color: '#94a3b8' }}>{unitSymbol}</span>
// // // // //                           </div>

// // // // //                           {/* Save Button */}
// // // // //                           <button 
// // // // //                             onClick={() => updateThreshold(rowId)}
// // // // //                             style={{ 
// // // // //                               ...styles.actionBtn,
// // // // //                               background: localThresholds[rowId] ? '#0f172a' : '#f1f5f9', 
// // // // //                               color: localThresholds[rowId] ? '#fff' : '#cbd5e1',
// // // // //                             }}>
// // // // //                             <CheckCircle2 size={16} />
// // // // //                           </button>

// // // // //                           {/* Delete Button */}
// // // // //                           <button 
// // // // //                             onClick={(e) => deleteStockItem(e, rowId)}
// // // // //                             title="Delete Stock Record"
// // // // //                             style={{ 
// // // // //                               ...styles.actionBtn,
// // // // //                               background: '#fee2e2', 
// // // // //                               color: '#ef4444'
// // // // //                             }}>
// // // // //                             <Trash2 size={16} />
// // // // //                           </button>
// // // // //                         </div>
// // // // //                       </td>
// // // // //                     </tr>
// // // // //                   );
// // // // //                 })}
// // // // //               </tbody>
// // // // //             </table>

// // // // //             {activeStocks.length === 0 && (
// // // // //               <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>
// // // // //                 <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
// // // // //                 <div style={{ fontWeight: '700' }}>No stock items found in this view</div>
// // // // //               </div>
// // // // //             )}
// // // // //           </div>
// // // // //         </div>
// // // // //       </div>
// // // // //     </div>
// // // // //   );
// // // // // };




// // // // // for stock group








// // // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // // import { api } from "../api.js";
// // // // import { toast } from "react-hot-toast";
// // // // import * as XLSX from "xlsx";
// // // // import { 
// // // //   Search, 
// // // //   ChevronRight, 
// // // //   AlertTriangle, 
// // // //   Download,
// // // //   CheckCircle2,
// // // //   Package,
// // // //   Trash2,
// // // //   Tag
// // // // } from "lucide-react";

// // // // export const GodownsPage = () => {
// // // //   const [godowns, setGodowns] = useState([]);
// // // //   const [stocks, setStocks] = useState([]);
// // // //   const [loading, setLoading] = useState(true);
// // // //   const [selectedGodownId, setSelectedGodownId] = useState(null);
// // // //   const [searchQuery, setSearchQuery] = useState("");
// // // //   const [viewMode, setViewMode] = useState("all"); // "all" or "low-stock"
// // // //   const [localThresholds, setLocalThresholds] = useState({});

// // // //   const loadData = useCallback(async () => {
// // // //     setLoading(true);
// // // //     try {
// // // //       const [godRes, stockRes] = await Promise.all([
// // // //         api.get("/inventory/godowns"),
// // // //         api.get("/godown-stocks")
// // // //       ]);
// // // //       setGodowns(godRes.data || []);
// // // //       setStocks(stockRes.data || []);
      
// // // //       if (godRes.data?.length > 0 && !selectedGodownId) {
// // // //         setSelectedGodownId(godRes.data[0]._id);
// // // //       }
// // // //     } catch (error) {
// // // //       toast.error("Failed to sync inventory data");
// // // //     } finally {
// // // //       setLoading(false);
// // // //     }
// // // //   }, [selectedGodownId]);

// // // //   useEffect(() => { loadData(); }, [loadData]);

// // // //   // --- ACTIONS ---
// // // //   const deleteStockItem = async (e, rowId) => {
// // // //     e.stopPropagation();
// // // //     if (!window.confirm("Are you sure you want to remove this item from stock records?")) return;
    
// // // //     try {
// // // //       await api.delete(`/godown-stocks/${rowId}`);
// // // //       toast.success("Item removed from stock");
// // // //       setStocks(prev => prev.filter(item => item._id !== rowId));
// // // //     } catch (error) {
// // // //       console.error(error);
// // // //       toast.error("Failed to delete item.");
// // // //     }
// // // //   };

// // // //   const updateThreshold = async (rowId) => {
// // // //     const value = localThresholds[rowId];
// // // //     if (value === undefined || value === "") {
// // // //       toast.error("Please enter a value first");
// // // //       return;
// // // //     }
// // // //     try {
// // // //       await api.post(`/godown-stocks/${rowId}/threshold`, { thresholdBaseUnit: Number(value) });
// // // //       toast.success("Threshold updated");
// // // //       setLocalThresholds(prev => {
// // // //         const next = { ...prev };
// // // //         delete next[rowId];
// // // //         return next;
// // // //       });
// // // //       loadData(); 
// // // //     } catch (error) {
// // // //       toast.error("Update failed");
// // // //     }
// // // //   };

// // // //   // --- FILTERS & EXPORT ---
// // // //   const activeStocks = useMemo(() => {
// // // //     let filtered = stocks;
// // // //     if (viewMode === "low-stock") {
// // // //       filtered = stocks.filter(s => s.qtyBaseUnit <= (s.thresholdBaseUnit || 0));
// // // //     } else {
// // // //       filtered = stocks.filter(s => (s.godownId?._id || s.godownId) === selectedGodownId);
// // // //     }

// // // //     if (searchQuery.trim()) {
// // // //       const q = searchQuery.toLowerCase();
// // // //       filtered = filtered.filter(it => 
// // // //         (it.stockItemId?.name || "").toLowerCase().includes(q) ||
// // // //         (it.stockItemId?.stockGroupId?.name || "").toLowerCase().includes(q) // Included group in search
// // // //       );
// // // //     }
// // // //     return filtered;
// // // //   }, [stocks, selectedGodownId, viewMode, searchQuery]);

// // // //   const downloadExcel = () => {
// // // //     const data = activeStocks.map(it => ({
// // // //       "Godown": it.godownId?.name || "N/A",
// // // //       "Item": it.stockItemId?.name || "N/A",
// // // //       "Stock Group": it.stockItemId?.stockGroupId?.name || "General",
// // // //       "Current Qty": it.qtyBaseUnit,
// // // //       "Unit": it.stockItemId?.unitId?.symbol || "",
// // // //       "Threshold": it.thresholdBaseUnit || 0,
// // // //       "Status": it.qtyBaseUnit <= (it.thresholdBaseUnit || 0) ? "LOW" : "OK"
// // // //     }));
// // // //     const worksheet = XLSX.utils.json_to_sheet(data);
// // // //     const workbook = XLSX.utils.book_new();
// // // //     XLSX.utils.book_append_sheet(workbook, worksheet, "Stock_Report");
// // // //     XLSX.writeFile(workbook, `Stock_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
// // // //   };

// // // //   const styles = {
// // // //     container: { height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" },
// // // //     header: { padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
// // // //     sidebar: { width: '380px', display: 'flex', flexDirection: 'column', gap: '12px', padding: '24px' },
// // // //     canvas: { flex: 1, background: '#fff', borderRadius: '24px', margin: '24px 24px 24px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' },
// // // //     tabBtn: (active) => ({
// // // //         padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
// // // //         background: active ? '#6366f1' : 'transparent', color: active ? '#fff' : '#64748b', border: 'none', transition: '0.2s'
// // // //     }),
// // // //     card: (selected) => ({
// // // //         padding: '16px', borderRadius: '16px', cursor: 'pointer', background: selected ? '#fff' : 'transparent',
// // // //         border: selected ? '1px solid #6366f1' : '1px solid transparent', boxShadow: selected ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', transition: 'all 0.2s'
// // // //     }),
// // // //     actionBtn: { border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' },
// // // //     groupBadge: { fontSize: '10px', fontWeight: '700', color: '#6366f1', background: '#eef2ff', padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }
// // // //   };

// // // //   return (
// // // //     <div style={styles.container}>
// // // //       <div style={styles.header}>
// // // //         <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // //           Stock <span style={{ color: '#6366f1', fontWeight: '500' }}>Control</span>
// // // //         </h1>
        
// // // //         <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
// // // //           <div style={{ display: 'flex', background: '#f8fafc', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
// // // //             <button onClick={() => setViewMode("all")} style={styles.tabBtn(viewMode === "all")}>All Godowns</button>
// // // //             <button onClick={() => setViewMode("low-stock")} style={styles.tabBtn(viewMode === "low-stock")}>
// // // //               Low Stock {stocks.filter(s => s.qtyBaseUnit <= (s.thresholdBaseUnit || 0)).length > 0 && "!"}
// // // //             </button>
// // // //           </div>
          
// // // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // //             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // //             <input 
// // // //               type="text" placeholder="Search item or group..." value={searchQuery}
// // // //               onChange={(e) => setSearchQuery(e.target.value)}
// // // //               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '220px', outline: 'none' }}
// // // //             />
// // // //           </div>
// // // //         </div>
// // // //       </div>

// // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
// // // //         <div style={styles.sidebar}>
// // // //           <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
// // // //             {viewMode === "all" ? "Warehouse List" : "Critical Stock"}
// // // //           </div>
// // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // //             {viewMode === "all" ? (
// // // //               godowns.map(g => (
// // // //                 <div key={g._id} onClick={() => setSelectedGodownId(g._id)} style={styles.card(selectedGodownId === g._id)}>
// // // //                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // //                     <div style={{ fontWeight: '700', color: selectedGodownId === g._id ? '#6366f1' : '#1e293b', fontSize: '14px' }}>{g.name}</div>
// // // //                     <ChevronRight size={14} color={selectedGodownId === g._id ? '#6366f1' : '#cbd5e1'} />
// // // //                   </div>
// // // //                   <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Monitoring {stocks.filter(s => (s.godownId?._id || s.godownId) === g._id).length} items</div>
// // // //                 </div>
// // // //               ))
// // // //             ) : (
// // // //               <div style={{ padding: '20px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #fee2e2' }}>
// // // //                 <AlertTriangle size={24} color="#ef4444" style={{ margin: '0 auto 8px' }} />
// // // //                 <div style={{ fontSize: '13px', fontWeight: '800', color: '#991b1b' }}>{activeStocks.length} Items Low</div>
// // // //               </div>
// // // //             )}
// // // //           </div>
// // // //         </div>

// // // //         <div style={styles.canvas}>
// // // //           <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', background: '#fcfcfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // //             <div>
// // // //               <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '4px', textTransform: 'uppercase' }}>Current Monitoring</div>
// // // //               <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
// // // //                 {viewMode === "low-stock" ? "Low Stock Alerts" : (godowns.find(g => g._id === selectedGodownId)?.name || "Select Godown")}
// // // //               </h2>
// // // //             </div>
// // // //             <button onClick={downloadExcel} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
// // // //               <Download size={16} /> Export Report
// // // //             </button>
// // // //           </div>

// // // //           <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
// // // //             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // //               <thead>
// // // //                 <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // //                   <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Stock Item</th>
// // // //                   <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Stock Group</th>
// // // //                   <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Current Qty</th>
// // // //                   <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Threshold</th>
// // // //                   <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
// // // //                 </tr>
// // // //               </thead>
// // // //               <tbody>
// // // //                 {activeStocks.map((it) => {
// // // //                   const isLow = it.qtyBaseUnit <= (it.thresholdBaseUnit || 0);
// // // //                   const unitSymbol = it.stockItemId?.unitId?.symbol || "";
// // // //                   const groupName = it.stockItemId?.stockGroupId?.name || "General";
// // // //                   const rowId = it._id;
                  
// // // //                   return (
// // // //                     <tr key={rowId} style={{ borderBottom: '1px solid #f8fafc' }}>
// // // //                       <td style={{ padding: '20px 12px' }}>
// // // //                         <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{it.stockItemId?.name || "Standard Item"}</div>
// // // //                         {viewMode === "low-stock" && <div style={{ fontSize: '11px', color: '#94a3b8' }}>Location: {it.godownId?.name}</div>}
// // // //                       </td>

// // // //                       <td style={{ padding: '20px 12px' }}>
// // // //                         <div style={styles.groupBadge}>
// // // //                           <Tag size={10} style={{ marginRight: '4px' }} />
// // // //                           {groupName}
// // // //                         </div>
// // // //                       </td>
                      
// // // //                       <td style={{ padding: '20px 12px', textAlign: 'center' }}>
// // // //                         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
// // // //                           <span style={{ 
// // // //                             padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '800',
// // // //                             background: isLow ? '#fee2e2' : '#e0f2fe', color: isLow ? '#ef4444' : '#0284c7'
// // // //                           }}>
// // // //                             {it.qtyBaseUnit}
// // // //                           </span>
// // // //                           <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>{unitSymbol}</span>
// // // //                         </div>
// // // //                       </td>

// // // //                       <td style={{ padding: '20px 12px', textAlign: 'center', color: '#64748b', fontWeight: '600', fontSize: '13px' }}>
// // // //                         {it.thresholdBaseUnit || 0} <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{unitSymbol}</span>
// // // //                       </td>

// // // //                       <td style={{ padding: '20px 12px', textAlign: 'right' }}>
// // // //                         <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
// // // //                           <div style={{ position: 'relative' }}>
// // // //                             <input 
// // // //                               type="number" placeholder="Set"
// // // //                               value={localThresholds[rowId] ?? ""}
// // // //                               onChange={(e) => setLocalThresholds(prev => ({...prev, [rowId]: e.target.value}))}
// // // //                               style={{ width: '80px', padding: '6px 24px 6px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center', fontSize: '12px', fontWeight: '700' }}
// // // //                             />
// // // //                             <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', color: '#94a3b8' }}>{unitSymbol}</span>
// // // //                           </div>

// // // //                           <button 
// // // //                             onClick={() => updateThreshold(rowId)}
// // // //                             style={{ 
// // // //                               ...styles.actionBtn,
// // // //                               background: localThresholds[rowId] ? '#0f172a' : '#f1f5f9', 
// // // //                               color: localThresholds[rowId] ? '#fff' : '#cbd5e1',
// // // //                             }}>
// // // //                             <CheckCircle2 size={16} />
// // // //                           </button>

// // // //                           <button 
// // // //                             onClick={(e) => deleteStockItem(e, rowId)}
// // // //                             title="Delete Stock Record"
// // // //                             style={{ 
// // // //                               ...styles.actionBtn,
// // // //                               background: '#fee2e2', 
// // // //                               color: '#ef4444'
// // // //                             }}>
// // // //                             <Trash2 size={16} />
// // // //                           </button>
// // // //                         </div>
// // // //                       </td>
// // // //                     </tr>
// // // //                   );
// // // //                 })}
// // // //               </tbody>
// // // //             </table>

// // // //             {activeStocks.length === 0 && (
// // // //               <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>
// // // //                 <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
// // // //                 <div style={{ fontWeight: '700' }}>No stock items found in this view</div>
// // // //               </div>
// // // //             )}
// // // //           </div>
// // // //         </div>
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // };















// // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // import { api } from "../api.js";
// // // import { toast } from "react-hot-toast";
// // // import * as XLSX from "xlsx";
// // // import { 
// // //   Search, 
// // //   ChevronRight, 
// // //   AlertTriangle, 
// // //   Download,
// // //   CheckCircle2,
// // //   Package,
// // //   Trash2,
// // //   Tag
// // // } from "lucide-react";

// // // export const GodownsPage = () => {
// // //   const [godowns, setGodowns] = useState([]);
// // //   const [stocks, setStocks] = useState([]);
// // //   const [loading, setLoading] = useState(true);
// // //   const [selectedGodownId, setSelectedGodownId] = useState(null);
// // //   const [searchQuery, setSearchQuery] = useState("");
// // //   const [viewMode, setViewMode] = useState("all"); // "all" or "low-stock"
// // //   const [localThresholds, setLocalThresholds] = useState({});

// // //   const loadData = useCallback(async () => {
// // //     setLoading(true);
// // //     try {
// // //       const [godRes, stockRes] = await Promise.all([
// // //         api.get("/inventory/godowns"),
// // //         api.get("/godown-stocks")
// // //       ]);
// // //       setGodowns(godRes.data || []);
// // //       setStocks(stockRes.data || []);
      
// // //       if (godRes.data?.length > 0 && !selectedGodownId) {
// // //         setSelectedGodownId(godRes.data[0]._id);
// // //       }
// // //     } catch (error) {
// // //       toast.error("Failed to sync inventory data");
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   }, [selectedGodownId]);

// // //   useEffect(() => { loadData(); }, [loadData]);

// // //   // --- ACTIONS ---
// // //   const deleteStockItem = async (e, rowId) => {
// // //     e.stopPropagation();
// // //     if (!window.confirm("Are you sure you want to remove this item from stock records?")) return;
    
// // //     try {
// // //       await api.delete(`/godown-stocks/${rowId}`);
// // //       toast.success("Item removed from stock");
// // //       setStocks(prev => prev.filter(item => item._id !== rowId));
// // //     } catch (error) {
// // //       console.error(error);
// // //       toast.error("Failed to delete item.");
// // //     }
// // //   };

// // //   const updateThreshold = async (rowId) => {
// // //     const value = localThresholds[rowId];
// // //     if (value === undefined || value === "") {
// // //       toast.error("Please enter a value first");
// // //       return;
// // //     }
// // //     try {
// // //       await api.post(`/godown-stocks/${rowId}/threshold`, { thresholdBaseUnit: Number(value) });
// // //       toast.success("Threshold updated");
// // //       setLocalThresholds(prev => {
// // //         const next = { ...prev };
// // //         delete next[rowId];
// // //         return next;
// // //       });
// // //       loadData(); 
// // //     } catch (error) {
// // //       toast.error("Update failed");
// // //     }
// // //   };

// // //   // --- UPDATED SEARCH & FILTER LOGIC ---
// // //   const activeStocks = useMemo(() => {
// // //     let filtered = stocks;
    
// // //     // 1. Filter by Godown or Low Stock Mode
// // //     if (viewMode === "low-stock") {
// // //       filtered = stocks.filter(s => s.qtyBaseUnit <= (s.thresholdBaseUnit || 0));
// // //     } else {
// // //       filtered = stocks.filter(s => (s.godownId?._id || s.godownId) === selectedGodownId);
// // //     }

// // //     // 2. Search by Item Name OR Group Name (Integrated)
// // //     if (searchQuery.trim()) {
// // //       const q = searchQuery.toLowerCase();
// // //       filtered = filtered.filter(it => {
// // //         const itemName = it.stockItemId?.name?.toLowerCase() || "";
// // //         // Accessing the populated group object name from the backend update
// // //         const groupName = it.stockItemId?.stockGroupId?.name?.toLowerCase() || ""; 
// // //         return itemName.includes(q) || groupName.includes(q);
// // //       });
// // //     }
// // //     return filtered;
// // //   }, [stocks, selectedGodownId, viewMode, searchQuery]);

// // //   const downloadExcel = () => {
// // //     const data = activeStocks.map(it => ({
// // //       "Godown": it.godownId?.name || "N/A",
// // //       "Item": it.stockItemId?.name || "N/A",
// // //       "Stock Group": it.stockItemId?.stockGroupId?.name || "General",
// // //       "Current Qty": it.qtyBaseUnit,
// // //       "Unit": it.stockItemId?.unitId?.symbol || "",
// // //       "Threshold": it.thresholdBaseUnit || 0,
// // //       "Status": it.qtyBaseUnit <= (it.thresholdBaseUnit || 0) ? "LOW" : "OK"
// // //     }));
// // //     const worksheet = XLSX.utils.json_to_sheet(data);
// // //     const workbook = XLSX.utils.book_new();
// // //     XLSX.utils.book_append_sheet(workbook, worksheet, "Stock_Report");
// // //     XLSX.writeFile(workbook, `Stock_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
// // //   };

// // //   const styles = {
// // //     container: { height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" },
// // //     header: { padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
// // //     sidebar: { width: '380px', display: 'flex', flexDirection: 'column', gap: '12px', padding: '24px' },
// // //     canvas: { flex: 1, background: '#fff', borderRadius: '24px', margin: '24px 24px 24px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' },
// // //     tabBtn: (active) => ({
// // //         padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
// // //         background: active ? '#6366f1' : 'transparent', color: active ? '#fff' : '#64748b', border: 'none', transition: '0.2s'
// // //     }),
// // //     card: (selected) => ({
// // //         padding: '16px', borderRadius: '16px', cursor: 'pointer', background: selected ? '#fff' : 'transparent',
// // //         border: selected ? '1px solid #6366f1' : '1px solid transparent', boxShadow: selected ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', transition: 'all 0.2s'
// // //     }),
// // //     actionBtn: { border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' },
// // //     groupBadge: { fontSize: '10px', fontWeight: '700', color: '#6366f1', background: '#eef2ff', padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center' }
// // //   };

// // //   return (
// // //     <div style={styles.container}>
// // //       <div style={styles.header}>
// // //         <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // //           Stock <span style={{ color: '#6366f1', fontWeight: '500' }}>Control</span>
// // //         </h1>
        
// // //         <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
// // //           <div style={{ display: 'flex', background: '#f8fafc', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
// // //             <button onClick={() => setViewMode("all")} style={styles.tabBtn(viewMode === "all")}>All Godowns</button>
// // //             <button onClick={() => setViewMode("low-stock")} style={styles.tabBtn(viewMode === "low-stock")}>
// // //               Low Stock {stocks.filter(s => s.qtyBaseUnit <= (s.thresholdBaseUnit || 0)).length > 0 && "!"}
// // //             </button>
// // //           </div>
          
// // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // //             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // //             <input 
// // //               type="text" placeholder="Search item or group..." value={searchQuery}
// // //               onChange={(e) => setSearchQuery(e.target.value)}
// // //               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '220px', outline: 'none' }}
// // //             />
// // //           </div>
// // //         </div>
// // //       </div>

// // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
// // //         <div style={styles.sidebar}>
// // //           <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
// // //             {viewMode === "all" ? "Warehouse List" : "Critical Stock"}
// // //           </div>
// // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // //             {viewMode === "all" ? (
// // //               godowns.map(g => (
// // //                 <div key={g._id} onClick={() => setSelectedGodownId(g._id)} style={styles.card(selectedGodownId === g._id)}>
// // //                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // //                     <div style={{ fontWeight: '700', color: selectedGodownId === g._id ? '#6366f1' : '#1e293b', fontSize: '14px' }}>{g.name}</div>
// // //                     <ChevronRight size={14} color={selectedGodownId === g._id ? '#6366f1' : '#cbd5e1'} />
// // //                   </div>
// // //                   <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Monitoring {stocks.filter(s => (s.godownId?._id || s.godownId) === g._id).length} items</div>
// // //                 </div>
// // //               ))
// // //             ) : (
// // //               <div style={{ padding: '20px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #fee2e2' }}>
// // //                 <AlertTriangle size={24} color="#ef4444" style={{ margin: '0 auto 8px' }} />
// // //                 <div style={{ fontSize: '13px', fontWeight: '800', color: '#991b1b' }}>{activeStocks.length} Items Low</div>
// // //               </div>
// // //             )}
// // //           </div>
// // //         </div>

// // //         <div style={styles.canvas}>
// // //           <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', background: '#fcfcfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // //             <div>
// // //               <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '4px', textTransform: 'uppercase' }}>Current Monitoring</div>
// // //               <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
// // //                 {viewMode === "low-stock" ? "Low Stock Alerts" : (godowns.find(g => g._id === selectedGodownId)?.name || "Select Godown")}
// // //               </h2>
// // //             </div>
// // //             <button onClick={downloadExcel} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
// // //               <Download size={16} /> Export Report
// // //             </button>
// // //           </div>

// // //           <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
// // //             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // //               <thead>
// // //                 <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // //                   <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Stock Item</th>
// // //                   <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Stock Group</th>
// // //                   <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Current Qty</th>
// // //                   <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Threshold</th>
// // //                   <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
// // //                 </tr>
// // //               </thead>
// // //               <tbody>
// // //                 {activeStocks.map((it) => {
// // //                   const isLow = it.qtyBaseUnit <= (it.thresholdBaseUnit || 0);
// // //                   const unitSymbol = it.stockItemId?.unitId?.symbol || "";
// // //                   // Integrated check for populated Group Name
// // //                   const groupName = it.stockItemId?.stockGroupId?.name || "General";
// // //                   const rowId = it._id;
                  
// // //                   return (
// // //                     <tr key={rowId} style={{ borderBottom: '1px solid #f8fafc' }}>
// // //                       <td style={{ padding: '20px 12px' }}>
// // //                         <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{it.stockItemId?.name || "Standard Item"}</div>
// // //                         {viewMode === "low-stock" && <div style={{ fontSize: '11px', color: '#94a3b8' }}>Location: {it.godownId?.name}</div>}
// // //                       </td>

// // //                       <td style={{ padding: '20px 12px' }}>
// // //                         <div style={styles.groupBadge}>
// // //                           <Tag size={10} style={{ marginRight: '4px' }} />
// // //                           {groupName}
// // //                         </div>
// // //                       </td>
                      
// // //                       <td style={{ padding: '20px 12px', textAlign: 'center' }}>
// // //                         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
// // //                           <span style={{ 
// // //                             padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '800',
// // //                             background: isLow ? '#fee2e2' : '#e0f2fe', color: isLow ? '#ef4444' : '#0284c7'
// // //                           }}>
// // //                             {it.qtyBaseUnit}
// // //                           </span>
// // //                           <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>{unitSymbol}</span>
// // //                         </div>
// // //                       </td>

// // //                       <td style={{ padding: '20px 12px', textAlign: 'center', color: '#64748b', fontWeight: '600', fontSize: '13px' }}>
// // //                         {it.thresholdBaseUnit || 0} <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{unitSymbol}</span>
// // //                       </td>

// // //                       <td style={{ padding: '20px 12px', textAlign: 'right' }}>
// // //                         <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
// // //                           <div style={{ position: 'relative' }}>
// // //                             <input 
// // //                               type="number" placeholder="Set"
// // //                               value={localThresholds[rowId] ?? ""}
// // //                               onChange={(e) => setLocalThresholds(prev => ({...prev, [rowId]: e.target.value}))}
// // //                               style={{ width: '80px', padding: '6px 24px 6px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center', fontSize: '12px', fontWeight: '700' }}
// // //                             />
// // //                             <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', color: '#94a3b8' }}>{unitSymbol}</span>
// // //                           </div>

// // //                           <button 
// // //                             onClick={() => updateThreshold(rowId)}
// // //                             style={{ 
// // //                               ...styles.actionBtn,
// // //                               background: localThresholds[rowId] ? '#0f172a' : '#f1f5f9', 
// // //                               color: localThresholds[rowId] ? '#fff' : '#cbd5e1',
// // //                             }}>
// // //                             <CheckCircle2 size={16} />
// // //                           </button>

// // //                           <button 
// // //                             onClick={(e) => deleteStockItem(e, rowId)}
// // //                             title="Delete Stock Record"
// // //                             style={{ 
// // //                               ...styles.actionBtn,
// // //                               background: '#fee2e2', 
// // //                               color: '#ef4444'
// // //                             }}>
// // //                             <Trash2 size={16} />
// // //                           </button>
// // //                         </div>
// // //                       </td>
// // //                     </tr>
// // //                   );
// // //                 })}
// // //               </tbody>
// // //             </table>

// // //             {activeStocks.length === 0 && (
// // //               <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>
// // //                 <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
// // //                 <div style={{ fontWeight: '700' }}>No stock items found in this view</div>
// // //               </div>
// // //             )}
// // //           </div>
// // //         </div>
// // //       </div>
// // //     </div>
// // //   );
// // // };




// // import { useEffect, useMemo, useState, useCallback } from "react";
// // import { api } from "../api.js";
// // import { useToast } from "../toast.jsx";
// // import * as XLSX from 'xlsx';
// // import { 
// //   Search, FileSpreadsheet, Plus, Trash2, Edit3, 
// //   Package, Layers, MapPin, Ruler, Upload, Loader2, Check, X, Tag
// // } from "lucide-react";

// // const tabs = [
// //   { key: "stock-groups", label: "Stock Groups", icon: Layers },
// //   { key: "units", label: "Units & Sub-units", icon: Ruler },
// //   { key: "stock-items", label: "Stock Items", icon: Package },
// //   { key: "godowns", label: "Godowns", icon: MapPin }
// // ];

// // export const InventoryPage = () => {
// //   const { showToast } = useToast();
// //   const [tab, setTab] = useState("stock-groups");
// //   const [rows, setRows] = useState([]);
// //   const [q, setQ] = useState("");
// //   const [form, setForm] = useState({ 
// //     name: "", symbol: "", stockGroupId: "", subName: "", 
// //     factor: "", imageUrl: "", unitId: "", defaultThreshold: "" 
// //   });
// //   const [meta, setMeta] = useState({ stockGroups: [], units: [] });
// //   const [editingId, setEditingId] = useState("");
// //   const [editName, setEditName] = useState("");
// //   const [uploading, setUploading] = useState(false);

// //   // Filtered units based on selected group (for Stock Item creation)
// //   const filteredUnits = useMemo(() => {
// //     if (!form.stockGroupId) return [];
// //     return meta.units.filter(u => 
// //       (u.stockGroupId?._id || u.stockGroupId) === form.stockGroupId
// //     );
// //   }, [meta.units, form.stockGroupId]);

// //   const load = useCallback(async () => {
// //     try {
// //       const res = await api.get(`/inventory/${tab}`, { params: { q } });
// //       setRows(res.data || []);
// //     } catch (error) {
// //       showToast("Failed to load data", "error");
// //     }
// //   }, [tab, q, showToast]);

// //   const refreshMeta = useCallback(async () => {
// //     try {
// //       const [groupsRes, unitsRes] = await Promise.all([
// //         api.get("/inventory/stock-groups"),
// //         api.get("/inventory/units")
// //       ]);
// //       setMeta({ stockGroups: groupsRes.data, units: unitsRes.data });
// //     } catch (error) {
// //       console.error("Meta fetch error", error);
// //     }
// //   }, []);

// //   useEffect(() => { load(); }, [load]);
// //   useEffect(() => { refreshMeta(); }, [refreshMeta]);

// //   const handleExport = () => {
// //     if (rows.length === 0) return showToast("No data to export", "error");
// //     const dataToExport = rows.map(row => ({
// //       ID: row._id,
// //       Name: row.name,
// //       ...(tab === "units" && { Symbol: row.symbol, Group: row.stockGroupId?.name }),
// //       ...(tab === "stock-items" && { Group: row.stockGroupId?.name, Unit: row.unitId?.symbol, Threshold: row.defaultThreshold })
// //     }));
// //     const worksheet = XLSX.utils.json_to_sheet(dataToExport);
// //     const workbook = XLSX.utils.book_new();
// //     XLSX.utils.book_append_sheet(workbook, worksheet, tab);
// //     XLSX.writeFile(workbook, `Inventory_${tab}.xlsx`);
// //   };

// //   const handleImageUpload = async (e) => {
// //     const file = e.target.files[0];
// //     if (!file) return;
// //     setUploading(true);
// //     const formData = new FormData();
// //     formData.append("image", file);
// //     try {
// //       const res = await api.post("/inventory/stock-items/upload-image", formData);
// //       setForm(prev => ({ ...prev, imageUrl: res.data.imageUrl }));
// //       showToast("Image uploaded", "success");
// //     } catch (error) {
// //       showToast("Upload failed", "error");
// //     } finally { setUploading(false); }
// //   };

// //   const addRow = async () => {
// //     if (!form.name?.trim()) return showToast("Name is required", "error");
// //     try {
// //       let payload = { name: form.name };
// //       if (tab === "units") {
// //         payload = { ...payload, symbol: form.symbol, stockGroupId: form.stockGroupId };
// //       } else if (tab === "stock-items") {
// //         payload = { 
// //           ...payload, 
// //           imageUrl: form.imageUrl, 
// //           stockGroupId: form.stockGroupId, 
// //           unitId: form.unitId,
// //           defaultThreshold: Number(form.defaultThreshold || 0)
// //         };
// //       }

// //       await api.post(`/inventory/${tab}`, payload);
// //       showToast("Added successfully", "success");
// //       setForm({ name: "", symbol: "", stockGroupId: "", subName: "", factor: "", imageUrl: "", unitId: "", defaultThreshold: "" });
// //       load();
// //       refreshMeta();
// //     } catch (error) {
// //       showToast(error?.response?.data?.message || "Action failed", "error");
// //     }
// //   };

// //   const removeRow = async (id) => {
// //     if (!window.confirm("Delete this item?")) return;
// //     try {
// //       await api.delete(`/inventory/${tab}/${id}`);
// //       showToast("Deleted", "success");
// //       load();
// //     } catch (error) { showToast("Delete failed", "error"); }
// //   };

// //   const startEdit = (row) => {
// //     setEditingId(row._id);
// //     setEditName(row.name);
// //   };

// //   const saveEdit = async (id) => {
// //     try {
// //       await api.put(`/inventory/${tab}/${id}`, { name: editName });
// //       setEditingId("");
// //       load();
// //       showToast("Updated", "success");
// //     } catch (error) { showToast("Update failed", "error"); }
// //   };

// //   return (
// //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
// //       {/* Header */}
// //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// //         <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// //           Inventory <span style={{ color: '#6366f1', fontWeight: '500' }}>Master</span>
// //         </h1>
// //         <div style={{ display: 'flex', gap: '12px' }}>
// //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// //             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// //             <input type="text" placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)}
// //               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '200px', outline: 'none' }} />
// //           </div>
// //           <button onClick={handleExport} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '0 16px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// //             <FileSpreadsheet size={16} /> Export
// //           </button>
// //         </div>
// //       </div>

// //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
// //         {/* Sidebar */}
// //         <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// //           {tabs.map((t) => (
// //             <div key={t.key} onClick={() => { setTab(t.key); setQ(""); }}
// //               style={{
// //                 padding: '14px 18px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
// //                 background: tab === t.key ? '#6366f1' : 'transparent', color: tab === t.key ? '#fff' : '#64748b',
// //                 fontWeight: '700', transition: '0.2s'
// //               }}>
// //               <t.icon size={18} /> {t.label}
// //             </div>
// //           ))}
// //         </div>

// //         {/* Content */}
// //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// //           <div style={{ padding: '24px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
// //             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
// //               <div style={{ flex: 1 }}>
// //                 <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>NAME</label>
// //                 <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} placeholder="Enter name..." value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
// //               </div>

// //               {(tab === "stock-items" || tab === "units") && (
// //                 <div style={{ width: '180px' }}>
// //                   <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>STOCK GROUP</label>
// //                   <select style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={form.stockGroupId} onChange={(e) => setForm({...form, stockGroupId: e.target.value})}>
// //                     <option value="">Select Group...</option>
// //                     {meta.stockGroups.map(sg => <option key={sg._id} value={sg._id}>{sg.name}</option>)}
// //                   </select>
// //                 </div>
// //               )}

// //               {tab === "stock-items" && (
// //                 <>
// //                   <div style={{ width: '140px' }}>
// //                     <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>UNIT</label>
// //                     <select style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={form.unitId} onChange={(e) => setForm({...form, unitId: e.target.value})} disabled={!form.stockGroupId}>
// //                       <option value="">{form.stockGroupId ? "Select Unit" : "Select Group first"}</option>
// //                       {filteredUnits.map(u => <option key={u._id} value={u._id}>{u.symbol}</option>)}
// //                     </select>
// //                   </div>
// //                   <div style={{ width: '120px' }}>
// //                     <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>IMAGE</label>
// //                     <label htmlFor="img-up" style={{ display: 'block', padding: '10px', border: '1px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', fontSize: '12px' }}>
// //                       {uploading ? "..." : form.imageUrl ? "✓ Set" : "Upload"}
// //                     </label>
// //                     <input id="img-up" type="file" hidden onChange={handleImageUpload} />
// //                   </div>
// //                 </>
// //               )}

// //               {tab === "units" && (
// //                 <div style={{ width: '100px' }}>
// //                   <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>SYMBOL</label>
// //                   <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} placeholder="Kg" value={form.symbol} onChange={(e) => setForm({...form, symbol: e.target.value})} />
// //                 </div>
// //               )}

// //               <button onClick={addRow} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
// //                 <Plus size={16} />
// //               </button>
// //             </div>
// //           </div>

// //           <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
// //             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// //               <thead>
// //                 <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
// //                   <th style={{ padding: '16px 8px', fontSize: '11px', color: '#94a3b8' }}>ITEM DETAILS</th>
// //                   <th style={{ padding: '16px 8px', fontSize: '11px', color: '#94a3b8' }}>STOCK GROUP</th>
// //                   <th style={{ padding: '16px 8px', fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>ACTIONS</th>
// //                 </tr>
// //               </thead>
// //               <tbody>
// //                 {rows.map((row) => (
// //                   <tr key={row._id} style={{ borderBottom: '1px solid #f8fafc' }}>
// //                     <td style={{ padding: '16px 8px' }}>
// //                       <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
// //                         {tab === "stock-items" && (
// //                           <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f1f5f9', overflow: 'hidden' }}>
// //                             {row.imageUrl ? <img src={row.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={16} style={{ margin: '10px' }} color="#cbd5e1" />}
// //                           </div>
// //                         )}
// //                         <div>
// //                           {editingId === row._id ? (
// //                             <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ border: '2px solid #6366f1', padding: '4px', borderRadius: '4px' }} />
// //                           ) : (
// //                             <div style={{ fontWeight: '700', color: '#1e293b' }}>{row.name} {row.symbol && `(${row.symbol})`}</div>
// //                           )}
// //                         </div>
// //                       </div>
// //                     </td>
// //                     <td style={{ padding: '16px 8px' }}>
// //                       {row.stockGroupId?.name ? (
// //                         <span style={{ fontSize: '11px', fontWeight: '700', color: '#6366f1', background: '#eef2ff', padding: '4px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
// //                           <Tag size={10} /> {row.stockGroupId.name}
// //                         </span>
// //                       ) : <span style={{ color: '#cbd5e1', fontSize: '11px' }}>—</span>}
// //                     </td>
// //                     <td style={{ padding: '16px 8px', textAlign: 'right' }}>
// //                       <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
// //                         {editingId === row._id ? (
// //                           <button onClick={() => saveEdit(row._id)} style={{ border: 'none', background: '#f0fdf4', color: '#16a34a', padding: '6px', borderRadius: '6px' }}><Check size={16} /></button>
// //                         ) : (
// //                           <button onClick={() => startEdit(row)} style={{ border: 'none', background: '#f1f5f9', color: '#64748b', padding: '6px', borderRadius: '6px' }}><Edit3 size={16} /></button>
// //                         )}
// //                         <button onClick={() => removeRow(row._id)} style={{ border: 'none', background: '#fee2e2', color: '#ef4444', padding: '6px', borderRadius: '6px' }}><Trash2 size={16} /></button>
// //                       </div>
// //                     </td>
// //                   </tr>
// //                 ))}
// //               </tbody>
// //             </table>
// //           </div>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // };









// import { useEffect, useMemo, useState, useCallback } from "react";
// import { api } from "../api.js";
// import { toast } from "react-hot-toast";
// import * as XLSX from "xlsx";
// import { 
//   Search, 
//   ChevronRight, 
//   AlertTriangle, 
//   Download,
//   CheckCircle2,
//   Package,
//   Trash2,
//   Tag
// } from "lucide-react";

// export const GodownsPage = () => {
//   const [godowns, setGodowns] = useState([]);
//   const [stocks, setStocks] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedGodownId, setSelectedGodownId] = useState(null);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [viewMode, setViewMode] = useState("all"); // "all" or "low-stock"
//   const [localThresholds, setLocalThresholds] = useState({});

//   const loadData = useCallback(async () => {
//     setLoading(true);
//     try {
//       const [godRes, stockRes] = await Promise.all([
//         api.get("/inventory/godowns"),
//         api.get("/godown-stocks")
//       ]);
//       setGodowns(godRes.data || []);
//       setStocks(stockRes.data || []);
      
//       if (godRes.data?.length > 0 && !selectedGodownId) {
//         setSelectedGodownId(godRes.data[0]._id);
//       }
//     } catch (error) {
//       toast.error("Failed to sync inventory data");
//     } finally {
//       setLoading(false);
//     }
//   }, [selectedGodownId]);

//   useEffect(() => { loadData(); }, [loadData]);

//   // --- ACTIONS ---
//   const deleteStockItem = async (e, rowId) => {
//     e.stopPropagation();
//     if (!window.confirm("Are you sure you want to remove this item from stock records?")) return;
    
//     try {
//       await api.delete(`/godown-stocks/${rowId}`);
//       toast.success("Item removed from stock");
//       setStocks(prev => prev.filter(item => item._id !== rowId));
//     } catch (error) {
//       console.error(error);
//       toast.error("Failed to delete item.");
//     }
//   };

//   const updateThreshold = async (rowId) => {
//     const value = localThresholds[rowId];
//     if (value === undefined || value === "") {
//       toast.error("Please enter a value first");
//       return;
//     }
//     try {
//       await api.post(`/godown-stocks/${rowId}/threshold`, { thresholdBaseUnit: Number(value) });
//       toast.success("Threshold updated");
//       setLocalThresholds(prev => {
//         const next = { ...prev };
//         delete next[rowId];
//         return next;
//       });
//       loadData(); 
//     } catch (error) {
//       toast.error("Update failed");
//     }
//   };

//   // --- UPDATED SEARCH & FILTER LOGIC ---
//   const activeStocks = useMemo(() => {
//     let filtered = stocks;
    
//     // 1. Filter by Godown or Low Stock Mode
//     if (viewMode === "low-stock") {
//       filtered = stocks.filter(s => s.qtyBaseUnit <= (s.thresholdBaseUnit || 0));
//     } else {
//       filtered = stocks.filter(s => (s.godownId?._id || s.godownId) === selectedGodownId);
//     }

//     // 2. Search by Item Name OR Group Name (Integrated)
//     if (searchQuery.trim()) {
//       const q = searchQuery.toLowerCase();
//       filtered = filtered.filter(it => {
//         const itemName = it.stockItemId?.name?.toLowerCase() || "";
//         // Accessing the populated group object name from the backend update
//         const groupName = it.stockItemId?.stockGroupId?.name?.toLowerCase() || ""; 
//         return itemName.includes(q) || groupName.includes(q);
//       });
//     }
//     return filtered;
//   }, [stocks, selectedGodownId, viewMode, searchQuery]);

//   const downloadExcel = () => {
//     const data = activeStocks.map(it => ({
//       "Godown": it.godownId?.name || "N/A",
//       "Item": it.stockItemId?.name || "N/A",
//       "Stock Group": it.stockItemId?.stockGroupId?.name || "General",
//       "Current Qty": it.qtyBaseUnit,
//       "Unit": it.stockItemId?.unitId?.symbol || "",
//       "Threshold": it.thresholdBaseUnit || 0,
//       "Status": it.qtyBaseUnit <= (it.thresholdBaseUnit || 0) ? "LOW" : "OK"
//     }));
//     const worksheet = XLSX.utils.json_to_sheet(data);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, "Stock_Report");
//     XLSX.writeFile(workbook, `Stock_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
//   };

//   const styles = {
//     container: { height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" },
//     header: { padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
//     sidebar: { width: '380px', display: 'flex', flexDirection: 'column', gap: '12px', padding: '24px' },
//     canvas: { flex: 1, background: '#fff', borderRadius: '24px', margin: '24px 24px 24px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' },
//     tabBtn: (active) => ({
//         padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
//         background: active ? '#6366f1' : 'transparent', color: active ? '#fff' : '#64748b', border: 'none', transition: '0.2s'
//     }),
//     card: (selected) => ({
//         padding: '16px', borderRadius: '16px', cursor: 'pointer', background: selected ? '#fff' : 'transparent',
//         border: selected ? '1px solid #6366f1' : '1px solid transparent', boxShadow: selected ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', transition: 'all 0.2s'
//     }),
//     actionBtn: { border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' },
//     groupBadge: { fontSize: '10px', fontWeight: '700', color: '#6366f1', background: '#eef2ff', padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center' }
//   };

//   return (
//     <div style={styles.container}>
//       <div style={styles.header}>
//         <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
//           Stock <span style={{ color: '#6366f1', fontWeight: '500' }}>Control</span>
//         </h1>
        
//         <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
//           <div style={{ display: 'flex', background: '#f8fafc', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
//             <button onClick={() => setViewMode("all")} style={styles.tabBtn(viewMode === "all")}>All Godowns</button>
//             <button onClick={() => setViewMode("low-stock")} style={styles.tabBtn(viewMode === "low-stock")}>
//               Low Stock {stocks.filter(s => s.qtyBaseUnit <= (s.thresholdBaseUnit || 0)).length > 0 && "!"}
//             </button>
//           </div>
          
//           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
//             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
//             <input 
//               type="text" placeholder="Search item or group..." value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '220px', outline: 'none' }}
//             />
//           </div>
//         </div>
//       </div>

//       <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
//         <div style={styles.sidebar}>
//           <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
//             {viewMode === "all" ? "Warehouse List" : "Critical Stock"}
//           </div>
//           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
//             {viewMode === "all" ? (
//               godowns.map(g => (
//                 <div key={g._id} onClick={() => setSelectedGodownId(g._id)} style={styles.card(selectedGodownId === g._id)}>
//                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//                     <div style={{ fontWeight: '700', color: selectedGodownId === g._id ? '#6366f1' : '#1e293b', fontSize: '14px' }}>{g.name}</div>
//                     <ChevronRight size={14} color={selectedGodownId === g._id ? '#6366f1' : '#cbd5e1'} />
//                   </div>
//                   <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Monitoring {stocks.filter(s => (s.godownId?._id || s.godownId) === g._id).length} items</div>
//                 </div>
//               ))
//             ) : (
//               <div style={{ padding: '20px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #fee2e2' }}>
//                 <AlertTriangle size={24} color="#ef4444" style={{ margin: '0 auto 8px' }} />
//                 <div style={{ fontSize: '13px', fontWeight: '800', color: '#991b1b' }}>{activeStocks.length} Items Low</div>
//               </div>
//             )}
//           </div>
//         </div>

//         <div style={styles.canvas}>
//           <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', background: '#fcfcfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//             <div>
//               <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '4px', textTransform: 'uppercase' }}>Current Monitoring</div>
//               <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
//                 {viewMode === "low-stock" ? "Low Stock Alerts" : (godowns.find(g => g._id === selectedGodownId)?.name || "Select Godown")}
//               </h2>
//             </div>
//             <button onClick={downloadExcel} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
//               <Download size={16} /> Export Report
//             </button>
//           </div>

//           <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
//             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//               <thead>
//                 <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
//                   <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Stock Item</th>
//                   <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Stock Group</th>
//                   <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Current Qty</th>
//                   <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Threshold</th>
//                   <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {activeStocks.map((it) => {
//                   const isLow = it.qtyBaseUnit <= (it.thresholdBaseUnit || 0);
//                   const unitSymbol = it.stockItemId?.unitId?.symbol || "";
//                   // Integrated check for populated Group Name
//                   const groupName = it.stockItemId?.stockGroupId?.name || "General";
//                   const rowId = it._id;
                  
//                   return (
//                     <tr key={rowId} style={{ borderBottom: '1px solid #f8fafc' }}>
//                       <td style={{ padding: '20px 12px' }}>
//                         <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{it.stockItemId?.name || "Standard Item"}</div>
//                         {viewMode === "low-stock" && <div style={{ fontSize: '11px', color: '#94a3b8' }}>Location: {it.godownId?.name}</div>}
//                       </td>

//                       <td style={{ padding: '20px 12px' }}>
//                         <div style={styles.groupBadge}>
//                           <Tag size={10} style={{ marginRight: '4px' }} />
//                           {groupName}
//                         </div>
//                       </td>
                      
//                       <td style={{ padding: '20px 12px', textAlign: 'center' }}>
//                         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
//                           <span style={{ 
//                             padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '800',
//                             background: isLow ? '#fee2e2' : '#e0f2fe', color: isLow ? '#ef4444' : '#0284c7'
//                           }}>
//                             {it.qtyBaseUnit}
//                           </span>
//                           <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>{unitSymbol}</span>
//                         </div>
//                       </td>

//                       <td style={{ padding: '20px 12px', textAlign: 'center', color: '#64748b', fontWeight: '600', fontSize: '13px' }}>
//                         {it.thresholdBaseUnit || 0} <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{unitSymbol}</span>
//                       </td>

//                       <td style={{ padding: '20px 12px', textAlign: 'right' }}>
//                         <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
//                           <div style={{ position: 'relative' }}>
//                             <input 
//                               type="number" placeholder="Set"
//                               value={localThresholds[rowId] ?? ""}
//                               onChange={(e) => setLocalThresholds(prev => ({...prev, [rowId]: e.target.value}))}
//                               style={{ width: '80px', padding: '6px 24px 6px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center', fontSize: '12px', fontWeight: '700' }}
//                             />
//                             <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', color: '#94a3b8' }}>{unitSymbol}</span>
//                           </div>

//                           <button 
//                             onClick={() => updateThreshold(rowId)}
//                             style={{ 
//                               ...styles.actionBtn,
//                               background: localThresholds[rowId] ? '#0f172a' : '#f1f5f9', 
//                               color: localThresholds[rowId] ? '#fff' : '#cbd5e1',
//                             }}>
//                             <CheckCircle2 size={16} />
//                           </button>

//                           <button 
//                             onClick={(e) => deleteStockItem(e, rowId)}
//                             title="Delete Stock Record"
//                             style={{ 
//                               ...styles.actionBtn,
//                               background: '#fee2e2', 
//                               color: '#ef4444'
//                             }}>
//                             <Trash2 size={16} />
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>

//             {activeStocks.length === 0 && (
//               <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>
//                 <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
//                 <div style={{ fontWeight: '700' }}>No stock items found in this view</div>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };





import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "../api.js";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import { 
  Search, 
  ChevronRight, 
  AlertTriangle, 
  Download,
  CheckCircle2,
  Package,
  Trash2,
  Tag,
  FileSpreadsheet // Added icon for Master Excel
} from "lucide-react";

export const GodownsPage = () => {
  const [godowns, setGodowns] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGodownId, setSelectedGodownId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("all"); // "all" or "low-stock"
  const [localThresholds, setLocalThresholds] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [godRes, stockRes] = await Promise.all([
        api.get("/inventory/godowns"),
        api.get("/godown-stocks")
      ]);
      setGodowns(godRes.data || []);
      setStocks(stockRes.data || []);
      
      if (godRes.data?.length > 0 && !selectedGodownId) {
        setSelectedGodownId(godRes.data[0]._id);
      }
    } catch (error) {
      toast.error("Failed to sync inventory data");
    } finally {
      setLoading(false);
    }
  }, [selectedGodownId]);

  useEffect(() => { loadData(); }, [loadData]);

  // --- ACTIONS ---
  const deleteStockItem = async (e, rowId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to remove this item from stock records?")) return;
    
    try {
      await api.delete(`/godown-stocks/${rowId}`);
      toast.success("Item removed from stock");
      setStocks(prev => prev.filter(item => item._id !== rowId));
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete item.");
    }
  };

  const updateThreshold = async (rowId) => {
    const value = localThresholds[rowId];
    if (value === undefined || value === "") {
      toast.error("Please enter a value first");
      return;
    }
    try {
      await api.post(`/godown-stocks/${rowId}/threshold`, { thresholdBaseUnit: Number(value) });
      toast.success("Threshold updated");
      setLocalThresholds(prev => {
        const next = { ...prev };
        delete next[rowId];
        return next;
      });
      loadData(); 
    } catch (error) {
      toast.error("Update failed");
    }
  };

  // --- FILTERED EXCEL (Current View) ---
  const downloadExcel = () => {
    const data = activeStocks.map(it => ({
      "Godown": it.godownId?.name || "N/A",
      "Item": it.stockItemId?.name || "N/A",
      "Stock Group": it.stockItemId?.stockGroupId?.name || "General",
      "Current Qty": it.qtyBaseUnit,
      "Unit": it.stockItemId?.unitId?.symbol || "",
      "Threshold": it.thresholdBaseUnit || 0,
      "Status": it.qtyBaseUnit <= (it.thresholdBaseUnit || 0) ? "LOW" : "OK"
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock_Report");
    XLSX.writeFile(workbook, `Stock_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // --- MASTER EXCEL DOWNLOAD (Pivoted by Godown Columns) ---
  const downloadMasterExcel = () => {
    if (stocks.length === 0) return toast.error("No data to export");

    // 1. Get unique Godown names for columns
    const godownNames = [...new Set(godowns.map(g => g.name))].sort();

    // 2. Group stocks by Item ID (so one row per unique item)
    const itemMap = {};

    stocks.forEach(it => {
      const itemId = it.stockItemId?._id || it.stockItemId;
      const itemName = it.stockItemId?.name || "Unknown Item";
      
      if (!itemMap[itemId]) {
        itemMap[itemId] = {
          "Stock Item": itemName,
          "Stock Group": it.stockItemId?.stockGroupId?.name || "General",
          "Units": it.stockItemId?.unitId?.symbol || "",
          // Initialize all godown columns with 0
          ...Object.fromEntries(godownNames.map(name => [name, 0]))
        };
      }
      
      // Assign the quantity to the specific godown column
      const gName = it.godownId?.name || "N/A";
      if (itemMap[itemId].hasOwnProperty(gName)) {
        itemMap[itemId][gName] = it.qtyBaseUnit;
      }
    });

    // 3. Convert Map to Array and add S.No
    const finalData = Object.values(itemMap).map((row, index) => ({
      "S.No": index + 1,
      ...row
    }));

    // 4. Generate Excel
    const worksheet = XLSX.utils.json_to_sheet(finalData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Master_Stock");

    // Set column widths (S.No, Item, Group, Units, then the Godowns)
    const cols = [
      { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, 
      ...godownNames.map(() => ({ wch: 15 }))
    ];
    worksheet["!cols"] = cols;

    XLSX.writeFile(workbook, `Master_Inventory_Pivoted_${new Date().toLocaleDateString()}.xlsx`);
  };

  const activeStocks = useMemo(() => {
    let filtered = stocks;
    if (viewMode === "low-stock") {
      filtered = stocks.filter(s => s.qtyBaseUnit <= (s.thresholdBaseUnit || 0));
    } else {
      filtered = stocks.filter(s => (s.godownId?._id || s.godownId) === selectedGodownId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(it => {
        const itemName = it.stockItemId?.name?.toLowerCase() || "";
        const groupName = it.stockItemId?.stockGroupId?.name?.toLowerCase() || ""; 
        return itemName.includes(q) || groupName.includes(q);
      });
    }
    return filtered;
  }, [stocks, selectedGodownId, viewMode, searchQuery]);

  const styles = {
    container: { height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" },
    header: { padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    sidebar: { width: '380px', display: 'flex', flexDirection: 'column', gap: '12px', padding: '24px' },
    canvas: { flex: 1, background: '#fff', borderRadius: '24px', margin: '24px 24px 24px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' },
    tabBtn: (active) => ({
        padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
        background: active ? '#6366f1' : 'transparent', color: active ? '#fff' : '#64748b', border: 'none', transition: '0.2s'
    }),
    card: (selected) => ({
        padding: '16px', borderRadius: '16px', cursor: 'pointer', background: selected ? '#fff' : 'transparent',
        border: selected ? '1px solid #6366f1' : '1px solid transparent', boxShadow: selected ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', transition: 'all 0.2s'
    }),
    actionBtn: { border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' },
    groupBadge: { fontSize: '10px', fontWeight: '700', color: '#6366f1', background: '#eef2ff', padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center' },
    masterBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
          Stock <span style={{ color: '#6366f1', fontWeight: '500' }}>Control</span>
        </h1>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: '#f8fafc', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <button onClick={() => setViewMode("all")} style={styles.tabBtn(viewMode === "all")}>All Godowns</button>
            <button onClick={() => setViewMode("low-stock")} style={styles.tabBtn(viewMode === "low-stock")}>
              Low Stock {stocks.filter(s => s.qtyBaseUnit <= (s.thresholdBaseUnit || 0)).length > 0 && "!"}
            </button>
          </div>
          
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
            <input 
              type="text" placeholder="Search item or group..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '220px', outline: 'none' }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={styles.sidebar}>
          <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {viewMode === "all" ? "Warehouse List" : "Critical Stock"}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {viewMode === "all" ? (
              godowns.map(g => (
                <div key={g._id} onClick={() => setSelectedGodownId(g._id)} style={styles.card(selectedGodownId === g._id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: '700', color: selectedGodownId === g._id ? '#6366f1' : '#1e293b', fontSize: '14px' }}>{g.name}</div>
                    <ChevronRight size={14} color={selectedGodownId === g._id ? '#6366f1' : '#cbd5e1'} />
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Monitoring {stocks.filter(s => (s.godownId?._id || s.godownId) === g._id).length} items</div>
                </div>
              ))
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #fee2e2' }}>
                <AlertTriangle size={24} color="#ef4444" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#991b1b' }}>{activeStocks.length} Items Low</div>
              </div>
            )}
          </div>
        </div>

        <div style={styles.canvas}>
          <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', background: '#fcfcfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '4px', textTransform: 'uppercase' }}>Current Monitoring</div>
              <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                {viewMode === "low-stock" ? "Low Stock Alerts" : (godowns.find(g => g._id === selectedGodownId)?.name || "Select Godown")}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {/* MASTER EXCEL BUTTON */}
              <button onClick={downloadMasterExcel} style={styles.masterBtn}>
                <FileSpreadsheet size={16} /> Master Excel
              </button>
              {/* FILTERED EXCEL BUTTON */}
              <button onClick={downloadExcel} style={{ ...styles.masterBtn, background: '#10b981' }}>
                <Download size={16} /> Export View
              </button>
            </div>
          </div>

          <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
                  <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Stock Item</th>
                  <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Stock Group</th>
                  <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Current Qty</th>
                  <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Threshold</th>
                  <th style={{ padding: '12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeStocks.map((it) => {
                  const isLow = it.qtyBaseUnit <= (it.thresholdBaseUnit || 0);
                  const unitSymbol = it.stockItemId?.unitId?.symbol || "";
                  const groupName = it.stockItemId?.stockGroupId?.name || "General";
                  const rowId = it._id;
                  
                  return (
                    <tr key={rowId} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '20px 12px' }}>
                        <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{it.stockItemId?.name || "Standard Item"}</div>
                        {viewMode === "low-stock" && <div style={{ fontSize: '11px', color: '#94a3b8' }}>Location: {it.godownId?.name}</div>}
                      </td>

                      <td style={{ padding: '20px 12px' }}>
                        <div style={styles.groupBadge}>
                          <Tag size={10} style={{ marginRight: '4px' }} />
                          {groupName}
                        </div>
                      </td>
                      
                      <td style={{ padding: '20px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <span style={{ 
                            padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '800',
                            background: isLow ? '#fee2e2' : '#e0f2fe', color: isLow ? '#ef4444' : '#0284c7'
                          }}>
                            {it.qtyBaseUnit}
                          </span>
                          <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>{unitSymbol}</span>
                        </div>
                      </td>

                      <td style={{ padding: '20px 12px', textAlign: 'center', color: '#64748b', fontWeight: '600', fontSize: '13px' }}>
                        {it.thresholdBaseUnit || 0} <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{unitSymbol}</span>
                      </td>

                      <td style={{ padding: '20px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <div style={{ position: 'relative' }}>
                            <input 
                              type="number" placeholder="Set"
                              value={localThresholds[rowId] ?? ""}
                              onChange={(e) => setLocalThresholds(prev => ({...prev, [rowId]: e.target.value}))}
                              style={{ width: '80px', padding: '6px 24px 6px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center', fontSize: '12px', fontWeight: '700' }}
                            />
                            <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', color: '#94a3b8' }}>{unitSymbol}</span>
                          </div>

                          <button 
                            onClick={() => updateThreshold(rowId)}
                            style={{ 
                              ...styles.actionBtn,
                              background: localThresholds[rowId] ? '#0f172a' : '#f1f5f9', 
                              color: localThresholds[rowId] ? '#fff' : '#cbd5e1',
                            }}>
                            <CheckCircle2 size={16} />
                          </button>

                          <button 
                            onClick={(e) => deleteStockItem(e, rowId)}
                            title="Delete Stock Record"
                            style={{ 
                              ...styles.actionBtn,
                              background: '#fee2e2', 
                              color: '#ef4444'
                            }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {activeStocks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>
                <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                <div style={{ fontWeight: '700' }}>No stock items found in this view</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};