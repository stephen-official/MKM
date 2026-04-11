

// // // // import { useEffect, useState, useCallback, useMemo } from "react";
// // // // import { api } from "../api.js";
// // // // import * as XLSX from "xlsx";
// // // // import { ArrowRightLeft, Search, FileSpreadsheet } from "lucide-react";
// // // // import { toast } from "react-hot-toast";

// // // // export const TransferStockPage = () => {
// // // //   const [godowns, setGodowns] = useState([]);
// // // //   const [stockItems, setStockItems] = useState([]);
// // // //   const [transfers, setTransfers] = useState([]);
// // // //   const [selectedTransfer, setSelectedTransfer] = useState(null);
// // // //   const [itemSearch, setItemSearch] = useState("");
// // // //   const [showItemDropdown, setShowItemDropdown] = useState(false);

// // // //   const [form, setForm] = useState({ 
// // // //     fromGodownId: "", 
// // // //     toGodownId: "", 
// // // //     stockItemId: "", 
// // // //     qtyBaseUnit: "" 
// // // //   });

// // // //   const loadData = useCallback(async () => {
// // // //     try {
// // // //       const [gRes, sRes, tRes] = await Promise.all([
// // // //         api.get("/inventory/godowns"), 
// // // //         api.get("/inventory/stock-items"), 
// // // //         api.get("/transfers")
// // // //       ]);
// // // //       setGodowns(gRes.data || []);
// // // //       setStockItems(sRes.data || []);
      
// // // //       const sorted = (tRes.data || []).sort((a, b) => 
// // // //         new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
// // // //       );
      
// // // //       setTransfers(sorted);
// // // //       if (sorted.length > 0 && !selectedTransfer) setSelectedTransfer(sorted[0]);
// // // //     } catch (error) {
// // // //       toast.error("Failed to fetch data");
// // // //     }
// // // //   }, [selectedTransfer]);

// // // //   useEffect(() => { loadData(); }, [loadData]);

// // // //   const filteredItems = useMemo(() => {
// // // //     return stockItems.filter(item => 
// // // //       item.name.toLowerCase().includes(itemSearch.toLowerCase())
// // // //     );
// // // //   }, [stockItems, itemSearch]);

// // // //   const downloadExcel = () => {
// // // //     if (!selectedTransfer) return;
    
// // // //     const data = selectedTransfer.items.map(item => ({
// // // //       "Transfer ID": `TRN-${selectedTransfer._id.slice(-6).toUpperCase()}`,
// // // //       "Date": new Date(selectedTransfer.createdAt).toLocaleString(),
// // // //       "Source": selectedTransfer.fromGodownId?.name || "N/A",
// // // //       "Destination": selectedTransfer.toGodownId?.name || "N/A",
// // // //       "Item": item.stockItemId?.name || "N/A",
// // // //       "Quantity": item.qtyBaseUnit,
// // // //       // Logic for deep nested unit symbol
// // // //       "Unit": item.stockItemId?.unitId?.symbol || "units"
// // // //     }));

// // // //     const worksheet = XLSX.utils.json_to_sheet(data);
// // // //     const workbook = XLSX.utils.book_new();
// // // //     XLSX.utils.book_append_sheet(workbook, worksheet, "TransferDetails");
// // // //     XLSX.writeFile(workbook, `Transfer_${selectedTransfer._id.slice(-6)}.xlsx`);
// // // //     toast.success("Excel Downloaded");
// // // //   };

// // // //   const handleTransfer = async () => {
// // // //     if (!form.fromGodownId || !form.toGodownId || !form.stockItemId || !form.qtyBaseUnit) {
// // // //       toast.error("Fill all fields");
// // // //       return;
// // // //     }
// // // //     if (form.fromGodownId === form.toGodownId) {
// // // //       toast.error("Source and Destination cannot be same");
// // // //       return;
// // // //     }
// // // //     try {
// // // //       await api.post("/transfers", {
// // // //         fromGodownId: form.fromGodownId,
// // // //         toGodownId: form.toGodownId,
// // // //         items: [{ stockItemId: form.stockItemId, qtyBaseUnit: Number(form.qtyBaseUnit) }]
// // // //       });
// // // //       toast.success("Transfer Posted");
// // // //       setForm({ fromGodownId: "", toGodownId: "", stockItemId: "", qtyBaseUnit: "" });
// // // //       setItemSearch("");
// // // //       loadData();
// // // //     } catch (error) {
// // // //       toast.error(error.response?.data?.error || "Transfer failed");
// // // //     }
// // // //   };

// // // //   const styles = {
// // // //     pageContainer: { flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', padding: '24px', height: '100vh' },
// // // //     formBar: { background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'flex-end', position: 'relative', zIndex: 10 },
// // // //     inputGroup: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, position: 'relative' },
// // // //     label: { fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
// // // //     input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none', background: '#fff' },
// // // //     searchDropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '4px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto', zIndex: 100 },
// // // //     searchOption: { padding: '10px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' },
// // // //     postBtn: { background: '#0f172a', color: '#fff', padding: '10px 24px', borderRadius: '8px', border: 'none', fontWeight: '700', cursor: 'pointer' },
// // // //     contentWrapper: { display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' },
// // // //     leftList: { width: '350px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
// // // //     rightDetail: { flex: 1, background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
// // // //     listItem: (isActive) => ({ padding: '16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: isActive ? '#f0f4ff' : 'transparent', borderLeft: isActive ? '4px solid #6366f1' : '4px solid transparent' }),
// // // //     tableHeader: { padding: '12px', fontSize: '12px', fontWeight: '700', color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid #f1f5f9' },
// // // //     excelBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }
// // // //   };

// // // //   return (
// // // //     <div style={styles.pageContainer}>
// // // //       <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '20px' }}>Transfer <span style={{color: '#6366f1'}}>Stock</span></h1>

// // // //       <div style={styles.formBar}>
// // // //         <div style={styles.inputGroup}><label style={styles.label}>Source Godown</label>
// // // //           <select style={styles.input} value={form.fromGodownId} onChange={e => setForm({...form, fromGodownId: e.target.value})}>
// // // //             <option value="">Select Source</option>
// // // //             {godowns.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
// // // //           </select>
// // // //         </div>
// // // //         <div style={styles.inputGroup}><label style={styles.label}>Destination Godown</label>
// // // //           <select style={styles.input} value={form.toGodownId} onChange={e => setForm({...form, toGodownId: e.target.value})}>
// // // //             <option value="">Select Dest.</option>
// // // //             {godowns.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
// // // //           </select>
// // // //         </div>
// // // //         <div style={{...styles.inputGroup, flex: 1.5}}><label style={styles.label}>Search Item</label>
// // // //           <div style={{ position: 'relative' }}>
// // // //             <input style={{...styles.input, width: '100%', paddingLeft: '35px'}} placeholder="Type item name..." value={itemSearch} onFocus={() => setShowItemDropdown(true)} onChange={(e) => setItemSearch(e.target.value)} />
// // // //             <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
// // // //           </div>
// // // //           {showItemDropdown && (
// // // //             <div style={styles.searchDropdown}>
// // // //               {filteredItems.map(item => (
// // // //                 <div key={item._id} style={{...styles.searchOption, background: form.stockItemId === item._id ? '#eef2ff' : '#fff'}}
// // // //                   onClick={() => { setForm({...form, stockItemId: item._id}); setItemSearch(item.name); setShowItemDropdown(false); }}>
// // // //                   <div style={{ fontWeight: '600' }}>{item.name}</div>
// // // //                   <div style={{ fontSize: '10px', color: '#94a3b8' }}>Unit: {item.unitId?.symbol || item.unitId?.name || 'N/A'}</div>
// // // //                 </div>
// // // //               ))}
// // // //             </div>
// // // //           )}
// // // //         </div>
// // // //         <div style={{...styles.inputGroup, flex: 0.4}}><label style={styles.label}>Qty</label>
// // // //           <input type="number" style={styles.input} placeholder="0" value={form.qtyBaseUnit} onChange={e => setForm({...form, qtyBaseUnit: e.target.value})} />
// // // //         </div>
// // // //         <button style={styles.postBtn} onClick={handleTransfer}>Post Transfer</button>
// // // //       </div>

