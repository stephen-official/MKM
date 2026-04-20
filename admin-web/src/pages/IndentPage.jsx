
// // // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // // import { api } from "../api.js";
// // // // import { useToast } from "../toast.jsx";
// // // // import * as XLSX from "xlsx";
// // // // import { Search, FileSpreadsheet, CheckCircle2 } from "lucide-react";

// // // // export const IndentPage = () => {
// // // //   const { showToast } = useToast();
// // // //   const [view, setView] = useState("history");
// // // //   const [searchTerm, setSearchTerm] = useState("");
// // // //   const [stockItems, setStockItems] = useState([]);
// // // //   const [indents, setIndents] = useState([]);
// // // //   const [selectedItems, setSelectedItems] = useState({});
// // // //   const [selectedId, setSelectedId] = useState(null);

// // // //   const load = useCallback(async () => {
// // // //     try {
// // // //       const [itemsRes, indentRes] = await Promise.all([
// // // //         // Ensure backend populates unitId for stock items
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

// // // //   useEffect(() => { load(); }, [load]);

// // // //   // Helper to find unit symbol safely
// // // //   const getUnitSymbol = (item) => {
// // // //     // 1. Try populated unitId from the item itself (if it comes from Indent)
// // // //     if (item.stockItemId?.unitId?.symbol) return item.stockItemId.unitId.symbol;
    
// // // //     // 2. Fallback: Search in the master stockItems list
// // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // //     const found = stockItems.find(s => s._id === id);
// // // //     return found?.unitId?.symbol || "";
// // // //   };

// // // //   const getItemName = (item) => {
// // // //     if (item.stockItemId?.name) return item.stockItemId.name;
// // // //     const id = item.stockItemId?._id || item.stockItemId;
// // // //     const found = stockItems.find(s => s._id === id);
// // // //     return found ? found.name : "Unknown Product";
// // // //   };

// // // //   const handleDownloadExcel = () => {
// // // //     if (!activeIndent) return;
// // // //     const data = activeIndent.items.map(item => ({
// // // //       "Product": getItemName(item),
// // // //       "Quantity": item.orderedQty,
// // // //       "Unit": getUnitSymbol(item), // Added Unit to Excel
// // // //       "Price": item.unitPrice,
// // // //       "Subtotal": item.orderedQty * item.unitPrice
// // // //     }));
// // // //     const ws = XLSX.utils.json_to_sheet(data);
// // // //     const wb = XLSX.utils.book_new();
// // // //     XLSX.utils.book_append_sheet(wb, ws, "Indent");
// // // //     XLSX.writeFile(wb, `Indent_${activeIndent.indentNo || 'Export'}.xlsx`);
// // // //     showToast("Excel exported successfully", "success");
// // // //   };

// // // //   // ... (Keep existing filteredIndents, filteredStock, activeIndent, handleSelectAll, handleStatusUpdate, submitIndent logic)
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

// // // //   const activeIndent = useMemo(() =>
// // // //     indents.find(i => i._id === selectedId) || indents[0],
// // // //     [selectedId, indents]);

// // // //   const handleSelectAll = (e) => {
// // // //     const isChecked = e.target.checked;
// // // //     const newSelection = { ...selectedItems };
// // // //     filteredStock.forEach(item => {
// // // //       newSelection[item._id] = {
// // // //         ...(newSelection[item._id] || { qty: 0, price: 0 }),
// // // //         checked: isChecked
// // // //       };
// // // //     });
// // // //     setSelectedItems(newSelection);
// // // //   };

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

// // // //   return (
// // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>

// // // //       {/* Header Area */}
// // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
// // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // //             indents <span style={{ color: '#6366f1' }}>Indents</span>
// // // //           </h1>
// // // //           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
// // // //             <button
// // // //               onClick={() => { setView("history"); setSearchTerm(""); }}
// // // //               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'history' ? '#fff' : 'transparent', color: view === 'history' ? '#6366f1' : '#64748b', boxShadow: view === 'history' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
// // // //               Logs
// // // //             </button>
// // // //             <button
// // // //               onClick={() => { setView("create"); setSearchTerm(""); }}
// // // //               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'create' ? '#fff' : 'transparent', color: view === 'create' ? '#6366f1' : '#64748b', boxShadow: view === 'create' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
// // // //               Create New
// // // //             </button>
// // // //           </div>
// // // //         </div>

// // // //         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // //           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // //           <input
// // // //             type="text"
// // // //             placeholder={view === "history" ? "Search indents..." : "Search catalog..."}
// // // //             value={searchTerm}
// // // //             onChange={(e) => setSearchTerm(e.target.value)}
// // // //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
// // // //           />
// // // //         </div>
// // // //       </div>

// // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>

// // // //         {view === "history" ? (
// // // //           <>
// // // //             {/* Sidebar list */}
// // // //             <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // //               <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>RESULTS ({filteredIndents.length})</div>
// // // //               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // //                 {filteredIndents.map(r => (
// // // //                   <div
// // // //                     key={r._id}
// // // //                     onClick={() => setSelectedId(r._id)}
// // // //                     style={{
// // // //                       padding: '16px', borderRadius: '16px', cursor: 'pointer',
// // // //                       background: selectedId === r._id ? '#fff' : 'transparent',
// // // //                       border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent',
// // // //                       boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// // // //                       transition: 'all 0.2s'
// // // //                     }}
// // // //                   >
// // // //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // //                       <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b' }}>{r.indentNo || `REF-${r._id.slice(-4)}`}</div>
// // // //                       <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
// // // //                     </div>
// // // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>₹{r.totalAmount?.toLocaleString()} • {r.status.toUpperCase()}</div>
// // // //                   </div>
// // // //                 ))}
// // // //               </div>
// // // //             </div>

