
// // // // // // // // // // // // // // // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // // // // // // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // // // // // // // import { useToast } from "../toast.jsx";
// // // // // // // // // // // // // // // // import * as XLSX from "xlsx";
// // // // // // // // // // // // // // // // import { Search, FileSpreadsheet, CheckCircle2 } from "lucide-react";

// // // // // // // // // // // // // // // // export const IndentPage = () => {
// // // // // // // // // // // // // // // //   const { showToast } = useToast();
// // // // // // // // // // // // // // // //   const [view, setView] = useState("history");
// // // // // // // // // // // // // // // //   const [searchTerm, setSearchTerm] = useState("");
// // // // // // // // // // // // // // // //   const [stockItems, setStockItems] = useState([]);
// // // // // // // // // // // // // // // //   const [indents, setIndents] = useState([]);
// // // // // // // // // // // // // // // //   const [selectedItems, setSelectedItems] = useState({});
// // // // // // // // // // // // // // // //   const [selectedId, setSelectedId] = useState(null);

// // // // // // // // // // // // // // // //   const load = useCallback(async () => {
// // // // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // // // //       const [itemsRes, indentRes] = await Promise.all([
// // // // // // // // // // // // // // // //         // Ensure backend populates unitId for stock items
// // // // // // // // // // // // // // // //         api.get("/inventory/stock-items"),
// // // // // // // // // // // // // // // //         api.get("/indents")
// // // // // // // // // // // // // // // //       ]);
// // // // // // // // // // // // // // // //       setStockItems(itemsRes.data || []);
// // // // // // // // // // // // // // // //       const sorted = (indentRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // // // // // // // // // // //       setIndents(sorted);
// // // // // // // // // // // // // // // //       if (sorted.length > 0 && !selectedId) setSelectedId(sorted[0]._id);
// // // // // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // // // // //       showToast("Failed to load data", "error");
// // // // // // // // // // // // // // // //     }
// // // // // // // // // // // // // // // //   }, [showToast, selectedId]);

// // // // // // // // // // // // // // // //   useEffect(() => { load(); }, [load]);

// // // // // // // // // // // // // // // //   // Helper to find unit symbol safely
// // // // // // // // // // // // // // // //   const getUnitSymbol = (item) => {
// // // // // // // // // // // // // // // //     // 1. Try populated unitId from the item itself (if it comes from Indent)
// // // // // // // // // // // // // // // //     if (item.stockItemId?.unitId?.symbol) return item.stockItemId.unitId.symbol;
    
// // // // // // // // // // // // // // // //     // 2. Fallback: Search in the master stockItems list
// // // // // // // // // // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // // // // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // // // // // // // // // //     return found?.unitId?.symbol || "";
// // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // //   const getItemName = (item) => {
// // // // // // // // // // // // // // // //     if (item.stockItemId?.name) return item.stockItemId.name;
// // // // // // // // // // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // // // // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // // // // // // // // // //     return found ? found.name : "Unknown Product";
// // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // //   const handleDownloadExcel = () => {
// // // // // // // // // // // // // // // //     if (!activeIndent) return;
// // // // // // // // // // // // // // // //     const data = activeIndent.items.map(item => ({
// // // // // // // // // // // // // // // //       "Product": getItemName(item),
// // // // // // // // // // // // // // // //       "Quantity": item.orderedQty,
// // // // // // // // // // // // // // // //       "Unit": getUnitSymbol(item), // Added Unit to Excel
// // // // // // // // // // // // // // // //       "Price": item.unitPrice,
// // // // // // // // // // // // // // // //       "Subtotal": item.orderedQty * item.unitPrice
// // // // // // // // // // // // // // // //     }));
// // // // // // // // // // // // // // // //     const ws = XLSX.utils.json_to_sheet(data);
// // // // // // // // // // // // // // // //     const wb = XLSX.utils.book_new();
// // // // // // // // // // // // // // // //     XLSX.utils.book_append_sheet(wb, ws, "Indent");
// // // // // // // // // // // // // // // //     XLSX.writeFile(wb, `Indent_${activeIndent.indentNo || 'Export'}.xlsx`);
// // // // // // // // // // // // // // // //     showToast("Excel exported successfully", "success");
// // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // //   // ... (Keep existing filteredIndents, filteredStock, activeIndent, handleSelectAll, handleStatusUpdate, submitIndent logic)
// // // // // // // // // // // // // // // //   const filteredIndents = useMemo(() => {
// // // // // // // // // // // // // // // //     return indents.filter(i =>
// // // // // // // // // // // // // // // //       (i.indentNo?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
// // // // // // // // // // // // // // // //       (i._id.includes(searchTerm))
// // // // // // // // // // // // // // // //     );
// // // // // // // // // // // // // // // //   }, [indents, searchTerm]);

// // // // // // // // // // // // // // // //   const filteredStock = useMemo(() => {
// // // // // // // // // // // // // // // //     return stockItems.filter(s =>
// // // // // // // // // // // // // // // //       s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
// // // // // // // // // // // // // // // //       s.stockGroupId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
// // // // // // // // // // // // // // // //     );
// // // // // // // // // // // // // // // //   }, [stockItems, searchTerm]);

// // // // // // // // // // // // // // // //   const activeIndent = useMemo(() =>
// // // // // // // // // // // // // // // //     indents.find(i => i._id === selectedId) || indents[0],
// // // // // // // // // // // // // // // //     [selectedId, indents]);

// // // // // // // // // // // // // // // //   const handleSelectAll = (e) => {
// // // // // // // // // // // // // // // //     const isChecked = e.target.checked;
// // // // // // // // // // // // // // // //     const newSelection = { ...selectedItems };
// // // // // // // // // // // // // // // //     filteredStock.forEach(item => {
// // // // // // // // // // // // // // // //       newSelection[item._id] = {
// // // // // // // // // // // // // // // //         ...(newSelection[item._id] || { qty: 0, price: 0 }),
// // // // // // // // // // // // // // // //         checked: isChecked
// // // // // // // // // // // // // // // //       };
// // // // // // // // // // // // // // // //     });
// // // // // // // // // // // // // // // //     setSelectedItems(newSelection);
// // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // //   const handleStatusUpdate = async (id, newStatus) => {
// // // // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // // // //       if (newStatus === 'purchased') {
// // // // // // // // // // // // // // // //         await api.post(`/indents/${id}/mark-purchased`);
// // // // // // // // // // // // // // // //       } else {
// // // // // // // // // // // // // // // //         await api.patch(`/indents/${id}`, { status: newStatus });
// // // // // // // // // // // // // // // //       }
// // // // // // // // // // // // // // // //       showToast(`Indent marked as ${newStatus}`, "success");
// // // // // // // // // // // // // // // //       load();
// // // // // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // // // // //       showToast("Failed to update status", "error");
// // // // // // // // // // // // // // // //     }
// // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // //   const submitIndent = async () => {
// // // // // // // // // // // // // // // //     const itemsToSubmit = Object.keys(selectedItems)
// // // // // // // // // // // // // // // //       .filter(id => selectedItems[id].checked && Number(selectedItems[id].qty) > 0)
// // // // // // // // // // // // // // // //       .map(id => ({
// // // // // // // // // // // // // // // //         stockItemId: id,
// // // // // // // // // // // // // // // //         orderedQty: Number(selectedItems[id].qty),
// // // // // // // // // // // // // // // //         unitPrice: Number(selectedItems[id].price || 0),
// // // // // // // // // // // // // // // //         amount: Number(selectedItems[id].qty) * Number(selectedItems[id].price || 0)
// // // // // // // // // // // // // // // //       }));

// // // // // // // // // // // // // // // //     if (itemsToSubmit.length === 0) return showToast("Select items with quantity", "info");

// // // // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // // // //       await api.post("/indents", { items: itemsToSubmit });
// // // // // // // // // // // // // // // //       showToast("Indent submitted", "success");
// // // // // // // // // // // // // // // //       setSelectedItems({});
// // // // // // // // // // // // // // // //       setView("history");
// // // // // // // // // // // // // // // //       load();
// // // // // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // // // // //       showToast("Submission failed", "error");
// // // // // // // // // // // // // // // //     }
// // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // //   return (
// // // // // // // // // // // // // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>

// // // // // // // // // // // // // // // //       {/* Header Area */}
// // // // // // // // // // // // // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // // // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
// // // // // // // // // // // // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // // // // // // // // // // // // // //             indents <span style={{ color: '#6366f1' }}>Indents</span>
// // // // // // // // // // // // // // // //           </h1>
// // // // // // // // // // // // // // // //           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
// // // // // // // // // // // // // // // //             <button
// // // // // // // // // // // // // // // //               onClick={() => { setView("history"); setSearchTerm(""); }}
// // // // // // // // // // // // // // // //               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'history' ? '#fff' : 'transparent', color: view === 'history' ? '#6366f1' : '#64748b', boxShadow: view === 'history' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
// // // // // // // // // // // // // // // //               Logs
// // // // // // // // // // // // // // // //             </button>
// // // // // // // // // // // // // // // //             <button
// // // // // // // // // // // // // // // //               onClick={() => { setView("create"); setSearchTerm(""); }}
// // // // // // // // // // // // // // // //               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'create' ? '#fff' : 'transparent', color: view === 'create' ? '#6366f1' : '#64748b', boxShadow: view === 'create' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
// // // // // // // // // // // // // // // //               Create New
// // // // // // // // // // // // // // // //             </button>
// // // // // // // // // // // // // // // //           </div>
// // // // // // // // // // // // // // // //         </div>

// // // // // // // // // // // // // // // //         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // // // // // // // // // // // //           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // // // // // // // // // // // // //           <input
// // // // // // // // // // // // // // // //             type="text"
// // // // // // // // // // // // // // // //             placeholder={view === "history" ? "Search indents..." : "Search catalog..."}
// // // // // // // // // // // // // // // //             value={searchTerm}
// // // // // // // // // // // // // // // //             onChange={(e) => setSearchTerm(e.target.value)}
// // // // // // // // // // // // // // // //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
// // // // // // // // // // // // // // // //           />
// // // // // // // // // // // // // // // //         </div>
// // // // // // // // // // // // // // // //       </div>

// // // // // // // // // // // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>

// // // // // // // // // // // // // // // //         {view === "history" ? (
// // // // // // // // // // // // // // // //           <>
// // // // // // // // // // // // // // // //             {/* Sidebar list */}
// // // // // // // // // // // // // // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // // // // // // // // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>RESULTS ({filteredIndents.length})</div>
// // // // // // // // // // // // // // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // // // // // // // // // // //                 {filteredIndents.map(r => (
// // // // // // // // // // // // // // // //                   <div
// // // // // // // // // // // // // // // //                     key={r._id}
// // // // // // // // // // // // // // // //                     onClick={() => setSelectedId(r._id)}
// // // // // // // // // // // // // // // //                     style={{
// // // // // // // // // // // // // // // //                       padding: '16px', borderRadius: '16px', cursor: 'pointer',
// // // // // // // // // // // // // // // //                       background: selectedId === r._id ? '#fff' : 'transparent',
// // // // // // // // // // // // // // // //                       border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent',
// // // // // // // // // // // // // // // //                       boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// // // // // // // // // // // // // // // //                       transition: 'all 0.2s'
// // // // // // // // // // // // // // // //                     }}
// // // // // // // // // // // // // // // //                   >
// // // // // // // // // // // // // // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // // // // // //                       <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b' }}>{r.indentNo || `REF-${r._id.slice(-4)}`}</div>
// // // // // // // // // // // // // // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
// // // // // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // // // // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>₹{r.totalAmount?.toLocaleString()} • {r.status.toUpperCase()}</div>
// // // // // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // // // // //                 ))}
// // // // // // // // // // // // // // // //               </div>
// // // // // // // // // // // // // // // //             </div>

// // // // // // // // // // // // // // // //             {/* Indent Detail View */}
// // // // // // // // // // // // // // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // // // // // // // // // // // //               {activeIndent ? (
// // // // // // // // // // // // // // // //                 <>
// // // // // // // // // // // // // // // //                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
// // // // // // // // // // // // // // // //                     <div>
// // // // // // // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>INDENT STATUS</div>
// // // // // // // // // // // // // // // //                       <div style={{ padding: '4px 12px', background: activeIndent.status === 'pending' ? '#fef3c7' : '#dcfce7', color: activeIndent.status === 'pending' ? '#d97706' : '#166534', borderRadius: '6px', fontSize: '12px', fontWeight: '800', display: 'inline-block' }}>
// // // // // // // // // // // // // // // //                         {activeIndent.status.toUpperCase()}
// // // // // // // // // // // // // // // //                       </div>
// // // // // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // // // // //                     <div style={{ textAlign: 'right' }}>
// // // // // // // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
// // // // // // // // // // // // // // // //                       <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activeIndent.totalAmount?.toLocaleString()}</div>
// // // // // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // // // // //                   </div>

// // // // // // // // // // // // // // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // // // // // // // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // // // // // // // //                       <thead>
// // // // // // // // // // // // // // // //                         <tr style={{ textAlign: 'left' }}>
// // // // // // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th>
// // // // // // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
// // // // // // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// // // // // // // // // // // // // // // //                         </tr>
// // // // // // // // // // // // // // // //                       </thead>
// // // // // // // // // // // // // // // //                       <tbody>
// // // // // // // // // // // // // // // //                         {activeIndent.items.map((item, idx) => (
// // // // // // // // // // // // // // // //                           <tr key={idx}>
// // // // // // // // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // // // // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(item)}</div>
// // // // // // // // // // // // // // // //                               <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
// // // // // // // // // // // // // // // //                             </td>
// // // // // // // // // // // // // // // //                             <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700' }}>
// // // // // // // // // // // // // // // //                                {/* Displaying Unit Symbol in Logs */}
// // // // // // // // // // // // // // // //                                {item.orderedQty} <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: '400'}}>{getUnitSymbol(item)}</span>
// // // // // // // // // // // // // // // //                             </td>
// // // // // // // // // // // // // // // //                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>₹{(item.orderedQty * item.unitPrice).toLocaleString()}</td>
// // // // // // // // // // // // // // // //                           </tr>
// // // // // // // // // // // // // // // //                         ))}
// // // // // // // // // // // // // // // //                       </tbody>
// // // // // // // // // // // // // // // //                     </table>
// // // // // // // // // // // // // // // //                   </div>

// // // // // // // // // // // // // // // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // // // // // // // // // // // //                     <button onClick={handleDownloadExcel} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // // // // // // //                       <FileSpreadsheet size={16} /> Export Excel
// // // // // // // // // // // // // // // //                     </button>
// // // // // // // // // // // // // // // //                     {activeIndent.status.toLowerCase() === 'pending' && (
// // // // // // // // // // // // // // // //                       <button onClick={() => handleStatusUpdate(activeIndent._id, 'purchased')} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // // // // // // //                         <CheckCircle2 size={16} /> Mark Purchased
// // // // // // // // // // // // // // // //                       </button>
// // // // // // // // // // // // // // // //                     )}
// // // // // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // // // // //                 </>
// // // // // // // // // // // // // // // //               ) : (
// // // // // // // // // // // // // // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Select an indent to view details</div>
// // // // // // // // // // // // // // // //               )}
// // // // // // // // // // // // // // // //             </div>
// // // // // // // // // // // // // // // //           </>
// // // // // // // // // // // // // // // //         ) : (
// // // // // // // // // // // // // // // //           /* Create New View */
// // // // // // // // // // // // // // // //           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
// // // // // // // // // // // // // // // //             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // // // // // //               <div>
// // // // // // // // // // // // // // // //                 <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Create Requisition</h2>
// // // // // // // // // // // // // // // //                 <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Showing {filteredStock.length} items</p>
// // // // // // // // // // // // // // // //               </div>
// // // // // // // // // // // // // // // //               <div style={{ textAlign: 'right' }}>
// // // // // // // // // // // // // // // //                 <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>ESTIMATED TOTAL</div>
// // // // // // // // // // // // // // // //                 <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{Object.values(selectedItems).reduce((sum, i) => i.checked ? sum + (Number(i.qty || 0) * Number(i.price || 0)) : sum, 0).toLocaleString()}</div>
// // // // // // // // // // // // // // // //               </div>
// // // // // // // // // // // // // // // //             </div>
// // // // // // // // // // // // // // // //             <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px' }}>
// // // // // // // // // // // // // // // //               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // // // // // // // //                 <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
// // // // // // // // // // // // // // // //                   <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // // // // // // // // // // // //                     <th style={{ padding: '20px 0', width: '50px' }}><input type="checkbox" onChange={handleSelectAll} style={{ width: '18px', height: '18px' }} /></th>
// // // // // // // // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8' }}>ITEM SPECIFICATION</th>
// // // // // // // // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '140px' }}>QTY</th>
// // // // // // // // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '120px' }}>PRICE</th>
// // // // // // // // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '120px', textAlign: 'right' }}>ITEM TOTAL</th>
// // // // // // // // // // // // // // // //                   </tr>
// // // // // // // // // // // // // // // //                 </thead>
// // // // // // // // // // // // // // // //                 <tbody>
// // // // // // // // // // // // // // // //                   {filteredStock.map(item => {
// // // // // // // // // // // // // // // //                     const state = selectedItems[item._id] || { checked: false, qty: 0, price: 0 };
// // // // // // // // // // // // // // // //                     const itemTotal = Number(state.qty || 0) * Number(state.price || 0);
// // // // // // // // // // // // // // // //                     return (
// // // // // // // // // // // // // // // //                       <tr key={item._id} style={{ borderBottom: '1px solid #f8fafc', background: state.checked ? '#fcfdff' : 'transparent' }}>
// // // // // // // // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // // // // // // // //                           <input type="checkbox" checked={state.checked} onChange={(e) => setSelectedItems(prev => ({ ...prev, [item._id]: { ...state, checked: e.target.checked } }))} style={{ width: '18px', height: '18px' }} />
// // // // // // // // // // // // // // // //                         </td>
// // // // // // // // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // // // // // // // //                           <div style={{ fontWeight: '700', fontSize: '14px' }}>{item.name}</div>
// // // // // // // // // // // // // // // //                           <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.stockGroupId?.name}</div>
// // // // // // // // // // // // // // // //                         </td>
// // // // // // // // // // // // // // // //                         <td>
// // // // // // // // // // // // // // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // // // // // // //                             <input type="number" disabled={!state.checked} value={state.qty} placeholder="0" onChange={(e) => setSelectedItems(prev => ({ ...prev, [item._id]: { ...state, qty: e.target.value } }))} style={{ width: '70px', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: '700' }} />
// // // // // // // // // // // // // // // //                             {/* Showing Unit Symbol in Creation Table */}
// // // // // // // // // // // // // // // //                             <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>{item.unitId?.symbol}</span>
// // // // // // // // // // // // // // // //                           </div>
// // // // // // // // // // // // // // // //                         </td>
// // // // // // // // // // // // // // // //                         <td>
// // // // // // // // // // // // // // // //                           <input type="number" disabled={!state.checked} value={state.price} placeholder="₹" onChange={(e) => setSelectedItems(prev => ({ ...prev, [item._id]: { ...state, price: e.target.value } }))} style={{ width: '90px', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: '700' }} />
// // // // // // // // // // // // // // // //                         </td>
// // // // // // // // // // // // // // // //                         <td style={{ textAlign: 'right', fontWeight: '800', color: state.checked ? '#6366f1' : '#94a3b8' }}>
// // // // // // // // // // // // // // // //                           ₹{itemTotal.toLocaleString()}
// // // // // // // // // // // // // // // //                         </td>
// // // // // // // // // // // // // // // //                       </tr>
// // // // // // // // // // // // // // // //                     )
// // // // // // // // // // // // // // // //                   })}
// // // // // // // // // // // // // // // //                 </tbody>
// // // // // // // // // // // // // // // //               </table>
// // // // // // // // // // // // // // // //             </div>
// // // // // // // // // // // // // // // //             <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // // // // // // // // // // // // // // //               <button onClick={submitIndent} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
// // // // // // // // // // // // // // // //                 Submit Requisition
// // // // // // // // // // // // // // // //               </button>
// // // // // // // // // // // // // // // //             </div>
// // // // // // // // // // // // // // // //           </div>
// // // // // // // // // // // // // // // //         )}
// // // // // // // // // // // // // // // //       </div>
// // // // // // // // // // // // // // // //     </div>
// // // // // // // // // // // // // // // //   );
// // // // // // // // // // // // // // // // };







// // // // // // // // // // // // // // // // 09-04-2026





// // // // // // // // // // // // // // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // // // // // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // // // // // // import { useToast } from "../toast.jsx";
// // // // // // // // // // // // // // // import * as XLSX from "xlsx";
// // // // // // // // // // // // // // // import { Search, FileSpreadsheet, CheckCircle2, Edit3, Trash2, X, Save } from "lucide-react";

// // // // // // // // // // // // // // // export const IndentPage = () => {
// // // // // // // // // // // // // // //   const { showToast } = useToast();
// // // // // // // // // // // // // // //   const [view, setView] = useState("history"); // 'history' or 'create'
// // // // // // // // // // // // // // //   const [tab, setTab] = useState("stock-items"); // Added for catalog categorization
// // // // // // // // // // // // // // //   const [searchTerm, setSearchTerm] = useState("");
// // // // // // // // // // // // // // //   const [stockItems, setStockItems] = useState([]);
// // // // // // // // // // // // // // //   const [indents, setIndents] = useState([]);
// // // // // // // // // // // // // // //   const [selectedItems, setSelectedItems] = useState({});
// // // // // // // // // // // // // // //   const [selectedId, setSelectedId] = useState(null);

// // // // // // // // // // // // // // //   // Inline Editing State (if needed for the catalog view)
// // // // // // // // // // // // // // //   const [editingId, setEditingId] = useState(null);
// // // // // // // // // // // // // // //   const [editName, setEditName] = useState("");

// // // // // // // // // // // // // // //   const load = useCallback(async () => {
// // // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // // //       const [itemsRes, indentRes] = await Promise.all([
// // // // // // // // // // // // // // //         api.get("/inventory/stock-items"),
// // // // // // // // // // // // // // //         api.get("/indents")
// // // // // // // // // // // // // // //       ]);
// // // // // // // // // // // // // // //       setStockItems(itemsRes.data || []);
// // // // // // // // // // // // // // //       const sorted = (indentRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // // // // // // // // // //       setIndents(sorted);
// // // // // // // // // // // // // // //       if (sorted.length > 0 && !selectedId) setSelectedId(sorted[0]._id);
// // // // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // // // //       showToast("Failed to load data", "error");
// // // // // // // // // // // // // // //     }
// // // // // // // // // // // // // // //   }, [showToast, selectedId]);

// // // // // // // // // // // // // // //   useEffect(() => { load(); }, [load]);

// // // // // // // // // // // // // // //   const getUnitSymbol = (item) => {
// // // // // // // // // // // // // // //     if (item.stockItemId?.unitId?.symbol) return item.stockItemId.unitId.symbol;
// // // // // // // // // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // // // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // // // // // // // // //     return found?.unitId?.symbol || "";
// // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // //   const getItemName = (item) => {
// // // // // // // // // // // // // // //     if (item.stockItemId?.name) return item.stockItemId.name;
// // // // // // // // // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // // // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // // // // // // // // //     return found ? found.name : "Unknown Product";
// // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // //   const handleDownloadExcel = () => {
// // // // // // // // // // // // // // //     if (!activeIndent) return;
// // // // // // // // // // // // // // //     const data = activeIndent.items.map(item => ({
// // // // // // // // // // // // // // //       "Product": getItemName(item),
// // // // // // // // // // // // // // //       "Quantity": item.orderedQty,
// // // // // // // // // // // // // // //       "Unit": getUnitSymbol(item),
// // // // // // // // // // // // // // //       "Price": item.unitPrice,
// // // // // // // // // // // // // // //       "Subtotal": item.orderedQty * item.unitPrice
// // // // // // // // // // // // // // //     }));
// // // // // // // // // // // // // // //     const ws = XLSX.utils.json_to_sheet(data);
// // // // // // // // // // // // // // //     const wb = XLSX.utils.book_new();
// // // // // // // // // // // // // // //     XLSX.utils.book_append_sheet(wb, ws, "Indent");
// // // // // // // // // // // // // // //     XLSX.writeFile(wb, `Indent_${activeIndent.indentNo || 'Export'}.xlsx`);
// // // // // // // // // // // // // // //     showToast("Excel exported successfully", "success");
// // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // //   const filteredIndents = useMemo(() => {
// // // // // // // // // // // // // // //     return indents.filter(i =>
// // // // // // // // // // // // // // //       (i.indentNo?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
// // // // // // // // // // // // // // //       (i._id.includes(searchTerm))
// // // // // // // // // // // // // // //     );
// // // // // // // // // // // // // // //   }, [indents, searchTerm]);

// // // // // // // // // // // // // // //   const filteredStock = useMemo(() => {
// // // // // // // // // // // // // // //     return stockItems.filter(s =>
// // // // // // // // // // // // // // //       s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
// // // // // // // // // // // // // // //       s.stockGroupId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
// // // // // // // // // // // // // // //     );
// // // // // // // // // // // // // // //   }, [stockItems, searchTerm]);

// // // // // // // // // // // // // // //   const activeIndent = useMemo(() =>
// // // // // // // // // // // // // // //     indents.find(i => i._id === selectedId) || indents[0],
// // // // // // // // // // // // // // //     [selectedId, indents]);

// // // // // // // // // // // // // // //   const handleSelectAll = (e) => {
// // // // // // // // // // // // // // //     const isChecked = e.target.checked;
// // // // // // // // // // // // // // //     const newSelection = { ...selectedItems };
// // // // // // // // // // // // // // //     filteredStock.forEach(item => {
// // // // // // // // // // // // // // //       newSelection[item._id] = {
// // // // // // // // // // // // // // //         ...(newSelection[item._id] || { qty: 0, price: 0 }),
// // // // // // // // // // // // // // //         checked: isChecked
// // // // // // // // // // // // // // //       };
// // // // // // // // // // // // // // //     });
// // // // // // // // // // // // // // //     setSelectedItems(newSelection);
// // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // //   const handleStatusUpdate = async (id, newStatus) => {
// // // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // // //       if (newStatus === 'purchased') {
// // // // // // // // // // // // // // //         await api.post(`/indents/${id}/mark-purchased`);
// // // // // // // // // // // // // // //       } else {
// // // // // // // // // // // // // // //         await api.patch(`/indents/${id}`, { status: newStatus });
// // // // // // // // // // // // // // //       }
// // // // // // // // // // // // // // //       showToast(`Indent marked as ${newStatus}`, "success");
// // // // // // // // // // // // // // //       load();
// // // // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // // // //       showToast("Failed to update status", "error");
// // // // // // // // // // // // // // //     }
// // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // //   const submitIndent = async () => {
// // // // // // // // // // // // // // //     const itemsToSubmit = Object.keys(selectedItems)
// // // // // // // // // // // // // // //       .filter(id => selectedItems[id].checked && Number(selectedItems[id].qty) > 0)
// // // // // // // // // // // // // // //       .map(id => ({
// // // // // // // // // // // // // // //         stockItemId: id,
// // // // // // // // // // // // // // //         orderedQty: Number(selectedItems[id].qty),
// // // // // // // // // // // // // // //         unitPrice: Number(selectedItems[id].price || 0),
// // // // // // // // // // // // // // //         amount: Number(selectedItems[id].qty) * Number(selectedItems[id].price || 0)
// // // // // // // // // // // // // // //       }));

// // // // // // // // // // // // // // //     if (itemsToSubmit.length === 0) return showToast("Select items with quantity", "info");

// // // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // // //       await api.post("/indents", { items: itemsToSubmit });
// // // // // // // // // // // // // // //       showToast("Indent submitted", "success");
// // // // // // // // // // // // // // //       setSelectedItems({});
// // // // // // // // // // // // // // //       setView("history");
// // // // // // // // // // // // // // //       load();
// // // // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // // // //       showToast("Submission failed", "error");
// // // // // // // // // // // // // // //     }
// // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // //   return (
// // // // // // // // // // // // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // // // // // // // // // // // //       {/* Header Area */}
// // // // // // // // // // // // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
// // // // // // // // // // // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // // // // // // // // // // // // //             indents <span style={{ color: '#6366f1' }}>Indents</span>
// // // // // // // // // // // // // // //           </h1>
// // // // // // // // // // // // // // //           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
// // // // // // // // // // // // // // //             <button onClick={() => { setView("history"); setSearchTerm(""); }}
// // // // // // // // // // // // // // //               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'history' ? '#fff' : 'transparent', color: view === 'history' ? '#6366f1' : '#64748b', boxShadow: view === 'history' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
// // // // // // // // // // // // // // //               Logs
// // // // // // // // // // // // // // //             </button>
// // // // // // // // // // // // // // //             <button onClick={() => { setView("create"); setSearchTerm(""); }}
// // // // // // // // // // // // // // //               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'create' ? '#fff' : 'transparent', color: view === 'create' ? '#6366f1' : '#64748b', boxShadow: view === 'create' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
// // // // // // // // // // // // // // //               Create New
// // // // // // // // // // // // // // //             </button>
// // // // // // // // // // // // // // //           </div>
// // // // // // // // // // // // // // //         </div>

// // // // // // // // // // // // // // //         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // // // // // // // // // // //           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // // // // // // // // // // // //           <input
// // // // // // // // // // // // // // //             type="text"
// // // // // // // // // // // // // // //             placeholder={view === "history" ? "Search indents..." : "Search catalog..."}
// // // // // // // // // // // // // // //             value={searchTerm}
// // // // // // // // // // // // // // //             onChange={(e) => setSearchTerm(e.target.value)}
// // // // // // // // // // // // // // //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
// // // // // // // // // // // // // // //           />
// // // // // // // // // // // // // // //         </div>
// // // // // // // // // // // // // // //       </div>

// // // // // // // // // // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
// // // // // // // // // // // // // // //         {view === "history" ? (
// // // // // // // // // // // // // // //           <>
// // // // // // // // // // // // // // //             {/* History Sidebar */}
// // // // // // // // // // // // // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // // // // // // // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>RESULTS ({filteredIndents.length})</div>
// // // // // // // // // // // // // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // // // // // // // // // //                 {filteredIndents.map(r => (
// // // // // // // // // // // // // // //                   <div key={r._id} onClick={() => setSelectedId(r._id)}
// // // // // // // // // // // // // // //                     style={{ padding: '16px', borderRadius: '16px', cursor: 'pointer', background: selectedId === r._id ? '#fff' : 'transparent', border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent', boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', transition: 'all 0.2s' }}>
// // // // // // // // // // // // // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // // // // //                       <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b' }}>{r.indentNo || `REF-${r._id.slice(-4)}`}</div>
// // // // // // // // // // // // // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
// // // // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // // // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>₹{r.totalAmount?.toLocaleString()} • {r.status.toUpperCase()}</div>
// // // // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // // // //                 ))}
// // // // // // // // // // // // // // //               </div>
// // // // // // // // // // // // // // //             </div>

// // // // // // // // // // // // // // //             {/* Indent Detail View */}
// // // // // // // // // // // // // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // // // // // // // // // // //               {activeIndent ? (
// // // // // // // // // // // // // // //                 <>
// // // // // // // // // // // // // // //                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
// // // // // // // // // // // // // // //                     <div>
// // // // // // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>INDENT STATUS</div>
// // // // // // // // // // // // // // //                       <div style={{ padding: '4px 12px', background: activeIndent.status === 'pending' ? '#fef3c7' : '#dcfce7', color: activeIndent.status === 'pending' ? '#d97706' : '#166534', borderRadius: '6px', fontSize: '12px', fontWeight: '800', display: 'inline-block' }}>
// // // // // // // // // // // // // // //                         {activeIndent.status.toUpperCase()}
// // // // // // // // // // // // // // //                       </div>
// // // // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // // // //                     <div style={{ textAlign: 'right' }}>
// // // // // // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
// // // // // // // // // // // // // // //                       <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activeIndent.totalAmount?.toLocaleString()}</div>
// // // // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // // // // // // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // // // // // // //                       <thead>
// // // // // // // // // // // // // // //                         <tr style={{ textAlign: 'left' }}>
// // // // // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th>
// // // // // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
// // // // // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// // // // // // // // // // // // // // //                         </tr>
// // // // // // // // // // // // // // //                       </thead>
// // // // // // // // // // // // // // //                       <tbody>
// // // // // // // // // // // // // // //                         {activeIndent.items.map((item, idx) => (
// // // // // // // // // // // // // // //                           <tr key={idx}>
// // // // // // // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // // // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(item)}</div>
// // // // // // // // // // // // // // //                               <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
// // // // // // // // // // // // // // //                             </td>
// // // // // // // // // // // // // // //                             <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700' }}>
// // // // // // // // // // // // // // //                                {item.orderedQty} <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: '400'}}>{getUnitSymbol(item)}</span>
// // // // // // // // // // // // // // //                             </td>
// // // // // // // // // // // // // // //                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>₹{(item.orderedQty * item.unitPrice).toLocaleString()}</td>
// // // // // // // // // // // // // // //                           </tr>
// // // // // // // // // // // // // // //                         ))}
// // // // // // // // // // // // // // //                       </tbody>
// // // // // // // // // // // // // // //                     </table>
// // // // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // // // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // // // // // // // // // // //                     <button onClick={handleDownloadExcel} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // // // // // //                       <FileSpreadsheet size={16} /> Export Excel
// // // // // // // // // // // // // // //                     </button>
// // // // // // // // // // // // // // //                     {activeIndent.status.toLowerCase() === 'pending' && (
// // // // // // // // // // // // // // //                       <button onClick={() => handleStatusUpdate(activeIndent._id, 'purchased')} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // // // // // //                         <CheckCircle2 size={16} /> Mark Purchased
// // // // // // // // // // // // // // //                       </button>
// // // // // // // // // // // // // // //                     )}
// // // // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // // // //                 </>
// // // // // // // // // // // // // // //               ) : (
// // // // // // // // // // // // // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Select an indent to view details</div>
// // // // // // // // // // // // // // //               )}
// // // // // // // // // // // // // // //             </div>
// // // // // // // // // // // // // // //           </>
// // // // // // // // // // // // // // //         ) : (
// // // // // // // // // // // // // // //           /* Create New View (Catalog-Integrated) */
// // // // // // // // // // // // // // //           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
// // // // // // // // // // // // // // //             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // // // // //               <div>
// // // // // // // // // // // // // // //                 <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Create Requisition</h2>
// // // // // // // // // // // // // // //                 <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
// // // // // // // // // // // // // // //                     <span onClick={() => setTab("stock-items")} style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: tab === 'stock-items' ? '#6366f1' : '#64748b' }}>Stock Items</span>
// // // // // // // // // // // // // // //                     <span onClick={() => setTab("units")} style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: tab === 'units' ? '#6366f1' : '#64748b' }}>Units</span>
// // // // // // // // // // // // // // //                 </div>
// // // // // // // // // // // // // // //               </div>
// // // // // // // // // // // // // // //               <div style={{ textAlign: 'right' }}>
// // // // // // // // // // // // // // //                 <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>ESTIMATED TOTAL</div>
// // // // // // // // // // // // // // //                 <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{Object.values(selectedItems).reduce((sum, i) => i.checked ? sum + (Number(i.qty || 0) * Number(i.price || 0)) : sum, 0).toLocaleString()}</div>
// // // // // // // // // // // // // // //               </div>
// // // // // // // // // // // // // // //             </div>

// // // // // // // // // // // // // // //             <div style={{ flex: 1, overflowY: 'auto' }}>
// // // // // // // // // // // // // // //               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // // // // // // //                 <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
// // // // // // // // // // // // // // //                   <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // // // // // // // // // // //                     <th style={{ padding: '20px 32px', width: '50px' }}>
// // // // // // // // // // // // // // //                         <input type="checkbox" onChange={handleSelectAll} style={{ width: '18px', height: '18px' }} />
// // // // // // // // // // // // // // //                     </th>
// // // // // // // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>NAME</th>
                    
// // // // // // // // // // // // // // //                     {/* NEW COLUMN: Stock Group */}
// // // // // // // // // // // // // // //                     {tab === "stock-items" && (
// // // // // // // // // // // // // // //                       <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>STOCK GROUP</th>
// // // // // // // // // // // // // // //                     )}

// // // // // // // // // // // // // // //                     {tab === "units" && <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>SYMBOL</th>}
                    
// // // // // // // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '120px' }}>QTY</th>
// // // // // // // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '100px' }}>PRICE</th>
// // // // // // // // // // // // // // //                     <th style={{ padding: '20px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>ITEM TOTAL</th>
// // // // // // // // // // // // // // //                   </tr>
// // // // // // // // // // // // // // //                 </thead>
// // // // // // // // // // // // // // //                 <tbody>
// // // // // // // // // // // // // // //                   {filteredStock.map((row) => {
// // // // // // // // // // // // // // //                     const state = selectedItems[row._id] || { checked: false, qty: 0, price: 0 };
// // // // // // // // // // // // // // //                     const itemTotal = Number(state.qty || 0) * Number(state.price || 0);

// // // // // // // // // // // // // // //                     return (
// // // // // // // // // // // // // // //                       <tr key={row._id} style={{ borderBottom: '1px solid #f8fafc', background: state.checked ? '#fcfdff' : 'transparent' }}>
// // // // // // // // // // // // // // //                         <td style={{ padding: '16px 32px' }}>
// // // // // // // // // // // // // // //                           <input type="checkbox" checked={state.checked} onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, checked: e.target.checked } }))} style={{ width: '18px', height: '18px' }} />
// // // // // // // // // // // // // // //                         </td>
// // // // // // // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // // // // // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
// // // // // // // // // // // // // // //                             {row.imageUrl && <img src={row.imageUrl} style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />}
// // // // // // // // // // // // // // //                             <span style={{ fontWeight: '700', color: '#1e293b' }}>{row.name}</span>
// // // // // // // // // // // // // // //                           </div>
// // // // // // // // // // // // // // //                         </td>

// // // // // // // // // // // // // // //                         {/* NEW CELL: Stock Group Display */}
// // // // // // // // // // // // // // //                         {tab === "stock-items" && (
// // // // // // // // // // // // // // //                           <td style={{ padding: '16px 0' }}>
// // // // // // // // // // // // // // //                             <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
// // // // // // // // // // // // // // //                               {row.stockGroupId?.name || 'Unassigned'}
// // // // // // // // // // // // // // //                             </span>
// // // // // // // // // // // // // // //                           </td>
// // // // // // // // // // // // // // //                         )}

// // // // // // // // // // // // // // //                         {/* Existing Cells for Units */}
// // // // // // // // // // // // // // //                         {tab === "units" && (
// // // // // // // // // // // // // // //                           <td style={{ padding: '16px 0', fontWeight: '600', color: '#64748b' }}>
// // // // // // // // // // // // // // //                             {row.symbol}
// // // // // // // // // // // // // // //                           </td>
// // // // // // // // // // // // // // //                         )}

// // // // // // // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // // // // // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // // // // // //                             <input type="number" disabled={!state.checked} value={state.qty} placeholder="0" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, qty: e.target.value } }))} style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // // // // // // // // // // // // //                             <span style={{ fontSize: '11px', color: '#64748b' }}>{row.unitId?.symbol}</span>
// // // // // // // // // // // // // // //                           </div>
// // // // // // // // // // // // // // //                         </td>
// // // // // // // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // // // // // // //                            <input type="number" disabled={!state.checked} value={state.price} placeholder="₹" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, price: e.target.value } }))} style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // // // // // // // // // // // // //                         </td>

// // // // // // // // // // // // // // //                         <td style={{ padding: '16px 32px', textAlign: 'right', fontWeight: '800', color: state.checked ? '#6366f1' : '#94a3b8' }}>
// // // // // // // // // // // // // // //                           ₹{itemTotal.toLocaleString()}
// // // // // // // // // // // // // // //                         </td>
// // // // // // // // // // // // // // //                       </tr>
// // // // // // // // // // // // // // //                     );
// // // // // // // // // // // // // // //                   })}
// // // // // // // // // // // // // // //                 </tbody>
// // // // // // // // // // // // // // //               </table>
// // // // // // // // // // // // // // //             </div>
// // // // // // // // // // // // // // //             <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // // // // // // // // // // // // // //               <button onClick={submitIndent} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
// // // // // // // // // // // // // // //                 Submit Requisition
// // // // // // // // // // // // // // //               </button>
// // // // // // // // // // // // // // //             </div>
// // // // // // // // // // // // // // //           </div>
// // // // // // // // // // // // // // //         )}
// // // // // // // // // // // // // // //       </div>
// // // // // // // // // // // // // // //     </div>
// // // // // // // // // // // // // // //   );
// // // // // // // // // // // // // // // };

















// // // // // // // // // // // // // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // // // // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // // // // // import { useToast } from "../toast.jsx";
// // // // // // // // // // // // // // import * as XLSX from "xlsx";
// // // // // // // // // // // // // // import { Search, FileSpreadsheet, CheckCircle2, Edit3, Trash2, X, Save } from "lucide-react";

// // // // // // // // // // // // // // export const IndentPage = () => {
// // // // // // // // // // // // // //   const { showToast } = useToast();
// // // // // // // // // // // // // //   const [view, setView] = useState("history"); // 'history' or 'create'
// // // // // // // // // // // // // //   const [tab, setTab] = useState("stock-items"); 
// // // // // // // // // // // // // //   const [searchTerm, setSearchTerm] = useState("");
// // // // // // // // // // // // // //   const [stockItems, setStockItems] = useState([]);
// // // // // // // // // // // // // //   const [indents, setIndents] = useState([]);
// // // // // // // // // // // // // //   const [selectedItems, setSelectedItems] = useState({});
// // // // // // // // // // // // // //   const [selectedId, setSelectedId] = useState(null);

// // // // // // // // // // // // // //   const load = useCallback(async () => {
// // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // //       const [itemsRes, indentRes] = await Promise.all([
// // // // // // // // // // // // // //         api.get("/inventory/stock-items"),
// // // // // // // // // // // // // //         api.get("/indents")
// // // // // // // // // // // // // //       ]);
// // // // // // // // // // // // // //       setStockItems(itemsRes.data || []);
// // // // // // // // // // // // // //       const sorted = (indentRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // // // // // // // // //       setIndents(sorted);
// // // // // // // // // // // // // //       if (sorted.length > 0 && !selectedId) setSelectedId(sorted[0]._id);
// // // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // // //       showToast("Failed to load data", "error");
// // // // // // // // // // // // // //     }
// // // // // // // // // // // // // //   }, [showToast, selectedId]);

// // // // // // // // // // // // // //   useEffect(() => { load(); }, [load]);

// // // // // // // // // // // // // //   // --- Helper Functions for Data Resolution ---

// // // // // // // // // // // // // //   const getUnitSymbol = (item) => {
// // // // // // // // // // // // // //     if (item.stockItemId?.unitId?.symbol) return item.stockItemId.unitId.symbol;
// // // // // // // // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // // // // // // // //     return found?.unitId?.symbol || "";
// // // // // // // // // // // // // //   };

// // // // // // // // // // // // // //   const getItemName = (item) => {
// // // // // // // // // // // // // //     if (item.stockItemId?.name) return item.stockItemId.name;
// // // // // // // // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // // // // // // // //     return found ? found.name : "Unknown Product";
// // // // // // // // // // // // // //   };

// // // // // // // // // // // // // //   // FIXED: Cross-references master stock list if deep population is missing in Indent logs
// // // // // // // // // // // // // //   const getGroupName = (item) => {
// // // // // // // // // // // // // //     if (item.stockItemId?.stockGroupId?.name) return item.stockItemId.stockGroupId.name;
// // // // // // // // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // // // // // // // //     return found?.stockGroupId?.name || "General";
// // // // // // // // // // // // // //   };

// // // // // // // // // // // // // //   const handleDownloadExcel = () => {
// // // // // // // // // // // // // //     if (!activeIndent) return;
// // // // // // // // // // // // // //     const data = activeIndent.items.map(item => ({
// // // // // // // // // // // // // //       "Product": getItemName(item),
// // // // // // // // // // // // // //       "Group": getGroupName(item),
// // // // // // // // // // // // // //       "Quantity": item.orderedQty,
// // // // // // // // // // // // // //       "Unit": getUnitSymbol(item),
// // // // // // // // // // // // // //       "Price": item.unitPrice,
// // // // // // // // // // // // // //       "Subtotal": item.orderedQty * item.unitPrice
// // // // // // // // // // // // // //     }));
// // // // // // // // // // // // // //     const ws = XLSX.utils.json_to_sheet(data);
// // // // // // // // // // // // // //     const wb = XLSX.utils.book_new();
// // // // // // // // // // // // // //     XLSX.utils.book_append_sheet(wb, ws, "Indent");
// // // // // // // // // // // // // //     XLSX.writeFile(wb, `Indent_${activeIndent.indentNo || 'Export'}.xlsx`);
// // // // // // // // // // // // // //     showToast("Excel exported successfully", "success");
// // // // // // // // // // // // // //   };

// // // // // // // // // // // // // //   const filteredIndents = useMemo(() => {
// // // // // // // // // // // // // //     return indents.filter(i =>
// // // // // // // // // // // // // //       (i.indentNo?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
// // // // // // // // // // // // // //       (i._id.includes(searchTerm))
// // // // // // // // // // // // // //     );
// // // // // // // // // // // // // //   }, [indents, searchTerm]);

// // // // // // // // // // // // // //   const filteredStock = useMemo(() => {
// // // // // // // // // // // // // //     return stockItems.filter(s =>
// // // // // // // // // // // // // //       s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
// // // // // // // // // // // // // //       s.stockGroupId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
// // // // // // // // // // // // // //     );
// // // // // // // // // // // // // //   }, [stockItems, searchTerm]);

// // // // // // // // // // // // // //   const activeIndent = useMemo(() =>
// // // // // // // // // // // // // //     indents.find(i => i._id === selectedId) || indents[0],
// // // // // // // // // // // // // //     [selectedId, indents]);

// // // // // // // // // // // // // //   const handleSelectAll = (e) => {
// // // // // // // // // // // // // //     const isChecked = e.target.checked;
// // // // // // // // // // // // // //     const newSelection = { ...selectedItems };
// // // // // // // // // // // // // //     filteredStock.forEach(item => {
// // // // // // // // // // // // // //       newSelection[item._id] = {
// // // // // // // // // // // // // //         ...(newSelection[item._id] || { qty: 0, price: 0 }),
// // // // // // // // // // // // // //         checked: isChecked
// // // // // // // // // // // // // //       };
// // // // // // // // // // // // // //     });
// // // // // // // // // // // // // //     setSelectedItems(newSelection);
// // // // // // // // // // // // // //   };

// // // // // // // // // // // // // //   const handleStatusUpdate = async (id, newStatus) => {
// // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // //       if (newStatus === 'purchased') {
// // // // // // // // // // // // // //         await api.post(`/indents/${id}/mark-purchased`);
// // // // // // // // // // // // // //       } else {
// // // // // // // // // // // // // //         await api.patch(`/indents/${id}`, { status: newStatus });
// // // // // // // // // // // // // //       }
// // // // // // // // // // // // // //       showToast(`Indent marked as ${newStatus}`, "success");
// // // // // // // // // // // // // //       load();
// // // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // // //       showToast("Failed to update status", "error");
// // // // // // // // // // // // // //     }
// // // // // // // // // // // // // //   };

// // // // // // // // // // // // // //   const submitIndent = async () => {
// // // // // // // // // // // // // //     const itemsToSubmit = Object.keys(selectedItems)
// // // // // // // // // // // // // //       .filter(id => selectedItems[id].checked && Number(selectedItems[id].qty) > 0)
// // // // // // // // // // // // // //       .map(id => ({
// // // // // // // // // // // // // //         stockItemId: id,
// // // // // // // // // // // // // //         orderedQty: Number(selectedItems[id].qty),
// // // // // // // // // // // // // //         unitPrice: Number(selectedItems[id].price || 0),
// // // // // // // // // // // // // //         amount: Number(selectedItems[id].qty) * Number(selectedItems[id].price || 0)
// // // // // // // // // // // // // //       }));

// // // // // // // // // // // // // //     if (itemsToSubmit.length === 0) return showToast("Select items with quantity", "info");

// // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // //       await api.post("/indents", { items: itemsToSubmit });
// // // // // // // // // // // // // //       showToast("Indent submitted", "success");
// // // // // // // // // // // // // //       setSelectedItems({});
// // // // // // // // // // // // // //       setView("history");
// // // // // // // // // // // // // //       load();
// // // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // // //       showToast("Submission failed", "error");
// // // // // // // // // // // // // //     }
// // // // // // // // // // // // // //   };

// // // // // // // // // // // // // //   return (
// // // // // // // // // // // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // // // // // // // // // // //       {/* Header Area */}
// // // // // // // // // // // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
// // // // // // // // // // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // // // // // // // // // // // //             indents <span style={{ color: '#6366f1' }}>Indents</span>
// // // // // // // // // // // // // //           </h1>
// // // // // // // // // // // // // //           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
// // // // // // // // // // // // // //             <button onClick={() => { setView("history"); setSearchTerm(""); }}
// // // // // // // // // // // // // //               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'history' ? '#fff' : 'transparent', color: view === 'history' ? '#6366f1' : '#64748b', boxShadow: view === 'history' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
// // // // // // // // // // // // // //               Logs
// // // // // // // // // // // // // //             </button>
// // // // // // // // // // // // // //             <button onClick={() => { setView("create"); setSearchTerm(""); }}
// // // // // // // // // // // // // //               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'create' ? '#fff' : 'transparent', color: view === 'create' ? '#6366f1' : '#64748b', boxShadow: view === 'create' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
// // // // // // // // // // // // // //               Create New
// // // // // // // // // // // // // //             </button>
// // // // // // // // // // // // // //           </div>
// // // // // // // // // // // // // //         </div>

// // // // // // // // // // // // // //         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // // // // // // // // // //           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // // // // // // // // // // //           <input
// // // // // // // // // // // // // //             type="text"
// // // // // // // // // // // // // //             placeholder={view === "history" ? "Search indents..." : "Search catalog..."}
// // // // // // // // // // // // // //             value={searchTerm}
// // // // // // // // // // // // // //             onChange={(e) => setSearchTerm(e.target.value)}
// // // // // // // // // // // // // //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
// // // // // // // // // // // // // //           />
// // // // // // // // // // // // // //         </div>
// // // // // // // // // // // // // //       </div>

// // // // // // // // // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
// // // // // // // // // // // // // //         {view === "history" ? (
// // // // // // // // // // // // // //           <>
// // // // // // // // // // // // // //             {/* History Sidebar */}
// // // // // // // // // // // // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // // // // // // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>RESULTS ({filteredIndents.length})</div>
// // // // // // // // // // // // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // // // // // // // // //                 {filteredIndents.map(r => (
// // // // // // // // // // // // // //                   <div key={r._id} onClick={() => setSelectedId(r._id)}
// // // // // // // // // // // // // //                     style={{ padding: '16px', borderRadius: '16px', cursor: 'pointer', background: selectedId === r._id ? '#fff' : 'transparent', border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent', boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', transition: 'all 0.2s' }}>
// // // // // // // // // // // // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // // // //                       <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b' }}>{r.indentNo || `REF-${r._id.slice(-4)}`}</div>
// // // // // // // // // // // // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
// // // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>₹{r.totalAmount?.toLocaleString()} • {r.status.toUpperCase()}</div>
// // // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // // //                 ))}
// // // // // // // // // // // // // //               </div>
// // // // // // // // // // // // // //             </div>

// // // // // // // // // // // // // //             {/* Indent Detail View */}
// // // // // // // // // // // // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // // // // // // // // // //               {activeIndent ? (
// // // // // // // // // // // // // //                 <>
// // // // // // // // // // // // // //                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
// // // // // // // // // // // // // //                     <div>
// // // // // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>INDENT STATUS</div>
// // // // // // // // // // // // // //                       <div style={{ padding: '4px 12px', background: activeIndent.status === 'pending' ? '#fef3c7' : '#dcfce7', color: activeIndent.status === 'pending' ? '#d97706' : '#166534', borderRadius: '6px', fontSize: '12px', fontWeight: '800', display: 'inline-block' }}>
// // // // // // // // // // // // // //                         {activeIndent.status.toUpperCase()}
// // // // // // // // // // // // // //                       </div>
// // // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // // //                     <div style={{ textAlign: 'right' }}>
// // // // // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
// // // // // // // // // // // // // //                       <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activeIndent.totalAmount?.toLocaleString()}</div>
// // // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // // // // // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // // // // // //                       <thead>
// // // // // // // // // // // // // //                         <tr style={{ textAlign: 'left' }}>
// // // // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th>
// // // // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// // // // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
// // // // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// // // // // // // // // // // // // //                         </tr>
// // // // // // // // // // // // // //                       </thead>
// // // // // // // // // // // // // //                       <tbody>
// // // // // // // // // // // // // //                         {activeIndent.items.map((item, idx) => (
// // // // // // // // // // // // // //                           <tr key={idx}>
// // // // // // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(item)}</div>
// // // // // // // // // // // // // //                               <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
// // // // // // // // // // // // // //                             </td>
// // // // // // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // // // //                               <span style={{ 
// // // // // // // // // // // // // //                                 background: '#eff6ff', 
// // // // // // // // // // // // // //                                 color: '#3b82f6', 
// // // // // // // // // // // // // //                                 padding: '4px 8px', 
// // // // // // // // // // // // // //                                 borderRadius: '6px', 
// // // // // // // // // // // // // //                                 fontSize: '10px', 
// // // // // // // // // // // // // //                                 fontWeight: '700',
// // // // // // // // // // // // // //                                 textTransform: 'uppercase'
// // // // // // // // // // // // // //                               }}>
// // // // // // // // // // // // // //                                 {getGroupName(item)}
// // // // // // // // // // // // // //                               </span>
// // // // // // // // // // // // // //                             </td>
// // // // // // // // // // // // // //                             <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // // // //                                {item.orderedQty} <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: '400'}}>{getUnitSymbol(item)}</span>
// // // // // // // // // // // // // //                             </td>
// // // // // // // // // // // // // //                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1', borderBottom: '1px solid #f8fafc' }}>₹{(item.orderedQty * item.unitPrice).toLocaleString()}</td>
// // // // // // // // // // // // // //                           </tr>
// // // // // // // // // // // // // //                         ))}
// // // // // // // // // // // // // //                       </tbody>
// // // // // // // // // // // // // //                     </table>
// // // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // // // // // // // // // //                     <button onClick={handleDownloadExcel} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // // // // //                       <FileSpreadsheet size={16} /> Export Excel
// // // // // // // // // // // // // //                     </button>
// // // // // // // // // // // // // //                     {activeIndent.status.toLowerCase() === 'pending' && (
// // // // // // // // // // // // // //                       <button onClick={() => handleStatusUpdate(activeIndent._id, 'purchased')} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // // // // //                         <CheckCircle2 size={16} /> Mark Purchased
// // // // // // // // // // // // // //                       </button>
// // // // // // // // // // // // // //                     )}
// // // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // // //                 </>
// // // // // // // // // // // // // //               ) : (
// // // // // // // // // // // // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Select an indent to view details</div>
// // // // // // // // // // // // // //               )}
// // // // // // // // // // // // // //             </div>
// // // // // // // // // // // // // //           </>
// // // // // // // // // // // // // //         ) : (
// // // // // // // // // // // // // //           /* Create New View */
// // // // // // // // // // // // // //           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
// // // // // // // // // // // // // //             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // // // //               <div>
// // // // // // // // // // // // // //                 <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Create Requisition</h2>
// // // // // // // // // // // // // //                 <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
// // // // // // // // // // // // // //                     <span onClick={() => setTab("stock-items")} style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: tab === 'stock-items' ? '#6366f1' : '#64748b' }}>Stock Items</span>
// // // // // // // // // // // // // //                     <span onClick={() => setTab("units")} style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: tab === 'units' ? '#6366f1' : '#64748b' }}>Units</span>
// // // // // // // // // // // // // //                 </div>
// // // // // // // // // // // // // //               </div>
// // // // // // // // // // // // // //               <div style={{ textAlign: 'right' }}>
// // // // // // // // // // // // // //                 <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>ESTIMATED TOTAL</div>
// // // // // // // // // // // // // //                 <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{Object.values(selectedItems).reduce((sum, i) => i.checked ? sum + (Number(i.qty || 0) * Number(i.price || 0)) : sum, 0).toLocaleString()}</div>
// // // // // // // // // // // // // //               </div>
// // // // // // // // // // // // // //             </div>

// // // // // // // // // // // // // //             <div style={{ flex: 1, overflowY: 'auto' }}>
// // // // // // // // // // // // // //               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // // // // // //                 <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
// // // // // // // // // // // // // //                   <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // // // // // // // // // //                     <th style={{ padding: '20px 32px', width: '50px' }}>
// // // // // // // // // // // // // //                         <input type="checkbox" onChange={handleSelectAll} style={{ width: '18px', height: '18px' }} />
// // // // // // // // // // // // // //                     </th>
// // // // // // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>NAME</th>
// // // // // // // // // // // // // //                     {tab === "stock-items" && (
// // // // // // // // // // // // // //                       <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>STOCK GROUP</th>
// // // // // // // // // // // // // //                     )}
// // // // // // // // // // // // // //                     {tab === "units" && <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>SYMBOL</th>}
// // // // // // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '120px' }}>QTY</th>
// // // // // // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '100px' }}>PRICE</th>
// // // // // // // // // // // // // //                     <th style={{ padding: '20px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>ITEM TOTAL</th>
// // // // // // // // // // // // // //                   </tr>
// // // // // // // // // // // // // //                 </thead>
// // // // // // // // // // // // // //                 <tbody>
// // // // // // // // // // // // // //                   {filteredStock.map((row) => {
// // // // // // // // // // // // // //                     const state = selectedItems[row._id] || { checked: false, qty: 0, price: 0 };
// // // // // // // // // // // // // //                     const itemTotal = Number(state.qty || 0) * Number(state.price || 0);

// // // // // // // // // // // // // //                     return (
// // // // // // // // // // // // // //                       <tr key={row._id} style={{ borderBottom: '1px solid #f8fafc', background: state.checked ? '#fcfdff' : 'transparent' }}>
// // // // // // // // // // // // // //                         <td style={{ padding: '16px 32px' }}>
// // // // // // // // // // // // // //                           <input type="checkbox" checked={state.checked} onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, checked: e.target.checked } }))} style={{ width: '18px', height: '18px' }} />
// // // // // // // // // // // // // //                         </td>
// // // // // // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // // // // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
// // // // // // // // // // // // // //                             {row.imageUrl && <img src={row.imageUrl} style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />}
// // // // // // // // // // // // // //                             <span style={{ fontWeight: '700', color: '#1e293b' }}>{row.name}</span>
// // // // // // // // // // // // // //                           </div>
// // // // // // // // // // // // // //                         </td>
// // // // // // // // // // // // // //                         {tab === "stock-items" && (
// // // // // // // // // // // // // //                           <td style={{ padding: '16px 0' }}>
// // // // // // // // // // // // // //                             <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
// // // // // // // // // // // // // //                               {row.stockGroupId?.name || 'Unassigned'}
// // // // // // // // // // // // // //                             </span>
// // // // // // // // // // // // // //                           </td>
// // // // // // // // // // // // // //                         )}
// // // // // // // // // // // // // //                         {tab === "units" && (
// // // // // // // // // // // // // //                           <td style={{ padding: '16px 0', fontWeight: '600', color: '#64748b' }}>
// // // // // // // // // // // // // //                             {row.symbol}
// // // // // // // // // // // // // //                           </td>
// // // // // // // // // // // // // //                         )}
// // // // // // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // // // // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // // // // //                             <input type="number" disabled={!state.checked} value={state.qty} placeholder="0" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, qty: e.target.value } }))} style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // // // // // // // // // // // //                             <span style={{ fontSize: '11px', color: '#64748b' }}>{row.unitId?.symbol}</span>
// // // // // // // // // // // // // //                           </div>
// // // // // // // // // // // // // //                         </td>
// // // // // // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // // // // // //                            <input type="number" disabled={!state.checked} value={state.price} placeholder="₹" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, price: e.target.value } }))} style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // // // // // // // // // // // //                         </td>
// // // // // // // // // // // // // //                         <td style={{ padding: '16px 32px', textAlign: 'right', fontWeight: '800', color: state.checked ? '#6366f1' : '#94a3b8' }}>
// // // // // // // // // // // // // //                           ₹{itemTotal.toLocaleString()}
// // // // // // // // // // // // // //                         </td>
// // // // // // // // // // // // // //                       </tr>
// // // // // // // // // // // // // //                     );
// // // // // // // // // // // // // //                   })}
// // // // // // // // // // // // // //                 </tbody>
// // // // // // // // // // // // // //               </table>
// // // // // // // // // // // // // //             </div>
// // // // // // // // // // // // // //             <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // // // // // // // // // // // // //               <button onClick={submitIndent} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
// // // // // // // // // // // // // //                 Submit Requisition
// // // // // // // // // // // // // //               </button>
// // // // // // // // // // // // // //             </div>
// // // // // // // // // // // // // //           </div>
// // // // // // // // // // // // // //         )}
// // // // // // // // // // // // // //       </div>
// // // // // // // // // // // // // //     </div>
// // // // // // // // // // // // // //   );
// // // // // // // // // // // // // // };














// // // // // // // // // // // // // // 15
















// // // // // // // // // // // // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // // // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // // // // import { useToast } from "../toast.jsx";
// // // // // // // // // // // // // import * as XLSX from "xlsx";
// // // // // // // // // // // // // import { 
// // // // // // // // // // // // //   Search, FileSpreadsheet, CheckCircle2, Inbox, 
// // // // // // // // // // // // //   ClipboardList, PlusCircle, RefreshCw, X, Save 
// // // // // // // // // // // // // } from "lucide-react";

// // // // // // // // // // // // // export const IndentPage = () => {
// // // // // // // // // // // // //   const { showToast } = useToast();
  
// // // // // // // // // // // // //   // View State
// // // // // // // // // // // // //   const [view, setView] = useState("history"); 
// // // // // // // // // // // // //   const [tab, setTab] = useState("stock-items");
// // // // // // // // // // // // //   const [searchTerm, setSearchTerm] = useState("");
  
// // // // // // // // // // // // //   // Data State
// // // // // // // // // // // // //   const [stockItems, setStockItems] = useState([]);
// // // // // // // // // // // // //   const [indents, setIndents] = useState([]);
// // // // // // // // // // // // //   const [indentRequests, setIndentRequests] = useState([]);
// // // // // // // // // // // // //   const [selectedItems, setSelectedItems] = useState({});
// // // // // // // // // // // // //   const [selectedId, setSelectedId] = useState(null);

// // // // // // // // // // // // //   // --- Editing State for Requests ---
// // // // // // // // // // // // //   const [editingRequest, setEditingRequest] = useState(null);

// // // // // // // // // // // // //   // --- Data Loading ---
// // // // // // // // // // // // //   const load = useCallback(async () => {
// // // // // // // // // // // // //     try {
// // // // // // // // // // // // //       const [itemsRes, indentRes] = await Promise.all([
// // // // // // // // // // // // //         api.get("/inventory/stock-items"),
// // // // // // // // // // // // //         api.get("/indents")
// // // // // // // // // // // // //       ]);
// // // // // // // // // // // // //       setStockItems(itemsRes.data || []);
// // // // // // // // // // // // //       const sorted = (indentRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // // // // // // // //       setIndents(sorted);
// // // // // // // // // // // // //       if (sorted.length > 0 && !selectedId) setSelectedId(sorted[0]._id);
// // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // //       showToast("Failed to load data", "error");
// // // // // // // // // // // // //     }
// // // // // // // // // // // // //   }, [showToast, selectedId]);

// // // // // // // // // // // // //   const fetchIndentRequests = useCallback(async () => {
// // // // // // // // // // // // //     try {
// // // // // // // // // // // // //       const res = await api.get("/indent-requests");
// // // // // // // // // // // // //       setIndentRequests(res.data || []);
// // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // //       showToast("Failed to fetch requests", "error");
// // // // // // // // // // // // //     }
// // // // // // // // // // // // //   }, [showToast]);

// // // // // // // // // // // // //   useEffect(() => { 
// // // // // // // // // // // // //     load(); 
// // // // // // // // // // // // //     if (view === "requests") fetchIndentRequests();
// // // // // // // // // // // // //   }, [load, fetchIndentRequests, view]);

// // // // // // // // // // // // //   // --- Helper Functions ---
// // // // // // // // // // // // //   const getUnitSymbol = (item) => {
// // // // // // // // // // // // //     if (item.stockItemId?.unitId?.symbol) return item.stockItemId.unitId.symbol;
// // // // // // // // // // // // //     if (item.unitId?.symbol) return item.unitId.symbol;
// // // // // // // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // // // // // // //     return found?.unitId?.symbol || "";
// // // // // // // // // // // // //   };

// // // // // // // // // // // // //   const getItemName = (item) => {
// // // // // // // // // // // // //     if (item.stockItemId?.name) return item.stockItemId.name;
// // // // // // // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // // // // // // //     return found ? found.name : "Unknown Product";
// // // // // // // // // // // // //   };

// // // // // // // // // // // // //   const getGroupName = (item) => {
// // // // // // // // // // // // //     if (item.stockItemId?.stockGroupId?.name) return item.stockItemId.stockGroupId.name;
// // // // // // // // // // // // //     if (item.stockGroupId?.name) return item.stockGroupId.name;
// // // // // // // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // // // // // // //     return found?.stockGroupId?.name || "General";
// // // // // // // // // // // // //   };

// // // // // // // // // // // // //   // --- Action Handlers ---
// // // // // // // // // // // // //   const handleDownloadAllRequestsExcel = () => {
// // // // // // // // // // // // //     if (!indentRequests.length) {
// // // // // // // // // // // // //       return showToast("No requests available", "info");
// // // // // // // // // // // // //     }

// // // // // // // // // // // // //     const godownNames = [
// // // // // // // // // // // // //       ...new Set(indentRequests.map(r => r.godownId?.name || "General"))
// // // // // // // // // // // // //     ];

// // // // // // // // // // // // //     const itemMap = {};

// // // // // // // // // // // // //     indentRequests.forEach(req => {
// // // // // // // // // // // // //       const godownName = req.godownId?.name || "General";
// // // // // // // // // // // // //       req.items.forEach(item => {
// // // // // // // // // // // // //         const id = item.stockItemId?._id || item.stockItemId;

// // // // // // // // // // // // //         if (!itemMap[id]) {
// // // // // // // // // // // // //           itemMap[id] = {
// // // // // // // // // // // // //             stockItem: getItemName(item),
// // // // // // // // // // // // //             group: getGroupName(item),
// // // // // // // // // // // // //             unit: getUnitSymbol(item),
// // // // // // // // // // // // //             totalQty: 0,
// // // // // // // // // // // // //             godowns: {}
// // // // // // // // // // // // //           };
// // // // // // // // // // // // //         }

// // // // // // // // // // // // //         const qty = Number(item.qtyBaseUnit || 0);
// // // // // // // // // // // // //         itemMap[id].totalQty += qty;
// // // // // // // // // // // // //         itemMap[id].godowns[godownName] = (itemMap[id].godowns[godownName] || 0) + qty;
// // // // // // // // // // // // //       });
// // // // // // // // // // // // //     });

// // // // // // // // // // // // //     const excelData = Object.values(itemMap).map((item, index) => {
// // // // // // // // // // // // //       const row = {
// // // // // // // // // // // // //         "S.No": index + 1,
// // // // // // // // // // // // //         "Stock Item": item.stockItem,
// // // // // // // // // // // // //         "Stock Group": item.group,
// // // // // // // // // // // // //         "Quantity": item.totalQty,
// // // // // // // // // // // // //         "Unit": item.unit
// // // // // // // // // // // // //       };
// // // // // // // // // // // // //       godownNames.forEach(g => {
// // // // // // // // // // // // //         row[g] = item.godowns[g] || 0;
// // // // // // // // // // // // //       });
// // // // // // // // // // // // //       return row;
// // // // // // // // // // // // //     });

// // // // // // // // // // // // //     const ws = XLSX.utils.json_to_sheet(excelData);
// // // // // // // // // // // // //     const wb = XLSX.utils.book_new();
// // // // // // // // // // // // //     XLSX.utils.book_append_sheet(wb, ws, "All Requests");
// // // // // // // // // // // // //     XLSX.writeFile(wb, "All_Godown_Requests.xlsx");
// // // // // // // // // // // // //     showToast("Excel exported successfully", "success");
// // // // // // // // // // // // //   };

// // // // // // // // // // // // //   const handleDownloadExcel = () => {
// // // // // // // // // // // // //     if (!activeIndent) return;
// // // // // // // // // // // // //     const data = activeIndent.items.map(item => ({
// // // // // // // // // // // // //       "Product": getItemName(item),
// // // // // // // // // // // // //       "Group": getGroupName(item),
// // // // // // // // // // // // //       "Quantity": item.orderedQty,
// // // // // // // // // // // // //       "Unit": getUnitSymbol(item),
// // // // // // // // // // // // //       "Price": item.unitPrice,
// // // // // // // // // // // // //       "Subtotal": item.orderedQty * item.unitPrice
// // // // // // // // // // // // //     }));
// // // // // // // // // // // // //     const ws = XLSX.utils.json_to_sheet(data);
// // // // // // // // // // // // //     const wb = XLSX.utils.book_new();
// // // // // // // // // // // // //     XLSX.utils.book_append_sheet(wb, ws, "Indent");
// // // // // // // // // // // // //     XLSX.writeFile(wb, `Indent_${activeIndent.indentNo || 'Export'}.xlsx`);
// // // // // // // // // // // // //     showToast("Excel exported successfully", "success");
// // // // // // // // // // // // //   };

// // // // // // // // // // // // //   const handleStatusUpdate = async (id, newStatus) => {
// // // // // // // // // // // // //     try {
// // // // // // // // // // // // //       if (newStatus === 'purchased') {
// // // // // // // // // // // // //         await api.post(`/indents/${id}/mark-purchased`);
// // // // // // // // // // // // //       } else {
// // // // // // // // // // // // //         await api.patch(`/indents/${id}`, { status: newStatus });
// // // // // // // // // // // // //       }
// // // // // // // // // // // // //       showToast(`Indent marked as ${newStatus}`, "success");
// // // // // // // // // // // // //       load();
// // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // //       showToast("Failed to update status", "error");
// // // // // // // // // // // // //     }
// // // // // // // // // // // // //   };

// // // // // // // // // // // // //   const finalizeConversion = async () => {
// // // // // // // // // // // // //     try {
// // // // // // // // // // // // //       await api.post(`/indent-requests/${editingRequest._id}/convert`, {
// // // // // // // // // // // // //         items: editingRequest.items.map(it => ({
// // // // // // // // // // // // //           stockItemId: it.stockItemId._id || it.stockItemId,
// // // // // // // // // // // // //           qty: Number(it.qtyBaseUnit),
// // // // // // // // // // // // //           price: Number(it.price || 0)
// // // // // // // // // // // // //         }))
// // // // // // // // // // // // //       });
// // // // // // // // // // // // //       showToast("Converted to official indent!", "success");
// // // // // // // // // // // // //       setEditingRequest(null);
// // // // // // // // // // // // //       fetchIndentRequests();
// // // // // // // // // // // // //       load();
// // // // // // // // // // // // //       setView("history");
// // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // //       showToast("Conversion failed", "error");
// // // // // // // // // // // // //     }
// // // // // // // // // // // // //   };

// // // // // // // // // // // // //   const submitIndent = async () => {
// // // // // // // // // // // // //     const itemsToSubmit = Object.keys(selectedItems)
// // // // // // // // // // // // //       .filter(id => selectedItems[id].checked && Number(selectedItems[id].qty) > 0)
// // // // // // // // // // // // //       .map(id => ({
// // // // // // // // // // // // //         stockItemId: id,
// // // // // // // // // // // // //         orderedQty: Number(selectedItems[id].qty),
// // // // // // // // // // // // //         unitPrice: Number(selectedItems[id].price || 0),
// // // // // // // // // // // // //         amount: Number(selectedItems[id].qty) * Number(selectedItems[id].price || 0)
// // // // // // // // // // // // //       }));

// // // // // // // // // // // // //     if (itemsToSubmit.length === 0) return showToast("Select items with quantity", "info");

// // // // // // // // // // // // //     try {
// // // // // // // // // // // // //       await api.post("/indents", { items: itemsToSubmit });
// // // // // // // // // // // // //       showToast("Indent submitted", "success");
// // // // // // // // // // // // //       setSelectedItems({});
// // // // // // // // // // // // //       setView("history");
// // // // // // // // // // // // //       load();
// // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // //       showToast("Submission failed", "error");
// // // // // // // // // // // // //     }
// // // // // // // // // // // // //   };

// // // // // // // // // // // // //   // --- Memoized Filters ---
// // // // // // // // // // // // //   const filteredIndents = useMemo(() => {
// // // // // // // // // // // // //     return indents.filter(i =>
// // // // // // // // // // // // //       (i.indentNo?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
// // // // // // // // // // // // //       (i._id.includes(searchTerm))
// // // // // // // // // // // // //     );
// // // // // // // // // // // // //   }, [indents, searchTerm]);

// // // // // // // // // // // // //   const filteredStock = useMemo(() => {
// // // // // // // // // // // // //     return stockItems.filter(s =>
// // // // // // // // // // // // //       s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
// // // // // // // // // // // // //       s.stockGroupId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
// // // // // // // // // // // // //     );
// // // // // // // // // // // // //   }, [stockItems, searchTerm]);

// // // // // // // // // // // // //   const activeIndent = useMemo(() =>
// // // // // // // // // // // // //     indents.find(i => i._id === selectedId) || indents[0],
// // // // // // // // // // // // //     [selectedId, indents]);

// // // // // // // // // // // // //   return (
// // // // // // // // // // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // // // // // // // // // //       {/* Header Area */}
// // // // // // // // // // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// // // // // // // // // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // // // // // // // // // // //             <span style={{ color: '#6366f1' }}>Indents</span>
// // // // // // // // // // // // //           </h1>
          
// // // // // // // // // // // // //           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
// // // // // // // // // // // // //             {[
// // // // // // // // // // // // //               { id: 'history', label: 'Logs', icon: <ClipboardList size={14}/> },
// // // // // // // // // // // // //               { id: 'requests', label: 'Requests', icon: <Inbox size={14}/> },
// // // // // // // // // // // // //               { id: 'create', label: 'Create New', icon: <PlusCircle size={14}/> }
// // // // // // // // // // // // //             ].map((btn) => (
// // // // // // // // // // // // //               <button 
// // // // // // // // // // // // //                 key={btn.id}
// // // // // // // // // // // // //                 onClick={() => { setView(btn.id); setSearchTerm(""); setEditingRequest(null); }}
// // // // // // // // // // // // //                 style={{ 
// // // // // // // // // // // // //                   display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
// // // // // // // // // // // // //                   background: view === btn.id ? '#fff' : 'transparent', 
// // // // // // // // // // // // //                   color: view === btn.id ? '#6366f1' : '#64748b', 
// // // // // // // // // // // // //                   boxShadow: view === btn.id ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' 
// // // // // // // // // // // // //                 }}>
// // // // // // // // // // // // //                 {btn.icon} {btn.label}
// // // // // // // // // // // // //               </button>
// // // // // // // // // // // // //             ))}
// // // // // // // // // // // // //           </div>
// // // // // // // // // // // // //         </div>

// // // // // // // // // // // // //         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // // // // // // // // //           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // // // // // // // // // //           <input
// // // // // // // // // // // // //             type="text"
// // // // // // // // // // // // //             placeholder="Search..."
// // // // // // // // // // // // //             value={searchTerm}
// // // // // // // // // // // // //             onChange={(e) => setSearchTerm(e.target.value)}
// // // // // // // // // // // // //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
// // // // // // // // // // // // //           />
// // // // // // // // // // // // //         </div>
// // // // // // // // // // // // //       </div>

// // // // // // // // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // // // // // // // // //         {/* VIEW: HISTORY/LOGS */}
// // // // // // // // // // // // //         {view === "history" && (
// // // // // // // // // // // // //           <>
// // // // // // // // // // // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // // // // // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>RESULTS ({filteredIndents.length})</div>
// // // // // // // // // // // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // // // // // // // //                 {filteredIndents.map(r => (
// // // // // // // // // // // // //                   <div key={r._id} onClick={() => setSelectedId(r._id)}
// // // // // // // // // // // // //                     style={{ padding: '16px', borderRadius: '16px', cursor: 'pointer', background: selectedId === r._id ? '#fff' : 'transparent', border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent', boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', transition: 'all 0.2s' }}>
// // // // // // // // // // // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // // //                       <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b' }}>{r.indentNo || `REF-${r._id.slice(-4)}`}</div>
// // // // // // // // // // // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
// // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>₹{r.totalAmount?.toLocaleString()} • {r.status.toUpperCase()}</div>
// // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // //                 ))}
// // // // // // // // // // // // //               </div>
// // // // // // // // // // // // //             </div>

// // // // // // // // // // // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // // // // // // // // //               {activeIndent ? (
// // // // // // // // // // // // //                 <>
// // // // // // // // // // // // //                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
// // // // // // // // // // // // //                     <div>
// // // // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>INDENT STATUS</div>
// // // // // // // // // // // // //                       <div style={{ padding: '4px 12px', background: activeIndent.status === 'pending' ? '#fef3c7' : '#dcfce7', color: activeIndent.status === 'pending' ? '#d97706' : '#166534', borderRadius: '6px', fontSize: '12px', fontWeight: '800', display: 'inline-block' }}>
// // // // // // // // // // // // //                         {activeIndent.status.toUpperCase()}
// // // // // // // // // // // // //                       </div>
// // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // //                     <div style={{ textAlign: 'right' }}>
// // // // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
// // // // // // // // // // // // //                       <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activeIndent.totalAmount?.toLocaleString()}</div>
// // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // // // // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // // // // //                       <thead>
// // // // // // // // // // // // //                         <tr style={{ textAlign: 'left' }}>
// // // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th>
// // // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// // // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
// // // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// // // // // // // // // // // // //                         </tr>
// // // // // // // // // // // // //                       </thead>
// // // // // // // // // // // // //                       <tbody>
// // // // // // // // // // // // //                         {activeIndent.items.map((item, idx) => (
// // // // // // // // // // // // //                           <tr key={idx}>
// // // // // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(item)}</div>
// // // // // // // // // // // // //                               <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
// // // // // // // // // // // // //                             </td>
// // // // // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // // //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// // // // // // // // // // // // //                                 {getGroupName(item)}
// // // // // // // // // // // // //                               </span>
// // // // // // // // // // // // //                             </td>
// // // // // // // // // // // // //                             <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // // //                                {item.orderedQty} <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: '400'}}>{getUnitSymbol(item)}</span>
// // // // // // // // // // // // //                             </td>
// // // // // // // // // // // // //                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1', borderBottom: '1px solid #f8fafc' }}>₹{(item.orderedQty * item.unitPrice).toLocaleString()}</td>
// // // // // // // // // // // // //                           </tr>
// // // // // // // // // // // // //                         ))}
// // // // // // // // // // // // //                       </tbody>
// // // // // // // // // // // // //                     </table>
// // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // // // // // // // // //                     <button onClick={handleDownloadExcel} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // // // //                       <FileSpreadsheet size={16} /> Export Excel
// // // // // // // // // // // // //                     </button>
// // // // // // // // // // // // //                     {activeIndent.status.toLowerCase() === 'pending' && (
// // // // // // // // // // // // //                       <button onClick={() => handleStatusUpdate(activeIndent._id, 'purchased')} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // // // //                         <CheckCircle2 size={16} /> Mark Purchased
// // // // // // // // // // // // //                       </button>
// // // // // // // // // // // // //                     )}
// // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // //                 </>
// // // // // // // // // // // // //               ) : (
// // // // // // // // // // // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Select an indent to view details</div>
// // // // // // // // // // // // //               )}
// // // // // // // // // // // // //             </div>
// // // // // // // // // // // // //           </>
// // // // // // // // // // // // //         )}

// // // // // // // // // // // // //         {/* VIEW: INDENT REQUESTS (INCOMING) */}
// // // // // // // // // // // // //         {view === "requests" && (
// // // // // // // // // // // // //           <>
// // // // // // // // // // // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // // // // // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>
// // // // // // // // // // // // //                 PENDING REQUESTS ({indentRequests.length})
// // // // // // // // // // // // //               </div>
// // // // // // // // // // // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // // // // // // // //                 {indentRequests.map(r => (
// // // // // // // // // // // // //                   <div 
// // // // // // // // // // // // //                     key={r._id} 
// // // // // // // // // // // // //                     onClick={() => setEditingRequest(JSON.parse(JSON.stringify(r)))}
// // // // // // // // // // // // //                     style={{ 
// // // // // // // // // // // // //                       padding: '16px', 
// // // // // // // // // // // // //                       borderRadius: '16px', 
// // // // // // // // // // // // //                       cursor: 'pointer', 
// // // // // // // // // // // // //                       background: editingRequest?._id === r._id ? '#fff' : 'transparent', 
// // // // // // // // // // // // //                       border: editingRequest?._id === r._id ? '1px solid #6366f1' : '1px solid transparent', 
// // // // // // // // // // // // //                       boxShadow: editingRequest?._id === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', 
// // // // // // // // // // // // //                       transition: 'all 0.2s' 
// // // // // // // // // // // // //                     }}
// // // // // // // // // // // // //                   >
// // // // // // // // // // // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // // //                       <div style={{ fontWeight: '700', color: editingRequest?._id === r._id ? '#6366f1' : '#1e293b' }}>
// // // // // // // // // // // // //                         {r.userId?.name || 'Unknown User'}
// // // // // // // // // // // // //                       </div>
// // // // // // // // // // // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
// // // // // // // // // // // // //                         {new Date(r.createdAt).toLocaleDateString()}
// // // // // // // // // // // // //                       </div>
// // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
// // // // // // // // // // // // //                       {r.godownId?.name || "Main Godown"} • {r.items?.length} Items
// // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // //                 ))}
// // // // // // // // // // // // //               </div>
// // // // // // // // // // // // //             </div>

// // // // // // // // // // // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // // // // // // // // //               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
// // // // // // // // // // // // //                 {editingRequest ? (
// // // // // // // // // // // // //                   <>
// // // // // // // // // // // // //                     <div>
// // // // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>SOURCE GODOWN</div>
// // // // // // // // // // // // //                       <div style={{ fontWeight: '800', fontSize: '18px', color: '#0f172a' }}>
// // // // // // // // // // // // //                         {editingRequest.godownId?.name || "General"}
// // // // // // // // // // // // //                       </div>
// // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // //                     <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
// // // // // // // // // // // // //                       <button
// // // // // // // // // // // // //                         onClick={handleDownloadAllRequestsExcel}
// // // // // // // // // // // // //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// // // // // // // // // // // // //                       >
// // // // // // // // // // // // //                         <FileSpreadsheet size={16} /> Export All Requests
// // // // // // // // // // // // //                       </button>
// // // // // // // // // // // // //                       <div style={{ textAlign: 'right' }}>
// // // // // // // // // // // // //                         <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>ESTIMATED VALUATION</div>
// // // // // // // // // // // // //                         <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>
// // // // // // // // // // // // //                           ₹{editingRequest.items.reduce((sum, i) => sum + (Number(i.qtyBaseUnit || 0) * Number(i.price || 0)), 0).toLocaleString()}
// // // // // // // // // // // // //                         </div>
// // // // // // // // // // // // //                       </div>
// // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // //                   </>
// // // // // // // // // // // // //                 ) : (
// // // // // // // // // // // // //                   <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
// // // // // // // // // // // // //                      <button
// // // // // // // // // // // // //                         onClick={handleDownloadAllRequestsExcel}
// // // // // // // // // // // // //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// // // // // // // // // // // // //                       >
// // // // // // // // // // // // //                         <FileSpreadsheet size={16} /> Export All Requests
// // // // // // // // // // // // //                       </button>
// // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // //                 )}
// // // // // // // // // // // // //               </div>

// // // // // // // // // // // // //               {editingRequest ? (
// // // // // // // // // // // // //                 <>
// // // // // // // // // // // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // // // // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // // // // //                       <thead>
// // // // // // // // // // // // //                         <tr style={{ textAlign: 'left' }}>
// // // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th>
// // // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// // // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', width: '140px' }}>QTY</th>
// // // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', width: '150px' }}>UNIT PRICE</th>
// // // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// // // // // // // // // // // // //                         </tr>
// // // // // // // // // // // // //                       </thead>
// // // // // // // // // // // // //                       <tbody>
// // // // // // // // // // // // //                         {editingRequest.items.map((it, idx) => (
// // // // // // // // // // // // //                           <tr key={idx}>
// // // // // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(it)}</div>
// // // // // // // // // // // // //                             </td>
// // // // // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // // //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// // // // // // // // // // // // //                                 {getGroupName(it)}
// // // // // // // // // // // // //                               </span>
// // // // // // // // // // // // //                             </td>
// // // // // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // // //                                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // // // //                                     <input
// // // // // // // // // // // // //                                         type="number"
// // // // // // // // // // // // //                                         value={it.qtyBaseUnit}
// // // // // // // // // // // // //                                         onChange={(e) => {
// // // // // // // // // // // // //                                         const updated = [...editingRequest.items];
// // // // // // // // // // // // //                                         updated[idx].qtyBaseUnit = e.target.value;
// // // // // // // // // // // // //                                         setEditingRequest({ ...editingRequest, items: updated });
// // // // // // // // // // // // //                                         }}
// // // // // // // // // // // // //                                         style={{ width: '70px', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: '600' }}
// // // // // // // // // // // // //                                     />
// // // // // // // // // // // // //                                     <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>
// // // // // // // // // // // // //                                         {getUnitSymbol(it)}
// // // // // // // // // // // // //                                     </span>
// // // // // // // // // // // // //                                 </div>
// // // // // // // // // // // // //                             </td>
// // // // // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // // //                               <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
// // // // // // // // // // // // //                                 <span style={{ color: '#94a3b8', fontSize: '13px' }}>₹</span>
// // // // // // // // // // // // //                                 <input
// // // // // // // // // // // // //                                   type="number"
// // // // // // // // // // // // //                                   placeholder="0.00"
// // // // // // // // // // // // //                                   value={it.price || ""}
// // // // // // // // // // // // //                                   onChange={(e) => {
// // // // // // // // // // // // //                                     const updated = [...editingRequest.items];
// // // // // // // // // // // // //                                     updated[idx].price = e.target.value;
// // // // // // // // // // // // //                                     setEditingRequest({ ...editingRequest, items: updated });
// // // // // // // // // // // // //                                   }}
// // // // // // // // // // // // //                                   style={{ width: '90px', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: '600' }}
// // // // // // // // // // // // //                                 />
// // // // // // // // // // // // //                               </div>
// // // // // // // // // // // // //                             </td>
// // // // // // // // // // // // //                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // // //                               ₹{(Number(it.qtyBaseUnit || 0) * Number(it.price || 0)).toLocaleString()}
// // // // // // // // // // // // //                             </td>
// // // // // // // // // // // // //                           </tr>
// // // // // // // // // // // // //                         ))}
// // // // // // // // // // // // //                       </tbody>
// // // // // // // // // // // // //                     </table>
// // // // // // // // // // // // //                   </div>

// // // // // // // // // // // // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // // // // // // // // //                     <button 
// // // // // // // // // // // // //                       onClick={() => setEditingRequest(null)} 
// // // // // // // // // // // // //                       style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
// // // // // // // // // // // // //                     >
// // // // // // // // // // // // //                       Cancel
// // // // // // // // // // // // //                     </button>
// // // // // // // // // // // // //                     <button 
// // // // // // // // // // // // //                       onClick={finalizeConversion} 
// // // // // // // // // // // // //                       style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
// // // // // // // // // // // // //                     >
// // // // // // // // // // // // //                       <Save size={16} /> Confirm & Convert to Indent
// // // // // // // // // // // // //                     </button>
// // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // //                 </>
// // // // // // // // // // // // //               ) : (
// // // // // // // // // // // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// // // // // // // // // // // // //                   Select a request from the sidebar to review and convert
// // // // // // // // // // // // //                 </div>
// // // // // // // // // // // // //               )}
// // // // // // // // // // // // //             </div>
// // // // // // // // // // // // //           </>
// // // // // // // // // // // // //         )}

// // // // // // // // // // // // //         {/* VIEW: CREATE NEW (MANUAL) */}
// // // // // // // // // // // // //         {view === "create" && (
// // // // // // // // // // // // //           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
// // // // // // // // // // // // //             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // // //               <div>
// // // // // // // // // // // // //                 <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Create Requisition</h2>
// // // // // // // // // // // // //                 <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
// // // // // // // // // // // // //                     <span onClick={() => setTab("stock-items")} style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: tab === 'stock-items' ? '#6366f1' : '#64748b' }}>Stock Items</span>
// // // // // // // // // // // // //                 </div>
// // // // // // // // // // // // //               </div>
// // // // // // // // // // // // //               <div style={{ textAlign: 'right' }}>
// // // // // // // // // // // // //                 <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>ESTIMATED TOTAL</div>
// // // // // // // // // // // // //                 <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{Object.values(selectedItems).reduce((sum, i) => i.checked ? sum + (Number(i.qty || 0) * Number(i.price || 0)) : sum, 0).toLocaleString()}</div>
// // // // // // // // // // // // //               </div>
// // // // // // // // // // // // //             </div>

// // // // // // // // // // // // //             <div style={{ flex: 1, overflowY: 'auto' }}>
// // // // // // // // // // // // //               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // // // // //                 <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
// // // // // // // // // // // // //                   <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // // // // // // // // //                     <th style={{ padding: '20px 32px', width: '50px' }}>
// // // // // // // // // // // // //                         <input type="checkbox" onChange={(e) => {
// // // // // // // // // // // // //                            const isChecked = e.target.checked;
// // // // // // // // // // // // //                            const newSelection = { ...selectedItems };
// // // // // // // // // // // // //                            filteredStock.forEach(item => {
// // // // // // // // // // // // //                              newSelection[item._id] = { ...(newSelection[item._id] || { qty: 0, price: 0 }), checked: isChecked };
// // // // // // // // // // // // //                            });
// // // // // // // // // // // // //                            setSelectedItems(newSelection);
// // // // // // // // // // // // //                         }} style={{ width: '18px', height: '18px' }} />
// // // // // // // // // // // // //                     </th>
// // // // // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>NAME</th>
// // // // // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>STOCK GROUP</th>
// // // // // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '140px' }}>QTY</th>
// // // // // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '100px' }}>PRICE</th>
// // // // // // // // // // // // //                     <th style={{ padding: '20px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>ITEM TOTAL</th>
// // // // // // // // // // // // //                   </tr>
// // // // // // // // // // // // //                 </thead>
// // // // // // // // // // // // //                 <tbody>
// // // // // // // // // // // // //                   {filteredStock.map((row) => {
// // // // // // // // // // // // //                     const state = selectedItems[row._id] || { checked: false, qty: 0, price: 0 };
// // // // // // // // // // // // //                     const itemTotal = Number(state.qty || 0) * Number(state.price || 0);
// // // // // // // // // // // // //                     return (
// // // // // // // // // // // // //                       <tr key={row._id} style={{ borderBottom: '1px solid #f8fafc', background: state.checked ? '#fcfdff' : 'transparent' }}>
// // // // // // // // // // // // //                         <td style={{ padding: '16px 32px' }}>
// // // // // // // // // // // // //                           <input type="checkbox" checked={state.checked} onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, checked: e.target.checked } }))} style={{ width: '18px', height: '18px' }} />
// // // // // // // // // // // // //                         </td>
// // // // // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // // // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
// // // // // // // // // // // // //                             <span style={{ fontWeight: '700', color: '#1e293b' }}>{row.name}</span>
// // // // // // // // // // // // //                           </div>
// // // // // // // // // // // // //                         </td>
// // // // // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // // // // //                           <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
// // // // // // // // // // // // //                             {row.stockGroupId?.name || 'Unassigned'}
// // // // // // // // // // // // //                           </span>
// // // // // // // // // // // // //                         </td>
// // // // // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // // // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // // // //                             <input type="number" disabled={!state.checked} value={state.qty} placeholder="0" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, qty: e.target.value } }))} style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // // // // // // // // // // //                             <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{row.unitId?.symbol}</span>
// // // // // // // // // // // // //                           </div>
// // // // // // // // // // // // //                         </td>
// // // // // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // // // // //                             <input type="number" disabled={!state.checked} value={state.price} placeholder="₹" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, price: e.target.value } }))} style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // // // // // // // // // // //                         </td>
// // // // // // // // // // // // //                         <td style={{ padding: '16px 32px', textAlign: 'right', fontWeight: '800', color: state.checked ? '#6366f1' : '#94a3b8' }}>
// // // // // // // // // // // // //                           ₹{itemTotal.toLocaleString()}
// // // // // // // // // // // // //                         </td>
// // // // // // // // // // // // //                       </tr>
// // // // // // // // // // // // //                     );
// // // // // // // // // // // // //                   })}
// // // // // // // // // // // // //                 </tbody>
// // // // // // // // // // // // //               </table>
// // // // // // // // // // // // //             </div>
// // // // // // // // // // // // //             <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // // // // // // // // // // // //               <button onClick={submitIndent} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
// // // // // // // // // // // // //                 Submit Requisition
// // // // // // // // // // // // //               </button>
// // // // // // // // // // // // //             </div>
// // // // // // // // // // // // //           </div>
// // // // // // // // // // // // //         )}
// // // // // // // // // // // // //       </div>
// // // // // // // // // // // // //     </div>
// // // // // // // // // // // // //   );
// // // // // // // // // // // // // };








// // // // // // // // // // // // // 20











// // // // // // // // // // // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // // // import { useToast } from "../toast.jsx";
// // // // // // // // // // // // import * as XLSX from "xlsx";
// // // // // // // // // // // // import { 
// // // // // // // // // // // //   Search, FileSpreadsheet, CheckCircle2, Inbox, 
// // // // // // // // // // // //   ClipboardList, PlusCircle, RefreshCw, X, Save 
// // // // // // // // // // // // } from "lucide-react";

// // // // // // // // // // // // export const IndentPage = () => {
// // // // // // // // // // // //   const { showToast } = useToast();
// // // // // // // // // // // //   const [selectedDate, setSelectedDate] = useState("");
// // // // // // // // // // // //   // View State
// // // // // // // // // // // //   const [view, setView] = useState("history"); 
// // // // // // // // // // // //   const [tab, setTab] = useState("stock-items");
// // // // // // // // // // // //   const [searchTerm, setSearchTerm] = useState("");
  
// // // // // // // // // // // //   // Data State
// // // // // // // // // // // //   const [stockItems, setStockItems] = useState([]);
// // // // // // // // // // // //   const [indents, setIndents] = useState([]);
// // // // // // // // // // // //   const [indentRequests, setIndentRequests] = useState([]);
// // // // // // // // // // // //   const [selectedItems, setSelectedItems] = useState({});
// // // // // // // // // // // //   const [selectedId, setSelectedId] = useState(null);

// // // // // // // // // // // //   // --- Editing State for Requests ---
// // // // // // // // // // // //   const [editingRequest, setEditingRequest] = useState(null);

// // // // // // // // // // // //   // --- Data Loading ---
// // // // // // // // // // // //   const load = useCallback(async () => {
// // // // // // // // // // // //     try {
// // // // // // // // // // // //       const [itemsRes, indentRes] = await Promise.all([
// // // // // // // // // // // //         api.get("/inventory/stock-items"),
// // // // // // // // // // // //         api.get("/indents")
// // // // // // // // // // // //       ]);
// // // // // // // // // // // //       setStockItems(itemsRes.data || []);
// // // // // // // // // // // //       const sorted = (indentRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // // // // // // //       setIndents(sorted);
// // // // // // // // // // // //       if (sorted.length > 0 && !selectedId) setSelectedId(sorted[0]._id);
// // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // //       showToast("Failed to load data", "error");
// // // // // // // // // // // //     }
// // // // // // // // // // // //   }, [showToast, selectedId]);

// // // // // // // // // // // //   const fetchIndentRequests = useCallback(async () => {
// // // // // // // // // // // //     try {
// // // // // // // // // // // //       const res = await api.get("/indent-requests");
// // // // // // // // // // // //       setIndentRequests(res.data || []);
// // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // //       showToast("Failed to fetch requests", "error");
// // // // // // // // // // // //     }
// // // // // // // // // // // //   }, [showToast]);

// // // // // // // // // // // //   useEffect(() => { 
// // // // // // // // // // // //     load(); 
// // // // // // // // // // // //     if (view === "requests") fetchIndentRequests();
// // // // // // // // // // // //   }, [load, fetchIndentRequests, view]);

// // // // // // // // // // // //   // --- Helper Functions ---
// // // // // // // // // // // //   const getUnitSymbol = (item) => {
// // // // // // // // // // // //     if (item.stockItemId?.unitId?.symbol) return item.stockItemId.unitId.symbol;
// // // // // // // // // // // //     if (item.unitId?.symbol) return item.unitId.symbol;
// // // // // // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // // // // // //     return found?.unitId?.symbol || "";
// // // // // // // // // // // //   };

// // // // // // // // // // // //   const getItemName = (item) => {
// // // // // // // // // // // //     if (item.stockItemId?.name) return item.stockItemId.name;
// // // // // // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // // // // // //     return found ? found.name : "Unknown Product";
// // // // // // // // // // // //   };

// // // // // // // // // // // //   const getGroupName = (item) => {
// // // // // // // // // // // //     if (item.stockItemId?.stockGroupId?.name) return item.stockItemId.stockGroupId.name;
// // // // // // // // // // // //     if (item.stockGroupId?.name) return item.stockGroupId.name;
// // // // // // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // // // // // //     return found?.stockGroupId?.name || "General";
// // // // // // // // // // // //   };

// // // // // // // // // // // //   // --- Action Handlers ---
// // // // // // // // // // // //   // const handleDownloadAllRequestsExcel = () => {
// // // // // // // // // // // //   //   if (!indentRequests.length) {
// // // // // // // // // // // //   //     return showToast("No requests available", "info");
// // // // // // // // // // // //   //   }

// // // // // // // // // // // //   //   const godownNames = [
// // // // // // // // // // // //   //     ...new Set(indentRequests.map(r => r.godownId?.name || "General"))
// // // // // // // // // // // //   //   ];

// // // // // // // // // // // //   //   const itemMap = {};

// // // // // // // // // // // //   //   indentRequests.forEach(req => {
// // // // // // // // // // // //   //     const godownName = req.godownId?.name || "General";
// // // // // // // // // // // //   //     req.items.forEach(item => {
// // // // // // // // // // // //   //       const id = item.stockItemId?._id || item.stockItemId;

// // // // // // // // // // // //   //       if (!itemMap[id]) {
// // // // // // // // // // // //   //         itemMap[id] = {
// // // // // // // // // // // //   //           stockItem: getItemName(item),
// // // // // // // // // // // //   //           group: getGroupName(item),
// // // // // // // // // // // //   //           unit: getUnitSymbol(item),
// // // // // // // // // // // //   //           totalQty: 0,
// // // // // // // // // // // //   //           godowns: {}
// // // // // // // // // // // //   //         };
// // // // // // // // // // // //   //       }

// // // // // // // // // // // //   //       const qty = Number(item.qtyBaseUnit || 0);
// // // // // // // // // // // //   //       itemMap[id].totalQty += qty;
// // // // // // // // // // // //   //       itemMap[id].godowns[godownName] = (itemMap[id].godowns[godownName] || 0) + qty;
// // // // // // // // // // // //   //     });
// // // // // // // // // // // //   //   });

// // // // // // // // // // // //   //   const excelData = Object.values(itemMap).map((item, index) => {
// // // // // // // // // // // //   //     const row = {
// // // // // // // // // // // //   //       "S.No": index + 1,
// // // // // // // // // // // //   //       "Stock Item": item.stockItem,
// // // // // // // // // // // //   //       "Stock Group": item.group,
// // // // // // // // // // // //   //       "Quantity": item.totalQty,
// // // // // // // // // // // //   //       "Unit": item.unit
// // // // // // // // // // // //   //     };
// // // // // // // // // // // //   //     godownNames.forEach(g => {
// // // // // // // // // // // //   //       row[g] = item.godowns[g] || 0;
// // // // // // // // // // // //   //     });
// // // // // // // // // // // //   //     return row;
// // // // // // // // // // // //   //   });

// // // // // // // // // // // //   //   const ws = XLSX.utils.json_to_sheet(excelData);
// // // // // // // // // // // //   //   const wb = XLSX.utils.book_new();
// // // // // // // // // // // //   //   XLSX.utils.book_append_sheet(wb, ws, "All Requests");
// // // // // // // // // // // //   //   XLSX.writeFile(wb, "All_Godown_Requests.xlsx");
// // // // // // // // // // // //   //   showToast("Excel exported successfully", "success");
// // // // // // // // // // // //   // };




// // // // // // // // // // // //   const handleDownloadAllRequestsExcel = () => {
// // // // // // // // // // // //   if (!indentRequests.length) {
// // // // // // // // // // // //     return showToast("No requests available", "info");
// // // // // // // // // // // //   }

// // // // // // // // // // // //   let filteredRequests = indentRequests;

// // // // // // // // // // // //   if (selectedDate) {
// // // // // // // // // // // //     filteredRequests = indentRequests.filter(r => {
// // // // // // // // // // // //       const reqDate = new Date(r.createdAt).toISOString().split("T")[0];
// // // // // // // // // // // //       return reqDate === selectedDate;
// // // // // // // // // // // //     });
// // // // // // // // // // // //   }

// // // // // // // // // // // //   if (!filteredRequests.length) {
// // // // // // // // // // // //     return showToast("No requests found for selected date", "info");
// // // // // // // // // // // //   }

// // // // // // // // // // // //   const godownNames = [
// // // // // // // // // // // //     ...new Set(filteredRequests.map(r => r.godownId?.name || "General"))
// // // // // // // // // // // //   ];

// // // // // // // // // // // //   const itemMap = {};

// // // // // // // // // // // //   filteredRequests.forEach(req => {
// // // // // // // // // // // //     const godownName = req.godownId?.name || "General";

// // // // // // // // // // // //     req.items.forEach(item => {
// // // // // // // // // // // //       const id = item.stockItemId?._id || item.stockItemId;

// // // // // // // // // // // //       if (!itemMap[id]) {
// // // // // // // // // // // //         itemMap[id] = {
// // // // // // // // // // // //           stockItem: getItemName(item),
// // // // // // // // // // // //           group: getGroupName(item),
// // // // // // // // // // // //           unit: getUnitSymbol(item),
// // // // // // // // // // // //           totalQty: 0,
// // // // // // // // // // // //           godowns: {}
// // // // // // // // // // // //         };
// // // // // // // // // // // //       }

// // // // // // // // // // // //       const qty = Number(item.qtyBaseUnit || 0);
// // // // // // // // // // // //       itemMap[id].totalQty += qty;
// // // // // // // // // // // //       itemMap[id].godowns[godownName] =
// // // // // // // // // // // //         (itemMap[id].godowns[godownName] || 0) + qty;
// // // // // // // // // // // //     });
// // // // // // // // // // // //   });

// // // // // // // // // // // //   const excelData = Object.values(itemMap).map((item, index) => {
// // // // // // // // // // // //     const row = {
// // // // // // // // // // // //       "S.No": index + 1,
// // // // // // // // // // // //       "Stock Item": item.stockItem,
// // // // // // // // // // // //       "Stock Group": item.group,
// // // // // // // // // // // //       "Quantity": item.totalQty,
// // // // // // // // // // // //       "Unit": item.unit
// // // // // // // // // // // //     };

// // // // // // // // // // // //     godownNames.forEach(g => {
// // // // // // // // // // // //       row[g] = item.godowns[g] || 0;
// // // // // // // // // // // //     });

// // // // // // // // // // // //     return row;
// // // // // // // // // // // //   });

// // // // // // // // // // // //   const ws = XLSX.utils.json_to_sheet(excelData);
// // // // // // // // // // // //   const wb = XLSX.utils.book_new();
// // // // // // // // // // // //   XLSX.utils.book_append_sheet(wb, ws, "Filtered Requests");

// // // // // // // // // // // //   const fileName = selectedDate
// // // // // // // // // // // //     ? `Requests_${selectedDate}.xlsx`
// // // // // // // // // // // //     : "All_Godown_Requests.xlsx";

// // // // // // // // // // // //   XLSX.writeFile(wb, fileName);

// // // // // // // // // // // //   showToast("Excel exported successfully", "success");
// // // // // // // // // // // // };

// // // // // // // // // // // //   const handleDownloadExcel = () => {
// // // // // // // // // // // //     if (!activeIndent) return;
// // // // // // // // // // // //     const data = activeIndent.items.map(item => ({
// // // // // // // // // // // //       "Product": getItemName(item),
// // // // // // // // // // // //       "Group": getGroupName(item),
// // // // // // // // // // // //       "Quantity": item.orderedQty,
// // // // // // // // // // // //       "Unit": getUnitSymbol(item),
// // // // // // // // // // // //       "Price": item.unitPrice,
// // // // // // // // // // // //       "Subtotal": item.orderedQty * item.unitPrice
// // // // // // // // // // // //     }));
// // // // // // // // // // // //     const ws = XLSX.utils.json_to_sheet(data);
// // // // // // // // // // // //     const wb = XLSX.utils.book_new();
// // // // // // // // // // // //     XLSX.utils.book_append_sheet(wb, ws, "Indent");
// // // // // // // // // // // //     XLSX.writeFile(wb, `Indent_${activeIndent.indentNo || 'Export'}.xlsx`);
// // // // // // // // // // // //     showToast("Excel exported successfully", "success");
// // // // // // // // // // // //   };

// // // // // // // // // // // //   const handleStatusUpdate = async (id, newStatus) => {
// // // // // // // // // // // //     try {
// // // // // // // // // // // //       if (newStatus === 'purchased') {
// // // // // // // // // // // //         await api.post(`/indents/${id}/mark-purchased`);
// // // // // // // // // // // //       } else {
// // // // // // // // // // // //         await api.patch(`/indents/${id}`, { status: newStatus });
// // // // // // // // // // // //       }
// // // // // // // // // // // //       showToast(`Indent marked as ${newStatus}`, "success");
// // // // // // // // // // // //       load();
// // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // //       showToast("Failed to update status", "error");
// // // // // // // // // // // //     }
// // // // // // // // // // // //   };

// // // // // // // // // // // //   const confirmRequest = async () => {
// // // // // // // // // // // //     try {
// // // // // // // // // // // //       await api.patch(`/indent-requests/${editingRequest._id}/confirm`);
// // // // // // // // // // // //       showToast("Request confirmed!", "success");
// // // // // // // // // // // //       setEditingRequest(null);
// // // // // // // // // // // //       fetchIndentRequests();
// // // // // // // // // // // //     } catch (err) {
// // // // // // // // // // // //       showToast("Confirmation failed", "error");
// // // // // // // // // // // //     }
// // // // // // // // // // // //   };

// // // // // // // // // // // //   const submitIndent = async () => {
// // // // // // // // // // // //     const itemsToSubmit = Object.keys(selectedItems)
// // // // // // // // // // // //       .filter(id => selectedItems[id].checked && Number(selectedItems[id].qty) > 0)
// // // // // // // // // // // //       .map(id => ({
// // // // // // // // // // // //         stockItemId: id,
// // // // // // // // // // // //         orderedQty: Number(selectedItems[id].qty),
// // // // // // // // // // // //         unitPrice: Number(selectedItems[id].price || 0),
// // // // // // // // // // // //         amount: Number(selectedItems[id].qty) * Number(selectedItems[id].price || 0)
// // // // // // // // // // // //       }));

// // // // // // // // // // // //     if (itemsToSubmit.length === 0) return showToast("Select items with quantity", "info");

// // // // // // // // // // // //     try {
// // // // // // // // // // // //       await api.post("/indents", { items: itemsToSubmit });
// // // // // // // // // // // //       showToast("Indent submitted", "success");
// // // // // // // // // // // //       setSelectedItems({});
// // // // // // // // // // // //       setView("history");
// // // // // // // // // // // //       load();
// // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // //       showToast("Submission failed", "error");
// // // // // // // // // // // //     }
// // // // // // // // // // // //   };

// // // // // // // // // // // //   // --- Memoized Filters ---
// // // // // // // // // // // //   const filteredIndents = useMemo(() => {
// // // // // // // // // // // //     return indents.filter(i =>
// // // // // // // // // // // //       (i.indentNo?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
// // // // // // // // // // // //       (i._id.includes(searchTerm))
// // // // // // // // // // // //     );
// // // // // // // // // // // //   }, [indents, searchTerm]);

// // // // // // // // // // // //   const filteredStock = useMemo(() => {
// // // // // // // // // // // //     return stockItems.filter(s =>
// // // // // // // // // // // //       s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
// // // // // // // // // // // //       s.stockGroupId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
// // // // // // // // // // // //     );
// // // // // // // // // // // //   }, [stockItems, searchTerm]);

// // // // // // // // // // // //   const activeIndent = useMemo(() =>
// // // // // // // // // // // //     indents.find(i => i._id === selectedId) || indents[0],
// // // // // // // // // // // //     [selectedId, indents]);

// // // // // // // // // // // //   const isConfirmed = editingRequest?.status === "confirmed";

// // // // // // // // // // // //   return (
// // // // // // // // // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // // // // // // // // //       {/* Header Area */}
// // // // // // // // // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// // // // // // // // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // // // // // // // // // //             <span style={{ color: '#6366f1' }}>Indents</span>
// // // // // // // // // // // //           </h1>
          
// // // // // // // // // // // //           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
// // // // // // // // // // // //             {[
// // // // // // // // // // // //               { id: 'history', label: 'Logs', icon: <ClipboardList size={14}/> },
// // // // // // // // // // // //               { id: 'requests', label: 'Requests', icon: <Inbox size={14}/> },
// // // // // // // // // // // //               { id: 'create', label: 'Create New', icon: <PlusCircle size={14}/> }
// // // // // // // // // // // //             ].map((btn) => (
// // // // // // // // // // // //               <button 
// // // // // // // // // // // //                 key={btn.id}
// // // // // // // // // // // //                 onClick={() => { setView(btn.id); setSearchTerm(""); setEditingRequest(null); }}
// // // // // // // // // // // //                 style={{ 
// // // // // // // // // // // //                   display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
// // // // // // // // // // // //                   background: view === btn.id ? '#fff' : 'transparent', 
// // // // // // // // // // // //                   color: view === btn.id ? '#6366f1' : '#64748b', 
// // // // // // // // // // // //                   boxShadow: view === btn.id ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' 
// // // // // // // // // // // //                 }}>
// // // // // // // // // // // //                 {btn.icon} {btn.label}
// // // // // // // // // // // //               </button>
// // // // // // // // // // // //             ))}
// // // // // // // // // // // //           </div>
// // // // // // // // // // // //         </div>

// // // // // // // // // // // //         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // // // // // // // //           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // // // // // // // // //           <input
// // // // // // // // // // // //             type="text"
// // // // // // // // // // // //             placeholder="Search..."
// // // // // // // // // // // //             value={searchTerm}
// // // // // // // // // // // //             onChange={(e) => setSearchTerm(e.target.value)}
// // // // // // // // // // // //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
// // // // // // // // // // // //           />
// // // // // // // // // // // //         </div>
// // // // // // // // // // // //       </div>

// // // // // // // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // // // // // // // //         {/* VIEW: HISTORY/LOGS */}
// // // // // // // // // // // //         {view === "history" && (
// // // // // // // // // // // //           <>
// // // // // // // // // // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // // // // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>RESULTS ({filteredIndents.length})</div>
// // // // // // // // // // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // // // // // // //                 {filteredIndents.map(r => (
// // // // // // // // // // // //                   <div key={r._id} onClick={() => setSelectedId(r._id)}
// // // // // // // // // // // //                     style={{ padding: '16px', borderRadius: '16px', cursor: 'pointer', background: selectedId === r._id ? '#fff' : 'transparent', border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent', boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', transition: 'all 0.2s' }}>
// // // // // // // // // // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // //                       <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b' }}>{r.indentNo || `REF-${r._id.slice(-4)}`}</div>
// // // // // // // // // // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
// // // // // // // // // // // //                     </div>
// // // // // // // // // // // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>₹{r.totalAmount?.toLocaleString()} • {r.status.toUpperCase()}</div>
// // // // // // // // // // // //                   </div>
// // // // // // // // // // // //                 ))}
// // // // // // // // // // // //               </div>
// // // // // // // // // // // //             </div>

// // // // // // // // // // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // // // // // // // //               {activeIndent ? (
// // // // // // // // // // // //                 <>
// // // // // // // // // // // //                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
// // // // // // // // // // // //                     <div>
// // // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>INDENT STATUS</div>
// // // // // // // // // // // //                       <div style={{ padding: '4px 12px', background: activeIndent.status === 'pending' ? '#fef3c7' : '#dcfce7', color: activeIndent.status === 'pending' ? '#d97706' : '#166534', borderRadius: '6px', fontSize: '12px', fontWeight: '800', display: 'inline-block' }}>
// // // // // // // // // // // //                         {activeIndent.status.toUpperCase()}
// // // // // // // // // // // //                       </div>
// // // // // // // // // // // //                     </div>
// // // // // // // // // // // //                     <div style={{ textAlign: 'right' }}>
// // // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
// // // // // // // // // // // //                       <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activeIndent.totalAmount?.toLocaleString()}</div>
// // // // // // // // // // // //                     </div>
// // // // // // // // // // // //                   </div>
// // // // // // // // // // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // // // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // // // //                       <thead>
// // // // // // // // // // // //                         <tr style={{ textAlign: 'left' }}>
// // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th>
// // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
// // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// // // // // // // // // // // //                         </tr>
// // // // // // // // // // // //                       </thead>
// // // // // // // // // // // //                       <tbody>
// // // // // // // // // // // //                         {activeIndent.items.map((item, idx) => (
// // // // // // // // // // // //                           <tr key={idx}>
// // // // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(item)}</div>
// // // // // // // // // // // //                               <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
// // // // // // // // // // // //                             </td>
// // // // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// // // // // // // // // // // //                                 {getGroupName(item)}
// // // // // // // // // // // //                               </span>
// // // // // // // // // // // //                             </td>
// // // // // // // // // // // //                             <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // //                                {item.orderedQty} <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: '400'}}>{getUnitSymbol(item)}</span>
// // // // // // // // // // // //                             </td>
// // // // // // // // // // // //                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1', borderBottom: '1px solid #f8fafc' }}>₹{(item.orderedQty * item.unitPrice).toLocaleString()}</td>
// // // // // // // // // // // //                           </tr>
// // // // // // // // // // // //                         ))}
// // // // // // // // // // // //                       </tbody>
// // // // // // // // // // // //                     </table>
// // // // // // // // // // // //                   </div>
// // // // // // // // // // // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // // // // // // // //                     <button onClick={handleDownloadExcel} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // // //                       <FileSpreadsheet size={16} /> Export Excel
// // // // // // // // // // // //                     </button>
// // // // // // // // // // // //                     {activeIndent.status.toLowerCase() === 'pending' && (
// // // // // // // // // // // //                       <button onClick={() => handleStatusUpdate(activeIndent._id, 'purchased')} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // // //                         <CheckCircle2 size={16} /> Mark Purchased
// // // // // // // // // // // //                       </button>
// // // // // // // // // // // //                     )}
// // // // // // // // // // // //                   </div>
// // // // // // // // // // // //                 </>
// // // // // // // // // // // //               ) : (
// // // // // // // // // // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Select an indent to view details</div>
// // // // // // // // // // // //               )}
// // // // // // // // // // // //             </div>
// // // // // // // // // // // //           </>
// // // // // // // // // // // //         )}

// // // // // // // // // // // //         {/* VIEW: INDENT REQUESTS (INCOMING) */}
// // // // // // // // // // // //         {view === "requests" && (
// // // // // // // // // // // //           <>
// // // // // // // // // // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // // // // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>
// // // // // // // // // // // //                 ALL REQUESTS ({indentRequests.length})
// // // // // // // // // // // //               </div>
// // // // // // // // // // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // // // // // // //                 {indentRequests.map(r => (
// // // // // // // // // // // //                   <div 
// // // // // // // // // // // //                     key={r._id} 
// // // // // // // // // // // //                     onClick={() => setEditingRequest(JSON.parse(JSON.stringify(r)))}
// // // // // // // // // // // //                     style={{ 
// // // // // // // // // // // //                       padding: '16px', 
// // // // // // // // // // // //                       borderRadius: '16px', 
// // // // // // // // // // // //                       cursor: 'pointer', 
// // // // // // // // // // // //                       background: editingRequest?._id === r._id ? '#fff' : 'transparent', 
// // // // // // // // // // // //                       border: editingRequest?._id === r._id ? '1px solid #6366f1' : '1px solid transparent', 
// // // // // // // // // // // //                       boxShadow: editingRequest?._id === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', 
// // // // // // // // // // // //                       transition: 'all 0.2s' 
// // // // // // // // // // // //                     }}
// // // // // // // // // // // //                   >
// // // // // // // // // // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // //                       <div style={{ fontWeight: '700', color: editingRequest?._id === r._id ? '#6366f1' : '#1e293b' }}>
// // // // // // // // // // // //                         {r.userId?.name || 'Unknown User'}
// // // // // // // // // // // //                       </div>
// // // // // // // // // // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
// // // // // // // // // // // //                         {new Date(r.createdAt).toLocaleDateString()}
// // // // // // // // // // // //                       </div>
// // // // // // // // // // // //                     </div>
// // // // // // // // // // // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
// // // // // // // // // // // //                       <span>{r.godownId?.name || "Main Godown"} • {r.items?.length} Items</span>
// // // // // // // // // // // //                       <span style={{
// // // // // // // // // // // //                         background: r.status === "confirmed" ? "#dcfce7" : "#fef3c7",
// // // // // // // // // // // //                         color: r.status === "confirmed" ? "#166534" : "#d97706",
// // // // // // // // // // // //                         padding: "2px 8px",
// // // // // // // // // // // //                         borderRadius: "6px",
// // // // // // // // // // // //                         fontSize: "10px",
// // // // // // // // // // // //                         fontWeight: "700"
// // // // // // // // // // // //                       }}>
// // // // // // // // // // // //                         {r.status?.toUpperCase()}
// // // // // // // // // // // //                       </span>
// // // // // // // // // // // //                     </div>
// // // // // // // // // // // //                   </div>
// // // // // // // // // // // //                 ))}
// // // // // // // // // // // //               </div>
// // // // // // // // // // // //             </div>

// // // // // // // // // // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // // // // // // // //               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
// // // // // // // // // // // //                 {editingRequest ? (
// // // // // // // // // // // //                   <>
// // // // // // // // // // // //                     <div>
// // // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>SOURCE GODOWN</div>
// // // // // // // // // // // //                       <div style={{ fontWeight: '800', fontSize: '18px', color: '#0f172a' }}>
// // // // // // // // // // // //                         {editingRequest.godownId?.name || "General"}
// // // // // // // // // // // //                       </div>
// // // // // // // // // // // //                     </div>
// // // // // // // // // // // //                     <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
// // // // // // // // // // // //                       <button
// // // // // // // // // // // //                         onClick={handleDownloadAllRequestsExcel}
// // // // // // // // // // // //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// // // // // // // // // // // //                       >
// // // // // // // // // // // //                         <FileSpreadsheet size={16} /> Export All Requests
// // // // // // // // // // // //                       </button>
// // // // // // // // // // // //                       <div style={{ textAlign: 'right' }}>
// // // // // // // // // // // //                         <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>ESTIMATED VALUATION</div>
// // // // // // // // // // // //                         <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>
// // // // // // // // // // // //                           ₹{editingRequest.items.reduce((sum, i) => sum + (Number(i.qtyBaseUnit || 0) * Number(i.price || 0)), 0).toLocaleString()}
// // // // // // // // // // // //                         </div>
// // // // // // // // // // // //                       </div>
// // // // // // // // // // // //                     </div>
// // // // // // // // // // // //                   </>
// // // // // // // // // // // //                 ) : (
// // // // // // // // // // // //                   <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
// // // // // // // // // // // //                     <input
// // // // // // // // // // // //   type="date"
// // // // // // // // // // // //   value={selectedDate}
// // // // // // // // // // // //   onChange={(e) => setSelectedDate(e.target.value)}
// // // // // // // // // // // //   style={{
// // // // // // // // // // // //     padding: "8px 12px",
// // // // // // // // // // // //     borderRadius: "10px",
// // // // // // // // // // // //     border: "1px solid #e2e8f0",
// // // // // // // // // // // //     fontSize: "13px"
// // // // // // // // // // // //   }}
// // // // // // // // // // // // />
// // // // // // // // // // // //                      <button
// // // // // // // // // // // //                         onClick={handleDownloadAllRequestsExcel}
// // // // // // // // // // // //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// // // // // // // // // // // //                       >
// // // // // // // // // // // //                         <FileSpreadsheet size={16} /> Export All Requests
// // // // // // // // // // // //                       </button>
// // // // // // // // // // // //                   </div>
// // // // // // // // // // // //                 )}
// // // // // // // // // // // //               </div>

// // // // // // // // // // // //               {editingRequest ? (
// // // // // // // // // // // //                 <>
// // // // // // // // // // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // // // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // // // //                       <thead>
// // // // // // // // // // // //                         <tr style={{ textAlign: 'left' }}>
// // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th>
// // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', width: '140px' }}>QTY</th>
// // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', width: '150px' }}>UNIT PRICE</th>
// // // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// // // // // // // // // // // //                         </tr>
// // // // // // // // // // // //                       </thead>
// // // // // // // // // // // //                       <tbody>
// // // // // // // // // // // //                         {editingRequest.items.map((it, idx) => (
// // // // // // // // // // // //                           <tr key={idx}>
// // // // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(it)}</div>
// // // // // // // // // // // //                             </td>
// // // // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// // // // // // // // // // // //                                 {getGroupName(it)}
// // // // // // // // // // // //                               </span>
// // // // // // // // // // // //                             </td>
// // // // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // //                                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // // //                                     <input
// // // // // // // // // // // //                                         type="number"
// // // // // // // // // // // //                                         disabled={isConfirmed}
// // // // // // // // // // // //                                         value={it.qtyBaseUnit}
// // // // // // // // // // // //                                         onChange={(e) => {
// // // // // // // // // // // //                                         const updated = [...editingRequest.items];
// // // // // // // // // // // //                                         updated[idx].qtyBaseUnit = e.target.value;
// // // // // // // // // // // //                                         setEditingRequest({ ...editingRequest, items: updated });
// // // // // // // // // // // //                                         }}
// // // // // // // // // // // //                                         style={{ width: '70px', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: '600', opacity: isConfirmed ? 0.7 : 1 }}
// // // // // // // // // // // //                                     />
// // // // // // // // // // // //                                     <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>
// // // // // // // // // // // //                                         {getUnitSymbol(it)}
// // // // // // // // // // // //                                     </span>
// // // // // // // // // // // //                                 </div>
// // // // // // // // // // // //                             </td>
// // // // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // //                               <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
// // // // // // // // // // // //                                 <span style={{ color: '#94a3b8', fontSize: '13px' }}>₹</span>
// // // // // // // // // // // //                                 <input
// // // // // // // // // // // //                                   type="number"
// // // // // // // // // // // //                                   disabled={isConfirmed}
// // // // // // // // // // // //                                   placeholder="0.00"
// // // // // // // // // // // //                                   value={it.price || ""}
// // // // // // // // // // // //                                   onChange={(e) => {
// // // // // // // // // // // //                                     const updated = [...editingRequest.items];
// // // // // // // // // // // //                                     updated[idx].price = e.target.value;
// // // // // // // // // // // //                                     setEditingRequest({ ...editingRequest, items: updated });
// // // // // // // // // // // //                                   }}
// // // // // // // // // // // //                                   style={{ width: '90px', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: '600', opacity: isConfirmed ? 0.7 : 1 }}
// // // // // // // // // // // //                                 />
// // // // // // // // // // // //                               </div>
// // // // // // // // // // // //                             </td>
// // // // // // // // // // // //                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // //                               ₹{(Number(it.qtyBaseUnit || 0) * Number(it.price || 0)).toLocaleString()}
// // // // // // // // // // // //                             </td>
// // // // // // // // // // // //                           </tr>
// // // // // // // // // // // //                         ))}
// // // // // // // // // // // //                       </tbody>
// // // // // // // // // // // //                     </table>
// // // // // // // // // // // //                   </div>

// // // // // // // // // // // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // // // // // // // //                     <button 
// // // // // // // // // // // //                       onClick={() => setEditingRequest(null)} 
// // // // // // // // // // // //                       style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
// // // // // // // // // // // //                     >
// // // // // // // // // // // //                       Cancel
// // // // // // // // // // // //                     </button>

// // // // // // // // // // // //                     {editingRequest.status !== "confirmed" && (
// // // // // // // // // // // //                       <button onClick={confirmRequest}
// // // // // // // // // // // //                         style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
// // // // // // // // // // // //                       >
// // // // // // // // // // // //                         Confirm Request
// // // // // // // // // // // //                       </button>
// // // // // // // // // // // //                     )}
// // // // // // // // // // // //                   </div>
// // // // // // // // // // // //                 </>
// // // // // // // // // // // //               ) : (
// // // // // // // // // // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// // // // // // // // // // // //                   Select a request from the sidebar to review and convert
// // // // // // // // // // // //                 </div>
// // // // // // // // // // // //               )}
// // // // // // // // // // // //             </div>
// // // // // // // // // // // //           </>
// // // // // // // // // // // //         )}

// // // // // // // // // // // //         {/* VIEW: CREATE NEW (MANUAL) */}
// // // // // // // // // // // //         {view === "create" && (
// // // // // // // // // // // //           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
// // // // // // // // // // // //             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // //               <div>
// // // // // // // // // // // //                 <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Create Requisition</h2>
// // // // // // // // // // // //                 <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
// // // // // // // // // // // //                     <span onClick={() => setTab("stock-items")} style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: tab === 'stock-items' ? '#6366f1' : '#64748b' }}>Stock Items</span>
// // // // // // // // // // // //                 </div>
// // // // // // // // // // // //               </div>
// // // // // // // // // // // //               <div style={{ textAlign: 'right' }}>
// // // // // // // // // // // //                 <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>ESTIMATED TOTAL</div>
// // // // // // // // // // // //                 <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{Object.values(selectedItems).reduce((sum, i) => i.checked ? sum + (Number(i.qty || 0) * Number(i.price || 0)) : sum, 0).toLocaleString()}</div>
// // // // // // // // // // // //               </div>
// // // // // // // // // // // //             </div>

// // // // // // // // // // // //             <div style={{ flex: 1, overflowY: 'auto' }}>
// // // // // // // // // // // //               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // // // //                 <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
// // // // // // // // // // // //                   <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // // // // // // // //                     <th style={{ padding: '20px 32px', width: '50px' }}>
// // // // // // // // // // // //                         <input type="checkbox" onChange={(e) => {
// // // // // // // // // // // //                            const isChecked = e.target.checked;
// // // // // // // // // // // //                            const newSelection = { ...selectedItems };
// // // // // // // // // // // //                            filteredStock.forEach(item => {
// // // // // // // // // // // //                              newSelection[item._id] = { ...(newSelection[item._id] || { qty: 0, price: 0 }), checked: isChecked };
// // // // // // // // // // // //                            });
// // // // // // // // // // // //                            setSelectedItems(newSelection);
// // // // // // // // // // // //                         }} style={{ width: '18px', height: '18px' }} />
// // // // // // // // // // // //                     </th>
// // // // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>NAME</th>
// // // // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>STOCK GROUP</th>
// // // // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '140px' }}>QTY</th>
// // // // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '100px' }}>PRICE</th>
// // // // // // // // // // // //                     <th style={{ padding: '20px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>ITEM TOTAL</th>
// // // // // // // // // // // //                   </tr>
// // // // // // // // // // // //                 </thead>
// // // // // // // // // // // //                 <tbody>
// // // // // // // // // // // //                   {filteredStock.map((row) => {
// // // // // // // // // // // //                     const state = selectedItems[row._id] || { checked: false, qty: 0, price: 0 };
// // // // // // // // // // // //                     const itemTotal = Number(state.qty || 0) * Number(state.price || 0);
// // // // // // // // // // // //                     return (
// // // // // // // // // // // //                       <tr key={row._id} style={{ borderBottom: '1px solid #f8fafc', background: state.checked ? '#fcfdff' : 'transparent' }}>
// // // // // // // // // // // //                         <td style={{ padding: '16px 32px' }}>
// // // // // // // // // // // //                           <input type="checkbox" checked={state.checked} onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, checked: e.target.checked } }))} style={{ width: '18px', height: '18px' }} />
// // // // // // // // // // // //                         </td>
// // // // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
// // // // // // // // // // // //                             <span style={{ fontWeight: '700', color: '#1e293b' }}>{row.name}</span>
// // // // // // // // // // // //                           </div>
// // // // // // // // // // // //                         </td>
// // // // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // // // //                           <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
// // // // // // // // // // // //                             {row.stockGroupId?.name || 'Unassigned'}
// // // // // // // // // // // //                           </span>
// // // // // // // // // // // //                         </td>
// // // // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // // //                             <input type="number" disabled={!state.checked} value={state.qty} placeholder="0" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, qty: e.target.value } }))} style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // // // // // // // // // //                             <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{row.unitId?.symbol}</span>
// // // // // // // // // // // //                           </div>
// // // // // // // // // // // //                         </td>
// // // // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // // // //                             <input type="number" disabled={!state.checked} value={state.price} placeholder="₹" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, price: e.target.value } }))} style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // // // // // // // // // //                         </td>
// // // // // // // // // // // //                         <td style={{ padding: '16px 32px', textAlign: 'right', fontWeight: '800', color: state.checked ? '#6366f1' : '#94a3b8' }}>
// // // // // // // // // // // //                           ₹{itemTotal.toLocaleString()}
// // // // // // // // // // // //                         </td>
// // // // // // // // // // // //                       </tr>
// // // // // // // // // // // //                     );
// // // // // // // // // // // //                   })}
// // // // // // // // // // // //                 </tbody>
// // // // // // // // // // // //               </table>
// // // // // // // // // // // //             </div>
// // // // // // // // // // // //             <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // // // // // // // // // // //               <button onClick={submitIndent} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
// // // // // // // // // // // //                 Submit Requisition
// // // // // // // // // // // //               </button>
// // // // // // // // // // // //             </div>
// // // // // // // // // // // //           </div>
// // // // // // // // // // // //         )}
// // // // // // // // // // // //       </div>
// // // // // // // // // // // //     </div>
// // // // // // // // // // // //   );
// // // // // // // // // // // // };




// // // // // // // // // // // // 23






// // // // // // // // // // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // // import { useToast } from "../toast.jsx";
// // // // // // // // // // // import * as XLSX from "xlsx";
// // // // // // // // // // // import { 
// // // // // // // // // // //   Search, FileSpreadsheet, CheckCircle2, Inbox, 
// // // // // // // // // // //   ClipboardList, PlusCircle, RefreshCw, X, Save 
// // // // // // // // // // // } from "lucide-react";

// // // // // // // // // // // export const IndentPage = () => {
// // // // // // // // // // //   const { showToast } = useToast();
// // // // // // // // // // //   const [selectedDate, setSelectedDate] = useState("");
// // // // // // // // // // //   // View State
// // // // // // // // // // //   const [view, setView] = useState("history"); 
// // // // // // // // // // //   const [tab, setTab] = useState("stock-items");
// // // // // // // // // // //   const [searchTerm, setSearchTerm] = useState("");
  
// // // // // // // // // // //   // Data State
// // // // // // // // // // //   const [stockItems, setStockItems] = useState([]);
// // // // // // // // // // //   const [indents, setIndents] = useState([]);
// // // // // // // // // // //   const [indentRequests, setIndentRequests] = useState([]);
// // // // // // // // // // //   const [selectedItems, setSelectedItems] = useState({});
// // // // // // // // // // //   const [selectedId, setSelectedId] = useState(null);

// // // // // // // // // // //   // --- Editing State for Requests ---
// // // // // // // // // // //   const [editingRequest, setEditingRequest] = useState(null);

// // // // // // // // // // //   // --- Data Loading ---
// // // // // // // // // // //   const load = useCallback(async () => {
// // // // // // // // // // //     try {
// // // // // // // // // // //       const [itemsRes, indentRes] = await Promise.all([
// // // // // // // // // // //         api.get("/inventory/stock-items"),
// // // // // // // // // // //         api.get("/indents")
// // // // // // // // // // //       ]);
// // // // // // // // // // //       setStockItems(itemsRes.data || []);
// // // // // // // // // // //       const sorted = (indentRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // // // // // //       setIndents(sorted);
// // // // // // // // // // //       if (sorted.length > 0 && !selectedId) setSelectedId(sorted[0]._id);
// // // // // // // // // // //     } catch (error) {
// // // // // // // // // // //       showToast("Failed to load data", "error");
// // // // // // // // // // //     }
// // // // // // // // // // //   }, [showToast, selectedId]);

// // // // // // // // // // //   const fetchIndentRequests = useCallback(async () => {
// // // // // // // // // // //     try {
// // // // // // // // // // //       const res = await api.get("/indent-requests");
// // // // // // // // // // //       setIndentRequests(res.data || []);
// // // // // // // // // // //     } catch (error) {
// // // // // // // // // // //       showToast("Failed to fetch requests", "error");
// // // // // // // // // // //     }
// // // // // // // // // // //   }, [showToast]);

// // // // // // // // // // //   useEffect(() => { 
// // // // // // // // // // //     load(); 
// // // // // // // // // // //     if (view === "requests") fetchIndentRequests();
// // // // // // // // // // //   }, [load, fetchIndentRequests, view]);

// // // // // // // // // // //   // --- Helper Functions ---
// // // // // // // // // // //   const getUnitSymbol = (item) => {
// // // // // // // // // // //     if (item.stockItemId?.unitId?.symbol) return item.stockItemId.unitId.symbol;
// // // // // // // // // // //     if (item.unitId?.symbol) return item.unitId.symbol;
// // // // // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // // // // //     return found?.unitId?.symbol || "";
// // // // // // // // // // //   };

// // // // // // // // // // //   const getItemName = (item) => {
// // // // // // // // // // //     if (item.stockItemId?.name) return item.stockItemId.name;
// // // // // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // // // // //     return found ? found.name : "Unknown Product";
// // // // // // // // // // //   };

// // // // // // // // // // //   const getGroupName = (item) => {
// // // // // // // // // // //     if (item.stockItemId?.stockGroupId?.name) return item.stockItemId.stockGroupId.name;
// // // // // // // // // // //     if (item.stockGroupId?.name) return item.stockGroupId.name;
// // // // // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // // // // //     return found?.stockGroupId?.name || "General";
// // // // // // // // // // //   };

// // // // // // // // // // //   const handleDownloadAllRequestsExcel = () => {
// // // // // // // // // // //   if (!indentRequests.length) {
// // // // // // // // // // //     return showToast("No requests available", "info");
// // // // // // // // // // //   }

// // // // // // // // // // //   let filteredRequests = indentRequests;

// // // // // // // // // // //   if (selectedDate) {
// // // // // // // // // // //     filteredRequests = indentRequests.filter(r => {
// // // // // // // // // // //       const reqDate = new Date(r.createdAt).toISOString().split("T")[0];
// // // // // // // // // // //       return reqDate === selectedDate;
// // // // // // // // // // //     });
// // // // // // // // // // //   }

// // // // // // // // // // //   if (!filteredRequests.length) {
// // // // // // // // // // //     return showToast("No requests found for selected date", "info");
// // // // // // // // // // //   }

// // // // // // // // // // //   const godownNames = [
// // // // // // // // // // //     ...new Set(filteredRequests.map(r => r.godownId?.name || "General"))
// // // // // // // // // // //   ];

// // // // // // // // // // //   const itemMap = {};

// // // // // // // // // // //   filteredRequests.forEach(req => {
// // // // // // // // // // //     const godownName = req.godownId?.name || "General";

// // // // // // // // // // //     req.items.forEach(item => {
// // // // // // // // // // //       const id = item.stockItemId?._id || item.stockItemId;

// // // // // // // // // // //       if (!itemMap[id]) {
// // // // // // // // // // //         itemMap[id] = {
// // // // // // // // // // //           stockItem: getItemName(item),
// // // // // // // // // // //           group: getGroupName(item),
// // // // // // // // // // //           unit: getUnitSymbol(item),
// // // // // // // // // // //           totalQty: 0,
// // // // // // // // // // //           godowns: {}
// // // // // // // // // // //         };
// // // // // // // // // // //       }

// // // // // // // // // // //       const qty = Number(item.qtyBaseUnit || 0);
// // // // // // // // // // //       itemMap[id].totalQty += qty;
// // // // // // // // // // //       itemMap[id].godowns[godownName] =
// // // // // // // // // // //         (itemMap[id].godowns[godownName] || 0) + qty;
// // // // // // // // // // //     });
// // // // // // // // // // //   });

// // // // // // // // // // //   const excelData = Object.values(itemMap).map((item, index) => {
// // // // // // // // // // //     const row = {
// // // // // // // // // // //       "S.No": index + 1,
// // // // // // // // // // //       "Stock Item": item.stockItem,
// // // // // // // // // // //       "Stock Group": item.group,
// // // // // // // // // // //       "Quantity": item.totalQty,
// // // // // // // // // // //       "Unit": item.unit
// // // // // // // // // // //     };

// // // // // // // // // // //     godownNames.forEach(g => {
// // // // // // // // // // //       row[g] = item.godowns[g] || 0;
// // // // // // // // // // //     });

// // // // // // // // // // //     return row;
// // // // // // // // // // //   });

// // // // // // // // // // //   const ws = XLSX.utils.json_to_sheet(excelData);
// // // // // // // // // // //   const wb = XLSX.utils.book_new();
// // // // // // // // // // //   XLSX.utils.book_append_sheet(wb, ws, "Filtered Requests");

// // // // // // // // // // //   const fileName = selectedDate
// // // // // // // // // // //     ? `Requests_${selectedDate}.xlsx`
// // // // // // // // // // //     : "All_Godown_Requests.xlsx";

// // // // // // // // // // //   XLSX.writeFile(wb, fileName);

// // // // // // // // // // //   showToast("Excel exported successfully", "success");
// // // // // // // // // // // };

// // // // // // // // // // //   const handleDownloadExcel = () => {
// // // // // // // // // // //     if (!activeIndent) return;
// // // // // // // // // // //     const data = activeIndent.items.map(item => ({
// // // // // // // // // // //       "Product": getItemName(item),
// // // // // // // // // // //       "Group": getGroupName(item),
// // // // // // // // // // //       "Quantity": item.orderedQty,
// // // // // // // // // // //       "Unit": getUnitSymbol(item),
// // // // // // // // // // //       "Price": item.unitPrice,
// // // // // // // // // // //       "Subtotal": item.orderedQty * item.unitPrice
// // // // // // // // // // //     }));
// // // // // // // // // // //     const ws = XLSX.utils.json_to_sheet(data);
// // // // // // // // // // //     const wb = XLSX.utils.book_new();
// // // // // // // // // // //     XLSX.utils.book_append_sheet(wb, ws, "Indent");
// // // // // // // // // // //     XLSX.writeFile(wb, `Indent_${activeIndent.indentNo || 'Export'}.xlsx`);
// // // // // // // // // // //     showToast("Excel exported successfully", "success");
// // // // // // // // // // //   };

// // // // // // // // // // //   const handleStatusUpdate = async (id, newStatus) => {
// // // // // // // // // // //     try {
// // // // // // // // // // //       if (newStatus === 'purchased') {
// // // // // // // // // // //         await api.post(`/indents/${id}/mark-purchased`);
// // // // // // // // // // //       } else {
// // // // // // // // // // //         await api.patch(`/indents/${id}`, { status: newStatus });
// // // // // // // // // // //       }
// // // // // // // // // // //       showToast(`Indent marked as ${newStatus}`, "success");
// // // // // // // // // // //       load();
// // // // // // // // // // //     } catch (error) {
// // // // // // // // // // //       showToast("Failed to update status", "error");
// // // // // // // // // // //     }
// // // // // // // // // // //   };

// // // // // // // // // // //   const confirmRequest = async () => {
// // // // // // // // // // //     try {
// // // // // // // // // // //       await api.patch(`/indent-requests/${editingRequest._id}/confirm`);
// // // // // // // // // // //       showToast("Request confirmed!", "success");
// // // // // // // // // // //       setEditingRequest(null);
// // // // // // // // // // //       fetchIndentRequests();
// // // // // // // // // // //     } catch (err) {
// // // // // // // // // // //       showToast("Confirmation failed", "error");
// // // // // // // // // // //     }
// // // // // // // // // // //   };

// // // // // // // // // // //   const submitIndent = async () => {
// // // // // // // // // // //     const itemsToSubmit = Object.keys(selectedItems)
// // // // // // // // // // //       .filter(id => selectedItems[id].checked && Number(selectedItems[id].qty) > 0)
// // // // // // // // // // //       .map(id => ({
// // // // // // // // // // //         stockItemId: id,
// // // // // // // // // // //         orderedQty: Number(selectedItems[id].qty),
// // // // // // // // // // //         unitPrice: Number(selectedItems[id].price || 0),
// // // // // // // // // // //         amount: Number(selectedItems[id].qty) * Number(selectedItems[id].price || 0)
// // // // // // // // // // //       }));

// // // // // // // // // // //     if (itemsToSubmit.length === 0) return showToast("Select items with quantity", "info");

// // // // // // // // // // //     try {
// // // // // // // // // // //       await api.post("/indents", { items: itemsToSubmit });
// // // // // // // // // // //       showToast("Indent submitted", "success");
// // // // // // // // // // //       setSelectedItems({});
// // // // // // // // // // //       setView("history");
// // // // // // // // // // //       load();
// // // // // // // // // // //     } catch (error) {
// // // // // // // // // // //       showToast("Submission failed", "error");
// // // // // // // // // // //     }
// // // // // // // // // // //   };

// // // // // // // // // // //   // --- Memoized Filters ---
// // // // // // // // // // //   const filteredIndents = useMemo(() => {
// // // // // // // // // // //     return indents.filter(i =>
// // // // // // // // // // //       (i.indentNo?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
// // // // // // // // // // //       (i._id.includes(searchTerm))
// // // // // // // // // // //     );
// // // // // // // // // // //   }, [indents, searchTerm]);

// // // // // // // // // // //   const filteredStock = useMemo(() => {
// // // // // // // // // // //     return stockItems.filter(s =>
// // // // // // // // // // //       s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
// // // // // // // // // // //       s.stockGroupId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
// // // // // // // // // // //     );
// // // // // // // // // // //   }, [stockItems, searchTerm]);

// // // // // // // // // // //   const activeIndent = useMemo(() =>
// // // // // // // // // // //     indents.find(i => i._id === selectedId) || indents[0],
// // // // // // // // // // //     [selectedId, indents]);

// // // // // // // // // // //   const isConfirmed = editingRequest?.status === "confirmed";

// // // // // // // // // // //   return (
// // // // // // // // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // // // // // // // //       {/* Header Area */}
// // // // // // // // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// // // // // // // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // // // // // // // // //             <span style={{ color: '#6366f1' }}>Indents</span>
// // // // // // // // // // //           </h1>
          
// // // // // // // // // // //           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
// // // // // // // // // // //             {[
// // // // // // // // // // //               { id: 'history', label: 'Logs', icon: <ClipboardList size={14}/> },
// // // // // // // // // // //               { id: 'requests', label: 'Requests', icon: <Inbox size={14}/> },
// // // // // // // // // // //               { id: 'create', label: 'Create New', icon: <PlusCircle size={14}/> }
// // // // // // // // // // //             ].map((btn) => (
// // // // // // // // // // //               <button 
// // // // // // // // // // //                 key={btn.id}
// // // // // // // // // // //                 onClick={() => { setView(btn.id); setSearchTerm(""); setEditingRequest(null); }}
// // // // // // // // // // //                 style={{ 
// // // // // // // // // // //                   display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
// // // // // // // // // // //                   background: view === btn.id ? '#fff' : 'transparent', 
// // // // // // // // // // //                   color: view === btn.id ? '#6366f1' : '#64748b', 
// // // // // // // // // // //                   boxShadow: view === btn.id ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' 
// // // // // // // // // // //                 }}>
// // // // // // // // // // //                 {btn.icon} {btn.label}
// // // // // // // // // // //               </button>
// // // // // // // // // // //             ))}
// // // // // // // // // // //           </div>
// // // // // // // // // // //         </div>

// // // // // // // // // // //         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // // // // // // //           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // // // // // // // //           <input
// // // // // // // // // // //             type="text"
// // // // // // // // // // //             placeholder="Search..."
// // // // // // // // // // //             value={searchTerm}
// // // // // // // // // // //             onChange={(e) => setSearchTerm(e.target.value)}
// // // // // // // // // // //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
// // // // // // // // // // //           />
// // // // // // // // // // //         </div>
// // // // // // // // // // //       </div>

// // // // // // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // // // // // // //         {/* VIEW: HISTORY/LOGS */}
// // // // // // // // // // //         {view === "history" && (
// // // // // // // // // // //           <>
// // // // // // // // // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // // // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>RESULTS ({filteredIndents.length})</div>
// // // // // // // // // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // // // // // //                 {filteredIndents.map(r => (
// // // // // // // // // // //                   <div key={r._id} onClick={() => setSelectedId(r._id)}
// // // // // // // // // // //                     style={{ padding: '16px', borderRadius: '16px', cursor: 'pointer', background: selectedId === r._id ? '#fff' : 'transparent', border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent', boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', transition: 'all 0.2s' }}>
// // // // // // // // // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // //                       <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b' }}>{r.indentNo || `REF-${r._id.slice(-4)}`}</div>
// // // // // // // // // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
// // // // // // // // // // //                     </div>
// // // // // // // // // // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>₹{r.totalAmount?.toLocaleString()} • {r.status.toUpperCase()}</div>
// // // // // // // // // // //                   </div>
// // // // // // // // // // //                 ))}
// // // // // // // // // // //               </div>
// // // // // // // // // // //             </div>

// // // // // // // // // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // // // // // // //               {activeIndent ? (
// // // // // // // // // // //                 <>
// // // // // // // // // // //                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
// // // // // // // // // // //                     <div>
// // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>INDENT STATUS</div>
// // // // // // // // // // //                       <div style={{ padding: '4px 12px', background: activeIndent.status === 'pending' ? '#fef3c7' : '#dcfce7', color: activeIndent.status === 'pending' ? '#d97706' : '#166534', borderRadius: '6px', fontSize: '12px', fontWeight: '800', display: 'inline-block' }}>
// // // // // // // // // // //                         {activeIndent.status.toUpperCase()}
// // // // // // // // // // //                       </div>
// // // // // // // // // // //                     </div>
// // // // // // // // // // //                     <div style={{ textAlign: 'right' }}>
// // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
// // // // // // // // // // //                       <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activeIndent.totalAmount?.toLocaleString()}</div>
// // // // // // // // // // //                     </div>
// // // // // // // // // // //                   </div>
// // // // // // // // // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // // //                       <thead>
// // // // // // // // // // //                         <tr style={{ textAlign: 'left' }}>
// // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th>
// // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
// // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// // // // // // // // // // //                         </tr>
// // // // // // // // // // //                       </thead>
// // // // // // // // // // //                       <tbody>
// // // // // // // // // // //                         {activeIndent.items.map((item, idx) => (
// // // // // // // // // // //                           <tr key={idx}>
// // // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(item)}</div>
// // // // // // // // // // //                               <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
// // // // // // // // // // //                             </td>
// // // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// // // // // // // // // // //                                 {getGroupName(item)}
// // // // // // // // // // //                               </span>
// // // // // // // // // // //                             </td>
// // // // // // // // // // //                             <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // //                                {item.orderedQty} <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: '400'}}>{getUnitSymbol(item)}</span>
// // // // // // // // // // //                             </td>
// // // // // // // // // // //                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1', borderBottom: '1px solid #f8fafc' }}>₹{(item.orderedQty * item.unitPrice).toLocaleString()}</td>
// // // // // // // // // // //                           </tr>
// // // // // // // // // // //                         ))}
// // // // // // // // // // //                       </tbody>
// // // // // // // // // // //                     </table>
// // // // // // // // // // //                   </div>
// // // // // // // // // // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // // // // // // //                     <button onClick={handleDownloadExcel} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // //                       <FileSpreadsheet size={16} /> Export Excel
// // // // // // // // // // //                     </button>
// // // // // // // // // // //                     {activeIndent.status.toLowerCase() === 'pending' && (
// // // // // // // // // // //                       <button onClick={() => handleStatusUpdate(activeIndent._id, 'purchased')} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // //                         <CheckCircle2 size={16} /> Mark Purchased
// // // // // // // // // // //                       </button>
// // // // // // // // // // //                     )}
// // // // // // // // // // //                   </div>
// // // // // // // // // // //                 </>
// // // // // // // // // // //               ) : (
// // // // // // // // // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Select an indent to view details</div>
// // // // // // // // // // //               )}
// // // // // // // // // // //             </div>
// // // // // // // // // // //           </>
// // // // // // // // // // //         )}

// // // // // // // // // // //         {/* VIEW: INDENT REQUESTS (INCOMING) */}
// // // // // // // // // // //         {view === "requests" && (
// // // // // // // // // // //           <>
// // // // // // // // // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // // // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>
// // // // // // // // // // //                 ALL REQUESTS ({indentRequests.length})
// // // // // // // // // // //               </div>
// // // // // // // // // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // // // // // //                 {indentRequests.map(r => (
// // // // // // // // // // //                   <div 
// // // // // // // // // // //                     key={r._id} 
// // // // // // // // // // //                     onClick={() => setEditingRequest(JSON.parse(JSON.stringify(r)))}
// // // // // // // // // // //                     style={{ 
// // // // // // // // // // //                       padding: '16px', 
// // // // // // // // // // //                       borderRadius: '16px', 
// // // // // // // // // // //                       cursor: 'pointer', 
// // // // // // // // // // //                       background: editingRequest?._id === r._id ? '#fff' : 'transparent', 
// // // // // // // // // // //                       border: editingRequest?._id === r._id ? '1px solid #6366f1' : '1px solid transparent', 
// // // // // // // // // // //                       boxShadow: editingRequest?._id === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', 
// // // // // // // // // // //                       transition: 'all 0.2s' 
// // // // // // // // // // //                     }}
// // // // // // // // // // //                   >
// // // // // // // // // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // //                       <div style={{ fontWeight: '700', color: editingRequest?._id === r._id ? '#6366f1' : '#1e293b' }}>
// // // // // // // // // // //                         {r.userId?.name || 'Unknown User'}
// // // // // // // // // // //                       </div>
// // // // // // // // // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
// // // // // // // // // // //                         {new Date(r.createdAt).toLocaleDateString()}
// // // // // // // // // // //                       </div>
// // // // // // // // // // //                     </div>
// // // // // // // // // // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
// // // // // // // // // // //                       <span>{r.godownId?.name || "Main Godown"} • {r.items?.length} Items</span>
// // // // // // // // // // //                       <span style={{
// // // // // // // // // // //                         background: r.status === "confirmed" ? "#dcfce7" : "#fef3c7",
// // // // // // // // // // //                         color: r.status === "confirmed" ? "#166534" : "#d97706",
// // // // // // // // // // //                         padding: "2px 8px",
// // // // // // // // // // //                         borderRadius: "6px",
// // // // // // // // // // //                         fontSize: "10px",
// // // // // // // // // // //                         fontWeight: "700"
// // // // // // // // // // //                       }}>
// // // // // // // // // // //                         {r.status?.toUpperCase()}
// // // // // // // // // // //                       </span>
// // // // // // // // // // //                     </div>
// // // // // // // // // // //                   </div>
// // // // // // // // // // //                 ))}
// // // // // // // // // // //               </div>
// // // // // // // // // // //             </div>

// // // // // // // // // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // // // // // // //               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
// // // // // // // // // // //                 {editingRequest ? (
// // // // // // // // // // //                   <>
// // // // // // // // // // //                     <div>
// // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>SOURCE GODOWN</div>
// // // // // // // // // // //                       <div style={{ fontWeight: '800', fontSize: '18px', color: '#0f172a' }}>
// // // // // // // // // // //                         {editingRequest.godownId?.name || "General"}
// // // // // // // // // // //                       </div>
// // // // // // // // // // //                     </div>
// // // // // // // // // // //                     <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
// // // // // // // // // // //                       <button
// // // // // // // // // // //                         onClick={handleDownloadAllRequestsExcel}
// // // // // // // // // // //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// // // // // // // // // // //                       >
// // // // // // // // // // //                         <FileSpreadsheet size={16} /> Export All Requests
// // // // // // // // // // //                       </button>
// // // // // // // // // // //                       <div style={{ textAlign: 'right' }}>
// // // // // // // // // // //                         <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>ESTIMATED VALUATION</div>
// // // // // // // // // // //                         <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>
// // // // // // // // // // //                           ₹{editingRequest.items.reduce((sum, i) => sum + (Number(i.qtyBaseUnit || 0) * Number(i.price || 0)), 0).toLocaleString()}
// // // // // // // // // // //                         </div>
// // // // // // // // // // //                       </div>
// // // // // // // // // // //                     </div>
// // // // // // // // // // //                   </>
// // // // // // // // // // //                 ) : (
// // // // // // // // // // //                   <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
// // // // // // // // // // //                     <input
// // // // // // // // // // //   type="date"
// // // // // // // // // // //   value={selectedDate}
// // // // // // // // // // //   onChange={(e) => setSelectedDate(e.target.value)}
// // // // // // // // // // //   style={{
// // // // // // // // // // //     padding: "8px 12px",
// // // // // // // // // // //     borderRadius: "10px",
// // // // // // // // // // //     border: "1px solid #e2e8f0",
// // // // // // // // // // //     fontSize: "13px"
// // // // // // // // // // //   }}
// // // // // // // // // // // />
// // // // // // // // // // //                      <button
// // // // // // // // // // //                         onClick={handleDownloadAllRequestsExcel}
// // // // // // // // // // //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// // // // // // // // // // //                       >
// // // // // // // // // // //                         <FileSpreadsheet size={16} /> Export All Requests
// // // // // // // // // // //                       </button>
// // // // // // // // // // //                   </div>
// // // // // // // // // // //                 )}
// // // // // // // // // // //               </div>

// // // // // // // // // // //               {editingRequest ? (
// // // // // // // // // // //                 <>
// // // // // // // // // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // // //                       <thead>
// // // // // // // // // // //                         <tr style={{ textAlign: 'left' }}>
// // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th>
// // // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// // // // // // // // // // //                           {/* <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', width: '140px' }}>QTY</th> */}
// // // // // // // // // // //                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
// // // // // // // // // // //   REQUESTED
// // // // // // // // // // // </th>

// // // // // // // // // // // <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
// // // // // // // // // // //   RECEIVED
// // // // // // // // // // // </th>
// // // // // // // // // // //                         </tr>
// // // // // // // // // // //                       </thead>
// // // // // // // // // // //                       <tbody>
// // // // // // // // // // //                         {editingRequest.items.map((it, idx) => (
// // // // // // // // // // //                           <tr key={idx}>
// // // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(it)}</div>
// // // // // // // // // // //                             </td>
// // // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// // // // // // // // // // //                                 {getGroupName(it)}
// // // // // // // // // // //                               </span>
// // // // // // // // // // //                             </td>
// // // // // // // // // // //                            {/* REQUESTED COLUMN */}
// // // // // // // // // // // <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700' }}>
// // // // // // // // // // //   {it.qtyBaseUnit}{" "}
// // // // // // // // // // //   <span style={{ fontSize: '12px', color: '#64748b' }}>
// // // // // // // // // // //     {getUnitSymbol(it)}
// // // // // // // // // // //   </span>
// // // // // // // // // // // </td>

// // // // // // // // // // // {/* RECEIVED COLUMN */}
// // // // // // // // // // // <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700', color: '#16a34a' }}>
// // // // // // // // // // //   {it.receivedQty || 0}{" "}
// // // // // // // // // // //   <span style={{ fontSize: '12px', color: '#64748b' }}>
// // // // // // // // // // //     {getUnitSymbol(it)}
// // // // // // // // // // //   </span>

// // // // // // // // // // //   {(it.receivedQty || 0) >= (it.qtyBaseUnit || 0) && (
// // // // // // // // // // //     <div style={{ fontSize: "10px", color: "#16a34a" }}>
// // // // // // // // // // //       ✔ Fully Received
// // // // // // // // // // //     </div>
// // // // // // // // // // //   )}
// // // // // // // // // // // </td>{(it.receivedQty || 0) >= (it.qtyBaseUnit || 0) && (
// // // // // // // // // // //   <span style={{ fontSize: "10px", color: "#16a34a" }}>
// // // // // // // // // // //     ✔ Fully Received
// // // // // // // // // // //   </span>
// // // // // // // // // // // )}
                            
// // // // // // // // // // //                           </tr>
// // // // // // // // // // //                         ))}
// // // // // // // // // // //                       </tbody>
// // // // // // // // // // //                     </table>
// // // // // // // // // // //                   </div>

// // // // // // // // // // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // // // // // // //                     <button 
// // // // // // // // // // //                       onClick={() => setEditingRequest(null)} 
// // // // // // // // // // //                       style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
// // // // // // // // // // //                     >
// // // // // // // // // // //                       Cancel
// // // // // // // // // // //                     </button>

// // // // // // // // // // //                     {!["confirmed", "received", "partially_received"].includes(editingRequest.status) && (
// // // // // // // // // // //   <button onClick={confirmRequest}
// // // // // // // // // // //                         style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
// // // // // // // // // // //                       >
// // // // // // // // // // //                         Confirm Request
// // // // // // // // // // //                       </button>
// // // // // // // // // // //                     )}
// // // // // // // // // // //                   </div>
// // // // // // // // // // //                 </>
// // // // // // // // // // //               ) : (
// // // // // // // // // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// // // // // // // // // // //                   Select a request from the sidebar to review and convert
// // // // // // // // // // //                 </div>
// // // // // // // // // // //               )}
// // // // // // // // // // //             </div>
// // // // // // // // // // //           </>
// // // // // // // // // // //         )}

// // // // // // // // // // //         {/* VIEW: CREATE NEW (MANUAL) */}
// // // // // // // // // // //         {view === "create" && (
// // // // // // // // // // //           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
// // // // // // // // // // //             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // //               <div>
// // // // // // // // // // //                 <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Create Requisition</h2>
// // // // // // // // // // //                 <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
// // // // // // // // // // //                     <span onClick={() => setTab("stock-items")} style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: tab === 'stock-items' ? '#6366f1' : '#64748b' }}>Stock Items</span>
// // // // // // // // // // //                 </div>
// // // // // // // // // // //               </div>
// // // // // // // // // // //               <div style={{ textAlign: 'right' }}>
// // // // // // // // // // //                 <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>ESTIMATED TOTAL</div>
// // // // // // // // // // //                 <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{Object.values(selectedItems).reduce((sum, i) => i.checked ? sum + (Number(i.qty || 0) * Number(i.price || 0)) : sum, 0).toLocaleString()}</div>
// // // // // // // // // // //               </div>
// // // // // // // // // // //             </div>

// // // // // // // // // // //             <div style={{ flex: 1, overflowY: 'auto' }}>
// // // // // // // // // // //               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // // //                 <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
// // // // // // // // // // //                   <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // // // // // // //                     <th style={{ padding: '20px 32px', width: '50px' }}>
// // // // // // // // // // //                         <input type="checkbox" onChange={(e) => {
// // // // // // // // // // //                            const isChecked = e.target.checked;
// // // // // // // // // // //                            const newSelection = { ...selectedItems };
// // // // // // // // // // //                            filteredStock.forEach(item => {
// // // // // // // // // // //                              newSelection[item._id] = { ...(newSelection[item._id] || { qty: 0, price: 0 }), checked: isChecked };
// // // // // // // // // // //                            });
// // // // // // // // // // //                            setSelectedItems(newSelection);
// // // // // // // // // // //                         }} style={{ width: '18px', height: '18px' }} />
// // // // // // // // // // //                     </th>
// // // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>NAME</th>
// // // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>STOCK GROUP</th>
// // // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '140px' }}>QTY</th>
// // // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '100px' }}>PRICE</th>
// // // // // // // // // // //                     <th style={{ padding: '20px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>ITEM TOTAL</th>
// // // // // // // // // // //                   </tr>
// // // // // // // // // // //                 </thead>
// // // // // // // // // // //                 <tbody>
// // // // // // // // // // //                   {filteredStock.map((row) => {
// // // // // // // // // // //                     const state = selectedItems[row._id] || { checked: false, qty: 0, price: 0 };
// // // // // // // // // // //                     const itemTotal = Number(state.qty || 0) * Number(state.price || 0);
// // // // // // // // // // //                     return (
// // // // // // // // // // //                       <tr key={row._id} style={{ borderBottom: '1px solid #f8fafc', background: state.checked ? '#fcfdff' : 'transparent' }}>
// // // // // // // // // // //                         <td style={{ padding: '16px 32px' }}>
// // // // // // // // // // //                           <input type="checkbox" checked={state.checked} onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, checked: e.target.checked } }))} style={{ width: '18px', height: '18px' }} />
// // // // // // // // // // //                         </td>
// // // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
// // // // // // // // // // //                             <span style={{ fontWeight: '700', color: '#1e293b' }}>{row.name}</span>
// // // // // // // // // // //                           </div>
// // // // // // // // // // //                         </td>
// // // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // // //                           <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
// // // // // // // // // // //                             {row.stockGroupId?.name || 'Unassigned'}
// // // // // // // // // // //                           </span>
// // // // // // // // // // //                         </td>
// // // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // //                             <input type="number" disabled={!state.checked} value={state.qty} placeholder="0" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, qty: e.target.value } }))} style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // // // // // // // // //                             <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{row.unitId?.symbol}</span>
// // // // // // // // // // //                           </div>
// // // // // // // // // // //                         </td>
// // // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // // //                             <input type="number" disabled={!state.checked} value={state.price} placeholder="₹" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, price: e.target.value } }))} style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // // // // // // // // //                         </td>
// // // // // // // // // // //                         <td style={{ padding: '16px 32px', textAlign: 'right', fontWeight: '800', color: state.checked ? '#6366f1' : '#94a3b8' }}>
// // // // // // // // // // //                           ₹{itemTotal.toLocaleString()}
// // // // // // // // // // //                         </td>
// // // // // // // // // // //                       </tr>
// // // // // // // // // // //                     );
// // // // // // // // // // //                   })}
// // // // // // // // // // //                 </tbody>
// // // // // // // // // // //               </table>
// // // // // // // // // // //             </div>
// // // // // // // // // // //             <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // // // // // // // // // //               <button onClick={submitIndent} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
// // // // // // // // // // //                 Submit Requisition
// // // // // // // // // // //               </button>
// // // // // // // // // // //             </div>
// // // // // // // // // // //           </div>
// // // // // // // // // // //         )}
// // // // // // // // // // //       </div>
// // // // // // // // // // //     </div>
// // // // // // // // // // //   );
// // // // // // // // // // // };






// // // // // // // // // // // 28-04-2026








// // // // // // // // // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // import { useToast } from "../toast.jsx";
// // // // // // // // // // import * as XLSX from "xlsx";
// // // // // // // // // // import { 
// // // // // // // // // //   Search, FileSpreadsheet, CheckCircle2, Inbox, 
// // // // // // // // // //   ClipboardList, PlusCircle, RefreshCw, X, Save 
// // // // // // // // // // } from "lucide-react";

// // // // // // // // // // export const IndentPage = () => {
// // // // // // // // // //   const { showToast } = useToast();
// // // // // // // // // //   const [selectedDate, setSelectedDate] = useState("");
// // // // // // // // // //   // View State
// // // // // // // // // //   const [view, setView] = useState("history"); 
// // // // // // // // // //   const [tab, setTab] = useState("stock-items");
// // // // // // // // // //   const [searchTerm, setSearchTerm] = useState("");
  
// // // // // // // // // //   // Data State
// // // // // // // // // //   const [stockItems, setStockItems] = useState([]);
// // // // // // // // // //   const [indents, setIndents] = useState([]);
// // // // // // // // // //   const [indentRequests, setIndentRequests] = useState([]);
// // // // // // // // // //   const [selectedItems, setSelectedItems] = useState({});
// // // // // // // // // //   const [selectedId, setSelectedId] = useState(null);

// // // // // // // // // //   // --- Editing State for Requests ---
// // // // // // // // // //   const [editingRequest, setEditingRequest] = useState(null);
// // // // // // // // // //   const [approvedItems, setApprovedItems] = useState({});
// // // // // // // // // //   const [selectAll, setSelectAll] = useState(false);

// // // // // // // // // //   // --- Data Loading ---
// // // // // // // // // //   const load = useCallback(async () => {
// // // // // // // // // //     try {
// // // // // // // // // //       const [itemsRes, indentRes] = await Promise.all([
// // // // // // // // // //         api.get("/inventory/stock-items"),
// // // // // // // // // //         api.get("/indents")
// // // // // // // // // //       ]);
// // // // // // // // // //       setStockItems(itemsRes.data || []);
// // // // // // // // // //       const sorted = (indentRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // // // // //       setIndents(sorted);
// // // // // // // // // //       if (sorted.length > 0 && !selectedId) setSelectedId(sorted[0]._id);
// // // // // // // // // //     } catch (error) {
// // // // // // // // // //       showToast("Failed to load data", "error");
// // // // // // // // // //     }
// // // // // // // // // //   }, [showToast, selectedId]);

// // // // // // // // // //   const fetchIndentRequests = useCallback(async () => {
// // // // // // // // // //     try {
// // // // // // // // // //       const res = await api.get("/indent-requests");
// // // // // // // // // //       setIndentRequests(res.data || []);
// // // // // // // // // //     } catch (error) {
// // // // // // // // // //       showToast("Failed to fetch requests", "error");
// // // // // // // // // //     }
// // // // // // // // // //   }, [showToast]);

// // // // // // // // // //   useEffect(() => { 
// // // // // // // // // //     load(); 
// // // // // // // // // //     if (view === "requests") fetchIndentRequests();
// // // // // // // // // //   }, [load, fetchIndentRequests, view]);

// // // // // // // // // //   // --- Helper Functions ---
// // // // // // // // // //   const getUnitSymbol = (item) => {
// // // // // // // // // //     if (item.stockItemId?.unitId?.symbol) return item.stockItemId.unitId.symbol;
// // // // // // // // // //     if (item.unitId?.symbol) return item.unitId.symbol;
// // // // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // // // //     return found?.unitId?.symbol || "";
// // // // // // // // // //   };

// // // // // // // // // //   const getItemName = (item) => {
// // // // // // // // // //     if (item.stockItemId?.name) return item.stockItemId.name;
// // // // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // // // //     return found ? found.name : "Unknown Product";
// // // // // // // // // //   };

// // // // // // // // // //   const getGroupName = (item) => {
// // // // // // // // // //     if (item.stockItemId?.stockGroupId?.name) return item.stockItemId.stockGroupId.name;
// // // // // // // // // //     if (item.stockGroupId?.name) return item.stockGroupId.name;
// // // // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // // // //     return found?.stockGroupId?.name || "General";
// // // // // // // // // //   };

// // // // // // // // // //   const handleDownloadAllRequestsExcel = () => {
// // // // // // // // // //   if (!indentRequests.length) {
// // // // // // // // // //     return showToast("No requests available", "info");
// // // // // // // // // //   }

// // // // // // // // // //   let filteredRequests = indentRequests;

// // // // // // // // // //   if (selectedDate) {
// // // // // // // // // //     filteredRequests = indentRequests.filter(r => {
// // // // // // // // // //       const reqDate = new Date(r.createdAt).toISOString().split("T")[0];
// // // // // // // // // //       return reqDate === selectedDate;
// // // // // // // // // //     });
// // // // // // // // // //   }

// // // // // // // // // //   if (!filteredRequests.length) {
// // // // // // // // // //     return showToast("No requests found for selected date", "info");
// // // // // // // // // //   }

// // // // // // // // // //   const godownNames = [
// // // // // // // // // //     ...new Set(filteredRequests.map(r => r.godownId?.name || "General"))
// // // // // // // // // //   ];

// // // // // // // // // //   const itemMap = {};

// // // // // // // // // //   filteredRequests.forEach(req => {
// // // // // // // // // //     const godownName = req.godownId?.name || "General";

// // // // // // // // // //     req.items.forEach(item => {
// // // // // // // // // //       const id = item.stockItemId?._id || item.stockItemId;

// // // // // // // // // //       if (!itemMap[id]) {
// // // // // // // // // //         itemMap[id] = {
// // // // // // // // // //           stockItem: getItemName(item),
// // // // // // // // // //           group: getGroupName(item),
// // // // // // // // // //           unit: getUnitSymbol(item),
// // // // // // // // // //           totalQty: 0,
// // // // // // // // // //           godowns: {}
// // // // // // // // // //         };
// // // // // // // // // //       }

// // // // // // // // // //       const qty = Number(item.qtyBaseUnit || 0);
// // // // // // // // // //       itemMap[id].totalQty += qty;
// // // // // // // // // //       itemMap[id].godowns[godownName] =
// // // // // // // // // //         (itemMap[id].godowns[godownName] || 0) + qty;
// // // // // // // // // //     });
// // // // // // // // // //   });

// // // // // // // // // //   const excelData = Object.values(itemMap).map((item, index) => {
// // // // // // // // // //     const row = {
// // // // // // // // // //       "S.No": index + 1,
// // // // // // // // // //       "Stock Item": item.stockItem,
// // // // // // // // // //       "Stock Group": item.group,
// // // // // // // // // //       "Quantity": item.totalQty,
// // // // // // // // // //       "Unit": item.unit
// // // // // // // // // //     };

// // // // // // // // // //     godownNames.forEach(g => {
// // // // // // // // // //       row[g] = item.godowns[g] || 0;
// // // // // // // // // //     });

// // // // // // // // // //     return row;
// // // // // // // // // //   });

// // // // // // // // // //   const ws = XLSX.utils.json_to_sheet(excelData);
// // // // // // // // // //   const wb = XLSX.utils.book_new();
// // // // // // // // // //   XLSX.utils.book_append_sheet(wb, ws, "Filtered Requests");

// // // // // // // // // //   const fileName = selectedDate
// // // // // // // // // //     ? `Requests_${selectedDate}.xlsx`
// // // // // // // // // //     : "All_Godown_Requests.xlsx";

// // // // // // // // // //   XLSX.writeFile(wb, fileName);

// // // // // // // // // //   showToast("Excel exported successfully", "success");
// // // // // // // // // // };

// // // // // // // // // //   const handleDownloadExcel = () => {
// // // // // // // // // //     if (!activeIndent) return;
// // // // // // // // // //     const data = activeIndent.items.map(item => ({
// // // // // // // // // //       "Product": getItemName(item),
// // // // // // // // // //       "Group": getGroupName(item),
// // // // // // // // // //       "Quantity": item.orderedQty,
// // // // // // // // // //       "Unit": getUnitSymbol(item),
// // // // // // // // // //       "Price": item.unitPrice,
// // // // // // // // // //       "Subtotal": item.orderedQty * item.unitPrice
// // // // // // // // // //     }));
// // // // // // // // // //     const ws = XLSX.utils.json_to_sheet(data);
// // // // // // // // // //     const wb = XLSX.utils.book_new();
// // // // // // // // // //     XLSX.utils.book_append_sheet(wb, ws, "Indent");
// // // // // // // // // //     XLSX.writeFile(wb, `Indent_${activeIndent.indentNo || 'Export'}.xlsx`);
// // // // // // // // // //     showToast("Excel exported successfully", "success");
// // // // // // // // // //   };

// // // // // // // // // //   const handleStatusUpdate = async (id, newStatus) => {
// // // // // // // // // //     try {
// // // // // // // // // //       if (newStatus === 'purchased') {
// // // // // // // // // //         await api.post(`/indents/${id}/mark-purchased`);
// // // // // // // // // //       } else {
// // // // // // // // // //         await api.patch(`/indents/${id}`, { status: newStatus });
// // // // // // // // // //       }
// // // // // // // // // //       showToast(`Indent marked as ${newStatus}`, "success");
// // // // // // // // // //       load();
// // // // // // // // // //     } catch (error) {
// // // // // // // // // //       showToast("Failed to update status", "error");
// // // // // // // // // //     }
// // // // // // // // // //   };

// // // // // // // // // //   const confirmRequest = async () => {
// // // // // // // // // //   try {
// // // // // // // // // //     const selectedItems = editingRequest.items
// // // // // // // // // //       .filter(it => {
// // // // // // // // // //         const id = it.stockItemId?._id || it.stockItemId;
// // // // // // // // // //         return approvedItems[id];
// // // // // // // // // //       })
// // // // // // // // // //       .map(it => ({
// // // // // // // // // //         stockItemId: it.stockItemId?._id || it.stockItemId,
// // // // // // // // // //         qtyBaseUnit: it.qtyBaseUnit
// // // // // // // // // //       }));

// // // // // // // // // //     if (selectedItems.length === 0) {
// // // // // // // // // //       return showToast("Select at least one item", "info");
// // // // // // // // // //     }

// // // // // // // // // //     await api.patch(`/indent-requests/${editingRequest._id}/confirm`, {
// // // // // // // // // //       items: selectedItems
// // // // // // // // // //     });

// // // // // // // // // //     showToast("Selected items approved!", "success");

// // // // // // // // // //     setEditingRequest(null);
// // // // // // // // // //     setApprovedItems({});
// // // // // // // // // //     fetchIndentRequests();
// // // // // // // // // //   } catch (err) {
// // // // // // // // // //     showToast("Confirmation failed", "error");
// // // // // // // // // //   }
// // // // // // // // // // };

// // // // // // // // // //   const submitIndent = async () => {
// // // // // // // // // //     const itemsToSubmit = Object.keys(selectedItems)
// // // // // // // // // //       .filter(id => selectedItems[id].checked && Number(selectedItems[id].qty) > 0)
// // // // // // // // // //       .map(id => ({
// // // // // // // // // //         stockItemId: id,
// // // // // // // // // //         orderedQty: Number(selectedItems[id].qty),
// // // // // // // // // //         unitPrice: Number(selectedItems[id].price || 0),
// // // // // // // // // //         amount: Number(selectedItems[id].qty) * Number(selectedItems[id].price || 0)
// // // // // // // // // //       }));

// // // // // // // // // //     if (itemsToSubmit.length === 0) return showToast("Select items with quantity", "info");

// // // // // // // // // //     try {
// // // // // // // // // //       await api.post("/indents", { items: itemsToSubmit });
// // // // // // // // // //       showToast("Indent submitted", "success");
// // // // // // // // // //       setSelectedItems({});
// // // // // // // // // //       setView("history");
// // // // // // // // // //       load();
// // // // // // // // // //     } catch (error) {
// // // // // // // // // //       showToast("Submission failed", "error");
// // // // // // // // // //     }
// // // // // // // // // //   };

// // // // // // // // // //   // --- Memoized Filters ---
// // // // // // // // // //   const filteredIndents = useMemo(() => {
// // // // // // // // // //     return indents.filter(i =>
// // // // // // // // // //       (i.indentNo?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
// // // // // // // // // //       (i._id.includes(searchTerm))
// // // // // // // // // //     );
// // // // // // // // // //   }, [indents, searchTerm]);

// // // // // // // // // //   const filteredStock = useMemo(() => {
// // // // // // // // // //     return stockItems.filter(s =>
// // // // // // // // // //       s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
// // // // // // // // // //       s.stockGroupId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
// // // // // // // // // //     );
// // // // // // // // // //   }, [stockItems, searchTerm]);

// // // // // // // // // //   const activeIndent = useMemo(() =>
// // // // // // // // // //     indents.find(i => i._id === selectedId) || indents[0],
// // // // // // // // // //     [selectedId, indents]);

// // // // // // // // // //   const isConfirmed = editingRequest?.status === "confirmed";

// // // // // // // // // //   return (
// // // // // // // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // // // // // // //       {/* Header Area */}
// // // // // // // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// // // // // // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // // // // // // // //             <span style={{ color: '#6366f1' }}>Indents</span>
// // // // // // // // // //           </h1>
          
// // // // // // // // // //           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
// // // // // // // // // //             {[
// // // // // // // // // //               { id: 'history', label: 'Logs', icon: <ClipboardList size={14}/> },
// // // // // // // // // //               { id: 'requests', label: 'Requests', icon: <Inbox size={14}/> },
// // // // // // // // // //               { id: 'create', label: 'Create New', icon: <PlusCircle size={14}/> }
// // // // // // // // // //             ].map((btn) => (
// // // // // // // // // //               <button 
// // // // // // // // // //                 key={btn.id}
// // // // // // // // // //                 onClick={() => { setView(btn.id); setSearchTerm(""); setEditingRequest(null); }}
// // // // // // // // // //                 style={{ 
// // // // // // // // // //                   display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
// // // // // // // // // //                   background: view === btn.id ? '#fff' : 'transparent', 
// // // // // // // // // //                   color: view === btn.id ? '#6366f1' : '#64748b', 
// // // // // // // // // //                   boxShadow: view === btn.id ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' 
// // // // // // // // // //                 }}>
// // // // // // // // // //                 {btn.icon} {btn.label}
// // // // // // // // // //               </button>
// // // // // // // // // //             ))}
// // // // // // // // // //           </div>
// // // // // // // // // //         </div>

// // // // // // // // // //         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // // // // // //           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // // // // // // //           <input
// // // // // // // // // //             type="text"
// // // // // // // // // //             placeholder="Search..."
// // // // // // // // // //             value={searchTerm}
// // // // // // // // // //             onChange={(e) => setSearchTerm(e.target.value)}
// // // // // // // // // //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
// // // // // // // // // //           />
// // // // // // // // // //         </div>
// // // // // // // // // //       </div>

// // // // // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // // // // // //         {/* VIEW: HISTORY/LOGS */}
// // // // // // // // // //         {view === "history" && (
// // // // // // // // // //           <>
// // // // // // // // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>RESULTS ({filteredIndents.length})</div>
// // // // // // // // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // // // // //                 {filteredIndents.map(r => (
// // // // // // // // // //                   <div key={r._id} onClick={() => setSelectedId(r._id)}
// // // // // // // // // //                     style={{ padding: '16px', borderRadius: '16px', cursor: 'pointer', background: selectedId === r._id ? '#fff' : 'transparent', border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent', boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', transition: 'all 0.2s' }}>
// // // // // // // // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // //                       <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b' }}>{r.indentNo || `REF-${r._id.slice(-4)}`}</div>
// // // // // // // // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
// // // // // // // // // //                     </div>
// // // // // // // // // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>₹{r.totalAmount?.toLocaleString()} • {r.status.toUpperCase()}</div>
// // // // // // // // // //                   </div>
// // // // // // // // // //                 ))}
// // // // // // // // // //               </div>
// // // // // // // // // //             </div>

// // // // // // // // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // // // // // //               {activeIndent ? (
// // // // // // // // // //                 <>
// // // // // // // // // //                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
// // // // // // // // // //                     <div>
// // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>INDENT STATUS</div>
// // // // // // // // // //                       <div style={{ padding: '4px 12px', background: activeIndent.status === 'pending' ? '#fef3c7' : '#dcfce7', color: activeIndent.status === 'pending' ? '#d97706' : '#166534', borderRadius: '6px', fontSize: '12px', fontWeight: '800', display: 'inline-block' }}>
// // // // // // // // // //                         {activeIndent.status.toUpperCase()}
// // // // // // // // // //                       </div>
// // // // // // // // // //                     </div>
// // // // // // // // // //                     <div style={{ textAlign: 'right' }}>
// // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
// // // // // // // // // //                       <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activeIndent.totalAmount?.toLocaleString()}</div>
// // // // // // // // // //                     </div>
// // // // // // // // // //                   </div>
// // // // // // // // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // //                       <thead>
// // // // // // // // // //                         <tr style={{ textAlign: 'left' }}>
// // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th>
// // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
// // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// // // // // // // // // //                         </tr>
// // // // // // // // // //                       </thead>
// // // // // // // // // //                       <tbody>
// // // // // // // // // //                         {activeIndent.items.map((item, idx) => (
// // // // // // // // // //                           <tr key={idx}>
// // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(item)}</div>
// // // // // // // // // //                               <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
// // // // // // // // // //                             </td>
// // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// // // // // // // // // //                                 {getGroupName(item)}
// // // // // // // // // //                               </span>
// // // // // // // // // //                             </td>
// // // // // // // // // //                             <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // //                                {item.orderedQty} <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: '400'}}>{getUnitSymbol(item)}</span>
// // // // // // // // // //                             </td>
// // // // // // // // // //                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1', borderBottom: '1px solid #f8fafc' }}>₹{(item.orderedQty * item.unitPrice).toLocaleString()}</td>
// // // // // // // // // //                           </tr>
// // // // // // // // // //                         ))}
// // // // // // // // // //                       </tbody>
// // // // // // // // // //                     </table>
// // // // // // // // // //                   </div>
// // // // // // // // // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // // // // // //                     <button onClick={handleDownloadExcel} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // //                       <FileSpreadsheet size={16} /> Export Excel
// // // // // // // // // //                     </button>
// // // // // // // // // //                     {activeIndent.status.toLowerCase() === 'pending' && (
// // // // // // // // // //                       <button onClick={() => handleStatusUpdate(activeIndent._id, 'purchased')} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // //                         <CheckCircle2 size={16} /> Mark Purchased
// // // // // // // // // //                       </button>
// // // // // // // // // //                     )}
// // // // // // // // // //                   </div>
// // // // // // // // // //                 </>
// // // // // // // // // //               ) : (
// // // // // // // // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Select an indent to view details</div>
// // // // // // // // // //               )}
// // // // // // // // // //             </div>
// // // // // // // // // //           </>
// // // // // // // // // //         )}

// // // // // // // // // //         {/* VIEW: INDENT REQUESTS (INCOMING) */}
// // // // // // // // // //         {view === "requests" && (
// // // // // // // // // //           <>
// // // // // // // // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>
// // // // // // // // // //                 ALL REQUESTS ({indentRequests.length})
// // // // // // // // // //               </div>
// // // // // // // // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // // // // //                 {indentRequests.map(r => (
// // // // // // // // // //                   <div 
// // // // // // // // // //                     key={r._id} 
// // // // // // // // // //                     onClick={() => {
// // // // // // // // // //   setEditingRequest(JSON.parse(JSON.stringify(r)));
// // // // // // // // // //   setApprovedItems({});
// // // // // // // // // //   setSelectAll(false);
// // // // // // // // // // }}
// // // // // // // // // //                     style={{ 
// // // // // // // // // //                       padding: '16px', 
// // // // // // // // // //                       borderRadius: '16px', 
// // // // // // // // // //                       cursor: 'pointer', 
// // // // // // // // // //                       background: editingRequest?._id === r._id ? '#fff' : 'transparent', 
// // // // // // // // // //                       border: editingRequest?._id === r._id ? '1px solid #6366f1' : '1px solid transparent', 
// // // // // // // // // //                       boxShadow: editingRequest?._id === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', 
// // // // // // // // // //                       transition: 'all 0.2s' 
// // // // // // // // // //                     }}
// // // // // // // // // //                   >
// // // // // // // // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // //                       <div style={{ fontWeight: '700', color: editingRequest?._id === r._id ? '#6366f1' : '#1e293b' }}>
// // // // // // // // // //                         {r.userId?.name || 'Unknown User'}
// // // // // // // // // //                       </div>
// // // // // // // // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
// // // // // // // // // //                         {new Date(r.createdAt).toLocaleDateString()}
// // // // // // // // // //                       </div>
// // // // // // // // // //                     </div>
// // // // // // // // // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
// // // // // // // // // //                       <span>{r.godownId?.name || "Main Godown"} • {r.items?.length} Items</span>
// // // // // // // // // //                       <span style={{
// // // // // // // // // //                         background: r.status === "confirmed" ? "#dcfce7" : "#fef3c7",
// // // // // // // // // //                         color: r.status === "confirmed" ? "#166534" : "#d97706",
// // // // // // // // // //                         padding: "2px 8px",
// // // // // // // // // //                         borderRadius: "6px",
// // // // // // // // // //                         fontSize: "10px",
// // // // // // // // // //                         fontWeight: "700"
// // // // // // // // // //                       }}>
// // // // // // // // // //                         {r.status?.toUpperCase()}
// // // // // // // // // //                       </span>
// // // // // // // // // //                     </div>
// // // // // // // // // //                   </div>
// // // // // // // // // //                 ))}
// // // // // // // // // //               </div>
// // // // // // // // // //             </div>

// // // // // // // // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // // // // // //               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
// // // // // // // // // //                 {editingRequest ? (
// // // // // // // // // //                   <>
// // // // // // // // // //                     <div>
// // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>SOURCE GODOWN</div>
// // // // // // // // // //                       <div style={{ fontWeight: '800', fontSize: '18px', color: '#0f172a' }}>
// // // // // // // // // //                         {editingRequest.godownId?.name || "General"}
// // // // // // // // // //                       </div>
// // // // // // // // // //                     </div>
// // // // // // // // // //                     <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
// // // // // // // // // //                       <button
// // // // // // // // // //                         onClick={handleDownloadAllRequestsExcel}
// // // // // // // // // //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// // // // // // // // // //                       >
// // // // // // // // // //                         <FileSpreadsheet size={16} /> Export All Requests
// // // // // // // // // //                       </button>
// // // // // // // // // //                       <div style={{ textAlign: 'right' }}>
// // // // // // // // // //                         <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>ESTIMATED VALUATION</div>
// // // // // // // // // //                         <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>
// // // // // // // // // //                           ₹{editingRequest.items.reduce((sum, i) => sum + (Number(i.qtyBaseUnit || 0) * Number(i.price || 0)), 0).toLocaleString()}
// // // // // // // // // //                         </div>
// // // // // // // // // //                       </div>
// // // // // // // // // //                     </div>
// // // // // // // // // //                   </>
// // // // // // // // // //                 ) : (
// // // // // // // // // //                   <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
// // // // // // // // // //                     <input
// // // // // // // // // //   type="date"
// // // // // // // // // //   value={selectedDate}
// // // // // // // // // //   onChange={(e) => setSelectedDate(e.target.value)}
// // // // // // // // // //   style={{
// // // // // // // // // //     padding: "8px 12px",
// // // // // // // // // //     borderRadius: "10px",
// // // // // // // // // //     border: "1px solid #e2e8f0",
// // // // // // // // // //     fontSize: "13px"
// // // // // // // // // //   }}
// // // // // // // // // // />
// // // // // // // // // //                      <button
// // // // // // // // // //                         onClick={handleDownloadAllRequestsExcel}
// // // // // // // // // //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// // // // // // // // // //                       >
// // // // // // // // // //                         <FileSpreadsheet size={16} /> Export All Requests
// // // // // // // // // //                       </button>
// // // // // // // // // //                   </div>
// // // // // // // // // //                 )}
// // // // // // // // // //               </div>

// // // // // // // // // //               {editingRequest ? (
// // // // // // // // // //                 <>
// // // // // // // // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // //                       <thead>
// // // // // // // // // //                         <tr style={{ textAlign: 'left' }}>
// // // // // // // // // //                           <th style={{ width: "40px" }}>
// // // // // // // // // //   <input
// // // // // // // // // //     type="checkbox"
// // // // // // // // // //     checked={selectAll}
// // // // // // // // // //     disabled={editingRequest?.status !== "pending"}
// // // // // // // // // //     onChange={(e) => {
// // // // // // // // // //       const checked = e.target.checked;
// // // // // // // // // //       setSelectAll(checked);

// // // // // // // // // //       const newApproved = {};

// // // // // // // // // //       if (checked) {
// // // // // // // // // //         editingRequest.items.forEach(it => {
// // // // // // // // // //           const id = it.stockItemId?._id || it.stockItemId;
// // // // // // // // // //           newApproved[id] = true;
// // // // // // // // // //         });
// // // // // // // // // //       }

// // // // // // // // // //       setApprovedItems(newApproved);
// // // // // // // // // //     }}
// // // // // // // // // //   />
// // // // // // // // // // </th>
// // // // // // // // // // <th>ITEM</th>
// // // // // // // // // //                           {/* <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th> */}
// // // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// // // // // // // // // //                           {/* <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', width: '140px' }}>QTY</th> */}
// // // // // // // // // //                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
// // // // // // // // // //   REQUESTED
// // // // // // // // // // </th>

// // // // // // // // // // <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
// // // // // // // // // //   RECEIVED
// // // // // // // // // // </th>
// // // // // // // // // //                         </tr>
// // // // // // // // // //                       </thead>
// // // // // // // // // //                       <tbody>
// // // // // // // // // //                         {editingRequest.items.map((it, idx) => (
// // // // // // // // // //                           <tr key={idx}>
// // // // // // // // // //   <td>
// // // // // // // // // //     <input
// // // // // // // // // //       type="checkbox"
// // // // // // // // // //       checked={approvedItems[it.stockItemId?._id || it.stockItemId] || false}
// // // // // // // // // //       disabled={editingRequest.status !== "pending"}
// // // // // // // // // //       onChange={(e) => {
// // // // // // // // // //   const id = it.stockItemId?._id || it.stockItemId;

// // // // // // // // // //   const updated = {
// // // // // // // // // //     ...approvedItems,
// // // // // // // // // //     [id]: e.target.checked
// // // // // // // // // //   };

// // // // // // // // // //   setApprovedItems(updated);

// // // // // // // // // //   // ✅ check if all selected
// // // // // // // // // //   const allSelected = editingRequest.items.every(it => {
// // // // // // // // // //     const itemId = it.stockItemId?._id || it.stockItemId;
// // // // // // // // // //     return updated[itemId];
// // // // // // // // // //   });

// // // // // // // // // //   setSelectAll(allSelected);
// // // // // // // // // // }}
// // // // // // // // // //     />
// // // // // // // // // //   </td>
// // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(it)}</div>
// // // // // // // // // //                             </td>
// // // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// // // // // // // // // //                                 {getGroupName(it)}
// // // // // // // // // //                               </span>
// // // // // // // // // //                             </td>
// // // // // // // // // //                            {/* REQUESTED COLUMN */}
// // // // // // // // // // <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700' }}>
// // // // // // // // // //   {it.qtyBaseUnit}{" "}
// // // // // // // // // //   <span style={{ fontSize: '12px', color: '#64748b' }}>
// // // // // // // // // //     {getUnitSymbol(it)}
// // // // // // // // // //   </span>
// // // // // // // // // // </td>

// // // // // // // // // // {/* RECEIVED COLUMN */}
// // // // // // // // // // <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700', color: '#16a34a' }}>
// // // // // // // // // //   {it.receivedQty || 0}{" "}
// // // // // // // // // //   <span style={{ fontSize: '12px', color: '#64748b' }}>
// // // // // // // // // //     {getUnitSymbol(it)}
// // // // // // // // // //   </span>

// // // // // // // // // //   {(it.receivedQty || 0) >= (it.qtyBaseUnit || 0) && (
// // // // // // // // // //     <div style={{ fontSize: "10px", color: "#16a34a" }}>
// // // // // // // // // //       ✔ Fully Received
// // // // // // // // // //     </div>
// // // // // // // // // //   )}
// // // // // // // // // // </td>
                            
// // // // // // // // // //                           </tr>
// // // // // // // // // //                         ))}
// // // // // // // // // //                       </tbody>
// // // // // // // // // //                     </table>
// // // // // // // // // //                   </div>

// // // // // // // // // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // // // // // //                     <button 
// // // // // // // // // //                       onClick={() => setEditingRequest(null)} 
// // // // // // // // // //                       style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
// // // // // // // // // //                     >
// // // // // // // // // //                       Cancel
// // // // // // // // // //                     </button>

// // // // // // // // // //                     {!["confirmed", "received", "partially_received"].includes(editingRequest.status) && (
// // // // // // // // // //   <button onClick={confirmRequest}
// // // // // // // // // //                         style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
// // // // // // // // // //                       >
// // // // // // // // // //                         Confirm Request
// // // // // // // // // //                       </button>
// // // // // // // // // //                     )}
// // // // // // // // // //                   </div>
// // // // // // // // // //                 </>
// // // // // // // // // //               ) : (
// // // // // // // // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// // // // // // // // // //                   Select a request from the sidebar to review and convert
// // // // // // // // // //                 </div>
// // // // // // // // // //               )}
// // // // // // // // // //             </div>
// // // // // // // // // //           </>
// // // // // // // // // //         )}

// // // // // // // // // //         {/* VIEW: CREATE NEW (MANUAL) */}
// // // // // // // // // //         {view === "create" && (
// // // // // // // // // //           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
// // // // // // // // // //             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // //               <div>
// // // // // // // // // //                 <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Create Requisition</h2>
// // // // // // // // // //                 <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
// // // // // // // // // //                     <span onClick={() => setTab("stock-items")} style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: tab === 'stock-items' ? '#6366f1' : '#64748b' }}>Stock Items</span>
// // // // // // // // // //                 </div>
// // // // // // // // // //               </div>
// // // // // // // // // //               <div style={{ textAlign: 'right' }}>
// // // // // // // // // //                 <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>ESTIMATED TOTAL</div>
// // // // // // // // // //                 <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{Object.values(selectedItems).reduce((sum, i) => i.checked ? sum + (Number(i.qty || 0) * Number(i.price || 0)) : sum, 0).toLocaleString()}</div>
// // // // // // // // // //               </div>
// // // // // // // // // //             </div>

// // // // // // // // // //             <div style={{ flex: 1, overflowY: 'auto' }}>
// // // // // // // // // //               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // //                 <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
// // // // // // // // // //                   <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // // // // // //                     <th style={{ padding: '20px 32px', width: '50px' }}>
// // // // // // // // // //                         <input type="checkbox" onChange={(e) => {
// // // // // // // // // //                            const isChecked = e.target.checked;
// // // // // // // // // //                            const newSelection = { ...selectedItems };
// // // // // // // // // //                            filteredStock.forEach(item => {
// // // // // // // // // //                              newSelection[item._id] = { ...(newSelection[item._id] || { qty: 0, price: 0 }), checked: isChecked };
// // // // // // // // // //                            });
// // // // // // // // // //                            setSelectedItems(newSelection);
// // // // // // // // // //                         }} style={{ width: '18px', height: '18px' }} />
// // // // // // // // // //                     </th>
// // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>NAME</th>
// // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>STOCK GROUP</th>
// // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '140px' }}>QTY</th>
// // // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '100px' }}>PRICE</th>
// // // // // // // // // //                     <th style={{ padding: '20px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>ITEM TOTAL</th>
// // // // // // // // // //                   </tr>
// // // // // // // // // //                 </thead>
// // // // // // // // // //                 <tbody>
// // // // // // // // // //                   {filteredStock.map((row) => {
// // // // // // // // // //                     const state = selectedItems[row._id] || { checked: false, qty: 0, price: 0 };
// // // // // // // // // //                     const itemTotal = Number(state.qty || 0) * Number(state.price || 0);
// // // // // // // // // //                     return (
// // // // // // // // // //                       <tr key={row._id} style={{ borderBottom: '1px solid #f8fafc', background: state.checked ? '#fcfdff' : 'transparent' }}>
// // // // // // // // // //                         <td style={{ padding: '16px 32px' }}>
// // // // // // // // // //                           <input type="checkbox" checked={state.checked} onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, checked: e.target.checked } }))} style={{ width: '18px', height: '18px' }} />
// // // // // // // // // //                         </td>
// // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
// // // // // // // // // //                             <span style={{ fontWeight: '700', color: '#1e293b' }}>{row.name}</span>
// // // // // // // // // //                           </div>
// // // // // // // // // //                         </td>
// // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // //                           <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
// // // // // // // // // //                             {row.stockGroupId?.name || 'Unassigned'}
// // // // // // // // // //                           </span>
// // // // // // // // // //                         </td>
// // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // //                             <input type="number" disabled={!state.checked} value={state.qty} placeholder="0" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, qty: e.target.value } }))} style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // // // // // // // //                             <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{row.unitId?.symbol}</span>
// // // // // // // // // //                           </div>
// // // // // // // // // //                         </td>
// // // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // // //                             <input type="number" disabled={!state.checked} value={state.price} placeholder="₹" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, price: e.target.value } }))} style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // // // // // // // //                         </td>
// // // // // // // // // //                         <td style={{ padding: '16px 32px', textAlign: 'right', fontWeight: '800', color: state.checked ? '#6366f1' : '#94a3b8' }}>
// // // // // // // // // //                           ₹{itemTotal.toLocaleString()}
// // // // // // // // // //                         </td>
// // // // // // // // // //                       </tr>
// // // // // // // // // //                     );
// // // // // // // // // //                   })}
// // // // // // // // // //                 </tbody>
// // // // // // // // // //               </table>
// // // // // // // // // //             </div>
// // // // // // // // // //             <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // // // // // // // // //               <button onClick={submitIndent} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
// // // // // // // // // //                 Submit Requisition
// // // // // // // // // //               </button>
// // // // // // // // // //             </div>
// // // // // // // // // //           </div>
// // // // // // // // // //         )}
// // // // // // // // // //       </div>
// // // // // // // // // //     </div>
// // // // // // // // // //   );
// // // // // // // // // // };







// // // // // // // // // // 05-06-2026













// // // // // // // // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // // // // // // // import { api } from "../api.js";
// // // // // // // // // import { useToast } from "../toast.jsx";
// // // // // // // // // import * as XLSX from "xlsx";
// // // // // // // // // import { 
// // // // // // // // //   Search, FileSpreadsheet, CheckCircle2, Inbox, 
// // // // // // // // //   ClipboardList, PlusCircle, RefreshCw, X, Save 
// // // // // // // // // } from "lucide-react";

// // // // // // // // // export const IndentPage = () => {
// // // // // // // // //   const { showToast } = useToast();
// // // // // // // // //   const [selectedDate, setSelectedDate] = useState("");
// // // // // // // // //   // View State
// // // // // // // // //   const [view, setView] = useState("history"); 
// // // // // // // // //   const [tab, setTab] = useState("stock-items");
// // // // // // // // //   const [searchTerm, setSearchTerm] = useState("");
  
// // // // // // // // //   // Data State
// // // // // // // // //   const [stockItems, setStockItems] = useState([]);
// // // // // // // // //   const [indents, setIndents] = useState([]);
// // // // // // // // //   const [indentRequests, setIndentRequests] = useState([]);
// // // // // // // // //   const [selectedItems, setSelectedItems] = useState({});
// // // // // // // // //   const [selectedId, setSelectedId] = useState(null);

// // // // // // // // //   // --- Editing State for Requests ---
// // // // // // // // //   const [editingRequest, setEditingRequest] = useState(null);
// // // // // // // // //   const [approvedItems, setApprovedItems] = useState({});
// // // // // // // // //   const [rejectedItems, setRejectedItems] = useState({});
// // // // // // // // //   const [selectAll, setSelectAll] = useState(false);

// // // // // // // // //   // --- Data Loading ---
// // // // // // // // //   const load = useCallback(async () => {
// // // // // // // // //     try {
// // // // // // // // //       const [itemsRes, indentRes] = await Promise.all([
// // // // // // // // //         api.get("/inventory/stock-items"),
// // // // // // // // //         api.get("/indents")
// // // // // // // // //       ]);
// // // // // // // // //       setStockItems(itemsRes.data || []);
// // // // // // // // //       const sorted = (indentRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // // // //       setIndents(sorted);
// // // // // // // // //       if (sorted.length > 0 && !selectedId) setSelectedId(sorted[0]._id);
// // // // // // // // //     } catch (error) {
// // // // // // // // //       showToast("Failed to load data", "error");
// // // // // // // // //     }
// // // // // // // // //   }, [showToast, selectedId]);

// // // // // // // // //   const fetchIndentRequests = useCallback(async () => {
// // // // // // // // //     try {
// // // // // // // // //       const res = await api.get("/indent-requests");
// // // // // // // // //       setIndentRequests(res.data || []);
// // // // // // // // //     } catch (error) {
// // // // // // // // //       showToast("Failed to fetch requests", "error");
// // // // // // // // //     }
// // // // // // // // //   }, [showToast]);

// // // // // // // // //   useEffect(() => { 
// // // // // // // // //     load(); 
// // // // // // // // //     if (view === "requests") fetchIndentRequests();
// // // // // // // // //   }, [load, fetchIndentRequests, view]);

// // // // // // // // //   // --- Helper Functions ---
// // // // // // // // //   const getUnitSymbol = (item) => {
// // // // // // // // //     if (item.stockItemId?.unitId?.symbol) return item.stockItemId.unitId.symbol;
// // // // // // // // //     if (item.unitId?.symbol) return item.unitId.symbol;
// // // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // // //     return found?.unitId?.symbol || "";
// // // // // // // // //   };

// // // // // // // // //   const getItemName = (item) => {
// // // // // // // // //     if (item.stockItemId?.name) return item.stockItemId.name;
// // // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // // //     return found ? found.name : "Unknown Product";
// // // // // // // // //   };

// // // // // // // // //   const getGroupName = (item) => {
// // // // // // // // //     if (item.stockItemId?.stockGroupId?.name) return item.stockItemId.stockGroupId.name;
// // // // // // // // //     if (item.stockGroupId?.name) return item.stockGroupId.name;
// // // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // // //     return found?.stockGroupId?.name || "General";
// // // // // // // // //   };

// // // // // // // // //   const handleDownloadAllRequestsExcel = () => {
// // // // // // // // //   if (!indentRequests.length) {
// // // // // // // // //     return showToast("No requests available", "info");
// // // // // // // // //   }

// // // // // // // // //   let filteredRequests = indentRequests;

// // // // // // // // //   if (selectedDate) {
// // // // // // // // //     filteredRequests = indentRequests.filter(r => {
// // // // // // // // //       const reqDate = new Date(r.createdAt).toISOString().split("T")[0];
// // // // // // // // //       return reqDate === selectedDate;
// // // // // // // // //     });
// // // // // // // // //   }

// // // // // // // // //   if (!filteredRequests.length) {
// // // // // // // // //     return showToast("No requests found for selected date", "info");
// // // // // // // // //   }

// // // // // // // // //   const godownNames = [
// // // // // // // // //     ...new Set(filteredRequests.map(r => r.godownId?.name || "General"))
// // // // // // // // //   ];

// // // // // // // // //   const itemMap = {};

// // // // // // // // //   filteredRequests.forEach(req => {
// // // // // // // // //     const godownName = req.godownId?.name || "General";

// // // // // // // // //     req.items.forEach(item => {
// // // // // // // // //       const id = item.stockItemId?._id || item.stockItemId;

// // // // // // // // //       if (!itemMap[id]) {
// // // // // // // // //         itemMap[id] = {
// // // // // // // // //           stockItem: getItemName(item),
// // // // // // // // //           group: getGroupName(item),
// // // // // // // // //           unit: getUnitSymbol(item),
// // // // // // // // //           totalQty: 0,
// // // // // // // // //           godowns: {}
// // // // // // // // //         };
// // // // // // // // //       }

// // // // // // // // //       const qty = Number(item.qtyBaseUnit || 0);
// // // // // // // // //       itemMap[id].totalQty += qty;
// // // // // // // // //       itemMap[id].godowns[godownName] =
// // // // // // // // //         (itemMap[id].godowns[godownName] || 0) + qty;
// // // // // // // // //     });
// // // // // // // // //   });

// // // // // // // // //   const excelData = Object.values(itemMap).map((item, index) => {
// // // // // // // // //     const row = {
// // // // // // // // //       "S.No": index + 1,
// // // // // // // // //       "Stock Item": item.stockItem,
// // // // // // // // //       "Stock Group": item.group,
// // // // // // // // //       "Quantity": item.totalQty,
// // // // // // // // //       "Unit": item.unit
// // // // // // // // //     };

// // // // // // // // //     godownNames.forEach(g => {
// // // // // // // // //       row[g] = item.godowns[g] || 0;
// // // // // // // // //     });

// // // // // // // // //     return row;
// // // // // // // // //   });

// // // // // // // // //   const ws = XLSX.utils.json_to_sheet(excelData);
// // // // // // // // //   const wb = XLSX.utils.book_new();
// // // // // // // // //   XLSX.utils.book_append_sheet(wb, ws, "Filtered Requests");

// // // // // // // // //   const fileName = selectedDate
// // // // // // // // //     ? `Requests_${selectedDate}.xlsx`
// // // // // // // // //     : "All_Godown_Requests.xlsx";

// // // // // // // // //   XLSX.writeFile(wb, fileName);

// // // // // // // // //   showToast("Excel exported successfully", "success");
// // // // // // // // // };

// // // // // // // // //   const handleDownloadExcel = () => {
// // // // // // // // //     if (!activeIndent) return;
// // // // // // // // //     const data = activeIndent.items.map(item => ({
// // // // // // // // //       "Product": getItemName(item),
// // // // // // // // //       "Group": getGroupName(item),
// // // // // // // // //       "Quantity": item.orderedQty,
// // // // // // // // //       "Unit": getUnitSymbol(item),
// // // // // // // // //       "Price": item.unitPrice,
// // // // // // // // //       "Subtotal": item.orderedQty * item.unitPrice
// // // // // // // // //     }));
// // // // // // // // //     const ws = XLSX.utils.json_to_sheet(data);
// // // // // // // // //     const wb = XLSX.utils.book_new();
// // // // // // // // //     XLSX.utils.book_append_sheet(wb, ws, "Indent");
// // // // // // // // //     XLSX.writeFile(wb, `Indent_${activeIndent.indentNo || 'Export'}.xlsx`);
// // // // // // // // //     showToast("Excel exported successfully", "success");
// // // // // // // // //   };

// // // // // // // // //   const handleStatusUpdate = async (id, newStatus) => {
// // // // // // // // //     try {
// // // // // // // // //       if (newStatus === 'purchased') {
// // // // // // // // //         await api.post(`/indents/${id}/mark-purchased`);
// // // // // // // // //       } else {
// // // // // // // // //         await api.patch(`/indents/${id}`, { status: newStatus });
// // // // // // // // //       }
// // // // // // // // //       showToast(`Indent marked as ${newStatus}`, "success");
// // // // // // // // //       load();
// // // // // // // // //     } catch (error) {
// // // // // // // // //       showToast("Failed to update status", "error");
// // // // // // // // //     }
// // // // // // // // //   };

// // // // // // // // //   const confirmRequest = async () => {
// // // // // // // // //   try {
// // // // // // // // //     const selectedItems = editingRequest.items
// // // // // // // // //       .filter(it => {
// // // // // // // // //         const id = it.stockItemId?._id || it.stockItemId;
// // // // // // // // //         return approvedItems[id];
// // // // // // // // //       })
// // // // // // // // //       .map(it => ({
// // // // // // // // //         stockItemId: it.stockItemId?._id || it.stockItemId,
// // // // // // // // //         qtyBaseUnit: it.qtyBaseUnit
// // // // // // // // //       }));

// // // // // // // // //     if (selectedItems.length === 0) {
// // // // // // // // //       return showToast("Select at least one item", "info");
// // // // // // // // //     }

// // // // // // // // //     await api.patch(`/indent-requests/${editingRequest._id}/confirm`, {
// // // // // // // // //       items: selectedItems
// // // // // // // // //     });

// // // // // // // // //     showToast("Selected items approved!", "success");

// // // // // // // // //     setEditingRequest(null);
// // // // // // // // //     setApprovedItems({});
// // // // // // // // //     fetchIndentRequests();
// // // // // // // // //   } catch (err) {
// // // // // // // // //     showToast("Confirmation failed", "error");
// // // // // // // // //   }
// // // // // // // // // };

// // // // // // // // //   const submitIndent = async () => {
// // // // // // // // //     const itemsToSubmit = Object.keys(selectedItems)
// // // // // // // // //       .filter(id => selectedItems[id].checked && Number(selectedItems[id].qty) > 0)
// // // // // // // // //       .map(id => ({
// // // // // // // // //         stockItemId: id,
// // // // // // // // //         orderedQty: Number(selectedItems[id].qty),
// // // // // // // // //         unitPrice: Number(selectedItems[id].price || 0),
// // // // // // // // //         amount: Number(selectedItems[id].qty) * Number(selectedItems[id].price || 0)
// // // // // // // // //       }));

// // // // // // // // //     if (itemsToSubmit.length === 0) return showToast("Select items with quantity", "info");

// // // // // // // // //     try {
// // // // // // // // //       await api.post("/indents", { items: itemsToSubmit });
// // // // // // // // //       showToast("Indent submitted", "success");
// // // // // // // // //       setSelectedItems({});
// // // // // // // // //       setView("history");
// // // // // // // // //       load();
// // // // // // // // //     } catch (error) {
// // // // // // // // //       showToast("Submission failed", "error");
// // // // // // // // //     }
// // // // // // // // //   };

// // // // // // // // //   // --- Memoized Filters ---
// // // // // // // // //   const filteredIndents = useMemo(() => {
// // // // // // // // //     return indents.filter(i =>
// // // // // // // // //       (i.indentNo?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
// // // // // // // // //       (i._id.includes(searchTerm))
// // // // // // // // //     );
// // // // // // // // //   }, [indents, searchTerm]);

// // // // // // // // //   const filteredStock = useMemo(() => {
// // // // // // // // //     return stockItems.filter(s =>
// // // // // // // // //       s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
// // // // // // // // //       s.stockGroupId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
// // // // // // // // //     );
// // // // // // // // //   }, [stockItems, searchTerm]);

// // // // // // // // //   const activeIndent = useMemo(() =>
// // // // // // // // //     indents.find(i => i._id === selectedId) || indents[0],
// // // // // // // // //     [selectedId, indents]);

// // // // // // // // //   const isConfirmed = editingRequest?.status === "confirmed";

// // // // // // // // //   return (
// // // // // // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // // // // // //       {/* Header Area */}
// // // // // // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// // // // // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // // // // // // //             <span style={{ color: '#6366f1' }}>Indents</span>
// // // // // // // // //           </h1>
          
// // // // // // // // //           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
// // // // // // // // //             {[
// // // // // // // // //               { id: 'history', label: 'Logs', icon: <ClipboardList size={14}/> },
// // // // // // // // //               { id: 'requests', label: 'Requests', icon: <Inbox size={14}/> },
// // // // // // // // //               { id: 'create', label: 'Create New', icon: <PlusCircle size={14}/> }
// // // // // // // // //             ].map((btn) => (
// // // // // // // // //               <button 
// // // // // // // // //                 key={btn.id}
// // // // // // // // //                 onClick={() => { setView(btn.id); setSearchTerm(""); setEditingRequest(null); }}
// // // // // // // // //                 style={{ 
// // // // // // // // //                   display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
// // // // // // // // //                   background: view === btn.id ? '#fff' : 'transparent', 
// // // // // // // // //                   color: view === btn.id ? '#6366f1' : '#64748b', 
// // // // // // // // //                   boxShadow: view === btn.id ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' 
// // // // // // // // //                 }}>
// // // // // // // // //                 {btn.icon} {btn.label}
// // // // // // // // //               </button>
// // // // // // // // //             ))}
// // // // // // // // //           </div>
// // // // // // // // //         </div>

// // // // // // // // //         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // // // // //           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // // // // // //           <input
// // // // // // // // //             type="text"
// // // // // // // // //             placeholder="Search..."
// // // // // // // // //             value={searchTerm}
// // // // // // // // //             onChange={(e) => setSearchTerm(e.target.value)}
// // // // // // // // //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
// // // // // // // // //           />
// // // // // // // // //         </div>
// // // // // // // // //       </div>

// // // // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // // // // //         {/* VIEW: HISTORY/LOGS */}
// // // // // // // // //         {view === "history" && (
// // // // // // // // //           <>
// // // // // // // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>RESULTS ({filteredIndents.length})</div>
// // // // // // // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // // // //                 {filteredIndents.map(r => (
// // // // // // // // //                   <div key={r._id} onClick={() => setSelectedId(r._id)}
// // // // // // // // //                     style={{ padding: '16px', borderRadius: '16px', cursor: 'pointer', background: selectedId === r._id ? '#fff' : 'transparent', border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent', boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', transition: 'all 0.2s' }}>
// // // // // // // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // //                       <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b' }}>{r.indentNo || `REF-${r._id.slice(-4)}`}</div>
// // // // // // // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
// // // // // // // // //                     </div>
// // // // // // // // //                     <div
// // // // // // // // //   style={{
// // // // // // // // //     fontSize: "12px",
// // // // // // // // //     marginTop: "4px",
// // // // // // // // //     display: "flex",
// // // // // // // // //     justifyContent: "space-between",
// // // // // // // // //     alignItems: "center"
// // // // // // // // //   }}
// // // // // // // // // >
// // // // // // // // //   <span style={{ color: "#64748b" }}>
// // // // // // // // //     ₹{r.totalAmount?.toLocaleString()}
// // // // // // // // //   </span>

// // // // // // // // //   <span
// // // // // // // // //     style={{
// // // // // // // // //       background:
// // // // // // // // //         r.status === "pending"
// // // // // // // // //           ? "#fee2e2"
// // // // // // // // //           : r.status === "purchased"
// // // // // // // // //           ? "#f3e8ff"
// // // // // // // // //           : r.status === "stock_received"
// // // // // // // // //           ? "#dcfce7"
// // // // // // // // //           : "#f1f5f9",

// // // // // // // // //       color:
// // // // // // // // //         r.status === "pending"
// // // // // // // // //           ? "#dc2626"
// // // // // // // // //           : r.status === "purchased"
// // // // // // // // //           ? "#9333ea"
// // // // // // // // //           : r.status === "stock_received"
// // // // // // // // //           ? "#16a34a"
// // // // // // // // //           : "#64748b",

// // // // // // // // //       padding: "2px 8px",
// // // // // // // // //       borderRadius: "6px",
// // // // // // // // //       fontSize: "10px",
// // // // // // // // //       fontWeight: "700"
// // // // // // // // //     }}
// // // // // // // // //   >
// // // // // // // // //     {r.status?.replaceAll("_", " ").toUpperCase()}
// // // // // // // // //   </span>
// // // // // // // // // </div>
// // // // // // // // //                     {/* <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>₹{r.totalAmount?.toLocaleString()} • {r.status.toUpperCase()}</div> */}
// // // // // // // // //                   </div>
// // // // // // // // //                 ))}
// // // // // // // // //               </div>
// // // // // // // // //             </div>

// // // // // // // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // // // // //               {activeIndent ? (
// // // // // // // // //                 <>
// // // // // // // // //                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
// // // // // // // // //                     <div>
// // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>INDENT STATUS</div>
// // // // // // // // //                       <div
// // // // // // // // //   style={{
// // // // // // // // //     padding: "4px 12px",
// // // // // // // // //     borderRadius: "6px",
// // // // // // // // //     fontSize: "12px",
// // // // // // // // //     fontWeight: "800",
// // // // // // // // //     display: "inline-block",

// // // // // // // // //     background:
// // // // // // // // //       activeIndent.status === "pending"
// // // // // // // // //         ? "#fee2e2"
// // // // // // // // //         : activeIndent.status === "purchased"
// // // // // // // // //         ? "#f3e8ff"
// // // // // // // // //         : activeIndent.status === "stock_received"
// // // // // // // // //         ? "#dcfce7"
// // // // // // // // //         : "#f1f5f9",

// // // // // // // // //     color:
// // // // // // // // //       activeIndent.status === "pending"
// // // // // // // // //         ? "#dc2626"
// // // // // // // // //         : activeIndent.status === "purchased"
// // // // // // // // //         ? "#9333ea"
// // // // // // // // //         : activeIndent.status === "stock_received"
// // // // // // // // //         ? "#16a34a"
// // // // // // // // //         : "#64748b"
// // // // // // // // //   }}
// // // // // // // // // >
// // // // // // // // //   {activeIndent.status?.replaceAll("_", " ").toUpperCase()}
// // // // // // // // // </div>
// // // // // // // // //                     </div>
// // // // // // // // //                     <div style={{ textAlign: 'right' }}>
// // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
// // // // // // // // //                       <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activeIndent.totalAmount?.toLocaleString()}</div>
// // // // // // // // //                     </div>
// // // // // // // // //                   </div>
// // // // // // // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // //                       <thead>
// // // // // // // // //                         <tr style={{ textAlign: 'left' }}>
// // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th>
// // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
// // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// // // // // // // // //                         </tr>
// // // // // // // // //                       </thead>
// // // // // // // // //                       <tbody>
// // // // // // // // //                         {activeIndent.items.map((item, idx) => (
// // // // // // // // //                           <tr key={idx}>
// // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(item)}</div>
// // // // // // // // //                               {item.status === "rejected" && (
// // // // // // // // //   <div
// // // // // // // // //     style={{
// // // // // // // // //       display: "inline-block",
// // // // // // // // //       marginTop: "4px",
// // // // // // // // //       background: "#fee2e2",
// // // // // // // // //       color: "#dc2626",
// // // // // // // // //       padding: "2px 8px",
// // // // // // // // //       borderRadius: "6px",
// // // // // // // // //       fontSize: "10px",
// // // // // // // // //       fontWeight: "700"
// // // // // // // // //     }}
// // // // // // // // //   >
// // // // // // // // //     REJECTED
// // // // // // // // //   </div>
// // // // // // // // // )}
// // // // // // // // //                               <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
// // // // // // // // //                             </td>
// // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// // // // // // // // //                                 {getGroupName(item)}
// // // // // // // // //                               </span>
// // // // // // // // //                             </td>
// // // // // // // // //                             <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // //                                {item.orderedQty} <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: '400'}}>{getUnitSymbol(item)}</span>
// // // // // // // // //                             </td>
// // // // // // // // //                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1', borderBottom: '1px solid #f8fafc' }}>₹{(item.orderedQty * item.unitPrice).toLocaleString()}</td>
// // // // // // // // //                           </tr>
// // // // // // // // //                         ))}
// // // // // // // // //                       </tbody>
// // // // // // // // //                     </table>
// // // // // // // // //                   </div>
// // // // // // // // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // // // // //                     <button onClick={handleDownloadExcel} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // //                       <FileSpreadsheet size={16} /> Export Excel
// // // // // // // // //                     </button>
// // // // // // // // //                     {activeIndent.status.toLowerCase() === 'pending' && (
// // // // // // // // //                       <button onClick={() => handleStatusUpdate(activeIndent._id, 'purchased')} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // //                         <CheckCircle2 size={16} /> Mark Purchased
// // // // // // // // //                       </button>
// // // // // // // // //                     )}
// // // // // // // // //                   </div>
// // // // // // // // //                 </>
// // // // // // // // //               ) : (
// // // // // // // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Select an indent to view details</div>
// // // // // // // // //               )}
// // // // // // // // //             </div>
// // // // // // // // //           </>
// // // // // // // // //         )}

// // // // // // // // //         {/* VIEW: INDENT REQUESTS (INCOMING) */}
// // // // // // // // //         {view === "requests" && (
// // // // // // // // //           <>
// // // // // // // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>
// // // // // // // // //                 ALL REQUESTS ({indentRequests.length})
// // // // // // // // //               </div>
// // // // // // // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // // // //                 {indentRequests.map(r => (
// // // // // // // // //                   <div 
// // // // // // // // //                     key={r._id} 
// // // // // // // // //                     onClick={() => {
// // // // // // // // //   setEditingRequest(JSON.parse(JSON.stringify(r)));
// // // // // // // // //   setApprovedItems({});
// // // // // // // // //   setSelectAll(false);
// // // // // // // // // }}
// // // // // // // // //                     style={{ 
// // // // // // // // //                       padding: '16px', 
// // // // // // // // //                       borderRadius: '16px', 
// // // // // // // // //                       cursor: 'pointer', 
// // // // // // // // //                       background: editingRequest?._id === r._id ? '#fff' : 'transparent', 
// // // // // // // // //                       border: editingRequest?._id === r._id ? '1px solid #6366f1' : '1px solid transparent', 
// // // // // // // // //                       boxShadow: editingRequest?._id === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', 
// // // // // // // // //                       transition: 'all 0.2s' 
// // // // // // // // //                     }}
// // // // // // // // //                   >
// // // // // // // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // //                       <div style={{ fontWeight: '700', color: editingRequest?._id === r._id ? '#6366f1' : '#1e293b' }}>
// // // // // // // // //                         {r.userId?.name || 'Unknown User'}
// // // // // // // // //                       </div>
// // // // // // // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
// // // // // // // // //                         {new Date(r.createdAt).toLocaleDateString()}
// // // // // // // // //                       </div>
// // // // // // // // //                     </div>
// // // // // // // // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
// // // // // // // // //                       <span>{r.godownId?.name || "Main Godown"} • {r.items?.length} Items</span>
// // // // // // // // //                       <span
// // // // // // // // //   style={{
// // // // // // // // //     background:
// // // // // // // // //       r.status === "pending"
// // // // // // // // //         ? "#fee2e2"          // red
// // // // // // // // //         : r.status === "confirmed"
// // // // // // // // //         ? "#dbeafe"          // blue
// // // // // // // // //         : r.status === "received"
// // // // // // // // //         ? "#dcfce7"          // green
// // // // // // // // //         : r.status === "partially_received"
// // // // // // // // //         ? "#f3e8ff"          // purple
// // // // // // // // //         : "#f1f5f9",

// // // // // // // // //     color:
// // // // // // // // //       r.status === "pending"
// // // // // // // // //         ? "#dc2626"
// // // // // // // // //         : r.status === "confirmed"
// // // // // // // // //         ? "#2563eb"
// // // // // // // // //         : r.status === "received"
// // // // // // // // //         ? "#16a34a"
// // // // // // // // //         : r.status === "partially_received"
// // // // // // // // //         ? "#9333ea"          // purple text
// // // // // // // // //         : "#64748b",

// // // // // // // // //     padding: "2px 8px",
// // // // // // // // //     borderRadius: "6px",
// // // // // // // // //     fontSize: "10px",
// // // // // // // // //     fontWeight: "700"
// // // // // // // // //   }}
// // // // // // // // // >
// // // // // // // // //   {r.status?.replaceAll("_", " ").toUpperCase()}
// // // // // // // // // </span>
// // // // // // // // //                     </div>
// // // // // // // // //                   </div>
// // // // // // // // //                 ))}
// // // // // // // // //               </div>
// // // // // // // // //             </div>

// // // // // // // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // // // // //               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
// // // // // // // // //                 {editingRequest ? (
// // // // // // // // //                   <>
// // // // // // // // //                     <div>
// // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>SOURCE GODOWN</div>
// // // // // // // // //                       <div style={{ fontWeight: '800', fontSize: '18px', color: '#0f172a' }}>
// // // // // // // // //                         {editingRequest.godownId?.name || "General"}
// // // // // // // // //                       </div>
// // // // // // // // //                     </div>
// // // // // // // // //                     <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
// // // // // // // // //                       <button
// // // // // // // // //                         onClick={handleDownloadAllRequestsExcel}
// // // // // // // // //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// // // // // // // // //                       >
// // // // // // // // //                         <FileSpreadsheet size={16} /> Export All Requests
// // // // // // // // //                       </button>
// // // // // // // // //                       <div style={{ textAlign: 'right' }}>
// // // // // // // // //                         <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>ESTIMATED VALUATION</div>
// // // // // // // // //                         <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>
// // // // // // // // //                           ₹{editingRequest.items.reduce((sum, i) => sum + (Number(i.qtyBaseUnit || 0) * Number(i.price || 0)), 0).toLocaleString()}
// // // // // // // // //                         </div>
// // // // // // // // //                       </div>
// // // // // // // // //                     </div>
// // // // // // // // //                   </>
// // // // // // // // //                 ) : (
// // // // // // // // //                   <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
// // // // // // // // //                     <input
// // // // // // // // //   type="date"
// // // // // // // // //   value={selectedDate}
// // // // // // // // //   onChange={(e) => setSelectedDate(e.target.value)}
// // // // // // // // //   style={{
// // // // // // // // //     padding: "8px 12px",
// // // // // // // // //     borderRadius: "10px",
// // // // // // // // //     border: "1px solid #e2e8f0",
// // // // // // // // //     fontSize: "13px"
// // // // // // // // //   }}
// // // // // // // // // />
// // // // // // // // //                      <button
// // // // // // // // //                         onClick={handleDownloadAllRequestsExcel}
// // // // // // // // //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// // // // // // // // //                       >
// // // // // // // // //                         <FileSpreadsheet size={16} /> Export All Requests
// // // // // // // // //                       </button>
// // // // // // // // //                   </div>
// // // // // // // // //                 )}
// // // // // // // // //               </div>

// // // // // // // // //               {editingRequest ? (
// // // // // // // // //                 <>
// // // // // // // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // //                       <thead>
// // // // // // // // //                         <tr style={{ textAlign: 'left' }}>
// // // // // // // // //                           <th style={{ width: "40px" }}>
// // // // // // // // //   <input
// // // // // // // // //     type="checkbox"
// // // // // // // // //     checked={selectAll}
// // // // // // // // //     disabled={editingRequest?.status !== "pending"}
// // // // // // // // //     onChange={(e) => {
// // // // // // // // //       const checked = e.target.checked;
// // // // // // // // //       setSelectAll(checked);

// // // // // // // // //       const newApproved = {};

// // // // // // // // //       if (checked) {
// // // // // // // // //   editingRequest.items.forEach(it => {
// // // // // // // // //     const id = it.stockItemId?._id || it.stockItemId;

// // // // // // // // //     // skip rejected items
// // // // // // // // //     if (!rejectedItems[id]) {
// // // // // // // // //       newApproved[id] = true;
// // // // // // // // //     }
// // // // // // // // //   });
// // // // // // // // // }

// // // // // // // // //       setApprovedItems(newApproved);
// // // // // // // // //     }}
// // // // // // // // //   />
// // // // // // // // // </th>
// // // // // // // // // <th>ITEM</th>
// // // // // // // // //                           {/* <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th> */}
// // // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// // // // // // // // //                           {/* <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', width: '140px' }}>QTY</th> */}
// // // // // // // // //                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
// // // // // // // // //   REQUESTED
// // // // // // // // // </th>

// // // // // // // // // <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
// // // // // // // // //   RECEIVED
// // // // // // // // // </th>
// // // // // // // // // <th
// // // // // // // // //   style={{
// // // // // // // // //     padding: '24px 0 12px',
// // // // // // // // //     fontSize: '11px',
// // // // // // // // //     fontWeight: '900',
// // // // // // // // //     color: '#94a3b8',
// // // // // // // // //     borderBottom: '1px solid #e2e8f0',
// // // // // // // // //     textAlign: 'right'
// // // // // // // // //   }}
// // // // // // // // // >
// // // // // // // // //   ACTION
// // // // // // // // // </th>
// // // // // // // // //                         </tr>
// // // // // // // // //                       </thead>
// // // // // // // // //                       <tbody>
// // // // // // // // //                         {editingRequest.items.map((it, idx) => (
// // // // // // // // //                           <tr
// // // // // // // // //   key={idx}
// // // // // // // // //   style={{
// // // // // // // // //     background:
// // // // // // // // //       it.status === "rejected"
// // // // // // // // //         ? "#fef2f2"
// // // // // // // // //         : "transparent"
// // // // // // // // //   }}
// // // // // // // // // >
// // // // // // // // //   <td>
// // // // // // // // //     <input
// // // // // // // // //   type="checkbox"
// // // // // // // // //   disabled={editingRequest.status !== "pending"}
// // // // // // // // //   checked={!!approvedItems[it.stockItemId?._id || it.stockItemId]}
      
// // // // // // // // //   onChange={(e) => {
// // // // // // // // //   const id = it.stockItemId?._id || it.stockItemId;

// // // // // // // // //   const updated = {
// // // // // // // // //     ...approvedItems,
// // // // // // // // //     [id]: e.target.checked
// // // // // // // // //   };

// // // // // // // // //   setApprovedItems(updated);

// // // // // // // // //   // ✅ check if all selected
// // // // // // // // //   const allSelected = editingRequest.items.every(it => {
// // // // // // // // //     const itemId = it.stockItemId?._id || it.stockItemId;
// // // // // // // // //     return updated[itemId];
// // // // // // // // //   });

// // // // // // // // //   setSelectAll(allSelected);
// // // // // // // // // }}
// // // // // // // // //     />
// // // // // // // // //   </td>
// // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(it)}</div>
// // // // // // // // //                             </td>
// // // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// // // // // // // // //                                 {getGroupName(it)}
// // // // // // // // //                               </span>
// // // // // // // // //                             </td>
// // // // // // // // //                            {/* REQUESTED COLUMN */}
// // // // // // // // // <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700' }}>
// // // // // // // // //   {it.qtyBaseUnit}{" "}
// // // // // // // // //   <span style={{ fontSize: '12px', color: '#64748b' }}>
// // // // // // // // //     {getUnitSymbol(it)}
// // // // // // // // //   </span>
// // // // // // // // // </td>

// // // // // // // // // {/* RECEIVED COLUMN */}
// // // // // // // // // <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700', color: '#16a34a' }}>
// // // // // // // // //   {it.receivedQty || 0}{" "}
// // // // // // // // //   <span style={{ fontSize: '12px', color: '#64748b' }}>
// // // // // // // // //     {getUnitSymbol(it)}
// // // // // // // // //   </span>

// // // // // // // // //   {(it.receivedQty || 0) >= (it.qtyBaseUnit || 0) && (
// // // // // // // // //     <div style={{ fontSize: "10px", color: "#16a34a" }}>
// // // // // // // // //       ✔ Fully Received
// // // // // // // // //     </div>
// // // // // // // // //   )}
// // // // // // // // // </td>
// // // // // // // // // {it.status === "rejected" && (
// // // // // // // // //   <button
// // // // // // // // //     onClick={async () => {
// // // // // // // // //       try {
// // // // // // // // //         await api.patch(
// // // // // // // // //           `/indent-requests/${editingRequest._id}/select-item`,
// // // // // // // // //           {
// // // // // // // // //             stockItemId:
// // // // // // // // //               it.stockItemId?._id || it.stockItemId
// // // // // // // // //           }
// // // // // // // // //         );

// // // // // // // // //         showToast(
// // // // // // // // //           "Item approved successfully",
// // // // // // // // //           "success"
// // // // // // // // //         );

// // // // // // // // //         fetchIndentRequests();

// // // // // // // // //       } catch {
// // // // // // // // //         showToast(
// // // // // // // // //           "Failed to approve item",
// // // // // // // // //           "error"
// // // // // // // // //         );
// // // // // // // // //       }
// // // // // // // // //     }}
// // // // // // // // //     style={{
// // // // // // // // //       background: "#dcfce7",
// // // // // // // // //       color: "#16a34a",
// // // // // // // // //       border: "1px solid #bbf7d0",
// // // // // // // // //       padding: "6px 12px",
// // // // // // // // //       borderRadius: "8px",
// // // // // // // // //       cursor: "pointer",
// // // // // // // // //       fontWeight: "700",
// // // // // // // // //       fontSize: "12px"
// // // // // // // // //     }}
// // // // // // // // //   >
// // // // // // // // //     Select Again
// // // // // // // // //   </button>
// // // // // // // // // )}

// // // // // // // // // <td
// // // // // // // // //   style={{
// // // // // // // // //     padding: '20px 0',
// // // // // // // // //     borderBottom: '1px solid #f8fafc',
// // // // // // // // //     textAlign: 'right'
// // // // // // // // //   }}
// // // // // // // // // >
// // // // // // // // //   {editingRequest.status === "pending" &&
// // // // // // // // //  it.status !== "rejected" && (
// // // // // // // // //   rejectedItems[it.stockItemId?._id || it.stockItemId] ? (
// // // // // // // // //     <button
// // // // // // // // //       onClick={() => {
// // // // // // // // //         const id = it.stockItemId?._id || it.stockItemId;

// // // // // // // // //         setRejectedItems(prev => {
// // // // // // // // //           const copy = { ...prev };
// // // // // // // // //           delete copy[id];
// // // // // // // // //           return copy;
// // // // // // // // //         });

// // // // // // // // //         setApprovedItems(prev => ({
// // // // // // // // //           ...prev,
// // // // // // // // //           [id]: true
// // // // // // // // //         }));
// // // // // // // // //       }}
// // // // // // // // //       style={{
// // // // // // // // //         background: "#dcfce7",
// // // // // // // // //         color: "#16a34a",
// // // // // // // // //         border: "1px solid #bbf7d0",
// // // // // // // // //         padding: "6px 12px",
// // // // // // // // //         borderRadius: "8px",
// // // // // // // // //         cursor: "pointer",
// // // // // // // // //         fontWeight: "700",
// // // // // // // // //         fontSize: "12px"
// // // // // // // // //       }}
// // // // // // // // //     >
// // // // // // // // //       Select
// // // // // // // // //     </button>
// // // // // // // // //   ) : (
// // // // // // // // //     <button
// // // // // // // // //       onClick={() => {
// // // // // // // // //         const id = it.stockItemId?._id || it.stockItemId;

// // // // // // // // //         setRejectedItems(prev => ({
// // // // // // // // //           ...prev,
// // // // // // // // //           [id]: true
// // // // // // // // //         }));

// // // // // // // // //         setApprovedItems(prev => {
// // // // // // // // //           const copy = { ...prev };
// // // // // // // // //           delete copy[id];
// // // // // // // // //           return copy;
// // // // // // // // //         });
// // // // // // // // //       }}
// // // // // // // // //       style={{
// // // // // // // // //         background: "#fff",
// // // // // // // // //         color: "#dc2626",
// // // // // // // // //         border: "1px solid #fecaca",
// // // // // // // // //         padding: "6px 12px",
// // // // // // // // //         borderRadius: "8px",
// // // // // // // // //         cursor: "pointer",
// // // // // // // // //         fontWeight: "700",
// // // // // // // // //         fontSize: "12px"
// // // // // // // // //       }}
// // // // // // // // //     >
// // // // // // // // //       Reject
// // // // // // // // //     </button>
// // // // // // // // //   )
// // // // // // // // // )}
// // // // // // // // // </td>
                            
// // // // // // // // //                           </tr>
// // // // // // // // //                         ))}
// // // // // // // // //                       </tbody>
// // // // // // // // //                     </table>
// // // // // // // // //                   </div>

// // // // // // // // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // // // // //                     <button 
// // // // // // // // //                       onClick={() => setEditingRequest(null)} 
// // // // // // // // //                       style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
// // // // // // // // //                     >
// // // // // // // // //                       Cancel
// // // // // // // // //                     </button>

// // // // // // // // //                     {!["confirmed", "received", "partially_received"].includes(editingRequest.status) && (
// // // // // // // // //   <button onClick={confirmRequest}
// // // // // // // // //                         style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
// // // // // // // // //                       >
// // // // // // // // //                         Confirm Request
// // // // // // // // //                       </button>
// // // // // // // // //                     )}
// // // // // // // // //                   </div>
// // // // // // // // //                 </>
// // // // // // // // //               ) : (
// // // // // // // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// // // // // // // // //                   Select a request from the sidebar to review and convert
// // // // // // // // //                 </div>
// // // // // // // // //               )}
// // // // // // // // //             </div>
// // // // // // // // //           </>
// // // // // // // // //         )}

// // // // // // // // //         {/* VIEW: CREATE NEW (MANUAL) */}
// // // // // // // // //         {view === "create" && (
// // // // // // // // //           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
// // // // // // // // //             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // //               <div>
// // // // // // // // //                 <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Create Requisition</h2>
// // // // // // // // //                 <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
// // // // // // // // //                     <span onClick={() => setTab("stock-items")} style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: tab === 'stock-items' ? '#6366f1' : '#64748b' }}>Stock Items</span>
// // // // // // // // //                 </div>
// // // // // // // // //               </div>
// // // // // // // // //               <div style={{ textAlign: 'right' }}>
// // // // // // // // //                 <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>ESTIMATED TOTAL</div>
// // // // // // // // //                 <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{Object.values(selectedItems).reduce((sum, i) => i.checked ? sum + (Number(i.qty || 0) * Number(i.price || 0)) : sum, 0).toLocaleString()}</div>
// // // // // // // // //               </div>
// // // // // // // // //             </div>

// // // // // // // // //             <div style={{ flex: 1, overflowY: 'auto' }}>
// // // // // // // // //               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // //                 <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
// // // // // // // // //                   <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // // // // //                     <th style={{ padding: '20px 32px', width: '50px' }}>
// // // // // // // // //                         <input type="checkbox" onChange={(e) => {
// // // // // // // // //                            const isChecked = e.target.checked;
// // // // // // // // //                            const newSelection = { ...selectedItems };
// // // // // // // // //                            filteredStock.forEach(item => {
// // // // // // // // //                              newSelection[item._id] = { ...(newSelection[item._id] || { qty: 0, price: 0 }), checked: isChecked };
// // // // // // // // //                            });
// // // // // // // // //                            setSelectedItems(newSelection);
// // // // // // // // //                         }} style={{ width: '18px', height: '18px' }} />
// // // // // // // // //                     </th>
// // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>NAME</th>
// // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>STOCK GROUP</th>
// // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '140px' }}>QTY</th>
// // // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '100px' }}>PRICE</th>
// // // // // // // // //                     <th style={{ padding: '20px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>ITEM TOTAL</th>
// // // // // // // // //                   </tr>
// // // // // // // // //                 </thead>
// // // // // // // // //                 <tbody>
// // // // // // // // //                   {filteredStock.map((row) => {
// // // // // // // // //                     const state = selectedItems[row._id] || { checked: false, qty: 0, price: 0 };
// // // // // // // // //                     const itemTotal = Number(state.qty || 0) * Number(state.price || 0);
// // // // // // // // //                     return (
// // // // // // // // //                       <tr key={row._id} style={{ borderBottom: '1px solid #f8fafc', background: state.checked ? '#fcfdff' : 'transparent' }}>
// // // // // // // // //                         <td style={{ padding: '16px 32px' }}>
// // // // // // // // //                           <input type="checkbox" checked={state.checked} onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, checked: e.target.checked } }))} style={{ width: '18px', height: '18px' }} />
// // // // // // // // //                         </td>
// // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
// // // // // // // // //                             <span style={{ fontWeight: '700', color: '#1e293b' }}>{row.name}</span>
// // // // // // // // //                           </div>
// // // // // // // // //                         </td>
// // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // //                           <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
// // // // // // // // //                             {row.stockGroupId?.name || 'Unassigned'}
// // // // // // // // //                           </span>
// // // // // // // // //                         </td>
// // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // //                             <input type="number" disabled={!state.checked} value={state.qty} placeholder="0" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, qty: e.target.value } }))} style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // // // // // // //                             <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{row.unitId?.symbol}</span>
// // // // // // // // //                           </div>
// // // // // // // // //                         </td>
// // // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // // //                             <input type="number" disabled={!state.checked} value={state.price} placeholder="₹" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, price: e.target.value } }))} style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // // // // // // //                         </td>
// // // // // // // // //                         <td style={{ padding: '16px 32px', textAlign: 'right', fontWeight: '800', color: state.checked ? '#6366f1' : '#94a3b8' }}>
// // // // // // // // //                           ₹{itemTotal.toLocaleString()}
// // // // // // // // //                         </td>
// // // // // // // // //                       </tr>
// // // // // // // // //                     );
// // // // // // // // //                   })}
// // // // // // // // //                 </tbody>
// // // // // // // // //               </table>
// // // // // // // // //             </div>
// // // // // // // // //             <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // // // // // // // //               <button onClick={submitIndent} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
// // // // // // // // //                 Submit Requisition
// // // // // // // // //               </button>
// // // // // // // // //             </div>
// // // // // // // // //           </div>
// // // // // // // // //         )}
// // // // // // // // //       </div>
// // // // // // // // //     </div>
// // // // // // // // //   );
// // // // // // // // // };









// // // // // // // // // 08-06-2026







// // // // // // // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // // // // // // import { api } from "../api.js";
// // // // // // // // import { useToast } from "../toast.jsx";
// // // // // // // // import * as XLSX from "xlsx";
// // // // // // // // import { 
// // // // // // // //   Search, FileSpreadsheet, CheckCircle2, Inbox, 
// // // // // // // //   ClipboardList, PlusCircle, RefreshCw, X, Save 
// // // // // // // // } from "lucide-react";

// // // // // // // // export const IndentPage = () => {
// // // // // // // //   const { showToast } = useToast();
// // // // // // // //   const [selectedDate, setSelectedDate] = useState("");
// // // // // // // //   // View State
// // // // // // // //   const [view, setView] = useState("history"); 
// // // // // // // //   const [tab, setTab] = useState("stock-items");
// // // // // // // //   const [searchTerm, setSearchTerm] = useState("");
  
// // // // // // // //   // Data State
// // // // // // // //   const [stockItems, setStockItems] = useState([]);
// // // // // // // //   const [indents, setIndents] = useState([]);
// // // // // // // //   const [indentRequests, setIndentRequests] = useState([]);
// // // // // // // //   const [selectedItems, setSelectedItems] = useState({});
// // // // // // // //   const [selectedId, setSelectedId] = useState(null);

// // // // // // // //   // --- Editing State for Requests ---
// // // // // // // //   const [editingRequest, setEditingRequest] = useState(null);
// // // // // // // //   const [approvedItems, setApprovedItems] = useState({});
// // // // // // // //   const [rejectedItems, setRejectedItems] = useState({});
// // // // // // // //   const [selectAll, setSelectAll] = useState(false);

// // // // // // // //   // --- Data Loading ---
// // // // // // // //   const load = useCallback(async () => {
// // // // // // // //     try {
// // // // // // // //       const [itemsRes, indentRes] = await Promise.all([
// // // // // // // //         api.get("/inventory/stock-items"),
// // // // // // // //         api.get("/indents")
// // // // // // // //       ]);
// // // // // // // //       setStockItems(itemsRes.data || []);
// // // // // // // //       const sorted = (indentRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // // //       setIndents(sorted);
// // // // // // // //       if (sorted.length > 0 && !selectedId) setSelectedId(sorted[0]._id);
// // // // // // // //     } catch (error) {
// // // // // // // //       showToast("Failed to load data", "error");
// // // // // // // //     }
// // // // // // // //   }, [showToast, selectedId]);

// // // // // // // //   const fetchIndentRequests = useCallback(async () => {
// // // // // // // //     try {
// // // // // // // //       const res = await api.get("/indent-requests");
// // // // // // // //       setIndentRequests(res.data || []);
// // // // // // // //     } catch (error) {
// // // // // // // //       showToast("Failed to fetch requests", "error");
// // // // // // // //     }
// // // // // // // //   }, [showToast]);

// // // // // // // //   useEffect(() => { 
// // // // // // // //     load(); 
// // // // // // // //     if (view === "requests") fetchIndentRequests();
// // // // // // // //   }, [load, fetchIndentRequests, view]);

// // // // // // // //   // --- Helper Functions ---
// // // // // // // //   const getUnitSymbol = (item) => {
// // // // // // // //     if (item.stockItemId?.unitId?.symbol) return item.stockItemId.unitId.symbol;
// // // // // // // //     if (item.unitId?.symbol) return item.unitId.symbol;
// // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // //     return found?.unitId?.symbol || "";
// // // // // // // //   };

// // // // // // // //   const getItemName = (item) => {
// // // // // // // //     if (item.stockItemId?.name) return item.stockItemId.name;
// // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // //     return found ? found.name : "Unknown Product";
// // // // // // // //   };

// // // // // // // //   const getGroupName = (item) => {
// // // // // // // //     if (item.stockItemId?.stockGroupId?.name) return item.stockItemId.stockGroupId.name;
// // // // // // // //     if (item.stockGroupId?.name) return item.stockGroupId.name;
// // // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // // //     return found?.stockGroupId?.name || "General";
// // // // // // // //   };

// // // // // // // //   const handleDownloadAllRequestsExcel = () => {
// // // // // // // //   if (!indentRequests.length) {
// // // // // // // //     return showToast("No requests available", "info");
// // // // // // // //   }

// // // // // // // //   let filteredRequests = indentRequests;

// // // // // // // //   if (selectedDate) {
// // // // // // // //     filteredRequests = indentRequests.filter(r => {
// // // // // // // //       const reqDate = new Date(r.createdAt).toISOString().split("T")[0];
// // // // // // // //       return reqDate === selectedDate;
// // // // // // // //     });
// // // // // // // //   }

// // // // // // // //   if (!filteredRequests.length) {
// // // // // // // //     return showToast("No requests found for selected date", "info");
// // // // // // // //   }

// // // // // // // //   const godownNames = [
// // // // // // // //     ...new Set(filteredRequests.map(r => r.godownId?.name || "General"))
// // // // // // // //   ];

// // // // // // // //   const itemMap = {};

// // // // // // // //   filteredRequests.forEach(req => {
// // // // // // // //     const godownName = req.godownId?.name || "General";

// // // // // // // //     req.items.forEach(item => {
// // // // // // // //       const id = item.stockItemId?._id || item.stockItemId;

// // // // // // // //       if (!itemMap[id]) {
// // // // // // // //         itemMap[id] = {
// // // // // // // //           stockItem: getItemName(item),
// // // // // // // //           group: getGroupName(item),
// // // // // // // //           unit: getUnitSymbol(item),
// // // // // // // //           totalQty: 0,
// // // // // // // //           godowns: {}
// // // // // // // //         };
// // // // // // // //       }

// // // // // // // //       const qty = Number(item.qtyBaseUnit || 0);
// // // // // // // //       itemMap[id].totalQty += qty;
// // // // // // // //       itemMap[id].godowns[godownName] =
// // // // // // // //         (itemMap[id].godowns[godownName] || 0) + qty;
// // // // // // // //     });
// // // // // // // //   });

// // // // // // // //   const excelData = Object.values(itemMap).map((item, index) => {
// // // // // // // //     const row = {
// // // // // // // //       "S.No": index + 1,
// // // // // // // //       "Stock Item": item.stockItem,
// // // // // // // //       "Stock Group": item.group,
// // // // // // // //       "Quantity": item.totalQty,
// // // // // // // //       "Unit": item.unit
// // // // // // // //     };

// // // // // // // //     godownNames.forEach(g => {
// // // // // // // //       row[g] = item.godowns[g] || 0;
// // // // // // // //     });

// // // // // // // //     return row;
// // // // // // // //   });

// // // // // // // //   const ws = XLSX.utils.json_to_sheet(excelData);
// // // // // // // //   const wb = XLSX.utils.book_new();
// // // // // // // //   XLSX.utils.book_append_sheet(wb, ws, "Filtered Requests");

// // // // // // // //   const fileName = selectedDate
// // // // // // // //     ? `Requests_${selectedDate}.xlsx`
// // // // // // // //     : "All_Godown_Requests.xlsx";

// // // // // // // //   XLSX.writeFile(wb, fileName);

// // // // // // // //   showToast("Excel exported successfully", "success");
// // // // // // // // };

// // // // // // // //   const handleDownloadExcel = () => {
// // // // // // // //     if (!activeIndent) return;
// // // // // // // //     const data = activeIndent.items.map(item => ({
// // // // // // // //       "Product": getItemName(item),
// // // // // // // //       "Group": getGroupName(item),
// // // // // // // //       "Quantity": item.orderedQty,
// // // // // // // //       "Unit": getUnitSymbol(item),
// // // // // // // //       "Price": item.unitPrice,
// // // // // // // //       "Subtotal": item.orderedQty * item.unitPrice
// // // // // // // //     }));
// // // // // // // //     const ws = XLSX.utils.json_to_sheet(data);
// // // // // // // //     const wb = XLSX.utils.book_new();
// // // // // // // //     XLSX.utils.book_append_sheet(wb, ws, "Indent");
// // // // // // // //     XLSX.writeFile(wb, `Indent_${activeIndent.indentNo || 'Export'}.xlsx`);
// // // // // // // //     showToast("Excel exported successfully", "success");
// // // // // // // //   };

// // // // // // // //   const handleStatusUpdate = async (id, newStatus) => {
// // // // // // // //     try {
// // // // // // // //       if (newStatus === 'purchased') {
// // // // // // // //         await api.post(`/indents/${id}/mark-purchased`);
// // // // // // // //       } else {
// // // // // // // //         await api.patch(`/indents/${id}`, { status: newStatus });
// // // // // // // //       }
// // // // // // // //       showToast(`Indent marked as ${newStatus}`, "success");
// // // // // // // //       load();
// // // // // // // //     } catch (error) {
// // // // // // // //       showToast("Failed to update status", "error");
// // // // // // // //     }
// // // // // // // //   };

// // // // // // // //   const confirmRequest = async () => {
// // // // // // // //   try {
// // // // // // // //     const selectedItems = editingRequest.items
// // // // // // // //       .filter(it => {
// // // // // // // //         const id = it.stockItemId?._id || it.stockItemId;
// // // // // // // //         return approvedItems[id];
// // // // // // // //       })
// // // // // // // //       .map(it => ({
// // // // // // // //         stockItemId: it.stockItemId?._id || it.stockItemId,
// // // // // // // //         qtyBaseUnit: it.qtyBaseUnit
// // // // // // // //       }));

// // // // // // // //     if (selectedItems.length === 0) {
// // // // // // // //       return showToast("Select at least one item", "info");
// // // // // // // //     }

// // // // // // // //     await api.patch(`/indent-requests/${editingRequest._id}/confirm`, {
// // // // // // // //       items: selectedItems
// // // // // // // //     });

// // // // // // // //     showToast("Selected items approved!", "success");

// // // // // // // //     setEditingRequest(null);
// // // // // // // //     setApprovedItems({});
// // // // // // // //     fetchIndentRequests();
// // // // // // // //   } catch (err) {
// // // // // // // //     showToast("Confirmation failed", "error");
// // // // // // // //   }
// // // // // // // // };

// // // // // // // //   const submitIndent = async () => {
// // // // // // // //     const itemsToSubmit = Object.keys(selectedItems)
// // // // // // // //       .filter(id => selectedItems[id].checked && Number(selectedItems[id].qty) > 0)
// // // // // // // //       .map(id => ({
// // // // // // // //         stockItemId: id,
// // // // // // // //         orderedQty: Number(selectedItems[id].qty),
// // // // // // // //         unitPrice: Number(selectedItems[id].price || 0),
// // // // // // // //         amount: Number(selectedItems[id].qty) * Number(selectedItems[id].price || 0)
// // // // // // // //       }));

// // // // // // // //     if (itemsToSubmit.length === 0) return showToast("Select items with quantity", "info");

// // // // // // // //     try {
// // // // // // // //       await api.post("/indents", { items: itemsToSubmit });
// // // // // // // //       showToast("Indent submitted", "success");
// // // // // // // //       setSelectedItems({});
// // // // // // // //       setView("history");
// // // // // // // //       load();
// // // // // // // //     } catch (error) {
// // // // // // // //       showToast("Submission failed", "error");
// // // // // // // //     }
// // // // // // // //   };

// // // // // // // //   // --- Memoized Filters ---
// // // // // // // //   const filteredIndents = useMemo(() => {
// // // // // // // //     return indents.filter(i =>
// // // // // // // //       (i.indentNo?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
// // // // // // // //       (i._id.includes(searchTerm))
// // // // // // // //     );
// // // // // // // //   }, [indents, searchTerm]);

// // // // // // // //   const filteredStock = useMemo(() => {
// // // // // // // //     return stockItems.filter(s =>
// // // // // // // //       s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
// // // // // // // //       s.stockGroupId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
// // // // // // // //     );
// // // // // // // //   }, [stockItems, searchTerm]);

// // // // // // // //   const activeIndent = useMemo(() =>
// // // // // // // //     indents.find(i => i._id === selectedId) || indents[0],
// // // // // // // //     [selectedId, indents]);

// // // // // // // //   const isConfirmed = editingRequest?.status === "confirmed";

// // // // // // // //   return (
// // // // // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // // // // //       {/* Header Area */}
// // // // // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// // // // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // // // // // //             <span style={{ color: '#6366f1' }}>Indents</span>
// // // // // // // //           </h1>
          
// // // // // // // //           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
// // // // // // // //             {[
// // // // // // // //               { id: 'history', label: 'Logs', icon: <ClipboardList size={14}/> },
// // // // // // // //               { id: 'requests', label: 'Requests', icon: <Inbox size={14}/> },
// // // // // // // //               { id: 'create', label: 'Create New', icon: <PlusCircle size={14}/> }
// // // // // // // //             ].map((btn) => (
// // // // // // // //               <button 
// // // // // // // //                 key={btn.id}
// // // // // // // //                 onClick={() => { setView(btn.id); setSearchTerm(""); setEditingRequest(null); }}
// // // // // // // //                 style={{ 
// // // // // // // //                   display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
// // // // // // // //                   background: view === btn.id ? '#fff' : 'transparent', 
// // // // // // // //                   color: view === btn.id ? '#6366f1' : '#64748b', 
// // // // // // // //                   boxShadow: view === btn.id ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' 
// // // // // // // //                 }}>
// // // // // // // //                 {btn.icon} {btn.label}
// // // // // // // //               </button>
// // // // // // // //             ))}
// // // // // // // //           </div>
// // // // // // // //         </div>

// // // // // // // //         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // // // //           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // // // // //           <input
// // // // // // // //             type="text"
// // // // // // // //             placeholder="Search..."
// // // // // // // //             value={searchTerm}
// // // // // // // //             onChange={(e) => setSearchTerm(e.target.value)}
// // // // // // // //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
// // // // // // // //           />
// // // // // // // //         </div>
// // // // // // // //       </div>

// // // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // // // //         {/* VIEW: HISTORY/LOGS */}
// // // // // // // //         {view === "history" && (
// // // // // // // //           <>
// // // // // // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>RESULTS ({filteredIndents.length})</div>
// // // // // // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // // //                 {filteredIndents.map(r => (
// // // // // // // //                   <div key={r._id} onClick={() => setSelectedId(r._id)}
// // // // // // // //                     style={{ padding: '16px', borderRadius: '16px', cursor: 'pointer', background: selectedId === r._id ? '#fff' : 'transparent', border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent', boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', transition: 'all 0.2s' }}>
// // // // // // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // //                       <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b' }}>{r.indentNo || `REF-${r._id.slice(-4)}`}</div>
// // // // // // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
// // // // // // // //                     </div>
// // // // // // // //                     <div
// // // // // // // //   style={{
// // // // // // // //     fontSize: "12px",
// // // // // // // //     marginTop: "4px",
// // // // // // // //     display: "flex",
// // // // // // // //     justifyContent: "space-between",
// // // // // // // //     alignItems: "center"
// // // // // // // //   }}
// // // // // // // // >
// // // // // // // //   <span style={{ color: "#64748b" }}>
// // // // // // // //     ₹{r.totalAmount?.toLocaleString()}
// // // // // // // //   </span>

// // // // // // // //   <span
// // // // // // // //     style={{
// // // // // // // //       background:
// // // // // // // //         r.status === "pending"
// // // // // // // //           ? "#fee2e2"
// // // // // // // //           : r.status === "purchased"
// // // // // // // //           ? "#f3e8ff"
// // // // // // // //           : r.status === "stock_received"
// // // // // // // //           ? "#dcfce7"
// // // // // // // //           : "#f1f5f9",

// // // // // // // //       color:
// // // // // // // //         r.status === "pending"
// // // // // // // //           ? "#dc2626"
// // // // // // // //           : r.status === "purchased"
// // // // // // // //           ? "#9333ea"
// // // // // // // //           : r.status === "stock_received"
// // // // // // // //           ? "#16a34a"
// // // // // // // //           : "#64748b",

// // // // // // // //       padding: "2px 8px",
// // // // // // // //       borderRadius: "6px",
// // // // // // // //       fontSize: "10px",
// // // // // // // //       fontWeight: "700"
// // // // // // // //     }}
// // // // // // // //   >
// // // // // // // //     {r.status?.replaceAll("_", " ").toUpperCase()}
// // // // // // // //   </span>
// // // // // // // // </div>
// // // // // // // //                     {/* <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>₹{r.totalAmount?.toLocaleString()} • {r.status.toUpperCase()}</div> */}
// // // // // // // //                   </div>
// // // // // // // //                 ))}
// // // // // // // //               </div>
// // // // // // // //             </div>

// // // // // // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // // // //               {activeIndent ? (
// // // // // // // //                 <>
// // // // // // // //                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
// // // // // // // //                     <div>
// // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>INDENT STATUS</div>
// // // // // // // //                       <div
// // // // // // // //   style={{
// // // // // // // //     padding: "4px 12px",
// // // // // // // //     borderRadius: "6px",
// // // // // // // //     fontSize: "12px",
// // // // // // // //     fontWeight: "800",
// // // // // // // //     display: "inline-block",

// // // // // // // //     background:
// // // // // // // //       activeIndent.status === "pending"
// // // // // // // //         ? "#fee2e2"
// // // // // // // //         : activeIndent.status === "purchased"
// // // // // // // //         ? "#f3e8ff"
// // // // // // // //         : activeIndent.status === "stock_received"
// // // // // // // //         ? "#dcfce7"
// // // // // // // //         : "#f1f5f9",

// // // // // // // //     color:
// // // // // // // //       activeIndent.status === "pending"
// // // // // // // //         ? "#dc2626"
// // // // // // // //         : activeIndent.status === "purchased"
// // // // // // // //         ? "#9333ea"
// // // // // // // //         : activeIndent.status === "stock_received"
// // // // // // // //         ? "#16a34a"
// // // // // // // //         : "#64748b"
// // // // // // // //   }}
// // // // // // // // >
// // // // // // // //   {activeIndent.status?.replaceAll("_", " ").toUpperCase()}
// // // // // // // // </div>
// // // // // // // //                     </div>
// // // // // // // //                     <div style={{ textAlign: 'right' }}>
// // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
// // // // // // // //                       <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activeIndent.totalAmount?.toLocaleString()}</div>
// // // // // // // //                     </div>
// // // // // // // //                   </div>
// // // // // // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // //                       <thead>
// // // // // // // //                         <tr style={{ textAlign: 'left' }}>
// // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th>
// // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
// // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// // // // // // // //                         </tr>
// // // // // // // //                       </thead>
// // // // // // // //                       <tbody>
// // // // // // // //                         {activeIndent.items.map((item, idx) => (
// // // // // // // //                           <tr key={idx}>
// // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(item)}</div>
// // // // // // // //                               {item.status === "rejected" && (
// // // // // // // //   <div
// // // // // // // //     style={{
// // // // // // // //       display: "inline-block",
// // // // // // // //       marginTop: "4px",
// // // // // // // //       background: "#fee2e2",
// // // // // // // //       color: "#dc2626",
// // // // // // // //       padding: "2px 8px",
// // // // // // // //       borderRadius: "6px",
// // // // // // // //       fontSize: "10px",
// // // // // // // //       fontWeight: "700"
// // // // // // // //     }}
// // // // // // // //   >
// // // // // // // //     REJECTED
// // // // // // // //   </div>
// // // // // // // // )}
// // // // // // // //                               <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
// // // // // // // //                             </td>
// // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// // // // // // // //                                 {getGroupName(item)}
// // // // // // // //                               </span>
// // // // // // // //                             </td>
// // // // // // // //                             <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // //                                {item.orderedQty} <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: '400'}}>{getUnitSymbol(item)}</span>
// // // // // // // //                             </td>
// // // // // // // //                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1', borderBottom: '1px solid #f8fafc' }}>₹{(item.orderedQty * item.unitPrice).toLocaleString()}</td>
// // // // // // // //                           </tr>
// // // // // // // //                         ))}
// // // // // // // //                       </tbody>
// // // // // // // //                     </table>
// // // // // // // //                   </div>
// // // // // // // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // // // //                     <button onClick={handleDownloadExcel} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // //                       <FileSpreadsheet size={16} /> Export Excel
// // // // // // // //                     </button>
// // // // // // // //                     {activeIndent.status.toLowerCase() === 'pending' && (
// // // // // // // //                       <button onClick={() => handleStatusUpdate(activeIndent._id, 'purchased')} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // //                         <CheckCircle2 size={16} /> Mark Purchased
// // // // // // // //                       </button>
// // // // // // // //                     )}
// // // // // // // //                   </div>
// // // // // // // //                 </>
// // // // // // // //               ) : (
// // // // // // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Select an indent to view details</div>
// // // // // // // //               )}
// // // // // // // //             </div>
// // // // // // // //           </>
// // // // // // // //         )}

// // // // // // // //         {/* VIEW: INDENT REQUESTS (INCOMING) */}
// // // // // // // //         {view === "requests" && (
// // // // // // // //           <>
// // // // // // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>
// // // // // // // //                 ALL REQUESTS ({indentRequests.length})
// // // // // // // //               </div>
// // // // // // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // // //                 {indentRequests.map(r => (
// // // // // // // //                   <div 
// // // // // // // //                     key={r._id} 
// // // // // // // //                     onClick={() => {
// // // // // // // //   setEditingRequest(JSON.parse(JSON.stringify(r)));
// // // // // // // //   setApprovedItems({});
// // // // // // // //   setSelectAll(false);
// // // // // // // // }}
// // // // // // // //                     style={{ 
// // // // // // // //                       padding: '16px', 
// // // // // // // //                       borderRadius: '16px', 
// // // // // // // //                       cursor: 'pointer', 
// // // // // // // //                       background: editingRequest?._id === r._id ? '#fff' : 'transparent', 
// // // // // // // //                       border: editingRequest?._id === r._id ? '1px solid #6366f1' : '1px solid transparent', 
// // // // // // // //                       boxShadow: editingRequest?._id === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', 
// // // // // // // //                       transition: 'all 0.2s' 
// // // // // // // //                     }}
// // // // // // // //                   >
// // // // // // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // //                       <div style={{ fontWeight: '700', color: editingRequest?._id === r._id ? '#6366f1' : '#1e293b' }}>
// // // // // // // //                         {r.userId?.name || 'Unknown User'}
// // // // // // // //                       </div>
// // // // // // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
// // // // // // // //                         {new Date(r.createdAt).toLocaleDateString()}
// // // // // // // //                       </div>
// // // // // // // //                     </div>
// // // // // // // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
// // // // // // // //                       <span>{r.godownId?.name || "Main Godown"} • {r.items?.length} Items</span>
// // // // // // // //                       <span
// // // // // // // //   style={{
// // // // // // // //     background:
// // // // // // // //       r.status === "pending"
// // // // // // // //         ? "#fee2e2"          // red
// // // // // // // //         : r.status === "confirmed"
// // // // // // // //         ? "#dbeafe"          // blue
// // // // // // // //         : r.status === "received"
// // // // // // // //         ? "#dcfce7"          // green
// // // // // // // //         : r.status === "partially_received"
// // // // // // // //         ? "#f3e8ff"          // purple
// // // // // // // //         : "#f1f5f9",

// // // // // // // //     color:
// // // // // // // //       r.status === "pending"
// // // // // // // //         ? "#dc2626"
// // // // // // // //         : r.status === "confirmed"
// // // // // // // //         ? "#2563eb"
// // // // // // // //         : r.status === "received"
// // // // // // // //         ? "#16a34a"
// // // // // // // //         : r.status === "partially_received"
// // // // // // // //         ? "#9333ea"          // purple text
// // // // // // // //         : "#64748b",

// // // // // // // //     padding: "2px 8px",
// // // // // // // //     borderRadius: "6px",
// // // // // // // //     fontSize: "10px",
// // // // // // // //     fontWeight: "700"
// // // // // // // //   }}
// // // // // // // // >
// // // // // // // //   {r.status?.replaceAll("_", " ").toUpperCase()}
// // // // // // // // </span>
// // // // // // // //                     </div>
// // // // // // // //                   </div>
// // // // // // // //                 ))}
// // // // // // // //               </div>
// // // // // // // //             </div>

// // // // // // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // // // //               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
// // // // // // // //                 {editingRequest ? (
// // // // // // // //                   <>
// // // // // // // //                     <div>
// // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>SOURCE GODOWN</div>
// // // // // // // //                       <div style={{ fontWeight: '800', fontSize: '18px', color: '#0f172a' }}>
// // // // // // // //                         {editingRequest.godownId?.name || "General"}
// // // // // // // //                       </div>
// // // // // // // //                     </div>
// // // // // // // //                     <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
// // // // // // // //                       <button
// // // // // // // //                         onClick={handleDownloadAllRequestsExcel}
// // // // // // // //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// // // // // // // //                       >
// // // // // // // //                         <FileSpreadsheet size={16} /> Export All Requests
// // // // // // // //                       </button>
// // // // // // // //                       <div style={{ textAlign: 'right' }}>
// // // // // // // //                         <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>ESTIMATED VALUATION</div>
// // // // // // // //                         <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>
// // // // // // // //                           ₹{editingRequest.items.reduce((sum, i) => sum + (Number(i.qtyBaseUnit || 0) * Number(i.price || 0)), 0).toLocaleString()}
// // // // // // // //                         </div>
// // // // // // // //                       </div>
// // // // // // // //                     </div>
// // // // // // // //                   </>
// // // // // // // //                 ) : (
// // // // // // // //                   <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
// // // // // // // //                     <input
// // // // // // // //   type="date"
// // // // // // // //   value={selectedDate}
// // // // // // // //   onChange={(e) => setSelectedDate(e.target.value)}
// // // // // // // //   style={{
// // // // // // // //     padding: "8px 12px",
// // // // // // // //     borderRadius: "10px",
// // // // // // // //     border: "1px solid #e2e8f0",
// // // // // // // //     fontSize: "13px"
// // // // // // // //   }}
// // // // // // // // />
// // // // // // // //                      <button
// // // // // // // //                         onClick={handleDownloadAllRequestsExcel}
// // // // // // // //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// // // // // // // //                       >
// // // // // // // //                         <FileSpreadsheet size={16} /> Export All Requests
// // // // // // // //                       </button>
// // // // // // // //                   </div>
// // // // // // // //                 )}
// // // // // // // //               </div>

// // // // // // // //               {editingRequest ? (
// // // // // // // //                 <>
// // // // // // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // //                       <thead>
// // // // // // // //                         <tr style={{ textAlign: 'left' }}>
// // // // // // // //                           <th style={{ width: "40px" }}>
// // // // // // // //   <input
// // // // // // // //     type="checkbox"
// // // // // // // //     checked={selectAll}
// // // // // // // //     disabled={editingRequest?.status !== "pending"}
// // // // // // // //     onChange={(e) => {
// // // // // // // //       const checked = e.target.checked;
// // // // // // // //       setSelectAll(checked);

// // // // // // // //       const newApproved = {};

// // // // // // // //       if (checked) {
// // // // // // // //   editingRequest.items.forEach(it => {
// // // // // // // //     const id = it.stockItemId?._id || it.stockItemId;

// // // // // // // //     // skip rejected items
// // // // // // // //     if (!rejectedItems[id]) {
// // // // // // // //       newApproved[id] = true;
// // // // // // // //     }
// // // // // // // //   });
// // // // // // // // }

// // // // // // // //       setApprovedItems(newApproved);
// // // // // // // //     }}
// // // // // // // //   />
// // // // // // // // </th>
// // // // // // // // <th>ITEM</th>
// // // // // // // //                           {/* <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th> */}
// // // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// // // // // // // //                           {/* <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', width: '140px' }}>QTY</th> */}
// // // // // // // //                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
// // // // // // // //   REQUESTED
// // // // // // // // </th>

// // // // // // // // <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
// // // // // // // //   RECEIVED
// // // // // // // // </th>
// // // // // // // // <th
// // // // // // // //   style={{
// // // // // // // //     padding: '24px 0 12px',
// // // // // // // //     fontSize: '11px',
// // // // // // // //     fontWeight: '900',
// // // // // // // //     color: '#94a3b8',
// // // // // // // //     borderBottom: '1px solid #e2e8f0',
// // // // // // // //     textAlign: 'right'
// // // // // // // //   }}
// // // // // // // // >
// // // // // // // //   ACTION
// // // // // // // // </th>
// // // // // // // //                         </tr>
// // // // // // // //                       </thead>
// // // // // // // //                       <tbody>
// // // // // // // //                         {editingRequest.items.map((it, idx) => (
// // // // // // // //                           <tr
// // // // // // // //   key={idx}
// // // // // // // //   style={{
// // // // // // // //     background:
// // // // // // // //       it.status === "rejected"
// // // // // // // //         ? "#fef2f2"
// // // // // // // //         : "transparent"
// // // // // // // //   }}
// // // // // // // // >
// // // // // // // //   <td>
// // // // // // // //     <input
// // // // // // // //   type="checkbox"
// // // // // // // //   disabled={editingRequest.status !== "pending"}
// // // // // // // //   checked={!!approvedItems[it.stockItemId?._id || it.stockItemId]}
      
// // // // // // // //   onChange={(e) => {
// // // // // // // //   const id = it.stockItemId?._id || it.stockItemId;

// // // // // // // //   const updated = {
// // // // // // // //     ...approvedItems,
// // // // // // // //     [id]: e.target.checked
// // // // // // // //   };

// // // // // // // //   setApprovedItems(updated);

// // // // // // // //   // ✅ check if all selected
// // // // // // // //   const allSelected = editingRequest.items.every(it => {
// // // // // // // //     const itemId = it.stockItemId?._id || it.stockItemId;
// // // // // // // //     return updated[itemId];
// // // // // // // //   });

// // // // // // // //   setSelectAll(allSelected);
// // // // // // // // }}
// // // // // // // //     />
// // // // // // // //   </td>
// // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(it)}</div>
// // // // // // // //                             </td>
// // // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// // // // // // // //                                 {getGroupName(it)}
// // // // // // // //                               </span>
// // // // // // // //                             </td>
// // // // // // // //                            {/* REQUESTED COLUMN */}
// // // // // // // // <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700' }}>
// // // // // // // //   {it.qtyBaseUnit}{" "}
// // // // // // // //   <span style={{ fontSize: '12px', color: '#64748b' }}>
// // // // // // // //     {getUnitSymbol(it)}
// // // // // // // //   </span>
// // // // // // // // </td>

// // // // // // // // {/* RECEIVED COLUMN */}
// // // // // // // // <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700', color: '#16a34a' }}>
// // // // // // // //   {it.receivedQty || 0}{" "}
// // // // // // // //   <span style={{ fontSize: '12px', color: '#64748b' }}>
// // // // // // // //     {getUnitSymbol(it)}
// // // // // // // //   </span>

// // // // // // // //   {(it.receivedQty || 0) >= (it.qtyBaseUnit || 0) && (
// // // // // // // //     <div style={{ fontSize: "10px", color: "#16a34a" }}>
// // // // // // // //       ✔ Fully Received
// // // // // // // //     </div>
// // // // // // // //   )}
// // // // // // // // </td>
// // // // // // // // {/* {it.status === "rejected" && (
// // // // // // // //   <button
// // // // // // // //     onClick={async () => {
// // // // // // // //       try {
// // // // // // // //         await api.patch(
// // // // // // // //           `/indent-requests/${editingRequest._id}/select-item`,
// // // // // // // //           {
// // // // // // // //             stockItemId:
// // // // // // // //               it.stockItemId?._id || it.stockItemId
// // // // // // // //           }
// // // // // // // //         );

// // // // // // // //         showToast(
// // // // // // // //           "Item approved successfully",
// // // // // // // //           "success"
// // // // // // // //         );

// // // // // // // //         fetchIndentRequests();

// // // // // // // //       } catch {
// // // // // // // //         showToast(
// // // // // // // //           "Failed to approve item",
// // // // // // // //           "error"
// // // // // // // //         );
// // // // // // // //       }
// // // // // // // //     }}
// // // // // // // //     style={{
// // // // // // // //       background: "#dcfce7",
// // // // // // // //       color: "#16a34a",
// // // // // // // //       border: "1px solid #bbf7d0",
// // // // // // // //       padding: "6px 12px",
// // // // // // // //       borderRadius: "8px",
// // // // // // // //       cursor: "pointer",
// // // // // // // //       fontWeight: "700",
// // // // // // // //       fontSize: "12px"
// // // // // // // //     }}
// // // // // // // //   >
// // // // // // // //     Select Again
// // // // // // // //   </button>
// // // // // // // // )} */}

// // // // // // // // <td
// // // // // // // //   style={{
// // // // // // // //     padding: '20px 0',
// // // // // // // //     borderBottom: '1px solid #f8fafc',
// // // // // // // //     textAlign: 'right'
// // // // // // // //   }}
// // // // // // // // >
// // // // // // // //   {it.status === "rejected" ? (
// // // // // // // //     <span
// // // // // // // //       style={{
// // // // // // // //         background: "#fee2e2",
// // // // // // // //         color: "#dc2626",
// // // // // // // //         padding: "6px 12px",
// // // // // // // //         borderRadius: "8px",
// // // // // // // //         fontSize: "12px",
// // // // // // // //         fontWeight: "700"
// // // // // // // //       }}
// // // // // // // //     >
// // // // // // // //       REJECTED
// // // // // // // //     </span>
// // // // // // // //   ) : (
// // // // // // // //     editingRequest.status === "pending" && (
// // // // // // // //       rejectedItems[it.stockItemId?._id || it.stockItemId] ? (
// // // // // // // //         <button
// // // // // // // //           onClick={() => {
// // // // // // // //             const id = it.stockItemId?._id || it.stockItemId;

// // // // // // // //             setRejectedItems(prev => {
// // // // // // // //               const copy = { ...prev };
// // // // // // // //               delete copy[id];
// // // // // // // //               return copy;
// // // // // // // //             });

// // // // // // // //             setApprovedItems(prev => ({
// // // // // // // //               ...prev,
// // // // // // // //               [id]: true
// // // // // // // //             }));
// // // // // // // //           }}
// // // // // // // //           style={{
// // // // // // // //             background: "#dcfce7",
// // // // // // // //             color: "#16a34a",
// // // // // // // //             border: "1px solid #bbf7d0",
// // // // // // // //             padding: "6px 12px",
// // // // // // // //             borderRadius: "8px",
// // // // // // // //             cursor: "pointer",
// // // // // // // //             fontWeight: "700",
// // // // // // // //             fontSize: "12px"
// // // // // // // //           }}
// // // // // // // //         >
// // // // // // // //           Select
// // // // // // // //         </button>
// // // // // // // //       ) : (
// // // // // // // //         <button
// // // // // // // //           onClick={() => {
// // // // // // // //             const id = it.stockItemId?._id || it.stockItemId;

// // // // // // // //             setRejectedItems(prev => ({
// // // // // // // //               ...prev,
// // // // // // // //               [id]: true
// // // // // // // //             }));

// // // // // // // //             setApprovedItems(prev => {
// // // // // // // //               const copy = { ...prev };
// // // // // // // //               delete copy[id];
// // // // // // // //               return copy;
// // // // // // // //             });
// // // // // // // //           }}
// // // // // // // //           style={{
// // // // // // // //             background: "#fff",
// // // // // // // //             color: "#dc2626",
// // // // // // // //             border: "1px solid #fecaca",
// // // // // // // //             padding: "6px 12px",
// // // // // // // //             borderRadius: "8px",
// // // // // // // //             cursor: "pointer",
// // // // // // // //             fontWeight: "700",
// // // // // // // //             fontSize: "12px"
// // // // // // // //           }}
// // // // // // // //         >
// // // // // // // //           Reject
// // // // // // // //         </button>
// // // // // // // //       )
// // // // // // // //     )
// // // // // // // //   )}
// // // // // // // // </td>                            
// // // // // // // //                           </tr>
// // // // // // // //                         ))}
// // // // // // // //                       </tbody>
// // // // // // // //                     </table>
// // // // // // // //                   </div>

// // // // // // // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // // // //                     <button 
// // // // // // // //                       onClick={() => setEditingRequest(null)} 
// // // // // // // //                       style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
// // // // // // // //                     >
// // // // // // // //                       Cancel
// // // // // // // //                     </button>

// // // // // // // //                     {!["confirmed", "received", "partially_received"].includes(editingRequest.status) && (
// // // // // // // //   <button onClick={confirmRequest}
// // // // // // // //                         style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
// // // // // // // //                       >
// // // // // // // //                         Confirm Request
// // // // // // // //                       </button>
// // // // // // // //                     )}
// // // // // // // //                   </div>
// // // // // // // //                 </>
// // // // // // // //               ) : (
// // // // // // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// // // // // // // //                   Select a request from the sidebar to review and convert
// // // // // // // //                 </div>
// // // // // // // //               )}
// // // // // // // //             </div>
// // // // // // // //           </>
// // // // // // // //         )}

// // // // // // // //         {/* VIEW: CREATE NEW (MANUAL) */}
// // // // // // // //         {view === "create" && (
// // // // // // // //           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
// // // // // // // //             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // //               <div>
// // // // // // // //                 <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Create Requisition</h2>
// // // // // // // //                 <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
// // // // // // // //                     <span onClick={() => setTab("stock-items")} style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: tab === 'stock-items' ? '#6366f1' : '#64748b' }}>Stock Items</span>
// // // // // // // //                 </div>
// // // // // // // //               </div>
// // // // // // // //               <div style={{ textAlign: 'right' }}>
// // // // // // // //                 <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>ESTIMATED TOTAL</div>
// // // // // // // //                 <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{Object.values(selectedItems).reduce((sum, i) => i.checked ? sum + (Number(i.qty || 0) * Number(i.price || 0)) : sum, 0).toLocaleString()}</div>
// // // // // // // //               </div>
// // // // // // // //             </div>

// // // // // // // //             <div style={{ flex: 1, overflowY: 'auto' }}>
// // // // // // // //               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // //                 <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
// // // // // // // //                   <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // // // //                     <th style={{ padding: '20px 32px', width: '50px' }}>
// // // // // // // //                         <input type="checkbox" onChange={(e) => {
// // // // // // // //                            const isChecked = e.target.checked;
// // // // // // // //                            const newSelection = { ...selectedItems };
// // // // // // // //                            filteredStock.forEach(item => {
// // // // // // // //                              newSelection[item._id] = { ...(newSelection[item._id] || { qty: 0, price: 0 }), checked: isChecked };
// // // // // // // //                            });
// // // // // // // //                            setSelectedItems(newSelection);
// // // // // // // //                         }} style={{ width: '18px', height: '18px' }} />
// // // // // // // //                     </th>
// // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>NAME</th>
// // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>STOCK GROUP</th>
// // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '140px' }}>QTY</th>
// // // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '100px' }}>PRICE</th>
// // // // // // // //                     <th style={{ padding: '20px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>ITEM TOTAL</th>
// // // // // // // //                   </tr>
// // // // // // // //                 </thead>
// // // // // // // //                 <tbody>
// // // // // // // //                   {filteredStock.map((row) => {
// // // // // // // //                     const state = selectedItems[row._id] || { checked: false, qty: 0, price: 0 };
// // // // // // // //                     const itemTotal = Number(state.qty || 0) * Number(state.price || 0);
// // // // // // // //                     return (
// // // // // // // //                       <tr key={row._id} style={{ borderBottom: '1px solid #f8fafc', background: state.checked ? '#fcfdff' : 'transparent' }}>
// // // // // // // //                         <td style={{ padding: '16px 32px' }}>
// // // // // // // //                           <input type="checkbox" checked={state.checked} onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, checked: e.target.checked } }))} style={{ width: '18px', height: '18px' }} />
// // // // // // // //                         </td>
// // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
// // // // // // // //                             <span style={{ fontWeight: '700', color: '#1e293b' }}>{row.name}</span>
// // // // // // // //                           </div>
// // // // // // // //                         </td>
// // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // //                           <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
// // // // // // // //                             {row.stockGroupId?.name || 'Unassigned'}
// // // // // // // //                           </span>
// // // // // // // //                         </td>
// // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // //                             <input type="number" disabled={!state.checked} value={state.qty} placeholder="0" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, qty: e.target.value } }))} style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // // // // // //                             <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{row.unitId?.symbol}</span>
// // // // // // // //                           </div>
// // // // // // // //                         </td>
// // // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // // //                             <input type="number" disabled={!state.checked} value={state.price} placeholder="₹" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, price: e.target.value } }))} style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // // // // // //                         </td>
// // // // // // // //                         <td style={{ padding: '16px 32px', textAlign: 'right', fontWeight: '800', color: state.checked ? '#6366f1' : '#94a3b8' }}>
// // // // // // // //                           ₹{itemTotal.toLocaleString()}
// // // // // // // //                         </td>
// // // // // // // //                       </tr>
// // // // // // // //                     );
// // // // // // // //                   })}
// // // // // // // //                 </tbody>
// // // // // // // //               </table>
// // // // // // // //             </div>
// // // // // // // //             <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // // // // // // //               <button onClick={submitIndent} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
// // // // // // // //                 Submit Requisition
// // // // // // // //               </button>
// // // // // // // //             </div>
// // // // // // // //           </div>
// // // // // // // //         )}
// // // // // // // //       </div>
// // // // // // // //     </div>
// // // // // // // //   );
// // // // // // // // };




// // // // // // // // 16-06-2026






// // // // // // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // // // // // import { api } from "../api.js";
// // // // // // // import { useToast } from "../toast.jsx";
// // // // // // // import * as XLSX from "xlsx";
// // // // // // // import { 
// // // // // // //   Search, FileSpreadsheet, CheckCircle2, Inbox, 
// // // // // // //   ClipboardList, PlusCircle, RefreshCw, X, Save 
// // // // // // // } from "lucide-react";

// // // // // // // export const IndentPage = () => {
// // // // // // //   const { showToast } = useToast();
// // // // // // //   const [selectedDate, setSelectedDate] = useState("");
// // // // // // //   // View State
// // // // // // //   const [view, setView] = useState("history"); 
// // // // // // //   const [tab, setTab] = useState("stock-items");
// // // // // // //   const [searchTerm, setSearchTerm] = useState("");
  
// // // // // // //   // Data State
// // // // // // //   const [stockItems, setStockItems] = useState([]);
// // // // // // //   const [indents, setIndents] = useState([]);
// // // // // // //   const [indentRequests, setIndentRequests] = useState([]);
// // // // // // //   const [selectedItems, setSelectedItems] = useState({});
// // // // // // //   const [selectedId, setSelectedId] = useState(null);

// // // // // // //   // --- Editing State for Requests ---
// // // // // // //   const [editingRequest, setEditingRequest] = useState(null);
// // // // // // //   const [approvedItems, setApprovedItems] = useState({});
// // // // // // //   const [rejectedItems, setRejectedItems] = useState({});
// // // // // // //   const [selectAll, setSelectAll] = useState(false);

// // // // // // //   // --- Data Loading ---
// // // // // // //   const load = useCallback(async () => {
// // // // // // //     try {
// // // // // // //       const [itemsRes, indentRes] = await Promise.all([
// // // // // // //         api.get("/inventory/stock-items"),
// // // // // // //         api.get("/indents")
// // // // // // //       ]);
// // // // // // //       setStockItems(itemsRes.data || []);
// // // // // // //       const sorted = (indentRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // //       setIndents(sorted);
// // // // // // //       if (sorted.length > 0 && !selectedId) setSelectedId(sorted[0]._id);
// // // // // // //     } catch (error) {
// // // // // // //       showToast("Failed to load data", "error");
// // // // // // //     }
// // // // // // //   }, [showToast, selectedId]);

// // // // // // //   const fetchIndentRequests = useCallback(async () => {
// // // // // // //     try {
// // // // // // //       const res = await api.get("/indent-requests");
// // // // // // //       setIndentRequests(res.data || []);
// // // // // // //     } catch (error) {
// // // // // // //       showToast("Failed to fetch requests", "error");
// // // // // // //     }
// // // // // // //   }, [showToast]);

// // // // // // //   useEffect(() => { 
// // // // // // //     load(); 
// // // // // // //     if (view === "requests") fetchIndentRequests();
// // // // // // //   }, [load, fetchIndentRequests, view]);

// // // // // // //   // --- Helper Functions ---
// // // // // // //   const getUnitSymbol = (item) => {
// // // // // // //     if (item.stockItemId?.unitId?.symbol) return item.stockItemId.unitId.symbol;
// // // // // // //     if (item.unitId?.symbol) return item.unitId.symbol;
// // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // //     return found?.unitId?.symbol || "";
// // // // // // //   };

// // // // // // //   const formatQty = (value) => {
// // // // // // //   const num = Number(value || 0);
// // // // // // //   return Number(num.toFixed(3)).toString();
// // // // // // // };
// // // // // // //   const getItemName = (item) => {
// // // // // // //     if (item.stockItemId?.name) return item.stockItemId.name;
// // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // //     return found ? found.name : "Unknown Product";
// // // // // // //   };


// // // // // // //   const getGroupName = (item) => {
// // // // // // //     if (item.stockItemId?.stockGroupId?.name) return item.stockItemId.stockGroupId.name;
// // // // // // //     if (item.stockGroupId?.name) return item.stockGroupId.name;
// // // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // // //     return found?.stockGroupId?.name || "General";
// // // // // // //   };

// // // // // // //   const handleDownloadAllRequestsExcel = () => {
// // // // // // //   if (!indentRequests.length) {
// // // // // // //     return showToast("No requests available", "info");
// // // // // // //   }

// // // // // // //   let filteredRequests = indentRequests;

// // // // // // //   if (selectedDate) {
// // // // // // //     filteredRequests = indentRequests.filter(r => {
// // // // // // //       const reqDate = new Date(r.createdAt).toISOString().split("T")[0];
// // // // // // //       return reqDate === selectedDate;
// // // // // // //     });
// // // // // // //   }

// // // // // // //   if (!filteredRequests.length) {
// // // // // // //     return showToast("No requests found for selected date", "info");
// // // // // // //   }

// // // // // // //   const godownNames = [
// // // // // // //     ...new Set(filteredRequests.map(r => r.godownId?.name || "General"))
// // // // // // //   ];

// // // // // // //   const itemMap = {};

// // // // // // //   filteredRequests.forEach(req => {
// // // // // // //     const godownName = req.godownId?.name || "General";

// // // // // // //     req.items.forEach(item => {
// // // // // // //       const id = item.stockItemId?._id || item.stockItemId;

// // // // // // //       if (!itemMap[id]) {
// // // // // // //         itemMap[id] = {
// // // // // // //           stockItem: getItemName(item),
// // // // // // //           group: getGroupName(item),
// // // // // // //           unit: getUnitSymbol(item),
// // // // // // //           totalQty: 0,
// // // // // // //           godowns: {}
// // // // // // //         };
// // // // // // //       }

// // // // // // //       const qty = Number(item.qtyBaseUnit || 0);
// // // // // // //       itemMap[id].totalQty += qty;
// // // // // // //       itemMap[id].godowns[godownName] =
// // // // // // //         (itemMap[id].godowns[godownName] || 0) + qty;
// // // // // // //     });
// // // // // // //   });

// // // // // // //   const excelData = Object.values(itemMap).map((item, index) => {
// // // // // // //     const row = {
// // // // // // //       "S.No": index + 1,
// // // // // // //       "Stock Item": item.stockItem,
// // // // // // //       "Stock Group": item.group,
// // // // // // //       "Quantity": item.totalQty,
// // // // // // //       "Unit": item.unit
// // // // // // //     };

// // // // // // //     godownNames.forEach(g => {
// // // // // // //       row[g] = item.godowns[g] || 0;
// // // // // // //     });

// // // // // // //     return row;
// // // // // // //   });

// // // // // // //   const ws = XLSX.utils.json_to_sheet(excelData);
// // // // // // //   const wb = XLSX.utils.book_new();
// // // // // // //   XLSX.utils.book_append_sheet(wb, ws, "Filtered Requests");

// // // // // // //   const fileName = selectedDate
// // // // // // //     ? `Requests_${selectedDate}.xlsx`
// // // // // // //     : "All_Godown_Requests.xlsx";

// // // // // // //   XLSX.writeFile(wb, fileName);

// // // // // // //   showToast("Excel exported successfully", "success");
// // // // // // // };

// // // // // // //   const handleDownloadExcel = () => {
// // // // // // //     if (!activeIndent) return;
// // // // // // //     const data = activeIndent.items.map(item => ({
// // // // // // //       "Product": getItemName(item),
// // // // // // //       "Group": getGroupName(item),
// // // // // // //       "Quantity": item.orderedQty,
// // // // // // //       "Unit": getUnitSymbol(item),
// // // // // // //       "Price": item.unitPrice,
// // // // // // //       "Subtotal": item.orderedQty * item.unitPrice
// // // // // // //     }));
// // // // // // //     const ws = XLSX.utils.json_to_sheet(data);
// // // // // // //     const wb = XLSX.utils.book_new();
// // // // // // //     XLSX.utils.book_append_sheet(wb, ws, "Indent");
// // // // // // //     XLSX.writeFile(wb, `Indent_${activeIndent.indentNo || 'Export'}.xlsx`);
// // // // // // //     showToast("Excel exported successfully", "success");
// // // // // // //   };

// // // // // // //   const handleStatusUpdate = async (id, newStatus) => {
// // // // // // //     try {
// // // // // // //       if (newStatus === 'purchased') {
// // // // // // //         await api.post(`/indents/${id}/mark-purchased`);
// // // // // // //       } else {
// // // // // // //         await api.patch(`/indents/${id}`, { status: newStatus });
// // // // // // //       }
// // // // // // //       showToast(`Indent marked as ${newStatus}`, "success");
// // // // // // //       load();
// // // // // // //     } catch (error) {
// // // // // // //       showToast("Failed to update status", "error");
// // // // // // //     }
// // // // // // //   };
// // // // // // //  const rejectEntireRequest = async () => {
// // // // // // //   try {
// // // // // // //     await api.patch(
// // // // // // //       `/indent-requests/${editingRequest._id}/reject`
// // // // // // //     );

// // // // // // //     showToast(
// // // // // // //       "Request rejected successfully",
// // // // // // //       "success"
// // // // // // //     );

// // // // // // //     setEditingRequest(null);

// // // // // // //     fetchIndentRequests();

// // // // // // //   } catch (err) {
// // // // // // //     showToast(
// // // // // // //       "Reject failed",
// // // // // // //       "error"
// // // // // // //     );
// // // // // // //   }
// // // // // // // };
// // // // // // //   const confirmRequest = async () => {
   
// // // // // // //   try {
// // // // // // //     const selectedItems = editingRequest.items
// // // // // // //       .filter(it => {
// // // // // // //         const id = it.stockItemId?._id || it.stockItemId;
// // // // // // //         return approvedItems[id];
// // // // // // //       })
// // // // // // //       .map(it => ({
// // // // // // //         stockItemId: it.stockItemId?._id || it.stockItemId,
// // // // // // //         qtyBaseUnit: it.qtyBaseUnit
// // // // // // //       }));

// // // // // // //     if (selectedItems.length === 0) {
// // // // // // //       return showToast("Select at least one item", "info");
// // // // // // //     }

// // // // // // //     await api.patch(`/indent-requests/${editingRequest._id}/confirm`, {
// // // // // // //       items: selectedItems
// // // // // // //     });

// // // // // // //     showToast("Selected items approved!", "success");

// // // // // // //     setEditingRequest(null);
// // // // // // //     setApprovedItems({});
// // // // // // //     fetchIndentRequests();
// // // // // // //   } catch (err) {
// // // // // // //     showToast("Confirmation failed", "error");
// // // // // // //   }
// // // // // // // };

// // // // // // //   const submitIndent = async () => {
// // // // // // //     const itemsToSubmit = Object.keys(selectedItems)
// // // // // // //       .filter(id => selectedItems[id].checked && Number(selectedItems[id].qty) > 0)
// // // // // // //       .map(id => ({
// // // // // // //         stockItemId: id,
// // // // // // //         orderedQty: Number(selectedItems[id].qty),
// // // // // // //         unitPrice: Number(selectedItems[id].price || 0),
// // // // // // //         amount: Number(selectedItems[id].qty) * Number(selectedItems[id].price || 0)
// // // // // // //       }));

// // // // // // //     if (itemsToSubmit.length === 0) return showToast("Select items with quantity", "info");

// // // // // // //     try {
// // // // // // //       await api.post("/indents", { items: itemsToSubmit });
// // // // // // //       showToast("Indent submitted", "success");
// // // // // // //       setSelectedItems({});
// // // // // // //       setView("history");
// // // // // // //       load();
// // // // // // //     } catch (error) {
// // // // // // //       showToast("Submission failed", "error");
// // // // // // //     }
// // // // // // //   };

// // // // // // //   // --- Memoized Filters ---
// // // // // // //   const filteredIndents = useMemo(() => {
// // // // // // //     return indents.filter(i =>
// // // // // // //       (i.indentNo?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
// // // // // // //       (i._id.includes(searchTerm))
// // // // // // //     );
// // // // // // //   }, [indents, searchTerm]);

// // // // // // //   const filteredStock = useMemo(() => {
// // // // // // //     return stockItems.filter(s =>
// // // // // // //       s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
// // // // // // //       s.stockGroupId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
// // // // // // //     );
// // // // // // //   }, [stockItems, searchTerm]);

// // // // // // //   const activeIndent = useMemo(() =>
// // // // // // //     indents.find(i => i._id === selectedId) || indents[0],
// // // // // // //     [selectedId, indents]);

// // // // // // //   const isConfirmed = editingRequest?.status === "confirmed";

// // // // // // //   return (
// // // // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // // // //       {/* Header Area */}
// // // // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// // // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // // // // //             <span style={{ color: '#6366f1' }}>Indents</span>
// // // // // // //           </h1>
          
// // // // // // //           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
// // // // // // //             {[
// // // // // // //               { id: 'history', label: 'Logs', icon: <ClipboardList size={14}/> },
// // // // // // //               { id: 'requests', label: 'Requests', icon: <Inbox size={14}/> },
// // // // // // //               { id: 'create', label: 'Create New', icon: <PlusCircle size={14}/> }
// // // // // // //             ].map((btn) => (
// // // // // // //               <button 
// // // // // // //                 key={btn.id}
// // // // // // //                 onClick={() => { setView(btn.id); setSearchTerm(""); setEditingRequest(null); }}
// // // // // // //                 style={{ 
// // // // // // //                   display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
// // // // // // //                   background: view === btn.id ? '#fff' : 'transparent', 
// // // // // // //                   color: view === btn.id ? '#6366f1' : '#64748b', 
// // // // // // //                   boxShadow: view === btn.id ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' 
// // // // // // //                 }}>
// // // // // // //                 {btn.icon} {btn.label}
// // // // // // //               </button>
// // // // // // //             ))}
// // // // // // //           </div>
// // // // // // //         </div>

// // // // // // //         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // // //           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // // // //           <input
// // // // // // //             type="text"
// // // // // // //             placeholder="Search..."
// // // // // // //             value={searchTerm}
// // // // // // //             onChange={(e) => setSearchTerm(e.target.value)}
// // // // // // //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
// // // // // // //           />
// // // // // // //         </div>
// // // // // // //       </div>

// // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // // //         {/* VIEW: HISTORY/LOGS */}
// // // // // // //         {view === "history" && (
// // // // // // //           <>
// // // // // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>RESULTS ({filteredIndents.length})</div>
// // // // // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // //                 {filteredIndents.map(r => (
// // // // // // //                   <div key={r._id} onClick={() => setSelectedId(r._id)}
// // // // // // //                     style={{ padding: '16px', borderRadius: '16px', cursor: 'pointer', background: selectedId === r._id ? '#fff' : 'transparent', border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent', boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', transition: 'all 0.2s' }}>
// // // // // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // //                       <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b' }}>{r.indentNo || `REF-${r._id.slice(-4)}`}</div>
// // // // // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
// // // // // // //                     </div>
// // // // // // //                     <div
// // // // // // //   style={{
// // // // // // //     fontSize: "12px",
// // // // // // //     marginTop: "4px",
// // // // // // //     display: "flex",
// // // // // // //     justifyContent: "space-between",
// // // // // // //     alignItems: "center"
// // // // // // //   }}
// // // // // // // >
// // // // // // //   <span style={{ color: "#64748b" }}>
// // // // // // //     ₹{r.totalAmount?.toLocaleString()}
// // // // // // //   </span>

// // // // // // //   <span
// // // // // // //     style={{
// // // // // // //       background:
// // // // // // //         r.status === "pending"
// // // // // // //           ? "#fee2e2"
// // // // // // //           : r.status === "purchased"
// // // // // // //           ? "#f3e8ff"
// // // // // // //           : r.status === "stock_received"
// // // // // // //           ? "#dcfce7"
// // // // // // //           : "#f1f5f9",

// // // // // // //       color:
// // // // // // //         r.status === "pending"
// // // // // // //           ? "#dc2626"
// // // // // // //           : r.status === "purchased"
// // // // // // //           ? "#9333ea"
// // // // // // //           : r.status === "stock_received"
// // // // // // //           ? "#16a34a"
// // // // // // //           : "#64748b",

// // // // // // //       padding: "2px 8px",
// // // // // // //       borderRadius: "6px",
// // // // // // //       fontSize: "10px",
// // // // // // //       fontWeight: "700"
// // // // // // //     }}
// // // // // // //   >
// // // // // // //     {r.status?.replaceAll("_", " ").toUpperCase()}
// // // // // // //   </span>
// // // // // // // </div>
// // // // // // //                     {/* <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>₹{r.totalAmount?.toLocaleString()} • {r.status.toUpperCase()}</div> */}
// // // // // // //                   </div>
// // // // // // //                 ))}
// // // // // // //               </div>
// // // // // // //             </div>

// // // // // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // // //               {activeIndent ? (
// // // // // // //                 <>
// // // // // // //                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
// // // // // // //                     <div>
// // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>INDENT STATUS</div>
// // // // // // //                       <div
// // // // // // //   style={{
// // // // // // //     padding: "4px 12px",
// // // // // // //     borderRadius: "6px",
// // // // // // //     fontSize: "12px",
// // // // // // //     fontWeight: "800",
// // // // // // //     display: "inline-block",

// // // // // // //     background:
// // // // // // //       activeIndent.status === "pending"
// // // // // // //         ? "#fee2e2"
// // // // // // //         : activeIndent.status === "purchased"
// // // // // // //         ? "#f3e8ff"
// // // // // // //         : activeIndent.status === "stock_received"
// // // // // // //         ? "#dcfce7"
// // // // // // //         : "#f1f5f9",

// // // // // // //     color:
// // // // // // //       activeIndent.status === "pending"
// // // // // // //         ? "#dc2626"
// // // // // // //         : activeIndent.status === "purchased"
// // // // // // //         ? "#9333ea"
// // // // // // //         : activeIndent.status === "stock_received"
// // // // // // //         ? "#16a34a"
// // // // // // //         : "#64748b"
// // // // // // //   }}
// // // // // // // >
// // // // // // //   {activeIndent.status?.replaceAll("_", " ").toUpperCase()}
// // // // // // // </div>
// // // // // // //                     </div>
// // // // // // //                     <div style={{ textAlign: 'right' }}>
// // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
// // // // // // //                       <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activeIndent.totalAmount?.toLocaleString()}</div>
// // // // // // //                     </div>
// // // // // // //                   </div>
// // // // // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // //                       <thead>
// // // // // // //                         <tr style={{ textAlign: 'left' }}>
// // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th>
// // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
// // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// // // // // // //                         </tr>
// // // // // // //                       </thead>
// // // // // // //                       <tbody>
// // // // // // //                         {activeIndent.items.map((item, idx) => (
// // // // // // //                           <tr key={idx}>
// // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(item)}</div>
// // // // // // //                               {item.status === "rejected" && (
// // // // // // //   <div
// // // // // // //     style={{
// // // // // // //       display: "inline-block",
// // // // // // //       marginTop: "4px",
// // // // // // //       background: "#fee2e2",
// // // // // // //       color: "#dc2626",
// // // // // // //       padding: "2px 8px",
// // // // // // //       borderRadius: "6px",
// // // // // // //       fontSize: "10px",
// // // // // // //       fontWeight: "700"
// // // // // // //     }}
// // // // // // //   >
// // // // // // //     REJECTED
// // // // // // //   </div>
// // // // // // // )}
// // // // // // //                               <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
// // // // // // //                             </td>
// // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// // // // // // //                                 {getGroupName(item)}
// // // // // // //                               </span>
// // // // // // //                             </td>
// // // // // // //                             <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700', borderBottom: '1px solid #f8fafc' }}>
// // // // // // //                                {formatQty(item.orderedQty)} <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: '400'}}>{getUnitSymbol(item)}</span>
// // // // // // //                             </td>
// // // // // // //                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1', borderBottom: '1px solid #f8fafc' }}>₹{(item.orderedQty * item.unitPrice).toLocaleString()}</td>
// // // // // // //                           </tr>
// // // // // // //                         ))}
// // // // // // //                       </tbody>
// // // // // // //                     </table>
// // // // // // //                   </div>
// // // // // // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // // //                     <button onClick={handleDownloadExcel} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // //                       <FileSpreadsheet size={16} /> Export Excel
// // // // // // //                     </button>
// // // // // // //                     {activeIndent.status.toLowerCase() === 'pending' && (
// // // // // // //                       <button onClick={() => handleStatusUpdate(activeIndent._id, 'purchased')} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // //                         <CheckCircle2 size={16} /> Mark Purchased
// // // // // // //                       </button>
// // // // // // //                     )}
// // // // // // //                   </div>
// // // // // // //                 </>
// // // // // // //               ) : (
// // // // // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Select an indent to view details</div>
// // // // // // //               )}
// // // // // // //             </div>
// // // // // // //           </>
// // // // // // //         )}

// // // // // // //         {/* VIEW: INDENT REQUESTS (INCOMING) */}
// // // // // // //         {view === "requests" && (
// // // // // // //           <>
// // // // // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>
// // // // // // //                 ALL REQUESTS ({indentRequests.length})
// // // // // // //               </div>
// // // // // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // //                 {indentRequests.map(r => (
// // // // // // //                   <div 
// // // // // // //                     key={r._id} 
// // // // // // //                     onClick={() => {
// // // // // // //   setEditingRequest(JSON.parse(JSON.stringify(r)));
// // // // // // //   setApprovedItems({});
// // // // // // //   setSelectAll(false);
// // // // // // // }}
// // // // // // //                     style={{ 
// // // // // // //                       padding: '16px', 
// // // // // // //                       borderRadius: '16px', 
// // // // // // //                       cursor: 'pointer', 
// // // // // // //                       background: editingRequest?._id === r._id ? '#fff' : 'transparent', 
// // // // // // //                       border: editingRequest?._id === r._id ? '1px solid #6366f1' : '1px solid transparent', 
// // // // // // //                       boxShadow: editingRequest?._id === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', 
// // // // // // //                       transition: 'all 0.2s' 
// // // // // // //                     }}
// // // // // // //                   >
// // // // // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // //                       <div style={{ fontWeight: '700', color: editingRequest?._id === r._id ? '#6366f1' : '#1e293b' }}>
// // // // // // //                         {r.userId?.name || 'Unknown User'}
// // // // // // //                       </div>
// // // // // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
// // // // // // //                         {new Date(r.createdAt).toLocaleDateString()}
// // // // // // //                       </div>
// // // // // // //                     </div>
// // // // // // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
// // // // // // //                       <span>{r.godownId?.name || "Main Godown"} • {r.items?.length} Items</span>
// // // // // // //                       <span
// // // // // // //   style={{
// // // // // // //     background:
// // // // // // //   r.status === "pending"
// // // // // // //     ? "#fee2e2"
// // // // // // //     : r.status === "confirmed"
// // // // // // //     ? "#dbeafe"
// // // // // // //     : r.status === "received"
// // // // // // //     ? "#dcfce7"
// // // // // // //     : r.status === "partially_received"
// // // // // // //     ? "#f3e8ff"
// // // // // // //     : r.status === "rejected"
// // // // // // //     ? "#fee2e2"
// // // // // // //     : "#f1f5f9",
// // // // // // //     // background:
// // // // // // //     //   r.status === "pending"
// // // // // // //     //     ? "#fee2e2"          // red
// // // // // // //     //     : r.status === "confirmed"
// // // // // // //     //     ? "#dbeafe"          // blue
// // // // // // //     //     : r.status === "received"
// // // // // // //     //     ? "#dcfce7"          // green
// // // // // // //     //     : r.status === "partially_received"
// // // // // // //     //     ? "#f3e8ff"          // purple
// // // // // // //     //     : "#f1f5f9",

// // // // // // //     color:
// // // // // // //       r.status === "pending"
// // // // // // //         ? "#dc2626"
// // // // // // //         : r.status === "confirmed"
// // // // // // //         ? "#2563eb"
// // // // // // //         : r.status === "received"
// // // // // // //         ? "#16a34a"
// // // // // // //         : r.status === "partially_received"
// // // // // // //         ? "#9333ea"          // purple text
// // // // // // //         : "#64748b",

// // // // // // //     padding: "2px 8px",
// // // // // // //     borderRadius: "6px",
// // // // // // //     fontSize: "10px",
// // // // // // //     fontWeight: "700"
// // // // // // //   }}
// // // // // // // >
// // // // // // //   {r.status?.replaceAll("_", " ").toUpperCase()}
// // // // // // // </span>
// // // // // // //                     </div>
// // // // // // //                   </div>
// // // // // // //                 ))}
// // // // // // //               </div>
// // // // // // //             </div>

// // // // // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // // //               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
// // // // // // //                 {editingRequest ? (
// // // // // // //                   <>
// // // // // // //                     <div>
// // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>SOURCE GODOWN</div>
// // // // // // //                       <div style={{ fontWeight: '800', fontSize: '18px', color: '#0f172a' }}>
// // // // // // //                         {editingRequest.godownId?.name || "General"}
// // // // // // //                       </div>
// // // // // // //                     </div>
// // // // // // //                     <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
// // // // // // //                       <button
// // // // // // //                         onClick={handleDownloadAllRequestsExcel}
// // // // // // //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// // // // // // //                       >
// // // // // // //                         <FileSpreadsheet size={16} /> Export All Requests
// // // // // // //                       </button>
// // // // // // //                       <div style={{ textAlign: 'right' }}>
// // // // // // //                         <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>ESTIMATED VALUATION</div>
// // // // // // //                         <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>
// // // // // // //                           ₹{editingRequest.items.reduce((sum, i) => sum + (Number(i.qtyBaseUnit || 0) * Number(i.price || 0)), 0).toLocaleString()}
// // // // // // //                         </div>
// // // // // // //                       </div>
// // // // // // //                     </div>
// // // // // // //                   </>
// // // // // // //                 ) : (
// // // // // // //                   <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
// // // // // // //                     <input
// // // // // // //   type="date"
// // // // // // //   value={selectedDate}
// // // // // // //   onChange={(e) => setSelectedDate(e.target.value)}
// // // // // // //   style={{
// // // // // // //     padding: "8px 12px",
// // // // // // //     borderRadius: "10px",
// // // // // // //     border: "1px solid #e2e8f0",
// // // // // // //     fontSize: "13px"
// // // // // // //   }}
// // // // // // // />
// // // // // // //                      <button
// // // // // // //                         onClick={handleDownloadAllRequestsExcel}
// // // // // // //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// // // // // // //                       >
// // // // // // //                         <FileSpreadsheet size={16} /> Export All Requests
// // // // // // //                       </button>
// // // // // // //                   </div>
// // // // // // //                 )}
// // // // // // //               </div>

// // // // // // //               {editingRequest ? (
// // // // // // //                 <>
// // // // // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // //                       <thead>
// // // // // // //                         <tr style={{ textAlign: 'left' }}>
// // // // // // //                           <th style={{ width: "40px" }}>
// // // // // // //   <input
// // // // // // //     type="checkbox"
// // // // // // //     checked={selectAll}
// // // // // // //     disabled={editingRequest?.status !== "pending"}
// // // // // // //     onChange={(e) => {
// // // // // // //       const checked = e.target.checked;
// // // // // // //       setSelectAll(checked);

// // // // // // //       const newApproved = {};

// // // // // // //       if (checked) {
// // // // // // //   editingRequest.items.forEach(it => {
// // // // // // //     const id = it.stockItemId?._id || it.stockItemId;

// // // // // // //     // skip rejected items
// // // // // // //     if (!rejectedItems[id]) {
// // // // // // //       newApproved[id] = true;
// // // // // // //     }
// // // // // // //   });
// // // // // // // }

// // // // // // //       setApprovedItems(newApproved);
// // // // // // //     }}
// // // // // // //   />
// // // // // // // </th>
// // // // // // // <th>ITEM</th>
// // // // // // //                           {/* <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th> */}
// // // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// // // // // // //                           {/* <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', width: '140px' }}>QTY</th> */}
// // // // // // //                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
// // // // // // //   REQUESTED
// // // // // // // </th>

// // // // // // // <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
// // // // // // //   RECEIVED
// // // // // // // </th>
// // // // // // // <th
// // // // // // //   style={{
// // // // // // //     padding: '24px 0 12px',
// // // // // // //     fontSize: '11px',
// // // // // // //     fontWeight: '900',
// // // // // // //     color: '#94a3b8',
// // // // // // //     borderBottom: '1px solid #e2e8f0',
// // // // // // //     textAlign: 'right'
// // // // // // //   }}
// // // // // // // >
// // // // // // //   ACTION
// // // // // // // </th>
// // // // // // //                         </tr>
// // // // // // //                       </thead>
// // // // // // //                       <tbody>
// // // // // // //                         {editingRequest.items.map((it, idx) => (
// // // // // // //                           <tr
// // // // // // //   key={idx}
// // // // // // //   style={{
// // // // // // //     background:
// // // // // // //       it.status === "rejected"
// // // // // // //         ? "#fef2f2"
// // // // // // //         : "transparent"
// // // // // // //   }}
// // // // // // // >
// // // // // // //   <td>
// // // // // // //     <input
// // // // // // //   type="checkbox"
// // // // // // //   disabled={editingRequest.status !== "pending"}
// // // // // // //   checked={!!approvedItems[it.stockItemId?._id || it.stockItemId]}
      
// // // // // // //   onChange={(e) => {
// // // // // // //   const id = it.stockItemId?._id || it.stockItemId;
// // // // // // //   const checked = e.target.checked;

// // // // // // //   setApprovedItems(prev => ({
// // // // // // //     ...prev,
// // // // // // //     [id]: checked
// // // // // // //   }));

// // // // // // //   if (checked) {
// // // // // // //     // remove rejected badge when selected again
// // // // // // //     setRejectedItems(prev => {
// // // // // // //       const copy = { ...prev };
// // // // // // //       delete copy[id];
// // // // // // //       return copy;
// // // // // // //     });
// // // // // // //   } else {
// // // // // // //     // show rejected badge when unchecked
// // // // // // //     setRejectedItems(prev => ({
// // // // // // //       ...prev,
// // // // // // //       [id]: true
// // // // // // //     }));
// // // // // // //   }

// // // // // // //   setSelectAll(false);
// // // // // // // }}
// // // // // // //     />
// // // // // // //   </td>
// // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(it)}</div>
// // // // // // //                             </td>
// // // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// // // // // // //                                 {getGroupName(it)}
// // // // // // //                               </span>
// // // // // // //                             </td>
// // // // // // //                            {/* REQUESTED COLUMN */}
// // // // // // // <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700' }}>
// // // // // // //   {formatQty(it.qtyBaseUnit)}{" "}
// // // // // // //   <span style={{ fontSize: '12px', color: '#64748b' }}>
// // // // // // //     {getUnitSymbol(it)}
// // // // // // //   </span>
// // // // // // // </td>

// // // // // // // {/* RECEIVED COLUMN */}
// // // // // // // <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700', color: '#16a34a' }}>
// // // // // // //   {formatQty(it.receivedQty)}{" "}
// // // // // // //   <span style={{ fontSize: '12px', color: '#64748b' }}>
// // // // // // //     {getUnitSymbol(it)}
// // // // // // //   </span>

// // // // // // //   {(it.receivedQty || 0) >= (it.qtyBaseUnit || 0) && (
// // // // // // //     <div style={{ fontSize: "10px", color: "#16a34a" }}>
// // // // // // //       ✔ Fully Received
// // // // // // //     </div>
// // // // // // //   )}
// // // // // // // </td>
// // // // // // // {/* {it.status === "rejected" && (
// // // // // // //   <button
// // // // // // //     onClick={async () => {
// // // // // // //       try {
// // // // // // //         await api.patch(
// // // // // // //           `/indent-requests/${editingRequest._id}/select-item`,
// // // // // // //           {
// // // // // // //             stockItemId:
// // // // // // //               it.stockItemId?._id || it.stockItemId
// // // // // // //           }
// // // // // // //         );

// // // // // // //         showToast(
// // // // // // //           "Item approved successfully",
// // // // // // //           "success"
// // // // // // //         );

// // // // // // //         fetchIndentRequests();

// // // // // // //       } catch {
// // // // // // //         showToast(
// // // // // // //           "Failed to approve item",
// // // // // // //           "error"
// // // // // // //         );
// // // // // // //       }
// // // // // // //     }}
// // // // // // //     style={{
// // // // // // //       background: "#dcfce7",
// // // // // // //       color: "#16a34a",
// // // // // // //       border: "1px solid #bbf7d0",
// // // // // // //       padding: "6px 12px",
// // // // // // //       borderRadius: "8px",
// // // // // // //       cursor: "pointer",
// // // // // // //       fontWeight: "700",
// // // // // // //       fontSize: "12px"
// // // // // // //     }}
// // // // // // //   >
// // // // // // //     Select Again
// // // // // // //   </button>
// // // // // // // )} */}

// // // // // // // <td
// // // // // // //   style={{
// // // // // // //     padding: '20px 0',
// // // // // // //     borderBottom: '1px solid #f8fafc',
// // // // // // //     textAlign: 'right'
// // // // // // //   }}
// // // // // // // >
// // // // // // //   {/* {it.status === "rejected" ? (
// // // // // // //     <span
// // // // // // //       style={{
// // // // // // //         background: "#fee2e2",
// // // // // // //         color: "#dc2626",
// // // // // // //         padding: "6px 12px",
// // // // // // //         borderRadius: "8px",
// // // // // // //         fontSize: "12px",
// // // // // // //         fontWeight: "700"
// // // // // // //       }}
// // // // // // //     >
// // // // // // //       REJECTED
// // // // // // //     </span>
// // // // // // //   ) : (
// // // // // // //     editingRequest.status === "pending" && (
// // // // // // //       rejectedItems[it.stockItemId?._id || it.stockItemId] ? (
// // // // // // //         <button
// // // // // // //           onClick={() => {
// // // // // // //             const id = it.stockItemId?._id || it.stockItemId;

// // // // // // //             setRejectedItems(prev => {
// // // // // // //               const copy = { ...prev };
// // // // // // //               delete copy[id];
// // // // // // //               return copy;
// // // // // // //             });

// // // // // // //             setApprovedItems(prev => ({
// // // // // // //               ...prev,
// // // // // // //               [id]: true
// // // // // // //             }));
// // // // // // //           }}
// // // // // // //           style={{
// // // // // // //             background: "#dcfce7",
// // // // // // //             color: "#16a34a",
// // // // // // //             border: "1px solid #bbf7d0",
// // // // // // //             padding: "6px 12px",
// // // // // // //             borderRadius: "8px",
// // // // // // //             cursor: "pointer",
// // // // // // //             fontWeight: "700",
// // // // // // //             fontSize: "12px"
// // // // // // //           }}
// // // // // // //         >
// // // // // // //           Select
// // // // // // //         </button>
// // // // // // //       ) : (
// // // // // // //         <button
// // // // // // //           onClick={() => {
// // // // // // //             const id = it.stockItemId?._id || it.stockItemId;

// // // // // // //             setRejectedItems(prev => ({
// // // // // // //               ...prev,
// // // // // // //               [id]: true
// // // // // // //             }));

// // // // // // //             setApprovedItems(prev => {
// // // // // // //               const copy = { ...prev };
// // // // // // //               delete copy[id];
// // // // // // //               return copy;
// // // // // // //             });
// // // // // // //           }}
// // // // // // //           style={{
// // // // // // //             background: "#fff",
// // // // // // //             color: "#dc2626",
// // // // // // //             border: "1px solid #fecaca",
// // // // // // //             padding: "6px 12px",
// // // // // // //             borderRadius: "8px",
// // // // // // //             cursor: "pointer",
// // // // // // //             fontWeight: "700",
// // // // // // //             fontSize: "12px"
// // // // // // //           }}
// // // // // // //         >
// // // // // // //           Reject
// // // // // // //         </button>
// // // // // // //       )
// // // // // // //     )
// // // // // // //   )} */}
// // // // // // //   {it.status === "rejected" ||
// // // // // // // rejectedItems[it.stockItemId?._id || it.stockItemId] ? (
// // // // // // //   <span
// // // // // // //     style={{
// // // // // // //       background: "#fee2e2",
// // // // // // //       color: "#dc2626",
// // // // // // //       padding: "6px 12px",
// // // // // // //       borderRadius: "8px",
// // // // // // //       fontSize: "12px",
// // // // // // //       fontWeight: "700"
// // // // // // //     }}
// // // // // // //   >
// // // // // // //     REJECTED
// // // // // // //   </span>
// // // // // // // ) : (
// // // // // // //   editingRequest.status === "pending" && (
// // // // // // //     <button
// // // // // // //       onClick={() => {
// // // // // // //         const id = it.stockItemId?._id || it.stockItemId;

// // // // // // //         setRejectedItems(prev => ({
// // // // // // //           ...prev,
// // // // // // //           [id]: true
// // // // // // //         }));

// // // // // // //         setApprovedItems(prev => {
// // // // // // //           const copy = { ...prev };
// // // // // // //           delete copy[id];
// // // // // // //           return copy;
// // // // // // //         });

// // // // // // //         setSelectAll(false);
// // // // // // //       }}
// // // // // // //       style={{
// // // // // // //         background: "#fff",
// // // // // // //         color: "#dc2626",
// // // // // // //         border: "1px solid #fecaca",
// // // // // // //         padding: "6px 12px",
// // // // // // //         borderRadius: "8px",
// // // // // // //         cursor: "pointer",
// // // // // // //         fontWeight: "700",
// // // // // // //         fontSize: "12px"
// // // // // // //       }}
// // // // // // //     >
// // // // // // //       Reject
// // // // // // //     </button>
// // // // // // //   )
// // // // // // // )}
// // // // // // // </td>                            
// // // // // // //                           </tr>
// // // // // // //                         ))}
// // // // // // //                       </tbody>
// // // // // // //                     </table>
// // // // // // //                   </div>

// // // // // // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // // //                     <button 
// // // // // // //                       onClick={() => setEditingRequest(null)} 
// // // // // // //                       style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
// // // // // // //                     >
// // // // // // //                       Cancel
// // // // // // //                     </button>
// // // // // // // {editingRequest.status === "pending" && (
// // // // // // //   <>
// // // // // // //     <button
// // // // // // //       onClick={rejectEntireRequest}
// // // // // // //       style={{
// // // // // // //         background: "#dc2626",
// // // // // // //         border: "none",
// // // // // // //         color: "#fff",
// // // // // // //         padding: "12px 24px",
// // // // // // //         borderRadius: "12px",
// // // // // // //         fontWeight: "700",
// // // // // // //         cursor: "pointer"
// // // // // // //       }}
// // // // // // //     >
// // // // // // //       Reject Entire Request
// // // // // // //     </button>

// // // // // // //     <button
// // // // // // //       onClick={confirmRequest}
// // // // // // //       style={{
// // // // // // //         background: "#6366f1",
// // // // // // //         border: "none",
// // // // // // //         color: "#fff",
// // // // // // //         padding: "12px 24px",
// // // // // // //         borderRadius: "12px",
// // // // // // //         fontWeight: "700",
// // // // // // //         fontSize: "13px",
// // // // // // //         cursor: "pointer",
// // // // // // //         display: "flex",
// // // // // // //         alignItems: "center",
// // // // // // //         gap: "8px"
// // // // // // //       }}
// // // // // // //     >
// // // // // // //       Confirm Request
// // // // // // //     </button>
// // // // // // //   </>
// // // // // // // )}
// // // // // // //                     {/* {!["confirmed", "received", "partially_received"].includes(editingRequest.status) && (
// // // // // // //   <button onClick={confirmRequest}
// // // // // // //                         style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
// // // // // // //                       >
// // // // // // //                         Confirm Request
// // // // // // //                       </button>
// // // // // // //                     )} */}
// // // // // // //                   </div>
// // // // // // //                 </>
// // // // // // //               ) : (
// // // // // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// // // // // // //                   Select a request from the sidebar to review and convert
// // // // // // //                 </div>
// // // // // // //               )}
// // // // // // //             </div>
// // // // // // //           </>
// // // // // // //         )}

// // // // // // //         {/* VIEW: CREATE NEW (MANUAL) */}
// // // // // // //         {view === "create" && (
// // // // // // //           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
// // // // // // //             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // //               <div>
// // // // // // //                 <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Create Requisition</h2>
// // // // // // //                 <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
// // // // // // //                     <span onClick={() => setTab("stock-items")} style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: tab === 'stock-items' ? '#6366f1' : '#64748b' }}>Stock Items</span>
// // // // // // //                 </div>
// // // // // // //               </div>
// // // // // // //               <div style={{ textAlign: 'right' }}>
// // // // // // //                 <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>ESTIMATED TOTAL</div>
// // // // // // //                 <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{Object.values(selectedItems).reduce((sum, i) => i.checked ? sum + (Number(i.qty || 0) * Number(i.price || 0)) : sum, 0).toLocaleString()}</div>
// // // // // // //               </div>
// // // // // // //             </div>

// // // // // // //             <div style={{ flex: 1, overflowY: 'auto' }}>
// // // // // // //               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // //                 <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
// // // // // // //                   <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // // //                     <th style={{ padding: '20px 32px', width: '50px' }}>
// // // // // // //                         <input type="checkbox" onChange={(e) => {
// // // // // // //                            const isChecked = e.target.checked;
// // // // // // //                            const newSelection = { ...selectedItems };
// // // // // // //                            filteredStock.forEach(item => {
// // // // // // //                              newSelection[item._id] = { ...(newSelection[item._id] || { qty: 0, price: 0 }), checked: isChecked };
// // // // // // //                            });
// // // // // // //                            setSelectedItems(newSelection);
// // // // // // //                         }} style={{ width: '18px', height: '18px' }} />
// // // // // // //                     </th>
// // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>NAME</th>
// // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>STOCK GROUP</th>
// // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '140px' }}>QTY</th>
// // // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '100px' }}>PRICE</th>
// // // // // // //                     <th style={{ padding: '20px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>ITEM TOTAL</th>
// // // // // // //                   </tr>
// // // // // // //                 </thead>
// // // // // // //                 <tbody>
// // // // // // //                   {filteredStock.map((row) => {
// // // // // // //                     const state = selectedItems[row._id] || { checked: false, qty: 0, price: 0 };
// // // // // // //                     const itemTotal = Number(state.qty || 0) * Number(state.price || 0);
// // // // // // //                     return (
// // // // // // //                       <tr key={row._id} style={{ borderBottom: '1px solid #f8fafc', background: state.checked ? '#fcfdff' : 'transparent' }}>
// // // // // // //                         <td style={{ padding: '16px 32px' }}>
// // // // // // //                           <input type="checkbox" checked={state.checked} onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, checked: e.target.checked } }))} style={{ width: '18px', height: '18px' }} />
// // // // // // //                         </td>
// // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
// // // // // // //                             <span style={{ fontWeight: '700', color: '#1e293b' }}>{row.name}</span>
// // // // // // //                           </div>
// // // // // // //                         </td>
// // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // //                           <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
// // // // // // //                             {row.stockGroupId?.name || 'Unassigned'}
// // // // // // //                           </span>
// // // // // // //                         </td>
// // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // //                             <input type="number" disabled={!state.checked} value={state.qty} placeholder="0" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, qty: e.target.value } }))} style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // // // // //                             <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{row.unitId?.symbol}</span>
// // // // // // //                           </div>
// // // // // // //                         </td>
// // // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // // //                             <input type="number" disabled={!state.checked} value={state.price} placeholder="₹" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, price: e.target.value } }))} style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // // // // //                         </td>
// // // // // // //                         <td style={{ padding: '16px 32px', textAlign: 'right', fontWeight: '800', color: state.checked ? '#6366f1' : '#94a3b8' }}>
// // // // // // //                           ₹{itemTotal.toLocaleString()}
// // // // // // //                         </td>
// // // // // // //                       </tr>
// // // // // // //                     );
// // // // // // //                   })}
// // // // // // //                 </tbody>
// // // // // // //               </table>
// // // // // // //             </div>
// // // // // // //             <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // // // // // //               <button onClick={submitIndent} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
// // // // // // //                 Submit Requisition
// // // // // // //               </button>
// // // // // // //             </div>
// // // // // // //           </div>
// // // // // // //         )}
// // // // // // //       </div>
// // // // // // //     </div>
// // // // // // //   );
// // // // // // // };







// // // // // // // this is the same day after git hub push









// // // // // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // // // // import { api } from "../api.js";
// // // // // // import { useToast } from "../toast.jsx";
// // // // // // import * as XLSX from "xlsx";
// // // // // // import { 
// // // // // //   Search, FileSpreadsheet, CheckCircle2, Inbox, 
// // // // // //   ClipboardList, PlusCircle, RefreshCw, X, Save 
// // // // // // } from "lucide-react";

// // // // // // export const IndentPage = () => {
// // // // // //   const { showToast } = useToast();
// // // // // //   const [selectedDate, setSelectedDate] = useState("");
// // // // // //   // View State
// // // // // //   const [view, setView] = useState("history"); 
// // // // // //   const [tab, setTab] = useState("stock-items");
// // // // // //   const [searchTerm, setSearchTerm] = useState("");
  
// // // // // //   // Data State
// // // // // //   const [stockItems, setStockItems] = useState([]);
// // // // // //   const [indents, setIndents] = useState([]);
// // // // // //   const [indentRequests, setIndentRequests] = useState([]);
// // // // // //   const [selectedItems, setSelectedItems] = useState({});
// // // // // //   const [selectedId, setSelectedId] = useState(null);

// // // // // //   // --- Editing State for Requests ---
// // // // // //   const [editingRequest, setEditingRequest] = useState(null);
// // // // // //   const [approvedItems, setApprovedItems] = useState({});
// // // // // //   const [rejectedItems, setRejectedItems] = useState({});
// // // // // //   const [selectAll, setSelectAll] = useState(false);

// // // // // //   // --- Data Loading ---
// // // // // //   const load = useCallback(async () => {
// // // // // //     try {
// // // // // //       const [itemsRes, indentRes] = await Promise.all([
// // // // // //         api.get("/inventory/stock-items"),
// // // // // //         api.get("/indents")
// // // // // //       ]);
// // // // // //       setStockItems(itemsRes.data || []);
// // // // // //       const sorted = (indentRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // //       setIndents(sorted);
// // // // // //       if (sorted.length > 0 && !selectedId) setSelectedId(sorted[0]._id);
// // // // // //     } catch (error) {
// // // // // //       showToast("Failed to load data", "error");
// // // // // //     }
// // // // // //   }, [showToast, selectedId]);

// // // // // //   const fetchIndentRequests = useCallback(async () => {
// // // // // //     try {
// // // // // //       const res = await api.get("/indent-requests");
// // // // // //       setIndentRequests(res.data || []);
// // // // // //     } catch (error) {
// // // // // //       showToast("Failed to fetch requests", "error");
// // // // // //     }
// // // // // //   }, [showToast]);

// // // // // //   useEffect(() => { 
// // // // // //     load(); 
// // // // // //     if (view === "requests") fetchIndentRequests();
// // // // // //   }, [load, fetchIndentRequests, view]);

// // // // // //   // --- Helper Functions ---
// // // // // //   const getUnitSymbol = (item) => {
// // // // // //     if (item.stockItemId?.unitId?.symbol) return item.stockItemId.unitId.symbol;
// // // // // //     if (item.unitId?.symbol) return item.unitId.symbol;
// // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // //     return found?.unitId?.symbol || "";
// // // // // //   };

// // // // // //   const formatQty = (value) => {
// // // // // //   const num = Number(value || 0);
// // // // // //   return Number(num.toFixed(3)).toString();
// // // // // // };
// // // // // //   const getItemName = (item) => {
// // // // // //     if (item.stockItemId?.name) return item.stockItemId.name;
// // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // //     return found ? found.name : "Unknown Product";
// // // // // //   };


// // // // // //   const getGroupName = (item) => {
// // // // // //     if (item.stockItemId?.stockGroupId?.name) return item.stockItemId.stockGroupId.name;
// // // // // //     if (item.stockGroupId?.name) return item.stockGroupId.name;
// // // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // // //     const found = stockItems.find(s => s._id === id);
// // // // // //     return found?.stockGroupId?.name || "General";
// // // // // //   };

// // // // // // const handleDownloadAllRequestsExcel = () => {
// // // // // //   if (!indentRequests.length) {
// // // // // //     return showToast("No requests available", "info");
// // // // // //   }

// // // // // //   let filtered = [...indentRequests];

// // // // // //   if (selectedDate) {
// // // // // //   // single date mode
// // // // // //   filtered = filtered.filter(r => {
// // // // // //     const d = new Date(r.createdAt).toISOString().split("T")[0];
// // // // // //     return d === selectedDate;
// // // // // //   });
// // // // // // }
// // // // // // const isSingleDate = !!selectedDate;
// // // // // //   if (!filtered.length) {
// // // // // //     return showToast("No requests found for selected date", "info");
// // // // // //   }

// // // // // //   filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

// // // // // //   // const branches = [
// // // // // //   //   ...new Set(filtered.map(r => r.godownId?.name || "General"))
// // // // // //   // ];

// // // // // //   // const itemMap = {};

// // // // // //   // filtered.forEach(req => {
// // // // // //   //   const branch = req.godownId?.name || "General";

// // // // // //   //   req.items.forEach(it => {
// // // // // //   //     const id = it.stockItemId?._id || it.stockItemId;

// // // // // //   //     if (!itemMap[id]) {
// // // // // //   //       itemMap[id] = {
// // // // // //   //         name: getItemName(it),
// // // // // //   //         group: getGroupName(it),
// // // // // //   //         unit: getUnitSymbol(it),
// // // // // //   //         requestedTotal: 0,
// // // // // //   //         receivedTotal: 0,
// // // // // //   //         branches: {}
// // // // // //   //       };
// // // // // //   //     }

// // // // // //   //     const reqQty = Number(it.qtyBaseUnit || 0);
// // // // // //   //     const recQty = Number(it.receivedQty || 0);

// // // // // //   //     itemMap[id].requestedTotal += reqQty;
// // // // // //   //     itemMap[id].receivedTotal += recQty;

// // // // // //   //     if (!itemMap[id].branches[branch]) {
// // // // // //   //       itemMap[id].branches[branch] = { requested: 0, received: 0 };
// // // // // //   //     }

// // // // // //   //     itemMap[id].branches[branch].requested += reqQty;
// // // // // //   //     itemMap[id].branches[branch].received += recQty;
// // // // // //   //   });
// // // // // //   // });

// // // // // //   // const items = Object.values(itemMap);

// // // // // //   // const aoa = [];

// // // // // //   // aoa.push(["MONTESSORI INDENT REQUEST"]);
// // // // // //   // aoa.push([`Date: ${selectedDate || "All Dates"}`]);
// // // // // //   // aoa.push([]);

// // // // // //   // const header = [
// // // // // //   //   "S.No",
// // // // // //   //   "Stock Item",
// // // // // //   //   "Stock Group",
// // // // // //   //   "Unit",
// // // // // //   //   "Requested (Total)",
// // // // // //   //   "Received (Total)"
// // // // // //   // ];

// // // // // //   // branches.forEach(b => {
// // // // // //   //   header.push(`${b} - Requested`);
// // // // // //   //   header.push(`${b} - Received`);
// // // // // //   // });

// // // // // //   // aoa.push(header);

// // // // // //   // items.forEach((it, index) => {
// // // // // //   //   const row = [
// // // // // //   //     index + 1,
// // // // // //   //     it.name,
// // // // // //   //     it.group,
// // // // // //   //     it.unit,
// // // // // //   //     it.requestedTotal,
// // // // // //   //     it.receivedTotal
// // // // // //   //   ];

// // // // // //   //   branches.forEach(b => {
// // // // // //   //     row.push(it.branches[b]?.requested || 0);
// // // // // //   //     row.push(it.branches[b]?.received || 0);
// // // // // //   //   });

// // // // // //   //   aoa.push(row);
// // // // // //   // });
// // // // // // // const isSingleDate = !!selectedDate;

// // // // // // let groupedByDate = {};

// // // // // // if (!isSingleDate) {
// // // // // //   filtered.forEach(req => {
// // // // // //     const date = new Date(req.createdAt).toISOString().split("T")[0];

// // // // // //     if (!groupedByDate[date]) groupedByDate[date] = [];
// // // // // //     groupedByDate[date].push(req);
// // // // // //   });
// // // // // // }

// // // // // // const aoa = [];

// // // // // // aoa.push(["MONTESSORI INDENT ALL REQUESTS"]);
// // // // // // aoa.push([]);
// // // // // // if (isSingleDate) {
// // // // // //   const branches = [
// // // // // //     ...new Set(filtered.map(r => r.godownId?.name || "General"))
// // // // // //   ];

// // // // // //   const itemMap = {};

// // // // // //   filtered.forEach(req => {
// // // // // //     const branch = req.godownId?.name || "General";

// // // // // //     req.items.forEach(it => {
// // // // // //       const id = it.stockItemId?._id || it.stockItemId;

// // // // // //       if (!itemMap[id]) {
// // // // // //         itemMap[id] = {
// // // // // //           name: getItemName(it),
// // // // // //           group: getGroupName(it),
// // // // // //           unit: getUnitSymbol(it),
// // // // // //           requestedTotal: 0,
// // // // // //           receivedTotal: 0,
// // // // // //           branches: {}
// // // // // //         };
// // // // // //       }

// // // // // //       const reqQty = Number(it.qtyBaseUnit || 0);
// // // // // //       const recQty = Number(it.receivedQty || 0);

// // // // // //       itemMap[id].requestedTotal += reqQty;
// // // // // //       itemMap[id].receivedTotal += recQty;

// // // // // //       if (!itemMap[id].branches[branch]) {
// // // // // //         itemMap[id].branches[branch] = { requested: 0, received: 0 };
// // // // // //       }

// // // // // //       itemMap[id].branches[branch].requested += reqQty;
// // // // // //       itemMap[id].branches[branch].received += recQty;
// // // // // //     });
// // // // // //   });

// // // // // //   const items = Object.values(itemMap);

// // // // // //   aoa.push([`DATE: ${selectedDate}`]);
// // // // // //   aoa.push([]);

// // // // // //   const header = [
// // // // // //     "S.No",
// // // // // //     "Stock Item",
// // // // // //     "Stock Group",
// // // // // //     "Unit",
// // // // // //     "Requested (Total)",
// // // // // //     "Received (Total)"
// // // // // //   ];

// // // // // //   branches.forEach(b => {
// // // // // //     header.push(`${b} - Requested`);
// // // // // //     header.push(`${b} - Received`);
// // // // // //   });

// // // // // //   aoa.push(header);

// // // // // //   items.forEach((it, index) => {
// // // // // //     const row = [
// // // // // //       index + 1,
// // // // // //       it.name,
// // // // // //       it.group,
// // // // // //       it.unit,
// // // // // //       it.requestedTotal,
// // // // // //       it.receivedTotal
// // // // // //     ];

// // // // // //     branches.forEach(b => {
// // // // // //       row.push(it.branches[b]?.requested || 0);
// // // // // //       row.push(it.branches[b]?.received || 0);
// // // // // //     });

// // // // // //     aoa.push(row);
// // // // // //   });

// // // // // // } else {Object.keys(groupedByDate)
// // // // // //   .sort((a, b) => new Date(a) - new Date(b))
// // // // // //   .forEach(date => {
// // // // // //     const requests = groupedByDate[date];

// // // // // //     const branches = [
// // // // // //       ...new Set(requests.map(r => r.godownId?.name || "General"))
// // // // // //     ];

// // // // // //     const itemMap = {};

// // // // // //     requests.forEach(req => {
// // // // // //       const branch = req.godownId?.name || "General";

// // // // // //       req.items.forEach(it => {
// // // // // //         const id = it.stockItemId?._id || it.stockItemId;

// // // // // //         if (!itemMap[id]) {
// // // // // //           itemMap[id] = {
// // // // // //             name: getItemName(it),
// // // // // //             group: getGroupName(it),
// // // // // //             unit: getUnitSymbol(it),
// // // // // //             requestedTotal: 0,
// // // // // //             receivedTotal: 0,
// // // // // //             branches: {}
// // // // // //           };
// // // // // //         }

// // // // // //         const reqQty = Number(it.qtyBaseUnit || 0);
// // // // // //         const recQty = Number(it.receivedQty || 0);

// // // // // //         itemMap[id].requestedTotal += reqQty;
// // // // // //         itemMap[id].receivedTotal += recQty;

// // // // // //         if (!itemMap[id].branches[branch]) {
// // // // // //           itemMap[id].branches[branch] = { requested: 0, received: 0 };
// // // // // //         }

// // // // // //         itemMap[id].branches[branch].requested += reqQty;
// // // // // //         itemMap[id].branches[branch].received += recQty;
// // // // // //       });
// // // // // //     });

// // // // // //     const items = Object.values(itemMap);

// // // // // //     aoa.push([`DATE: ${date}`]);
// // // // // //     aoa.push([]);

// // // // // //     const header = [
// // // // // //       "S.No",
// // // // // //       "Stock Item",
// // // // // //       "Stock Group",
// // // // // //       "Unit",
// // // // // //       "Requested (Total)",
// // // // // //       "Received (Total)"
// // // // // //     ];

// // // // // //     branches.forEach(b => {
// // // // // //       header.push(`${b} - Requested`);
// // // // // //       header.push(`${b} - Received`);
// // // // // //     });

// // // // // //     aoa.push(header);

// // // // // //     items.forEach((it, index) => {
// // // // // //       const row = [
// // // // // //         index + 1,
// // // // // //         it.name,
// // // // // //         it.group,
// // // // // //         it.unit,
// // // // // //         it.requestedTotal,
// // // // // //         it.receivedTotal
// // // // // //       ];

// // // // // //       branches.forEach(b => {
// // // // // //         row.push(it.branches[b]?.requested || 0);
// // // // // //         row.push(it.branches[b]?.received || 0);
// // // // // //       });

// // // // // //       aoa.push(row);
// // // // // //     });

// // // // // //     aoa.push([]);
// // // // // //   });

// // // // // // }
// // // // // // const maxCols = Math.max(...aoa.map(row => row.length));
// // // // // //   const ws = XLSX.utils.aoa_to_sheet(aoa);

// // // // // //   // ws["!merges"] = [
// // // // // //   //   {
// // // // // //   //     s: { r: 0, c: 0 },
// // // // // //   //     e: { r: 0, c: header.length - 1 }
// // // // // //   //   }
// // // // // //   // ];
// // // // // //   ws["!merges"] = [
// // // // // //   {
// // // // // //     s: { r: 0, c: 0 },
// // // // // //     e: { r: 0, c: maxCols - 1 }
// // // // // //   }
// // // // // // ];

// // // // // //   const wb = XLSX.utils.book_new();
// // // // // //   XLSX.utils.book_append_sheet(wb, ws, "Indent Report");

// // // // // //   const fileName = selectedDate
// // // // // //     ? `Montessori_Indent_${selectedDate}.xlsx`
// // // // // //     : "Montessori_Indent_All.xlsx";

// // // // // //   XLSX.writeFile(wb, fileName);

// // // // // //   showToast("Excel exported successfully", "success");
// // // // // // };

// // // // // // //   const handleDownloadAllRequestsExcel = () => {
// // // // // // //   if (!indentRequests.length) {
// // // // // // //     return showToast("No requests available", "info");
// // // // // // //   }

// // // // // // //   let filteredRequests = indentRequests;

// // // // // // //   if (selectedDate) {
// // // // // // //     filteredRequests = indentRequests.filter(r => {
// // // // // // //       const reqDate = new Date(r.createdAt).toISOString().split("T")[0];
// // // // // // //       return reqDate === selectedDate;
// // // // // // //     });
// // // // // // //   }

// // // // // // //   if (!filteredRequests.length) {
// // // // // // //     return showToast("No requests found for selected date", "info");
// // // // // // //   }

// // // // // // //   const godownNames = [
// // // // // // //     ...new Set(filteredRequests.map(r => r.godownId?.name || "General"))
// // // // // // //   ];

// // // // // // //   const itemMap = {};

// // // // // // //   filteredRequests.forEach(req => {
// // // // // // //     const godownName = req.godownId?.name || "General";

// // // // // // //     req.items.forEach(item => {
// // // // // // //       const id = item.stockItemId?._id || item.stockItemId;

// // // // // // //       if (!itemMap[id]) {
// // // // // // //         itemMap[id] = {
// // // // // // //           stockItem: getItemName(item),
// // // // // // //           group: getGroupName(item),
// // // // // // //           unit: getUnitSymbol(item),
// // // // // // //           totalQty: 0,
// // // // // // //           godowns: {}
// // // // // // //         };
// // // // // // //       }

// // // // // // //       const qty = Number(item.qtyBaseUnit || 0);
// // // // // // //       itemMap[id].totalQty += qty;
// // // // // // //       itemMap[id].godowns[godownName] =
// // // // // // //         (itemMap[id].godowns[godownName] || 0) + qty;
// // // // // // //     });
// // // // // // //   });

// // // // // // //   const excelData = Object.values(itemMap).map((item, index) => {
// // // // // // //     const row = {
// // // // // // //       "S.No": index + 1,
// // // // // // //       "Stock Item": item.stockItem,
// // // // // // //       "Stock Group": item.group,
// // // // // // //       "Quantity": item.totalQty,
// // // // // // //       "Unit": item.unit
// // // // // // //     };

// // // // // // //     godownNames.forEach(g => {
// // // // // // //       row[g] = item.godowns[g] || 0;
// // // // // // //     });

// // // // // // //     return row;
// // // // // // //   });

// // // // // // //   const ws = XLSX.utils.json_to_sheet(excelData);
// // // // // // //   const wb = XLSX.utils.book_new();
// // // // // // //   XLSX.utils.book_append_sheet(wb, ws, "Filtered Requests");

// // // // // // //   const fileName = selectedDate
// // // // // // //     ? `Requests_${selectedDate}.xlsx`
// // // // // // //     : "All_Godown_Requests.xlsx";

// // // // // // //   XLSX.writeFile(wb, fileName);

// // // // // // //   showToast("Excel exported successfully", "success");
// // // // // // // };

// // // // // //   const handleDownloadExcel = () => {
// // // // // //     if (!activeIndent) return;
// // // // // //     const data = activeIndent.items.map(item => ({
// // // // // //       "Product": getItemName(item),
// // // // // //       "Group": getGroupName(item),
// // // // // //       "Quantity": item.orderedQty,
// // // // // //       "Unit": getUnitSymbol(item),
// // // // // //       "Price": item.unitPrice,
// // // // // //       "Subtotal": item.orderedQty * item.unitPrice
// // // // // //     }));
// // // // // //     const ws = XLSX.utils.json_to_sheet(data);
// // // // // //     const wb = XLSX.utils.book_new();
// // // // // //     XLSX.utils.book_append_sheet(wb, ws, "Indent");
// // // // // //     XLSX.writeFile(wb, `Indent_${activeIndent.indentNo || 'Export'}.xlsx`);
// // // // // //     showToast("Excel exported successfully", "success");
// // // // // //   };

// // // // // //   const handleStatusUpdate = async (id, newStatus) => {
// // // // // //     try {
// // // // // //       if (newStatus === 'purchased') {
// // // // // //         await api.post(`/indents/${id}/mark-purchased`);
// // // // // //       } else {
// // // // // //         await api.patch(`/indents/${id}`, { status: newStatus });
// // // // // //       }
// // // // // //       showToast(`Indent marked as ${newStatus}`, "success");
// // // // // //       load();
// // // // // //     } catch (error) {
// // // // // //       showToast("Failed to update status", "error");
// // // // // //     }
// // // // // //   };
// // // // // //  const rejectEntireRequest = async () => {
// // // // // //   try {
// // // // // //     await api.patch(
// // // // // //       `/indent-requests/${editingRequest._id}/reject`
// // // // // //     );

// // // // // //     showToast(
// // // // // //       "Request rejected successfully",
// // // // // //       "success"
// // // // // //     );

// // // // // //     setEditingRequest(null);

// // // // // //     fetchIndentRequests();

// // // // // //   } catch (err) {
// // // // // //     showToast(
// // // // // //       "Reject failed",
// // // // // //       "error"
// // // // // //     );
// // // // // //   }
// // // // // // };
// // // // // //   const confirmRequest = async () => {
   
// // // // // //   try {
// // // // // //     const selectedItems = editingRequest.items
// // // // // //       .filter(it => {
// // // // // //         const id = it.stockItemId?._id || it.stockItemId;
// // // // // //         return approvedItems[id];
// // // // // //       })
// // // // // //       .map(it => ({
// // // // // //         stockItemId: it.stockItemId?._id || it.stockItemId,
// // // // // //         qtyBaseUnit: it.qtyBaseUnit
// // // // // //       }));

// // // // // //     if (selectedItems.length === 0) {
// // // // // //       return showToast("Select at least one item", "info");
// // // // // //     }

// // // // // //     await api.patch(`/indent-requests/${editingRequest._id}/confirm`, {
// // // // // //       items: selectedItems
// // // // // //     });

// // // // // //     showToast("Selected items approved!", "success");

// // // // // //     setEditingRequest(null);
// // // // // //     setApprovedItems({});
// // // // // //     fetchIndentRequests();
// // // // // //   } catch (err) {
// // // // // //     showToast("Confirmation failed", "error");
// // // // // //   }
// // // // // // };

// // // // // //   const submitIndent = async () => {
// // // // // //     const itemsToSubmit = Object.keys(selectedItems)
// // // // // //       .filter(id => selectedItems[id].checked && Number(selectedItems[id].qty) > 0)
// // // // // //       .map(id => ({
// // // // // //         stockItemId: id,
// // // // // //         orderedQty: Number(selectedItems[id].qty),
// // // // // //         unitPrice: Number(selectedItems[id].price || 0),
// // // // // //         amount: Number(selectedItems[id].qty) * Number(selectedItems[id].price || 0)
// // // // // //       }));

// // // // // //     if (itemsToSubmit.length === 0) return showToast("Select items with quantity", "info");

// // // // // //     try {
// // // // // //       await api.post("/indents", { items: itemsToSubmit });
// // // // // //       showToast("Indent submitted", "success");
// // // // // //       setSelectedItems({});
// // // // // //       setView("history");
// // // // // //       load();
// // // // // //     } catch (error) {
// // // // // //       showToast("Submission failed", "error");
// // // // // //     }
// // // // // //   };

// // // // // //   // --- Memoized Filters ---
// // // // // //   const filteredIndents = useMemo(() => {
// // // // // //     return indents.filter(i =>
// // // // // //       (i.indentNo?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
// // // // // //       (i._id.includes(searchTerm))
// // // // // //     );
// // // // // //   }, [indents, searchTerm]);

// // // // // //   const filteredStock = useMemo(() => {
// // // // // //     return stockItems.filter(s =>
// // // // // //       s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
// // // // // //       s.stockGroupId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
// // // // // //     );
// // // // // //   }, [stockItems, searchTerm]);
// // // // // // const filteredRequests = useMemo(() => {
// // // // // //   if (!selectedDate) return indentRequests;

// // // // // //   return indentRequests.filter((r) => {
// // // // // //     const reqDate = new Date(r.createdAt)
// // // // // //       .toISOString()
// // // // // //       .split("T")[0];

// // // // // //     return reqDate === selectedDate;
// // // // // //   });
// // // // // // }, [indentRequests, selectedDate]);
// // // // // //   const activeIndent = useMemo(() =>
// // // // // //     indents.find(i => i._id === selectedId) || indents[0],
// // // // // //     [selectedId, indents]);

// // // // // //   const isConfirmed = editingRequest?.status === "confirmed";

// // // // // //   return (
// // // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // // //       {/* Header Area */}
// // // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // // // //             <span style={{ color: '#6366f1' }}>Indents</span>
// // // // // //           </h1>
          
// // // // // //           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
// // // // // //             {[
// // // // // //               { id: 'history', label: 'Logs', icon: <ClipboardList size={14}/> },
// // // // // //               { id: 'requests', label: 'Requests', icon: <Inbox size={14}/> },
// // // // // //               { id: 'create', label: 'Create New', icon: <PlusCircle size={14}/> }
// // // // // //             ].map((btn) => (
// // // // // //               <button 
// // // // // //                 key={btn.id}
// // // // // //                 onClick={() => { setView(btn.id); setSearchTerm(""); setEditingRequest(null); }}
// // // // // //                 style={{ 
// // // // // //                   display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
// // // // // //                   background: view === btn.id ? '#fff' : 'transparent', 
// // // // // //                   color: view === btn.id ? '#6366f1' : '#64748b', 
// // // // // //                   boxShadow: view === btn.id ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' 
// // // // // //                 }}>
// // // // // //                 {btn.icon} {btn.label}
// // // // // //               </button>
// // // // // //             ))}
// // // // // //           </div>
// // // // // //         </div>

// // // // // //         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // //           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // // //           <input
// // // // // //             type="text"
// // // // // //             placeholder="Search..."
// // // // // //             value={searchTerm}
// // // // // //             onChange={(e) => setSearchTerm(e.target.value)}
// // // // // //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
// // // // // //           />
// // // // // //         </div>
// // // // // //       </div>

// // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // //         {/* VIEW: HISTORY/LOGS */}
// // // // // //         {view === "history" && (
// // // // // //           <>
// // // // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>RESULTS ({filteredIndents.length})</div>
// // // // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // //                 {filteredIndents.map(r => (
// // // // // //                   <div key={r._id} onClick={() => setSelectedId(r._id)}
// // // // // //                     style={{ padding: '16px', borderRadius: '16px', cursor: 'pointer', background: selectedId === r._id ? '#fff' : 'transparent', border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent', boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', transition: 'all 0.2s' }}>
// // // // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // //                       <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b' }}>{r.indentNo || `REF-${r._id.slice(-4)}`}</div>
// // // // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
// // // // // //                     </div>
// // // // // //                     <div
// // // // // //   style={{
// // // // // //     fontSize: "12px",
// // // // // //     marginTop: "4px",
// // // // // //     display: "flex",
// // // // // //     justifyContent: "space-between",
// // // // // //     alignItems: "center"
// // // // // //   }}
// // // // // // >
// // // // // //   <span style={{ color: "#64748b" }}>
// // // // // //     ₹{r.totalAmount?.toLocaleString()}
// // // // // //   </span>

// // // // // //   <span
// // // // // //     style={{
// // // // // //       background:
// // // // // //         r.status === "pending"
// // // // // //           ? "#fee2e2"
// // // // // //           : r.status === "purchased"
// // // // // //           ? "#f3e8ff"
// // // // // //           : r.status === "stock_received"
// // // // // //           ? "#dcfce7"
// // // // // //           : "#f1f5f9",

// // // // // //       color:
// // // // // //         r.status === "pending"
// // // // // //           ? "#dc2626"
// // // // // //           : r.status === "purchased"
// // // // // //           ? "#9333ea"
// // // // // //           : r.status === "stock_received"
// // // // // //           ? "#16a34a"
// // // // // //           : "#64748b",

// // // // // //       padding: "2px 8px",
// // // // // //       borderRadius: "6px",
// // // // // //       fontSize: "10px",
// // // // // //       fontWeight: "700"
// // // // // //     }}
// // // // // //   >
// // // // // //     {r.status?.replaceAll("_", " ").toUpperCase()}
// // // // // //   </span>
// // // // // // </div>
// // // // // //                     {/* <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>₹{r.totalAmount?.toLocaleString()} • {r.status.toUpperCase()}</div> */}
// // // // // //                   </div>
// // // // // //                 ))}
// // // // // //               </div>
// // // // // //             </div>

// // // // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // //               {activeIndent ? (
// // // // // //                 <>
// // // // // //                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
// // // // // //                     <div>
// // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>INDENT STATUS</div>
// // // // // //                       <div
// // // // // //   style={{
// // // // // //     padding: "4px 12px",
// // // // // //     borderRadius: "6px",
// // // // // //     fontSize: "12px",
// // // // // //     fontWeight: "800",
// // // // // //     display: "inline-block",

// // // // // //     background:
// // // // // //       activeIndent.status === "pending"
// // // // // //         ? "#fee2e2"
// // // // // //         : activeIndent.status === "purchased"
// // // // // //         ? "#f3e8ff"
// // // // // //         : activeIndent.status === "stock_received"
// // // // // //         ? "#dcfce7"
// // // // // //         : "#f1f5f9",

// // // // // //     color:
// // // // // //       activeIndent.status === "pending"
// // // // // //         ? "#dc2626"
// // // // // //         : activeIndent.status === "purchased"
// // // // // //         ? "#9333ea"
// // // // // //         : activeIndent.status === "stock_received"
// // // // // //         ? "#16a34a"
// // // // // //         : "#64748b"
// // // // // //   }}
// // // // // // >
// // // // // //   {activeIndent.status?.replaceAll("_", " ").toUpperCase()}
// // // // // // </div>
// // // // // //                     </div>
// // // // // //                     <div style={{ textAlign: 'right' }}>
// // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
// // // // // //                       <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activeIndent.totalAmount?.toLocaleString()}</div>
// // // // // //                     </div>
// // // // // //                   </div>
// // // // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // //                       <thead>
// // // // // //                         <tr style={{ textAlign: 'left' }}>
// // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th>
// // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
// // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// // // // // //                         </tr>
// // // // // //                       </thead>
// // // // // //                       <tbody>
// // // // // //                         {activeIndent.items.map((item, idx) => (
// // // // // //                           <tr key={idx}>
// // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(item)}</div>
// // // // // //                               {item.status === "rejected" && (
// // // // // //   <div
// // // // // //     style={{
// // // // // //       display: "inline-block",
// // // // // //       marginTop: "4px",
// // // // // //       background: "#fee2e2",
// // // // // //       color: "#dc2626",
// // // // // //       padding: "2px 8px",
// // // // // //       borderRadius: "6px",
// // // // // //       fontSize: "10px",
// // // // // //       fontWeight: "700"
// // // // // //     }}
// // // // // //   >
// // // // // //     REJECTED
// // // // // //   </div>
// // // // // // )}
// // // // // //                               <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
// // // // // //                             </td>
// // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// // // // // //                                 {getGroupName(item)}
// // // // // //                               </span>
// // // // // //                             </td>
// // // // // //                             <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700', borderBottom: '1px solid #f8fafc' }}>
// // // // // //                                {formatQty(item.orderedQty)} <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: '400'}}>{getUnitSymbol(item)}</span>
// // // // // //                             </td>
// // // // // //                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1', borderBottom: '1px solid #f8fafc' }}>₹{(item.orderedQty * item.unitPrice).toLocaleString()}</td>
// // // // // //                           </tr>
// // // // // //                         ))}
// // // // // //                       </tbody>
// // // // // //                     </table>
// // // // // //                   </div>
// // // // // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // //                     <button onClick={handleDownloadExcel} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // //                       <FileSpreadsheet size={16} /> Export Excel
// // // // // //                     </button>
// // // // // //                     {activeIndent.status.toLowerCase() === 'pending' && (
// // // // // //                       <button onClick={() => handleStatusUpdate(activeIndent._id, 'purchased')} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // //                         <CheckCircle2 size={16} /> Mark Purchased
// // // // // //                       </button>
// // // // // //                     )}
// // // // // //                   </div>
// // // // // //                 </>
// // // // // //               ) : (
// // // // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Select an indent to view details</div>
// // // // // //               )}
// // // // // //             </div>
// // // // // //           </>
// // // // // //         )}

// // // // // //         {/* VIEW: INDENT REQUESTS (INCOMING) */}
// // // // // //         {view === "requests" && (
// // // // // //           <>
// // // // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>
// // // // // //                 ALL REQUESTS ({filteredRequests.length})
// // // // // //               </div>
// // // // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // //                {filteredRequests.map(r => (
// // // // // //                   <div 
// // // // // //                     key={r._id} 
// // // // // //                     onClick={() => {
// // // // // //   setEditingRequest(JSON.parse(JSON.stringify(r)));
// // // // // //   setApprovedItems({});
// // // // // //   setSelectAll(false);
// // // // // // }}
// // // // // //                     style={{ 
// // // // // //                       padding: '16px', 
// // // // // //                       borderRadius: '16px', 
// // // // // //                       cursor: 'pointer', 
// // // // // //                       background: editingRequest?._id === r._id ? '#fff' : 'transparent', 
// // // // // //                       border: editingRequest?._id === r._id ? '1px solid #6366f1' : '1px solid transparent', 
// // // // // //                       boxShadow: editingRequest?._id === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', 
// // // // // //                       transition: 'all 0.2s' 
// // // // // //                     }}
// // // // // //                   >
// // // // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // //                       <div style={{ fontWeight: '700', color: editingRequest?._id === r._id ? '#6366f1' : '#1e293b' }}>
// // // // // //                         {r.userId?.name || 'Unknown User'}
// // // // // //                       </div>
// // // // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
// // // // // //                         {new Date(r.createdAt).toLocaleDateString()}
// // // // // //                       </div>
// // // // // //                     </div>
// // // // // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
// // // // // //                       <span>{r.godownId?.name || "Main Godown"} • {r.items?.length} Items</span>
// // // // // //                       <span
// // // // // //   style={{
// // // // // //     background:
// // // // // //   r.status === "pending"
// // // // // //     ? "#fee2e2"
// // // // // //     : r.status === "confirmed"
// // // // // //     ? "#dbeafe"
// // // // // //     : r.status === "received"
// // // // // //     ? "#dcfce7"
// // // // // //     : r.status === "partially_received"
// // // // // //     ? "#f3e8ff"
// // // // // //     : r.status === "rejected"
// // // // // //     ? "#fee2e2"
// // // // // //     : "#f1f5f9",
// // // // // //     // background:
// // // // // //     //   r.status === "pending"
// // // // // //     //     ? "#fee2e2"          // red
// // // // // //     //     : r.status === "confirmed"
// // // // // //     //     ? "#dbeafe"          // blue
// // // // // //     //     : r.status === "received"
// // // // // //     //     ? "#dcfce7"          // green
// // // // // //     //     : r.status === "partially_received"
// // // // // //     //     ? "#f3e8ff"          // purple
// // // // // //     //     : "#f1f5f9",

// // // // // //     color:
// // // // // //       r.status === "pending"
// // // // // //         ? "#dc2626"
// // // // // //         : r.status === "confirmed"
// // // // // //         ? "#2563eb"
// // // // // //         : r.status === "received"
// // // // // //         ? "#16a34a"
// // // // // //         : r.status === "partially_received"
// // // // // //         ? "#9333ea"          // purple text
// // // // // //         : "#64748b",

// // // // // //     padding: "2px 8px",
// // // // // //     borderRadius: "6px",
// // // // // //     fontSize: "10px",
// // // // // //     fontWeight: "700"
// // // // // //   }}
// // // // // // >
// // // // // //   {r.status?.replaceAll("_", " ").toUpperCase()}
// // // // // // </span>
// // // // // //                     </div>
// // // // // //                   </div>
// // // // // //                 ))}
// // // // // //               </div>
// // // // // //             </div>

// // // // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // //               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
// // // // // //                 {editingRequest ? (
// // // // // //                   <>
// // // // // //                     <div>
// // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>SOURCE GODOWN</div>
// // // // // //                       <div style={{ fontWeight: '800', fontSize: '18px', color: '#0f172a' }}>
// // // // // //                         {editingRequest.godownId?.name || "General"}
// // // // // //                       </div>
// // // // // //                     </div>
// // // // // //                     <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
// // // // // //                       <button
// // // // // //                         onClick={handleDownloadAllRequestsExcel}
// // // // // //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// // // // // //                       >
// // // // // //                         <FileSpreadsheet size={16} /> Export All Requests
// // // // // //                       </button>
// // // // // //                       <div style={{ textAlign: 'right' }}>
// // // // // //                         <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>ESTIMATED VALUATION</div>
// // // // // //                         <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>
// // // // // //                           ₹{editingRequest.items.reduce((sum, i) => sum + (Number(i.qtyBaseUnit || 0) * Number(i.price || 0)), 0).toLocaleString()}
// // // // // //                         </div>
// // // // // //                       </div>
// // // // // //                     </div>
// // // // // //                   </>
// // // // // //                 ) : (
// // // // // //                   <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
// // // // // //                     <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
// // // // // //   <input
// // // // // //     type="date"
// // // // // //     value={selectedDate}
// // // // // //     onChange={(e) => setSelectedDate(e.target.value)}
// // // // // //     style={{
// // // // // //       padding: "8px 12px",
// // // // // //       borderRadius: "10px",
// // // // // //       border: "1px solid #e2e8f0",
// // // // // //       fontSize: "13px"
// // // // // //     }}
// // // // // //   />

// // // // // //   {selectedDate && (
// // // // // //     <button
// // // // // //       onClick={() => setSelectedDate("")}
// // // // // //       style={{
// // // // // //         padding: "8px 12px",
// // // // // //         border: "1px solid #e2e8f0",
// // // // // //         borderRadius: "8px",
// // // // // //         cursor: "pointer"
// // // // // //       }}
// // // // // //     >
// // // // // //       Clear
// // // // // //     </button>
// // // // // //   )}
// // // // // // </div>
// // // // // //                     {/* <input
// // // // // //   type="date"
// // // // // //   value={selectedDate}
// // // // // //   onChange={(e) => setSelectedDate(e.target.value)}
// // // // // //   style={{
// // // // // //     padding: "8px 12px",
// // // // // //     borderRadius: "10px",
// // // // // //     border: "1px solid #e2e8f0",
// // // // // //     fontSize: "13px"
// // // // // //   }}
// // // // // // /> */}
// // // // // //                      <button
// // // // // //                         onClick={handleDownloadAllRequestsExcel}
// // // // // //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// // // // // //                       >
// // // // // //                         <FileSpreadsheet size={16} /> Export All Requests
// // // // // //                       </button>
// // // // // //                   </div>
// // // // // //                 )}
// // // // // //               </div>

// // // // // //               {editingRequest ? (
// // // // // //                 <>
// // // // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // //                       <thead>
// // // // // //                         <tr style={{ textAlign: 'left' }}>
// // // // // //                           <th style={{ width: "40px" }}>
// // // // // //   <input
// // // // // //     type="checkbox"
// // // // // //     checked={selectAll}
// // // // // //     disabled={editingRequest?.status !== "pending"}
// // // // // //     onChange={(e) => {
// // // // // //       const checked = e.target.checked;
// // // // // //       setSelectAll(checked);

// // // // // //       const newApproved = {};

// // // // // //       if (checked) {
// // // // // //   editingRequest.items.forEach(it => {
// // // // // //     const id = it.stockItemId?._id || it.stockItemId;

// // // // // //     // skip rejected items
// // // // // //     if (!rejectedItems[id]) {
// // // // // //       newApproved[id] = true;
// // // // // //     }
// // // // // //   });
// // // // // // }

// // // // // //       setApprovedItems(newApproved);
// // // // // //     }}
// // // // // //   />
// // // // // // </th>
// // // // // // <th>ITEM</th>
// // // // // //                           {/* <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th> */}
// // // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// // // // // //                           {/* <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', width: '140px' }}>QTY</th> */}
// // // // // //                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
// // // // // //   REQUESTED
// // // // // // </th>

// // // // // // <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
// // // // // //   RECEIVED
// // // // // // </th>
// // // // // // <th
// // // // // //   style={{
// // // // // //     padding: '24px 0 12px',
// // // // // //     fontSize: '11px',
// // // // // //     fontWeight: '900',
// // // // // //     color: '#94a3b8',
// // // // // //     borderBottom: '1px solid #e2e8f0',
// // // // // //     textAlign: 'right'
// // // // // //   }}
// // // // // // >
// // // // // //   ACTION
// // // // // // </th>
// // // // // //                         </tr>
// // // // // //                       </thead>
// // // // // //                       <tbody>
// // // // // //                         {editingRequest.items.map((it, idx) => (
// // // // // //                           <tr
// // // // // //   key={idx}
// // // // // //   style={{
// // // // // //     background:
// // // // // //       it.status === "rejected"
// // // // // //         ? "#fef2f2"
// // // // // //         : "transparent"
// // // // // //   }}
// // // // // // >
// // // // // //   <td>
// // // // // //     <input
// // // // // //   type="checkbox"
// // // // // //   disabled={editingRequest.status !== "pending"}
// // // // // //   checked={!!approvedItems[it.stockItemId?._id || it.stockItemId]}
      
// // // // // //   onChange={(e) => {
// // // // // //   const id = it.stockItemId?._id || it.stockItemId;
// // // // // //   const checked = e.target.checked;

// // // // // //   setApprovedItems(prev => ({
// // // // // //     ...prev,
// // // // // //     [id]: checked
// // // // // //   }));

// // // // // //   if (checked) {
// // // // // //     // remove rejected badge when selected again
// // // // // //     setRejectedItems(prev => {
// // // // // //       const copy = { ...prev };
// // // // // //       delete copy[id];
// // // // // //       return copy;
// // // // // //     });
// // // // // //   } else {
// // // // // //     // show rejected badge when unchecked
// // // // // //     setRejectedItems(prev => ({
// // // // // //       ...prev,
// // // // // //       [id]: true
// // // // // //     }));
// // // // // //   }

// // // // // //   setSelectAll(false);
// // // // // // }}
// // // // // //     />
// // // // // //   </td>
// // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(it)}</div>
// // // // // //                             </td>
// // // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// // // // // //                                 {getGroupName(it)}
// // // // // //                               </span>
// // // // // //                             </td>
// // // // // //                            {/* REQUESTED COLUMN */}
// // // // // // <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700' }}>
// // // // // //   {formatQty(it.qtyBaseUnit)}{" "}
// // // // // //   <span style={{ fontSize: '12px', color: '#64748b' }}>
// // // // // //     {getUnitSymbol(it)}
// // // // // //   </span>
// // // // // // </td>

// // // // // // {/* RECEIVED COLUMN */}
// // // // // // <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700', color: '#16a34a' }}>
// // // // // //   {formatQty(it.receivedQty)}{" "}
// // // // // //   <span style={{ fontSize: '12px', color: '#64748b' }}>
// // // // // //     {getUnitSymbol(it)}
// // // // // //   </span>

// // // // // //   {(it.receivedQty || 0) >= (it.qtyBaseUnit || 0) && (
// // // // // //     <div style={{ fontSize: "10px", color: "#16a34a" }}>
// // // // // //       ✔ Fully Received
// // // // // //     </div>
// // // // // //   )}
// // // // // // </td>
// // // // // // {/* {it.status === "rejected" && (
// // // // // //   <button
// // // // // //     onClick={async () => {
// // // // // //       try {
// // // // // //         await api.patch(
// // // // // //           `/indent-requests/${editingRequest._id}/select-item`,
// // // // // //           {
// // // // // //             stockItemId:
// // // // // //               it.stockItemId?._id || it.stockItemId
// // // // // //           }
// // // // // //         );

// // // // // //         showToast(
// // // // // //           "Item approved successfully",
// // // // // //           "success"
// // // // // //         );

// // // // // //         fetchIndentRequests();

// // // // // //       } catch {
// // // // // //         showToast(
// // // // // //           "Failed to approve item",
// // // // // //           "error"
// // // // // //         );
// // // // // //       }
// // // // // //     }}
// // // // // //     style={{
// // // // // //       background: "#dcfce7",
// // // // // //       color: "#16a34a",
// // // // // //       border: "1px solid #bbf7d0",
// // // // // //       padding: "6px 12px",
// // // // // //       borderRadius: "8px",
// // // // // //       cursor: "pointer",
// // // // // //       fontWeight: "700",
// // // // // //       fontSize: "12px"
// // // // // //     }}
// // // // // //   >
// // // // // //     Select Again
// // // // // //   </button>
// // // // // // )} */}

// // // // // // <td
// // // // // //   style={{
// // // // // //     padding: '20px 0',
// // // // // //     borderBottom: '1px solid #f8fafc',
// // // // // //     textAlign: 'right'
// // // // // //   }}
// // // // // // >
// // // // // //   {/* {it.status === "rejected" ? (
// // // // // //     <span
// // // // // //       style={{
// // // // // //         background: "#fee2e2",
// // // // // //         color: "#dc2626",
// // // // // //         padding: "6px 12px",
// // // // // //         borderRadius: "8px",
// // // // // //         fontSize: "12px",
// // // // // //         fontWeight: "700"
// // // // // //       }}
// // // // // //     >
// // // // // //       REJECTED
// // // // // //     </span>
// // // // // //   ) : (
// // // // // //     editingRequest.status === "pending" && (
// // // // // //       rejectedItems[it.stockItemId?._id || it.stockItemId] ? (
// // // // // //         <button
// // // // // //           onClick={() => {
// // // // // //             const id = it.stockItemId?._id || it.stockItemId;

// // // // // //             setRejectedItems(prev => {
// // // // // //               const copy = { ...prev };
// // // // // //               delete copy[id];
// // // // // //               return copy;
// // // // // //             });

// // // // // //             setApprovedItems(prev => ({
// // // // // //               ...prev,
// // // // // //               [id]: true
// // // // // //             }));
// // // // // //           }}
// // // // // //           style={{
// // // // // //             background: "#dcfce7",
// // // // // //             color: "#16a34a",
// // // // // //             border: "1px solid #bbf7d0",
// // // // // //             padding: "6px 12px",
// // // // // //             borderRadius: "8px",
// // // // // //             cursor: "pointer",
// // // // // //             fontWeight: "700",
// // // // // //             fontSize: "12px"
// // // // // //           }}
// // // // // //         >
// // // // // //           Select
// // // // // //         </button>
// // // // // //       ) : (
// // // // // //         <button
// // // // // //           onClick={() => {
// // // // // //             const id = it.stockItemId?._id || it.stockItemId;

// // // // // //             setRejectedItems(prev => ({
// // // // // //               ...prev,
// // // // // //               [id]: true
// // // // // //             }));

// // // // // //             setApprovedItems(prev => {
// // // // // //               const copy = { ...prev };
// // // // // //               delete copy[id];
// // // // // //               return copy;
// // // // // //             });
// // // // // //           }}
// // // // // //           style={{
// // // // // //             background: "#fff",
// // // // // //             color: "#dc2626",
// // // // // //             border: "1px solid #fecaca",
// // // // // //             padding: "6px 12px",
// // // // // //             borderRadius: "8px",
// // // // // //             cursor: "pointer",
// // // // // //             fontWeight: "700",
// // // // // //             fontSize: "12px"
// // // // // //           }}
// // // // // //         >
// // // // // //           Reject
// // // // // //         </button>
// // // // // //       )
// // // // // //     )
// // // // // //   )} */}
// // // // // //   {it.status === "rejected" ||
// // // // // // rejectedItems[it.stockItemId?._id || it.stockItemId] ? (
// // // // // //   <span
// // // // // //     style={{
// // // // // //       background: "#fee2e2",
// // // // // //       color: "#dc2626",
// // // // // //       padding: "6px 12px",
// // // // // //       borderRadius: "8px",
// // // // // //       fontSize: "12px",
// // // // // //       fontWeight: "700"
// // // // // //     }}
// // // // // //   >
// // // // // //     REJECTED
// // // // // //   </span>
// // // // // // ) : (
// // // // // //   editingRequest.status === "pending" && (
// // // // // //     <button
// // // // // //       onClick={() => {
// // // // // //         const id = it.stockItemId?._id || it.stockItemId;

// // // // // //         setRejectedItems(prev => ({
// // // // // //           ...prev,
// // // // // //           [id]: true
// // // // // //         }));

// // // // // //         setApprovedItems(prev => {
// // // // // //           const copy = { ...prev };
// // // // // //           delete copy[id];
// // // // // //           return copy;
// // // // // //         });

// // // // // //         setSelectAll(false);
// // // // // //       }}
// // // // // //       style={{
// // // // // //         background: "#fff",
// // // // // //         color: "#dc2626",
// // // // // //         border: "1px solid #fecaca",
// // // // // //         padding: "6px 12px",
// // // // // //         borderRadius: "8px",
// // // // // //         cursor: "pointer",
// // // // // //         fontWeight: "700",
// // // // // //         fontSize: "12px"
// // // // // //       }}
// // // // // //     >
// // // // // //       Reject
// // // // // //     </button>
// // // // // //   )
// // // // // // )}
// // // // // // </td>                            
// // // // // //                           </tr>
// // // // // //                         ))}
// // // // // //                       </tbody>
// // // // // //                     </table>
// // // // // //                   </div>

// // // // // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // //                     <button 
// // // // // //                       onClick={() => setEditingRequest(null)} 
// // // // // //                       style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
// // // // // //                     >
// // // // // //                       Cancel
// // // // // //                     </button>
// // // // // // {editingRequest.status === "pending" && (
// // // // // //   <>
// // // // // //     <button
// // // // // //       onClick={rejectEntireRequest}
// // // // // //       style={{
// // // // // //         background: "#dc2626",
// // // // // //         border: "none",
// // // // // //         color: "#fff",
// // // // // //         padding: "12px 24px",
// // // // // //         borderRadius: "12px",
// // // // // //         fontWeight: "700",
// // // // // //         cursor: "pointer"
// // // // // //       }}
// // // // // //     >
// // // // // //       Reject Entire Request
// // // // // //     </button>

// // // // // //     <button
// // // // // //       onClick={confirmRequest}
// // // // // //       style={{
// // // // // //         background: "#6366f1",
// // // // // //         border: "none",
// // // // // //         color: "#fff",
// // // // // //         padding: "12px 24px",
// // // // // //         borderRadius: "12px",
// // // // // //         fontWeight: "700",
// // // // // //         fontSize: "13px",
// // // // // //         cursor: "pointer",
// // // // // //         display: "flex",
// // // // // //         alignItems: "center",
// // // // // //         gap: "8px"
// // // // // //       }}
// // // // // //     >
// // // // // //       Confirm Request
// // // // // //     </button>
// // // // // //   </>
// // // // // // )}
// // // // // //                     {/* {!["confirmed", "received", "partially_received"].includes(editingRequest.status) && (
// // // // // //   <button onClick={confirmRequest}
// // // // // //                         style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
// // // // // //                       >
// // // // // //                         Confirm Request
// // // // // //                       </button>
// // // // // //                     )} */}
// // // // // //                   </div>
// // // // // //                 </>
// // // // // //               ) : (
// // // // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// // // // // //                   Select a request from the sidebar to review and convert
// // // // // //                 </div>
// // // // // //               )}
// // // // // //             </div>
// // // // // //           </>
// // // // // //         )}

// // // // // //         {/* VIEW: CREATE NEW (MANUAL) */}
// // // // // //         {view === "create" && (
// // // // // //           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
// // // // // //             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // //               <div>
// // // // // //                 <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Create Requisition</h2>
// // // // // //                 <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
// // // // // //                     <span onClick={() => setTab("stock-items")} style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: tab === 'stock-items' ? '#6366f1' : '#64748b' }}>Stock Items</span>
// // // // // //                 </div>
// // // // // //               </div>
// // // // // //               <div style={{ textAlign: 'right' }}>
// // // // // //                 <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>ESTIMATED TOTAL</div>
// // // // // //                 <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{Object.values(selectedItems).reduce((sum, i) => i.checked ? sum + (Number(i.qty || 0) * Number(i.price || 0)) : sum, 0).toLocaleString()}</div>
// // // // // //               </div>
// // // // // //             </div>

// // // // // //             <div style={{ flex: 1, overflowY: 'auto' }}>
// // // // // //               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // //                 <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
// // // // // //                   <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // //                     <th style={{ padding: '20px 32px', width: '50px' }}>
// // // // // //                         <input type="checkbox" onChange={(e) => {
// // // // // //                            const isChecked = e.target.checked;
// // // // // //                            const newSelection = { ...selectedItems };
// // // // // //                            filteredStock.forEach(item => {
// // // // // //                              newSelection[item._id] = { ...(newSelection[item._id] || { qty: 0, price: 0 }), checked: isChecked };
// // // // // //                            });
// // // // // //                            setSelectedItems(newSelection);
// // // // // //                         }} style={{ width: '18px', height: '18px' }} />
// // // // // //                     </th>
// // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>NAME</th>
// // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>STOCK GROUP</th>
// // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '140px' }}>QTY</th>
// // // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '100px' }}>PRICE</th>
// // // // // //                     <th style={{ padding: '20px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>ITEM TOTAL</th>
// // // // // //                   </tr>
// // // // // //                 </thead>
// // // // // //                 <tbody>
// // // // // //                   {filteredStock.map((row) => {
// // // // // //                     const state = selectedItems[row._id] || { checked: false, qty: 0, price: 0 };
// // // // // //                     const itemTotal = Number(state.qty || 0) * Number(state.price || 0);
// // // // // //                     return (
// // // // // //                       <tr key={row._id} style={{ borderBottom: '1px solid #f8fafc', background: state.checked ? '#fcfdff' : 'transparent' }}>
// // // // // //                         <td style={{ padding: '16px 32px' }}>
// // // // // //                           <input type="checkbox" checked={state.checked} onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, checked: e.target.checked } }))} style={{ width: '18px', height: '18px' }} />
// // // // // //                         </td>
// // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
// // // // // //                             <span style={{ fontWeight: '700', color: '#1e293b' }}>{row.name}</span>
// // // // // //                           </div>
// // // // // //                         </td>
// // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // //                           <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
// // // // // //                             {row.stockGroupId?.name || 'Unassigned'}
// // // // // //                           </span>
// // // // // //                         </td>
// // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // //                             <input type="number"
// // // // // // step="0.001" disabled={!state.checked} value={state.qty} placeholder="0" onChange={(e) => {
// // // // // //   const value = e.target.value;

// // // // // //   if (!/^\d*\.?\d{0,3}$/.test(value) && value !== "") {
// // // // // //     return;
// // // // // //   }

// // // // // //   setSelectedItems(prev => ({
// // // // // //     ...prev,
// // // // // //     [row._id]: {
// // // // // //       ...state,
// // // // // //       qty: value
// // // // // //     }
// // // // // //   }));
// // // // // // }} style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // // // //                             <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{row.unitId?.symbol}</span>
// // // // // //                           </div>
// // // // // //                         </td>
// // // // // //                         <td style={{ padding: '16px 0' }}>
// // // // // //                             <input type="number" disabled={!state.checked} value={state.price} placeholder="₹" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, price: e.target.value } }))} style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // // // //                         </td>
// // // // // //                         <td style={{ padding: '16px 32px', textAlign: 'right', fontWeight: '800', color: state.checked ? '#6366f1' : '#94a3b8' }}>
// // // // // //                           ₹{itemTotal.toLocaleString()}
// // // // // //                         </td>
// // // // // //                       </tr>
// // // // // //                     );
// // // // // //                   })}
// // // // // //                 </tbody>
// // // // // //               </table>
// // // // // //             </div>
// // // // // //             <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // // // // //               <button onClick={submitIndent} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
// // // // // //                 Submit Requisition
// // // // // //               </button>
// // // // // //             </div>
// // // // // //           </div>
// // // // // //         )}
// // // // // //       </div>
// // // // // //     </div>
// // // // // //   );
// // // // // // };







// // // // // // the below code is for calenders and excel exports








// // // // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // // // import { api } from "../api.js";
// // // // // import { useToast } from "../toast.jsx";
// // // // // import * as XLSX from "xlsx";
// // // // // import { 
// // // // //   Search, FileSpreadsheet, CheckCircle2, Inbox, 
// // // // //   ClipboardList, PlusCircle, RefreshCw, X, Save 
// // // // // } from "lucide-react";

// // // // // export const IndentPage = () => {
// // // // //   const { showToast } = useToast();
// // // // //   const [fromDate, setFromDate] = useState("");
// // // // // const [toDate, setToDate] = useState("");
// // // // //   // View State
// // // // //   const [view, setView] = useState("history"); 
// // // // //   const [tab, setTab] = useState("stock-items");
// // // // //   const [searchTerm, setSearchTerm] = useState("");
  
// // // // //   // Data State
// // // // //   const [stockItems, setStockItems] = useState([]);
// // // // //   const [indents, setIndents] = useState([]);
// // // // //   const [indentRequests, setIndentRequests] = useState([]);
// // // // //   const [selectedItems, setSelectedItems] = useState({});
// // // // //   const [selectedId, setSelectedId] = useState(null);

// // // // //   // --- Editing State for Requests ---
// // // // //   const [editingRequest, setEditingRequest] = useState(null);
// // // // //   const [approvedItems, setApprovedItems] = useState({});
// // // // //   const [rejectedItems, setRejectedItems] = useState({});
// // // // //   const [selectAll, setSelectAll] = useState(false);

// // // // //   // --- Data Loading ---
// // // // //   const load = useCallback(async () => {
// // // // //     try {
// // // // //       const [itemsRes, indentRes] = await Promise.all([
// // // // //         api.get("/inventory/stock-items"),
// // // // //         api.get("/indents")
// // // // //       ]);
// // // // //       setStockItems(itemsRes.data || []);
// // // // //       const sorted = (indentRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // //       setIndents(sorted);
// // // // //       if (sorted.length > 0 && !selectedId) setSelectedId(sorted[0]._id);
// // // // //     } catch (error) {
// // // // //       showToast("Failed to load data", "error");
// // // // //     }
// // // // //   }, [showToast, selectedId]);

// // // // //   const fetchIndentRequests = useCallback(async () => {
// // // // //     try {
// // // // //       const res = await api.get("/indent-requests");
// // // // //       setIndentRequests(res.data || []);
// // // // //     } catch (error) {
// // // // //       showToast("Failed to fetch requests", "error");
// // // // //     }
// // // // //   }, [showToast]);

// // // // //   useEffect(() => { 
// // // // //     load(); 
// // // // //     if (view === "requests") fetchIndentRequests();
// // // // //   }, [load, fetchIndentRequests, view]);

// // // // //   // --- Helper Functions ---
// // // // //   const getUnitSymbol = (item) => {
// // // // //     if (item.stockItemId?.unitId?.symbol) return item.stockItemId.unitId.symbol;
// // // // //     if (item.unitId?.symbol) return item.unitId.symbol;
// // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // //     const found = stockItems.find(s => s._id === id);
// // // // //     return found?.unitId?.symbol || "";
// // // // //   };

// // // // //   const formatQty = (value) => {
// // // // //   const num = Number(value || 0);
// // // // //   return Number(num.toFixed(3)).toString();
// // // // // };
// // // // //   const getItemName = (item) => {
// // // // //     if (item.stockItemId?.name) return item.stockItemId.name;
// // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // //     const found = stockItems.find(s => s._id === id);
// // // // //     return found ? found.name : "Unknown Product";
// // // // //   };


// // // // //   const getGroupName = (item) => {
// // // // //     if (item.stockItemId?.stockGroupId?.name) return item.stockItemId.stockGroupId.name;
// // // // //     if (item.stockGroupId?.name) return item.stockGroupId.name;
// // // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // // //     const found = stockItems.find(s => s._id === id);
// // // // //     return found?.stockGroupId?.name || "General";
// // // // //   };

// // // // // // const handleDownloadAllRequestsExcel = () => {
// // // // // //   if (!indentRequests.length) {
// // // // // //     return showToast("No requests available", "info");
// // // // // //   }

// // // // // //   let filtered = [...indentRequests];

// // // // // //   if (fromDate || toDate) {
// // // // // //   filtered = filtered.filter(r => {
// // // // // //     const d = new Date(r.createdAt).toISOString().split("T")[0];

// // // // // //     if (fromDate && d < fromDate) return false;
// // // // // //     if (toDate && d > toDate) return false;

// // // // // //     return true;
// // // // // //   });
// // // // // // }
// // // // // // // const isSingleDate = !!selectedDate;
// // // // // //   if (!filtered.length) {
// // // // // //     return showToast("No requests found for selected date", "info");
// // // // // //   }

// // // // // //   filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

// // // // // //   // const branches = [
// // // // // //   //   ...new Set(filtered.map(r => r.godownId?.name || "General"))
// // // // // //   // ];

// // // // // //   // const itemMap = {};

// // // // // //   // filtered.forEach(req => {
// // // // // //   //   const branch = req.godownId?.name || "General";

// // // // // //   //   req.items.forEach(it => {
// // // // // //   //     const id = it.stockItemId?._id || it.stockItemId;

// // // // // //   //     if (!itemMap[id]) {
// // // // // //   //       itemMap[id] = {
// // // // // //   //         name: getItemName(it),
// // // // // //   //         group: getGroupName(it),
// // // // // //   //         unit: getUnitSymbol(it),
// // // // // //   //         requestedTotal: 0,
// // // // // //   //         receivedTotal: 0,
// // // // // //   //         branches: {}
// // // // // //   //       };
// // // // // //   //     }

// // // // // //   //     const reqQty = Number(it.qtyBaseUnit || 0);
// // // // // //   //     const recQty = Number(it.receivedQty || 0);

// // // // // //   //     itemMap[id].requestedTotal += reqQty;
// // // // // //   //     itemMap[id].receivedTotal += recQty;

// // // // // //   //     if (!itemMap[id].branches[branch]) {
// // // // // //   //       itemMap[id].branches[branch] = { requested: 0, received: 0 };
// // // // // //   //     }

// // // // // //   //     itemMap[id].branches[branch].requested += reqQty;
// // // // // //   //     itemMap[id].branches[branch].received += recQty;
// // // // // //   //   });
// // // // // //   // });

// // // // // //   // const items = Object.values(itemMap);

// // // // // //   // const aoa = [];

// // // // // //   // aoa.push(["MONTESSORI INDENT REQUEST"]);
// // // // // //   // aoa.push([`Date: ${selectedDate || "All Dates"}`]);
// // // // // //   // aoa.push([]);

// // // // // //   // const header = [
// // // // // //   //   "S.No",
// // // // // //   //   "Stock Item",
// // // // // //   //   "Stock Group",
// // // // // //   //   "Unit",
// // // // // //   //   "Requested (Total)",
// // // // // //   //   "Received (Total)"
// // // // // //   // ];

// // // // // //   // branches.forEach(b => {
// // // // // //   //   header.push(`${b} - Requested`);
// // // // // //   //   header.push(`${b} - Received`);
// // // // // //   // });

// // // // // //   // aoa.push(header);

// // // // // //   // items.forEach((it, index) => {
// // // // // //   //   const row = [
// // // // // //   //     index + 1,
// // // // // //   //     it.name,
// // // // // //   //     it.group,
// // // // // //   //     it.unit,
// // // // // //   //     it.requestedTotal,
// // // // // //   //     it.receivedTotal
// // // // // //   //   ];

// // // // // //   //   branches.forEach(b => {
// // // // // //   //     row.push(it.branches[b]?.requested || 0);
// // // // // //   //     row.push(it.branches[b]?.received || 0);
// // // // // //   //   });

// // // // // //   //   aoa.push(row);
// // // // // //   // });
// // // // // // // const isSingleDate = !!selectedDate;

// // // // // // const groupedByDate = {};

// // // // // // filtered.forEach(req => {
// // // // // //   const date = new Date(req.createdAt).toISOString().split("T")[0];

// // // // // //   if (!groupedByDate[date]) groupedByDate[date] = [];
// // // // // //   groupedByDate[date].push(req);
// // // // // // });

// // // // // // const sortedDates = Object.keys(groupedByDate).sort(
// // // // // //   (a, b) => new Date(a) - new Date(b)
// // // // // // );

// // // // // // const aoa = [];

// // // // // // aoa.push(["MONTESSORI INDENT ALL REQUESTS"]);
// // // // // // aoa.push([]);

// // // // // // sortedDates.forEach(date => {
// // // // // //   const requests = groupedByDate[date];

// // // // // //   const branches = [
// // // // // //     ...new Set(requests.map(r => r.godownId?.name || "General"))
// // // // // //   ];

// // // // // //   const itemMap = {};

// // // // // //   requests.forEach(req => {
// // // // // //     const branch = req.godownId?.name || "General";

// // // // // //     req.items.forEach(it => {
// // // // // //       const id = it.stockItemId?._id || it.stockItemId;

// // // // // //       if (!itemMap[id]) {
// // // // // //         itemMap[id] = {
// // // // // //           name: getItemName(it),
// // // // // //           group: getGroupName(it),
// // // // // //           unit: getUnitSymbol(it),
// // // // // //           requestedTotal: 0,
// // // // // //           receivedTotal: 0,
// // // // // //           branches: {}
// // // // // //         };
// // // // // //       }

// // // // // //       const reqQty = Number(it.qtyBaseUnit || 0);
// // // // // //       const recQty = Number(it.receivedQty || 0);

// // // // // //       itemMap[id].requestedTotal += reqQty;
// // // // // //       itemMap[id].receivedTotal += recQty;

// // // // // //       if (!itemMap[id].branches[branch]) {
// // // // // //         itemMap[id].branches[branch] = { requested: 0, received: 0 };
// // // // // //       }

// // // // // //       itemMap[id].branches[branch].requested += reqQty;
// // // // // //       itemMap[id].branches[branch].received += recQty;
// // // // // //     });
// // // // // //   });

// // // // // //   const items = Object.values(itemMap);

// // // // // //   aoa.push([`DATE: ${date}`]);
// // // // // //   aoa.push([]);

// // // // // //   const header = [
// // // // // //     "S.No",
// // // // // //     "Stock Item",
// // // // // //     "Stock Group",
// // // // // //     "Unit",
// // // // // //     "Requested (Total)",
// // // // // //     "Received (Total)"
// // // // // //   ];

// // // // // //   branches.forEach(b => {
// // // // // //     header.push(`${b} - Requested`);
// // // // // //     header.push(`${b} - Received`);
// // // // // //   });

// // // // // //   aoa.push(header);

// // // // // //   items.forEach((it, index) => {
// // // // // //     const row = [
// // // // // //       index + 1,
// // // // // //       it.name,
// // // // // //       it.group,
// // // // // //       it.unit,
// // // // // //       it.requestedTotal,
// // // // // //       it.receivedTotal
// // // // // //     ];

// // // // // //     branches.forEach(b => {
// // // // // //       row.push(it.branches[b]?.requested || 0);
// // // // // //       row.push(it.branches[b]?.received || 0);
// // // // // //     });

// // // // // //     aoa.push(row);
// // // // // //   });

// // // // // //   aoa.push([]);
// // // // // // });

// // // // // // // const aoa = [];

// // // // // // // aoa.push(["MONTESSORI INDENT ALL REQUESTS"]);
// // // // // // // aoa.push([]);
// // // // // // if (fromDate || toDate) {
// // // // // //   const branches = [
// // // // // //     ...new Set(filtered.map(r => r.godownId?.name || "General"))
// // // // // //   ];

// // // // // //   const itemMap = {};

// // // // // //   filtered.forEach(req => {
// // // // // //     const branch = req.godownId?.name || "General";

// // // // // //     req.items.forEach(it => {
// // // // // //       const id = it.stockItemId?._id || it.stockItemId;

// // // // // //       if (!itemMap[id]) {
// // // // // //         itemMap[id] = {
// // // // // //           name: getItemName(it),
// // // // // //           group: getGroupName(it),
// // // // // //           unit: getUnitSymbol(it),
// // // // // //           requestedTotal: 0,
// // // // // //           receivedTotal: 0,
// // // // // //           branches: {}
// // // // // //         };
// // // // // //       }

// // // // // //       const reqQty = Number(it.qtyBaseUnit || 0);
// // // // // //       const recQty = Number(it.receivedQty || 0);

// // // // // //       itemMap[id].requestedTotal += reqQty;
// // // // // //       itemMap[id].receivedTotal += recQty;

// // // // // //       if (!itemMap[id].branches[branch]) {
// // // // // //         itemMap[id].branches[branch] = { requested: 0, received: 0 };
// // // // // //       }

// // // // // //       itemMap[id].branches[branch].requested += reqQty;
// // // // // //       itemMap[id].branches[branch].received += recQty;
// // // // // //     });
// // // // // //   });

// // // // // //   const items = Object.values(itemMap);

// // // // // //   // aoa.push([`DATE: ${selectedDate}`]);
// // // // // //   aoa.push([`DATE: ${fromDate || "start"} to ${toDate || "end"}`]);
// // // // // //   aoa.push([]);

// // // // // //   const header = [
// // // // // //     "S.No",
// // // // // //     "Stock Item",
// // // // // //     "Stock Group",
// // // // // //     "Unit",
// // // // // //     "Requested (Total)",
// // // // // //     "Received (Total)"
// // // // // //   ];

// // // // // //   branches.forEach(b => {
// // // // // //     header.push(`${b} - Requested`);
// // // // // //     header.push(`${b} - Received`);
// // // // // //   });

// // // // // //   aoa.push(header);

// // // // // //   items.forEach((it, index) => {
// // // // // //     const row = [
// // // // // //       index + 1,
// // // // // //       it.name,
// // // // // //       it.group,
// // // // // //       it.unit,
// // // // // //       it.requestedTotal,
// // // // // //       it.receivedTotal
// // // // // //     ];

// // // // // //     branches.forEach(b => {
// // // // // //       row.push(it.branches[b]?.requested || 0);
// // // // // //       row.push(it.branches[b]?.received || 0);
// // // // // //     });

// // // // // //     aoa.push(row);
// // // // // //   });

// // // // // // } else {
// // // // // //   Object.keys(groupedByDate)
// // // // // //   .sort((a, b) => new Date(a) - new Date(b))
// // // // // //   .forEach(date => {
// // // // // //     const requests = groupedByDate[date];

// // // // // //     const branches = [
// // // // // //       ...new Set(requests.map(r => r.godownId?.name || "General"))
// // // // // //     ];

// // // // // //     const itemMap = {};

// // // // // //     requests.forEach(req => {
// // // // // //       const branch = req.godownId?.name || "General";

// // // // // //       req.items.forEach(it => {
// // // // // //         const id = it.stockItemId?._id || it.stockItemId;

// // // // // //         if (!itemMap[id]) {
// // // // // //           itemMap[id] = {
// // // // // //             name: getItemName(it),
// // // // // //             group: getGroupName(it),
// // // // // //             unit: getUnitSymbol(it),
// // // // // //             requestedTotal: 0,
// // // // // //             receivedTotal: 0,
// // // // // //             branches: {}
// // // // // //           };
// // // // // //         }

// // // // // //         const reqQty = Number(it.qtyBaseUnit || 0);
// // // // // //         const recQty = Number(it.receivedQty || 0);

// // // // // //         itemMap[id].requestedTotal += reqQty;
// // // // // //         itemMap[id].receivedTotal += recQty;

// // // // // //         if (!itemMap[id].branches[branch]) {
// // // // // //           itemMap[id].branches[branch] = { requested: 0, received: 0 };
// // // // // //         }

// // // // // //         itemMap[id].branches[branch].requested += reqQty;
// // // // // //         itemMap[id].branches[branch].received += recQty;
// // // // // //       });
// // // // // //     });

// // // // // //     const items = Object.values(itemMap);

// // // // // //     aoa.push([`DATE: ${date}`]);
// // // // // //     aoa.push([]);

// // // // // //     const header = [
// // // // // //       "S.No",
// // // // // //       "Stock Item",
// // // // // //       "Stock Group",
// // // // // //       "Unit",
// // // // // //       "Requested (Total)",
// // // // // //       "Received (Total)"
// // // // // //     ];

// // // // // //     branches.forEach(b => {
// // // // // //       header.push(`${b} - Requested`);
// // // // // //       header.push(`${b} - Received`);
// // // // // //     });

// // // // // //     aoa.push(header);

// // // // // //     items.forEach((it, index) => {
// // // // // //       const row = [
// // // // // //         index + 1,
// // // // // //         it.name,
// // // // // //         it.group,
// // // // // //         it.unit,
// // // // // //         it.requestedTotal,
// // // // // //         it.receivedTotal
// // // // // //       ];

// // // // // //       branches.forEach(b => {
// // // // // //         row.push(it.branches[b]?.requested || 0);
// // // // // //         row.push(it.branches[b]?.received || 0);
// // // // // //       });

// // // // // //       aoa.push(row);
// // // // // //     });

// // // // // //     aoa.push([]);
// // // // // //   });

// // // // // // }
// // // // // // const maxCols = Math.max(...aoa.map(row => row.length));
// // // // // //   const ws = XLSX.utils.aoa_to_sheet(aoa);

// // // // // //   // ws["!merges"] = [
// // // // // //   //   {
// // // // // //   //     s: { r: 0, c: 0 },
// // // // // //   //     e: { r: 0, c: header.length - 1 }
// // // // // //   //   }
// // // // // //   // ];
// // // // // //   ws["!merges"] = [
// // // // // //   {
// // // // // //     s: { r: 0, c: 0 },
// // // // // //     e: { r: 0, c: maxCols - 1 }
// // // // // //   }
// // // // // // ];

// // // // // //   const wb = XLSX.utils.book_new();
// // // // // //   XLSX.utils.book_append_sheet(wb, ws, "Indent Report");

// // // // // //  const fileName =
// // // // // //   fromDate || toDate
// // // // // //     ? `Montessori_Indent_${fromDate || "start"}_to_${toDate || "end"}.xlsx`
// // // // // //     : "Montessori_Indent_All.xlsx";

// // // // // //   XLSX.writeFile(wb, fileName);

// // // // // //   showToast("Excel exported successfully", "success");
// // // // // // };
// // // // // const handleDownloadAllRequestsExcel = () => {
// // // // //   if (!indentRequests.length) {
// // // // //     return showToast("No requests available", "info");
// // // // //   }

// // // // //   let filtered = [...indentRequests];

// // // // //   filtered = filtered.filter(r => {
// // // // //     const d = new Date(r.createdAt).toISOString().split("T")[0];
// // // // //     if (fromDate && d < fromDate) return false;
// // // // //     if (toDate && d > toDate) return false;
// // // // //     return true;
// // // // //   });

// // // // //   if (!filtered.length) {
// // // // //     return showToast("No requests found", "info");
// // // // //   }

// // // // //   filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

// // // // //   const groupedByDate = {};

// // // // //   filtered.forEach(req => {
// // // // //     const date = new Date(req.createdAt).toISOString().split("T")[0];
// // // // //     if (!groupedByDate[date]) groupedByDate[date] = [];
// // // // //     groupedByDate[date].push(req);
// // // // //   });

// // // // //   const aoa = [];

// // // // //   aoa.push(["MONTESSORI INDENT ALL REQUESTS"]);
// // // // //   aoa.push([]);

// // // // //   Object.keys(groupedByDate)
// // // // //     .sort((a, b) => new Date(a) - new Date(b))
// // // // //     .forEach(date => {

// // // // //       const requests = groupedByDate[date];

// // // // //       const branches = [...new Set(requests.map(r => r.godownId?.name || "General"))];

// // // // //       const itemMap = {};

// // // // //       requests.forEach(req => {
// // // // //         const branch = req.godownId?.name || "General";

// // // // //         req.items.forEach(it => {
// // // // //           const id = it.stockItemId?._id || it.stockItemId;

// // // // //           if (!itemMap[id]) {
// // // // //             itemMap[id] = {
// // // // //               name: getItemName(it),
// // // // //               group: getGroupName(it),
// // // // //               unit: getUnitSymbol(it),
// // // // //               requestedTotal: 0,
// // // // //               receivedTotal: 0,
// // // // //               branches: {}
// // // // //             };
// // // // //           }

// // // // //           const reqQty = Number(it.qtyBaseUnit || 0);
// // // // //           const recQty = Number(it.receivedQty || 0);

// // // // //           itemMap[id].requestedTotal += reqQty;
// // // // //           itemMap[id].receivedTotal += recQty;

// // // // //           if (!itemMap[id].branches[branch]) {
// // // // //             itemMap[id].branches[branch] = { requested: 0, received: 0 };
// // // // //           }

// // // // //           itemMap[id].branches[branch].requested += reqQty;
// // // // //           itemMap[id].branches[branch].received += recQty;
// // // // //         });
// // // // //       });

// // // // //       const items = Object.values(itemMap);

// // // // //       aoa.push([`DATE: ${date}`]);

// // // // //       const header = [
// // // // //         "S.No",
// // // // //         "Stock Item",
// // // // //         "Stock Group",
// // // // //         "Unit",
// // // // //         "Requested (Total)",
// // // // //         "Received (Total)"
// // // // //       ];

// // // // //       branches.forEach(b => {
// // // // //         header.push(`${b} - Requested`);
// // // // //         header.push(`${b} - Received`);
// // // // //       });

// // // // //       aoa.push(header);

// // // // //       items.forEach((it, index) => {
// // // // //         const row = [
// // // // //           index + 1,
// // // // //           it.name,
// // // // //           it.group,
// // // // //           it.unit,
// // // // //           it.requestedTotal,
// // // // //           it.receivedTotal
// // // // //         ];

// // // // //         branches.forEach(b => {
// // // // //           row.push(it.branches[b]?.requested || 0);
// // // // //           row.push(it.branches[b]?.received || 0);
// // // // //         });

// // // // //         aoa.push(row);
// // // // //       });

// // // // //       aoa.push([]);
// // // // //     });

// // // // //   const maxCols = Math.max(...aoa.map(r => r.length));

// // // // //   const ws = XLSX.utils.aoa_to_sheet(aoa);

// // // // //   ws["!merges"] = [
// // // // //     {
// // // // //       s: { r: 0, c: 0 },
// // // // //       e: { r: 0, c: maxCols - 1 }
// // // // //     }
// // // // //   ];

// // // // //   const wb = XLSX.utils.book_new();
// // // // //   XLSX.utils.book_append_sheet(wb, ws, "Indent Report");

// // // // //   const fileName =
// // // // //     fromDate || toDate
// // // // //       ? `Montessori_Indent_${fromDate || "start"}_to_${toDate || "end"}.xlsx`
// // // // //       : "Montessori_Indent_All.xlsx";

// // // // //   XLSX.writeFile(wb, fileName);

// // // // //   showToast("Excel exported successfully", "success");
// // // // // };

// // // // // //   const handleDownloadAllRequestsExcel = () => {
// // // // // //   if (!indentRequests.length) {
// // // // // //     return showToast("No requests available", "info");
// // // // // //   }

// // // // // //   let filteredRequests = indentRequests;

// // // // // //   if (selectedDate) {
// // // // // //     filteredRequests = indentRequests.filter(r => {
// // // // // //       const reqDate = new Date(r.createdAt).toISOString().split("T")[0];
// // // // // //       return reqDate === selectedDate;
// // // // // //     });
// // // // // //   }

// // // // // //   if (!filteredRequests.length) {
// // // // // //     return showToast("No requests found for selected date", "info");
// // // // // //   }

// // // // // //   const godownNames = [
// // // // // //     ...new Set(filteredRequests.map(r => r.godownId?.name || "General"))
// // // // // //   ];

// // // // // //   const itemMap = {};

// // // // // //   filteredRequests.forEach(req => {
// // // // // //     const godownName = req.godownId?.name || "General";

// // // // // //     req.items.forEach(item => {
// // // // // //       const id = item.stockItemId?._id || item.stockItemId;

// // // // // //       if (!itemMap[id]) {
// // // // // //         itemMap[id] = {
// // // // // //           stockItem: getItemName(item),
// // // // // //           group: getGroupName(item),
// // // // // //           unit: getUnitSymbol(item),
// // // // // //           totalQty: 0,
// // // // // //           godowns: {}
// // // // // //         };
// // // // // //       }

// // // // // //       const qty = Number(item.qtyBaseUnit || 0);
// // // // // //       itemMap[id].totalQty += qty;
// // // // // //       itemMap[id].godowns[godownName] =
// // // // // //         (itemMap[id].godowns[godownName] || 0) + qty;
// // // // // //     });
// // // // // //   });

// // // // // //   const excelData = Object.values(itemMap).map((item, index) => {
// // // // // //     const row = {
// // // // // //       "S.No": index + 1,
// // // // // //       "Stock Item": item.stockItem,
// // // // // //       "Stock Group": item.group,
// // // // // //       "Quantity": item.totalQty,
// // // // // //       "Unit": item.unit
// // // // // //     };

// // // // // //     godownNames.forEach(g => {
// // // // // //       row[g] = item.godowns[g] || 0;
// // // // // //     });

// // // // // //     return row;
// // // // // //   });

// // // // // //   const ws = XLSX.utils.json_to_sheet(excelData);
// // // // // //   const wb = XLSX.utils.book_new();
// // // // // //   XLSX.utils.book_append_sheet(wb, ws, "Filtered Requests");

// // // // // //   const fileName = selectedDate
// // // // // //     ? `Requests_${selectedDate}.xlsx`
// // // // // //     : "All_Godown_Requests.xlsx";

// // // // // //   XLSX.writeFile(wb, fileName);

// // // // // //   showToast("Excel exported successfully", "success");
// // // // // // };

// // // // //   const handleDownloadExcel = () => {
// // // // //     if (!activeIndent) return;
// // // // //     const data = activeIndent.items.map(item => ({
// // // // //       "Product": getItemName(item),
// // // // //       "Group": getGroupName(item),
// // // // //       "Quantity": item.orderedQty,
// // // // //       "Unit": getUnitSymbol(item),
// // // // //       "Price": item.unitPrice,
// // // // //       "Subtotal": item.orderedQty * item.unitPrice
// // // // //     }));
// // // // //     const ws = XLSX.utils.json_to_sheet(data);
// // // // //     const wb = XLSX.utils.book_new();
// // // // //     XLSX.utils.book_append_sheet(wb, ws, "Indent");
// // // // //     XLSX.writeFile(wb, `Indent_${activeIndent.indentNo || 'Export'}.xlsx`);
// // // // //     showToast("Excel exported successfully", "success");
// // // // //   };

// // // // //   const handleStatusUpdate = async (id, newStatus) => {
// // // // //     try {
// // // // //       if (newStatus === 'purchased') {
// // // // //         await api.post(`/indents/${id}/mark-purchased`);
// // // // //       } else {
// // // // //         await api.patch(`/indents/${id}`, { status: newStatus });
// // // // //       }
// // // // //       showToast(`Indent marked as ${newStatus}`, "success");
// // // // //       load();
// // // // //     } catch (error) {
// // // // //       showToast("Failed to update status", "error");
// // // // //     }
// // // // //   };
// // // // //  const rejectEntireRequest = async () => {
// // // // //   try {
// // // // //     await api.patch(
// // // // //       `/indent-requests/${editingRequest._id}/reject`
// // // // //     );

// // // // //     showToast(
// // // // //       "Request rejected successfully",
// // // // //       "success"
// // // // //     );

// // // // //     setEditingRequest(null);

// // // // //     fetchIndentRequests();

// // // // //   } catch (err) {
// // // // //     showToast(
// // // // //       "Reject failed",
// // // // //       "error"
// // // // //     );
// // // // //   }
// // // // // };
// // // // //   const confirmRequest = async () => {
   
// // // // //   try {
// // // // //     const selectedItems = editingRequest.items
// // // // //       .filter(it => {
// // // // //         const id = it.stockItemId?._id || it.stockItemId;
// // // // //         return approvedItems[id];
// // // // //       })
// // // // //       .map(it => ({
// // // // //         stockItemId: it.stockItemId?._id || it.stockItemId,
// // // // //         qtyBaseUnit: it.qtyBaseUnit
// // // // //       }));

// // // // //     if (selectedItems.length === 0) {
// // // // //       return showToast("Select at least one item", "info");
// // // // //     }

// // // // //     await api.patch(`/indent-requests/${editingRequest._id}/confirm`, {
// // // // //       items: selectedItems
// // // // //     });

// // // // //     showToast("Selected items approved!", "success");

// // // // //     setEditingRequest(null);
// // // // //     setApprovedItems({});
// // // // //     fetchIndentRequests();
// // // // //   } catch (err) {
// // // // //     showToast("Confirmation failed", "error");
// // // // //   }
// // // // // };

// // // // //   const submitIndent = async () => {
// // // // //     const itemsToSubmit = Object.keys(selectedItems)
// // // // //       .filter(id => selectedItems[id].checked && Number(selectedItems[id].qty) > 0)
// // // // //       .map(id => ({
// // // // //         stockItemId: id,
// // // // //         orderedQty: Number(selectedItems[id].qty),
// // // // //         unitPrice: Number(selectedItems[id].price || 0),
// // // // //         amount: Number(selectedItems[id].qty) * Number(selectedItems[id].price || 0)
// // // // //       }));

// // // // //     if (itemsToSubmit.length === 0) return showToast("Select items with quantity", "info");

// // // // //     try {
// // // // //       await api.post("/indents", { items: itemsToSubmit });
// // // // //       showToast("Indent submitted", "success");
// // // // //       setSelectedItems({});
// // // // //       setView("history");
// // // // //       load();
// // // // //     } catch (error) {
// // // // //       showToast("Submission failed", "error");
// // // // //     }
// // // // //   };

// // // // //   // --- Memoized Filters ---
// // // // //   const filteredIndents = useMemo(() => {
// // // // //     return indents.filter(i =>
// // // // //       (i.indentNo?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
// // // // //       (i._id.includes(searchTerm))
// // // // //     );
// // // // //   }, [indents, searchTerm]);

// // // // //   const filteredStock = useMemo(() => {
// // // // //     return stockItems.filter(s =>
// // // // //       s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
// // // // //       s.stockGroupId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
// // // // //     );
// // // // //   }, [stockItems, searchTerm]);
// // // // // const filteredRequests = useMemo(() => {
// // // // //   return indentRequests
// // // // //     .filter((r) => {
// // // // //       const reqDate = new Date(r.createdAt).toISOString().split("T")[0];

// // // // //       if (fromDate && reqDate < fromDate) return false;
// // // // //       if (toDate && reqDate > toDate) return false;

// // // // //       return true;
// // // // //     })
// // // // //     .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // }, [indentRequests, fromDate, toDate]);
// // // // //   const activeIndent = useMemo(() =>
// // // // //     indents.find(i => i._id === selectedId) || indents[0],
// // // // //     [selectedId, indents]);

// // // // //   const isConfirmed = editingRequest?.status === "confirmed";

// // // // //   return (
// // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // //       {/* Header Area */}
// // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // // //             <span style={{ color: '#6366f1' }}>Indents</span>
// // // // //           </h1>
          
// // // // //           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
// // // // //             {[
// // // // //               { id: 'history', label: 'Logs', icon: <ClipboardList size={14}/> },
// // // // //               { id: 'requests', label: 'Requests', icon: <Inbox size={14}/> },
// // // // //               { id: 'create', label: 'Create New', icon: <PlusCircle size={14}/> }
// // // // //             ].map((btn) => (
// // // // //               <button 
// // // // //                 key={btn.id}
// // // // //                 onClick={() => { setView(btn.id); setSearchTerm(""); setEditingRequest(null); }}
// // // // //                 style={{ 
// // // // //                   display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
// // // // //                   background: view === btn.id ? '#fff' : 'transparent', 
// // // // //                   color: view === btn.id ? '#6366f1' : '#64748b', 
// // // // //                   boxShadow: view === btn.id ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' 
// // // // //                 }}>
// // // // //                 {btn.icon} {btn.label}
// // // // //               </button>
// // // // //             ))}
// // // // //           </div>
// // // // //         </div>

// // // // //         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // //           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // //           <input
// // // // //             type="text"
// // // // //             placeholder="Search..."
// // // // //             value={searchTerm}
// // // // //             onChange={(e) => setSearchTerm(e.target.value)}
// // // // //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
// // // // //           />
// // // // //         </div>
// // // // //       </div>

// // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // //         {/* VIEW: HISTORY/LOGS */}
// // // // //         {view === "history" && (
// // // // //           <>
// // // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>RESULTS ({filteredIndents.length})</div>
// // // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // //                 {filteredIndents.map(r => (
// // // // //                   <div key={r._id} onClick={() => setSelectedId(r._id)}
// // // // //                     style={{ padding: '16px', borderRadius: '16px', cursor: 'pointer', background: selectedId === r._id ? '#fff' : 'transparent', border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent', boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', transition: 'all 0.2s' }}>
// // // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // //                       <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b' }}>{r.indentNo || `REF-${r._id.slice(-4)}`}</div>
// // // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
// // // // //                     </div>
// // // // //                     <div
// // // // //   style={{
// // // // //     fontSize: "12px",
// // // // //     marginTop: "4px",
// // // // //     display: "flex",
// // // // //     justifyContent: "space-between",
// // // // //     alignItems: "center"
// // // // //   }}
// // // // // >
// // // // //   <span style={{ color: "#64748b" }}>
// // // // //     ₹{r.totalAmount?.toLocaleString()}
// // // // //   </span>

// // // // //   <span
// // // // //     style={{
// // // // //       background:
// // // // //         r.status === "pending"
// // // // //           ? "#fee2e2"
// // // // //           : r.status === "purchased"
// // // // //           ? "#f3e8ff"
// // // // //           : r.status === "stock_received"
// // // // //           ? "#dcfce7"
// // // // //           : "#f1f5f9",

// // // // //       color:
// // // // //         r.status === "pending"
// // // // //           ? "#dc2626"
// // // // //           : r.status === "purchased"
// // // // //           ? "#9333ea"
// // // // //           : r.status === "stock_received"
// // // // //           ? "#16a34a"
// // // // //           : "#64748b",

// // // // //       padding: "2px 8px",
// // // // //       borderRadius: "6px",
// // // // //       fontSize: "10px",
// // // // //       fontWeight: "700"
// // // // //     }}
// // // // //   >
// // // // //     {r.status?.replaceAll("_", " ").toUpperCase()}
// // // // //   </span>
// // // // // </div>
// // // // //                     {/* <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>₹{r.totalAmount?.toLocaleString()} • {r.status.toUpperCase()}</div> */}
// // // // //                   </div>
// // // // //                 ))}
// // // // //               </div>
// // // // //             </div>

// // // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // //               {activeIndent ? (
// // // // //                 <>
// // // // //                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
// // // // //                     <div>
// // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>INDENT STATUS</div>
// // // // //                       <div
// // // // //   style={{
// // // // //     padding: "4px 12px",
// // // // //     borderRadius: "6px",
// // // // //     fontSize: "12px",
// // // // //     fontWeight: "800",
// // // // //     display: "inline-block",

// // // // //     background:
// // // // //       activeIndent.status === "pending"
// // // // //         ? "#fee2e2"
// // // // //         : activeIndent.status === "purchased"
// // // // //         ? "#f3e8ff"
// // // // //         : activeIndent.status === "stock_received"
// // // // //         ? "#dcfce7"
// // // // //         : "#f1f5f9",

// // // // //     color:
// // // // //       activeIndent.status === "pending"
// // // // //         ? "#dc2626"
// // // // //         : activeIndent.status === "purchased"
// // // // //         ? "#9333ea"
// // // // //         : activeIndent.status === "stock_received"
// // // // //         ? "#16a34a"
// // // // //         : "#64748b"
// // // // //   }}
// // // // // >
// // // // //   {activeIndent.status?.replaceAll("_", " ").toUpperCase()}
// // // // // </div>
// // // // //                     </div>
// // // // //                     <div style={{ textAlign: 'right' }}>
// // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
// // // // //                       <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activeIndent.totalAmount?.toLocaleString()}</div>
// // // // //                     </div>
// // // // //                   </div>
// // // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // //                       <thead>
// // // // //                         <tr style={{ textAlign: 'left' }}>
// // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th>
// // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
// // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// // // // //                         </tr>
// // // // //                       </thead>
// // // // //                       <tbody>
// // // // //                         {activeIndent.items.map((item, idx) => (
// // // // //                           <tr key={idx}>
// // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(item)}</div>
// // // // //                               {item.status === "rejected" && (
// // // // //   <div
// // // // //     style={{
// // // // //       display: "inline-block",
// // // // //       marginTop: "4px",
// // // // //       background: "#fee2e2",
// // // // //       color: "#dc2626",
// // // // //       padding: "2px 8px",
// // // // //       borderRadius: "6px",
// // // // //       fontSize: "10px",
// // // // //       fontWeight: "700"
// // // // //     }}
// // // // //   >
// // // // //     REJECTED
// // // // //   </div>
// // // // // )}
// // // // //                               <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
// // // // //                             </td>
// // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// // // // //                                 {getGroupName(item)}
// // // // //                               </span>
// // // // //                             </td>
// // // // //                             <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700', borderBottom: '1px solid #f8fafc' }}>
// // // // //                                {formatQty(item.orderedQty)} <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: '400'}}>{getUnitSymbol(item)}</span>
// // // // //                             </td>
// // // // //                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1', borderBottom: '1px solid #f8fafc' }}>₹{(item.orderedQty * item.unitPrice).toLocaleString()}</td>
// // // // //                           </tr>
// // // // //                         ))}
// // // // //                       </tbody>
// // // // //                     </table>
// // // // //                   </div>
// // // // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // //                     <button onClick={handleDownloadExcel} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // //                       <FileSpreadsheet size={16} /> Export Excel
// // // // //                     </button>
// // // // //                     {activeIndent.status.toLowerCase() === 'pending' && (
// // // // //                       <button onClick={() => handleStatusUpdate(activeIndent._id, 'purchased')} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // //                         <CheckCircle2 size={16} /> Mark Purchased
// // // // //                       </button>
// // // // //                     )}
// // // // //                   </div>
// // // // //                 </>
// // // // //               ) : (
// // // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Select an indent to view details</div>
// // // // //               )}
// // // // //             </div>
// // // // //           </>
// // // // //         )}

// // // // //         {/* VIEW: INDENT REQUESTS (INCOMING) */}
// // // // //         {view === "requests" && (
// // // // //           <>
// // // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>
// // // // //                 ALL REQUESTS ({filteredRequests.length})
// // // // //               </div>
// // // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // //                {filteredRequests.map(r => (
// // // // //                   <div 
// // // // //                     key={r._id} 
// // // // //                     onClick={() => {
// // // // //   setEditingRequest(JSON.parse(JSON.stringify(r)));
// // // // //   setApprovedItems({});
// // // // //   setSelectAll(false);
// // // // // }}
// // // // //                     style={{ 
// // // // //                       padding: '16px', 
// // // // //                       borderRadius: '16px', 
// // // // //                       cursor: 'pointer', 
// // // // //                       background: editingRequest?._id === r._id ? '#fff' : 'transparent', 
// // // // //                       border: editingRequest?._id === r._id ? '1px solid #6366f1' : '1px solid transparent', 
// // // // //                       boxShadow: editingRequest?._id === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', 
// // // // //                       transition: 'all 0.2s' 
// // // // //                     }}
// // // // //                   >
// // // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // //                       <div style={{ fontWeight: '700', color: editingRequest?._id === r._id ? '#6366f1' : '#1e293b' }}>
// // // // //                         {r.userId?.name || 'Unknown User'}
// // // // //                       </div>
// // // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
// // // // //                         {new Date(r.createdAt).toLocaleDateString()}
// // // // //                       </div>
// // // // //                     </div>
// // // // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
// // // // //                       <span>{r.godownId?.name || "Main Godown"} • {r.items?.length} Items</span>
// // // // //                       <span
// // // // //   style={{
// // // // //     background:
// // // // //   r.status === "pending"
// // // // //     ? "#fee2e2"
// // // // //     : r.status === "confirmed"
// // // // //     ? "#dbeafe"
// // // // //     : r.status === "received"
// // // // //     ? "#dcfce7"
// // // // //     : r.status === "partially_received"
// // // // //     ? "#f3e8ff"
// // // // //     : r.status === "rejected"
// // // // //     ? "#fee2e2"
// // // // //     : "#f1f5f9",
// // // // //     // background:
// // // // //     //   r.status === "pending"
// // // // //     //     ? "#fee2e2"          // red
// // // // //     //     : r.status === "confirmed"
// // // // //     //     ? "#dbeafe"          // blue
// // // // //     //     : r.status === "received"
// // // // //     //     ? "#dcfce7"          // green
// // // // //     //     : r.status === "partially_received"
// // // // //     //     ? "#f3e8ff"          // purple
// // // // //     //     : "#f1f5f9",

// // // // //     color:
// // // // //       r.status === "pending"
// // // // //         ? "#dc2626"
// // // // //         : r.status === "confirmed"
// // // // //         ? "#2563eb"
// // // // //         : r.status === "received"
// // // // //         ? "#16a34a"
// // // // //         : r.status === "partially_received"
// // // // //         ? "#9333ea"          // purple text
// // // // //         : "#64748b",

// // // // //     padding: "2px 8px",
// // // // //     borderRadius: "6px",
// // // // //     fontSize: "10px",
// // // // //     fontWeight: "700"
// // // // //   }}
// // // // // >
// // // // //   {r.status?.replaceAll("_", " ").toUpperCase()}
// // // // // </span>
// // // // //                     </div>
// // // // //                   </div>
// // // // //                 ))}
// // // // //               </div>
// // // // //             </div>

// // // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // //               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
// // // // //                 {editingRequest ? (
// // // // //                   <>
// // // // //                     <div>
// // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>SOURCE GODOWN</div>
// // // // //                       <div style={{ fontWeight: '800', fontSize: '18px', color: '#0f172a' }}>
// // // // //                         {editingRequest.godownId?.name || "General"}
// // // // //                       </div>
// // // // //                     </div>
// // // // //                     <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
// // // // //                       <button
// // // // //                         onClick={handleDownloadAllRequestsExcel}
// // // // //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// // // // //                       >
// // // // //                         <FileSpreadsheet size={16} /> Export All Requests
// // // // //                       </button>
// // // // //                       <div style={{ textAlign: 'right' }}>
// // // // //                         <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>ESTIMATED VALUATION</div>
// // // // //                         <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>
// // // // //                           ₹{editingRequest.items.reduce((sum, i) => sum + (Number(i.qtyBaseUnit || 0) * Number(i.price || 0)), 0).toLocaleString()}
// // // // //                         </div>
// // // // //                       </div>
// // // // //                     </div>
// // // // //                   </>
// // // // //                 ) : (
// // // // //                   <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
// // // // //                     <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
// // // // //   <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
  
// // // // //   <input
// // // // //     type="date"
// // // // //     value={fromDate}
// // // // //     onChange={(e) => setFromDate(e.target.value)}
// // // // //     style={{
// // // // //       padding: "8px 12px",
// // // // //       borderRadius: "10px",
// // // // //       border: "1px solid #e2e8f0",
// // // // //       fontSize: "13px"
// // // // //     }}
// // // // //   />

// // // // //   <span style={{ fontSize: "12px", color: "#64748b" }}>to</span>

// // // // //   <input
// // // // //     type="date"
// // // // //     value={toDate}
// // // // //     onChange={(e) => setToDate(e.target.value)}
// // // // //     style={{
// // // // //       padding: "8px 12px",
// // // // //       borderRadius: "10px",
// // // // //       border: "1px solid #e2e8f0",
// // // // //       fontSize: "13px"
// // // // //     }}
// // // // //   />

// // // // //   {(fromDate || toDate) && (
// // // // //     <button
// // // // //       onClick={() => {
// // // // //         setFromDate("");
// // // // //         setToDate("");
// // // // //       }}
// // // // //       style={{
// // // // //         padding: "8px 12px",
// // // // //         border: "1px solid #e2e8f0",
// // // // //         borderRadius: "8px",
// // // // //         cursor: "pointer"
// // // // //       }}
// // // // //     >
// // // // //       Clear
// // // // //     </button>
// // // // //   )}
// // // // // </div>

// // // // //   {/* {selectedDate && (
// // // // //     <button
// // // // //       onClick={() => setSelectedDate("")}
// // // // //       style={{
// // // // //         padding: "8px 12px",
// // // // //         border: "1px solid #e2e8f0",
// // // // //         borderRadius: "8px",
// // // // //         cursor: "pointer"
// // // // //       }}
// // // // //     >
// // // // //       Clear
// // // // //     </button>
// // // // //   )} */}
// // // // // </div>
// // // // //                     {/* <input
// // // // //   type="date"
// // // // //   value={selectedDate}
// // // // //   onChange={(e) => setSelectedDate(e.target.value)}
// // // // //   style={{
// // // // //     padding: "8px 12px",
// // // // //     borderRadius: "10px",
// // // // //     border: "1px solid #e2e8f0",
// // // // //     fontSize: "13px"
// // // // //   }}
// // // // // /> */}
// // // // //                      <button
// // // // //                         onClick={handleDownloadAllRequestsExcel}
// // // // //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// // // // //                       >
// // // // //                         <FileSpreadsheet size={16} /> Export All Requests
// // // // //                       </button>
// // // // //                   </div>
// // // // //                 )}
// // // // //               </div>

// // // // //               {editingRequest ? (
// // // // //                 <>
// // // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // //                       <thead>
// // // // //                         <tr style={{ textAlign: 'left' }}>
// // // // //                           <th style={{ width: "40px" }}>
// // // // //   <input
// // // // //     type="checkbox"
// // // // //     checked={selectAll}
// // // // //     disabled={editingRequest?.status !== "pending"}
// // // // //     onChange={(e) => {
// // // // //       const checked = e.target.checked;
// // // // //       setSelectAll(checked);

// // // // //       const newApproved = {};

// // // // //       if (checked) {
// // // // //   editingRequest.items.forEach(it => {
// // // // //     const id = it.stockItemId?._id || it.stockItemId;

// // // // //     // skip rejected items
// // // // //     if (!rejectedItems[id]) {
// // // // //       newApproved[id] = true;
// // // // //     }
// // // // //   });
// // // // // }

// // // // //       setApprovedItems(newApproved);
// // // // //     }}
// // // // //   />
// // // // // </th>
// // // // // <th>ITEM</th>
// // // // //                           {/* <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th> */}
// // // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// // // // //                           {/* <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', width: '140px' }}>QTY</th> */}
// // // // //                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
// // // // //   REQUESTED
// // // // // </th>

// // // // // <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
// // // // //   RECEIVED
// // // // // </th>
// // // // // <th
// // // // //   style={{
// // // // //     padding: '24px 0 12px',
// // // // //     fontSize: '11px',
// // // // //     fontWeight: '900',
// // // // //     color: '#94a3b8',
// // // // //     borderBottom: '1px solid #e2e8f0',
// // // // //     textAlign: 'right'
// // // // //   }}
// // // // // >
// // // // //   ACTION
// // // // // </th>
// // // // //                         </tr>
// // // // //                       </thead>
// // // // //                       <tbody>
// // // // //                         {editingRequest.items.map((it, idx) => (
// // // // //                           <tr
// // // // //   key={idx}
// // // // //   style={{
// // // // //     background:
// // // // //       it.status === "rejected"
// // // // //         ? "#fef2f2"
// // // // //         : "transparent"
// // // // //   }}
// // // // // >
// // // // //   <td>
// // // // //     <input
// // // // //   type="checkbox"
// // // // //   disabled={editingRequest.status !== "pending"}
// // // // //   checked={!!approvedItems[it.stockItemId?._id || it.stockItemId]}
      
// // // // //   onChange={(e) => {
// // // // //   const id = it.stockItemId?._id || it.stockItemId;
// // // // //   const checked = e.target.checked;

// // // // //   setApprovedItems(prev => ({
// // // // //     ...prev,
// // // // //     [id]: checked
// // // // //   }));

// // // // //   if (checked) {
// // // // //     // remove rejected badge when selected again
// // // // //     setRejectedItems(prev => {
// // // // //       const copy = { ...prev };
// // // // //       delete copy[id];
// // // // //       return copy;
// // // // //     });
// // // // //   } else {
// // // // //     // show rejected badge when unchecked
// // // // //     setRejectedItems(prev => ({
// // // // //       ...prev,
// // // // //       [id]: true
// // // // //     }));
// // // // //   }

// // // // //   setSelectAll(false);
// // // // // }}
// // // // //     />
// // // // //   </td>
// // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(it)}</div>
// // // // //                             </td>
// // // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// // // // //                                 {getGroupName(it)}
// // // // //                               </span>
// // // // //                             </td>
// // // // //                            {/* REQUESTED COLUMN */}
// // // // // <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700' }}>
// // // // //   {formatQty(it.qtyBaseUnit)}{" "}
// // // // //   <span style={{ fontSize: '12px', color: '#64748b' }}>
// // // // //     {getUnitSymbol(it)}
// // // // //   </span>
// // // // // </td>

// // // // // {/* RECEIVED COLUMN */}
// // // // // <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700', color: '#16a34a' }}>
// // // // //   {formatQty(it.receivedQty)}{" "}
// // // // //   <span style={{ fontSize: '12px', color: '#64748b' }}>
// // // // //     {getUnitSymbol(it)}
// // // // //   </span>

// // // // //   {(it.receivedQty || 0) >= (it.qtyBaseUnit || 0) && (
// // // // //     <div style={{ fontSize: "10px", color: "#16a34a" }}>
// // // // //       ✔ Fully Received
// // // // //     </div>
// // // // //   )}
// // // // // </td>
// // // // // {/* {it.status === "rejected" && (
// // // // //   <button
// // // // //     onClick={async () => {
// // // // //       try {
// // // // //         await api.patch(
// // // // //           `/indent-requests/${editingRequest._id}/select-item`,
// // // // //           {
// // // // //             stockItemId:
// // // // //               it.stockItemId?._id || it.stockItemId
// // // // //           }
// // // // //         );

// // // // //         showToast(
// // // // //           "Item approved successfully",
// // // // //           "success"
// // // // //         );

// // // // //         fetchIndentRequests();

// // // // //       } catch {
// // // // //         showToast(
// // // // //           "Failed to approve item",
// // // // //           "error"
// // // // //         );
// // // // //       }
// // // // //     }}
// // // // //     style={{
// // // // //       background: "#dcfce7",
// // // // //       color: "#16a34a",
// // // // //       border: "1px solid #bbf7d0",
// // // // //       padding: "6px 12px",
// // // // //       borderRadius: "8px",
// // // // //       cursor: "pointer",
// // // // //       fontWeight: "700",
// // // // //       fontSize: "12px"
// // // // //     }}
// // // // //   >
// // // // //     Select Again
// // // // //   </button>
// // // // // )} */}

// // // // // <td
// // // // //   style={{
// // // // //     padding: '20px 0',
// // // // //     borderBottom: '1px solid #f8fafc',
// // // // //     textAlign: 'right'
// // // // //   }}
// // // // // >
// // // // //   {/* {it.status === "rejected" ? (
// // // // //     <span
// // // // //       style={{
// // // // //         background: "#fee2e2",
// // // // //         color: "#dc2626",
// // // // //         padding: "6px 12px",
// // // // //         borderRadius: "8px",
// // // // //         fontSize: "12px",
// // // // //         fontWeight: "700"
// // // // //       }}
// // // // //     >
// // // // //       REJECTED
// // // // //     </span>
// // // // //   ) : (
// // // // //     editingRequest.status === "pending" && (
// // // // //       rejectedItems[it.stockItemId?._id || it.stockItemId] ? (
// // // // //         <button
// // // // //           onClick={() => {
// // // // //             const id = it.stockItemId?._id || it.stockItemId;

// // // // //             setRejectedItems(prev => {
// // // // //               const copy = { ...prev };
// // // // //               delete copy[id];
// // // // //               return copy;
// // // // //             });

// // // // //             setApprovedItems(prev => ({
// // // // //               ...prev,
// // // // //               [id]: true
// // // // //             }));
// // // // //           }}
// // // // //           style={{
// // // // //             background: "#dcfce7",
// // // // //             color: "#16a34a",
// // // // //             border: "1px solid #bbf7d0",
// // // // //             padding: "6px 12px",
// // // // //             borderRadius: "8px",
// // // // //             cursor: "pointer",
// // // // //             fontWeight: "700",
// // // // //             fontSize: "12px"
// // // // //           }}
// // // // //         >
// // // // //           Select
// // // // //         </button>
// // // // //       ) : (
// // // // //         <button
// // // // //           onClick={() => {
// // // // //             const id = it.stockItemId?._id || it.stockItemId;

// // // // //             setRejectedItems(prev => ({
// // // // //               ...prev,
// // // // //               [id]: true
// // // // //             }));

// // // // //             setApprovedItems(prev => {
// // // // //               const copy = { ...prev };
// // // // //               delete copy[id];
// // // // //               return copy;
// // // // //             });
// // // // //           }}
// // // // //           style={{
// // // // //             background: "#fff",
// // // // //             color: "#dc2626",
// // // // //             border: "1px solid #fecaca",
// // // // //             padding: "6px 12px",
// // // // //             borderRadius: "8px",
// // // // //             cursor: "pointer",
// // // // //             fontWeight: "700",
// // // // //             fontSize: "12px"
// // // // //           }}
// // // // //         >
// // // // //           Reject
// // // // //         </button>
// // // // //       )
// // // // //     )
// // // // //   )} */}
// // // // //   {it.status === "rejected" ||
// // // // // rejectedItems[it.stockItemId?._id || it.stockItemId] ? (
// // // // //   <span
// // // // //     style={{
// // // // //       background: "#fee2e2",
// // // // //       color: "#dc2626",
// // // // //       padding: "6px 12px",
// // // // //       borderRadius: "8px",
// // // // //       fontSize: "12px",
// // // // //       fontWeight: "700"
// // // // //     }}
// // // // //   >
// // // // //     REJECTED
// // // // //   </span>
// // // // // ) : (
// // // // //   editingRequest.status === "pending" && (
// // // // //     <button
// // // // //       onClick={() => {
// // // // //         const id = it.stockItemId?._id || it.stockItemId;

// // // // //         setRejectedItems(prev => ({
// // // // //           ...prev,
// // // // //           [id]: true
// // // // //         }));

// // // // //         setApprovedItems(prev => {
// // // // //           const copy = { ...prev };
// // // // //           delete copy[id];
// // // // //           return copy;
// // // // //         });

// // // // //         setSelectAll(false);
// // // // //       }}
// // // // //       style={{
// // // // //         background: "#fff",
// // // // //         color: "#dc2626",
// // // // //         border: "1px solid #fecaca",
// // // // //         padding: "6px 12px",
// // // // //         borderRadius: "8px",
// // // // //         cursor: "pointer",
// // // // //         fontWeight: "700",
// // // // //         fontSize: "12px"
// // // // //       }}
// // // // //     >
// // // // //       Reject
// // // // //     </button>
// // // // //   )
// // // // // )}
// // // // // </td>                            
// // // // //                           </tr>
// // // // //                         ))}
// // // // //                       </tbody>
// // // // //                     </table>
// // // // //                   </div>

// // // // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // //                     <button 
// // // // //                       onClick={() => setEditingRequest(null)} 
// // // // //                       style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
// // // // //                     >
// // // // //                       Cancel
// // // // //                     </button>
// // // // // {editingRequest.status === "pending" && (
// // // // //   <>
// // // // //     <button
// // // // //       onClick={rejectEntireRequest}
// // // // //       style={{
// // // // //         background: "#dc2626",
// // // // //         border: "none",
// // // // //         color: "#fff",
// // // // //         padding: "12px 24px",
// // // // //         borderRadius: "12px",
// // // // //         fontWeight: "700",
// // // // //         cursor: "pointer"
// // // // //       }}
// // // // //     >
// // // // //       Reject Entire Request
// // // // //     </button>

// // // // //     <button
// // // // //       onClick={confirmRequest}
// // // // //       style={{
// // // // //         background: "#6366f1",
// // // // //         border: "none",
// // // // //         color: "#fff",
// // // // //         padding: "12px 24px",
// // // // //         borderRadius: "12px",
// // // // //         fontWeight: "700",
// // // // //         fontSize: "13px",
// // // // //         cursor: "pointer",
// // // // //         display: "flex",
// // // // //         alignItems: "center",
// // // // //         gap: "8px"
// // // // //       }}
// // // // //     >
// // // // //       Confirm Request
// // // // //     </button>
// // // // //   </>
// // // // // )}
// // // // //                     {/* {!["confirmed", "received", "partially_received"].includes(editingRequest.status) && (
// // // // //   <button onClick={confirmRequest}
// // // // //                         style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
// // // // //                       >
// // // // //                         Confirm Request
// // // // //                       </button>
// // // // //                     )} */}
// // // // //                   </div>
// // // // //                 </>
// // // // //               ) : (
// // // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// // // // //                   Select a request from the sidebar to review and convert
// // // // //                 </div>
// // // // //               )}
// // // // //             </div>
// // // // //           </>
// // // // //         )}

// // // // //         {/* VIEW: CREATE NEW (MANUAL) */}
// // // // //         {view === "create" && (
// // // // //           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
// // // // //             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // //               <div>
// // // // //                 <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Create Requisition</h2>
// // // // //                 <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
// // // // //                     <span onClick={() => setTab("stock-items")} style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: tab === 'stock-items' ? '#6366f1' : '#64748b' }}>Stock Items</span>
// // // // //                 </div>
// // // // //               </div>
// // // // //               <div style={{ textAlign: 'right' }}>
// // // // //                 <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>ESTIMATED TOTAL</div>
// // // // //                 <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{Object.values(selectedItems).reduce((sum, i) => i.checked ? sum + (Number(i.qty || 0) * Number(i.price || 0)) : sum, 0).toLocaleString()}</div>
// // // // //               </div>
// // // // //             </div>

// // // // //             <div style={{ flex: 1, overflowY: 'auto' }}>
// // // // //               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // //                 <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
// // // // //                   <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // //                     <th style={{ padding: '20px 32px', width: '50px' }}>
// // // // //                         <input type="checkbox" onChange={(e) => {
// // // // //                            const isChecked = e.target.checked;
// // // // //                            const newSelection = { ...selectedItems };
// // // // //                            filteredStock.forEach(item => {
// // // // //                              newSelection[item._id] = { ...(newSelection[item._id] || { qty: 0, price: 0 }), checked: isChecked };
// // // // //                            });
// // // // //                            setSelectedItems(newSelection);
// // // // //                         }} style={{ width: '18px', height: '18px' }} />
// // // // //                     </th>
// // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>NAME</th>
// // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>STOCK GROUP</th>
// // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '140px' }}>QTY</th>
// // // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '100px' }}>PRICE</th>
// // // // //                     <th style={{ padding: '20px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>ITEM TOTAL</th>
// // // // //                   </tr>
// // // // //                 </thead>
// // // // //                 <tbody>
// // // // //                   {filteredStock.map((row) => {
// // // // //                     const state = selectedItems[row._id] || { checked: false, qty: 0, price: 0 };
// // // // //                     const itemTotal = Number(state.qty || 0) * Number(state.price || 0);
// // // // //                     return (
// // // // //                       <tr key={row._id} style={{ borderBottom: '1px solid #f8fafc', background: state.checked ? '#fcfdff' : 'transparent' }}>
// // // // //                         <td style={{ padding: '16px 32px' }}>
// // // // //                           <input type="checkbox" checked={state.checked} onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, checked: e.target.checked } }))} style={{ width: '18px', height: '18px' }} />
// // // // //                         </td>
// // // // //                         <td style={{ padding: '16px 0' }}>
// // // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
// // // // //                             <span style={{ fontWeight: '700', color: '#1e293b' }}>{row.name}</span>
// // // // //                           </div>
// // // // //                         </td>
// // // // //                         <td style={{ padding: '16px 0' }}>
// // // // //                           <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
// // // // //                             {row.stockGroupId?.name || 'Unassigned'}
// // // // //                           </span>
// // // // //                         </td>
// // // // //                         <td style={{ padding: '16px 0' }}>
// // // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // //                             <input type="number"
// // // // // step="0.001" disabled={!state.checked} value={state.qty} placeholder="0" onChange={(e) => {
// // // // //   const value = e.target.value;

// // // // //   if (!/^\d*\.?\d{0,3}$/.test(value) && value !== "") {
// // // // //     return;
// // // // //   }

// // // // //   setSelectedItems(prev => ({
// // // // //     ...prev,
// // // // //     [row._id]: {
// // // // //       ...state,
// // // // //       qty: value
// // // // //     }
// // // // //   }));
// // // // // }} style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // // //                             <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{row.unitId?.symbol}</span>
// // // // //                           </div>
// // // // //                         </td>
// // // // //                         <td style={{ padding: '16px 0' }}>
// // // // //                             <input type="number" disabled={!state.checked} value={state.price} placeholder="₹" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, price: e.target.value } }))} style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // // //                         </td>
// // // // //                         <td style={{ padding: '16px 32px', textAlign: 'right', fontWeight: '800', color: state.checked ? '#6366f1' : '#94a3b8' }}>
// // // // //                           ₹{itemTotal.toLocaleString()}
// // // // //                         </td>
// // // // //                       </tr>
// // // // //                     );
// // // // //                   })}
// // // // //                 </tbody>
// // // // //               </table>
// // // // //             </div>
// // // // //             <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // // // //               <button onClick={submitIndent} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
// // // // //                 Submit Requisition
// // // // //               </button>
// // // // //             </div>
// // // // //           </div>
// // // // //         )}
// // // // //       </div>
// // // // //     </div>
// // // // //   );
// // // // // };







// // // // // 18-06-2026






// // // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // // import { api } from "../api.js";
// // // // import { useToast } from "../toast.jsx";
// // // // import XLSX from "xlsx-js-style";
// // // // // import * as XLSX from "xlsx";
// // // // import { 
// // // //   Search, FileSpreadsheet, CheckCircle2, Inbox, 
// // // //   ClipboardList, PlusCircle, RefreshCw, X, Save 
// // // // } from "lucide-react";

// // // // export const IndentPage = () => {
// // // //   const { showToast } = useToast();
// // // //   const [fromDate, setFromDate] = useState("");
// // // // const [toDate, setToDate] = useState("");
// // // //   // View State
// // // //   const [view, setView] = useState("history"); 
// // // //   const [tab, setTab] = useState("stock-items");
// // // //   const [searchTerm, setSearchTerm] = useState("");
  
// // // //   // Data State
// // // //   const [stockItems, setStockItems] = useState([]);
// // // //   const [indents, setIndents] = useState([]);
// // // //   const [indentRequests, setIndentRequests] = useState([]);
// // // //   const [selectedItems, setSelectedItems] = useState({});
// // // //   const [selectedId, setSelectedId] = useState(null);

// // // //   // --- Editing State for Requests ---
// // // //   const [editingRequest, setEditingRequest] = useState(null);
// // // //   const [approvedItems, setApprovedItems] = useState({});
// // // //   const [rejectedItems, setRejectedItems] = useState({});
// // // //   const [selectAll, setSelectAll] = useState(false);

// // // //   // --- Data Loading ---
// // // //   const load = useCallback(async () => {
// // // //     try {
// // // //       const [itemsRes, indentRes] = await Promise.all([
// // // //         api.get("/inventory/stock-items"),
// // // //         api.get("/indents")
// // // //       ]);
// // // //       setStockItems(itemsRes.data || []);
// // // //       const sorted = (indentRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // //       setIndents(sorted);
// // // //       if (sorted.length > 0 && !selectedId) setSelectedId(sorted[0]._id);
// // // //     } catch (error) {
// // // //       showToast("Failed to load data", "error");
// // // //     }
// // // //   }, [showToast, selectedId]);

// // // //   const fetchIndentRequests = useCallback(async () => {
// // // //     try {
// // // //       const res = await api.get("/indent-requests");
// // // //       setIndentRequests(res.data || []);
// // // //     } catch (error) {
// // // //       showToast("Failed to fetch requests", "error");
// // // //     }
// // // //   }, [showToast]);

// // // //   useEffect(() => { 
// // // //     load(); 
// // // //     if (view === "requests") fetchIndentRequests();
// // // //   }, [load, fetchIndentRequests, view]);

// // // //   // --- Helper Functions ---
// // // //   const getUnitSymbol = (item) => {
// // // //     if (item.stockItemId?.unitId?.symbol) return item.stockItemId.unitId.symbol;
// // // //     if (item.unitId?.symbol) return item.unitId.symbol;
// // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // //     const found = stockItems.find(s => s._id === id);
// // // //     return found?.unitId?.symbol || "";
// // // //   };

// // // //   const formatQty = (value) => {
// // // //   const num = Number(value || 0);
// // // //   return Number(num.toFixed(3)).toString();
// // // // };
// // // //   const getItemName = (item) => {
// // // //     if (item.stockItemId?.name) return item.stockItemId.name;
// // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // //     const found = stockItems.find(s => s._id === id);
// // // //     return found ? found.name : "Unknown Product";
// // // //   };


// // // //   const getGroupName = (item) => {
// // // //     if (item.stockItemId?.stockGroupId?.name) return item.stockItemId.stockGroupId.name;
// // // //     if (item.stockGroupId?.name) return item.stockGroupId.name;
// // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // //     const found = stockItems.find(s => s._id === id);
// // // //     return found?.stockGroupId?.name || "General";
// // // //   };
// // // // const handleDownloadAllConsumptionsExcel = () => {
// // // //   if (!processedRows.length) {
// // // //     return;
// // // //   }

// // // //   const groupedByDate = {};

// // // //   processedRows.forEach(cons => {
// // // //     const date = new Date(cons.createdAt)
// // // //       .toISOString()
// // // //       .split("T")[0];

// // // //     if (!groupedByDate[date]) {
// // // //       groupedByDate[date] = [];
// // // //     }

// // // //     groupedByDate[date].push(cons);
// // // //   });

// // // //   const aoa = [];

// // // //   aoa.push(["MONTESSORI CONSUMPTION REPORT"]);
// // // //   aoa.push([]);

// // // //   Object.keys(groupedByDate)
// // // //     .sort((a, b) => new Date(b) - new Date(a))
// // // //     .forEach(date => {

// // // //       const consumptions = groupedByDate[date];

// // // //       const godowns = [
// // // //         ...new Set(
// // // //           consumptions.map(
// // // //             c => c.godownId?.name || "General"
// // // //           )
// // // //         )
// // // //       ];

// // // //       const itemMap = {};

// // // //       consumptions.forEach(cons => {
// // // //         const godown =
// // // //           cons.godownId?.name || "General";

// // // //         cons.items.forEach(item => {

// // // //           const id =
// // // //             item.stockItemId?._id ||
// // // //             item.stockItemId;

// // // //           if (!itemMap[id]) {
// // // //             itemMap[id] = {
// // // //               name:
// // // //                 item.stockItemId?.name ||
// // // //                 "Unknown",
// // // //               group: getGroupName(item),
// // // //               unit:
// // // //                 item.stockItemId?.unitId?.symbol ||
// // // //                 "",
// // // //               total: 0,
// // // //               godowns: {}
// // // //             };
// // // //           }

// // // //           const qty =
// // // //             Number(item.qtyBaseUnit || 0);

// // // //           itemMap[id].total += qty;

// // // //           if (!itemMap[id].godowns[godown]) {
// // // //             itemMap[id].godowns[godown] = 0;
// // // //           }

// // // //           itemMap[id].godowns[godown] += qty;
// // // //         });
// // // //       });

// // // //       aoa.push([`DATE: ${date}`]);

// // // //       const header = [
// // // //         "S.No",
// // // //         "Stock Item",
// // // //         "Stock Group",
// // // //         "Unit",
// // // //         "Total Consumed"
// // // //       ];

// // // //       godowns.forEach(g => {
// // // //         header.push(g);
// // // //       });

// // // //       aoa.push(header);

// // // //       Object.values(itemMap).forEach(
// // // //         (item, index) => {

// // // //           const row = [
// // // //             index + 1,
// // // //             item.name,
// // // //             item.group,
// // // //             item.unit,
// // // //             item.total
// // // //           ];

// // // //           godowns.forEach(g => {
// // // //             row.push(
// // // //               item.godowns[g] || 0
// // // //             );
// // // //           });

// // // //           aoa.push(row);
// // // //         }
// // // //       );

// // // //       aoa.push([]);
// // // //     });

// // // //   const ws =
// // // //     XLSX.utils.aoa_to_sheet(aoa);

// // // //   const maxCols =
// // // //     Math.max(...aoa.map(r => r.length));

// // // //   ws["!merges"] = [
// // // //     {
// // // //       s: { r: 0, c: 0 },
// // // //       e: { r: 0, c: maxCols - 1 }
// // // //     }
// // // //   ];

// // // //   // Main title style
// // // //   if (ws["A1"]) {
// // // //     ws["A1"].s = {
// // // //       font: {
// // // //         bold: true,
// // // //         sz: 16,
// // // //         color: { rgb: "FFFFFF" }
// // // //       },
// // // //       fill: {
// // // //         fgColor: {
// // // //           rgb: "4F46E5"
// // // //         }
// // // //       }
// // // //     };
// // // //   }

// // // //   Object.keys(ws).forEach(cell => {

// // // //     if (
// // // //       ws[cell]?.v &&
// // // //       String(ws[cell].v).startsWith("DATE:")
// // // //     ) {
// // // //       ws[cell].s = {
// // // //         font: {
// // // //           bold: true,
// // // //           color: { rgb: "FFFFFF" }
// // // //         },
// // // //         fill: {
// // // //           fgColor: {
// // // //             rgb: "2563EB"
// // // //           }
// // // //         }
// // // //       };
// // // //     }

// // // //     if (ws[cell]?.v === "S.No") {

// // // //       const rowNo =
// // // //         cell.match(/\d+/)[0];

// // // //       for (
// // // //         let i = 0;
// // // //         i < maxCols;
// // // //         i++
// // // //       ) {

// // // //         const col =
// // // //           XLSX.utils.encode_col(i);

// // // //         const ref =
// // // //           `${col}${rowNo}`;

// // // //         if (ws[ref]) {
// // // //           ws[ref].s = {
// // // //             font: {
// // // //               bold: true,
// // // //               color: {
// // // //                 rgb: "FFFFFF"
// // // //               }
// // // //             },
// // // //             fill: {
// // // //               fgColor: {
// // // //                 rgb: "16A34A"
// // // //               }
// // // //             }
// // // //           };
// // // //         }
// // // //       }
// // // //     }
// // // //   });

// // // //   const wb = XLSX.utils.book_new();

// // // //   XLSX.utils.book_append_sheet(
// // // //     wb,
// // // //     ws,
// // // //     "Consumption"
// // // //   );

// // // //   XLSX.writeFile(
// // // //     wb,
// // // //     fromDate || toDate
// // // //       ? `Consumption_${fromDate || "start"}_to_${toDate || "end"}.xlsx`
// // // //       : "Consumption_Report.xlsx"
// // // //   );
// // // // };
// // // // const handleDownloadAllRequestsExcel = () => {
// // // //   if (!indentRequests.length) {
// // // //     return showToast("No requests available", "info");
// // // //   }

// // // //   let filtered = [...indentRequests];

// // // //   filtered = filtered.filter(r => {
// // // //     const d = new Date(r.createdAt).toISOString().split("T")[0];
// // // //     if (fromDate && d < fromDate) return false;
// // // //     if (toDate && d > toDate) return false;
// // // //     return true;
// // // //   });

// // // //   if (!filtered.length) {
// // // //     return showToast("No requests found", "info");
// // // //   }

// // // // //   filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
// // // // filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // //   const groupedByDate = {};

// // // //   filtered.forEach(req => {
// // // //     const date = new Date(req.createdAt).toISOString().split("T")[0];
// // // //     if (!groupedByDate[date]) groupedByDate[date] = [];
// // // //     groupedByDate[date].push(req);
// // // //   });

// // // //   const aoa = [];

// // // //   aoa.push(["MONTESSORI DAILY INDENT REQUEST REPORT"]);
// // // //   aoa.push([]);

// // // // //   Object.keys(groupedByDate)
// // // // //     .sort((a, b) => new Date(a) - new Date(b))
// // // // //     .forEach(date => {

// // // //     Object.keys(groupedByDate)
// // // //   .sort((a, b) => new Date(b) - new Date(a))
// // // //   .forEach(date => {
// // // //       const requests = groupedByDate[date];

// // // //       const branches = [...new Set(requests.map(r => r.godownId?.name || "General"))];

// // // //       const itemMap = {};

// // // //       requests.forEach(req => {
// // // //         const branch = req.godownId?.name || "General";

// // // //         req.items.forEach(it => {
// // // //           const id = it.stockItemId?._id || it.stockItemId;

// // // //           if (!itemMap[id]) {
// // // //             itemMap[id] = {
// // // //               name: getItemName(it),
// // // //               group: getGroupName(it),
// // // //               unit: getUnitSymbol(it),
// // // //               requestedTotal: 0,
// // // //               receivedTotal: 0,
// // // //               branches: {}
// // // //             };
// // // //           }

// // // //           const reqQty = Number(it.qtyBaseUnit || 0);
// // // //           const recQty = Number(it.receivedQty || 0);

// // // //           itemMap[id].requestedTotal += reqQty;
// // // //           itemMap[id].receivedTotal += recQty;

// // // //           if (!itemMap[id].branches[branch]) {
// // // //             itemMap[id].branches[branch] = { requested: 0, received: 0 };
// // // //           }

// // // //           itemMap[id].branches[branch].requested += reqQty;
// // // //           itemMap[id].branches[branch].received += recQty;
// // // //         });
// // // //       });

// // // //       const items = Object.values(itemMap);

// // // //       aoa.push([`DATE: ${date}`]);

// // // //       const header = [
// // // //         "S.No",
// // // //         "Stock Item",
// // // //         "Stock Group",
// // // //         "Unit",
// // // //         "Requested (Total)",
// // // //         "Received (Total)"
// // // //       ];

// // // //       branches.forEach(b => {
// // // //         header.push(`${b} - Requested`);
// // // //         header.push(`${b} - Received`);
// // // //       });

// // // //       aoa.push(header);

// // // //       items.forEach((it, index) => {
// // // //         const row = [
// // // //           index + 1,
// // // //           it.name,
// // // //           it.group,
// // // //           it.unit,
// // // //           it.requestedTotal,
// // // //           it.receivedTotal
// // // //         ];

// // // //         branches.forEach(b => {
// // // //           row.push(it.branches[b]?.requested || 0);
// // // //           row.push(it.branches[b]?.received || 0);
// // // //         });

// // // //         aoa.push(row);
// // // //       });

// // // //       aoa.push([]);
// // // //     });

// // // // const maxCols = Math.max(...aoa.map(r => r.length));

// // // // const ws = XLSX.utils.aoa_to_sheet(aoa);

// // // // // Merge title row
// // // // ws["!merges"] = [
// // // //   {
// // // //     s: { r: 0, c: 0 },
// // // //     e: { r: 0, c: maxCols - 1 }
// // // //   }
// // // // ];

// // // // // TITLE STYLE
// // // // if (ws["A1"]) {
// // // //   ws["A1"].s = {
// // // //     font: {
// // // //       bold: true,
// // // //       sz: 16,
// // // //       color: { rgb: "FFFFFF" }
// // // //     },
// // // //     alignment: {
// // // //       horizontal: "center"
// // // //     },
// // // //     fill: {
// // // //       fgColor: { rgb: "1E3A8A" } // Dark Blue
// // // //     }
// // // //   };
// // // // }

// // // // // DATE ROW + HEADER ROW STYLING
// // // // Object.keys(ws).forEach(cell => {

// // // //   // DATE ROWS
// // // //   if (
// // // //     ws[cell]?.v &&
// // // //     String(ws[cell].v).startsWith("DATE:")
// // // //   ) {
// // // //     const rowNo = cell.match(/\d+/)[0];

// // // //     for (let i = 0; i < maxCols; i++) {

// // // //       const col = XLSX.utils.encode_col(i);
// // // //       const ref = `${col}${rowNo}`;

// // // //       if (ws[ref]) {
// // // //         ws[ref].s = {
// // // //           font: {
// // // //             bold: true,
// // // //             color: { rgb: "FFFFFF" }
// // // //           },
// // // //           fill: {
// // // //             fgColor: { rgb: "16A34A" } // Green
// // // //           }
// // // //         };
// // // //       }
// // // //     }
// // // //   }

// // // //   // HEADER ROWS
// // // //   if (ws[cell]?.v === "S.No") {

// // // //     const rowNo = cell.match(/\d+/)[0];

// // // //     for (let i = 0; i < maxCols; i++) {

// // // //       const col = XLSX.utils.encode_col(i);
// // // //       const ref = `${col}${rowNo}`;

// // // //       if (ws[ref]) {
// // // //         ws[ref].s = {
// // // //           font: {
// // // //             bold: true,
// // // //             color: { rgb: "FFFFFF" }
// // // //           },
// // // //           alignment: {
// // // //             horizontal: "center"
// // // //           },
// // // //           fill: {
// // // //             fgColor: { rgb: "2563EB" } // Blue
// // // //           }
// // // //         };
// // // //       }
// // // //     }
// // // //   }
// // // // });

// // // // const wb = XLSX.utils.book_new();
// // // //   XLSX.utils.book_append_sheet(wb, ws, "Indent Report");

// // // //   const fileName =
// // // //     fromDate || toDate
// // // //       ? `Montessori_Indent_${fromDate || "start"}_to_${toDate || "end"}.xlsx`
// // // //       : "Montessori_Indent_All.xlsx";

// // // //   XLSX.writeFile(wb, fileName);

// // // //   showToast("Excel exported successfully", "success");
// // // // };


// // // // const handleDownloadExcel = () => {
// // // //   if (!activeIndent) return;

// // // //   const aoa = [];

// // // //   aoa.push(["INDENT REPORT"]);
// // // //   aoa.push([
// // // //     `DATE: ${new Date(activeIndent.createdAt).toLocaleDateString()}`
// // // //   ]);
// // // //   aoa.push([]);

// // // //   aoa.push([
// // // //     "Product",
// // // //     "Group",
// // // //     "Quantity",
// // // //     "Unit",
// // // //     "Price",
// // // //     "Subtotal"
// // // //   ]);

// // // //   activeIndent.items.forEach(item => {
// // // //     aoa.push([
// // // //       getItemName(item),
// // // //       getGroupName(item),
// // // //       item.orderedQty,
// // // //       getUnitSymbol(item),
// // // //       item.unitPrice,
// // // //       item.orderedQty * item.unitPrice
// // // //     ]);
// // // //   });

// // // //   const ws = XLSX.utils.aoa_to_sheet(aoa);
// // // // // Main title
// // // // if (ws["A1"]) {
// // // //   ws["A1"].s = {
// // // //     font: {
// // // //       bold: true,
// // // //       sz: 16,
// // // //       color: { rgb: "FFFFFF" }
// // // //     },
// // // //     fill: {
// // // //       fgColor: { rgb: "4F46E5" }
// // // //     }
// // // //   };
// // // // }
// // // // Object.keys(ws).forEach(cell => {
// // // //   if (
// // // //     cell[0] === "A" &&
// // // //     ws[cell]?.v &&
// // // //     String(ws[cell].v).startsWith("DATE:")
// // // //   ) {
// // // //     ws[cell].s = {
// // // //       font: {
// // // //         bold: true,
// // // //         color: { rgb: "FFFFFF" }
// // // //       },
// // // //       fill: {
// // // //         fgColor: { rgb: "2563EB" }
// // // //       }
// // // //     };
// // // //   }
// // // // });
// // // // Object.keys(ws).forEach(cell => {
// // // //   if (
// // // //     ws[cell]?.v === "S.No"
// // // //   ) {
// // // //     const row = cell.match(/\d+/)[0];

// // // //     ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O"]
// // // //       .forEach(col => {
// // // //         const headerCell = `${col}${row}`;

// // // //         if (ws[headerCell]) {
// // // //           ws[headerCell].s = {
// // // //             font: {
// // // //               bold: true,
// // // //               color: { rgb: "FFFFFF" }
// // // //             },
// // // //             fill: {
// // // //               fgColor: { rgb: "16A34A" }
// // // //             }
// // // //           };
// // // //         }
// // // //       });
// // // //   }
// // // // });  
// // // //   ws["!cols"] = [
// // // //     { wch: 25 },
// // // //     { wch: 20 },
// // // //     { wch: 12 },
// // // //     { wch: 10 },
// // // //     { wch: 12 },
// // // //     { wch: 15 }
// // // //   ];

// // // //   const wb = XLSX.utils.book_new();
// // // //   XLSX.utils.book_append_sheet(wb, ws, "Indent");

// // // //   XLSX.writeFile(
// // // //     wb,
// // // //     `Indent_${activeIndent.indentNo || "Export"}.xlsx`
// // // //   );

// // // //   showToast("Excel exported successfully", "success");
// // // // };

// // // //   const handleStatusUpdate = async (id, newStatus) => {
// // // //     try {
// // // //       if (newStatus === 'purchased') {
// // // //         await api.post(`/indents/${id}/mark-purchased`);
// // // //       } else {
// // // //         await api.patch(`/indents/${id}`, { status: newStatus });
// // // //       }
// // // //       showToast(`Indent marked as ${newStatus}`, "success");
// // // //       load();
// // // //     } catch (error) {
// // // //       showToast("Failed to update status", "error");
// // // //     }
// // // //   };
// // // //  const rejectEntireRequest = async () => {
// // // //   try {
// // // //     await api.patch(
// // // //       `/indent-requests/${editingRequest._id}/reject`
// // // //     );

// // // //     showToast(
// // // //       "Request rejected successfully",
// // // //       "success"
// // // //     );

// // // //     setEditingRequest(null);

// // // //     fetchIndentRequests();

// // // //   } catch (err) {
// // // //     showToast(
// // // //       "Reject failed",
// // // //       "error"
// // // //     );
// // // //   }
// // // // };
// // // //   const confirmRequest = async () => {
   
// // // //   try {
// // // //     const selectedItems = editingRequest.items
// // // //       .filter(it => {
// // // //         const id = it.stockItemId?._id || it.stockItemId;
// // // //         return approvedItems[id];
// // // //       })
// // // //       .map(it => ({
// // // //         stockItemId: it.stockItemId?._id || it.stockItemId,
// // // //         qtyBaseUnit: it.qtyBaseUnit
// // // //       }));

// // // //     if (selectedItems.length === 0) {
// // // //       return showToast("Select at least one item", "info");
// // // //     }

// // // //     await api.patch(`/indent-requests/${editingRequest._id}/confirm`, {
// // // //       items: selectedItems
// // // //     });

// // // //     showToast("Selected items approved!", "success");

// // // //     setEditingRequest(null);
// // // //     setApprovedItems({});
// // // //     fetchIndentRequests();
// // // //   } catch (err) {
// // // //     showToast("Confirmation failed", "error");
// // // //   }
// // // // };

// // // //   const submitIndent = async () => {
// // // //     const itemsToSubmit = Object.keys(selectedItems)
// // // //       .filter(id => selectedItems[id].checked && Number(selectedItems[id].qty) > 0)
// // // //       .map(id => ({
// // // //         stockItemId: id,
// // // //         orderedQty: Number(selectedItems[id].qty),
// // // //         unitPrice: Number(selectedItems[id].price || 0),
// // // //         amount: Number(selectedItems[id].qty) * Number(selectedItems[id].price || 0)
// // // //       }));

// // // //     if (itemsToSubmit.length === 0) return showToast("Select items with quantity", "info");

// // // //     try {
// // // //       await api.post("/indents", { items: itemsToSubmit });
// // // //       showToast("Indent submitted", "success");
// // // //       setSelectedItems({});
// // // //       setView("history");
// // // //       load();
// // // //     } catch (error) {
// // // //       showToast("Submission failed", "error");
// // // //     }
// // // //   };

// // // //   // --- Memoized Filters ---
// // // //   const filteredIndents = useMemo(() => {
// // // //     return indents.filter(i =>
// // // //       (i.indentNo?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
// // // //       (i._id.includes(searchTerm))
// // // //     );
// // // //   }, [indents, searchTerm]);

// // // //   const filteredStock = useMemo(() => {
// // // //     return stockItems.filter(s =>
// // // //       s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
// // // //       s.stockGroupId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
// // // //     );
// // // //   }, [stockItems, searchTerm]);
// // // // const filteredRequests = useMemo(() => {
// // // //   return indentRequests
// // // //     .filter((r) => {
// // // //       const reqDate = new Date(r.createdAt).toISOString().split("T")[0];

// // // //       if (fromDate && reqDate < fromDate) return false;
// // // //       if (toDate && reqDate > toDate) return false;

// // // //       return true;
// // // //     })
// // // //     .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // }, [indentRequests, fromDate, toDate]);
// // // //   const activeIndent = useMemo(() =>
// // // //     indents.find(i => i._id === selectedId) || indents[0],
// // // //     [selectedId, indents]);

// // // //   const isConfirmed = editingRequest?.status === "confirmed";

// // // //   return (
// // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // //       {/* Header Area */}
// // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // //             <span style={{ color: '#6366f1' }}>Indents</span>
// // // //           </h1>
          
// // // //           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
// // // //             {[
// // // //               { id: 'history', label: 'Logs', icon: <ClipboardList size={14}/> },
// // // //               { id: 'requests', label: 'Requests', icon: <Inbox size={14}/> },
// // // //               { id: 'create', label: 'Create New', icon: <PlusCircle size={14}/> }
// // // //             ].map((btn) => (
// // // //               <button 
// // // //                 key={btn.id}
// // // //                 onClick={() => { setView(btn.id); setSearchTerm(""); setEditingRequest(null); }}
// // // //                 style={{ 
// // // //                   display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
// // // //                   background: view === btn.id ? '#fff' : 'transparent', 
// // // //                   color: view === btn.id ? '#6366f1' : '#64748b', 
// // // //                   boxShadow: view === btn.id ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' 
// // // //                 }}>
// // // //                 {btn.icon} {btn.label}
// // // //               </button>
// // // //             ))}
// // // //           </div>
// // // //         </div>

// // // //         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // //           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // //           <input
// // // //             type="text"
// // // //             placeholder="Search..."
// // // //             value={searchTerm}
// // // //             onChange={(e) => setSearchTerm(e.target.value)}
// // // //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
// // // //           />
// // // //         </div>
// // // //       </div>

// // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // //         {/* VIEW: HISTORY/LOGS */}
// // // //         {view === "history" && (
// // // //           <>
// // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>RESULTS ({filteredIndents.length})</div>
// // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // //                 {filteredIndents.map(r => (
// // // //                   <div key={r._id} onClick={() => setSelectedId(r._id)}
// // // //                     style={{ padding: '16px', borderRadius: '16px', cursor: 'pointer', background: selectedId === r._id ? '#fff' : 'transparent', border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent', boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', transition: 'all 0.2s' }}>
// // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // //                       <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b' }}>{r.indentNo || `REF-${r._id.slice(-4)}`}</div>
// // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
// // // //                     </div>
// // // //                     <div
// // // //   style={{
// // // //     fontSize: "12px",
// // // //     marginTop: "4px",
// // // //     display: "flex",
// // // //     justifyContent: "space-between",
// // // //     alignItems: "center"
// // // //   }}
// // // // >
// // // //   <span style={{ color: "#64748b" }}>
// // // //     ₹{r.totalAmount?.toLocaleString()}
// // // //   </span>

// // // //   <span
// // // //     style={{
// // // //       background:
// // // //         r.status === "pending"
// // // //           ? "#fee2e2"
// // // //           : r.status === "purchased"
// // // //           ? "#f3e8ff"
// // // //           : r.status === "stock_received"
// // // //           ? "#dcfce7"
// // // //           : "#f1f5f9",

// // // //       color:
// // // //         r.status === "pending"
// // // //           ? "#dc2626"
// // // //           : r.status === "purchased"
// // // //           ? "#9333ea"
// // // //           : r.status === "stock_received"
// // // //           ? "#16a34a"
// // // //           : "#64748b",

// // // //       padding: "2px 8px",
// // // //       borderRadius: "6px",
// // // //       fontSize: "10px",
// // // //       fontWeight: "700"
// // // //     }}
// // // //   >
// // // //     {r.status?.replaceAll("_", " ").toUpperCase()}
// // // //   </span>
// // // // </div>
// // // //                     {/* <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>₹{r.totalAmount?.toLocaleString()} • {r.status.toUpperCase()}</div> */}
// // // //                   </div>
// // // //                 ))}
// // // //               </div>
// // // //             </div>

// // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // //               {activeIndent ? (
// // // //                 <>
// // // //                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
// // // //                     <div>
// // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>INDENT STATUS</div>
// // // //                       <div
// // // //   style={{
// // // //     padding: "4px 12px",
// // // //     borderRadius: "6px",
// // // //     fontSize: "12px",
// // // //     fontWeight: "800",
// // // //     display: "inline-block",

// // // //     background:
// // // //       activeIndent.status === "pending"
// // // //         ? "#fee2e2"
// // // //         : activeIndent.status === "purchased"
// // // //         ? "#f3e8ff"
// // // //         : activeIndent.status === "stock_received"
// // // //         ? "#dcfce7"
// // // //         : "#f1f5f9",

// // // //     color:
// // // //       activeIndent.status === "pending"
// // // //         ? "#dc2626"
// // // //         : activeIndent.status === "purchased"
// // // //         ? "#9333ea"
// // // //         : activeIndent.status === "stock_received"
// // // //         ? "#16a34a"
// // // //         : "#64748b"
// // // //   }}
// // // // >
// // // //   {activeIndent.status?.replaceAll("_", " ").toUpperCase()}
// // // // </div>
// // // //                     </div>
// // // //                     <div style={{ textAlign: 'right' }}>
// // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
// // // //                       <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activeIndent.totalAmount?.toLocaleString()}</div>
// // // //                     </div>
// // // //                   </div>
// // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // //                       <thead>
// // // //                         <tr style={{ textAlign: 'left' }}>
// // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th>
// // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
// // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// // // //                         </tr>
// // // //                       </thead>
// // // //                       <tbody>
// // // //                         {activeIndent.items.map((item, idx) => (
// // // //                           <tr key={idx}>
// // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(item)}</div>
// // // //                               {item.status === "rejected" && (
// // // //   <div
// // // //     style={{
// // // //       display: "inline-block",
// // // //       marginTop: "4px",
// // // //       background: "#fee2e2",
// // // //       color: "#dc2626",
// // // //       padding: "2px 8px",
// // // //       borderRadius: "6px",
// // // //       fontSize: "10px",
// // // //       fontWeight: "700"
// // // //     }}
// // // //   >
// // // //     REJECTED
// // // //   </div>
// // // // )}
// // // //                               <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
// // // //                             </td>
// // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// // // //                                 {getGroupName(item)}
// // // //                               </span>
// // // //                             </td>
// // // //                             <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700', borderBottom: '1px solid #f8fafc' }}>
// // // //                                {formatQty(item.orderedQty)} <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: '400'}}>{getUnitSymbol(item)}</span>
// // // //                             </td>
// // // //                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1', borderBottom: '1px solid #f8fafc' }}>₹{(item.orderedQty * item.unitPrice).toLocaleString()}</td>
// // // //                           </tr>
// // // //                         ))}
// // // //                       </tbody>
// // // //                     </table>
// // // //                   </div>
// // // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // //                     <button onClick={handleDownloadExcel} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // //                       <FileSpreadsheet size={16} /> Export Excel
// // // //                     </button>
// // // //                     {activeIndent.status.toLowerCase() === 'pending' && (
// // // //                       <button onClick={() => handleStatusUpdate(activeIndent._id, 'purchased')} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // //                         <CheckCircle2 size={16} /> Mark Purchased
// // // //                       </button>
// // // //                     )}
// // // //                   </div>
// // // //                 </>
// // // //               ) : (
// // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Select an indent to view details</div>
// // // //               )}
// // // //             </div>
// // // //           </>
// // // //         )}

// // // //         {/* VIEW: INDENT REQUESTS (INCOMING) */}
// // // //         {view === "requests" && (
// // // //           <>
// // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>
// // // //                 ALL REQUESTS ({filteredRequests.length})
// // // //               </div>
// // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // //                {filteredRequests.map(r => (
// // // //                   <div 
// // // //                     key={r._id} 
// // // //                     onClick={() => {
// // // //   setEditingRequest(JSON.parse(JSON.stringify(r)));
// // // //   setApprovedItems({});
// // // //   setSelectAll(false);
// // // // }}
// // // //                     style={{ 
// // // //                       padding: '16px', 
// // // //                       borderRadius: '16px', 
// // // //                       cursor: 'pointer', 
// // // //                       background: editingRequest?._id === r._id ? '#fff' : 'transparent', 
// // // //                       border: editingRequest?._id === r._id ? '1px solid #6366f1' : '1px solid transparent', 
// // // //                       boxShadow: editingRequest?._id === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', 
// // // //                       transition: 'all 0.2s' 
// // // //                     }}
// // // //                   >
// // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // //                       <div style={{ fontWeight: '700', color: editingRequest?._id === r._id ? '#6366f1' : '#1e293b' }}>
// // // //                         {r.userId?.name || 'Unknown User'}
// // // //                       </div>
// // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
// // // //                         {new Date(r.createdAt).toLocaleDateString()}
// // // //                       </div>
// // // //                     </div>
// // // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
// // // //                       <span>{r.godownId?.name || "Main Godown"} • {r.items?.length} Items</span>
// // // //                       <span
// // // //   style={{
// // // //     background:
// // // //   r.status === "pending"
// // // //     ? "#fee2e2"
// // // //     : r.status === "confirmed"
// // // //     ? "#dbeafe"
// // // //     : r.status === "received"
// // // //     ? "#dcfce7"
// // // //     : r.status === "partially_received"
// // // //     ? "#f3e8ff"
// // // //     : r.status === "rejected"
// // // //     ? "#fee2e2"
// // // //     : "#f1f5f9",

// // // //     color:
// // // //       r.status === "pending"
// // // //         ? "#dc2626"
// // // //         : r.status === "confirmed"
// // // //         ? "#2563eb"
// // // //         : r.status === "received"
// // // //         ? "#16a34a"
// // // //         : r.status === "partially_received"
// // // //         ? "#9333ea"          // purple text
// // // //         : "#64748b",

// // // //     padding: "2px 8px",
// // // //     borderRadius: "6px",
// // // //     fontSize: "10px",
// // // //     fontWeight: "700"
// // // //   }}
// // // // >
// // // //   {r.status?.replaceAll("_", " ").toUpperCase()}
// // // // </span>
// // // //                     </div>
// // // //                   </div>
// // // //                 ))}
// // // //               </div>
// // // //             </div>

// // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // //               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
// // // //                 {editingRequest ? (
// // // //                   <>
// // // //                     <div>
// // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>SOURCE GODOWN</div>
// // // //                       <div style={{ fontWeight: '800', fontSize: '18px', color: '#0f172a' }}>
// // // //                         {editingRequest.godownId?.name || "General"}
// // // //                       </div>
// // // //                     </div>
// // // //                     <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
// // // //                       <button
// // // //                         onClick={handleDownloadAllRequestsExcel}
// // // //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// // // //                       >
// // // //                         <FileSpreadsheet size={16} /> Export All Requests
// // // //                       </button>
// // // //                       <div style={{ textAlign: 'right' }}>
// // // //                         <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>ESTIMATED VALUATION</div>
// // // //                         <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>
// // // //                           ₹{editingRequest.items.reduce((sum, i) => sum + (Number(i.qtyBaseUnit || 0) * Number(i.price || 0)), 0).toLocaleString()}
// // // //                         </div>
// // // //                       </div>
// // // //                     </div>
// // // //                   </>
// // // //                 ) : (
// // // //                   <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
// // // //                     <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
// // // //   <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
  
// // // //   <input
// // // //     type="date"
// // // //     value={fromDate}
// // // //     onChange={(e) => setFromDate(e.target.value)}
// // // //     style={{
// // // //       padding: "8px 12px",
// // // //       borderRadius: "10px",
// // // //       border: "1px solid #e2e8f0",
// // // //       fontSize: "13px"
// // // //     }}
// // // //   />

// // // //   <span style={{ fontSize: "12px", color: "#64748b" }}>to</span>

// // // //   <input
// // // //     type="date"
// // // //     value={toDate}
// // // //     onChange={(e) => setToDate(e.target.value)}
// // // //     style={{
// // // //       padding: "8px 12px",
// // // //       borderRadius: "10px",
// // // //       border: "1px solid #e2e8f0",
// // // //       fontSize: "13px"
// // // //     }}
// // // //   />

// // // //   {(fromDate || toDate) && (
// // // //     <button
// // // //       onClick={() => {
// // // //         setFromDate("");
// // // //         setToDate("");
// // // //       }}
// // // //       style={{
// // // //         padding: "8px 12px",
// // // //         border: "1px solid #e2e8f0",
// // // //         borderRadius: "8px",
// // // //         cursor: "pointer"
// // // //       }}
// // // //     >
// // // //       Clear
// // // //     </button>
// // // //   )}
// // // // </div>

// // // // </div>

// // // //                      <button
// // // //                         onClick={handleDownloadAllRequestsExcel}
// // // //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// // // //                       >
// // // //                         <FileSpreadsheet size={16} /> Export All Requests
// // // //                       </button>
// // // //                   </div>
// // // //                 )}
// // // //               </div>

// // // //               {editingRequest ? (
// // // //                 <>
// // // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // //                       <thead>
// // // //                         <tr style={{ textAlign: 'left' }}>
// // // //                           <th style={{ width: "40px" }}>
// // // //   <input
// // // //     type="checkbox"
// // // //     checked={selectAll}
// // // //     disabled={editingRequest?.status !== "pending"}
// // // //     onChange={(e) => {
// // // //       const checked = e.target.checked;
// // // //       setSelectAll(checked);

// // // //       const newApproved = {};

// // // //       if (checked) {
// // // //   editingRequest.items.forEach(it => {
// // // //     const id = it.stockItemId?._id || it.stockItemId;

// // // //     // skip rejected items
// // // //     if (!rejectedItems[id]) {
// // // //       newApproved[id] = true;
// // // //     }
// // // //   });
// // // // }

// // // //       setApprovedItems(newApproved);
// // // //     }}
// // // //   />
// // // // </th>
// // // // <th>ITEM</th>
// // // //                           {/* <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th> */}
// // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// // // //                           {/* <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', width: '140px' }}>QTY</th> */}
// // // //                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
// // // //   REQUESTED
// // // // </th>

// // // // <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
// // // //   RECEIVED
// // // // </th>
// // // // <th
// // // //   style={{
// // // //     padding: '24px 0 12px',
// // // //     fontSize: '11px',
// // // //     fontWeight: '900',
// // // //     color: '#94a3b8',
// // // //     borderBottom: '1px solid #e2e8f0',
// // // //     textAlign: 'right'
// // // //   }}
// // // // >
// // // //   ACTION
// // // // </th>
// // // //                         </tr>
// // // //                       </thead>
// // // //                       <tbody>
// // // //                         {editingRequest.items.map((it, idx) => (
// // // //                           <tr
// // // //   key={idx}
// // // //   style={{
// // // //     background:
// // // //       it.status === "rejected"
// // // //         ? "#fef2f2"
// // // //         : "transparent"
// // // //   }}
// // // // >
// // // //   <td>
// // // //     <input
// // // //   type="checkbox"
// // // //   disabled={editingRequest.status !== "pending"}
// // // //   checked={!!approvedItems[it.stockItemId?._id || it.stockItemId]}
      
// // // //   onChange={(e) => {
// // // //   const id = it.stockItemId?._id || it.stockItemId;
// // // //   const checked = e.target.checked;

// // // //   setApprovedItems(prev => ({
// // // //     ...prev,
// // // //     [id]: checked
// // // //   }));

// // // //   if (checked) {
// // // //     // remove rejected badge when selected again
// // // //     setRejectedItems(prev => {
// // // //       const copy = { ...prev };
// // // //       delete copy[id];
// // // //       return copy;
// // // //     });
// // // //   } else {
// // // //     // show rejected badge when unchecked
// // // //     setRejectedItems(prev => ({
// // // //       ...prev,
// // // //       [id]: true
// // // //     }));
// // // //   }

// // // //   setSelectAll(false);
// // // // }}
// // // //     />
// // // //   </td>
// // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(it)}</div>
// // // //                             </td>
// // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// // // //                                 {getGroupName(it)}
// // // //                               </span>
// // // //                             </td>
// // // //                            {/* REQUESTED COLUMN */}
// // // // <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700' }}>
// // // //   {formatQty(it.qtyBaseUnit)}{" "}
// // // //   <span style={{ fontSize: '12px', color: '#64748b' }}>
// // // //     {getUnitSymbol(it)}
// // // //   </span>
// // // // </td>

// // // // {/* RECEIVED COLUMN */}
// // // // <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700', color: '#16a34a' }}>
// // // //   {formatQty(it.receivedQty)}{" "}
// // // //   <span style={{ fontSize: '12px', color: '#64748b' }}>
// // // //     {getUnitSymbol(it)}
// // // //   </span>

// // // //   {(it.receivedQty || 0) >= (it.qtyBaseUnit || 0) && (
// // // //     <div style={{ fontSize: "10px", color: "#16a34a" }}>
// // // //       ✔ Fully Received
// // // //     </div>
// // // //   )}
// // // // </td>


// // // // <td
// // // //   style={{
// // // //     padding: '20px 0',
// // // //     borderBottom: '1px solid #f8fafc',
// // // //     textAlign: 'right'
// // // //   }}
// // // // >
 
// // // //   {it.status === "rejected" ||
// // // // rejectedItems[it.stockItemId?._id || it.stockItemId] ? (
// // // //   <span
// // // //     style={{
// // // //       background: "#fee2e2",
// // // //       color: "#dc2626",
// // // //       padding: "6px 12px",
// // // //       borderRadius: "8px",
// // // //       fontSize: "12px",
// // // //       fontWeight: "700"
// // // //     }}
// // // //   >
// // // //     REJECTED
// // // //   </span>
// // // // ) : (
// // // //   editingRequest.status === "pending" && (
// // // //     <button
// // // //       onClick={() => {
// // // //         const id = it.stockItemId?._id || it.stockItemId;

// // // //         setRejectedItems(prev => ({
// // // //           ...prev,
// // // //           [id]: true
// // // //         }));

// // // //         setApprovedItems(prev => {
// // // //           const copy = { ...prev };
// // // //           delete copy[id];
// // // //           return copy;
// // // //         });

// // // //         setSelectAll(false);
// // // //       }}
// // // //       style={{
// // // //         background: "#fff",
// // // //         color: "#dc2626",
// // // //         border: "1px solid #fecaca",
// // // //         padding: "6px 12px",
// // // //         borderRadius: "8px",
// // // //         cursor: "pointer",
// // // //         fontWeight: "700",
// // // //         fontSize: "12px"
// // // //       }}
// // // //     >
// // // //       Reject
// // // //     </button>
// // // //   )
// // // // )}
// // // // </td>                            
// // // //                           </tr>
// // // //                         ))}
// // // //                       </tbody>
// // // //                     </table>
// // // //                   </div>

// // // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // //                     <button 
// // // //                       onClick={() => setEditingRequest(null)} 
// // // //                       style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
// // // //                     >
// // // //                       Cancel
// // // //                     </button>
// // // // {editingRequest.status === "pending" && (
// // // //   <>
// // // //     <button
// // // //       onClick={rejectEntireRequest}
// // // //       style={{
// // // //         background: "#dc2626",
// // // //         border: "none",
// // // //         color: "#fff",
// // // //         padding: "12px 24px",
// // // //         borderRadius: "12px",
// // // //         fontWeight: "700",
// // // //         cursor: "pointer"
// // // //       }}
// // // //     >
// // // //       Reject Entire Request
// // // //     </button>

// // // //     <button
// // // //       onClick={confirmRequest}
// // // //       style={{
// // // //         background: "#6366f1",
// // // //         border: "none",
// // // //         color: "#fff",
// // // //         padding: "12px 24px",
// // // //         borderRadius: "12px",
// // // //         fontWeight: "700",
// // // //         fontSize: "13px",
// // // //         cursor: "pointer",
// // // //         display: "flex",
// // // //         alignItems: "center",
// // // //         gap: "8px"
// // // //       }}
// // // //     >
// // // //       Confirm Request
// // // //     </button>
// // // //   </>
// // // // )}
// // // //                     {/* {!["confirmed", "received", "partially_received"].includes(editingRequest.status) && (
// // // //   <button onClick={confirmRequest}
// // // //                         style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
// // // //                       >
// // // //                         Confirm Request
// // // //                       </button>
// // // //                     )} */}
// // // //                   </div>
// // // //                 </>
// // // //               ) : (
// // // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// // // //                   Select a request from the sidebar to review and convert
// // // //                 </div>
// // // //               )}
// // // //             </div>
// // // //           </>
// // // //         )}

// // // //         {/* VIEW: CREATE NEW (MANUAL) */}
// // // //         {view === "create" && (
// // // //           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
// // // //             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // //               <div>
// // // //                 <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Create Requisition</h2>
// // // //                 <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
// // // //                     <span onClick={() => setTab("stock-items")} style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: tab === 'stock-items' ? '#6366f1' : '#64748b' }}>Stock Items</span>
// // // //                 </div>
// // // //               </div>
// // // //               <div style={{ textAlign: 'right' }}>
// // // //                 <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>ESTIMATED TOTAL</div>
// // // //                 <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{Object.values(selectedItems).reduce((sum, i) => i.checked ? sum + (Number(i.qty || 0) * Number(i.price || 0)) : sum, 0).toLocaleString()}</div>
// // // //               </div>
// // // //             </div>

// // // //             <div style={{ flex: 1, overflowY: 'auto' }}>
// // // //               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // //                 <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
// // // //                   <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // //                     <th style={{ padding: '20px 32px', width: '50px' }}>
// // // //                         <input type="checkbox" onChange={(e) => {
// // // //                            const isChecked = e.target.checked;
// // // //                            const newSelection = { ...selectedItems };
// // // //                            filteredStock.forEach(item => {
// // // //                              newSelection[item._id] = { ...(newSelection[item._id] || { qty: 0, price: 0 }), checked: isChecked };
// // // //                            });
// // // //                            setSelectedItems(newSelection);
// // // //                         }} style={{ width: '18px', height: '18px' }} />
// // // //                     </th>
// // // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>NAME</th>
// // // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>STOCK GROUP</th>
// // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '140px' }}>QTY</th>
// // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '100px' }}>PRICE</th>
// // // //                     <th style={{ padding: '20px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>ITEM TOTAL</th>
// // // //                   </tr>
// // // //                 </thead>
// // // //                 <tbody>
// // // //                   {filteredStock.map((row) => {
// // // //                     const state = selectedItems[row._id] || { checked: false, qty: 0, price: 0 };
// // // //                     const itemTotal = Number(state.qty || 0) * Number(state.price || 0);
// // // //                     return (
// // // //                       <tr key={row._id} style={{ borderBottom: '1px solid #f8fafc', background: state.checked ? '#fcfdff' : 'transparent' }}>
// // // //                         <td style={{ padding: '16px 32px' }}>
// // // //                           <input type="checkbox" checked={state.checked} onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, checked: e.target.checked } }))} style={{ width: '18px', height: '18px' }} />
// // // //                         </td>
// // // //                         <td style={{ padding: '16px 0' }}>
// // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
// // // //                             <span style={{ fontWeight: '700', color: '#1e293b' }}>{row.name}</span>
// // // //                           </div>
// // // //                         </td>
// // // //                         <td style={{ padding: '16px 0' }}>
// // // //                           <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
// // // //                             {row.stockGroupId?.name || 'Unassigned'}
// // // //                           </span>
// // // //                         </td>
// // // //                         <td style={{ padding: '16px 0' }}>
// // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // //                             <input type="number"
// // // // step="0.001" disabled={!state.checked} value={state.qty} placeholder="0" onChange={(e) => {
// // // //   const value = e.target.value;

// // // //   if (!/^\d*\.?\d{0,3}$/.test(value) && value !== "") {
// // // //     return;
// // // //   }

// // // //   setSelectedItems(prev => ({
// // // //     ...prev,
// // // //     [row._id]: {
// // // //       ...state,
// // // //       qty: value
// // // //     }
// // // //   }));
// // // // }} style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // //                             <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{row.unitId?.symbol}</span>
// // // //                           </div>
// // // //                         </td>
// // // //                         <td style={{ padding: '16px 0' }}>
// // // //                             <input type="number" disabled={!state.checked} value={state.price} placeholder="₹" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, price: e.target.value } }))} style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // // //                         </td>
// // // //                         <td style={{ padding: '16px 32px', textAlign: 'right', fontWeight: '800', color: state.checked ? '#6366f1' : '#94a3b8' }}>
// // // //                           ₹{itemTotal.toLocaleString()}
// // // //                         </td>
// // // //                       </tr>
// // // //                     );
// // // //                   })}
// // // //                 </tbody>
// // // //               </table>
// // // //             </div>
// // // //             <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // // //               <button onClick={submitIndent} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
// // // //                 Submit Requisition
// // // //               </button>
// // // //             </div>
// // // //           </div>
// // // //         )}
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // };









// // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // import { api } from "../api.js";
// // // import { useToast } from "../toast.jsx";
// // // import XLSX from "xlsx-js-style";
// // // // import * as XLSX from "xlsx";
// // // import { 
// // //   Search, FileSpreadsheet, CheckCircle2, Inbox, 
// // //   ClipboardList, PlusCircle, RefreshCw, X, Save 
// // // } from "lucide-react";

// // // export const IndentPage = () => {
// // //   const { showToast } = useToast();
// // //   const [fromDate, setFromDate] = useState("");
// // // const [toDate, setToDate] = useState("");
// // //   // View State
// // //   const [view, setView] = useState("history"); 
// // //   const [tab, setTab] = useState("stock-items");
// // //   const [searchTerm, setSearchTerm] = useState("");
  
// // //   // Data State
// // //   const [stockItems, setStockItems] = useState([]);
// // //   const [indents, setIndents] = useState([]);
// // //   const [indentRequests, setIndentRequests] = useState([]);
// // //   const [selectedItems, setSelectedItems] = useState({});
// // //   const [selectedId, setSelectedId] = useState(null);

// // //   // --- Editing State for Requests ---
// // //   const [editingRequest, setEditingRequest] = useState(null);
// // //   const [approvedItems, setApprovedItems] = useState({});
// // //   const [rejectedItems, setRejectedItems] = useState({});
// // //   const [selectAll, setSelectAll] = useState(false);

// // //   // --- Data Loading ---
// // //   const load = useCallback(async () => {
// // //     try {
// // //       const [itemsRes, indentRes] = await Promise.all([
// // //         api.get("/inventory/stock-items"),
// // //         api.get("/indents")
// // //       ]);
// // //       setStockItems(itemsRes.data || []);
// // //       const sorted = (indentRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // //       setIndents(sorted);
// // //       if (sorted.length > 0 && !selectedId) setSelectedId(sorted[0]._id);
// // //     } catch (error) {
// // //       showToast("Failed to load data", "error");
// // //     }
// // //   }, [showToast, selectedId]);

// // //   const fetchIndentRequests = useCallback(async () => {
// // //     try {
// // //       const res = await api.get("/indent-requests");
// // //       setIndentRequests(res.data || []);
// // //     } catch (error) {
// // //       showToast("Failed to fetch requests", "error");
// // //     }
// // //   }, [showToast]);

// // //   useEffect(() => { 
// // //     load(); 
// // //     if (view === "requests") fetchIndentRequests();
// // //   }, [load, fetchIndentRequests, view]);

// // //   // --- Helper Functions ---
// // //   const getUnitSymbol = (item) => {
// // //     if (item.stockItemId?.unitId?.symbol) return item.stockItemId.unitId.symbol;
// // //     if (item.unitId?.symbol) return item.unitId.symbol;
// // //     const id = item.stockItemId?._id || item.stockItemId;
// // //     const found = stockItems.find(s => s._id === id);
// // //     return found?.unitId?.symbol || "";
// // //   };

// // //   const formatQty = (value) => {
// // //   const num = Number(value || 0);
// // //   return Number(num.toFixed(3)).toString();
// // // };
// // //   const getItemName = (item) => {
// // //     if (item.stockItemId?.name) return item.stockItemId.name;
// // //     const id = item.stockItemId?._id || item.stockItemId;
// // //     const found = stockItems.find(s => s._id === id);
// // //     return found ? found.name : "Unknown Product";
// // //   };


// // //   const getGroupName = (item) => {
// // //     if (item.stockItemId?.stockGroupId?.name) return item.stockItemId.stockGroupId.name;
// // //     if (item.stockGroupId?.name) return item.stockGroupId.name;
// // //     const id = item.stockItemId?._id || item.stockItemId;
// // //     const found = stockItems.find(s => s._id === id);
// // //     return found?.stockGroupId?.name || "General";
// // //   };
// // // const handleDownloadAllConsumptionsExcel = () => {
// // //   if (!processedRows.length) {
// // //     return;
// // //   }

// // //   const groupedByDate = {};

// // //   processedRows.forEach(cons => {
// // //     const date = new Date(cons.createdAt)
// // //       .toISOString()
// // //       .split("T")[0];

// // //     if (!groupedByDate[date]) {
// // //       groupedByDate[date] = [];
// // //     }

// // //     groupedByDate[date].push(cons);
// // //   });

// // //   const aoa = [];

// // //   aoa.push(["MONTESSORI CONSUMPTION REPORT"]);
// // //   aoa.push([]);

// // //   Object.keys(groupedByDate)
// // //     .sort((a, b) => new Date(b) - new Date(a))
// // //     .forEach(date => {

// // //       const consumptions = groupedByDate[date];

// // //       const godowns = [
// // //         ...new Set(
// // //           consumptions.map(
// // //             c => c.godownId?.name || "General"
// // //           )
// // //         )
// // //       ];

// // //       const itemMap = {};

// // //       consumptions.forEach(cons => {
// // //         const godown =
// // //           cons.godownId?.name || "General";

// // //         cons.items.forEach(item => {

// // //           const id =
// // //             item.stockItemId?._id ||
// // //             item.stockItemId;

// // //           if (!itemMap[id]) {
// // //             itemMap[id] = {
// // //               name:
// // //                 item.stockItemId?.name ||
// // //                 "Unknown",
// // //               group: getGroupName(item),
// // //               unit:
// // //                 item.stockItemId?.unitId?.symbol ||
// // //                 "",
// // //               total: 0,
// // //               godowns: {}
// // //             };
// // //           }

// // //           const qty =
// // //             Number(item.qtyBaseUnit || 0);

// // //           itemMap[id].total += qty;

// // //           if (!itemMap[id].godowns[godown]) {
// // //             itemMap[id].godowns[godown] = 0;
// // //           }

// // //           itemMap[id].godowns[godown] += qty;
// // //         });
// // //       });

// // //       aoa.push([`DATE: ${date}`]);

// // //       const header = [
// // //         "S.No",
// // //         "Stock Item",
// // //         "Stock Group",
// // //         "Unit",
// // //         "Total Consumed"
// // //       ];

// // //       godowns.forEach(g => {
// // //         header.push(g);
// // //       });

// // //       aoa.push(header);

// // //       Object.values(itemMap).forEach(
// // //         (item, index) => {

// // //           const row = [
// // //             index + 1,
// // //             item.name,
// // //             item.group,
// // //             item.unit,
// // //             item.total
// // //           ];

// // //           godowns.forEach(g => {
// // //             row.push(
// // //               item.godowns[g] || 0
// // //             );
// // //           });

// // //           aoa.push(row);
// // //         }
// // //       );

// // //       aoa.push([]);
// // //     });

// // //   const ws =
// // //     XLSX.utils.aoa_to_sheet(aoa);

// // //   const maxCols =
// // //     Math.max(...aoa.map(r => r.length));

// // //   ws["!merges"] = [
// // //     {
// // //       s: { r: 0, c: 0 },
// // //       e: { r: 0, c: maxCols - 1 }
// // //     }
// // //   ];

// // //   // Main title style
// // //   if (ws["A1"]) {
// // //     ws["A1"].s = {
// // //       font: {
// // //         bold: true,
// // //         sz: 16,
// // //         color: { rgb: "FFFFFF" }
// // //       },
// // //       fill: {
// // //         fgColor: {
// // //           rgb: "4F46E5"
// // //         }
// // //       }
// // //     };
// // //   }

// // //   Object.keys(ws).forEach(cell => {

// // //     if (
// // //       ws[cell]?.v &&
// // //       String(ws[cell].v).startsWith("DATE:")
// // //     ) {
// // //       ws[cell].s = {
// // //         font: {
// // //           bold: true,
// // //           color: { rgb: "FFFFFF" }
// // //         },
// // //         fill: {
// // //           fgColor: {
// // //             rgb: "2563EB"
// // //           }
// // //         }
// // //       };
// // //     }

// // //     if (ws[cell]?.v === "S.No") {

// // //       const rowNo =
// // //         cell.match(/\d+/)[0];

// // //       for (
// // //         let i = 0;
// // //         i < maxCols;
// // //         i++
// // //       ) {

// // //         const col =
// // //           XLSX.utils.encode_col(i);

// // //         const ref =
// // //           `${col}${rowNo}`;

// // //         if (ws[ref]) {
// // //           ws[ref].s = {
// // //             font: {
// // //               bold: true,
// // //               color: {
// // //                 rgb: "FFFFFF"
// // //               }
// // //             },
// // //             fill: {
// // //               fgColor: {
// // //                 rgb: "16A34A"
// // //               }
// // //             }
// // //           };
// // //         }
// // //       }
// // //     }
// // //   });

// // //   const wb = XLSX.utils.book_new();

// // //   XLSX.utils.book_append_sheet(
// // //     wb,
// // //     ws,
// // //     "Consumption"
// // //   );

// // //   XLSX.writeFile(
// // //     wb,
// // //     fromDate || toDate
// // //       ? `Consumption_${fromDate || "start"}_to_${toDate || "end"}.xlsx`
// // //       : "Consumption_Report.xlsx"
// // //   );
// // // };
// // // const handleDownloadAllRequestsExcel = () => {
// // //   if (!indentRequests.length) {
// // //     return showToast("No requests available", "info");
// // //   }

// // //   let filtered = [...indentRequests];

// // //   filtered = filtered.filter(r => {
// // //     const d = new Date(r.createdAt).toISOString().split("T")[0];
// // //     if (fromDate && d < fromDate) return false;
// // //     if (toDate && d > toDate) return false;
// // //     return true;
// // //   });

// // //   if (!filtered.length) {
// // //     return showToast("No requests found", "info");
// // //   }

// // // //   filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
// // // filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // //   const groupedByDate = {};

// // //   filtered.forEach(req => {
// // //     const date = new Date(req.createdAt).toISOString().split("T")[0];
// // //     if (!groupedByDate[date]) groupedByDate[date] = [];
// // //     groupedByDate[date].push(req);
// // //   });

// // //   const aoa = [];

// // //   aoa.push(["MONTESSORI DAILY INDENT REQUEST REPORT"]);
// // //   aoa.push([]);

// // // //   Object.keys(groupedByDate)
// // // //     .sort((a, b) => new Date(a) - new Date(b))
// // // //     .forEach(date => {

// // //     Object.keys(groupedByDate)
// // //   .sort((a, b) => new Date(b) - new Date(a))
// // //   .forEach(date => {
// // //       const requests = groupedByDate[date];

// // //       const branches = [...new Set(requests.map(r => r.godownId?.name || "General"))];

// // //       const itemMap = {};

// // //       requests.forEach(req => {
// // //         const branch = req.godownId?.name || "General";

// // //         req.items.forEach(it => {
// // //           const id = it.stockItemId?._id || it.stockItemId;

// // //           if (!itemMap[id]) {
// // //             itemMap[id] = {
// // //               name: getItemName(it),
// // //               group: getGroupName(it),
// // //               unit: getUnitSymbol(it),
// // //               requestedTotal: 0,
// // //               receivedTotal: 0,
// // //               branches: {}
// // //             };
// // //           }

// // //           const reqQty = Number(it.qtyBaseUnit || 0);
// // //           const recQty = Number(it.receivedQty || 0);

// // //           itemMap[id].requestedTotal += reqQty;
// // //           itemMap[id].receivedTotal += recQty;

// // //           if (!itemMap[id].branches[branch]) {
// // //             itemMap[id].branches[branch] = { requested: 0, received: 0 };
// // //           }

// // //           itemMap[id].branches[branch].requested += reqQty;
// // //           itemMap[id].branches[branch].received += recQty;
// // //         });
// // //       });

// // //       const items = Object.values(itemMap);

// // //       aoa.push([`DATE: ${date}`]);

// // //       const header = [
// // //         "S.No",
// // //         "Stock Item",
// // //         "Stock Group",
// // //         "Unit",
// // //         "Requested (Total)",
// // //         "Received (Total)"
// // //       ];

// // //       branches.forEach(b => {
// // //         header.push(`${b} - Requested`);
// // //         header.push(`${b} - Received`);
// // //       });

// // //       aoa.push(header);

// // //       items.forEach((it, index) => {
// // //         const row = [
// // //           index + 1,
// // //           it.name,
// // //           it.group,
// // //           it.unit,
// // //           it.requestedTotal,
// // //           it.receivedTotal
// // //         ];

// // //         branches.forEach(b => {
// // //           row.push(it.branches[b]?.requested || 0);
// // //           row.push(it.branches[b]?.received || 0);
// // //         });

// // //         aoa.push(row);
// // //       });

// // //       aoa.push([]);
// // //     });

// // // const maxCols = Math.max(...aoa.map(r => r.length));

// // // const ws = XLSX.utils.aoa_to_sheet(aoa);

// // // // Merge title row
// // // ws["!merges"] = [
// // //   {
// // //     s: { r: 0, c: 0 },
// // //     e: { r: 0, c: maxCols - 1 }
// // //   }
// // // ];

// // // // TITLE STYLE
// // // if (ws["A1"]) {
// // //   ws["A1"].s = {
// // //     font: {
// // //       bold: true,
// // //       sz: 16,
// // //       color: { rgb: "FFFFFF" }
// // //     },
// // //     alignment: {
// // //       horizontal: "center"
// // //     },
// // //     fill: {
// // //       fgColor: { rgb: "1E3A8A" } // Dark Blue
// // //     }
// // //   };
// // // }

// // // // DATE ROW + HEADER ROW STYLING
// // // Object.keys(ws).forEach(cell => {

// // //   // DATE ROWS
// // //   if (
// // //     ws[cell]?.v &&
// // //     String(ws[cell].v).startsWith("DATE:")
// // //   ) {
// // //     const rowNo = cell.match(/\d+/)[0];

// // //     for (let i = 0; i < maxCols; i++) {

// // //       const col = XLSX.utils.encode_col(i);
// // //       const ref = `${col}${rowNo}`;

// // //       if (ws[ref]) {
// // //         ws[ref].s = {
// // //           font: {
// // //             bold: true,
// // //             color: { rgb: "FFFFFF" }
// // //           },
// // //           fill: {
// // //             fgColor: { rgb: "16A34A" } // Green
// // //           }
// // //         };
// // //       }
// // //     }
// // //   }

// // //   // HEADER ROWS
// // //   if (ws[cell]?.v === "S.No") {

// // //     const rowNo = cell.match(/\d+/)[0];

// // //     for (let i = 0; i < maxCols; i++) {

// // //       const col = XLSX.utils.encode_col(i);
// // //       const ref = `${col}${rowNo}`;

// // //       if (ws[ref]) {
// // //         ws[ref].s = {
// // //           font: {
// // //             bold: true,
// // //             color: { rgb: "FFFFFF" }
// // //           },
// // //           alignment: {
// // //             horizontal: "center"
// // //           },
// // //           fill: {
// // //             fgColor: { rgb: "2563EB" } // Blue
// // //           }
// // //         };
// // //       }
// // //     }
// // //   }
// // // });

// // // const wb = XLSX.utils.book_new();
// // //   XLSX.utils.book_append_sheet(wb, ws, "Indent Report");

// // //   const fileName =
// // //     fromDate || toDate
// // //       ? `Montessori_Indent_${fromDate || "start"}_to_${toDate || "end"}.xlsx`
// // //       : "Montessori_Indent_All.xlsx";

// // //   XLSX.writeFile(wb, fileName);

// // //   showToast("Excel exported successfully", "success");
// // // };


// // // const handleDownloadExcel = () => {
// // //   if (!activeIndent) return;

// // //   const aoa = [];

// // //   aoa.push(["INDENT REPORT"]);
// // //   aoa.push([
// // //     `DATE: ${new Date(activeIndent.createdAt).toLocaleDateString()}`
// // //   ]);
// // //   aoa.push([]);

// // //   aoa.push([
// // //     "Product",
// // //     "Group",
// // //     "Quantity",
// // //     "Unit",
// // //     "Price",
// // //     "Subtotal"
// // //   ]);

// // //   activeIndent.items.forEach(item => {
// // //     aoa.push([
// // //       getItemName(item),
// // //       getGroupName(item),
// // //       item.orderedQty,
// // //       getUnitSymbol(item),
// // //       item.unitPrice,
// // //       item.orderedQty * item.unitPrice
// // //     ]);
// // //   });

// // //   const ws = XLSX.utils.aoa_to_sheet(aoa);
// // // // Main title
// // // if (ws["A1"]) {
// // //   ws["A1"].s = {
// // //     font: {
// // //       bold: true,
// // //       sz: 16,
// // //       color: { rgb: "FFFFFF" }
// // //     },
// // //     fill: {
// // //       fgColor: { rgb: "4F46E5" }
// // //     }
// // //   };
// // // }
// // // Object.keys(ws).forEach(cell => {
// // //   if (
// // //     cell[0] === "A" &&
// // //     ws[cell]?.v &&
// // //     String(ws[cell].v).startsWith("DATE:")
// // //   ) {
// // //     ws[cell].s = {
// // //       font: {
// // //         bold: true,
// // //         color: { rgb: "FFFFFF" }
// // //       },
// // //       fill: {
// // //         fgColor: { rgb: "2563EB" }
// // //       }
// // //     };
// // //   }
// // // });
// // // Object.keys(ws).forEach(cell => {
// // //   if (
// // //     ws[cell]?.v === "S.No"
// // //   ) {
// // //     const row = cell.match(/\d+/)[0];

// // //     ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O"]
// // //       .forEach(col => {
// // //         const headerCell = `${col}${row}`;

// // //         if (ws[headerCell]) {
// // //           ws[headerCell].s = {
// // //             font: {
// // //               bold: true,
// // //               color: { rgb: "FFFFFF" }
// // //             },
// // //             fill: {
// // //               fgColor: { rgb: "16A34A" }
// // //             }
// // //           };
// // //         }
// // //       });
// // //   }
// // // });  
// // //   ws["!cols"] = [
// // //     { wch: 25 },
// // //     { wch: 20 },
// // //     { wch: 12 },
// // //     { wch: 10 },
// // //     { wch: 12 },
// // //     { wch: 15 }
// // //   ];

// // //   const wb = XLSX.utils.book_new();
// // //   XLSX.utils.book_append_sheet(wb, ws, "Indent");

// // //   XLSX.writeFile(
// // //     wb,
// // //     `Indent_${activeIndent.indentNo || "Export"}.xlsx`
// // //   );

// // //   showToast("Excel exported successfully", "success");
// // // };

// // //   const handleStatusUpdate = async (id, newStatus) => {
// // //     try {
// // //       if (newStatus === 'purchased') {
// // //         await api.post(`/indents/${id}/mark-purchased`);
// // //       } else {
// // //         await api.patch(`/indents/${id}`, { status: newStatus });
// // //       }
// // //       showToast(`Indent marked as ${newStatus}`, "success");
// // //       load();
// // //     } catch (error) {
// // //       showToast("Failed to update status", "error");
// // //     }
// // //   };
// // //  const rejectEntireRequest = async () => {
// // //   try {
// // //     await api.patch(
// // //       `/indent-requests/${editingRequest._id}/reject`
// // //     );

// // //     showToast(
// // //       "Request rejected successfully",
// // //       "success"
// // //     );

// // //     setEditingRequest(null);

// // //     fetchIndentRequests();

// // //   } catch (err) {
// // //     showToast(
// // //       "Reject failed",
// // //       "error"
// // //     );
// // //   }
// // // };
// // //   const confirmRequest = async () => {
   
// // //   try {
// // //     const selectedItems = editingRequest.items
// // //       .filter(it => {
// // //         const id = it.stockItemId?._id || it.stockItemId;
// // //         return approvedItems[id];
// // //       })
// // //       .map(it => ({
// // //         stockItemId: it.stockItemId?._id || it.stockItemId,
// // //         qtyBaseUnit: it.qtyBaseUnit
// // //       }));

// // //     if (selectedItems.length === 0) {
// // //       return showToast("Select at least one item", "info");
// // //     }

// // //     await api.patch(`/indent-requests/${editingRequest._id}/confirm`, {
// // //       items: selectedItems
// // //     });

// // //     showToast("Selected items approved!", "success");

// // //     setEditingRequest(null);
// // //     setApprovedItems({});
// // //     fetchIndentRequests();
// // //   } catch (err) {
// // //     showToast("Confirmation failed", "error");
// // //   }
// // // };

// // //   const submitIndent = async () => {
// // //     const itemsToSubmit = Object.keys(selectedItems)
// // //       .filter(id => selectedItems[id].checked && Number(selectedItems[id].qty) > 0)
// // //       .map(id => ({
// // //         stockItemId: id,
// // //         orderedQty: Number(selectedItems[id].qty),
// // //         unitPrice: Number(selectedItems[id].price || 0),
// // //         amount: Number(selectedItems[id].qty) * Number(selectedItems[id].price || 0)
// // //       }));

// // //     if (itemsToSubmit.length === 0) return showToast("Select items with quantity", "info");

// // //     try {
// // //       await api.post("/indents", { items: itemsToSubmit });
// // //       showToast("Indent submitted", "success");
// // //       setSelectedItems({});
// // //       setView("history");
// // //       load();
// // //     } catch (error) {
// // //       showToast("Submission failed", "error");
// // //     }
// // //   };

// // //   // --- Memoized Filters ---
// // //   const filteredIndents = useMemo(() => {
// // //     return indents.filter(i =>
// // //       (i.indentNo?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
// // //       (i._id.includes(searchTerm))
// // //     );
// // //   }, [indents, searchTerm]);

// // //   const filteredStock = useMemo(() => {
// // //     return stockItems.filter(s =>
// // //       s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
// // //       s.stockGroupId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
// // //     );
// // //   }, [stockItems, searchTerm]);
// // // const filteredRequests = useMemo(() => {
// // //   return indentRequests
// // //     .filter((r) => {
// // //       const reqDate = new Date(r.createdAt).toISOString().split("T")[0];

// // //       if (fromDate && reqDate < fromDate) return false;
// // //       if (toDate && reqDate > toDate) return false;

// // //       return true;
// // //     })
// // //     .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // }, [indentRequests, fromDate, toDate]);
// // //   const activeIndent = useMemo(() =>
// // //     indents.find(i => i._id === selectedId) || indents[0],
// // //     [selectedId, indents]);

// // //   const isConfirmed = editingRequest?.status === "confirmed";

// // //   return (
// // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // //       {/* Header Area */}
// // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // //             <span style={{ color: '#6366f1' }}>Indents</span>
// // //           </h1>
          
// // //           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
// // //             {[
// // //               { id: 'history', label: 'Logs', icon: <ClipboardList size={14}/> },
// // //               { id: 'requests', label: 'Requests', icon: <Inbox size={14}/> },
// // //               { id: 'create', label: 'Create New', icon: <PlusCircle size={14}/> }
// // //             ].map((btn) => (
// // //               <button 
// // //                 key={btn.id}
// // //                 onClick={() => { setView(btn.id); setSearchTerm(""); setEditingRequest(null); }}
// // //                 style={{ 
// // //                   display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
// // //                   background: view === btn.id ? '#fff' : 'transparent', 
// // //                   color: view === btn.id ? '#6366f1' : '#64748b', 
// // //                   boxShadow: view === btn.id ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' 
// // //                 }}>
// // //                 {btn.icon} {btn.label}
// // //               </button>
// // //             ))}
// // //           </div>
// // //         </div>

// // //         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // //           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // //           <input
// // //             type="text"
// // //             placeholder="Search..."
// // //             value={searchTerm}
// // //             onChange={(e) => setSearchTerm(e.target.value)}
// // //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
// // //           />
// // //         </div>
// // //       </div>

// // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // //         {/* VIEW: HISTORY/LOGS */}
// // //         {view === "history" && (
// // //           <>
// // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>RESULTS ({filteredIndents.length})</div>
// // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // //                 {filteredIndents.map(r => (
// // //                   <div key={r._id} onClick={() => setSelectedId(r._id)}
// // //                     style={{ padding: '16px', borderRadius: '16px', cursor: 'pointer', background: selectedId === r._id ? '#fff' : 'transparent', border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent', boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', transition: 'all 0.2s' }}>
// // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // //                       <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b' }}>{r.indentNo || `REF-${r._id.slice(-4)}`}</div>
// // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
// // //                     </div>
// // //                     <div
// // //   style={{
// // //     fontSize: "12px",
// // //     marginTop: "4px",
// // //     display: "flex",
// // //     justifyContent: "space-between",
// // //     alignItems: "center"
// // //   }}
// // // >
// // //   <span style={{ color: "#64748b" }}>
// // //     ₹{r.totalAmount?.toLocaleString()}
// // //   </span>

// // //   <span
// // //     style={{
// // //       background:
// // //         r.status === "pending"
// // //           ? "#fee2e2"
// // //           : r.status === "purchased"
// // //           ? "#f3e8ff"
// // //           : r.status === "stock_received"
// // //           ? "#dcfce7"
// // //           : "#f1f5f9",

// // //       color:
// // //         r.status === "pending"
// // //           ? "#dc2626"
// // //           : r.status === "purchased"
// // //           ? "#9333ea"
// // //           : r.status === "stock_received"
// // //           ? "#16a34a"
// // //           : "#64748b",

// // //       padding: "2px 8px",
// // //       borderRadius: "6px",
// // //       fontSize: "10px",
// // //       fontWeight: "700"
// // //     }}
// // //   >
// // //     {r.status?.replaceAll("_", " ").toUpperCase()}
// // //   </span>
// // // </div>
// // //                     {/* <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>₹{r.totalAmount?.toLocaleString()} • {r.status.toUpperCase()}</div> */}
// // //                   </div>
// // //                 ))}
// // //               </div>
// // //             </div>

// // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // //               {activeIndent ? (
// // //                 <>
// // //                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
// // //                     <div>
// // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>INDENT STATUS</div>
// // //                       <div
// // //   style={{
// // //     padding: "4px 12px",
// // //     borderRadius: "6px",
// // //     fontSize: "12px",
// // //     fontWeight: "800",
// // //     display: "inline-block",

// // //     background:
// // //       activeIndent.status === "pending"
// // //         ? "#fee2e2"
// // //         : activeIndent.status === "purchased"
// // //         ? "#f3e8ff"
// // //         : activeIndent.status === "stock_received"
// // //         ? "#dcfce7"
// // //         : "#f1f5f9",

// // //     color:
// // //       activeIndent.status === "pending"
// // //         ? "#dc2626"
// // //         : activeIndent.status === "purchased"
// // //         ? "#9333ea"
// // //         : activeIndent.status === "stock_received"
// // //         ? "#16a34a"
// // //         : "#64748b"
// // //   }}
// // // >
// // //   {activeIndent.status?.replaceAll("_", " ").toUpperCase()}
// // // </div>
// // //                     </div>
// // //                     <div style={{ textAlign: 'right' }}>
// // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
// // //                       <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activeIndent.totalAmount?.toLocaleString()}</div>
// // //                     </div>
// // //                   </div>
// // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // //                       <thead>
// // //                         <tr style={{ textAlign: 'left' }}>
// // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th>
// // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
// // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// // //                         </tr>
// // //                       </thead>
// // //                       <tbody>
// // //                         {activeIndent.items.map((item, idx) => (
// // //                           <tr key={idx}>
// // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(item)}</div>
// // //                               {item.status === "rejected" && (
// // //   <div
// // //     style={{
// // //       display: "inline-block",
// // //       marginTop: "4px",
// // //       background: "#fee2e2",
// // //       color: "#dc2626",
// // //       padding: "2px 8px",
// // //       borderRadius: "6px",
// // //       fontSize: "10px",
// // //       fontWeight: "700"
// // //     }}
// // //   >
// // //     REJECTED
// // //   </div>
// // // )}
// // //                               <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
// // //                             </td>
// // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// // //                                 {getGroupName(item)}
// // //                               </span>
// // //                             </td>
// // //                             <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700', borderBottom: '1px solid #f8fafc' }}>
// // //                                {formatQty(item.orderedQty)} <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: '400'}}>{getUnitSymbol(item)}</span>
// // //                             </td>
// // //                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1', borderBottom: '1px solid #f8fafc' }}>₹{(item.orderedQty * item.unitPrice).toLocaleString()}</td>
// // //                           </tr>
// // //                         ))}
// // //                       </tbody>
// // //                     </table>
// // //                   </div>
// // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // //                     <button onClick={handleDownloadExcel} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // //                       <FileSpreadsheet size={16} /> Export Excel
// // //                     </button>
// // //                     {activeIndent.status.toLowerCase() === 'pending' && (
// // //                       <button onClick={() => handleStatusUpdate(activeIndent._id, 'purchased')} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // //                         <CheckCircle2 size={16} /> Mark Purchased
// // //                       </button>
// // //                     )}
// // //                   </div>
// // //                 </>
// // //               ) : (
// // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Select an indent to view details</div>
// // //               )}
// // //             </div>
// // //           </>
// // //         )}

// // //         {/* VIEW: INDENT REQUESTS (INCOMING) */}
// // //         {view === "requests" && (
// // //           <>
// // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>
// // //                 ALL REQUESTS ({filteredRequests.length})
// // //               </div>
// // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // //                {filteredRequests.map(r => (
// // //                   <div 
// // //                     key={r._id} 
// // //                     onClick={() => {
// // //   setEditingRequest(JSON.parse(JSON.stringify(r)));
// // //   setApprovedItems({});
// // //   setSelectAll(false);
// // // }}
// // //                     style={{ 
// // //                       padding: '16px', 
// // //                       borderRadius: '16px', 
// // //                       cursor: 'pointer', 
// // //                       background: editingRequest?._id === r._id ? '#fff' : 'transparent', 
// // //                       border: editingRequest?._id === r._id ? '1px solid #6366f1' : '1px solid transparent', 
// // //                       boxShadow: editingRequest?._id === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', 
// // //                       transition: 'all 0.2s' 
// // //                     }}
// // //                   >
// // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // //                       <div style={{ fontWeight: '700', color: editingRequest?._id === r._id ? '#6366f1' : '#1e293b' }}>
// // //                         {r.userId?.name || 'Unknown User'}
// // //                       </div>
// // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
// // //                         {new Date(r.createdAt).toLocaleDateString()}
// // //                       </div>
// // //                     </div>
// // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
// // //                       <span>{r.godownId?.name || "Main Godown"} • {r.items?.length} Items</span>
// // //                       <span
// // //   style={{
// // //     background:
// // //   r.status === "pending"
// // //     ? "#fee2e2"
// // //     : r.status === "confirmed"
// // //     ? "#dbeafe"
// // //     : r.status === "received"
// // //     ? "#dcfce7"
// // //     : r.status === "partially_received"
// // //     ? "#f3e8ff"
// // //     : r.status === "rejected"
// // //     ? "#fee2e2"
// // //     : "#f1f5f9",

// // //     color:
// // //       r.status === "pending"
// // //         ? "#dc2626"
// // //         : r.status === "confirmed"
// // //         ? "#2563eb"
// // //         : r.status === "received"
// // //         ? "#16a34a"
// // //         : r.status === "partially_received"
// // //         ? "#9333ea"          // purple text
// // //         : "#64748b",

// // //     padding: "2px 8px",
// // //     borderRadius: "6px",
// // //     fontSize: "10px",
// // //     fontWeight: "700"
// // //   }}
// // // >
// // //   {r.status?.replaceAll("_", " ").toUpperCase()}
// // // </span>
// // //                     </div>
// // //                   </div>
// // //                 ))}
// // //               </div>
// // //             </div>

// // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // //               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
// // //                 {editingRequest ? (
// // //                   <>
// // //                     <div>
// // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>SOURCE GODOWN</div>
// // //                       <div style={{ fontWeight: '800', fontSize: '18px', color: '#0f172a' }}>
// // //                         {editingRequest.godownId?.name || "General"}
// // //                       </div>
// // //                     </div>
// // //                     <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
// // //                       <button
// // //                         onClick={handleDownloadAllRequestsExcel}
// // //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// // //                       >
// // //                         <FileSpreadsheet size={16} /> Export All Requests
// // //                       </button>
// // //                       <div style={{ textAlign: 'right' }}>
// // //                         <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>ESTIMATED VALUATION</div>
// // //                         <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>
// // //                           ₹{editingRequest.items.reduce((sum, i) => sum + (Number(i.qtyBaseUnit || 0) * Number(i.price || 0)), 0).toLocaleString()}
// // //                         </div>
// // //                       </div>
// // //                     </div>
// // //                   </>
// // //                 ) : (
// // //                   <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
// // //                     <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
// // //   <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
  
// // //   <input
// // //     type="date"
// // //     value={fromDate}
// // //     onChange={(e) => setFromDate(e.target.value)}
// // //     style={{
// // //       padding: "8px 12px",
// // //       borderRadius: "10px",
// // //       border: "1px solid #e2e8f0",
// // //       fontSize: "13px"
// // //     }}
// // //   />

// // //   <span style={{ fontSize: "12px", color: "#64748b" }}>to</span>

// // //   <input
// // //     type="date"
// // //     value={toDate}
// // //     onChange={(e) => setToDate(e.target.value)}
// // //     style={{
// // //       padding: "8px 12px",
// // //       borderRadius: "10px",
// // //       border: "1px solid #e2e8f0",
// // //       fontSize: "13px"
// // //     }}
// // //   />

// // //   {(fromDate || toDate) && (
// // //     <button
// // //       onClick={() => {
// // //         setFromDate("");
// // //         setToDate("");
// // //       }}
// // //       style={{
// // //         padding: "8px 12px",
// // //         border: "1px solid #e2e8f0",
// // //         borderRadius: "8px",
// // //         cursor: "pointer"
// // //       }}
// // //     >
// // //       Clear
// // //     </button>
// // //   )}
// // // </div>

// // // </div>

// // //                      <button
// // //                         onClick={handleDownloadAllRequestsExcel}
// // //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// // //                       >
// // //                         <FileSpreadsheet size={16} /> Export All Requests
// // //                       </button>
// // //                   </div>
// // //                 )}
// // //               </div>

// // //               {editingRequest ? (
// // //                 <>
// // //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // //                       <thead>
// // //                         <tr style={{ textAlign: 'left' }}>
// // //                           <th style={{ width: "40px" }}>
// // //   <input
// // //     type="checkbox"
// // //     checked={selectAll}
// // //     disabled={editingRequest?.status !== "pending"}
// // //     onChange={(e) => {
// // //       const checked = e.target.checked;
// // //       setSelectAll(checked);

// // //       const newApproved = {};

// // //       if (checked) {
// // //   editingRequest.items.forEach(it => {
// // //     const id = it.stockItemId?._id || it.stockItemId;

// // //     // skip rejected items
// // //     if (!rejectedItems[id]) {
// // //       newApproved[id] = true;
// // //     }
// // //   });
// // // }

// // //       setApprovedItems(newApproved);
// // //     }}
// // //   />
// // // </th>
// // // <th>ITEM</th>
// // //                           {/* <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th> */}
// // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// // //                           {/* <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', width: '140px' }}>QTY</th> */}
// // //                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
// // //   REQUESTED
// // // </th>

// // // <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
// // //   RECEIVED
// // // </th>
// // // <th
// // //   style={{
// // //     padding: '24px 0 12px',
// // //     fontSize: '11px',
// // //     fontWeight: '900',
// // //     color: '#94a3b8',
// // //     borderBottom: '1px solid #e2e8f0',
// // //     textAlign: 'right'
// // //   }}
// // // >
// // //   ACTION
// // // </th>
// // //                         </tr>
// // //                       </thead>
// // //                       <tbody>
// // //                         {editingRequest.items.map((it, idx) => (
// // //                           <tr
// // //   key={idx}
// // //   style={{
// // //     background:
// // //       it.status === "rejected"
// // //         ? "#fef2f2"
// // //         : "transparent"
// // //   }}
// // // >
// // //   <td>
// // //     <input
// // //   type="checkbox"
// // //   disabled={editingRequest.status !== "pending"}
// // //   checked={!!approvedItems[it.stockItemId?._id || it.stockItemId]}
      
// // //   onChange={(e) => {
// // //   const id = it.stockItemId?._id || it.stockItemId;
// // //   const checked = e.target.checked;

// // //   setApprovedItems(prev => ({
// // //     ...prev,
// // //     [id]: checked
// // //   }));

// // //   if (checked) {
// // //     // remove rejected badge when selected again
// // //     setRejectedItems(prev => {
// // //       const copy = { ...prev };
// // //       delete copy[id];
// // //       return copy;
// // //     });
// // //   } else {
// // //     // show rejected badge when unchecked
// // //     setRejectedItems(prev => ({
// // //       ...prev,
// // //       [id]: true
// // //     }));
// // //   }

// // //   setSelectAll(false);
// // // }}
// // //     />
// // //   </td>
// // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(it)}</div>
// // //                             </td>
// // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// // //                                 {getGroupName(it)}
// // //                               </span>
// // //                             </td>
// // //                            {/* REQUESTED COLUMN */}
// // // <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700' }}>
// // //   {formatQty(it.qtyBaseUnit)}{" "}
// // //   <span style={{ fontSize: '12px', color: '#64748b' }}>
// // //     {getUnitSymbol(it)}
// // //   </span>
// // // </td>

// // // {/* RECEIVED COLUMN */}
// // // <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700', color: '#16a34a' }}>
// // //   {formatQty(it.receivedQty)}{" "}
// // //   <span style={{ fontSize: '12px', color: '#64748b' }}>
// // //     {getUnitSymbol(it)}
// // //   </span>

// // //   {(it.receivedQty || 0) >= (it.qtyBaseUnit || 0) && (
// // //     <div style={{ fontSize: "10px", color: "#16a34a" }}>
// // //       ✔ Fully Received
// // //     </div>
// // //   )}
// // // </td>


// // // <td
// // //   style={{
// // //     padding: '20px 0',
// // //     borderBottom: '1px solid #f8fafc',
// // //     textAlign: 'right'
// // //   }}
// // // >
 
// // //   {it.status === "rejected" ||
// // // rejectedItems[it.stockItemId?._id || it.stockItemId] ? (
// // //   <span
// // //     style={{
// // //       background: "#fee2e2",
// // //       color: "#dc2626",
// // //       padding: "6px 12px",
// // //       borderRadius: "8px",
// // //       fontSize: "12px",
// // //       fontWeight: "700"
// // //     }}
// // //   >
// // //     REJECTED
// // //   </span>
// // // ) : (
// // //   editingRequest.status === "pending" && (
// // //     <button
// // //       onClick={() => {
// // //         const id = it.stockItemId?._id || it.stockItemId;

// // //         setRejectedItems(prev => ({
// // //           ...prev,
// // //           [id]: true
// // //         }));

// // //         setApprovedItems(prev => {
// // //           const copy = { ...prev };
// // //           delete copy[id];
// // //           return copy;
// // //         });

// // //         setSelectAll(false);
// // //       }}
// // //       style={{
// // //         background: "#fff",
// // //         color: "#dc2626",
// // //         border: "1px solid #fecaca",
// // //         padding: "6px 12px",
// // //         borderRadius: "8px",
// // //         cursor: "pointer",
// // //         fontWeight: "700",
// // //         fontSize: "12px"
// // //       }}
// // //     >
// // //       Reject
// // //     </button>
// // //   )
// // // )}
// // // </td>                            
// // //                           </tr>
// // //                         ))}
// // //                       </tbody>
// // //                     </table>
// // //                   </div>

// // //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // //                     <button 
// // //                       onClick={() => setEditingRequest(null)} 
// // //                       style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
// // //                     >
// // //                       Cancel
// // //                     </button>
// // // {editingRequest.status === "pending" && (
// // //   <>
// // //     <button
// // //       onClick={rejectEntireRequest}
// // //       style={{
// // //         background: "#dc2626",
// // //         border: "none",
// // //         color: "#fff",
// // //         padding: "12px 24px",
// // //         borderRadius: "12px",
// // //         fontWeight: "700",
// // //         cursor: "pointer"
// // //       }}
// // //     >
// // //       Reject Entire Request
// // //     </button>

// // //     <button
// // //       onClick={confirmRequest}
// // //       style={{
// // //         background: "#6366f1",
// // //         border: "none",
// // //         color: "#fff",
// // //         padding: "12px 24px",
// // //         borderRadius: "12px",
// // //         fontWeight: "700",
// // //         fontSize: "13px",
// // //         cursor: "pointer",
// // //         display: "flex",
// // //         alignItems: "center",
// // //         gap: "8px"
// // //       }}
// // //     >
// // //       Confirm Request
// // //     </button>
// // //   </>
// // // )}
// // //                     {/* {!["confirmed", "received", "partially_received"].includes(editingRequest.status) && (
// // //   <button onClick={confirmRequest}
// // //                         style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
// // //                       >
// // //                         Confirm Request
// // //                       </button>
// // //                     )} */}
// // //                   </div>
// // //                 </>
// // //               ) : (
// // //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// // //                   Select a request from the sidebar to review and convert
// // //                 </div>
// // //               )}
// // //             </div>
// // //           </>
// // //         )}

// // //         {/* VIEW: CREATE NEW (MANUAL) */}
// // //         {view === "create" && (
// // //           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
// // //             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // //               <div>
// // //                 <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Create Requisition</h2>
// // //                 <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
// // //                     <span onClick={() => setTab("stock-items")} style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: tab === 'stock-items' ? '#6366f1' : '#64748b' }}>Stock Items</span>
// // //                 </div>
// // //               </div>
// // //               <div style={{ textAlign: 'right' }}>
// // //                 <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>ESTIMATED TOTAL</div>
// // //                 <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{Object.values(selectedItems).reduce((sum, i) => i.checked ? sum + (Number(i.qty || 0) * Number(i.price || 0)) : sum, 0).toLocaleString()}</div>
// // //               </div>
// // //             </div>

// // //             <div style={{ flex: 1, overflowY: 'auto' }}>
// // //               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // //                 <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
// // //                   <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // //                     <th style={{ padding: '20px 32px', width: '50px' }}>
// // //                         <input type="checkbox" onChange={(e) => {
// // //                            const isChecked = e.target.checked;
// // //                            const newSelection = { ...selectedItems };
// // //                            filteredStock.forEach(item => {
// // //                              newSelection[item._id] = { ...(newSelection[item._id] || { qty: 0, price: 0 }), checked: isChecked };
// // //                            });
// // //                            setSelectedItems(newSelection);
// // //                         }} style={{ width: '18px', height: '18px' }} />
// // //                     </th>
// // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>NAME</th>
// // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>STOCK GROUP</th>
// // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '140px' }}>QTY</th>
// // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '100px' }}>PRICE</th>
// // //                     <th style={{ padding: '20px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>ITEM TOTAL</th>
// // //                   </tr>
// // //                 </thead>
// // //                 <tbody>
// // //                   {filteredStock.map((row) => {
// // //                     const state = selectedItems[row._id] || { checked: false, qty: 0, price: 0 };
// // //                     const itemTotal = Number(state.qty || 0) * Number(state.price || 0);
// // //                     return (
// // //                       <tr key={row._id} style={{ borderBottom: '1px solid #f8fafc', background: state.checked ? '#fcfdff' : 'transparent' }}>
// // //                         <td style={{ padding: '16px 32px' }}>
// // //                           <input type="checkbox" checked={state.checked} onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, checked: e.target.checked } }))} style={{ width: '18px', height: '18px' }} />
// // //                         </td>
// // //                         <td style={{ padding: '16px 0' }}>
// // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
// // //                             <span style={{ fontWeight: '700', color: '#1e293b' }}>{row.name}</span>
// // //                           </div>
// // //                         </td>
// // //                         <td style={{ padding: '16px 0' }}>
// // //                           <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
// // //                             {row.stockGroupId?.name || 'Unassigned'}
// // //                           </span>
// // //                         </td>
// // //                         <td style={{ padding: '16px 0' }}>
// // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
// // //                             <input type="number"
// // // step="0.001" disabled={!state.checked} value={state.qty} placeholder="0" onChange={(e) => {
// // //   const value = e.target.value;

// // //   if (!/^\d*\.?\d{0,3}$/.test(value) && value !== "") {
// // //     return;
// // //   }

// // //   setSelectedItems(prev => ({
// // //     ...prev,
// // //     [row._id]: {
// // //       ...state,
// // //       qty: value
// // //     }
// // //   }));
// // // }} style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // //                             <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{row.unitId?.symbol}</span>
// // //                           </div>
// // //                         </td>
// // //                         <td style={{ padding: '16px 0' }}>
// // //                             <input type="number" disabled={!state.checked} value={state.price} placeholder="₹" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, price: e.target.value } }))} style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // //                         </td>
// // //                         <td style={{ padding: '16px 32px', textAlign: 'right', fontWeight: '800', color: state.checked ? '#6366f1' : '#94a3b8' }}>
// // //                           ₹{itemTotal.toLocaleString()}
// // //                         </td>
// // //                       </tr>
// // //                     );
// // //                   })}
// // //                 </tbody>
// // //               </table>
// // //             </div>
// // //             <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // //               <button onClick={submitIndent} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
// // //                 Submit Requisition
// // //               </button>
// // //             </div>
// // //           </div>
// // //         )}
// // //       </div>
// // //     </div>
// // //   );
// // // };







// // // for consolidate 29-06-2026








// // import { useEffect, useMemo, useState, useCallback } from "react";
// // import { api } from "../api.js";
// // import { useToast } from "../toast.jsx";
// // import XLSX from "xlsx-js-style";
// // // import * as XLSX from "xlsx";
// // import { 
// //   Search, FileSpreadsheet, CheckCircle2, Inbox, 
// //   ClipboardList, PlusCircle, RefreshCw, X, Save 
// // } from "lucide-react";

// // export const IndentPage = () => {
// //   const { showToast } = useToast();
// //   const [fromDate, setFromDate] = useState("");
// // const [toDate, setToDate] = useState("");
// //   // View State
// //   const [view, setView] = useState("history"); 
// //   const [tab, setTab] = useState("stock-items");
// //   const [searchTerm, setSearchTerm] = useState("");
  
// //   // Data State
// //   const [stockItems, setStockItems] = useState([]);
// //   const [indents, setIndents] = useState([]);
// //   const [indentRequests, setIndentRequests] = useState([]);
// //   const [selectedItems, setSelectedItems] = useState({});
// //   const [selectedId, setSelectedId] = useState(null);

// //   // --- Editing State for Requests ---
// //   const [editingRequest, setEditingRequest] = useState(null);
// //   const [approvedItems, setApprovedItems] = useState({});
// //   const [rejectedItems, setRejectedItems] = useState({});
// //   const [selectAll, setSelectAll] = useState(false);

// //   // --- Data Loading ---
// //   const load = useCallback(async () => {
// //     try {
// //       const [itemsRes, indentRes] = await Promise.all([
// //         api.get("/inventory/stock-items"),
// //         api.get("/indents")
// //       ]);
// //       setStockItems(itemsRes.data || []);
// //       const sorted = (indentRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// //       setIndents(sorted);
// //       if (sorted.length > 0 && !selectedId) setSelectedId(sorted[0]._id);
// //     } catch (error) {
// //       showToast("Failed to load data", "error");
// //     }
// //   }, [showToast, selectedId]);

// //   const fetchIndentRequests = useCallback(async () => {
// //     try {
// //       const res = await api.get("/indent-requests");
// //       setIndentRequests(res.data || []);
// //     } catch (error) {
// //       showToast("Failed to fetch requests", "error");
// //     }
// //   }, [showToast]);

// //   useEffect(() => { 
// //     load(); 
// //     if (view === "requests") fetchIndentRequests();
// //   }, [load, fetchIndentRequests, view]);

// //   // --- Helper Functions ---
// //   const getUnitSymbol = (item) => {
// //     if (item.stockItemId?.unitId?.symbol) return item.stockItemId.unitId.symbol;
// //     if (item.unitId?.symbol) return item.unitId.symbol;
// //     const id = item.stockItemId?._id || item.stockItemId;
// //     const found = stockItems.find(s => s._id === id);
// //     return found?.unitId?.symbol || "";
// //   };

// //   const formatQty = (value) => {
// //   const num = Number(value || 0);
// //   return Number(num.toFixed(3)).toString();
// // };
// //   const getItemName = (item) => {
// //     if (item.stockItemId?.name) return item.stockItemId.name;
// //     const id = item.stockItemId?._id || item.stockItemId;
// //     const found = stockItems.find(s => s._id === id);
// //     return found ? found.name : "Unknown Product";
// //   };


// //   const getGroupName = (item) => {
// //     if (item.stockItemId?.stockGroupId?.name) return item.stockItemId.stockGroupId.name;
// //     if (item.stockGroupId?.name) return item.stockGroupId.name;
// //     const id = item.stockItemId?._id || item.stockItemId;
// //     const found = stockItems.find(s => s._id === id);
// //     return found?.stockGroupId?.name || "General";
// //   };
// // const handleDownloadAllConsumptionsExcel = () => {
// //   if (!processedRows.length) {
// //     return;
// //   }

// //   const groupedByDate = {};

// //   processedRows.forEach(cons => {
// //     const date = new Date(cons.createdAt)
// //       .toISOString()
// //       .split("T")[0];

// //     if (!groupedByDate[date]) {
// //       groupedByDate[date] = [];
// //     }

// //     groupedByDate[date].push(cons);
// //   });

// //   const aoa = [];

// //   aoa.push(["MONTESSORI CONSUMPTION REPORT"]);
// //   aoa.push([]);

// //   Object.keys(groupedByDate)
// //     .sort((a, b) => new Date(b) - new Date(a))
// //     .forEach(date => {

// //       const consumptions = groupedByDate[date];

// //       const godowns = [
// //         ...new Set(
// //           consumptions.map(
// //             c => c.godownId?.name || "General"
// //           )
// //         )
// //       ];

// //       const itemMap = {};

// //       consumptions.forEach(cons => {
// //         const godown =
// //           cons.godownId?.name || "General";

// //         cons.items.forEach(item => {

// //           const id =
// //             item.stockItemId?._id ||
// //             item.stockItemId;

// //           if (!itemMap[id]) {
// //             itemMap[id] = {
// //               name:
// //                 item.stockItemId?.name ||
// //                 "Unknown",
// //               group: getGroupName(item),
// //               unit:
// //                 item.stockItemId?.unitId?.symbol ||
// //                 "",
// //               total: 0,
// //               godowns: {}
// //             };
// //           }

// //           const qty =
// //             Number(item.qtyBaseUnit || 0);

// //           itemMap[id].total += qty;

// //           if (!itemMap[id].godowns[godown]) {
// //             itemMap[id].godowns[godown] = 0;
// //           }

// //           itemMap[id].godowns[godown] += qty;
// //         });
// //       });

// //       aoa.push([`DATE: ${date}`]);

// //       const header = [
// //         "S.No",
// //         "Stock Item",
// //         "Stock Group",
// //         "Unit",
// //         "Total Consumed"
// //       ];

// //       godowns.forEach(g => {
// //         header.push(g);
// //       });

// //       aoa.push(header);

// //       Object.values(itemMap).forEach(
// //         (item, index) => {

// //           const row = [
// //             index + 1,
// //             item.name,
// //             item.group,
// //             item.unit,
// //             item.total
// //           ];

// //           godowns.forEach(g => {
// //             row.push(
// //               item.godowns[g] || 0
// //             );
// //           });

// //           aoa.push(row);
// //         }
// //       );

// //       aoa.push([]);
// //     });

// //   const ws =
// //     XLSX.utils.aoa_to_sheet(aoa);

// //   const maxCols =
// //     Math.max(...aoa.map(r => r.length));

// //   ws["!merges"] = [
// //     {
// //       s: { r: 0, c: 0 },
// //       e: { r: 0, c: maxCols - 1 }
// //     }
// //   ];

// //   // Main title style
// //   if (ws["A1"]) {
// //     ws["A1"].s = {
// //       font: {
// //         bold: true,
// //         sz: 16,
// //         color: { rgb: "FFFFFF" }
// //       },
// //       fill: {
// //         fgColor: {
// //           rgb: "4F46E5"
// //         }
// //       }
// //     };
// //   }

// //   Object.keys(ws).forEach(cell => {

// //     if (
// //       ws[cell]?.v &&
// //       String(ws[cell].v).startsWith("DATE:")
// //     ) {
// //       ws[cell].s = {
// //         font: {
// //           bold: true,
// //           color: { rgb: "FFFFFF" }
// //         },
// //         fill: {
// //           fgColor: {
// //             rgb: "2563EB"
// //           }
// //         }
// //       };
// //     }

// //     if (ws[cell]?.v === "S.No") {

// //       const rowNo =
// //         cell.match(/\d+/)[0];

// //       for (
// //         let i = 0;
// //         i < maxCols;
// //         i++
// //       ) {

// //         const col =
// //           XLSX.utils.encode_col(i);

// //         const ref =
// //           `${col}${rowNo}`;

// //         if (ws[ref]) {
// //           ws[ref].s = {
// //             font: {
// //               bold: true,
// //               color: {
// //                 rgb: "FFFFFF"
// //               }
// //             },
// //             fill: {
// //               fgColor: {
// //                 rgb: "16A34A"
// //               }
// //             }
// //           };
// //         }
// //       }
// //     }
// //   });

// //   const wb = XLSX.utils.book_new();

// //   XLSX.utils.book_append_sheet(
// //     wb,
// //     ws,
// //     "Consumption"
// //   );

// //   XLSX.writeFile(
// //     wb,
// //     fromDate || toDate
// //       ? `Consumption_${fromDate || "start"}_to_${toDate || "end"}.xlsx`
// //       : "Consumption_Report.xlsx"
// //   );
// // };
// // const handleDownloadAllRequestsExcel = () => {
// //   if (!indentRequests.length) {
// //     return showToast("No requests available", "info");
// //   }

// //   let filtered = [...indentRequests];

// //   filtered = filtered.filter(r => {
// //     const d = new Date(r.createdAt).toISOString().split("T")[0];
// //     if (fromDate && d < fromDate) return false;
// //     if (toDate && d > toDate) return false;
// //     return true;
// //   });

// //   if (!filtered.length) {
// //     return showToast("No requests found", "info");
// //   }

// // //   filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
// // filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// //   const groupedByDate = {};

// //   filtered.forEach(req => {
// //     const date = new Date(req.createdAt).toISOString().split("T")[0];
// //     if (!groupedByDate[date]) groupedByDate[date] = [];
// //     groupedByDate[date].push(req);
// //   });

// //   const aoa = [];

// //   aoa.push(["MONTESSORI DAILY INDENT REQUEST REPORT"]);
// //   aoa.push([]);

// // // =========================================
// // // CONSOLIDATED RECEIVED REPORT
// // // =========================================

// // const allBranches = [
// //   ...new Set(
// //     filtered.map(r => r.godownId?.name || "General")
// //   )
// // ].sort();

// // const consolidatedMap = {};

// // filtered.forEach(req => {

// //   const branch = req.godownId?.name || "General";

// //   req.items.forEach(it => {

// //     const id =
// //       it.stockItemId?._id ||
// //       it.stockItemId;

// //     if (!consolidatedMap[id]) {

// //       consolidatedMap[id] = {
// //         name: getItemName(it),
// //         group: getGroupName(it),
// //         unit: getUnitSymbol(it),
// //         totalReceived: 0,
// //         branches: {}
// //       };

// //     }

// //     const received =
// //       Number(it.receivedQty || 0);

// //     consolidatedMap[id].totalReceived += received;

// //     consolidatedMap[id].branches[branch] =
// //       (consolidatedMap[id].branches[branch] || 0)
// //       + received;

// //   });

// // });

// // aoa.push(["CONSOLIDATED RECEIVED REPORT"]);


// // const consolidatedHeader = [
// //   "S.No",
// //   "Stock Item",
// //   "Stock Group",
// //   "Unit",
// //   "Total Received"
// // ];

// // allBranches.forEach(branch => {
// //   consolidatedHeader.push(branch);
// // });

// // aoa.push(consolidatedHeader);


// // Object.values(consolidatedMap).forEach((item, index) => {

// //   const row = [

// //     index + 1,

// //     item.name,

// //     item.group,

// //     item.unit,

// //     item.totalReceived

// //   ];

// //   allBranches.forEach(branch => {

// //     row.push(
// //       item.branches[branch] || 0
// //     );

// //   });

// //   aoa.push(row);

// // });

// // aoa.push([]);
// // aoa.push([]);


// //     Object.keys(groupedByDate)
// //   .sort((a, b) => new Date(b) - new Date(a))
// //   .forEach(date => {
// //       const requests = groupedByDate[date];

// //       const branches = [...new Set(requests.map(r => r.godownId?.name || "General"))];

// //       const itemMap = {};

// //       requests.forEach(req => {
// //         const branch = req.godownId?.name || "General";

// //         req.items.forEach(it => {
// //           const id = it.stockItemId?._id || it.stockItemId;

// //           if (!itemMap[id]) {
// //             itemMap[id] = {
// //               name: getItemName(it),
// //               group: getGroupName(it),
// //               unit: getUnitSymbol(it),
// //               requestedTotal: 0,
// //               receivedTotal: 0,
// //               branches: {}
// //             };
// //           }

// //           const reqQty = Number(it.qtyBaseUnit || 0);
// //           const recQty = Number(it.receivedQty || 0);

// //           itemMap[id].requestedTotal += reqQty;
// //           itemMap[id].receivedTotal += recQty;

// //           if (!itemMap[id].branches[branch]) {
// //             itemMap[id].branches[branch] = { requested: 0, received: 0 };
// //           }

// //           itemMap[id].branches[branch].requested += reqQty;
// //           itemMap[id].branches[branch].received += recQty;
// //         });
// //       });

// //       const items = Object.values(itemMap);

// //       aoa.push([`DATE: ${date}`]);

// //       const header = [
// //         "S.No",
// //         "Stock Item",
// //         "Stock Group",
// //         "Unit",
// //         "Requested (Total)",
// //         "Received (Total)"
// //       ];

// //       branches.forEach(b => {
// //         header.push(`${b} - Requested`);
// //         header.push(`${b} - Received`);
// //       });

// //       aoa.push(header);

// //       items.forEach((it, index) => {
// //         const row = [
// //           index + 1,
// //           it.name,
// //           it.group,
// //           it.unit,
// //           it.requestedTotal,
// //           it.receivedTotal
// //         ];

// //         branches.forEach(b => {
// //           row.push(it.branches[b]?.requested || 0);
// //           row.push(it.branches[b]?.received || 0);
// //         });

// //         aoa.push(row);
// //       });

// //       aoa.push([]);
// //     });

// // const maxCols = Math.max(...aoa.map(r => r.length));

// // const ws = XLSX.utils.aoa_to_sheet(aoa);

// // // Merge title row
// // ws["!merges"] = [
// //   {
// //     s: { r: 0, c: 0 },
// //     e: { r: 0, c: maxCols - 1 }
// //   }
// // ];

// // // TITLE STYLE
// // if (ws["A1"]) {
// //   ws["A1"].s = {
// //     font: {
// //       bold: true,
// //       sz: 16,
// //       color: { rgb: "FFFFFF" }
// //     },
// //     alignment: {
// //       horizontal: "center"
// //     },
// //     fill: {
// //       fgColor: { rgb: "1E3A8A" } // Dark Blue
// //     }
// //   };
// // }

// // // DATE ROW + HEADER ROW STYLING
// // Object.keys(ws).forEach(cell => {

// //   // DATE ROWS
// //   if (
// //     ws[cell]?.v &&
// //     String(ws[cell].v).startsWith("DATE:")
// //   ) {
// //     const rowNo = cell.match(/\d+/)[0];

// //     for (let i = 0; i < maxCols; i++) {

// //       const col = XLSX.utils.encode_col(i);
// //       const ref = `${col}${rowNo}`;

// //       if (ws[ref]) {
// //         ws[ref].s = {
// //           font: {
// //             bold: true,
// //             color: { rgb: "FFFFFF" }
// //           },
// //           fill: {
// //             fgColor: { rgb: "16A34A" } // Green
// //           }
// //         };
// //       }
// //     }
// //   }

// //   // HEADER ROWS
// //   if (ws[cell]?.v === "S.No") {

// //     const rowNo = cell.match(/\d+/)[0];

// //     for (let i = 0; i < maxCols; i++) {

// //       const col = XLSX.utils.encode_col(i);
// //       const ref = `${col}${rowNo}`;

// //       if (ws[ref]) {
// //         ws[ref].s = {
// //           font: {
// //             bold: true,
// //             color: { rgb: "FFFFFF" }
// //           },
// //           alignment: {
// //             horizontal: "center"
// //           },
// //           fill: {
// //             fgColor: { rgb: "2563EB" } // Blue
// //           }
// //         };
// //       }
// //     }
// //   }
// // });

// // const wb = XLSX.utils.book_new();
// //   XLSX.utils.book_append_sheet(wb, ws, "Indent Report");

// //   const fileName =
// //     fromDate || toDate
// //       ? `Montessori_Indent_${fromDate || "start"}_to_${toDate || "end"}.xlsx`
// //       : "Montessori_Indent_All.xlsx";

// //   XLSX.writeFile(wb, fileName);

// //   showToast("Excel exported successfully", "success");
// // };


// // const handleDownloadExcel = () => {
// //   if (!activeIndent) return;

// //   const aoa = [];

// //   aoa.push(["INDENT REPORT"]);
// //   aoa.push([
// //     `DATE: ${new Date(activeIndent.createdAt).toLocaleDateString()}`
// //   ]);
// //   aoa.push([]);

// //   aoa.push([
// //     "Product",
// //     "Group",
// //     "Quantity",
// //     "Unit",
// //     "Price",
// //     "Subtotal"
// //   ]);

// //   activeIndent.items.forEach(item => {
// //     aoa.push([
// //       getItemName(item),
// //       getGroupName(item),
// //       item.orderedQty,
// //       getUnitSymbol(item),
// //       item.unitPrice,
// //       item.orderedQty * item.unitPrice
// //     ]);
// //   });

// //   const ws = XLSX.utils.aoa_to_sheet(aoa);
// // // Main title
// // if (ws["A1"]) {
// //   ws["A1"].s = {
// //     font: {
// //       bold: true,
// //       sz: 16,
// //       color: { rgb: "FFFFFF" }
// //     },
// //     fill: {
// //       fgColor: { rgb: "4F46E5" }
// //     }
// //   };
// // }
// // Object.keys(ws).forEach(cell => {
// //   if (
// //     cell[0] === "A" &&
// //     ws[cell]?.v &&
// //     String(ws[cell].v).startsWith("DATE:")
// //   ) {
// //     ws[cell].s = {
// //       font: {
// //         bold: true,
// //         color: { rgb: "FFFFFF" }
// //       },
// //       fill: {
// //         fgColor: { rgb: "2563EB" }
// //       }
// //     };
// //   }
// // });
// // Object.keys(ws).forEach(cell => {
// //   if (
// //     ws[cell]?.v === "S.No"
// //   ) {
// //     const row = cell.match(/\d+/)[0];

// //     ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O"]
// //       .forEach(col => {
// //         const headerCell = `${col}${row}`;

// //         if (ws[headerCell]) {
// //           ws[headerCell].s = {
// //             font: {
// //               bold: true,
// //               color: { rgb: "FFFFFF" }
// //             },
// //             fill: {
// //               fgColor: { rgb: "16A34A" }
// //             }
// //           };
// //         }
// //       });
// //   }
// // });  
// //   ws["!cols"] = [
// //     { wch: 25 },
// //     { wch: 20 },
// //     { wch: 12 },
// //     { wch: 10 },
// //     { wch: 12 },
// //     { wch: 15 }
// //   ];

// //   const wb = XLSX.utils.book_new();
// //   XLSX.utils.book_append_sheet(wb, ws, "Indent");

// //   XLSX.writeFile(
// //     wb,
// //     `Indent_${activeIndent.indentNo || "Export"}.xlsx`
// //   );

// //   showToast("Excel exported successfully", "success");
// // };

// //   const handleStatusUpdate = async (id, newStatus) => {
// //     try {
// //       if (newStatus === 'purchased') {
// //         await api.post(`/indents/${id}/mark-purchased`);
// //       } else {
// //         await api.patch(`/indents/${id}`, { status: newStatus });
// //       }
// //       showToast(`Indent marked as ${newStatus}`, "success");
// //       load();
// //     } catch (error) {
// //       showToast("Failed to update status", "error");
// //     }
// //   };
// //  const rejectEntireRequest = async () => {
// //   try {
// //     await api.patch(
// //       `/indent-requests/${editingRequest._id}/reject`
// //     );

// //     showToast(
// //       "Request rejected successfully",
// //       "success"
// //     );

// //     setEditingRequest(null);

// //     fetchIndentRequests();

// //   } catch (err) {
// //     showToast(
// //       "Reject failed",
// //       "error"
// //     );
// //   }
// // };
// //   const confirmRequest = async () => {
   
// //   try {
// //     const selectedItems = editingRequest.items
// //       .filter(it => {
// //         const id = it.stockItemId?._id || it.stockItemId;
// //         return approvedItems[id];
// //       })
// //       .map(it => ({
// //         stockItemId: it.stockItemId?._id || it.stockItemId,
// //         qtyBaseUnit: it.qtyBaseUnit
// //       }));

// //     if (selectedItems.length === 0) {
// //       return showToast("Select at least one item", "info");
// //     }

// //     await api.patch(`/indent-requests/${editingRequest._id}/confirm`, {
// //       items: selectedItems
// //     });

// //     showToast("Selected items approved!", "success");

// //     setEditingRequest(null);
// //     setApprovedItems({});
// //     fetchIndentRequests();
// //   } catch (err) {
// //     showToast("Confirmation failed", "error");
// //   }
// // };

// //   const submitIndent = async () => {
// //     const itemsToSubmit = Object.keys(selectedItems)
// //       .filter(id => selectedItems[id].checked && Number(selectedItems[id].qty) > 0)
// //       .map(id => ({
// //         stockItemId: id,
// //         orderedQty: Number(selectedItems[id].qty),
// //         unitPrice: Number(selectedItems[id].price || 0),
// //         amount: Number(selectedItems[id].qty) * Number(selectedItems[id].price || 0)
// //       }));

// //     if (itemsToSubmit.length === 0) return showToast("Select items with quantity", "info");

// //     try {
// //       await api.post("/indents", { items: itemsToSubmit });
// //       showToast("Indent submitted", "success");
// //       setSelectedItems({});
// //       setView("history");
// //       load();
// //     } catch (error) {
// //       showToast("Submission failed", "error");
// //     }
// //   };

// //   // --- Memoized Filters ---
// //   const filteredIndents = useMemo(() => {
// //     return indents.filter(i =>
// //       (i.indentNo?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
// //       (i._id.includes(searchTerm))
// //     );
// //   }, [indents, searchTerm]);

// //   const filteredStock = useMemo(() => {
// //     return stockItems.filter(s =>
// //       s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
// //       s.stockGroupId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
// //     );
// //   }, [stockItems, searchTerm]);
// // const filteredRequests = useMemo(() => {
// //   return indentRequests
// //     .filter((r) => {
// //       const reqDate = new Date(r.createdAt).toISOString().split("T")[0];

// //       if (fromDate && reqDate < fromDate) return false;
// //       if (toDate && reqDate > toDate) return false;

// //       return true;
// //     })
// //     .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // }, [indentRequests, fromDate, toDate]);
// //   const activeIndent = useMemo(() =>
// //     indents.find(i => i._id === selectedId) || indents[0],
// //     [selectedId, indents]);

// //   const isConfirmed = editingRequest?.status === "confirmed";

// //   return (
// //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// //       {/* Header Area */}
// //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// //             <span style={{ color: '#6366f1' }}>Indents</span>
// //           </h1>
          
// //           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
// //             {[
// //               { id: 'history', label: 'Logs', icon: <ClipboardList size={14}/> },
// //               { id: 'requests', label: 'Requests', icon: <Inbox size={14}/> },
// //               { id: 'create', label: 'Create New', icon: <PlusCircle size={14}/> }
// //             ].map((btn) => (
// //               <button 
// //                 key={btn.id}
// //                 onClick={() => { setView(btn.id); setSearchTerm(""); setEditingRequest(null); }}
// //                 style={{ 
// //                   display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
// //                   background: view === btn.id ? '#fff' : 'transparent', 
// //                   color: view === btn.id ? '#6366f1' : '#64748b', 
// //                   boxShadow: view === btn.id ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' 
// //                 }}>
// //                 {btn.icon} {btn.label}
// //               </button>
// //             ))}
// //           </div>
// //         </div>

// //         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// //           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// //           <input
// //             type="text"
// //             placeholder="Search..."
// //             value={searchTerm}
// //             onChange={(e) => setSearchTerm(e.target.value)}
// //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
// //           />
// //         </div>
// //       </div>

// //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// //         {/* VIEW: HISTORY/LOGS */}
// //         {view === "history" && (
// //           <>
// //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>RESULTS ({filteredIndents.length})</div>
// //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// //                 {filteredIndents.map(r => (
// //                   <div key={r._id} onClick={() => setSelectedId(r._id)}
// //                     style={{ padding: '16px', borderRadius: '16px', cursor: 'pointer', background: selectedId === r._id ? '#fff' : 'transparent', border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent', boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', transition: 'all 0.2s' }}>
// //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// //                       <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b' }}>{r.indentNo || `REF-${r._id.slice(-4)}`}</div>
// //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
// //                     </div>
// //                     <div
// //   style={{
// //     fontSize: "12px",
// //     marginTop: "4px",
// //     display: "flex",
// //     justifyContent: "space-between",
// //     alignItems: "center"
// //   }}
// // >
// //   <span style={{ color: "#64748b" }}>
// //     ₹{r.totalAmount?.toLocaleString()}
// //   </span>

// //   <span
// //     style={{
// //       background:
// //         r.status === "pending"
// //           ? "#fee2e2"
// //           : r.status === "purchased"
// //           ? "#f3e8ff"
// //           : r.status === "stock_received"
// //           ? "#dcfce7"
// //           : "#f1f5f9",

// //       color:
// //         r.status === "pending"
// //           ? "#dc2626"
// //           : r.status === "purchased"
// //           ? "#9333ea"
// //           : r.status === "stock_received"
// //           ? "#16a34a"
// //           : "#64748b",

// //       padding: "2px 8px",
// //       borderRadius: "6px",
// //       fontSize: "10px",
// //       fontWeight: "700"
// //     }}
// //   >
// //     {r.status?.replaceAll("_", " ").toUpperCase()}
// //   </span>
// // </div>
// //                     {/* <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>₹{r.totalAmount?.toLocaleString()} • {r.status.toUpperCase()}</div> */}
// //                   </div>
// //                 ))}
// //               </div>
// //             </div>

// //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// //               {activeIndent ? (
// //                 <>
// //                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
// //                     <div>
// //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>INDENT STATUS</div>
// //                       <div
// //   style={{
// //     padding: "4px 12px",
// //     borderRadius: "6px",
// //     fontSize: "12px",
// //     fontWeight: "800",
// //     display: "inline-block",

// //     background:
// //       activeIndent.status === "pending"
// //         ? "#fee2e2"
// //         : activeIndent.status === "purchased"
// //         ? "#f3e8ff"
// //         : activeIndent.status === "stock_received"
// //         ? "#dcfce7"
// //         : "#f1f5f9",

// //     color:
// //       activeIndent.status === "pending"
// //         ? "#dc2626"
// //         : activeIndent.status === "purchased"
// //         ? "#9333ea"
// //         : activeIndent.status === "stock_received"
// //         ? "#16a34a"
// //         : "#64748b"
// //   }}
// // >
// //   {activeIndent.status?.replaceAll("_", " ").toUpperCase()}
// // </div>
// //                     </div>
// //                     <div style={{ textAlign: 'right' }}>
// //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
// //                       <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activeIndent.totalAmount?.toLocaleString()}</div>
// //                     </div>
// //                   </div>
// //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// //                       <thead>
// //                         <tr style={{ textAlign: 'left' }}>
// //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th>
// //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
// //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// //                         </tr>
// //                       </thead>
// //                       <tbody>
// //                         {activeIndent.items.map((item, idx) => (
// //                           <tr key={idx}>
// //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(item)}</div>
// //                               {item.status === "rejected" && (
// //   <div
// //     style={{
// //       display: "inline-block",
// //       marginTop: "4px",
// //       background: "#fee2e2",
// //       color: "#dc2626",
// //       padding: "2px 8px",
// //       borderRadius: "6px",
// //       fontSize: "10px",
// //       fontWeight: "700"
// //     }}
// //   >
// //     REJECTED
// //   </div>
// // )}
// //                               <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
// //                             </td>
// //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// //                                 {getGroupName(item)}
// //                               </span>
// //                             </td>
// //                             <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700', borderBottom: '1px solid #f8fafc' }}>
// //                                {formatQty(item.orderedQty)} <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: '400'}}>{getUnitSymbol(item)}</span>
// //                             </td>
// //                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1', borderBottom: '1px solid #f8fafc' }}>₹{(item.orderedQty * item.unitPrice).toLocaleString()}</td>
// //                           </tr>
// //                         ))}
// //                       </tbody>
// //                     </table>
// //                   </div>
// //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// //                     <button onClick={handleDownloadExcel} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// //                       <FileSpreadsheet size={16} /> Export Excel
// //                     </button>
// //                     {activeIndent.status.toLowerCase() === 'pending' && (
// //                       <button onClick={() => handleStatusUpdate(activeIndent._id, 'purchased')} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// //                         <CheckCircle2 size={16} /> Mark Purchased
// //                       </button>
// //                     )}
// //                   </div>
// //                 </>
// //               ) : (
// //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Select an indent to view details</div>
// //               )}
// //             </div>
// //           </>
// //         )}

// //         {/* VIEW: INDENT REQUESTS (INCOMING) */}
// //         {view === "requests" && (
// //           <>
// //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>
// //                 ALL REQUESTS ({filteredRequests.length})
// //               </div>
// //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// //                {filteredRequests.map(r => (
// //                   <div 
// //                     key={r._id} 
// //                     onClick={() => {
// //   setEditingRequest(JSON.parse(JSON.stringify(r)));
// //   setApprovedItems({});
// //   setSelectAll(false);
// // }}
// //                     style={{ 
// //                       padding: '16px', 
// //                       borderRadius: '16px', 
// //                       cursor: 'pointer', 
// //                       background: editingRequest?._id === r._id ? '#fff' : 'transparent', 
// //                       border: editingRequest?._id === r._id ? '1px solid #6366f1' : '1px solid transparent', 
// //                       boxShadow: editingRequest?._id === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', 
// //                       transition: 'all 0.2s' 
// //                     }}
// //                   >
// //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// //                       <div style={{ fontWeight: '700', color: editingRequest?._id === r._id ? '#6366f1' : '#1e293b' }}>
// //                         {r.userId?.name || 'Unknown User'}
// //                       </div>
// //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
// //                         {new Date(r.createdAt).toLocaleDateString()}
// //                       </div>
// //                     </div>
// //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
// //                       <span>{r.godownId?.name || "Main Godown"} • {r.items?.length} Items</span>
// //                       <span
// //   style={{
// //     background:
// //   r.status === "pending"
// //     ? "#fee2e2"
// //     : r.status === "confirmed"
// //     ? "#dbeafe"
// //     : r.status === "received"
// //     ? "#dcfce7"
// //     : r.status === "partially_received"
// //     ? "#f3e8ff"
// //     : r.status === "rejected"
// //     ? "#fee2e2"
// //     : "#f1f5f9",

// //     color:
// //       r.status === "pending"
// //         ? "#dc2626"
// //         : r.status === "confirmed"
// //         ? "#2563eb"
// //         : r.status === "received"
// //         ? "#16a34a"
// //         : r.status === "partially_received"
// //         ? "#9333ea"          // purple text
// //         : "#64748b",

// //     padding: "2px 8px",
// //     borderRadius: "6px",
// //     fontSize: "10px",
// //     fontWeight: "700"
// //   }}
// // >
// //   {r.status?.replaceAll("_", " ").toUpperCase()}
// // </span>
// //                     </div>
// //                   </div>
// //                 ))}
// //               </div>
// //             </div>

// //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// //               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
// //                 {editingRequest ? (
// //                   <>
// //                     <div>
// //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>SOURCE GODOWN</div>
// //                       <div style={{ fontWeight: '800', fontSize: '18px', color: '#0f172a' }}>
// //                         {editingRequest.godownId?.name || "General"}
// //                       </div>
// //                     </div>
// //                     <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
// //                       <button
// //                         onClick={handleDownloadAllRequestsExcel}
// //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// //                       >
// //                         <FileSpreadsheet size={16} /> Export All Requests
// //                       </button>
// //                       <div style={{ textAlign: 'right' }}>
// //                         <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>ESTIMATED VALUATION</div>
// //                         <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>
// //                           ₹{editingRequest.items.reduce((sum, i) => sum + (Number(i.qtyBaseUnit || 0) * Number(i.price || 0)), 0).toLocaleString()}
// //                         </div>
// //                       </div>
// //                     </div>
// //                   </>
// //                 ) : (
// //                   <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
// //                     <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
// //   <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
  
// //   <input
// //     type="date"
// //     value={fromDate}
// //     onChange={(e) => setFromDate(e.target.value)}
// //     style={{
// //       padding: "8px 12px",
// //       borderRadius: "10px",
// //       border: "1px solid #e2e8f0",
// //       fontSize: "13px"
// //     }}
// //   />

// //   <span style={{ fontSize: "12px", color: "#64748b" }}>to</span>

// //   <input
// //     type="date"
// //     value={toDate}
// //     onChange={(e) => setToDate(e.target.value)}
// //     style={{
// //       padding: "8px 12px",
// //       borderRadius: "10px",
// //       border: "1px solid #e2e8f0",
// //       fontSize: "13px"
// //     }}
// //   />

// //   {(fromDate || toDate) && (
// //     <button
// //       onClick={() => {
// //         setFromDate("");
// //         setToDate("");
// //       }}
// //       style={{
// //         padding: "8px 12px",
// //         border: "1px solid #e2e8f0",
// //         borderRadius: "8px",
// //         cursor: "pointer"
// //       }}
// //     >
// //       Clear
// //     </button>
// //   )}
// // </div>

// // </div>

// //                      <button
// //                         onClick={handleDownloadAllRequestsExcel}
// //                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
// //                       >
// //                         <FileSpreadsheet size={16} /> Export All Requests
// //                       </button>
// //                   </div>
// //                 )}
// //               </div>

// //               {editingRequest ? (
// //                 <>
// //                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// //                       <thead>
// //                         <tr style={{ textAlign: 'left' }}>
// //                           <th style={{ width: "40px" }}>
// //   <input
// //     type="checkbox"
// //     checked={selectAll}
// //     disabled={editingRequest?.status !== "pending"}
// //     onChange={(e) => {
// //       const checked = e.target.checked;
// //       setSelectAll(checked);

// //       const newApproved = {};

// //       if (checked) {
// //   editingRequest.items.forEach(it => {
// //     const id = it.stockItemId?._id || it.stockItemId;

// //     // skip rejected items
// //     if (!rejectedItems[id]) {
// //       newApproved[id] = true;
// //     }
// //   });
// // }

// //       setApprovedItems(newApproved);
// //     }}
// //   />
// // </th>
// // <th>ITEM</th>
// //                           {/* <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th> */}
// //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
// //                           {/* <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', width: '140px' }}>QTY</th> */}
// //                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
// //   REQUESTED
// // </th>

// // <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
// //   RECEIVED
// // </th>
// // <th
// //   style={{
// //     padding: '24px 0 12px',
// //     fontSize: '11px',
// //     fontWeight: '900',
// //     color: '#94a3b8',
// //     borderBottom: '1px solid #e2e8f0',
// //     textAlign: 'right'
// //   }}
// // >
// //   ACTION
// // </th>
// //                         </tr>
// //                       </thead>
// //                       <tbody>
// //                         {editingRequest.items.map((it, idx) => (
// //                           <tr
// //   key={idx}
// //   style={{
// //     background:
// //       it.status === "rejected"
// //         ? "#fef2f2"
// //         : "transparent"
// //   }}
// // >
// //   <td>
// //     <input
// //   type="checkbox"
// //   disabled={editingRequest.status !== "pending"}
// //   checked={!!approvedItems[it.stockItemId?._id || it.stockItemId]}
      
// //   onChange={(e) => {
// //   const id = it.stockItemId?._id || it.stockItemId;
// //   const checked = e.target.checked;

// //   setApprovedItems(prev => ({
// //     ...prev,
// //     [id]: checked
// //   }));

// //   if (checked) {
// //     // remove rejected badge when selected again
// //     setRejectedItems(prev => {
// //       const copy = { ...prev };
// //       delete copy[id];
// //       return copy;
// //     });
// //   } else {
// //     // show rejected badge when unchecked
// //     setRejectedItems(prev => ({
// //       ...prev,
// //       [id]: true
// //     }));
// //   }

// //   setSelectAll(false);
// // }}
// //     />
// //   </td>
// //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(it)}</div>
// //                             </td>
// //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// //                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
// //                                 {getGroupName(it)}
// //                               </span>
// //                             </td>
// //                            {/* REQUESTED COLUMN */}
// // <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700' }}>
// //   {formatQty(it.qtyBaseUnit)}{" "}
// //   <span style={{ fontSize: '12px', color: '#64748b' }}>
// //     {getUnitSymbol(it)}
// //   </span>
// // </td>

// // {/* RECEIVED COLUMN */}
// // <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700', color: '#16a34a' }}>
// //   {formatQty(it.receivedQty)}{" "}
// //   <span style={{ fontSize: '12px', color: '#64748b' }}>
// //     {getUnitSymbol(it)}
// //   </span>

// //   {(it.receivedQty || 0) >= (it.qtyBaseUnit || 0) && (
// //     <div style={{ fontSize: "10px", color: "#16a34a" }}>
// //       ✔ Fully Received
// //     </div>
// //   )}
// // </td>


// // <td
// //   style={{
// //     padding: '20px 0',
// //     borderBottom: '1px solid #f8fafc',
// //     textAlign: 'right'
// //   }}
// // >
 
// //   {it.status === "rejected" ||
// // rejectedItems[it.stockItemId?._id || it.stockItemId] ? (
// //   <span
// //     style={{
// //       background: "#fee2e2",
// //       color: "#dc2626",
// //       padding: "6px 12px",
// //       borderRadius: "8px",
// //       fontSize: "12px",
// //       fontWeight: "700"
// //     }}
// //   >
// //     REJECTED
// //   </span>
// // ) : (
// //   editingRequest.status === "pending" && (
// //     <button
// //       onClick={() => {
// //         const id = it.stockItemId?._id || it.stockItemId;

// //         setRejectedItems(prev => ({
// //           ...prev,
// //           [id]: true
// //         }));

// //         setApprovedItems(prev => {
// //           const copy = { ...prev };
// //           delete copy[id];
// //           return copy;
// //         });

// //         setSelectAll(false);
// //       }}
// //       style={{
// //         background: "#fff",
// //         color: "#dc2626",
// //         border: "1px solid #fecaca",
// //         padding: "6px 12px",
// //         borderRadius: "8px",
// //         cursor: "pointer",
// //         fontWeight: "700",
// //         fontSize: "12px"
// //       }}
// //     >
// //       Reject
// //     </button>
// //   )
// // )}
// // </td>                            
// //                           </tr>
// //                         ))}
// //                       </tbody>
// //                     </table>
// //                   </div>

// //                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// //                     <button 
// //                       onClick={() => setEditingRequest(null)} 
// //                       style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
// //                     >
// //                       Cancel
// //                     </button>
// // {editingRequest.status === "pending" && (
// //   <>
// //     <button
// //       onClick={rejectEntireRequest}
// //       style={{
// //         background: "#dc2626",
// //         border: "none",
// //         color: "#fff",
// //         padding: "12px 24px",
// //         borderRadius: "12px",
// //         fontWeight: "700",
// //         cursor: "pointer"
// //       }}
// //     >
// //       Reject Entire Request
// //     </button>

// //     <button
// //       onClick={confirmRequest}
// //       style={{
// //         background: "#6366f1",
// //         border: "none",
// //         color: "#fff",
// //         padding: "12px 24px",
// //         borderRadius: "12px",
// //         fontWeight: "700",
// //         fontSize: "13px",
// //         cursor: "pointer",
// //         display: "flex",
// //         alignItems: "center",
// //         gap: "8px"
// //       }}
// //     >
// //       Confirm Request
// //     </button>
// //   </>
// // )}
// //                     {/* {!["confirmed", "received", "partially_received"].includes(editingRequest.status) && (
// //   <button onClick={confirmRequest}
// //                         style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
// //                       >
// //                         Confirm Request
// //                       </button>
// //                     )} */}
// //                   </div>
// //                 </>
// //               ) : (
// //                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// //                   Select a request from the sidebar to review and convert
// //                 </div>
// //               )}
// //             </div>
// //           </>
// //         )}

// //         {/* VIEW: CREATE NEW (MANUAL) */}
// //         {view === "create" && (
// //           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
// //             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// //               <div>
// //                 <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Create Requisition</h2>
// //                 <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
// //                     <span onClick={() => setTab("stock-items")} style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: tab === 'stock-items' ? '#6366f1' : '#64748b' }}>Stock Items</span>
// //                 </div>
// //               </div>
// //               <div style={{ textAlign: 'right' }}>
// //                 <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>ESTIMATED TOTAL</div>
// //                 <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{Object.values(selectedItems).reduce((sum, i) => i.checked ? sum + (Number(i.qty || 0) * Number(i.price || 0)) : sum, 0).toLocaleString()}</div>
// //               </div>
// //             </div>

// //             <div style={{ flex: 1, overflowY: 'auto' }}>
// //               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// //                 <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
// //                   <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// //                     <th style={{ padding: '20px 32px', width: '50px' }}>
// //                         <input type="checkbox" onChange={(e) => {
// //                            const isChecked = e.target.checked;
// //                            const newSelection = { ...selectedItems };
// //                            filteredStock.forEach(item => {
// //                              newSelection[item._id] = { ...(newSelection[item._id] || { qty: 0, price: 0 }), checked: isChecked };
// //                            });
// //                            setSelectedItems(newSelection);
// //                         }} style={{ width: '18px', height: '18px' }} />
// //                     </th>
// //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>NAME</th>
// //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>STOCK GROUP</th>
// //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '140px' }}>QTY</th>
// //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '100px' }}>PRICE</th>
// //                     <th style={{ padding: '20px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>ITEM TOTAL</th>
// //                   </tr>
// //                 </thead>
// //                 <tbody>
// //                   {filteredStock.map((row) => {
// //                     const state = selectedItems[row._id] || { checked: false, qty: 0, price: 0 };
// //                     const itemTotal = Number(state.qty || 0) * Number(state.price || 0);
// //                     return (
// //                       <tr key={row._id} style={{ borderBottom: '1px solid #f8fafc', background: state.checked ? '#fcfdff' : 'transparent' }}>
// //                         <td style={{ padding: '16px 32px' }}>
// //                           <input type="checkbox" checked={state.checked} onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, checked: e.target.checked } }))} style={{ width: '18px', height: '18px' }} />
// //                         </td>
// //                         <td style={{ padding: '16px 0' }}>
// //                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
// //                             <span style={{ fontWeight: '700', color: '#1e293b' }}>{row.name}</span>
// //                           </div>
// //                         </td>
// //                         <td style={{ padding: '16px 0' }}>
// //                           <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
// //                             {row.stockGroupId?.name || 'Unassigned'}
// //                           </span>
// //                         </td>
// //                         <td style={{ padding: '16px 0' }}>
// //                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
// //                             <input type="number"
// // step="0.001" disabled={!state.checked} value={state.qty} placeholder="0" onChange={(e) => {
// //   const value = e.target.value;

// //   if (!/^\d*\.?\d{0,3}$/.test(value) && value !== "") {
// //     return;
// //   }

// //   setSelectedItems(prev => ({
// //     ...prev,
// //     [row._id]: {
// //       ...state,
// //       qty: value
// //     }
// //   }));
// // }} style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// //                             <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{row.unitId?.symbol}</span>
// //                           </div>
// //                         </td>
// //                         <td style={{ padding: '16px 0' }}>
// //                             <input type="number" disabled={!state.checked} value={state.price} placeholder="₹" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, price: e.target.value } }))} style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// //                         </td>
// //                         <td style={{ padding: '16px 32px', textAlign: 'right', fontWeight: '800', color: state.checked ? '#6366f1' : '#94a3b8' }}>
// //                           ₹{itemTotal.toLocaleString()}
// //                         </td>
// //                       </tr>
// //                     );
// //                   })}
// //                 </tbody>
// //               </table>
// //             </div>
// //             <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// //               <button onClick={submitIndent} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
// //                 Submit Requisition
// //               </button>
// //             </div>
// //           </div>
// //         )}
// //       </div>
// //     </div>
// //   );
// // };








// // 01-07-2026











// import { useEffect, useMemo, useState, useCallback } from "react";
// import { api } from "../api.js";
// import { useToast } from "../toast.jsx";
// import XLSX from "xlsx-js-style";
// // import * as XLSX from "xlsx";
// import { 
//   Search, FileSpreadsheet, CheckCircle2, Inbox, 
//   ClipboardList, PlusCircle, RefreshCw, X, Save 
// } from "lucide-react";

// export const IndentPage = () => {
//   const { showToast } = useToast();
//   const [fromDate, setFromDate] = useState("");
// const [toDate, setToDate] = useState("");
//   // View State
//   const [view, setView] = useState("history"); 
//   const [tab, setTab] = useState("stock-items");
//   const [searchTerm, setSearchTerm] = useState("");
  
//   // Data State
//   const [stockItems, setStockItems] = useState([]);
//   const [indents, setIndents] = useState([]);
//   const [indentRequests, setIndentRequests] = useState([]);
//   const [selectedItems, setSelectedItems] = useState({});
//   const [selectedId, setSelectedId] = useState(null);

//   // --- Editing State for Requests ---
//   const [editingRequest, setEditingRequest] = useState(null);
//   const [approvedItems, setApprovedItems] = useState({});
//   const [rejectedItems, setRejectedItems] = useState({});
//   const [selectAll, setSelectAll] = useState(false);

//   // --- Data Loading ---
//   const load = useCallback(async () => {
//     try {
//       const [itemsRes, indentRes] = await Promise.all([
//         api.get("/inventory/stock-items"),
//         api.get("/procurement/indents")
//       ]);
//       setStockItems(itemsRes.data || []);
//       const sorted = (indentRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
//       setIndents(sorted);
//       if (sorted.length > 0 && !selectedId) setSelectedId(sorted[0]._id);
//     } catch (error) {
//       showToast("Failed to load data", "error");
//     }
//   }, [showToast, selectedId]);

//   const fetchIndentRequests = useCallback(async () => {
//     try {
//       const res = await api.get("/indent-requests");
//       setIndentRequests(res.data || []);
//     } catch (error) {
//       showToast("Failed to fetch requests", "error");
//     }
//   }, [showToast]);

//   useEffect(() => { 
//     load(); 
//     if (view === "requests") fetchIndentRequests();
//   }, [load, fetchIndentRequests, view]);

//   // --- Helper Functions ---
//   const getUnitSymbol = (item) => {
//     if (item.stockItemId?.unitId?.symbol) return item.stockItemId.unitId.symbol;
//     if (item.unitId?.symbol) return item.unitId.symbol;
//     const id = item.stockItemId?._id || item.stockItemId;
//     const found = stockItems.find(s => s._id === id);
//     return found?.unitId?.symbol || "";
//   };

//   const formatQty = (value) => {
//   const num = Number(value || 0);
//   return Number(num.toFixed(3)).toString();
// };
//   const getItemName = (item) => {
//     if (item.stockItemId?.name) return item.stockItemId.name;
//     const id = item.stockItemId?._id || item.stockItemId;
//     const found = stockItems.find(s => s._id === id);
//     return found ? found.name : "Unknown Product";
//   };


//   const getGroupName = (item) => {
//     if (item.stockItemId?.stockGroupId?.name) return item.stockItemId.stockGroupId.name;
//     if (item.stockGroupId?.name) return item.stockGroupId.name;
//     const id = item.stockItemId?._id || item.stockItemId;
//     const found = stockItems.find(s => s._id === id);
//     return found?.stockGroupId?.name || "General";
//   };
// const handleDownloadAllConsumptionsExcel = () => {
//   if (!processedRows.length) {
//     return;
//   }

//   const groupedByDate = {};

//   processedRows.forEach(cons => {
//     const date = new Date(cons.createdAt)
//       .toISOString()
//       .split("T")[0];

//     if (!groupedByDate[date]) {
//       groupedByDate[date] = [];
//     }

//     groupedByDate[date].push(cons);
//   });

//   const aoa = [];

//   aoa.push(["MONTESSORI CONSUMPTION REPORT"]);
//   aoa.push([]);

//   Object.keys(groupedByDate)
//     .sort((a, b) => new Date(b) - new Date(a))
//     .forEach(date => {

//       const consumptions = groupedByDate[date];

//       const godowns = [
//         ...new Set(
//           consumptions.map(
//             c => c.godownId?.name || "General"
//           )
//         )
//       ];

//       const itemMap = {};

//       consumptions.forEach(cons => {
//         const godown =
//           cons.godownId?.name || "General";

//         cons.items.forEach(item => {

//           const id =
//             item.stockItemId?._id ||
//             item.stockItemId;

//           if (!itemMap[id]) {
//             itemMap[id] = {
//               name:
//                 item.stockItemId?.name ||
//                 "Unknown",
//               group: getGroupName(item),
//               unit:
//                 item.stockItemId?.unitId?.symbol ||
//                 "",
//               total: 0,
//               godowns: {}
//             };
//           }

//           const qty =
//             Number(item.qtyBaseUnit || 0);

//           itemMap[id].total += qty;

//           if (!itemMap[id].godowns[godown]) {
//             itemMap[id].godowns[godown] = 0;
//           }

//           itemMap[id].godowns[godown] += qty;
//         });
//       });

//       aoa.push([`DATE: ${date}`]);

//       const header = [
//         "S.No",
//         "Stock Item",
//         "Stock Group",
//         "Unit",
//         "Total Consumed"
//       ];

//       godowns.forEach(g => {
//         header.push(g);
//       });

//       aoa.push(header);

//       Object.values(itemMap).forEach(
//         (item, index) => {

//           const row = [
//             index + 1,
//             item.name,
//             item.group,
//             item.unit,
//             item.total
//           ];

//           godowns.forEach(g => {
//             row.push(
//               item.godowns[g] || 0
//             );
//           });

//           aoa.push(row);
//         }
//       );

//       aoa.push([]);
//     });

//   const ws =
//     XLSX.utils.aoa_to_sheet(aoa);

//   const maxCols =
//     Math.max(...aoa.map(r => r.length));

//   ws["!merges"] = [
//     {
//       s: { r: 0, c: 0 },
//       e: { r: 0, c: maxCols - 1 }
//     }
//   ];

//   // Main title style
//   if (ws["A1"]) {
//     ws["A1"].s = {
//       font: {
//         bold: true,
//         sz: 16,
//         color: { rgb: "FFFFFF" }
//       },
//       fill: {
//         fgColor: {
//           rgb: "4F46E5"
//         }
//       }
//     };
//   }

//   Object.keys(ws).forEach(cell => {

//     if (
//       ws[cell]?.v &&
//       String(ws[cell].v).startsWith("DATE:")
//     ) {
//       ws[cell].s = {
//         font: {
//           bold: true,
//           color: { rgb: "FFFFFF" }
//         },
//         fill: {
//           fgColor: {
//             rgb: "2563EB"
//           }
//         }
//       };
//     }

//     if (ws[cell]?.v === "S.No") {

//       const rowNo =
//         cell.match(/\d+/)[0];

//       for (
//         let i = 0;
//         i < maxCols;
//         i++
//       ) {

//         const col =
//           XLSX.utils.encode_col(i);

//         const ref =
//           `${col}${rowNo}`;

//         if (ws[ref]) {
//           ws[ref].s = {
//             font: {
//               bold: true,
//               color: {
//                 rgb: "FFFFFF"
//               }
//             },
//             fill: {
//               fgColor: {
//                 rgb: "16A34A"
//               }
//             }
//           };
//         }
//       }
//     }
//   });

//   const wb = XLSX.utils.book_new();

//   XLSX.utils.book_append_sheet(
//     wb,
//     ws,
//     "Consumption"
//   );

//   XLSX.writeFile(
//     wb,
//     fromDate || toDate
//       ? `Consumption_${fromDate || "start"}_to_${toDate || "end"}.xlsx`
//       : "Consumption_Report.xlsx"
//   );
// };
// const handleDownloadAllRequestsExcel = () => {
//   if (!indentRequests.length) {
//     return showToast("No requests available", "info");
//   }

//   let filtered = [...indentRequests];

//   filtered = filtered.filter(r => {
//     const d = new Date(r.createdAt).toISOString().split("T")[0];
//     if (fromDate && d < fromDate) return false;
//     if (toDate && d > toDate) return false;
//     return true;
//   });

//   if (!filtered.length) {
//     return showToast("No requests found", "info");
//   }

// //   filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
// filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
//   const groupedByDate = {};

//   filtered.forEach(req => {
//     const date = new Date(req.createdAt).toISOString().split("T")[0];
//     if (!groupedByDate[date]) groupedByDate[date] = [];
//     groupedByDate[date].push(req);
//   });

//   const aoa = [];

//   aoa.push(["MONTESSORI DAILY INDENT REQUEST REPORT"]);
//   aoa.push([]);

// // =========================================
// // CONSOLIDATED RECEIVED REPORT
// // =========================================

// const allBranches = [
//   ...new Set(
//     filtered.map(r => r.godownId?.name || "General")
//   )
// ].sort();

// const consolidatedMap = {};

// filtered.forEach(req => {

//   const branch = req.godownId?.name || "General";

//   req.items.forEach(it => {

//     const id =
//       it.stockItemId?._id ||
//       it.stockItemId;

//     if (!consolidatedMap[id]) {

//       consolidatedMap[id] = {
//         name: getItemName(it),
//         group: getGroupName(it),
//         unit: getUnitSymbol(it),
//         totalReceived: 0,
//         branches: {}
//       };

//     }

//     const received =
//       Number(it.receivedQty || 0);

//     consolidatedMap[id].totalReceived += received;

//     consolidatedMap[id].branches[branch] =
//       (consolidatedMap[id].branches[branch] || 0)
//       + received;

//   });

// });

// aoa.push(["CONSOLIDATED RECEIVED REPORT"]);


// const consolidatedHeader = [
//   "S.No",
//   "Stock Item",
//   "Stock Group",
//   "Unit",
//   "Total Received"
// ];

// allBranches.forEach(branch => {
//   consolidatedHeader.push(branch);
// });

// aoa.push(consolidatedHeader);


// Object.values(consolidatedMap).forEach((item, index) => {

//   const row = [

//     index + 1,

//     item.name,

//     item.group,

//     item.unit,

//     item.totalReceived

//   ];

//   allBranches.forEach(branch => {

//     row.push(
//       item.branches[branch] || 0
//     );

//   });

//   aoa.push(row);

// });

// aoa.push([]);
// aoa.push([]);


//     Object.keys(groupedByDate)
//   .sort((a, b) => new Date(b) - new Date(a))
//   .forEach(date => {
//       const requests = groupedByDate[date];

//       const branches = [...new Set(requests.map(r => r.godownId?.name || "General"))];

//       const itemMap = {};

//       requests.forEach(req => {
//         const branch = req.godownId?.name || "General";

//         req.items.forEach(it => {
//           const id = it.stockItemId?._id || it.stockItemId;

//           if (!itemMap[id]) {
//             itemMap[id] = {
//               name: getItemName(it),
//               group: getGroupName(it),
//               unit: getUnitSymbol(it),
//               requestedTotal: 0,
//               receivedTotal: 0,
//               branches: {}
//             };
//           }

//           const reqQty = Number(it.qtyBaseUnit || 0);
//           const recQty = Number(it.receivedQty || 0);

//           itemMap[id].requestedTotal += reqQty;
//           itemMap[id].receivedTotal += recQty;

//           if (!itemMap[id].branches[branch]) {
//             itemMap[id].branches[branch] = { requested: 0, received: 0 };
//           }

//           itemMap[id].branches[branch].requested += reqQty;
//           itemMap[id].branches[branch].received += recQty;
//         });
//       });

//       const items = Object.values(itemMap);

//       aoa.push([`DATE: ${date}`]);

//       const header = [
//         "S.No",
//         "Stock Item",
//         "Stock Group",
//         "Unit",
//         "Requested (Total)",
//         "Received (Total)"
//       ];

//       branches.forEach(b => {
//         header.push(`${b} - Requested`);
//         header.push(`${b} - Received`);
//       });

//       aoa.push(header);

//       items.forEach((it, index) => {
//         const row = [
//           index + 1,
//           it.name,
//           it.group,
//           it.unit,
//           it.requestedTotal,
//           it.receivedTotal
//         ];

//         branches.forEach(b => {
//           row.push(it.branches[b]?.requested || 0);
//           row.push(it.branches[b]?.received || 0);
//         });

//         aoa.push(row);
//       });

//       aoa.push([]);
//     });

// const maxCols = Math.max(...aoa.map(r => r.length));

// const ws = XLSX.utils.aoa_to_sheet(aoa);

// // Merge title row
// ws["!merges"] = [
//   {
//     s: { r: 0, c: 0 },
//     e: { r: 0, c: maxCols - 1 }
//   }
// ];

// // TITLE STYLE
// if (ws["A1"]) {
//   ws["A1"].s = {
//     font: {
//       bold: true,
//       sz: 16,
//       color: { rgb: "FFFFFF" }
//     },
//     alignment: {
//       horizontal: "center"
//     },
//     fill: {
//       fgColor: { rgb: "1E3A8A" } // Dark Blue
//     }
//   };
// }

// // DATE ROW + HEADER ROW STYLING
// Object.keys(ws).forEach(cell => {

//   // DATE ROWS
//   if (
//     ws[cell]?.v &&
//     String(ws[cell].v).startsWith("DATE:")
//   ) {
//     const rowNo = cell.match(/\d+/)[0];

//     for (let i = 0; i < maxCols; i++) {

//       const col = XLSX.utils.encode_col(i);
//       const ref = `${col}${rowNo}`;

//       if (ws[ref]) {
//         ws[ref].s = {
//           font: {
//             bold: true,
//             color: { rgb: "FFFFFF" }
//           },
//           fill: {
//             fgColor: { rgb: "16A34A" } // Green
//           }
//         };
//       }
//     }
//   }

//   // HEADER ROWS
//   if (ws[cell]?.v === "S.No") {

//     const rowNo = cell.match(/\d+/)[0];

//     for (let i = 0; i < maxCols; i++) {

//       const col = XLSX.utils.encode_col(i);
//       const ref = `${col}${rowNo}`;

//       if (ws[ref]) {
//         ws[ref].s = {
//           font: {
//             bold: true,
//             color: { rgb: "FFFFFF" }
//           },
//           alignment: {
//             horizontal: "center"
//           },
//           fill: {
//             fgColor: { rgb: "2563EB" } // Blue
//           }
//         };
//       }
//     }
//   }
// });

// const wb = XLSX.utils.book_new();
//   XLSX.utils.book_append_sheet(wb, ws, "Indent Report");

//   const fileName =
//     fromDate || toDate
//       ? `Montessori_Indent_${fromDate || "start"}_to_${toDate || "end"}.xlsx`
//       : "Montessori_Indent_All.xlsx";

//   XLSX.writeFile(wb, fileName);

//   showToast("Excel exported successfully", "success");
// };


// const handleDownloadExcel = () => {
//   if (!activeIndent) return;

//   const aoa = [];

//   aoa.push(["INDENT REPORT"]);
//   aoa.push([
//     `DATE: ${new Date(activeIndent.createdAt).toLocaleDateString()}`
//   ]);
//   aoa.push([]);

//   aoa.push([
//     "Product",
//     "Group",
//     "Quantity",
//     "Unit",
//     "Price",
//     "Subtotal"
//   ]);

//   activeIndent.items.forEach(item => {
//     aoa.push([
//       getItemName(item),
//       getGroupName(item),
//       item.orderedQty,
//       getUnitSymbol(item),
//       item.unitPrice,
//       item.orderedQty * item.unitPrice
//     ]);
//   });

//   const ws = XLSX.utils.aoa_to_sheet(aoa);
// // Main title
// if (ws["A1"]) {
//   ws["A1"].s = {
//     font: {
//       bold: true,
//       sz: 16,
//       color: { rgb: "FFFFFF" }
//     },
//     fill: {
//       fgColor: { rgb: "4F46E5" }
//     }
//   };
// }
// Object.keys(ws).forEach(cell => {
//   if (
//     cell[0] === "A" &&
//     ws[cell]?.v &&
//     String(ws[cell].v).startsWith("DATE:")
//   ) {
//     ws[cell].s = {
//       font: {
//         bold: true,
//         color: { rgb: "FFFFFF" }
//       },
//       fill: {
//         fgColor: { rgb: "2563EB" }
//       }
//     };
//   }
// });
// Object.keys(ws).forEach(cell => {
//   if (
//     ws[cell]?.v === "S.No"
//   ) {
//     const row = cell.match(/\d+/)[0];

//     ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O"]
//       .forEach(col => {
//         const headerCell = `${col}${row}`;

//         if (ws[headerCell]) {
//           ws[headerCell].s = {
//             font: {
//               bold: true,
//               color: { rgb: "FFFFFF" }
//             },
//             fill: {
//               fgColor: { rgb: "16A34A" }
//             }
//           };
//         }
//       });
//   }
// });  
//   ws["!cols"] = [
//     { wch: 25 },
//     { wch: 20 },
//     { wch: 12 },
//     { wch: 10 },
//     { wch: 12 },
//     { wch: 15 }
//   ];

//   const wb = XLSX.utils.book_new();
//   XLSX.utils.book_append_sheet(wb, ws, "Indent");

//   XLSX.writeFile(
//     wb,
//     `Indent_${activeIndent.indentNo || "Export"}.xlsx`
//   );

//   showToast("Excel exported successfully", "success");
// };

//   const handleStatusUpdate = async (id, newStatus) => {
//     try {
//       if (newStatus === 'purchased') {
//         await api.post(`/procurement/indents/${id}/mark-purchased`);
//       } else {
//         await api.patch(`/indents/${id}`, { status: newStatus });
//       }
//       showToast(`Indent marked as ${newStatus}`, "success");
//       load();
//     } catch (error) {
//       showToast("Failed to update status", "error");
//     }
//   };
//  const rejectEntireRequest = async () => {
//   try {
//     await api.patch(
//       `/indent-requests/${editingRequest._id}/reject`
//     );

//     showToast(
//       "Request rejected successfully",
//       "success"
//     );

//     setEditingRequest(null);

//     fetchIndentRequests();

//   } catch (err) {
//     showToast(
//       "Reject failed",
//       "error"
//     );
//   }
// };
//   const confirmRequest = async () => {
   
//   try {
//     const selectedItems = editingRequest.items
//       .filter(it => {
//         const id = it.stockItemId?._id || it.stockItemId;
//         return approvedItems[id];
//       })
//       .map(it => ({
//         stockItemId: it.stockItemId?._id || it.stockItemId,
//         qtyBaseUnit: it.qtyBaseUnit
//       }));

//     if (selectedItems.length === 0) {
//       return showToast("Select at least one item", "info");
//     }

//     await api.patch(`/indent-requests/${editingRequest._id}/confirm`, {
//       items: selectedItems
//     });

//     showToast("Selected items approved!", "success");

//     setEditingRequest(null);
//     setApprovedItems({});
//     fetchIndentRequests();
//   } catch (err) {
//     showToast("Confirmation failed", "error");
//   }
// };

//   const submitIndent = async () => {
//     const itemsToSubmit = Object.keys(selectedItems)
//       .filter(id => selectedItems[id].checked && Number(selectedItems[id].qty) > 0)
//       .map(id => ({
//         stockItemId: id,
//         orderedQty: Number(selectedItems[id].qty),
//         unitPrice: Number(selectedItems[id].price || 0),
//         amount: Number(selectedItems[id].qty) * Number(selectedItems[id].price || 0)
//       }));

//     if (itemsToSubmit.length === 0) return showToast("Select items with quantity", "info");

//     try {
//       await api.post("/procurement/indents", { items: itemsToSubmit });
//       showToast("Indent submitted", "success");
//       setSelectedItems({});
//       setView("history");
//       load();
//     } catch (error) {
//       showToast("Submission failed", "error");
//     }
//   };

//   // --- Memoized Filters ---
//   const filteredIndents = useMemo(() => {
//     return indents.filter(i =>
//       (i.indentNo?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
//       (i._id.includes(searchTerm))
//     );
//   }, [indents, searchTerm]);

//   const filteredStock = useMemo(() => {
//     return stockItems.filter(s =>
//       s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       s.stockGroupId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
//     );
//   }, [stockItems, searchTerm]);
// const filteredRequests = useMemo(() => {
//   return indentRequests
//     .filter((r) => {
//       const reqDate = new Date(r.createdAt).toISOString().split("T")[0];

//       if (fromDate && reqDate < fromDate) return false;
//       if (toDate && reqDate > toDate) return false;

//       return true;
//     })
//     .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// }, [indentRequests, fromDate, toDate]);
//   const activeIndent = useMemo(() =>
//     indents.find(i => i._id === selectedId) || indents[0],
//     [selectedId, indents]);

//   const isConfirmed = editingRequest?.status === "confirmed";

//   return (
//     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
//       {/* Header Area */}
//       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
//           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
//             <span style={{ color: '#6366f1' }}>Indents</span>
//           </h1>
          
//           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
//             {[
//               { id: 'history', label: 'Logs', icon: <ClipboardList size={14}/> },
//               { id: 'requests', label: 'Requests', icon: <Inbox size={14}/> },
//               { id: 'create', label: 'Create New', icon: <PlusCircle size={14}/> }
//             ].map((btn) => (
//               <button 
//                 key={btn.id}
//                 onClick={() => { setView(btn.id); setSearchTerm(""); setEditingRequest(null); }}
//                 style={{ 
//                   display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
//                   background: view === btn.id ? '#fff' : 'transparent', 
//                   color: view === btn.id ? '#6366f1' : '#64748b', 
//                   boxShadow: view === btn.id ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' 
//                 }}>
//                 {btn.icon} {btn.label}
//               </button>
//             ))}
//           </div>
//         </div>

//         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
//           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
//           <input
//             type="text"
//             placeholder="Search..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
//           />
//         </div>
//       </div>

//       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
//         {/* VIEW: HISTORY/LOGS */}
//         {view === "history" && (
//           <>
//             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
//               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>RESULTS ({filteredIndents.length})</div>
//               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
//                 {filteredIndents.map(r => (
//                   <div key={r._id} onClick={() => setSelectedId(r._id)}
//                     style={{ padding: '16px', borderRadius: '16px', cursor: 'pointer', background: selectedId === r._id ? '#fff' : 'transparent', border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent', boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', transition: 'all 0.2s' }}>
//                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//                       <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b' }}>{r.indentNo || `REF-${r._id.slice(-4)}`}</div>
//                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
//                     </div>
//                     <div
//   style={{
//     fontSize: "12px",
//     marginTop: "4px",
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center"
//   }}
// >
//   <span style={{ color: "#64748b" }}>
//     ₹{r.totalAmount?.toLocaleString()}
//   </span>

//   <span
//     style={{
//       background:
//         r.status === "pending"
//           ? "#fee2e2"
//           : r.status === "purchased"
//           ? "#f3e8ff"
//           : r.status === "stock_received"
//           ? "#dcfce7"
//           : "#f1f5f9",

//       color:
//         r.status === "pending"
//           ? "#dc2626"
//           : r.status === "purchased"
//           ? "#9333ea"
//           : r.status === "stock_received"
//           ? "#16a34a"
//           : "#64748b",

//       padding: "2px 8px",
//       borderRadius: "6px",
//       fontSize: "10px",
//       fontWeight: "700"
//     }}
//   >
//     {r.status?.replaceAll("_", " ").toUpperCase()}
//   </span>
// </div>
//                     {/* <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>₹{r.totalAmount?.toLocaleString()} • {r.status.toUpperCase()}</div> */}
//                   </div>
//                 ))}
//               </div>
//             </div>

//             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
//               {activeIndent ? (
//                 <>
//                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
//                     <div>
//                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>INDENT STATUS</div>
//                       <div
//   style={{
//     padding: "4px 12px",
//     borderRadius: "6px",
//     fontSize: "12px",
//     fontWeight: "800",
//     display: "inline-block",

//     background:
//       activeIndent.status === "pending"
//         ? "#fee2e2"
//         : activeIndent.status === "purchased"
//         ? "#f3e8ff"
//         : activeIndent.status === "stock_received"
//         ? "#dcfce7"
//         : "#f1f5f9",

//     color:
//       activeIndent.status === "pending"
//         ? "#dc2626"
//         : activeIndent.status === "purchased"
//         ? "#9333ea"
//         : activeIndent.status === "stock_received"
//         ? "#16a34a"
//         : "#64748b"
//   }}
// >
//   {activeIndent.status?.replaceAll("_", " ").toUpperCase()}
// </div>
//                     </div>
//                     <div style={{ textAlign: 'right' }}>
//                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
//                       <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activeIndent.totalAmount?.toLocaleString()}</div>
//                     </div>
//                   </div>
//                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
//                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//                       <thead>
//                         <tr style={{ textAlign: 'left' }}>
//                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th>
//                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
//                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
//                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {activeIndent.items.map((item, idx) => (
//                           <tr key={idx}>
//                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
//                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(item)}</div>
//                               {item.status === "rejected" && (
//   <div
//     style={{
//       display: "inline-block",
//       marginTop: "4px",
//       background: "#fee2e2",
//       color: "#dc2626",
//       padding: "2px 8px",
//       borderRadius: "6px",
//       fontSize: "10px",
//       fontWeight: "700"
//     }}
//   >
//     REJECTED
//   </div>
// )}
//                               <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
//                             </td>
//                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
//                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
//                                 {getGroupName(item)}
//                               </span>
//                             </td>
//                             <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700', borderBottom: '1px solid #f8fafc' }}>
//                                {formatQty(item.orderedQty)} <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: '400'}}>{getUnitSymbol(item)}</span>
//                             </td>
//                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1', borderBottom: '1px solid #f8fafc' }}>₹{(item.orderedQty * item.unitPrice).toLocaleString()}</td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
//                     <button onClick={handleDownloadExcel} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
//                       <FileSpreadsheet size={16} /> Export Excel
//                     </button>
//                     {activeIndent.status.toLowerCase() === 'pending' && (
//                       <button onClick={() => handleStatusUpdate(activeIndent._id, 'purchased')} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
//                         <CheckCircle2 size={16} /> Mark Purchased
//                       </button>
//                     )}
//                   </div>
//                 </>
//               ) : (
//                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Select an indent to view details</div>
//               )}
//             </div>
//           </>
//         )}

//         {/* VIEW: INDENT REQUESTS (INCOMING) */}
//         {view === "requests" && (
//           <>
//             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
//               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>
//                 ALL REQUESTS ({filteredRequests.length})
//               </div>
//               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
//                {filteredRequests.map(r => (
//                   <div 
//                     key={r._id} 
//                     onClick={() => {
//   setEditingRequest(JSON.parse(JSON.stringify(r)));
//   setApprovedItems({});
//   setSelectAll(false);
// }}
//                     style={{ 
//                       padding: '16px', 
//                       borderRadius: '16px', 
//                       cursor: 'pointer', 
//                       background: editingRequest?._id === r._id ? '#fff' : 'transparent', 
//                       border: editingRequest?._id === r._id ? '1px solid #6366f1' : '1px solid transparent', 
//                       boxShadow: editingRequest?._id === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', 
//                       transition: 'all 0.2s' 
//                     }}
//                   >
//                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//                       <div style={{ fontWeight: '700', color: editingRequest?._id === r._id ? '#6366f1' : '#1e293b' }}>
//                         {r.userId?.name || 'Unknown User'}
//                       </div>
//                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
//                         {new Date(r.createdAt).toLocaleDateString()}
//                       </div>
//                     </div>
//                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
//                       <span>{r.godownId?.name || "Main Godown"} • {r.items?.length} Items</span>
//                       <span
//   style={{
//     background:
//   r.status === "pending"
//     ? "#fee2e2"
//     : r.status === "confirmed"
//     ? "#dbeafe"
//     : r.status === "received"
//     ? "#dcfce7"
//     : r.status === "partially_received"
//     ? "#f3e8ff"
//     : r.status === "rejected"
//     ? "#fee2e2"
//     : "#f1f5f9",

//     color:
//       r.status === "pending"
//         ? "#dc2626"
//         : r.status === "confirmed"
//         ? "#2563eb"
//         : r.status === "received"
//         ? "#16a34a"
//         : r.status === "partially_received"
//         ? "#9333ea"          // purple text
//         : "#64748b",

//     padding: "2px 8px",
//     borderRadius: "6px",
//     fontSize: "10px",
//     fontWeight: "700"
//   }}
// >
//   {r.status?.replaceAll("_", " ").toUpperCase()}
// </span>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
//               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
//                 {editingRequest ? (
//                   <>
//                     <div>
//                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>SOURCE GODOWN</div>
//                       <div style={{ fontWeight: '800', fontSize: '18px', color: '#0f172a' }}>
//                         {editingRequest.godownId?.name || "General"}
//                       </div>
//                     </div>
//                     <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
//                       <button
//                         onClick={handleDownloadAllRequestsExcel}
//                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
//                       >
//                         <FileSpreadsheet size={16} /> Export All Requests
//                       </button>
//                       <div style={{ textAlign: 'right' }}>
//                         <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>ESTIMATED VALUATION</div>
//                         <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>
//                           ₹{editingRequest.items.reduce((sum, i) => sum + (Number(i.qtyBaseUnit || 0) * Number(i.price || 0)), 0).toLocaleString()}
//                         </div>
//                       </div>
//                     </div>
//                   </>
//                 ) : (
//                   <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
//                     <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
//   <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
  
//   <input
//     type="date"
//     value={fromDate}
//     onChange={(e) => setFromDate(e.target.value)}
//     style={{
//       padding: "8px 12px",
//       borderRadius: "10px",
//       border: "1px solid #e2e8f0",
//       fontSize: "13px"
//     }}
//   />

//   <span style={{ fontSize: "12px", color: "#64748b" }}>to</span>

//   <input
//     type="date"
//     value={toDate}
//     onChange={(e) => setToDate(e.target.value)}
//     style={{
//       padding: "8px 12px",
//       borderRadius: "10px",
//       border: "1px solid #e2e8f0",
//       fontSize: "13px"
//     }}
//   />

//   {(fromDate || toDate) && (
//     <button
//       onClick={() => {
//         setFromDate("");
//         setToDate("");
//       }}
//       style={{
//         padding: "8px 12px",
//         border: "1px solid #e2e8f0",
//         borderRadius: "8px",
//         cursor: "pointer"
//       }}
//     >
//       Clear
//     </button>
//   )}
// </div>

// </div>

//                      <button
//                         onClick={handleDownloadAllRequestsExcel}
//                         style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
//                       >
//                         <FileSpreadsheet size={16} /> Export All Requests
//                       </button>
//                   </div>
//                 )}
//               </div>

//               {editingRequest ? (
//                 <>
//                   <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
//                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//                       <thead>
//                         <tr style={{ textAlign: 'left' }}>
//                           <th style={{ width: "40px" }}>
//   <input
//     type="checkbox"
//     checked={selectAll}
//     disabled={editingRequest?.status !== "pending"}
//     onChange={(e) => {
//       const checked = e.target.checked;
//       setSelectAll(checked);

//       const newApproved = {};

//       if (checked) {
//   editingRequest.items.forEach(it => {
//     const id = it.stockItemId?._id || it.stockItemId;

//     // skip rejected items
//     if (!rejectedItems[id]) {
//       newApproved[id] = true;
//     }
//   });
// }

//       setApprovedItems(newApproved);
//     }}
//   />
// </th>
// <th>ITEM</th>
//                           {/* <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th> */}
//                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
//                           {/* <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', width: '140px' }}>QTY</th> */}
//                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
//   REQUESTED
// </th>

// <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
//   RECEIVED
// </th>
// <th
//   style={{
//     padding: '24px 0 12px',
//     fontSize: '11px',
//     fontWeight: '900',
//     color: '#94a3b8',
//     borderBottom: '1px solid #e2e8f0',
//     textAlign: 'right'
//   }}
// >
//   ACTION
// </th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {editingRequest.items.map((it, idx) => (
//                           <tr
//   key={idx}
//   style={{
//     background:
//       it.status === "rejected"
//         ? "#fef2f2"
//         : "transparent"
//   }}
// >
//   <td>
//     <input
//   type="checkbox"
//   disabled={editingRequest.status !== "pending"}
//   checked={!!approvedItems[it.stockItemId?._id || it.stockItemId]}
      
//   onChange={(e) => {
//   const id = it.stockItemId?._id || it.stockItemId;
//   const checked = e.target.checked;

//   setApprovedItems(prev => ({
//     ...prev,
//     [id]: checked
//   }));

//   if (checked) {
//     // remove rejected badge when selected again
//     setRejectedItems(prev => {
//       const copy = { ...prev };
//       delete copy[id];
//       return copy;
//     });
//   } else {
//     // show rejected badge when unchecked
//     setRejectedItems(prev => ({
//       ...prev,
//       [id]: true
//     }));
//   }

//   setSelectAll(false);
// }}
//     />
//   </td>
//                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
//                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(it)}</div>
//                             </td>
//                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
//                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
//                                 {getGroupName(it)}
//                               </span>
//                             </td>
//                            {/* REQUESTED COLUMN */}
// <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700' }}>
//   {formatQty(it.qtyBaseUnit)}{" "}
//   <span style={{ fontSize: '12px', color: '#64748b' }}>
//     {getUnitSymbol(it)}
//   </span>
// </td>

// {/* RECEIVED COLUMN */}
// <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700', color: '#16a34a' }}>
//   {formatQty(it.receivedQty)}{" "}
//   <span style={{ fontSize: '12px', color: '#64748b' }}>
//     {getUnitSymbol(it)}
//   </span>

//   {(it.receivedQty || 0) >= (it.qtyBaseUnit || 0) && (
//     <div style={{ fontSize: "10px", color: "#16a34a" }}>
//       ✔ Fully Received
//     </div>
//   )}
// </td>


// <td
//   style={{
//     padding: '20px 0',
//     borderBottom: '1px solid #f8fafc',
//     textAlign: 'right'
//   }}
// >
 
//   {it.status === "rejected" ||
// rejectedItems[it.stockItemId?._id || it.stockItemId] ? (
//   <span
//     style={{
//       background: "#fee2e2",
//       color: "#dc2626",
//       padding: "6px 12px",
//       borderRadius: "8px",
//       fontSize: "12px",
//       fontWeight: "700"
//     }}
//   >
//     REJECTED
//   </span>
// ) : (
//   editingRequest.status === "pending" && (
//     <button
//       onClick={() => {
//         const id = it.stockItemId?._id || it.stockItemId;

//         setRejectedItems(prev => ({
//           ...prev,
//           [id]: true
//         }));

//         setApprovedItems(prev => {
//           const copy = { ...prev };
//           delete copy[id];
//           return copy;
//         });

//         setSelectAll(false);
//       }}
//       style={{
//         background: "#fff",
//         color: "#dc2626",
//         border: "1px solid #fecaca",
//         padding: "6px 12px",
//         borderRadius: "8px",
//         cursor: "pointer",
//         fontWeight: "700",
//         fontSize: "12px"
//       }}
//     >
//       Reject
//     </button>
//   )
// )}
// </td>                            
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>

//                   <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
//                     <button 
//                       onClick={() => setEditingRequest(null)} 
//                       style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
//                     >
//                       Cancel
//                     </button>
// {editingRequest.status === "pending" && (
//   <>
//     <button
//       onClick={rejectEntireRequest}
//       style={{
//         background: "#dc2626",
//         border: "none",
//         color: "#fff",
//         padding: "12px 24px",
//         borderRadius: "12px",
//         fontWeight: "700",
//         cursor: "pointer"
//       }}
//     >
//       Reject Entire Request
//     </button>

//     <button
//       onClick={confirmRequest}
//       style={{
//         background: "#6366f1",
//         border: "none",
//         color: "#fff",
//         padding: "12px 24px",
//         borderRadius: "12px",
//         fontWeight: "700",
//         fontSize: "13px",
//         cursor: "pointer",
//         display: "flex",
//         alignItems: "center",
//         gap: "8px"
//       }}
//     >
//       Confirm Request
//     </button>
//   </>
// )}
//                     {/* {!["confirmed", "received", "partially_received"].includes(editingRequest.status) && (
//   <button onClick={confirmRequest}
//                         style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
//                       >
//                         Confirm Request
//                       </button>
//                     )} */}
//                   </div>
//                 </>
//               ) : (
//                 <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
//                   Select a request from the sidebar to review and convert
//                 </div>
//               )}
//             </div>
//           </>
//         )}

//         {/* VIEW: CREATE NEW (MANUAL) */}
//         {view === "create" && (
//           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
//             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//               <div>
//                 <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Create Requisition</h2>
//                 <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
//                     <span onClick={() => setTab("stock-items")} style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: tab === 'stock-items' ? '#6366f1' : '#64748b' }}>Stock Items</span>
//                 </div>
//               </div>
//               <div style={{ textAlign: 'right' }}>
//                 <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>ESTIMATED TOTAL</div>
//                 <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{Object.values(selectedItems).reduce((sum, i) => i.checked ? sum + (Number(i.qty || 0) * Number(i.price || 0)) : sum, 0).toLocaleString()}</div>
//               </div>
//             </div>

//             <div style={{ flex: 1, overflowY: 'auto' }}>
//               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//                 <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
//                   <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
//                     <th style={{ padding: '20px 32px', width: '50px' }}>
//                         <input type="checkbox" onChange={(e) => {
//                            const isChecked = e.target.checked;
//                            const newSelection = { ...selectedItems };
//                            filteredStock.forEach(item => {
//                              newSelection[item._id] = { ...(newSelection[item._id] || { qty: 0, price: 0 }), checked: isChecked };
//                            });
//                            setSelectedItems(newSelection);
//                         }} style={{ width: '18px', height: '18px' }} />
//                     </th>
//                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>NAME</th>
//                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>STOCK GROUP</th>
//                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '140px' }}>QTY</th>
//                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '100px' }}>PRICE</th>
//                     <th style={{ padding: '20px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>ITEM TOTAL</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {filteredStock.map((row) => {
//                     const state = selectedItems[row._id] || { checked: false, qty: 0, price: 0 };
//                     const itemTotal = Number(state.qty || 0) * Number(state.price || 0);
//                     return (
//                       <tr key={row._id} style={{ borderBottom: '1px solid #f8fafc', background: state.checked ? '#fcfdff' : 'transparent' }}>
//                         <td style={{ padding: '16px 32px' }}>
//                           <input type="checkbox" checked={state.checked} onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, checked: e.target.checked } }))} style={{ width: '18px', height: '18px' }} />
//                         </td>
//                         <td style={{ padding: '16px 0' }}>
//                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
//                             <span style={{ fontWeight: '700', color: '#1e293b' }}>{row.name}</span>
//                           </div>
//                         </td>
//                         <td style={{ padding: '16px 0' }}>
//                           <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
//                             {row.stockGroupId?.name || 'Unassigned'}
//                           </span>
//                         </td>
//                         <td style={{ padding: '16px 0' }}>
//                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//                             <input type="number"
// step="0.001" disabled={!state.checked} value={state.qty} placeholder="0" onChange={(e) => {
//   const value = e.target.value;

//   if (!/^\d*\.?\d{0,3}$/.test(value) && value !== "") {
//     return;
//   }

//   setSelectedItems(prev => ({
//     ...prev,
//     [row._id]: {
//       ...state,
//       qty: value
//     }
//   }));
// }} style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
//                             <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{row.unitId?.symbol}</span>
//                           </div>
//                         </td>
//                         <td style={{ padding: '16px 0' }}>
//                             <input type="number" disabled={!state.checked} value={state.price} placeholder="₹" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, price: e.target.value } }))} style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
//                         </td>
//                         <td style={{ padding: '16px 32px', textAlign: 'right', fontWeight: '800', color: state.checked ? '#6366f1' : '#94a3b8' }}>
//                           ₹{itemTotal.toLocaleString()}
//                         </td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             </div>
//             <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
//               <button onClick={submitIndent} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
//                 Submit Requisition
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };














// 03-08-2026









import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "../api.js";
import { useToast } from "../toast.jsx";
import * as XLSX from "xlsx-js-style";
import { 
  Search, FileSpreadsheet, CheckCircle2, Inbox, 
  ClipboardList, PlusCircle, RefreshCw, X, Save 
} from "lucide-react";

const FIXED_GODOWN_ORDER = [
  "MINDS",
  "INDUS BOYS",
  "INDUS GIRLS",
  "MONTE",
  "BAKERY",
  "A-Camp"
];


const sortGodowns = (godownNames) => {
  const uniqueNames = [...new Set(
    godownNames.filter(Boolean)
  )];

  return uniqueNames.sort((a, b) => {
    const indexA = FIXED_GODOWN_ORDER.findIndex(
      name => name.toLowerCase() === a.toLowerCase()
    );

    const indexB = FIXED_GODOWN_ORDER.findIndex(
      name => name.toLowerCase() === b.toLowerCase()
    );

    // Both are fixed godowns
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    // A is fixed, B is newly created
    if (indexA !== -1) return -1;

    // B is fixed, A is newly created
    if (indexB !== -1) return 1;

    // Both are newly created → alphabetical
    return a.localeCompare(b);
  });
};



export const IndentPage = () => {
  const { showToast } = useToast();
  const [fromDate, setFromDate] = useState("");
const [toDate, setToDate] = useState("");
  // View State
  const [view, setView] = useState("history"); 
  const [tab, setTab] = useState("stock-items");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Data State
const [stockItems, setStockItems] = useState([]);
const [indents, setIndents] = useState([]);
const [indentRequests, setIndentRequests] = useState([]);
const [godowns, setGodowns] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [selectedId, setSelectedId] = useState(null);

  // --- Editing State for Requests ---
  const [editingRequest, setEditingRequest] = useState(null);
  const [approvedItems, setApprovedItems] = useState({});
  const [rejectedItems, setRejectedItems] = useState({});
  const [selectAll, setSelectAll] = useState(false);

  // --- Data Loading ---
  const load = useCallback(async () => {
    try {
      const [itemsRes, indentRes, godownsRes] = await Promise.all([
  api.get("/inventory/stock-items"),
  api.get("/procurement/indents"),
  api.get("/inventory/godowns")
]);
      setStockItems(itemsRes.data || []);
      setGodowns(godownsRes.data || []);
      const sorted = (indentRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setIndents(sorted);
      if (sorted.length > 0 && !selectedId) setSelectedId(sorted[0]._id);
    } catch (error) {
      showToast("Failed to load data", "error");
    }
  }, [showToast, selectedId]);

  const fetchIndentRequests = useCallback(async () => {
    try {
      const res = await api.get("/indent-requests");
      setIndentRequests(res.data || []);
    } catch (error) {
      showToast("Failed to fetch requests", "error");
    }
  }, [showToast]);

  useEffect(() => { 
    load(); 
    if (view === "requests") fetchIndentRequests();
  }, [load, fetchIndentRequests, view]);

  // --- Helper Functions ---
  const getUnitSymbol = (item) => {
    if (item.stockItemId?.unitId?.symbol) return item.stockItemId.unitId.symbol;
    if (item.unitId?.symbol) return item.unitId.symbol;
    const id = item.stockItemId?._id || item.stockItemId;
    const found = stockItems.find(s => s._id === id);
    return found?.unitId?.symbol || "";
  };

  const formatQty = (value) => {
  const num = Number(value || 0);
  return Number(num.toFixed(3)).toString();
};
  const getItemName = (item) => {
    if (item.stockItemId?.name) return item.stockItemId.name;
    const id = item.stockItemId?._id || item.stockItemId;
    const found = stockItems.find(s => s._id === id);
    return found ? found.name : "Unknown Product";
  };


  const getGroupName = (item) => {
    if (item.stockItemId?.stockGroupId?.name) return item.stockItemId.stockGroupId.name;
    if (item.stockGroupId?.name) return item.stockGroupId.name;
    const id = item.stockItemId?._id || item.stockItemId;
    const found = stockItems.find(s => s._id === id);
    return found?.stockGroupId?.name || "General";
  };
const handleDownloadAllConsumptionsExcel = () => {
  if (!processedRows.length) {
    return;
  }

  const groupedByDate = {};

  processedRows.forEach(cons => {
    const date = new Date(cons.createdAt)
      .toISOString()
      .split("T")[0];

    if (!groupedByDate[date]) {
      groupedByDate[date] = [];
    }

    groupedByDate[date].push(cons);
  });

  const aoa = [];

  aoa.push(["MONTESSORI CONSUMPTION REPORT"]);
  aoa.push([]);

  Object.keys(groupedByDate)
    .sort((a, b) => new Date(b) - new Date(a))
    .forEach(date => {

      const consumptions = groupedByDate[date];

      const godowns = [
        ...new Set(
          consumptions.map(
            c => c.godownId?.name || "General"
          )
        )
      ];

      const itemMap = {};

      consumptions.forEach(cons => {
        const godown =
          cons.godownId?.name || "General";

        cons.items.forEach(item => {

          const id = String(
  item.stockItemId?._id ||
  item.stockItemId ||
  ""
);

          if (!itemMap[id]) {
            itemMap[id] = {
              name:
                item.stockItemId?.name ||
                "Unknown",
              group: getGroupName(item),
              unit:
                item.stockItemId?.unitId?.symbol ||
                "",
              total: 0,
              godowns: {}
            };
          }

          const qty =
            Number(item.qtyBaseUnit || 0);

          itemMap[id].total += qty;

          if (!itemMap[id].godowns[godown]) {
            itemMap[id].godowns[godown] = 0;
          }

          itemMap[id].godowns[godown] += qty;
        });
      });

      aoa.push([`DATE: ${date}`]);

      const header = [
        "S.No",
        "Stock Item",
        "Stock Group",
        "Unit",
        "Total Consumed"
      ];

      godowns.forEach(g => {
        header.push(g);
      });

      aoa.push(header);

      Object.values(itemMap).forEach(
        (item, index) => {

          const row = [
            index + 1,
            item.name,
            item.group,
            item.unit,
            item.total
          ];

          godowns.forEach(g => {
            row.push(
              item.godowns[g] || 0
            );
          });

          aoa.push(row);
        }
      );

      aoa.push([]);
    });

  const ws =
    XLSX.utils.aoa_to_sheet(aoa);

  const maxCols =
    Math.max(...aoa.map(r => r.length));

  ws["!merges"] = [
    {
      s: { r: 0, c: 0 },
      e: { r: 0, c: maxCols - 1 }
    }
  ];

  // Main title style
  if (ws["A1"]) {
    ws["A1"].s = {
      font: {
        bold: true,
        sz: 16,
        color: { rgb: "FFFFFF" }
      },
      fill: {
        fgColor: {
          rgb: "4F46E5"
        }
      }
    };
  }

  Object.keys(ws).forEach(cell => {

    if (
      ws[cell]?.v &&
      String(ws[cell].v).startsWith("DATE:")
    ) {
      ws[cell].s = {
        font: {
          bold: true,
          color: { rgb: "FFFFFF" }
        },
        fill: {
          fgColor: {
            rgb: "2563EB"
          }
        }
      };
    }

    if (ws[cell]?.v === "S.No") {

      const rowNo =
        cell.match(/\d+/)[0];

      for (
        let i = 0;
        i < maxCols;
        i++
      ) {

        const col =
          XLSX.utils.encode_col(i);

        const ref =
          `${col}${rowNo}`;

        if (ws[ref]) {
          ws[ref].s = {
            font: {
              bold: true,
              color: {
                rgb: "FFFFFF"
              }
            },
            fill: {
              fgColor: {
                rgb: "16A34A"
              }
            }
          };
        }
      }
    }
  });

 

  XLSX.utils.book_append_sheet(
    wb,
    ws,
    "Consumption"
  );

  XLSX.writeFile(
    wb,
    fromDate || toDate
      ? `Consumption_${fromDate || "start"}_to_${toDate || "end"}.xlsx`
      : "Consumption_Report.xlsx"
  );
};

const handleDownloadAllRequestsExcel = () => {
  if (!indentRequests.length) {
    return showToast("No requests available", "info");
  }

  // ============================================================
  // 1. APPLY DATE FILTER
  // ============================================================

  let filtered = [...indentRequests];

  filtered = filtered.filter(req => {
    const date = new Date(req.createdAt)
      .toISOString()
      .split("T")[0];

    if (fromDate && date < fromDate) return false;
    if (toDate && date > toDate) return false;

    return true;
  });

  if (!filtered.length) {
    return showToast("No requests found for selected date range", "info");
  }

  // ============================================================
  // 2. CREATE WORKBOOK
  // ============================================================

  const wb = XLSX.utils.book_new();
  const aoa = [];

  // ============================================================
  // 3. ALL GODOWNS FROM GODOWN MASTER
  // ============================================================

  const allGodownNames = godowns
    .map(g => g.name)
    .filter(Boolean);

  // Also include any godown present in requests
  // in case it is not currently returned by the godown API.
  filtered.forEach(req => {
    const name = req.godownId?.name;

    if (name && !allGodownNames.includes(name)) {
      allGodownNames.push(name);
    }
  });

  // Remove duplicates
const allGodowns = sortGodowns(allGodownNames);
  //   const allGodowns = [...new Set(allGodownNames)];

  // ============================================================
  // 4. ALL PRODUCTS FROM INVENTORY
  // ============================================================

const allProducts = stockItems.filter(
  item => item.itemType !== "daily_use"
);

  // ============================================================
  // 5. TITLE
  // ============================================================

  aoa.push([
    "MONTESSORI RECEIVED STOCK THROUGH INDENT - REPORT"
  ]);

  aoa.push([]);

  if (fromDate || toDate) {
    aoa.push([
      `DATE RANGE: ${fromDate || "START"} TO ${toDate || "END"}`
    ]);

    aoa.push([]);
  }

  // ============================================================
  // 6. CONSOLIDATED
  // ============================================================

  aoa.push(["CONSOLIDATED"]);
  aoa.push([]);

  // ------------------------------------------------------------
  // Build map using ALL INVENTORY PRODUCTS first
  // ------------------------------------------------------------

 const itemMap = {};

// ============================================================
// ADD EVERY INVENTORY PRODUCT
// Even if it was never requested
// ============================================================

allProducts.forEach(product => {

  const productId = String(product._id);

  itemMap[productId] = {
    name: product.name || "Unknown Product",

    group:
      product.stockGroupId?.name ||
      "General",

    unit:
      product.unitId?.symbol ||
      "",

    requestedTotal: 0,
    receivedTotal: 0,

    godowns: {}
  };

  // Create 0 for every godown
  allGodowns.forEach(godown => {

    itemMap[productId].godowns[godown] = {
      requested: 0,
      received: 0
    };

  });

});

  // ------------------------------------------------------------
  // Add actual requested / received quantities
  // ------------------------------------------------------------

  filtered.forEach(req => {

    const godown =
      req.godownId?.name || "General";

    (req.items || []).forEach(item => {

      const id = String(
  item.stockItemId?._id ||
  item.stockItemId ||
  ""
);

      if (!id) return;

      // If product somehow isn't returned by inventory API,
      // create it safely.
     if (!itemMap[id]) {

  itemMap[id] = {

    name: getItemName(item),

    group: getGroupName(item),

    unit: getUnitSymbol(item),

    requestedTotal: 0,

    receivedTotal: 0,

    godowns: {}

  };

  allGodowns.forEach(g => {

    itemMap[id].godowns[g] = {
      requested: 0,
      received: 0
    };

  });

}

      const requestedQty =
        Number(item.qtyBaseUnit || 0);

      const receivedQty =
        Number(item.receivedQty || 0);

      itemMap[id].requestedTotal += requestedQty;
      itemMap[id].receivedTotal += receivedQty;

      if (!itemMap[id].godowns[godown]) {

        itemMap[id].godowns[godown] = {
          requested: 0,
          received: 0
        };

      }

      itemMap[id].godowns[godown].requested +=
        requestedQty;

      itemMap[id].godowns[godown].received +=
        receivedQty;

    });

  });

  // ============================================================
  // 7. CONSOLIDATED HEADER
  // ============================================================

  const consolidatedHeader = [
    "S.No",
    "Stock Item",
    "Stock Group",
    "Unit",
    "Requested Total",
    "Total Received"
  ];

  allGodowns.forEach(godown => {

    consolidatedHeader.push(
      `${godown} - Requested`
    );

    consolidatedHeader.push(
      `${godown} - Received`
    );

  });

  aoa.push(consolidatedHeader);

  // ============================================================
  // 8. CONSOLIDATED ROWS
  // ============================================================

  Object.values(itemMap)
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    )
    .forEach((item, index) => {

      const row = [
        index + 1,
        item.name,
        item.group,
        item.unit,
        item.requestedTotal,
        item.receivedTotal
      ];

      allGodowns.forEach(godown => {

        const data =
          item.godowns[godown] || {
            requested: 0,
            received: 0
          };

        row.push(data.requested || 0);
        row.push(data.received || 0);

      });

      aoa.push(row);

    });

  // ============================================================
  // 9. DATE-WISE SECTION
  // ============================================================

  aoa.push([]);
  aoa.push([]);
  aoa.push(["DATE-WISE"]);
  aoa.push([]);

  // ============================================================
  // 10. GROUP REQUESTS BY DATE
  // ============================================================

  const groupedByDate = {};

  filtered.forEach(req => {

    const date =
      new Date(req.createdAt)
        .toISOString()
        .split("T")[0];

    if (!groupedByDate[date]) {
      groupedByDate[date] = [];
    }

    groupedByDate[date].push(req);

  });

  // ============================================================
  // 11. DATE-WISE REPORT
  // ============================================================

  Object.keys(groupedByDate)
    .sort((a, b) =>
      new Date(b) - new Date(a)
    )
    .forEach(date => {

      const requestsForDate =
        groupedByDate[date];

      // --------------------------------------------------------
      // DATE TITLE
      // --------------------------------------------------------

      aoa.push([
        `DATE: ${date}`
      ]);

      // --------------------------------------------------------
      // DATE ITEM MAP
      // IMPORTANT:
      // Start with ALL inventory products and ALL godowns
      // --------------------------------------------------------

      const dateItemMap = {};

      allProducts.forEach(product => {
const productId = String(product._id);
        dateItemMap[product._id] = {

          name:
            product.name ||
            "Unknown Product",

          group:
            product.stockGroupId?.name ||
            "General",

          unit:
            product.unitId?.symbol ||
            "",

          requestedTotal: 0,

          receivedTotal: 0,

          godowns: {}

        };

        allGodowns.forEach(godown => {

          dateItemMap[product._id].godowns[godown] = {

            requested: 0,

            received: 0

          };

        });

      });

      // --------------------------------------------------------
      // Add actual data for this date
      // --------------------------------------------------------

      requestsForDate.forEach(req => {

        const godown =
          req.godownId?.name || "General";

        (req.items || []).forEach(item => {

          const id = String(
  item.stockItemId?._id ||
  item.stockItemId ||
  ""
);

          if (!id) return;

          if (!dateItemMap[id]) {

            dateItemMap[id] = {

              name: getItemName(item),

              group: getGroupName(item),

              unit: getUnitSymbol(item),

              requestedTotal: 0,

              receivedTotal: 0,

              godowns: {}

            };

            allGodowns.forEach(g => {

              dateItemMap[id].godowns[g] = {

                requested: 0,

                received: 0

              };

            });

          }

          const requestedQty =
            Number(item.qtyBaseUnit || 0);

          const receivedQty =
            Number(item.receivedQty || 0);

          dateItemMap[id].requestedTotal +=
            requestedQty;

          dateItemMap[id].receivedTotal +=
            receivedQty;

          if (!dateItemMap[id].godowns[godown]) {

            dateItemMap[id].godowns[godown] = {

              requested: 0,

              received: 0

            };

          }

          dateItemMap[id].godowns[godown].requested +=
            requestedQty;

          dateItemMap[id].godowns[godown].received +=
            receivedQty;

        });

      });

      // --------------------------------------------------------
      // DATE HEADER
      // --------------------------------------------------------

      const dateHeader = [
        "S.No",
        "Stock Item",
        "Stock Group",
        "Unit",
        "Requested Total",
        "Total Received"
      ];

      allGodowns.forEach(godown => {

        dateHeader.push(
          `${godown} - Requested`
        );

        dateHeader.push(
          `${godown} - Received`
        );

      });

      aoa.push(dateHeader);

      // --------------------------------------------------------
      // DATE ROWS
      // ALL PRODUCTS WILL APPEAR
      // --------------------------------------------------------

      Object.values(dateItemMap)
        .sort((a, b) =>
          a.name.localeCompare(b.name)
        )
        .forEach((item, index) => {

          const row = [
            index + 1,
            item.name,
            item.group,
            item.unit,
            item.requestedTotal,
            item.receivedTotal
          ];

          allGodowns.forEach(godown => {

            const data =
              item.godowns[godown] || {
                requested: 0,
                received: 0
              };

            row.push(data.requested || 0);
            row.push(data.received || 0);

          });

          aoa.push(row);

        });

      aoa.push([]);
      aoa.push([]);

    });

  // ============================================================
  // 12. CREATE WORKSHEET
  // ============================================================

  const ws =
    XLSX.utils.aoa_to_sheet(aoa);

  const maxCols =
    Math.max(
      ...aoa.map(row => row.length)
    );

  // ============================================================
  // 13. MERGE MAIN TITLE
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
  // 14. COLUMN WIDTHS
  // ============================================================

  ws["!cols"] = Array.from(
    { length: maxCols },
    (_, index) => {

      if (index === 0)
        return { wch: 8 };

      if (index === 1)
        return { wch: 28 };

      if (index === 2)
        return { wch: 20 };

      if (index === 3)
        return { wch: 10 };

      if (index === 4)
        return { wch: 18 };

      if (index === 5)
        return { wch: 18 };

      return { wch: 20 };

    }
  );

  // ============================================================
  // 15. TITLE STYLE
  // ============================================================

  if (ws["A1"]) {

    ws["A1"].s = {

      font: {
        bold: true,
        sz: 16,
        color: { rgb: "FFFFFF" }
      },

      fill: {
        fgColor: {
          rgb: "4F46E5"
        }
      },

      alignment: {
        horizontal: "center",
        vertical: "center"
      }

    };

  }

  // ============================================================
  // 16. SECTION / DATE STYLES
  // ============================================================

  Object.keys(ws).forEach(cell => {

    if (!ws[cell]?.v) return;

    const value =
      String(ws[cell].v);

    // CONSOLIDATED
    if (value === "CONSOLIDATED") {

      ws[cell].s = {

        font: {
          bold: true,
          sz: 13,
          color: { rgb: "FFFFFF" }
        },

        fill: {
          fgColor: {
            rgb: "2563EB"
          }
        }

      };

    }

    // DATE-WISE
    if (value === "DATE-WISE") {

      ws[cell].s = {

        font: {
          bold: true,
          sz: 13,
          color: { rgb: "FFFFFF" }
        },

        fill: {
          fgColor: {
            rgb: "7C3AED"
          }
        }

      };

    }

    // DATE
    if (value.startsWith("DATE:")) {

      ws[cell].s = {

        font: {
          bold: true,
          color: { rgb: "FFFFFF" }
        },

        fill: {
          fgColor: {
            rgb: "2563EB"
          }
        }

      };

    }

  });

  // ============================================================
  // 17. STYLE EVERY TABLE HEADER
  // ============================================================

  Object.keys(ws).forEach(cell => {

    if (ws[cell]?.v !== "S.No") return;

    const rowNo =
      Number(
        cell.match(/\d+/)[0]
      );

    for (
      let i = 0;
      i < maxCols;
      i++
    ) {

      const col =
        XLSX.utils.encode_col(i);

      const ref =
        `${col}${rowNo}`;

      if (ws[ref]) {

        ws[ref].s = {

          font: {
            bold: true,
            color: {
              rgb: "FFFFFF"
            }
          },

          fill: {
            fgColor: {
              rgb: "16A34A"
            }
          },

          alignment: {
            horizontal: "center",
            vertical: "center"
          }

        };

      }

    }

  });

  // ============================================================
  // 18. APPEND SHEET
  // ============================================================

  XLSX.utils.book_append_sheet(
    wb,
    ws,
    "Indent Report"
  );

  // ============================================================
  // 19. DOWNLOAD
  // ============================================================

  XLSX.writeFile(
    wb,
    fromDate || toDate
      ? `Indent_Consolidated_Datewise_${fromDate || "start"}_to_${toDate || "end"}.xlsx`
      : "Indent_Consolidated_Datewise_Report.xlsx"
  );

  showToast(
    "All products, all godowns, consolidated and date-wise report exported successfully",
    "success"
  );
};




const handleDownloadExcel = () => {
  if (!activeIndent) return;

  const aoa = [];

  aoa.push(["INDENT REPORT"]);
  aoa.push([
    `DATE: ${new Date(activeIndent.createdAt).toLocaleDateString()}`
  ]);
  aoa.push([]);

  aoa.push([
    "Product",
    "Group",
    "Quantity",
    "Unit",
    "Price",
    "Subtotal"
  ]);

  activeIndent.items.forEach(item => {
    aoa.push([
      getItemName(item),
      getGroupName(item),
      item.orderedQty,
      getUnitSymbol(item),
      item.unitPrice,
      item.orderedQty * item.unitPrice
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
// Main title
if (ws["A1"]) {
  ws["A1"].s = {
    font: {
      bold: true,
      sz: 16,
      color: { rgb: "FFFFFF" }
    },
    fill: {
      fgColor: { rgb: "4F46E5" }
    }
  };
}
Object.keys(ws).forEach(cell => {
  if (
    cell[0] === "A" &&
    ws[cell]?.v &&
    String(ws[cell].v).startsWith("DATE:")
  ) {
    ws[cell].s = {
      font: {
        bold: true,
        color: { rgb: "FFFFFF" }
      },
      fill: {
        fgColor: { rgb: "2563EB" }
      }
    };
  }
});
Object.keys(ws).forEach(cell => {
  if (
    ws[cell]?.v === "S.No"
  ) {
    const row = cell.match(/\d+/)[0];

    ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O"]
      .forEach(col => {
        const headerCell = `${col}${row}`;

        if (ws[headerCell]) {
          ws[headerCell].s = {
            font: {
              bold: true,
              color: { rgb: "FFFFFF" }
            },
            fill: {
              fgColor: { rgb: "16A34A" }
            }
          };
        }
      });
  }
});  
  ws["!cols"] = [
    { wch: 25 },
    { wch: 20 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 15 }
  ];

   const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    ws,
    "Indent Report"
  );

  const fileName =
    `Indent_${activeIndent.indentNo || activeIndent._id}.xlsx`;

  XLSX.writeFile(wb, fileName);

  showToast("Excel exported successfully", "success");
};

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      if (newStatus === 'purchased') {
        await api.post(`/procurement/indents/${id}/mark-purchased`);
      } else {
        await api.patch(`/indents/${id}`, { status: newStatus });
      }
      showToast(`Indent marked as ${newStatus}`, "success");
      load();
    } catch (error) {
      showToast("Failed to update status", "error");
    }
  };
 const rejectEntireRequest = async () => {
  try {
    await api.patch(
      `/indent-requests/${editingRequest._id}/reject`
    );

    showToast(
      "Request rejected successfully",
      "success"
    );

    setEditingRequest(null);

    fetchIndentRequests();

  } catch (err) {
    showToast(
      "Reject failed",
      "error"
    );
  }
};
  const confirmRequest = async () => {
   
  try {
    const selectedItems = editingRequest.items
      .filter(it => {
        const id = it.stockItemId?._id || it.stockItemId;
        return approvedItems[id];
      })
      .map(it => ({
        stockItemId: it.stockItemId?._id || it.stockItemId,
        qtyBaseUnit: it.qtyBaseUnit
      }));

    if (selectedItems.length === 0) {
      return showToast("Select at least one item", "info");
    }

    await api.patch(`/indent-requests/${editingRequest._id}/confirm`, {
      items: selectedItems
    });

    showToast("Selected items approved!", "success");

    setEditingRequest(null);
    setApprovedItems({});
    fetchIndentRequests();
  } catch (err) {
    showToast("Confirmation failed", "error");
  }
};

  const submitIndent = async () => {
    const itemsToSubmit = Object.keys(selectedItems)
      .filter(id => selectedItems[id].checked && Number(selectedItems[id].qty) > 0)
      .map(id => ({
        stockItemId: id,
        orderedQty: Number(selectedItems[id].qty),
        unitPrice: Number(selectedItems[id].price || 0),
        amount: Number(selectedItems[id].qty) * Number(selectedItems[id].price || 0)
      }));

    if (itemsToSubmit.length === 0) return showToast("Select items with quantity", "info");

    try {
      await api.post("/procurement/indents", { items: itemsToSubmit });
      showToast("Indent submitted", "success");
      setSelectedItems({});
      setView("history");
      load();
    } catch (error) {
      showToast("Submission failed", "error");
    }
  };

  // --- Memoized Filters ---
  const filteredIndents = useMemo(() => {
    return indents.filter(i =>
      (i.indentNo?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (i._id.includes(searchTerm))
    );
  }, [indents, searchTerm]);

  const filteredStock = useMemo(() => {
    return stockItems.filter(s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.stockGroupId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [stockItems, searchTerm]);
const filteredRequests = useMemo(() => {
  return indentRequests
    .filter((r) => {
      const reqDate = new Date(r.createdAt).toISOString().split("T")[0];

      if (fromDate && reqDate < fromDate) return false;
      if (toDate && reqDate > toDate) return false;

      return true;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}, [indentRequests, fromDate, toDate]);
  const activeIndent = useMemo(() =>
    indents.find(i => i._id === selectedId) || indents[0],
    [selectedId, indents]);

  const isConfirmed = editingRequest?.status === "confirmed";

  return (
    <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Header Area */}
      <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
            <span style={{ color: '#6366f1' }}>Indents</span>
          </h1>
          
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
            {[
              { id: 'history', label: 'Logs', icon: <ClipboardList size={14}/> },
              { id: 'requests', label: 'Requests', icon: <Inbox size={14}/> },
              { id: 'create', label: 'Create New', icon: <PlusCircle size={14}/> }
            ].map((btn) => (
              <button 
                key={btn.id}
                onClick={() => { setView(btn.id); setSearchTerm(""); setEditingRequest(null); }}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                  background: view === btn.id ? '#fff' : 'transparent', 
                  color: view === btn.id ? '#6366f1' : '#64748b', 
                  boxShadow: view === btn.id ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' 
                }}>
                {btn.icon} {btn.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
        {/* VIEW: HISTORY/LOGS */}
        {view === "history" && (
          <>
            <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>RESULTS ({filteredIndents.length})</div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredIndents.map(r => (
                  <div key={r._id} onClick={() => setSelectedId(r._id)}
                    style={{ padding: '16px', borderRadius: '16px', cursor: 'pointer', background: selectedId === r._id ? '#fff' : 'transparent', border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent', boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b' }}>{r.indentNo || `REF-${r._id.slice(-4)}`}</div>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div
  style={{
    fontSize: "12px",
    marginTop: "4px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  }}
>
  <span style={{ color: "#64748b" }}>
    ₹{r.totalAmount?.toLocaleString()}
  </span>

  <span
    style={{
      background:
        r.status === "pending"
          ? "#fee2e2"
          : r.status === "purchased"
          ? "#f3e8ff"
          : r.status === "stock_received"
          ? "#dcfce7"
          : "#f1f5f9",

      color:
        r.status === "pending"
          ? "#dc2626"
          : r.status === "purchased"
          ? "#9333ea"
          : r.status === "stock_received"
          ? "#16a34a"
          : "#64748b",

      padding: "2px 8px",
      borderRadius: "6px",
      fontSize: "10px",
      fontWeight: "700"
    }}
  >
    {r.status?.replaceAll("_", " ").toUpperCase()}
  </span>
</div>
                    {/* <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>₹{r.totalAmount?.toLocaleString()} • {r.status.toUpperCase()}</div> */}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              {activeIndent ? (
                <>
                  <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>INDENT STATUS</div>
                      <div
  style={{
    padding: "4px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "800",
    display: "inline-block",

    background:
      activeIndent.status === "pending"
        ? "#fee2e2"
        : activeIndent.status === "purchased"
        ? "#f3e8ff"
        : activeIndent.status === "stock_received"
        ? "#dcfce7"
        : "#f1f5f9",

    color:
      activeIndent.status === "pending"
        ? "#dc2626"
        : activeIndent.status === "purchased"
        ? "#9333ea"
        : activeIndent.status === "stock_received"
        ? "#16a34a"
        : "#64748b"
  }}
>
  {activeIndent.status?.replaceAll("_", " ").toUpperCase()}
</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
                      <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activeIndent.totalAmount?.toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ textAlign: 'left' }}>
                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th>
                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeIndent.items.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
                              <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(item)}</div>
                              {item.status === "rejected" && (
  <div
    style={{
      display: "inline-block",
      marginTop: "4px",
      background: "#fee2e2",
      color: "#dc2626",
      padding: "2px 8px",
      borderRadius: "6px",
      fontSize: "10px",
      fontWeight: "700"
    }}
  >
    REJECTED
  </div>
)}
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
                            </td>
                            <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
                              <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
                                {getGroupName(item)}
                              </span>
                            </td>
                            <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700', borderBottom: '1px solid #f8fafc' }}>
                               {formatQty(item.orderedQty)} <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: '400'}}>{getUnitSymbol(item)}</span>
                            </td>
                            <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1', borderBottom: '1px solid #f8fafc' }}>₹{(item.orderedQty * item.unitPrice).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button onClick={handleDownloadExcel} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileSpreadsheet size={16} /> Export Excel
                    </button>
                    {activeIndent.status.toLowerCase() === 'pending' && (
                      <button onClick={() => handleStatusUpdate(activeIndent._id, 'purchased')} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={16} /> Mark Purchased
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Select an indent to view details</div>
              )}
            </div>
          </>
        )}

        {/* VIEW: INDENT REQUESTS (INCOMING) */}
        {view === "requests" && (
          <>
            <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>
                ALL REQUESTS ({filteredRequests.length})
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
               {filteredRequests.map(r => (
                  <div 
                    key={r._id} 
                    onClick={() => {
  setEditingRequest(JSON.parse(JSON.stringify(r)));
  setApprovedItems({});
  setSelectAll(false);
}}
                    style={{ 
                      padding: '16px', 
                      borderRadius: '16px', 
                      cursor: 'pointer', 
                      background: editingRequest?._id === r._id ? '#fff' : 'transparent', 
                      border: editingRequest?._id === r._id ? '1px solid #6366f1' : '1px solid transparent', 
                      boxShadow: editingRequest?._id === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none', 
                      transition: 'all 0.2s' 
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: '700', color: editingRequest?._id === r._id ? '#6366f1' : '#1e293b' }}>
                        {r.userId?.name || 'Unknown User'}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
                        {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{r.godownId?.name || "Main Godown"} • {r.items?.length} Items</span>
                      <span
  style={{
    background:
  r.status === "pending"
    ? "#fee2e2"
    : r.status === "confirmed"
    ? "#dbeafe"
    : r.status === "received"
    ? "#dcfce7"
    : r.status === "partially_received"
    ? "#f3e8ff"
    : r.status === "rejected"
    ? "#fee2e2"
    : "#f1f5f9",

    color:
      r.status === "pending"
        ? "#dc2626"
        : r.status === "confirmed"
        ? "#2563eb"
        : r.status === "received"
        ? "#16a34a"
        : r.status === "partially_received"
        ? "#9333ea"          // purple text
        : "#64748b",

    padding: "2px 8px",
    borderRadius: "6px",
    fontSize: "10px",
    fontWeight: "700"
  }}
>
  {r.status?.replaceAll("_", " ").toUpperCase()}
</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {editingRequest ? (
                  <>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>SOURCE GODOWN</div>
                      <div style={{ fontWeight: '800', fontSize: '18px', color: '#0f172a' }}>
                        {editingRequest.godownId?.name || "General"}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <button
                        onClick={handleDownloadAllRequestsExcel}
                        style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
                      >
                        <FileSpreadsheet size={16} /> Export All Requests
                      </button>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>ESTIMATED VALUATION</div>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>
                          ₹{editingRequest.items.reduce((sum, i) => sum + (Number(i.qtyBaseUnit || 0) * Number(i.price || 0)), 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
  
  <input
    type="date"
    value={fromDate}
    onChange={(e) => setFromDate(e.target.value)}
    style={{
      padding: "8px 12px",
      borderRadius: "10px",
      border: "1px solid #e2e8f0",
      fontSize: "13px"
    }}
  />

  <span style={{ fontSize: "12px", color: "#64748b" }}>to</span>

  <input
    type="date"
    value={toDate}
    onChange={(e) => setToDate(e.target.value)}
    style={{
      padding: "8px 12px",
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
        padding: "8px 12px",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        cursor: "pointer"
      }}
    >
      Clear
    </button>
  )}
</div>

</div>

                     <button
                        onClick={handleDownloadAllRequestsExcel}
                        style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
                      >
                        <FileSpreadsheet size={16} /> Export All Requests
                      </button>
                  </div>
                )}
              </div>

              {editingRequest ? (
                <>
                  <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ textAlign: 'left' }}>
                          <th style={{ width: "40px" }}>
  <input
    type="checkbox"
    checked={selectAll}
    disabled={editingRequest?.status !== "pending"}
    onChange={(e) => {
      const checked = e.target.checked;
      setSelectAll(checked);

      const newApproved = {};

      if (checked) {
  editingRequest.items.forEach(it => {
    const id = it.stockItemId?._id || it.stockItemId;

    // skip rejected items
    if (!rejectedItems[id]) {
      newApproved[id] = true;
    }
  });
}

      setApprovedItems(newApproved);
    }}
  />
</th>
<th>ITEM</th>
                          {/* <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th> */}
                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
                          {/* <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', width: '140px' }}>QTY</th> */}
                         <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
  REQUESTED
</th>

<th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
  RECEIVED
</th>
<th
  style={{
    padding: '24px 0 12px',
    fontSize: '11px',
    fontWeight: '900',
    color: '#94a3b8',
    borderBottom: '1px solid #e2e8f0',
    textAlign: 'right'
  }}
>
  ACTION
</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editingRequest.items.map((it, idx) => (
                          <tr
  key={idx}
  style={{
    background:
      it.status === "rejected"
        ? "#fef2f2"
        : "transparent"
  }}
>
  <td>
    <input
  type="checkbox"
  disabled={editingRequest.status !== "pending"}
  checked={!!approvedItems[it.stockItemId?._id || it.stockItemId]}
      
  onChange={(e) => {
  const id = it.stockItemId?._id || it.stockItemId;
  const checked = e.target.checked;

  setApprovedItems(prev => ({
    ...prev,
    [id]: checked
  }));

  if (checked) {
    // remove rejected badge when selected again
    setRejectedItems(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  } else {
    // show rejected badge when unchecked
    setRejectedItems(prev => ({
      ...prev,
      [id]: true
    }));
  }

  setSelectAll(false);
}}
    />
  </td>
                            <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
                              <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(it)}</div>
                            </td>
                            <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
                              <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
                                {getGroupName(it)}
                              </span>
                            </td>
                           {/* REQUESTED COLUMN */}
<td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700' }}>
  {formatQty(it.qtyBaseUnit)}{" "}
  <span style={{ fontSize: '12px', color: '#64748b' }}>
    {getUnitSymbol(it)}
  </span>
</td>

{/* RECEIVED COLUMN */}
<td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc', fontWeight: '700', color: '#16a34a' }}>
  {formatQty(it.receivedQty)}{" "}
  <span style={{ fontSize: '12px', color: '#64748b' }}>
    {getUnitSymbol(it)}
  </span>

  {(it.receivedQty || 0) >= (it.qtyBaseUnit || 0) && (
    <div style={{ fontSize: "10px", color: "#16a34a" }}>
      ✔ Fully Received
    </div>
  )}
</td>


<td
  style={{
    padding: '20px 0',
    borderBottom: '1px solid #f8fafc',
    textAlign: 'right'
  }}
>
 
  {it.status === "rejected" ||
rejectedItems[it.stockItemId?._id || it.stockItemId] ? (
  <span
    style={{
      background: "#fee2e2",
      color: "#dc2626",
      padding: "6px 12px",
      borderRadius: "8px",
      fontSize: "12px",
      fontWeight: "700"
    }}
  >
    REJECTED
  </span>
) : (
  editingRequest.status === "pending" && (
    <button
      onClick={() => {
        const id = it.stockItemId?._id || it.stockItemId;

        setRejectedItems(prev => ({
          ...prev,
          [id]: true
        }));

        setApprovedItems(prev => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });

        setSelectAll(false);
      }}
      style={{
        background: "#fff",
        color: "#dc2626",
        border: "1px solid #fecaca",
        padding: "6px 12px",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "700",
        fontSize: "12px"
      }}
    >
      Reject
    </button>
  )
)}
</td>                            
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button 
                      onClick={() => setEditingRequest(null)} 
                      style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
{editingRequest.status === "pending" && (
  <>
    <button
      onClick={rejectEntireRequest}
      style={{
        background: "#dc2626",
        border: "none",
        color: "#fff",
        padding: "12px 24px",
        borderRadius: "12px",
        fontWeight: "700",
        cursor: "pointer"
      }}
    >
      Reject Entire Request
    </button>

    <button
      onClick={confirmRequest}
      style={{
        background: "#6366f1",
        border: "none",
        color: "#fff",
        padding: "12px 24px",
        borderRadius: "12px",
        fontWeight: "700",
        fontSize: "13px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px"
      }}
    >
      Confirm Request
    </button>
  </>
)}
                    {/* {!["confirmed", "received", "partially_received"].includes(editingRequest.status) && (
  <button onClick={confirmRequest}
                        style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        Confirm Request
                      </button>
                    )} */}
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  Select a request from the sidebar to review and convert
                </div>
              )}
            </div>
          </>
        )}

        {/* VIEW: CREATE NEW (MANUAL) */}
        {view === "create" && (
          <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Create Requisition</h2>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <span onClick={() => setTab("stock-items")} style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: tab === 'stock-items' ? '#6366f1' : '#64748b' }}>Stock Items</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>ESTIMATED TOTAL</div>
                <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{Object.values(selectedItems).reduce((sum, i) => i.checked ? sum + (Number(i.qty || 0) * Number(i.price || 0)) : sum, 0).toLocaleString()}</div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
                    <th style={{ padding: '20px 32px', width: '50px' }}>
                        <input type="checkbox" onChange={(e) => {
                           const isChecked = e.target.checked;
                           const newSelection = { ...selectedItems };
                           filteredStock.forEach(item => {
                             newSelection[item._id] = { ...(newSelection[item._id] || { qty: 0, price: 0 }), checked: isChecked };
                           });
                           setSelectedItems(newSelection);
                        }} style={{ width: '18px', height: '18px' }} />
                    </th>
                    <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>NAME</th>
                    <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>STOCK GROUP</th>
                    <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '140px' }}>QTY</th>
                    <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '100px' }}>PRICE</th>
                    <th style={{ padding: '20px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>ITEM TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStock.map((row) => {
                    const state = selectedItems[row._id] || { checked: false, qty: 0, price: 0 };
                    const itemTotal = Number(state.qty || 0) * Number(state.price || 0);
                    return (
                      <tr key={row._id} style={{ borderBottom: '1px solid #f8fafc', background: state.checked ? '#fcfdff' : 'transparent' }}>
                        <td style={{ padding: '16px 32px' }}>
                          <input type="checkbox" checked={state.checked} onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, checked: e.target.checked } }))} style={{ width: '18px', height: '18px' }} />
                        </td>
                        <td style={{ padding: '16px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontWeight: '700', color: '#1e293b' }}>{row.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px 0' }}>
                          <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                            {row.stockGroupId?.name || 'Unassigned'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="number"
step="0.001" disabled={!state.checked} value={state.qty} placeholder="0" onChange={(e) => {
  const value = e.target.value;

  if (!/^\d*\.?\d{0,3}$/.test(value) && value !== "") {
    return;
  }

  setSelectedItems(prev => ({
    ...prev,
    [row._id]: {
      ...state,
      qty: value
    }
  }));
}} style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{row.unitId?.symbol}</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px 0' }}>
                            <input type="number" disabled={!state.checked} value={state.price} placeholder="₹" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, price: e.target.value } }))} style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                        </td>
                        <td style={{ padding: '16px 32px', textAlign: 'right', fontWeight: '800', color: state.checked ? '#6366f1' : '#94a3b8' }}>
                          ₹{itemTotal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={submitIndent} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
                Submit Requisition
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};