// // // //       <div style={styles.contentWrapper}>
// // // //         <div style={styles.leftList}>
// // // //           <div style={{ padding: '16px', background: '#fcfcfe', borderBottom: '1px solid #f1f5f9', fontWeight: '800', fontSize: '11px', color: '#64748b' }}>RECENT ACTIVITY</div>
// // // //           <div style={{ overflowY: 'auto' }}>
// // // //             {transfers.map((t) => (
// // // //               <div key={t._id} style={styles.listItem(selectedTransfer?._id === t._id)} onClick={() => setSelectedTransfer(t)}>
// // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
// // // //                   <span style={{ fontWeight: '800', fontSize: '13px' }}>TRN-{t._id.slice(-6).toUpperCase()}</span>
// // // //                   <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(t.createdAt).toLocaleDateString()}</span>
// // // //                 </div>
// // // //                 <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
// // // //                   {t.fromGodownId?.name} <ArrowRightLeft size={10} /> {t.toGodownId?.name}
// // // //                 </div>
// // // //               </div>
// // // //             ))}
// // // //           </div>
// // // //         </div>

// // // //         <div style={styles.rightDetail}>
// // // //           {selectedTransfer ? (
// // // //             <>
// // // //               <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
// // // //                 <div>
// // // //                   <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>Transfer Details</h2>
// // // //                   <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>ID: {selectedTransfer._id}</p>
// // // //                 </div>
// // // //                 <button style={styles.excelBtn} onClick={downloadExcel}><FileSpreadsheet size={18} /> Export Excel</button>
// // // //               </div>
// // // //               <div style={{ padding: '24px' }}>
// // // //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // //                   <thead>
// // // //                     <tr>
// // // //                       <th style={styles.tableHeader}>ITEM NAME</th>
// // // //                       <th style={{...styles.tableHeader, textAlign: 'center'}}>QUANTITY</th>
// // // //                       <th style={{...styles.tableHeader, textAlign: 'right'}}>UNIT</th>
// // // //                     </tr>
// // // //                   </thead>
// // // //                   <tbody>
// // // //                     {selectedTransfer.items?.map((item, idx) => (
// // // //                       <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
// // // //                         <td style={{ padding: '16px 12px', fontWeight: '700' }}>{item.stockItemId?.name}</td>
// // // //                         <td style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '800', color: '#6366f1' }}>{item.qtyBaseUnit}</td>
// // // //                         <td style={{ padding: '16px 12px', textAlign: 'right', color: '#94a3b8', fontWeight: '600' }}>
// // // //                           {/* SUCCESS: Symbol will now appear because of deep population */}
// // // //                           {item.stockItemId?.unitId?.symbol || "-"}
// // // //                         </td>
// // // //                       </tr>
// // // //                     ))}
// // // //                   </tbody>
// // // //                 </table>
// // // //               </div>
// // // //             </>
// // // //           ) : (
// // // //             <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#94a3b8' }}>Select a transfer to view details</div>
// // // //           )}
// // // //         </div>
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // };





















// // // import { useEffect, useState, useCallback, useMemo } from "react";
// // // import { api } from "../api.js";
// // // import * as XLSX from "xlsx";
// // // import { ArrowRightLeft, Search, FileSpreadsheet, AlertCircle } from "lucide-react";
// // // import { toast } from "react-hot-toast";

// // // export const TransferStockPage = () => {
// // //   const [godowns, setGodowns] = useState([]);
// // //   const [stockItems, setStockItems] = useState([]); // This will now hold godown-specific stock
// // //   const [transfers, setTransfers] = useState([]);
// // //   const [selectedTransfer, setSelectedTransfer] = useState(null);
// // //   const [itemSearch, setItemSearch] = useState("");
// // //   const [showItemDropdown, setShowItemDropdown] = useState(false);

// // //   const [form, setForm] = useState({ 
// // //     fromGodownId: "", 
// // //     toGodownId: "", 
// // //     stockItemId: "", 
// // //     qtyBaseUnit: "" 
// // //   });

// // //   // 1. Load Godowns and Recent Activity
// // //   const loadInitialData = useCallback(async () => {
// // //     try {
// // //       const [gRes, tRes] = await Promise.all([
// // //         api.get("/inventory/godowns"), 
// // //         api.get("/transfers")
// // //       ]);
// // //       setGodowns(gRes.data || []);
// // //       const sorted = (tRes.data || []).sort((a, b) => 
// // //         new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
// // //       );
// // //       setTransfers(sorted);
// // //       if (sorted.length > 0 && !selectedTransfer) setSelectedTransfer(sorted[0]);
// // //     } catch (error) {
// // //       toast.error("Failed to fetch initial data");
// // //     }
// // //   }, [selectedTransfer]);

// // //   // 2. Load REAL stock whenever the Source Godown changes
// // //   const loadGodownStock = useCallback(async () => {
// // //     if (!form.fromGodownId) {
// // //       setStockItems([]);
// // //       return;
// // //     }
// // //     try {
// // //       // Fetching from /godown-stocks (the same endpoint used in GodownsPage)
// // //       const res = await api.get("/godown-stocks");
// // //       // Filter stocks belonging only to the selected source godown
// // //       const currentGodownStock = res.data.filter(s => 
// // //         (s.godownId?._id || s.godownId) === form.fromGodownId
// // //       );
// // //       setStockItems(currentGodownStock);
// // //     } catch (error) {
// // //       toast.error("Failed to fetch godown stock levels");
// // //     }
// // //   }, [form.fromGodownId]);

// // //   useEffect(() => { loadInitialData(); }, [loadInitialData]);
// // //   useEffect(() => { loadGodownStock(); }, [loadGodownStock]);

// // //   const currentSelectedItem = useMemo(() => {
// // //     return stockItems.find(item => (item.stockItemId?._id || item.stockItemId) === form.stockItemId);
// // //   }, [stockItems, form.stockItemId]);

// // //   const filteredItems = useMemo(() => {
// // //     return stockItems.filter(item => 
// // //       (item.stockItemId?.name || "").toLowerCase().includes(itemSearch.toLowerCase())
// // //     );
// // //   }, [stockItems, itemSearch]);

// // //   const handleTransfer = async () => {
// // //     const qty = Number(form.qtyBaseUnit);
// // //     if (!form.fromGodownId || !form.toGodownId || !form.stockItemId || !form.qtyBaseUnit) {
// // //       toast.error("Please fill all fields");
// // //       return;
// // //     }
// // //     if (form.fromGodownId === form.toGodownId) {
// // //       toast.error("Source and Destination cannot be the same");
// // //       return;
// // //     }

// // //     // Logic: use qtyBaseUnit from the godown-stock record
// // //     const available = currentSelectedItem?.qtyBaseUnit || 0;
    
// // //     if (qty <= 0) {
// // //         toast.error("Quantity must be greater than 0");
// // //         return;
// // //     }
// // //     if (qty > available) {
// // //       toast.error(`Insufficient Stock! Available: ${available}`);
// // //       return;
// // //     }