// // // //             {/* Indent Detail View */}
// // // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // //               {activeIndent ? (
// // // //                 <>
// // // //                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
// // // //                     <div>
// // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>INDENT STATUS</div>
// // // //                       <div style={{ padding: '4px 12px', background: activeIndent.status === 'pending' ? '#fef3c7' : '#dcfce7', color: activeIndent.status === 'pending' ? '#d97706' : '#166534', borderRadius: '6px', fontSize: '12px', fontWeight: '800', display: 'inline-block' }}>
// // // //                         {activeIndent.status.toUpperCase()}
// // // //                       </div>
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
// // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
// // // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// // // //                         </tr>
// // // //                       </thead>
// // // //                       <tbody>
// // // //                         {activeIndent.items.map((item, idx) => (
// // // //                           <tr key={idx}>
// // // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(item)}</div>
// // // //                               <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
// // // //                             </td>
// // // //                             <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700' }}>
// // // //                                {/* Displaying Unit Symbol in Logs */}
// // // //                                {item.orderedQty} <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: '400'}}>{getUnitSymbol(item)}</span>
// // // //                             </td>
// // // //                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>₹{(item.orderedQty * item.unitPrice).toLocaleString()}</td>
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
// // // //         ) : (
// // // //           /* Create New View */
// // // //           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
// // // //             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // //               <div>
// // // //                 <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Create Requisition</h2>
// // // //                 <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Showing {filteredStock.length} items</p>
// // // //               </div>
// // // //               <div style={{ textAlign: 'right' }}>
// // // //                 <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>ESTIMATED TOTAL</div>
// // // //                 <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{Object.values(selectedItems).reduce((sum, i) => i.checked ? sum + (Number(i.qty || 0) * Number(i.price || 0)) : sum, 0).toLocaleString()}</div>
// // // //               </div>
// // // //             </div>
// // // //             <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px' }}>
// // // //               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // //                 <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
// // // //                   <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // //                     <th style={{ padding: '20px 0', width: '50px' }}><input type="checkbox" onChange={handleSelectAll} style={{ width: '18px', height: '18px' }} /></th>
// // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8' }}>ITEM SPECIFICATION</th>
// // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '140px' }}>QTY</th>
// // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '120px' }}>PRICE</th>
// // // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '120px', textAlign: 'right' }}>ITEM TOTAL</th>
// // // //                   </tr>
// // // //                 </thead>
// // // //                 <tbody>
// // // //                   {filteredStock.map(item => {
// // // //                     const state = selectedItems[item._id] || { checked: false, qty: 0, price: 0 };
// // // //                     const itemTotal = Number(state.qty || 0) * Number(state.price || 0);
// // // //                     return (
// // // //                       <tr key={item._id} style={{ borderBottom: '1px solid #f8fafc', background: state.checked ? '#fcfdff' : 'transparent' }}>
// // // //                         <td style={{ padding: '16px 0' }}>
// // // //                           <input type="checkbox" checked={state.checked} onChange={(e) => setSelectedItems(prev => ({ ...prev, [item._id]: { ...state, checked: e.target.checked } }))} style={{ width: '18px', height: '18px' }} />
// // // //                         </td>
// // // //                         <td style={{ padding: '16px 0' }}>
// // // //                           <div style={{ fontWeight: '700', fontSize: '14px' }}>{item.name}</div>
// // // //                           <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.stockGroupId?.name}</div>
// // // //                         </td>
// // // //                         <td>
// // // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // //                             <input type="number" disabled={!state.checked} value={state.qty} placeholder="0" onChange={(e) => setSelectedItems(prev => ({ ...prev, [item._id]: { ...state, qty: e.target.value } }))} style={{ width: '70px', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: '700' }} />
// // // //                             {/* Showing Unit Symbol in Creation Table */}
// // // //                             <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>{item.unitId?.symbol}</span>
// // // //                           </div>
// // // //                         </td>
// // // //                         <td>
// // // //                           <input type="number" disabled={!state.checked} value={state.price} placeholder="₹" onChange={(e) => setSelectedItems(prev => ({ ...prev, [item._id]: { ...state, price: e.target.value } }))} style={{ width: '90px', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: '700' }} />
// // // //                         </td>
// // // //                         <td style={{ textAlign: 'right', fontWeight: '800', color: state.checked ? '#6366f1' : '#94a3b8' }}>
// // // //                           ₹{itemTotal.toLocaleString()}
// // // //                         </td>
// // // //                       </tr>
// // // //                     )
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







// // // // 09-04-2026





// // // import { useEffect, useMemo, useState, useCallback } from "react";
// // // import { api } from "../api.js";
// // // import { useToast } from "../toast.jsx";
// // // import * as XLSX from "xlsx";
// // // import { Search, FileSpreadsheet, CheckCircle2, Edit3, Trash2, X, Save } from "lucide-react";