// // //     try {
// // //       await api.post("/transfers", {
// // //         fromGodownId: form.fromGodownId,
// // //         toGodownId: form.toGodownId,
// // //         items: [{ stockItemId: form.stockItemId, qtyBaseUnit: qty }]
// // //       });
      
// // //       toast.success("Transfer Posted Successfully");
// // //       setForm({ ...form, stockItemId: "", qtyBaseUnit: "" });
// // //       setItemSearch("");
// // //       loadInitialData();
// // //       loadGodownStock(); // Refresh stock after transfer
// // //     } catch (error) {
// // //       toast.error(error.response?.data?.error || "Transfer failed");
// // //     }
// // //   };

// // //   const isQtyInvalid = Number(form.qtyBaseUnit) > (currentSelectedItem?.qtyBaseUnit || 0);

// // //   // ... (Keep your styles and remaining JSX the same as below)
// // //   const styles = {
// // //     pageContainer: { flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', padding: '24px', height: '100vh', fontFamily: 'Inter, sans-serif' },
// // //     formBar: { background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'flex-end', position: 'relative', zIndex: 10 },
// // //     inputGroup: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, position: 'relative' },
// // //     label: { fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
// // //     input: (isError) => ({ padding: '10px 12px', borderRadius: '8px', border: isError ? '2px solid #ef4444' : '1px solid #e2e8f0', fontSize: '13px', outline: 'none', background: isError ? '#fef2f2' : '#fff' }),
// // //     searchDropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '4px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto', zIndex: 100 },
// // //     searchOption: { padding: '10px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' },
// // //     postBtn: { background: '#0f172a', color: '#fff', padding: '10px 24px', borderRadius: '8px', border: 'none', fontWeight: '700', cursor: 'pointer' },
// // //     contentWrapper: { display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' },
// // //     leftList: { width: '350px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
// // //     rightDetail: { flex: 1, background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
// // //     listItem: (isActive) => ({ padding: '16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: isActive ? '#f0f4ff' : 'transparent', borderLeft: isActive ? '4px solid #6366f1' : '4px solid transparent' }),
// // //     tableHeader: { padding: '12px', fontSize: '12px', fontWeight: '700', color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid #f1f5f9' },
// // //     excelBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
// // //     stockBadge: (low) => ({ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: low ? '#fee2e2' : '#f1f5f9', color: low ? '#ef4444' : '#475569', fontWeight: '600' })
// // //   };

// // //   return (
// // //     <div style={styles.pageContainer}>
// // //       <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '20px' }}>Transfer <span style={{color: '#6366f1'}}>Stock</span></h1>

// // //       <div style={styles.formBar}>
// // //         <div style={styles.inputGroup}><label style={styles.label}>Source Godown</label>
// // //           <select style={styles.input()} value={form.fromGodownId} onChange={e => setForm({...form, fromGodownId: e.target.value, stockItemId: ""})}>
// // //             <option value="">Select Source</option>
// // //             {godowns.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
// // //           </select>
// // //         </div>
        
// // //         <div style={styles.inputGroup}><label style={styles.label}>Destination Godown</label>
// // //           <select style={styles.input()} value={form.toGodownId} onChange={e => setForm({...form, toGodownId: e.target.value})}>
// // //             <option value="">Select Dest.</option>
// // //             {godowns.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
// // //           </select>
// // //         </div>

// // //         <div style={{...styles.inputGroup, flex: 1.5}}><label style={styles.label}>Search Item (Available In Source)</label>
// // //           <div style={{ position: 'relative' }}>
// // //             <input 
// // //                 style={{...styles.input(), width: '100%', paddingLeft: '35px'}} 
// // //                 placeholder={form.fromGodownId ? "Search items in source..." : "Select source godown first"} 
// // //                 disabled={!form.fromGodownId}
// // //                 value={itemSearch} 
// // //                 onFocus={() => setShowItemDropdown(true)} 
// // //                 onChange={(e) => setItemSearch(e.target.value)} 
// // //             />
// // //             <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
// // //           </div>
// // //           {showItemDropdown && form.fromGodownId && (
// // //             <div style={styles.searchDropdown}>
// // //               {filteredItems.map(item => (
// // //                 <div key={item._id} style={{...styles.searchOption, background: form.stockItemId === item.stockItemId?._id ? '#eef2ff' : '#fff'}}
// // //                   onClick={() => { setForm({...form, stockItemId: item.stockItemId?._id}); setItemSearch(item.stockItemId?.name); setShowItemDropdown(false); }}>
// // //                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // //                     <span style={{ fontWeight: '600' }}>{item.stockItemId?.name}</span>
// // //                     <span style={styles.stockBadge(item.qtyBaseUnit <= 0)}>Available: {item.qtyBaseUnit}</span>
// // //                   </div>
// // //                   <div style={{ fontSize: '10px', color: '#94a3b8' }}>Unit: {item.stockItemId?.unitId?.symbol || 'units'}</div>
// // //                 </div>
// // //               ))}
// // //             </div>
// // //           )}
// // //         </div>

// // //         <div style={{...styles.inputGroup, flex: 0.5}}><label style={styles.label}>Qty {currentSelectedItem && `(Max: ${currentSelectedItem.qtyBaseUnit})`}</label>
// // //           <input 
// // //             type="number" 
// // //             style={styles.input(isQtyInvalid)} 
// // //             placeholder="0" 
// // //             value={form.qtyBaseUnit} 
// // //             onChange={e => setForm({...form, qtyBaseUnit: e.target.value})} 
// // //           />
// // //           {isQtyInvalid && <span style={{color: '#ef4444', fontSize: '10px', fontWeight: '800', marginTop: '2px'}}>NO STOCK!</span>}
// // //         </div>

// // //         <button 
// // //             style={{...styles.postBtn, opacity: (isQtyInvalid || !form.stockItemId) ? 0.6 : 1, cursor: (isQtyInvalid || !form.stockItemId) ? 'not-allowed' : 'pointer'}} 
// // //             onClick={handleTransfer}
// // //             disabled={isQtyInvalid || !form.stockItemId}
// // //         >
// // //             Post Transfer
// // //         </button>
// // //       </div>

// // //       {/* ... (Rest of your JSX for Recent Activity and Details Table remains identical) */}
// // //       <div style={styles.contentWrapper}>
// // //         <div style={styles.leftList}>
// // //           <div style={{ padding: '16px', background: '#fcfcfe', borderBottom: '1px solid #f1f5f9', fontWeight: '800', fontSize: '11px', color: '#64748b' }}>RECENT ACTIVITY</div>
// // //           <div style={{ overflowY: 'auto' }}>
// // //             {transfers.map((t) => (
// // //               <div key={t._id} style={styles.listItem(selectedTransfer?._id === t._id)} onClick={() => setSelectedTransfer(t)}>
// // //                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
// // //                   <span style={{ fontWeight: '800', fontSize: '13px' }}>TRN-{t._id.slice(-6).toUpperCase()}</span>
// // //                   <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(t.createdAt).toLocaleDateString()}</span>
// // //                 </div>
// // //                 <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
// // //                   {t.fromGodownId?.name} <ArrowRightLeft size={10} /> {t.toGodownId?.name}
// // //                 </div>
// // //               </div>
// // //             ))}
// // //           </div>
// // //         </div>
// // //         <div style={styles.rightDetail}>
// // //            {/* Detailed View logic (same as your original) */}
// // //            {selectedTransfer ? (
// // //              <div style={{padding: '24px'}}>
// // //                <h2 style={{margin: 0, fontSize: '20px', fontWeight: '800'}}>Transfer Details</h2>
// // //                <table style={{width: '100%', marginTop: '20px'}}>
// // //                  <thead>
// // //                     <tr><th style={styles.tableHeader}>ITEM</th><th style={styles.tableHeader}>QTY</th></tr>
// // //                  </thead>
// // //                  <tbody>
// // //                     {selectedTransfer.items?.map((it, i) => (
// // //                       <tr key={i}><td style={{padding: '12px'}}>{it.stockItemId?.name}</td><td style={{padding: '12px'}}>{it.qtyBaseUnit}</td></tr>
// // //                     ))}
// // //                  </tbody>
// // //                </table>
// // //              </div>
// // //            ) : <div style={{padding: '40px', color: '#94a3b8'}}>Select a transfer</div>}
// // //         </div>
// // //       </div>
// // //     </div>
// // //   );
// // // };