// // // export const IndentPage = () => {
// // //   const { showToast } = useToast();
// // //   const [view, setView] = useState("history"); // 'history' or 'create'
// // //   const [tab, setTab] = useState("stock-items"); // Added for catalog categorization
// // //   const [searchTerm, setSearchTerm] = useState("");
// // //   const [stockItems, setStockItems] = useState([]);
// // //   const [indents, setIndents] = useState([]);
// // //   const [selectedItems, setSelectedItems] = useState({});
// // //   const [selectedId, setSelectedId] = useState(null);

// // //   // Inline Editing State (if needed for the catalog view)
// // //   const [editingId, setEditingId] = useState(null);
// // //   const [editName, setEditName] = useState("");

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

// // //   useEffect(() => { load(); }, [load]);

// // //   const getUnitSymbol = (item) => {
// // //     if (item.stockItemId?.unitId?.symbol) return item.stockItemId.unitId.symbol;
// // //     const id = item.stockItemId?._id || item.stockItemId;
// // //     const found = stockItems.find(s => s._id === id);
// // //     return found?.unitId?.symbol || "";
// // //   };

// // //   const getItemName = (item) => {
// // //     if (item.stockItemId?.name) return item.stockItemId.name;
// // //     const id = item.stockItemId?._id || item.stockItemId;
// // //     const found = stockItems.find(s => s._id === id);
// // //     return found ? found.name : "Unknown Product";
// // //   };

// // //   const handleDownloadExcel = () => {
// // //     if (!activeIndent) return;
// // //     const data = activeIndent.items.map(item => ({
// // //       "Product": getItemName(item),
// // //       "Quantity": item.orderedQty,
// // //       "Unit": getUnitSymbol(item),
// // //       "Price": item.unitPrice,
// // //       "Subtotal": item.orderedQty * item.unitPrice
// // //     }));
// // //     const ws = XLSX.utils.json_to_sheet(data);
// // //     const wb = XLSX.utils.book_new();
// // //     XLSX.utils.book_append_sheet(wb, ws, "Indent");
// // //     XLSX.writeFile(wb, `Indent_${activeIndent.indentNo || 'Export'}.xlsx`);
// // //     showToast("Excel exported successfully", "success");
// // //   };

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

// // //   const activeIndent = useMemo(() =>
// // //     indents.find(i => i._id === selectedId) || indents[0],
// // //     [selectedId, indents]);

// // //   const handleSelectAll = (e) => {
// // //     const isChecked = e.target.checked;
// // //     const newSelection = { ...selectedItems };
// // //     filteredStock.forEach(item => {
// // //       newSelection[item._id] = {
// // //         ...(newSelection[item._id] || { qty: 0, price: 0 }),
// // //         checked: isChecked
// // //       };
// // //     });
// // //     setSelectedItems(newSelection);
// // //   };

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

// // //   return (
// // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // //       {/* Header Area */}
// // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // //         <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
// // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // //             indents <span style={{ color: '#6366f1' }}>Indents</span>
// // //           </h1>
// // //           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
// // //             <button onClick={() => { setView("history"); setSearchTerm(""); }}
// // //               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'history' ? '#fff' : 'transparent', color: view === 'history' ? '#6366f1' : '#64748b', boxShadow: view === 'history' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
// // //               Logs
// // //             </button>
// // //             <button onClick={() => { setView("create"); setSearchTerm(""); }}
// // //               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'create' ? '#fff' : 'transparent', color: view === 'create' ? '#6366f1' : '#64748b', boxShadow: view === 'create' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
// // //               Create New
// // //             </button>
// // //           </div>
// // //         </div>

// // //         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // //           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // //           <input
// // //             type="text"
// // //             placeholder={view === "history" ? "Search indents..." : "Search catalog..."}
// // //             value={searchTerm}
// // //             onChange={(e) => setSearchTerm(e.target.value)}
// // //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
// // //           />
// // //         </div>
// // //       </div>

// // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
// // //         {view === "history" ? (
// // //           <>
// // //             {/* History Sidebar */}
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
// // //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>₹{r.totalAmount?.toLocaleString()} • {r.status.toUpperCase()}</div>
// // //                   </div>
// // //                 ))}
// // //               </div>
// // //             </div>

// // //             {/* Indent Detail View */}
// // //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // //               {activeIndent ? (
// // //                 <>
// // //                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
// // //                     <div>
// // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>INDENT STATUS</div>
// // //                       <div style={{ padding: '4px 12px', background: activeIndent.status === 'pending' ? '#fef3c7' : '#dcfce7', color: activeIndent.status === 'pending' ? '#d97706' : '#166534', borderRadius: '6px', fontSize: '12px', fontWeight: '800', display: 'inline-block' }}>
// // //                         {activeIndent.status.toUpperCase()}
// // //                       </div>
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
// // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
// // //                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
// // //                         </tr>
// // //                       </thead>
// // //                       <tbody>
// // //                         {activeIndent.items.map((item, idx) => (
// // //                           <tr key={idx}>
// // //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // //                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(item)}</div>
// // //                               <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
// // //                             </td>
// // //                             <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700' }}>
// // //                                {item.orderedQty} <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: '400'}}>{getUnitSymbol(item)}</span>
// // //                             </td>
// // //                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>₹{(item.orderedQty * item.unitPrice).toLocaleString()}</td>
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
// // //         ) : (
// // //           /* Create New View (Catalog-Integrated) */
// // //           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
// // //             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // //               <div>
// // //                 <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Create Requisition</h2>
// // //                 <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
// // //                     <span onClick={() => setTab("stock-items")} style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: tab === 'stock-items' ? '#6366f1' : '#64748b' }}>Stock Items</span>
// // //                     <span onClick={() => setTab("units")} style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: tab === 'units' ? '#6366f1' : '#64748b' }}>Units</span>
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
// // //                         <input type="checkbox" onChange={handleSelectAll} style={{ width: '18px', height: '18px' }} />
// // //                     </th>
// // //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>NAME</th>
                    