// // import { useEffect, useState, useCallback, useMemo } from "react";
// // import { api } from "../api.js";
// // import * as XLSX from "xlsx";
// // import { ArrowRightLeft, Search, FileSpreadsheet, AlertCircle } from "lucide-react";
// // import { toast } from "react-hot-toast";

// // export const TransferStockPage = () => {
// //   const [godowns, setGodowns] = useState([]);
// //   const [stockItems, setStockItems] = useState([]); 
// //   const [transfers, setTransfers] = useState([]);
// //   const [selectedTransfer, setSelectedTransfer] = useState(null);
// //   const [itemSearch, setItemSearch] = useState("");
// //   const [showItemDropdown, setShowItemDropdown] = useState(false);

// //   const [form, setForm] = useState({ 
// //     fromGodownId: "", 
// //     toGodownId: "", 
// //     stockItemId: "", 
// //     qtyBaseUnit: "" 
// //   });

// //   const loadInitialData = useCallback(async () => {
// //     try {
// //       const [gRes, tRes] = await Promise.all([
// //         api.get("/inventory/godowns"), 
// //         api.get("/transfers")
// //       ]);
// //       setGodowns(gRes.data || []);
// //       const sorted = (tRes.data || []).sort((a, b) => 
// //         new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
// //       );
// //       setTransfers(sorted);
// //       if (sorted.length > 0 && !selectedTransfer) setSelectedTransfer(sorted[0]);
// //     } catch (error) {
// //       toast.error("Failed to fetch initial data");
// //     }
// //   }, [selectedTransfer]);

// //   const loadGodownStock = useCallback(async () => {
// //     if (!form.fromGodownId) {
// //       setStockItems([]);
// //       return;
// //     }
// //     try {
// //       const res = await api.get("/godown-stocks");
// //       const currentGodownStock = res.data.filter(s => 
// //         (s.godownId?._id || s.godownId) === form.fromGodownId
// //       );
// //       setStockItems(currentGodownStock);
// //     } catch (error) {
// //       toast.error("Failed to fetch godown stock levels");
// //     }
// //   }, [form.fromGodownId]);

// //   useEffect(() => { loadInitialData(); }, [loadInitialData]);
// //   useEffect(() => { loadGodownStock(); }, [loadGodownStock]);

// //   const currentSelectedItem = useMemo(() => {
// //     return stockItems.find(item => (item.stockItemId?._id || item.stockItemId) === form.stockItemId);
// //   }, [stockItems, form.stockItemId]);

// //   const filteredItems = useMemo(() => {
// //     return stockItems.filter(item => 
// //       (item.stockItemId?.name || "").toLowerCase().includes(itemSearch.toLowerCase())
// //     );
// //   }, [stockItems, itemSearch]);

// //   const handleTransfer = async () => {
// //     const qty = Number(form.qtyBaseUnit);
// //     if (!form.fromGodownId || !form.toGodownId || !form.stockItemId || !form.qtyBaseUnit) {
// //       toast.error("Please fill all fields");
// //       return;
// //     }
// //     if (form.fromGodownId === form.toGodownId) {
// //       toast.error("Source and Destination cannot be the same");
// //       return;
// //     }

// //     const available = currentSelectedItem?.qtyBaseUnit || 0;
// //     if (qty <= 0) {
// //         toast.error("Quantity must be greater than 0");
// //         return;
// //     }
// //     if (qty > available) {
// //       toast.error(`Insufficient Stock! Available: ${available} ${currentSelectedItem?.stockItemId?.unitId?.symbol || ''}`);
// //       return;
// //     }

// //     try {
// //       await api.post("/transfers", {
// //         fromGodownId: form.fromGodownId,
// //         toGodownId: form.toGodownId,
// //         items: [{ stockItemId: form.stockItemId, qtyBaseUnit: qty }]
// //       });
      
// //       toast.success("Transfer Posted Successfully");
// //       setForm({ ...form, stockItemId: "", qtyBaseUnit: "" });
// //       setItemSearch("");
// //       loadInitialData();
// //       loadGodownStock(); 
// //     } catch (error) {
// //       toast.error(error.response?.data?.error || "Transfer failed");
// //     }
// //   };

// //   const downloadExcel = () => {
// //     if (!selectedTransfer) return;
// //     const data = selectedTransfer.items.map(item => ({
// //       "Transfer ID": `TRN-${selectedTransfer._id.slice(-6).toUpperCase()}`,
// //       "Date": new Date(selectedTransfer.createdAt).toLocaleString(),
// //       "Source": selectedTransfer.fromGodownId?.name || "N/A",
// //       "Destination": selectedTransfer.toGodownId?.name || "N/A",
// //       "Item": item.stockItemId?.name || "N/A",
// //       "Quantity": item.qtyBaseUnit,
// //       "Unit": item.stockItemId?.unitId?.symbol || "units" // Added Unit to Excel
// //     }));

// //     const worksheet = XLSX.utils.json_to_sheet(data);
// //     const workbook = XLSX.utils.book_new();
// //     XLSX.utils.book_append_sheet(workbook, worksheet, "TransferDetails");
// //     XLSX.writeFile(workbook, `Transfer_${selectedTransfer._id.slice(-6)}.xlsx`);
// //     toast.success("Excel Downloaded");
// //   };

// //   const styles = {
// //     pageContainer: { flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', padding: '24px', height: '100vh', fontFamily: 'Inter, sans-serif' },
// //     formBar: { background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'flex-end', position: 'relative', zIndex: 10 },
// //     inputGroup: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, position: 'relative' },
// //     label: { fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
// //     input: (isError) => ({ padding: '10px 12px', borderRadius: '8px', border: isError ? '2px solid #ef4444' : '1px solid #e2e8f0', fontSize: '13px', outline: 'none', background: isError ? '#fef2f2' : '#fff' }),
// //     searchDropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '4px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto', zIndex: 100 },
// //     searchOption: { padding: '10px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' },
// //     postBtn: { background: '#0f172a', color: '#fff', padding: '10px 24px', borderRadius: '8px', border: 'none', fontWeight: '700', cursor: 'pointer' },
// //     contentWrapper: { display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' },
// //     leftList: { width: '350px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
// //     rightDetail: { flex: 1, background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
// //     listItem: (isActive) => ({ padding: '16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: isActive ? '#f0f4ff' : 'transparent', borderLeft: isActive ? '4px solid #6366f1' : '4px solid transparent' }),
// //     tableHeader: { padding: '12px', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid #f1f5f9', textTransform: 'uppercase' },
// //     excelBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
// //     stockBadge: (low) => ({ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: low ? '#fee2e2' : '#f1f5f9', color: low ? '#ef4444' : '#475569', fontWeight: '600' })
// //   };

// //   const isQtyInvalid = Number(form.qtyBaseUnit) > (currentSelectedItem?.qtyBaseUnit || 0);

// //   return (
// //     <div style={styles.pageContainer}>
// //       <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '20px' }}>Transfer <span style={{color: '#6366f1'}}>Stock</span></h1>

// //       <div style={styles.formBar}>
// //         <div style={styles.inputGroup}><label style={styles.label}>Source Godown</label>
// //           <select style={styles.input()} value={form.fromGodownId} onChange={e => setForm({...form, fromGodownId: e.target.value, stockItemId: ""})}>
// //             <option value="">Select Source</option>
// //             {godowns.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
// //           </select>
// //         </div>
        
// //         <div style={styles.inputGroup}><label style={styles.label}>Destination Godown</label>
// //           <select style={styles.input()} value={form.toGodownId} onChange={e => setForm({...form, toGodownId: e.target.value})}>
// //             <option value="">Select Dest.</option>
// //             {godowns.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
// //           </select>
// //         </div>

// //         <div style={{...styles.inputGroup, flex: 1.5}}><label style={styles.label}>Search Item</label>
// //           <div style={{ position: 'relative' }}>
// //             <input 
// //                 style={{...styles.input(), width: '100%', paddingLeft: '35px'}} 
// //                 placeholder={form.fromGodownId ? "Search items in source..." : "Select source godown first"} 
// //                 disabled={!form.fromGodownId}
// //                 value={itemSearch} 
// //                 onFocus={() => setShowItemDropdown(true)} 
// //                 onChange={(e) => setItemSearch(e.target.value)} 
// //             />
// //             <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
// //           </div>
// //           {showItemDropdown && form.fromGodownId && (
// //             <div style={styles.searchDropdown}>
// //               {filteredItems.map(item => (
// //                 <div key={item._id} style={{...styles.searchOption, background: form.stockItemId === item.stockItemId?._id ? '#eef2ff' : '#fff'}}
// //                   onClick={() => { setForm({...form, stockItemId: item.stockItemId?._id}); setItemSearch(item.stockItemId?.name); setShowItemDropdown(false); }}>
// //                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// //                     <span style={{ fontWeight: '600' }}>{item.stockItemId?.name}</span>
// //                     <span style={styles.stockBadge(item.qtyBaseUnit <= 0)}>
// //                        {item.qtyBaseUnit} {item.stockItemId?.unitId?.symbol}
// //                     </span>
// //                   </div>
// //                 </div>
// //               ))}
// //             </div>
// //           )}
// //         </div>

// //         <div style={{...styles.inputGroup, flex: 0.5}}>
// //           <label style={styles.label}>
// //             Qty {currentSelectedItem && `(${currentSelectedItem.stockItemId?.unitId?.symbol})`}
// //           </label>
// //           <input 
// //             type="number" 
// //             style={styles.input(isQtyInvalid)} 
// //             placeholder="0" 
// //             value={form.qtyBaseUnit} 
// //             onChange={e => setForm({...form, qtyBaseUnit: e.target.value})} 
// //           />
// //           {isQtyInvalid && <span style={{color: '#ef4444', fontSize: '10px', fontWeight: '800', marginTop: '2px'}}>INSUFFICIENT!</span>}
// //         </div>

// //         <button 
// //             style={{...styles.postBtn, opacity: (isQtyInvalid || !form.stockItemId) ? 0.6 : 1, cursor: (isQtyInvalid || !form.stockItemId) ? 'not-allowed' : 'pointer'}} 
// //             onClick={handleTransfer}
// //             disabled={isQtyInvalid || !form.stockItemId}
// //         >
// //             Post Transfer
// //         </button>
// //       </div>

// //       <div style={styles.contentWrapper}>
// //         <div style={styles.leftList}>
// //           <div style={{ padding: '16px', background: '#fcfcfe', borderBottom: '1px solid #f1f5f9', fontWeight: '800', fontSize: '11px', color: '#64748b' }}>RECENT ACTIVITY</div>
// //           <div style={{ overflowY: 'auto' }}>
// //             {transfers.map((t) => (
// //               <div key={t._id} style={styles.listItem(selectedTransfer?._id === t._id)} onClick={() => setSelectedTransfer(t)}>
// //                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
// //                   <span style={{ fontWeight: '800', fontSize: '13px' }}>TRN-{t._id.slice(-6).toUpperCase()}</span>
// //                   <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(t.createdAt).toLocaleDateString()}</span>
// //                 </div>
// //                 <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
// //                   {t.fromGodownId?.name} <ArrowRightLeft size={10} /> {t.toGodownId?.name}
// //                 </div>
// //               </div>
// //             ))}
// //           </div>
// //         </div>

// //         <div style={styles.rightDetail}>
// //           {selectedTransfer ? (
// //             <>
// //               <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// //                 <div>
// //                   <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>Transfer Details</h2>
// //                   <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Ref: TRN-{selectedTransfer._id.toUpperCase()}</p>
// //                 </div>
// //                 <button style={styles.excelBtn} onClick={downloadExcel}><FileSpreadsheet size={18} /> Export Excel</button>
// //               </div>
// //               <div style={{ padding: '24px' }}>
// //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// //                   <thead>
// //                     <tr>
// //                       <th style={styles.tableHeader}>Item Name</th>
// //                       <th style={{...styles.tableHeader, textAlign: 'center'}}>Quantity</th>
// //                       <th style={{...styles.tableHeader, textAlign: 'right'}}>Unit</th>
// //                     </tr>
// //                   </thead>
// //                   <tbody>
// //                     {selectedTransfer.items?.map((it, i) => (
// //                       <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
// //                         <td style={{ padding: '16px 12px', fontWeight: '700', fontSize: '14px' }}>{it.stockItemId?.name}</td>
// //                         <td style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '800', color: '#6366f1' }}>{it.qtyBaseUnit}</td>
// //                         <td style={{ padding: '16px 12px', textAlign: 'right', color: '#94a3b8', fontWeight: '600', fontSize: '12px' }}>
// //                           {it.stockItemId?.unitId?.symbol || "units"}
// //                         </td>
// //                       </tr>
// //                     ))}
// //                   </tbody>
// //                 </table>
// //               </div>
// //             </>
// //           ) : (
// //             <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#94a3b8' }}>
// //               Select a transfer to view details
// //             </div>
// //           )}
// //         </div>
// //       </div>
// //     </div>
// //   );
// // };








// // 9-4-2026



// import { useEffect, useState, useCallback, useMemo } from "react";
// import { api } from "../api.js";
// import * as XLSX from "xlsx";
// import { ArrowRightLeft, Search, FileSpreadsheet, Tag } from "lucide-react";
// import { toast } from "react-hot-toast";

// export const TransferStockPage = () => {
//   const [godowns, setGodowns] = useState([]);
//   const [stockGroups, setStockGroups] = useState([]); // New state for Groups
//   const [stockItems, setStockItems] = useState([]); 
//   const [transfers, setTransfers] = useState([]);
//   const [selectedTransfer, setSelectedTransfer] = useState(null);
//   const [itemSearch, setItemSearch] = useState("");
//   const [showItemDropdown, setShowItemDropdown] = useState(false);

//   const [form, setForm] = useState({ 
//     fromGodownId: "", 
//     toGodownId: "", 
//     stockGroupId: "", // New form field
//     stockItemId: "", 
//     qtyBaseUnit: "" 
//   });

//   const loadInitialData = useCallback(async () => {
//     try {
//       const [gRes, tRes, grpRes] = await Promise.all([
//         api.get("/inventory/godowns"), 
//         api.get("/transfers"),
//         api.get("/inventory/stock-groups") // Fetch your stock groups
//       ]);
//       setGodowns(gRes.data || []);
//       setStockGroups(grpRes.data || []);
      