// // //                     {/* NEW COLUMN: Stock Group */}
// // //                     {tab === "stock-items" && (
// // //                       <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>STOCK GROUP</th>
// // //                     )}

// // //                     {tab === "units" && <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>SYMBOL</th>}
                    
// // //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '120px' }}>QTY</th>
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
// // //                             {row.imageUrl && <img src={row.imageUrl} style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />}
// // //                             <span style={{ fontWeight: '700', color: '#1e293b' }}>{row.name}</span>
// // //                           </div>
// // //                         </td>

// // //                         {/* NEW CELL: Stock Group Display */}
// // //                         {tab === "stock-items" && (
// // //                           <td style={{ padding: '16px 0' }}>
// // //                             <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
// // //                               {row.stockGroupId?.name || 'Unassigned'}
// // //                             </span>
// // //                           </td>
// // //                         )}

// // //                         {/* Existing Cells for Units */}
// // //                         {tab === "units" && (
// // //                           <td style={{ padding: '16px 0', fontWeight: '600', color: '#64748b' }}>
// // //                             {row.symbol}
// // //                           </td>
// // //                         )}

// // //                         <td style={{ padding: '16px 0' }}>
// // //                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
// // //                             <input type="number" disabled={!state.checked} value={state.qty} placeholder="0" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, qty: e.target.value } }))} style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// // //                             <span style={{ fontSize: '11px', color: '#64748b' }}>{row.unitId?.symbol}</span>
// // //                           </div>
// // //                         </td>
// // //                         <td style={{ padding: '16px 0' }}>
// // //                            <input type="number" disabled={!state.checked} value={state.price} placeholder="₹" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, price: e.target.value } }))} style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
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

















// // import { useEffect, useMemo, useState, useCallback } from "react";
// // import { api } from "../api.js";
// // import { useToast } from "../toast.jsx";
// // import * as XLSX from "xlsx";
// // import { Search, FileSpreadsheet, CheckCircle2, Edit3, Trash2, X, Save } from "lucide-react";

// // export const IndentPage = () => {
// //   const { showToast } = useToast();
// //   const [view, setView] = useState("history"); // 'history' or 'create'
// //   const [tab, setTab] = useState("stock-items"); 
// //   const [searchTerm, setSearchTerm] = useState("");
// //   const [stockItems, setStockItems] = useState([]);
// //   const [indents, setIndents] = useState([]);
// //   const [selectedItems, setSelectedItems] = useState({});
// //   const [selectedId, setSelectedId] = useState(null);

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

// //   useEffect(() => { load(); }, [load]);

// //   // --- Helper Functions for Data Resolution ---

// //   const getUnitSymbol = (item) => {
// //     if (item.stockItemId?.unitId?.symbol) return item.stockItemId.unitId.symbol;
// //     const id = item.stockItemId?._id || item.stockItemId;
// //     const found = stockItems.find(s => s._id === id);
// //     return found?.unitId?.symbol || "";
// //   };

// //   const getItemName = (item) => {
// //     if (item.stockItemId?.name) return item.stockItemId.name;
// //     const id = item.stockItemId?._id || item.stockItemId;
// //     const found = stockItems.find(s => s._id === id);
// //     return found ? found.name : "Unknown Product";
// //   };

// //   // FIXED: Cross-references master stock list if deep population is missing in Indent logs
// //   const getGroupName = (item) => {
// //     if (item.stockItemId?.stockGroupId?.name) return item.stockItemId.stockGroupId.name;
// //     const id = item.stockItemId?._id || item.stockItemId;
// //     const found = stockItems.find(s => s._id === id);
// //     return found?.stockGroupId?.name || "General";
// //   };

// //   const handleDownloadExcel = () => {
// //     if (!activeIndent) return;
// //     const data = activeIndent.items.map(item => ({
// //       "Product": getItemName(item),
// //       "Group": getGroupName(item),
// //       "Quantity": item.orderedQty,
// //       "Unit": getUnitSymbol(item),
// //       "Price": item.unitPrice,
// //       "Subtotal": item.orderedQty * item.unitPrice
// //     }));
// //     const ws = XLSX.utils.json_to_sheet(data);
// //     const wb = XLSX.utils.book_new();
// //     XLSX.utils.book_append_sheet(wb, ws, "Indent");
// //     XLSX.writeFile(wb, `Indent_${activeIndent.indentNo || 'Export'}.xlsx`);
// //     showToast("Excel exported successfully", "success");
// //   };

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

// //   const activeIndent = useMemo(() =>
// //     indents.find(i => i._id === selectedId) || indents[0],
// //     [selectedId, indents]);

// //   const handleSelectAll = (e) => {
// //     const isChecked = e.target.checked;
// //     const newSelection = { ...selectedItems };
// //     filteredStock.forEach(item => {
// //       newSelection[item._id] = {
// //         ...(newSelection[item._id] || { qty: 0, price: 0 }),
// //         checked: isChecked
// //       };
// //     });
// //     setSelectedItems(newSelection);
// //   };

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