//       const sorted = (tRes.data || []).sort((a, b) => 
//         new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
//       );
//       setTransfers(sorted);
//       if (sorted.length > 0 && !selectedTransfer) setSelectedTransfer(sorted[0]);
//     } catch (error) {
//       toast.error("Failed to fetch initial data");
//     }
//   }, [selectedTransfer]);

//   const loadGodownStock = useCallback(async () => {
//     if (!form.fromGodownId) {
//       setStockItems([]);
//       return;
//     }
//     try {
//       const res = await api.get("/godown-stocks");
//       const currentGodownStock = res.data.filter(s => 
//         (s.godownId?._id || s.godownId) === form.fromGodownId
//       );
//       setStockItems(currentGodownStock);
//     } catch (error) {
//       toast.error("Failed to fetch godown stock levels");
//     }
//   }, [form.fromGodownId]);

//   useEffect(() => { loadInitialData(); }, [loadInitialData]);
//   useEffect(() => { loadGodownStock(); }, [loadGodownStock]);

//   const currentSelectedItem = useMemo(() => {
//     return stockItems.find(item => (item.stockItemId?._id || item.stockItemId) === form.stockItemId);
//   }, [stockItems, form.stockItemId]);

//   // Updated filtering logic to include Stock Group check
//   const filteredItems = useMemo(() => {
//     return stockItems.filter(item => {
//       const matchesSearch = (item.stockItemId?.name || "").toLowerCase().includes(itemSearch.toLowerCase());
//       const matchesGroup = form.stockGroupId 
//         ? (item.stockItemId?.stockGroupId?._id || item.stockItemId?.stockGroupId) === form.stockGroupId 
//         : true;
//       return matchesSearch && matchesGroup;
//     });
//   }, [stockItems, itemSearch, form.stockGroupId]);

//   const handleTransfer = async () => {
//     const qty = Number(form.qtyBaseUnit);
//     if (!form.fromGodownId || !form.toGodownId || !form.stockItemId || !form.qtyBaseUnit) {
//       toast.error("Please fill all fields");
//       return;
//     }
//     if (form.fromGodownId === form.toGodownId) {
//       toast.error("Source and Destination cannot be the same");
//       return;
//     }

//     const available = currentSelectedItem?.qtyBaseUnit || 0;
//     if (qty <= 0) {
//         toast.error("Quantity must be greater than 0");
//         return;
//     }
//     if (qty > available) {
//       toast.error(`Insufficient Stock! Available: ${available}`);
//       return;
//     }

//     try {
//       await api.post("/transfers", {
//         fromGodownId: form.fromGodownId,
//         toGodownId: form.toGodownId,
//         items: [{ stockItemId: form.stockItemId, qtyBaseUnit: qty }]
//       });
      
//       toast.success("Transfer Posted Successfully");
//       setForm({ ...form, stockItemId: "", qtyBaseUnit: "" });
//       setItemSearch("");
//       loadInitialData();
//       loadGodownStock(); 
//     } catch (error) {
//       toast.error(error.response?.data?.error || "Transfer failed");
//     }
//   };

//   const downloadExcel = () => {
//     if (!selectedTransfer) return;
//     const data = selectedTransfer.items.map(item => ({
//       "Transfer ID": `TRN-${selectedTransfer._id.slice(-6).toUpperCase()}`,
//       "Date": new Date(selectedTransfer.createdAt).toLocaleString(),
//       "Source": selectedTransfer.fromGodownId?.name || "N/A",
//       "Destination": selectedTransfer.toGodownId?.name || "N/A",
//       "Item": item.stockItemId?.name || "N/A",
//       "Quantity": item.qtyBaseUnit,
//       "Unit": item.stockItemId?.unitId?.symbol || "units"
//     }));

//     const worksheet = XLSX.utils.json_to_sheet(data);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, "TransferDetails");
//     XLSX.writeFile(workbook, `Transfer_${selectedTransfer._id.slice(-6)}.xlsx`);
//     toast.success("Excel Downloaded");
//   };

//   const styles = {
//     pageContainer: { flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', padding: '24px', height: '100vh', fontFamily: 'Inter, sans-serif' },
//     formBar: { background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'flex-end', position: 'relative', zIndex: 10 },
//     inputGroup: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, position: 'relative' },
//     label: { fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
//     input: (isError) => ({ padding: '10px 12px', borderRadius: '8px', border: isError ? '2px solid #ef4444' : '1px solid #e2e8f0', fontSize: '13px', outline: 'none', background: isError ? '#fef2f2' : '#fff' }),
//     searchDropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '4px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto', zIndex: 100 },
//     searchOption: { padding: '10px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' },
//     postBtn: { background: '#0f172a', color: '#fff', padding: '10px 24px', borderRadius: '8px', border: 'none', fontWeight: '700', cursor: 'pointer' },
//     contentWrapper: { display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' },
//     leftList: { width: '350px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
//     rightDetail: { flex: 1, background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
//     listItem: (isActive) => ({ padding: '16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: isActive ? '#f0f4ff' : 'transparent', borderLeft: isActive ? '4px solid #6366f1' : '4px solid transparent' }),
//     tableHeader: { padding: '12px', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid #f1f5f9', textTransform: 'uppercase' },
//     excelBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
//     stockBadge: (low) => ({ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: low ? '#fee2e2' : '#f1f5f9', color: low ? '#ef4444' : '#475569', fontWeight: '600' })
//   };

//   const isQtyInvalid = Number(form.qtyBaseUnit) > (currentSelectedItem?.qtyBaseUnit || 0);

//   return (
//     <div style={styles.pageContainer}>
//       <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '20px' }}>Transfer <span style={{color: '#6366f1'}}>Stock</span></h1>

//       <div style={styles.formBar}>
//         <div style={styles.inputGroup}><label style={styles.label}>Source Godown</label>
//           <select style={styles.input()} value={form.fromGodownId} onChange={e => setForm({...form, fromGodownId: e.target.value, stockItemId: "", itemSearch: ""})}>
//             <option value="">Select Source</option>
//             {godowns.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
//           </select>
//         </div>
        
//         <div style={styles.inputGroup}><label style={styles.label}>Destination Godown</label>
//           <select style={styles.input()} value={form.toGodownId} onChange={e => setForm({...form, toGodownId: e.target.value})}>
//             <option value="">Select Dest.</option>
//             {godowns.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
//           </select>
//         </div>

//         {/* NEW: Stock Group Filter */}
//         <div style={styles.inputGroup}><label style={styles.label}>Stock Group</label>
//           <select 
//             style={styles.input()} 
//             value={form.stockGroupId} 
//             onChange={e => {
//                 setForm({...form, stockGroupId: e.target.value, stockItemId: ""});
//                 setItemSearch("");
//             }}
//           >
//             <option value="">All Groups</option>
//             {stockGroups.map(grp => <option key={grp._id} value={grp._id}>{grp.name}</option>)}
//           </select>
//         </div>