// //   return (
// //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// //       {/* Header Area */}
// //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// //         <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
// //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// //             indents <span style={{ color: '#6366f1' }}>Indents</span>
// //           </h1>
// //           <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
// //             <button onClick={() => { setView("history"); setSearchTerm(""); }}
// //               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'history' ? '#fff' : 'transparent', color: view === 'history' ? '#6366f1' : '#64748b', boxShadow: view === 'history' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
// //               Logs
// //             </button>
// //             <button onClick={() => { setView("create"); setSearchTerm(""); }}
// //               style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'create' ? '#fff' : 'transparent', color: view === 'create' ? '#6366f1' : '#64748b', boxShadow: view === 'create' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
// //               Create New
// //             </button>
// //           </div>
// //         </div>

// //         <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// //           <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// //           <input
// //             type="text"
// //             placeholder={view === "history" ? "Search indents..." : "Search catalog..."}
// //             value={searchTerm}
// //             onChange={(e) => setSearchTerm(e.target.value)}
// //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
// //           />
// //         </div>
// //       </div>

// //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
// //         {view === "history" ? (
// //           <>
// //             {/* History Sidebar */}
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
// //                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>₹{r.totalAmount?.toLocaleString()} • {r.status.toUpperCase()}</div>
// //                   </div>
// //                 ))}
// //               </div>
// //             </div>

// //             {/* Indent Detail View */}
// //             <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// //               {activeIndent ? (
// //                 <>
// //                   <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
// //                     <div>
// //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>INDENT STATUS</div>
// //                       <div style={{ padding: '4px 12px', background: activeIndent.status === 'pending' ? '#fef3c7' : '#dcfce7', color: activeIndent.status === 'pending' ? '#d97706' : '#166534', borderRadius: '6px', fontSize: '12px', fontWeight: '800', display: 'inline-block' }}>
// //                         {activeIndent.status.toUpperCase()}
// //                       </div>
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
// //                               <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
// //                             </td>
// //                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// //                               <span style={{ 
// //                                 background: '#eff6ff', 
// //                                 color: '#3b82f6', 
// //                                 padding: '4px 8px', 
// //                                 borderRadius: '6px', 
// //                                 fontSize: '10px', 
// //                                 fontWeight: '700',
// //                                 textTransform: 'uppercase'
// //                               }}>
// //                                 {getGroupName(item)}
// //                               </span>
// //                             </td>
// //                             <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700', borderBottom: '1px solid #f8fafc' }}>
// //                                {item.orderedQty} <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: '400'}}>{getUnitSymbol(item)}</span>
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
// //         ) : (
// //           /* Create New View */
// //           <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
// //             <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// //               <div>
// //                 <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Create Requisition</h2>
// //                 <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
// //                     <span onClick={() => setTab("stock-items")} style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: tab === 'stock-items' ? '#6366f1' : '#64748b' }}>Stock Items</span>
// //                     <span onClick={() => setTab("units")} style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: tab === 'units' ? '#6366f1' : '#64748b' }}>Units</span>
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
// //                         <input type="checkbox" onChange={handleSelectAll} style={{ width: '18px', height: '18px' }} />
// //                     </th>
// //                     <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>NAME</th>
// //                     {tab === "stock-items" && (
// //                       <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>STOCK GROUP</th>
// //                     )}
// //                     {tab === "units" && <th style={{ padding: '20px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>SYMBOL</th>}
// //                     <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', width: '120px' }}>QTY</th>
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
// //                             {row.imageUrl && <img src={row.imageUrl} style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />}
// //                             <span style={{ fontWeight: '700', color: '#1e293b' }}>{row.name}</span>
// //                           </div>
// //                         </td>
// //                         {tab === "stock-items" && (
// //                           <td style={{ padding: '16px 0' }}>
// //                             <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
// //                               {row.stockGroupId?.name || 'Unassigned'}
// //                             </span>
// //                           </td>
// //                         )}
// //                         {tab === "units" && (
// //                           <td style={{ padding: '16px 0', fontWeight: '600', color: '#64748b' }}>
// //                             {row.symbol}
// //                           </td>
// //                         )}
// //                         <td style={{ padding: '16px 0' }}>
// //                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
// //                             <input type="number" disabled={!state.checked} value={state.qty} placeholder="0" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, qty: e.target.value } }))} style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
// //                             <span style={{ fontSize: '11px', color: '#64748b' }}>{row.unitId?.symbol}</span>
// //                           </div>
// //                         </td>
// //                         <td style={{ padding: '16px 0' }}>
// //                            <input type="number" disabled={!state.checked} value={state.price} placeholder="₹" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, price: e.target.value } }))} style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
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














// // 15
















// import { useEffect, useMemo, useState, useCallback } from "react";
// import { api } from "../api.js";
// import { useToast } from "../toast.jsx";
// import * as XLSX from "xlsx";
// import { 
//   Search, FileSpreadsheet, CheckCircle2, Inbox, 
//   ClipboardList, PlusCircle, RefreshCw, X, Save 
// } from "lucide-react";

// export const IndentPage = () => {
//   const { showToast } = useToast();
  
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

//   // --- Data Loading ---
//   const load = useCallback(async () => {
//     try {
//       const [itemsRes, indentRes] = await Promise.all([
//         api.get("/inventory/stock-items"),
//         api.get("/indents")
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

//   // --- Action Handlers ---
//   const handleDownloadAllRequestsExcel = () => {
//     if (!indentRequests.length) {
//       return showToast("No requests available", "info");
//     }

//     const godownNames = [
//       ...new Set(indentRequests.map(r => r.godownId?.name || "General"))
//     ];

//     const itemMap = {};

//     indentRequests.forEach(req => {
//       const godownName = req.godownId?.name || "General";
//       req.items.forEach(item => {
//         const id = item.stockItemId?._id || item.stockItemId;

//         if (!itemMap[id]) {
//           itemMap[id] = {
//             stockItem: getItemName(item),
//             group: getGroupName(item),
//             unit: getUnitSymbol(item),
//             totalQty: 0,
//             godowns: {}
//           };
//         }

//         const qty = Number(item.qtyBaseUnit || 0);
//         itemMap[id].totalQty += qty;
//         itemMap[id].godowns[godownName] = (itemMap[id].godowns[godownName] || 0) + qty;
//       });
//     });

//     const excelData = Object.values(itemMap).map((item, index) => {
//       const row = {
//         "S.No": index + 1,
//         "Stock Item": item.stockItem,
//         "Stock Group": item.group,
//         "Quantity": item.totalQty,
//         "Unit": item.unit
//       };
//       godownNames.forEach(g => {
//         row[g] = item.godowns[g] || 0;
//       });
//       return row;
//     });

//     const ws = XLSX.utils.json_to_sheet(excelData);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "All Requests");
//     XLSX.writeFile(wb, "All_Godown_Requests.xlsx");
//     showToast("Excel exported successfully", "success");
//   };

//   const handleDownloadExcel = () => {
//     if (!activeIndent) return;
//     const data = activeIndent.items.map(item => ({
//       "Product": getItemName(item),
//       "Group": getGroupName(item),
//       "Quantity": item.orderedQty,
//       "Unit": getUnitSymbol(item),
//       "Price": item.unitPrice,
//       "Subtotal": item.orderedQty * item.unitPrice
//     }));
//     const ws = XLSX.utils.json_to_sheet(data);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "Indent");
//     XLSX.writeFile(wb, `Indent_${activeIndent.indentNo || 'Export'}.xlsx`);
//     showToast("Excel exported successfully", "success");
//   };

//   const handleStatusUpdate = async (id, newStatus) => {
//     try {
//       if (newStatus === 'purchased') {
//         await api.post(`/indents/${id}/mark-purchased`);
//       } else {
//         await api.patch(`/indents/${id}`, { status: newStatus });
//       }
//       showToast(`Indent marked as ${newStatus}`, "success");
//       load();
//     } catch (error) {
//       showToast("Failed to update status", "error");
//     }
//   };

//   const finalizeConversion = async () => {
//     try {
//       await api.post(`/indent-requests/${editingRequest._id}/convert`, {
//         items: editingRequest.items.map(it => ({
//           stockItemId: it.stockItemId._id || it.stockItemId,
//           qty: Number(it.qtyBaseUnit),
//           price: Number(it.price || 0)
//         }))
//       });
//       showToast("Converted to official indent!", "success");
//       setEditingRequest(null);
//       fetchIndentRequests();
//       load();
//       setView("history");
//     } catch (error) {
//       showToast("Conversion failed", "error");
//     }
//   };

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
//       await api.post("/indents", { items: itemsToSubmit });
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

//   const activeIndent = useMemo(() =>
//     indents.find(i => i._id === selectedId) || indents[0],
//     [selectedId, indents]);

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
//                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>₹{r.totalAmount?.toLocaleString()} • {r.status.toUpperCase()}</div>
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
//                       <div style={{ padding: '4px 12px', background: activeIndent.status === 'pending' ? '#fef3c7' : '#dcfce7', color: activeIndent.status === 'pending' ? '#d97706' : '#166534', borderRadius: '6px', fontSize: '12px', fontWeight: '800', display: 'inline-block' }}>
//                         {activeIndent.status.toUpperCase()}
//                       </div>
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
//                               <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
//                             </td>
//                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
//                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
//                                 {getGroupName(item)}
//                               </span>
//                             </td>
//                             <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700', borderBottom: '1px solid #f8fafc' }}>
//                                {item.orderedQty} <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: '400'}}>{getUnitSymbol(item)}</span>
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
//                 PENDING REQUESTS ({indentRequests.length})
//               </div>
//               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
//                 {indentRequests.map(r => (
//                   <div 
//                     key={r._id} 
//                     onClick={() => setEditingRequest(JSON.parse(JSON.stringify(r)))}
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
//                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
//                       {r.godownId?.name || "Main Godown"} • {r.items?.length} Items
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
//                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th>
//                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
//                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', width: '140px' }}>QTY</th>
//                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', width: '150px' }}>UNIT PRICE</th>
//                           <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {editingRequest.items.map((it, idx) => (
//                           <tr key={idx}>
//                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
//                               <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(it)}</div>
//                             </td>
//                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
//                               <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
//                                 {getGroupName(it)}
//                               </span>
//                             </td>
//                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
//                                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//                                     <input
//                                         type="number"
//                                         value={it.qtyBaseUnit}
//                                         onChange={(e) => {
//                                         const updated = [...editingRequest.items];
//                                         updated[idx].qtyBaseUnit = e.target.value;
//                                         setEditingRequest({ ...editingRequest, items: updated });
//                                         }}
//                                         style={{ width: '70px', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: '600' }}
//                                     />
//                                     <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>
//                                         {getUnitSymbol(it)}
//                                     </span>
//                                 </div>
//                             </td>
//                             <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
//                               <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
//                                 <span style={{ color: '#94a3b8', fontSize: '13px' }}>₹</span>
//                                 <input
//                                   type="number"
//                                   placeholder="0.00"
//                                   value={it.price || ""}
//                                   onChange={(e) => {
//                                     const updated = [...editingRequest.items];
//                                     updated[idx].price = e.target.value;
//                                     setEditingRequest({ ...editingRequest, items: updated });
//                                   }}
//                                   style={{ width: '90px', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: '600' }}
//                                 />
//                               </div>
//                             </td>
//                             <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1', borderBottom: '1px solid #f8fafc' }}>
//                               ₹{(Number(it.qtyBaseUnit || 0) * Number(it.price || 0)).toLocaleString()}
//                             </td>
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
//                     <button 
//                       onClick={finalizeConversion} 
//                       style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
//                     >
//                       <Save size={16} /> Confirm & Convert to Indent
//                     </button>
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
//                             <input type="number" disabled={!state.checked} value={state.qty} placeholder="0" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, qty: e.target.value } }))} style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
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