//         <div style={{...styles.inputGroup, flex: 1.5}}><label style={styles.label}>Search Item</label>
//           <div style={{ position: 'relative' }}>
//             <input 
//                 style={{...styles.input(), width: '100%', paddingLeft: '35px'}} 
//                 placeholder={form.fromGodownId ? "Search items..." : "Select source first"} 
//                 disabled={!form.fromGodownId}
//                 value={itemSearch} 
//                 onFocus={() => setShowItemDropdown(true)} 
//                 onChange={(e) => setItemSearch(e.target.value)} 
//             />
//             <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
//           </div>
//           {showItemDropdown && form.fromGodownId && (
//             <div style={styles.searchDropdown}>
//               {filteredItems.length > 0 ? filteredItems.map(item => (
//                 <div key={item._id} style={{...styles.searchOption, background: form.stockItemId === item.stockItemId?._id ? '#eef2ff' : '#fff'}}
//                   onClick={() => { setForm({...form, stockItemId: item.stockItemId?._id}); setItemSearch(item.stockItemId?.name); setShowItemDropdown(false); }}>
//                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//                     <div>
//                         <div style={{ fontWeight: '600' }}>{item.stockItemId?.name}</div>
//                         <div style={{ fontSize: '10px', color: '#94a3b8' }}>{item.stockItemId?.stockGroupId?.name || "General"}</div>
//                     </div>
//                     <span style={styles.stockBadge(item.qtyBaseUnit <= 0)}>
//                        {item.qtyBaseUnit} {item.stockItemId?.unitId?.symbol}
//                     </span>
//                   </div>
//                 </div>
//               )) : <div style={{padding: '10px', fontSize: '12px', color: '#94a3b8'}}>No items found in this group</div>}
//             </div>
//           )}
//         </div>

//         <div style={{...styles.inputGroup, flex: 0.5}}>
//           <label style={styles.label}>Qty</label>
//           <input 
//             type="number" 
//             style={styles.input(isQtyInvalid)} 
//             placeholder="0" 
//             value={form.qtyBaseUnit} 
//             onChange={e => setForm({...form, qtyBaseUnit: e.target.value})} 
//           />
//         </div>

//         <button 
//             style={{...styles.postBtn, opacity: (isQtyInvalid || !form.stockItemId) ? 0.6 : 1}} 
//             onClick={handleTransfer}
//             disabled={isQtyInvalid || !form.stockItemId}
//         >
//             Post Transfer
//         </button>
//       </div>

//       <div style={styles.contentWrapper}>
//         <div style={styles.leftList}>
//           <div style={{ padding: '16px', background: '#fcfcfe', borderBottom: '1px solid #f1f5f9', fontWeight: '800', fontSize: '11px', color: '#64748b' }}>RECENT ACTIVITY</div>
//           <div style={{ overflowY: 'auto' }}>
//             {transfers.map((t) => (
//               <div key={t._id} style={styles.listItem(selectedTransfer?._id === t._id)} onClick={() => setSelectedTransfer(t)}>
//                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
//                   <span style={{ fontWeight: '800', fontSize: '13px' }}>TRN-{t._id.slice(-6).toUpperCase()}</span>
//                   <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(t.createdAt).toLocaleDateString()}</span>
//                 </div>
//                 <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
//                   {t.fromGodownId?.name} <ArrowRightLeft size={10} /> {t.toGodownId?.name}
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>

//         <div style={styles.rightDetail}>
//           {selectedTransfer ? (
//             <>
//               <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//                 <div>
//                   <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>Transfer Details</h2>
//                   <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Ref: TRN-{selectedTransfer._id.toUpperCase()}</p>
//                 </div>
//                 <button style={styles.excelBtn} onClick={downloadExcel}><FileSpreadsheet size={18} /> Export Excel</button>
//               </div>
//               <div style={{ padding: '24px' }}>
//                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//                   <thead>
//                     <tr>
//                       <th style={styles.tableHeader}>Item Name</th>
//                       <th style={{...styles.tableHeader, textAlign: 'center'}}>Quantity</th>
//                       <th style={{...styles.tableHeader, textAlign: 'right'}}>Unit</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {selectedTransfer.items?.map((it, i) => (
//                       <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
//                         <td style={{ padding: '16px 12px', fontWeight: '700', fontSize: '14px' }}>{it.stockItemId?.name}</td>
//                         <td style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '800', color: '#6366f1' }}>{it.qtyBaseUnit}</td>
//                         <td style={{ padding: '16px 12px', textAlign: 'right', color: '#94a3b8', fontWeight: '600', fontSize: '12px' }}>
//                           {it.stockItemId?.unitId?.symbol || "units"}
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </>
//           ) : (
//             <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#94a3b8' }}>
//               Select a transfer to view details
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };






import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../api.js";
import * as XLSX from "xlsx";
import { ArrowRightLeft, Search, FileSpreadsheet, Tag } from "lucide-react";
import { toast } from "react-hot-toast";