// 20











import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "../api.js";
import { useToast } from "../toast.jsx";
import * as XLSX from "xlsx";
import { 
  Search, FileSpreadsheet, CheckCircle2, Inbox, 
  ClipboardList, PlusCircle, RefreshCw, X, Save 
} from "lucide-react";

export const IndentPage = () => {
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState("");
  // View State
  const [view, setView] = useState("history"); 
  const [tab, setTab] = useState("stock-items");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Data State
  const [stockItems, setStockItems] = useState([]);
  const [indents, setIndents] = useState([]);
  const [indentRequests, setIndentRequests] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [selectedId, setSelectedId] = useState(null);

  // --- Editing State for Requests ---
  const [editingRequest, setEditingRequest] = useState(null);

  // --- Data Loading ---
  const load = useCallback(async () => {
    try {
      const [itemsRes, indentRes] = await Promise.all([
        api.get("/inventory/stock-items"),
        api.get("/indents")
      ]);
      setStockItems(itemsRes.data || []);
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

  // --- Action Handlers ---
  // const handleDownloadAllRequestsExcel = () => {
  //   if (!indentRequests.length) {
  //     return showToast("No requests available", "info");
  //   }

  //   const godownNames = [
  //     ...new Set(indentRequests.map(r => r.godownId?.name || "General"))
  //   ];

  //   const itemMap = {};

  //   indentRequests.forEach(req => {
  //     const godownName = req.godownId?.name || "General";
  //     req.items.forEach(item => {
  //       const id = item.stockItemId?._id || item.stockItemId;

  //       if (!itemMap[id]) {
  //         itemMap[id] = {
  //           stockItem: getItemName(item),
  //           group: getGroupName(item),
  //           unit: getUnitSymbol(item),
  //           totalQty: 0,
  //           godowns: {}
  //         };
  //       }

  //       const qty = Number(item.qtyBaseUnit || 0);
  //       itemMap[id].totalQty += qty;
  //       itemMap[id].godowns[godownName] = (itemMap[id].godowns[godownName] || 0) + qty;
  //     });
  //   });

  //   const excelData = Object.values(itemMap).map((item, index) => {
  //     const row = {
  //       "S.No": index + 1,
  //       "Stock Item": item.stockItem,
  //       "Stock Group": item.group,
  //       "Quantity": item.totalQty,
  //       "Unit": item.unit
  //     };
  //     godownNames.forEach(g => {
  //       row[g] = item.godowns[g] || 0;
  //     });
  //     return row;
  //   });

  //   const ws = XLSX.utils.json_to_sheet(excelData);
  //   const wb = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(wb, ws, "All Requests");
  //   XLSX.writeFile(wb, "All_Godown_Requests.xlsx");
  //   showToast("Excel exported successfully", "success");
  // };




  const handleDownloadAllRequestsExcel = () => {
  if (!indentRequests.length) {
    return showToast("No requests available", "info");
  }

  let filteredRequests = indentRequests;

  if (selectedDate) {
    filteredRequests = indentRequests.filter(r => {
      const reqDate = new Date(r.createdAt).toISOString().split("T")[0];
      return reqDate === selectedDate;
    });
  }

  if (!filteredRequests.length) {
    return showToast("No requests found for selected date", "info");
  }

  const godownNames = [
    ...new Set(filteredRequests.map(r => r.godownId?.name || "General"))
  ];

  const itemMap = {};

  filteredRequests.forEach(req => {
    const godownName = req.godownId?.name || "General";

    req.items.forEach(item => {
      const id = item.stockItemId?._id || item.stockItemId;

      if (!itemMap[id]) {
        itemMap[id] = {
          stockItem: getItemName(item),
          group: getGroupName(item),
          unit: getUnitSymbol(item),
          totalQty: 0,
          godowns: {}
        };
      }

      const qty = Number(item.qtyBaseUnit || 0);
      itemMap[id].totalQty += qty;
      itemMap[id].godowns[godownName] =
        (itemMap[id].godowns[godownName] || 0) + qty;
    });
  });

  const excelData = Object.values(itemMap).map((item, index) => {
    const row = {
      "S.No": index + 1,
      "Stock Item": item.stockItem,
      "Stock Group": item.group,
      "Quantity": item.totalQty,
      "Unit": item.unit
    };

    godownNames.forEach(g => {
      row[g] = item.godowns[g] || 0;
    });

    return row;
  });

  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Filtered Requests");

  const fileName = selectedDate
    ? `Requests_${selectedDate}.xlsx`
    : "All_Godown_Requests.xlsx";

  XLSX.writeFile(wb, fileName);

  showToast("Excel exported successfully", "success");
};

  const handleDownloadExcel = () => {
    if (!activeIndent) return;
    const data = activeIndent.items.map(item => ({
      "Product": getItemName(item),
      "Group": getGroupName(item),
      "Quantity": item.orderedQty,
      "Unit": getUnitSymbol(item),
      "Price": item.unitPrice,
      "Subtotal": item.orderedQty * item.unitPrice
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Indent");
    XLSX.writeFile(wb, `Indent_${activeIndent.indentNo || 'Export'}.xlsx`);
    showToast("Excel exported successfully", "success");
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      if (newStatus === 'purchased') {
        await api.post(`/indents/${id}/mark-purchased`);
      } else {
        await api.patch(`/indents/${id}`, { status: newStatus });
      }
      showToast(`Indent marked as ${newStatus}`, "success");
      load();
    } catch (error) {
      showToast("Failed to update status", "error");
    }
  };

  const confirmRequest = async () => {
    try {
      await api.patch(`/indent-requests/${editingRequest._id}/confirm`);
      showToast("Request confirmed!", "success");
      setEditingRequest(null);
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
      await api.post("/indents", { items: itemsToSubmit });
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
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>₹{r.totalAmount?.toLocaleString()} • {r.status.toUpperCase()}</div>
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
                      <div style={{ padding: '4px 12px', background: activeIndent.status === 'pending' ? '#fef3c7' : '#dcfce7', color: activeIndent.status === 'pending' ? '#d97706' : '#166534', borderRadius: '6px', fontSize: '12px', fontWeight: '800', display: 'inline-block' }}>
                        {activeIndent.status.toUpperCase()}
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
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice}</div>
                            </td>
                            <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
                              <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
                                {getGroupName(item)}
                              </span>
                            </td>
                            <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700', borderBottom: '1px solid #f8fafc' }}>
                               {item.orderedQty} <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: '400'}}>{getUnitSymbol(item)}</span>
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
                ALL REQUESTS ({indentRequests.length})
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {indentRequests.map(r => (
                  <div 
                    key={r._id} 
                    onClick={() => setEditingRequest(JSON.parse(JSON.stringify(r)))}
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
                      <span style={{
                        background: r.status === "confirmed" ? "#dcfce7" : "#fef3c7",
                        color: r.status === "confirmed" ? "#166534" : "#d97706",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontSize: "10px",
                        fontWeight: "700"
                      }}>
                        {r.status?.toUpperCase()}
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
                    <input
  type="date"
  value={selectedDate}
  onChange={(e) => setSelectedDate(e.target.value)}
  style={{
    padding: "8px 12px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    fontSize: "13px"
  }}
/>
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
                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>ITEM</th>
                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', width: '140px' }}>QTY</th>
                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', width: '150px' }}>UNIT PRICE</th>
                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editingRequest.items.map((it, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
                              <div style={{ fontWeight: '700', color: '#1e293b' }}>{getItemName(it)}</div>
                            </td>
                            <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
                              <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
                                {getGroupName(it)}
                              </span>
                            </td>
                            <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="number"
                                        disabled={isConfirmed}
                                        value={it.qtyBaseUnit}
                                        onChange={(e) => {
                                        const updated = [...editingRequest.items];
                                        updated[idx].qtyBaseUnit = e.target.value;
                                        setEditingRequest({ ...editingRequest, items: updated });
                                        }}
                                        style={{ width: '70px', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: '600', opacity: isConfirmed ? 0.7 : 1 }}
                                    />
                                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>
                                        {getUnitSymbol(it)}
                                    </span>
                                </div>
                            </td>
                            <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ color: '#94a3b8', fontSize: '13px' }}>₹</span>
                                <input
                                  type="number"
                                  disabled={isConfirmed}
                                  placeholder="0.00"
                                  value={it.price || ""}
                                  onChange={(e) => {
                                    const updated = [...editingRequest.items];
                                    updated[idx].price = e.target.value;
                                    setEditingRequest({ ...editingRequest, items: updated });
                                  }}
                                  style={{ width: '90px', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: '600', opacity: isConfirmed ? 0.7 : 1 }}
                                />
                              </div>
                            </td>
                            <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1', borderBottom: '1px solid #f8fafc' }}>
                              ₹{(Number(it.qtyBaseUnit || 0) * Number(it.price || 0)).toLocaleString()}
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

                    {editingRequest.status !== "confirmed" && (
                      <button onClick={confirmRequest}
                        style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        Confirm Request
                      </button>
                    )}
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
                            <input type="number" disabled={!state.checked} value={state.qty} placeholder="0" onChange={(e) => setSelectedItems(prev => ({ ...prev, [row._id]: { ...state, qty: e.target.value } }))} style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
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