export const TransferStockPage = () => {
  const [godowns, setGodowns] = useState([]);
  const [stockGroups, setStockGroups] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [itemSearch, setItemSearch] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  const [form, setForm] = useState({
    fromGodownId: "",
    toGodownId: "",
    stockGroupId: "",
    stockItemId: "",
    qtyBaseUnit: ""
  });

  const loadInitialData = useCallback(async () => {
    try {
      const [gRes, tRes, grpRes] = await Promise.all([
        api.get("/inventory/godowns"),
        api.get("/transfers"),
        api.get("/inventory/stock-groups")
      ]);
      setGodowns(gRes.data || []);
      setStockGroups(grpRes.data || []);

      const sorted = (tRes.data || []).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setTransfers(sorted);
      if (sorted.length > 0 && !selectedTransfer) setSelectedTransfer(sorted[0]);
    } catch (error) {
      toast.error("Failed to fetch initial data");
    }
  }, [selectedTransfer]);

  const loadGodownStock = useCallback(async () => {
    if (!form.fromGodownId) {
      setStockItems([]);
      return;
    }
    try {
      const res = await api.get("/godown-stocks");
      const currentGodownStock = res.data.filter(s =>
        (s.godownId?._id || s.godownId) === form.fromGodownId
      );
      setStockItems(currentGodownStock);
    } catch (error) {
      toast.error("Failed to fetch godown stock levels");
    }
  }, [form.fromGodownId]);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);
  useEffect(() => { loadGodownStock(); }, [loadGodownStock]);

  const currentSelectedItem = useMemo(() => {
    return stockItems.find(item => (item.stockItemId?._id || item.stockItemId) === form.stockItemId);
  }, [stockItems, form.stockItemId]);

  const filteredItems = useMemo(() => {
    return stockItems.filter(item => {
      const matchesSearch = (item.stockItemId?.name || "").toLowerCase().includes(itemSearch.toLowerCase());
      const matchesGroup = form.stockGroupId
        ? (item.stockItemId?.stockGroupId?._id || item.stockItemId?.stockGroupId) === form.stockGroupId
        : true;
      return matchesSearch && matchesGroup;
    });
  }, [stockItems, itemSearch, form.stockGroupId]);

  const handleTransfer = async () => {
    const qty = Number(form.qtyBaseUnit);
    if (!form.fromGodownId || !form.toGodownId || !form.stockItemId || !form.qtyBaseUnit) {
      toast.error("Please fill all fields");
      return;
    }
    if (form.fromGodownId === form.toGodownId) {
      toast.error("Source and Destination cannot be the same");
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
      await api.post("/transfers", {
        fromGodownId: form.fromGodownId,
        toGodownId: form.toGodownId,
        items: [{ stockItemId: form.stockItemId, qtyBaseUnit: qty }]
      });

      toast.success("Transfer Posted Successfully");
      setForm({ ...form, stockItemId: "", qtyBaseUnit: "" });
      setItemSearch("");
      loadInitialData();
      loadGodownStock();
    } catch (error) {
      toast.error(error.response?.data?.error || "Transfer failed");
    }
  };

  const downloadExcel = () => {
    if (!selectedTransfer) return;
    const data = selectedTransfer.items.map(item => ({
      "Transfer ID": `TRN-${selectedTransfer._id.slice(-6).toUpperCase()}`,
      "Date": new Date(selectedTransfer.createdAt).toLocaleString(),
      "Source": selectedTransfer.fromGodownId?.name || "N/A",
      "Destination": selectedTransfer.toGodownId?.name || "N/A",
      "Item": item.stockItemId?.name || "N/A",
      "Group": item.stockItemId?.stockGroupId?.name || "General",
      "Quantity": item.qtyBaseUnit,
      "Unit": item.stockItemId?.unitId?.symbol || "units"
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "TransferDetails");
    XLSX.writeFile(workbook, `Transfer_${selectedTransfer._id.slice(-6)}.xlsx`);
    toast.success("Excel Downloaded");
  };

  const styles = {
    pageContainer: { flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', padding: '24px', height: '100vh', fontFamily: 'Inter, sans-serif' },
    formBar: { background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'flex-end', position: 'relative', zIndex: 10 },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, position: 'relative' },
    label: { fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
    input: (isError) => ({ padding: '10px 12px', borderRadius: '8px', border: isError ? '2px solid #ef4444' : '1px solid #e2e8f0', fontSize: '13px', outline: 'none', background: isError ? '#fef2f2' : '#fff' }),
    searchDropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '4px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto', zIndex: 100 },
    searchOption: { padding: '10px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' },
    postBtn: { background: '#0f172a', color: '#fff', padding: '10px 24px', borderRadius: '8px', border: 'none', fontWeight: '700', cursor: 'pointer' },
    contentWrapper: { display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' },
    leftList: { width: '350px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    rightDetail: { flex: 1, background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    listItem: (isActive) => ({ padding: '16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: isActive ? '#f0f4ff' : 'transparent', borderLeft: isActive ? '4px solid #6366f1' : '4px solid transparent' }),
    tableHeader: { padding: '12px', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid #f1f5f9', textTransform: 'uppercase' },
    excelBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
    stockBadge: (low) => ({ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: low ? '#fee2e2' : '#f1f5f9', color: low ? '#ef4444' : '#475569', fontWeight: '600' }),
    groupBadge: { fontSize: '10px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', color: '#64748b', fontWeight: '600', border: '1px solid #e2e8f0' }
  };

  const isQtyInvalid = Number(form.qtyBaseUnit) > (currentSelectedItem?.qtyBaseUnit || 0);

  return (
    <div style={styles.pageContainer}>
      <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '20px' }}>Transfer <span style={{ color: '#6366f1' }}>Stock</span></h1>

      <div style={styles.formBar}>
        <div style={styles.inputGroup}><label style={styles.label}>Source Godown</label>
          <select style={styles.input()} value={form.fromGodownId} onChange={e => setForm({ ...form, fromGodownId: e.target.value, stockItemId: "", itemSearch: "" })}>
            <option value="">Select Source</option>
            {godowns.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
          </select>
        </div>

        <div style={styles.inputGroup}><label style={styles.label}>Destination Godown</label>
          <select style={styles.input()} value={form.toGodownId} onChange={e => setForm({ ...form, toGodownId: e.target.value })}>
            <option value="">Select Dest.</option>
            {godowns.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
          </select>
        </div>

        <div style={styles.inputGroup}><label style={styles.label}>Stock Group Filter</label>
          <select
            style={styles.input()}
            value={form.stockGroupId}
            onChange={e => {
              setForm({ ...form, stockGroupId: e.target.value, stockItemId: "" });
              setItemSearch("");
            }}
          >
            <option value="">All Groups</option>
            {stockGroups.map(grp => <option key={grp._id} value={grp._id}>{grp.name}</option>)}
          </select>
        </div>

        <div style={{ ...styles.inputGroup, flex: 1.5 }}><label style={styles.label}>Search Item</label>
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...styles.input(), width: '100%', paddingLeft: '35px' }}
              placeholder={form.fromGodownId ? "Search items..." : "Select source first"}
              disabled={!form.fromGodownId}
              value={itemSearch}
              onFocus={() => setShowItemDropdown(true)}
              onChange={(e) => setItemSearch(e.target.value)}
            />
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
          </div>
          {showItemDropdown && form.fromGodownId && (
            <div style={styles.searchDropdown}>
              {filteredItems.length > 0 ? filteredItems.map(item => (
                <div key={item._id} style={{ ...styles.searchOption, background: form.stockItemId === item.stockItemId?._id ? '#eef2ff' : '#fff' }}
                  onClick={() => { setForm({ ...form, stockItemId: item.stockItemId?._id }); setItemSearch(item.stockItemId?.name); setShowItemDropdown(false); }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600' }}>{item.stockItemId?.name}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{item.stockItemId?.stockGroupId?.name || "General"}</div>
                    </div>
                    <span style={styles.stockBadge(item.qtyBaseUnit <= 0)}>
                      {item.qtyBaseUnit} {item.stockItemId?.unitId?.symbol}
                    </span>
                  </div>
                </div>
              )) : <div style={{ padding: '10px', fontSize: '12px', color: '#94a3b8' }}>No items found</div>}
            </div>
          )}
        </div>

        <div style={{ ...styles.inputGroup, flex: 0.5 }}>
          <label style={styles.label}>Qty</label>
          <input
            type="number"
            style={styles.input(isQtyInvalid)}
            placeholder="0"
            value={form.qtyBaseUnit}
            onChange={e => setForm({ ...form, qtyBaseUnit: e.target.value })}
          />
        </div>

        <button
          style={{ ...styles.postBtn, opacity: (isQtyInvalid || !form.stockItemId) ? 0.6 : 1 }}
          onClick={handleTransfer}
          disabled={isQtyInvalid || !form.stockItemId}
        >
          Post Transfer
        </button>
      </div>

      <div style={styles.contentWrapper}>
        <div style={styles.leftList}>
          <div style={{ padding: '16px', background: '#fcfcfe', borderBottom: '1px solid #f1f5f9', fontWeight: '800', fontSize: '11px', color: '#64748b' }}>RECENT ACTIVITY</div>
          <div style={{ overflowY: 'auto' }}>
            {transfers.map((t) => (
              <div key={t._id} style={styles.listItem(selectedTransfer?._id === t._id)} onClick={() => setSelectedTransfer(t)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '800', fontSize: '13px' }}>TRN-{t._id.slice(-6).toUpperCase()}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {t.fromGodownId?.name} <ArrowRightLeft size={10} /> {t.toGodownId?.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.rightDetail}>
          {selectedTransfer ? (
            <>
              <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>Transfer Details</h2>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Ref: TRN-{selectedTransfer._id.toUpperCase()}</p>
                </div>
                <button style={styles.excelBtn} onClick={downloadExcel}><FileSpreadsheet size={18} /> Export Excel</button>
              </div>
              <div style={{ padding: '24px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={styles.tableHeader}>Item Name</th>
                      <th style={styles.tableHeader}>Stock Group</th>
                      <th style={{ ...styles.tableHeader, textAlign: 'center' }}>Quantity</th>
                      <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTransfer.items?.map((it, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '16px 12px', fontWeight: '700', fontSize: '14px' }}>
                          {it.stockItemId?.name}
                        </td>
                        <td style={{ padding: '16px 12px' }}>
                          <span style={styles.groupBadge}>
                            {it.stockItemId?.stockGroupId?.name || "General"}
                          </span>
                        </td>
                        <td style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '800', color: '#6366f1' }}>
                          {it.qtyBaseUnit}
                        </td>
                        <td style={{ padding: '16px 12px', textAlign: 'right', color: '#94a3b8', fontWeight: '600', fontSize: '12px' }}>
                          {it.stockItemId?.unitId?.symbol || "units"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#94a3b8' }}>
              Select a transfer to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};