
// import { useEffect, useMemo, useState, useCallback } from "react";
// import { api } from "../api.js";
// import { useToast } from "../toast.jsx";
// import * as XLSX from 'xlsx'; // 1. Added XLSX Import
// import { 
//   Search, FileSpreadsheet, Plus, Trash2, Edit3, 
//   Package, Layers, MapPin, Ruler, Upload, Loader2 
// } from "lucide-react";

// const tabs = [
//   { key: "stock-groups", label: "Stock Groups", icon: Layers },
//   { key: "units", label: "Units & Sub-units", icon: Ruler },
//   { key: "stock-items", label: "Stock Items", icon: Package },
//   { key: "godowns", label: "Godowns", icon: MapPin }
// ];

// export const InventoryPage = () => {
//   const { showToast } = useToast();
//   const [tab, setTab] = useState("stock-groups");
//   const [rows, setRows] = useState([]);
//   const [q, setQ] = useState("");
//   const [form, setForm] = useState({ 
//     name: "", symbol: "", stockGroupId: "", subName: "", 
//     factor: "", imageUrl: "", unitId: "", defaultThreshold: "" 
//   });
//   const [meta, setMeta] = useState({ stockGroups: [], units: [] });
//   const [editingId, setEditingId] = useState("");
//   const [editName, setEditName] = useState("");
//   const [uploading, setUploading] = useState(false);

//   // Filtered list of units based on selected Stock Group
//   const filteredUnits = useMemo(() => {
//     if (!form.stockGroupId) return [];
//     return meta.units.filter(u => 
//       u.stockGroupId?._id === form.stockGroupId || u.stockGroupId === form.stockGroupId
//     );
//   }, [meta.units, form.stockGroupId]);

//   // Auto-select first unit when group changes
//   useEffect(() => {
//     if (tab === "stock-items") {
//       if (filteredUnits.length > 0) {
//         setForm(prev => ({ ...prev, unitId: filteredUnits[0]._id }));
//       } else {
//         setForm(prev => ({ ...prev, unitId: "" }));
//       }
//     }
//   }, [filteredUnits, tab]);

//   const load = useCallback(async () => {
//     try {
//       const res = await api.get(`/inventory/${tab}`, { params: { q } });
//       setRows(res.data || []);
//     } catch (error) {
//       showToast("Failed to load data", "error");
//     }
//   }, [tab, q, showToast]);

//   const refreshMeta = useCallback(async () => {
//     try {
//       const [groupsRes, unitsRes] = await Promise.all([
//         api.get("/inventory/stock-groups"),
//         api.get("/inventory/units")
//       ]);
//       setMeta({ stockGroups: groupsRes.data, units: unitsRes.data });
//     } catch (error) {
//       console.error("Meta fetch error", error);
//     }
//   }, []);

//   useEffect(() => { load(); }, [load]);
//   useEffect(() => { refreshMeta(); }, [refreshMeta]);

//   // --- EXPORT LOGIC ---
//   const handleExport = () => {
//     if (rows.length === 0) {
//       return showToast("No data to export", "error");
//     }

//     const dataToExport = rows.map(row => {
//       const baseData = {
//         ID: row._id,
//         Name: row.name,
//       };

//       if (tab === "units") {
//         return { 
//           ...baseData, 
//           Symbol: row.symbol, 
//           Group: row.stockGroupId?.name || 'Unassigned' 
//         };
//       }

//       if (tab === "stock-items") {
//         return { 
//           ...baseData, 
//           Unit: row.unitId?.symbol || 'N/A', 
//           Group: row.stockGroupId?.name || 'Unassigned',
//           Threshold: row.defaultThreshold || 0
//         };
//       }

//       return baseData;
//     });

//     const worksheet = XLSX.utils.json_to_sheet(dataToExport);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, tab);
//     XLSX.writeFile(workbook, `Inventory_${tab}_${new Date().toLocaleDateString()}.xlsx`);
//     showToast("Excel file downloaded", "success");
//   };

//   const handleImageUpload = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;
//     setUploading(true);
//     const formData = new FormData();
//     formData.append("image", file);
//     try {
//       const res = await api.post("/inventory/stock-items/upload-image", formData);
//       setForm(prev => ({ ...prev, imageUrl: res.data.imageUrl }));
//       showToast("Image uploaded successfully", "success");
//     } catch (error) {
//       showToast("Image upload failed", "error");
//     } finally {
//       setUploading(false);
//     }
//   };

//   const addRow = async () => {
//     try {
//       if (!form.name?.trim()) return showToast("Name is required", "error");
      
//       const payload = tab === "stock-groups" || tab === "godowns" 
//         ? { name: form.name }
//         : tab === "units" 
//         ? { 
//             name: form.name, 
//             symbol: form.symbol, 
//             stockGroupId: form.stockGroupId,
//             subUnits: form.subName ? [{ name: form.subName, factorToBase: Number(form.factor || 1) }] : [] 
//           }
//         : { 
//             name: form.name, 
//             imageUrl: form.imageUrl, 
//             stockGroupId: form.stockGroupId, 
//             unitId: form.unitId, 
//             defaultThreshold: 0 
//           };

//       await api.post(`/inventory/${tab}`, payload);
//       showToast("Added successfully", "success");
//       setForm({ name: "", symbol: "", stockGroupId: "", subName: "", factor: "", imageUrl: "", unitId: "", defaultThreshold: "" });
//       load();
//       refreshMeta();
//     } catch (error) {
//       showToast(error?.response?.data?.message || "Action failed", "error");
//     }
//   };

//   const removeRow = async (id) => {
//     if (!window.confirm("Delete this item?")) return;
//     try {
//       await api.delete(`/inventory/${tab}/${id}`);
//       showToast("Deleted", "success");
//       load();
//     } catch (error) {
//       showToast("Delete failed", "error");
//     }
//   };

//   const saveEdit = async (id) => {
//     try {
//       await api.put(`/inventory/${tab}/${id}`, { name: editName });
//       setEditingId("");
//       load();
//       showToast("Updated", "success");
//     } catch (error) {
//       showToast("Update failed", "error");
//     }
//   };

//   return (
//     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
//       {/* Header Area */}
//       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//         <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
//            <span style={{ color: '#6366f1', fontWeight: '500' }}>Inventory Management</span>
//         </h1>
        
//         <div style={{ display: 'flex', gap: '12px' }}>
//           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
//             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
//             <input 
//               type="text"
//               placeholder="Search items..."
//               value={q}
//               onChange={(e) => setQ(e.target.value)}
//               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', fontWeight: '600', width: '200px', outline: 'none' }}
//             />
//           </div>
//           <button 
//             onClick={handleExport}
//             style={{ background: '#10b981', border: 'none', color: '#fff', padding: '0 16px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
//           >
//             <FileSpreadsheet size={16} /> Export
//           </button>
//         </div>
//       </div>

//       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
//         {/* Sidebar Tabs */}
//         <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
//           <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>CATEGORIES</div>
//           {tabs.map((t) => (
//             <div 
//               key={t.key}
//               onClick={() => { setTab(t.key); setQ(""); }}
//               style={{
//                 padding: '14px 18px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
//                 background: tab === t.key ? '#fff' : 'transparent',
//                 color: tab === t.key ? '#6366f1' : '#64748b',
//                 border: tab === t.key ? '1px solid #6366f1' : '1px solid transparent',
//                 boxShadow: tab === t.key ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
//                 transition: 'all 0.2s', fontWeight: '700', fontSize: '14px'
//               }}
//             >
//               <t.icon size={18} strokeWidth={tab === t.key ? 2.5 : 2} />
//               {t.label}
//             </div>
//           ))}
//         </div>

//         {/* Main Content Card */}
//         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          
//           {/* Quick Add Form Header */}
//           <div style={{ padding: '24px 32px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
//             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
//               <div style={{ flex: 1, minWidth: '200px' }}>
//                 <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '6px' }}>NAME</label>
//                 <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '600' }} placeholder="Enter name..." value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
//               </div>

//               {tab === "stock-items" && (
//                 <>
//                   <div style={{ width: '150px' }}>
//                     <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '6px' }}>ASSIGN TO GROUP</label>
//                     <select style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '600' }} value={form.stockGroupId} onChange={(e) => setForm({...form, stockGroupId: e.target.value})}>
//                       <option value="">Select Group...</option>
//                       {meta.stockGroups.map(sg => <option key={sg._id} value={sg._id}>{sg.name}</option>)}
//                     </select>
//                   </div>

//                   <div style={{ width: '150px' }}>
//                     <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '6px' }}>UNIT</label>
//                     <select 
//                       style={{ 
//                         width: '100%', padding: '10px', borderRadius: '8px', 
//                         border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '600',
//                         background: !form.stockGroupId ? '#f8fafc' : '#fff'
//                       }} 
//                       value={form.unitId} 
//                       disabled={!form.stockGroupId}
//                       onChange={(e) => setForm({...form, unitId: e.target.value})}
//                     >
//                       {!form.stockGroupId ? (
//                         <option value="">Select Group First</option>
//                       ) : (
//                         filteredUnits.map(u => <option key={u._id} value={u._id}>{u.symbol}</option>)
//                       )}
//                     </select>
//                   </div>

//                   <div style={{ width: '180px' }}>
//                     <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '6px' }}>IMAGE</label>
//                     <div style={{ position: 'relative' }}>
//                       <input 
//                         type="file" 
//                         accept="image/*"
//                         onChange={handleImageUpload}
//                         style={{ display: 'none' }} 
//                         id="file-upload" 
//                       />
//                       <label 
//                         htmlFor="file-upload" 
//                         style={{ 
//                           display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', 
//                           background: form.imageUrl ? '#f0fdf4' : '#fff', 
//                           border: form.imageUrl ? '1px solid #22c55e' : '1px solid #e2e8f0',
//                           borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', color: form.imageUrl ? '#16a34a' : '#64748b'
//                         }}
//                       >
//                         {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
//                         {form.imageUrl ? "Uploaded" : "Choose File"}
//                       </label>
//                     </div>
//                   </div>
//                 </>
//               )}

//               {tab === "units" && (
//                 <div style={{ width: '150px' }}>
//                   <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '6px' }}>ASSIGN TO GROUP</label>
//                   <select style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '600' }} value={form.stockGroupId} onChange={(e) => setForm({...form, stockGroupId: e.target.value})}>
//                     <option value="">Select Group...</option>
//                     {meta.stockGroups.map(sg => <option key={sg._id} value={sg._id}>{sg.name}</option>)}
//                   </select>
//                 </div>
//               )}

//               {tab === "units" && (
//                 <div style={{ width: '100px' }}>
//                   <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '6px' }}>SYMBOL</label>
//                   <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '600' }} placeholder="e.g. Kg" value={form.symbol} onChange={(e) => setForm({...form, symbol: e.target.value})} />
//                 </div>
//               )}

//               <button onClick={addRow} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '11px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
//                 <Plus size={16} /> Add {tabs.find(t => t.key === tab).label.split(' ')[0]}
//               </button>
//             </div>
//           </div>

//           {/* List Section */}
//           <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px' }}>
//             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//               <thead>
//                 <tr style={{ textAlign: 'left' }}>
//                   <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>DETAILS</th>
//                   {tab !== "stock-items" && (
//                     <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
//                       {tab === "units" ? "GROUP ASSIGNMENT" : ""}
//                     </th>
//                   )}
//                   <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>ACTIONS</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {rows.map((row) => (
//                   <tr key={row._id}>
//                     <td style={{ padding: '16px 0', borderBottom: '1px solid #f8fafc' }}>
//                       <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
//                         {tab === "stock-items" && (
//                           <div style={{ width: '40px', height: '40px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
//                             {row.imageUrl ? <img src={row.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="item" /> : <Package size={20} color="#cbd5e1" />}
//                           </div>
//                         )}
//                         <div>
//                           {editingId === row._id ? (
//                             <input autoFocus style={{ padding: '4px 8px', borderRadius: '4px', border: '2px solid #6366f1', outline: 'none', fontWeight: '700' }} value={editName} onChange={(e) => setEditName(e.target.value)} />
//                           ) : (
//                             <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
//                               {row.name} {row.symbol && <span style={{ color: '#6366f1', fontSize: '12px' }}>({row.symbol})</span>}
//                               {tab === "stock-items" && (
//                                 <span style={{ marginLeft: '10px', display: 'inline-flex', gap: '6px' }}>
//                                   <span style={{ fontSize: '10px', color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: '100px', border: '1px solid #e0e7ff' }}>
//                                     {row.unitId?.symbol || 'No Unit'}
//                                   </span>
//                                   <span style={{ fontSize: '10px', color: '#475569', background: '#f8fafc', padding: '2px 8px', borderRadius: '100px', border: '1px solid #f1f5f9' }}>
//                                     {row.stockGroupId?.name || 'Unassigned'}
//                                   </span>
//                                 </span>
//                               )}
//                             </div>
//                           )}
//                           <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>ID: {row._id.slice(-6).toUpperCase()}</div>
//                         </div>
//                       </div>
//                     </td>

//                     {tab !== "stock-items" && (
//                       <td style={{ padding: '16px 0', borderBottom: '1px solid #f8fafc' }}>
//                         <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
//                           {tab === "units" && <span>{row.stockGroupId?.name || 'Unassigned'}</span>}
//                         </div>
//                       </td>
//                     )}

//                     <td style={{ padding: '16px 0', textAlign: 'right', borderBottom: '1px solid #f8fafc' }}>
//                       <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
//                         {editingId === row._id ? (
//                           <button onClick={() => saveEdit(row._id)} style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '800' }}>SAVE</button>
//                         ) : (
//                           <button onClick={() => { setEditingId(row._id); setEditName(row.name); }} style={{ padding: '8px', color: '#6366f1', background: '#f5f3ff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}><Edit3 size={14} /></button>
//                         )}
//                         <button onClick={() => removeRow(row._id)} style={{ padding: '8px', color: '#ef4444', background: '#fef2f2', border: 'none', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={14} /></button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };





// // 10-4-2026





// // import { useEffect, useMemo, useState, useCallback } from "react";
// // import { api } from "../api.js";
// // import { useToast } from "../toast.jsx";
// // import * as XLSX from 'xlsx';
// // import { 
// //   Search, FileSpreadsheet, Plus, Trash2, Edit3, 
// //   Package, Layers, MapPin, Ruler, Upload, Loader2 
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
// //     factor: "", imageUrl: "", unitId: "", defaultThreshold: "",
// //     isDecimalAllowed: false 
// //   });
// //   const [meta, setMeta] = useState({ stockGroups: [], units: [] });
// //   const [editingId, setEditingId] = useState("");
// //   const [editName, setEditName] = useState("");
// //   const [uploading, setUploading] = useState(false);

// //   // Filtered list of units based on selected Stock Group
// //   const filteredUnits = useMemo(() => {
// //     if (!form.stockGroupId) return [];
// //     return meta.units.filter(u => 
// //       u.stockGroupId?._id === form.stockGroupId || u.stockGroupId === form.stockGroupId
// //     );
// //   }, [meta.units, form.stockGroupId]);

// //   // Auto-select first unit when group changes
// //   useEffect(() => {
// //     if (tab === "stock-items") {
// //       if (filteredUnits.length > 0) {
// //         setForm(prev => ({ ...prev, unitId: filteredUnits[0]._id }));
// //       } else {
// //         setForm(prev => ({ ...prev, unitId: "" }));
// //       }
// //     }
// //   }, [filteredUnits, tab]);

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

// //   // --- EXPORT LOGIC ---
// //   const handleExport = () => {
// //     if (rows.length === 0) {
// //       return showToast("No data to export", "error");
// //     }

// //     const dataToExport = rows.map(row => {
// //       const baseData = {
// //         ID: row._id,
// //         Name: row.name,
// //       };

// //       if (tab === "units") {
// //         return { 
// //           ...baseData, 
// //           Symbol: row.symbol, 
// //           Group: row.stockGroupId?.name || 'Unassigned' 
// //         };
// //       }

// //       if (tab === "stock-items") {
// //         return { 
// //           ...baseData, 
// //           Unit: row.unitId?.symbol || 'N/A', 
// //           Group: row.stockGroupId?.name || 'Unassigned',
// //           Threshold: row.defaultThreshold || 0,
// //           Decimal_Enabled: row.isDecimalAllowed ? "Yes" : "No"
// //         };
// //       }

// //       return baseData;
// //     });

// //     const worksheet = XLSX.utils.json_to_sheet(dataToExport);
// //     const workbook = XLSX.utils.book_new();
// //     XLSX.utils.book_append_sheet(workbook, worksheet, tab);
// //     XLSX.writeFile(workbook, `Inventory_${tab}_${new Date().toLocaleDateString()}.xlsx`);
// //     showToast("Excel file downloaded", "success");
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
// //       showToast("Image uploaded successfully", "success");
// //     } catch (error) {
// //       showToast("Image upload failed", "error");
// //     } finally {
// //       setUploading(false);
// //     }
// //   };

// //   const addRow = async () => {
// //     try {
// //       if (!form.name?.trim()) return showToast("Name is required", "error");
      
// //       let payload;
// //       if (tab === "stock-groups" || tab === "godowns") {
// //           payload = { name: form.name };
// //       } else if (tab === "units") {
// //           payload = { 
// //             name: form.name, 
// //             symbol: form.symbol, 
// //             stockGroupId: form.stockGroupId,
// //             subUnits: form.subName ? [{ name: form.subName, factorToBase: Number(form.factor || 1) }] : [] 
// //           };
// //       } else {
// //           payload = { 
// //             name: form.name, 
// //             imageUrl: form.imageUrl, 
// //             stockGroupId: form.stockGroupId, 
// //             unitId: form.unitId, 
// //             defaultThreshold: 0,
// //             isDecimalAllowed: form.isDecimalAllowed 
// //           };
// //       }

// //       await api.post(`/inventory/${tab}`, payload);
// //       showToast("Added successfully", "success");
// //       setForm({ 
// //         name: "", symbol: "", stockGroupId: "", subName: "", 
// //         factor: "", imageUrl: "", unitId: "", defaultThreshold: "", 
// //         isDecimalAllowed: false 
// //       });
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
// //     } catch (error) {
// //       showToast("Delete failed", "error");
// //     }
// //   };

// //   const saveEdit = async (id) => {
// //     try {
// //       await api.put(`/inventory/${tab}/${id}`, { name: editName });
// //       setEditingId("");
// //       load();
// //       showToast("Updated", "success");
// //     } catch (error) {
// //       showToast("Update failed", "error");
// //     }
// //   };

// //   return (
// //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// //       {/* Header Area */}
// //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// //         <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// //            <span style={{ color: '#6366f1', fontWeight: '500' }}>Inventory Management</span>
// //         </h1>
        
// //         <div style={{ display: 'flex', gap: '12px' }}>
// //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// //             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// //             <input 
// //               type="text"
// //               placeholder="Search items..."
// //               value={q}
// //               onChange={(e) => setQ(e.target.value)}
// //               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', fontWeight: '600', width: '200px', outline: 'none' }}
// //             />
// //           </div>
// //           <button 
// //             onClick={handleExport}
// //             style={{ background: '#10b981', border: 'none', color: '#fff', padding: '0 16px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
// //           >
// //             <FileSpreadsheet size={16} /> Export
// //           </button>
// //         </div>
// //       </div>

// //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// //         {/* Sidebar Tabs */}
// //         <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// //           <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>CATEGORIES</div>
// //           {tabs.map((t) => (
// //             <div 
// //               key={t.key}
// //               onClick={() => { setTab(t.key); setQ(""); }}
// //               style={{
// //                 padding: '14px 18px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
// //                 background: tab === t.key ? '#fff' : 'transparent',
// //                 color: tab === t.key ? '#6366f1' : '#64748b',
// //                 border: tab === t.key ? '1px solid #6366f1' : '1px solid transparent',
// //                 boxShadow: tab === t.key ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// //                 transition: 'all 0.2s', fontWeight: '700', fontSize: '14px'
// //               }}
// //             >
// //               <t.icon size={18} strokeWidth={tab === t.key ? 2.5 : 2} />
// //               {t.label}
// //             </div>
// //           ))}
// //         </div>

// //         {/* Main Content Card */}
// //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          
// //           {/* Quick Add Form Header */}
// //           <div style={{ padding: '24px 32px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
// //             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
// //               <div style={{ flex: 1, minWidth: '200px' }}>
// //                 <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '6px' }}>NAME</label>
// //                 <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '600' }} placeholder="Enter name..." value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
// //               </div>

// //               {tab === "stock-items" && (
// //                 <>
// //                   <div style={{ width: '150px' }}>
// //                     <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '6px' }}>ASSIGN TO GROUP</label>
// //                     <select style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '600' }} value={form.stockGroupId} onChange={(e) => setForm({...form, stockGroupId: e.target.value})}>
// //                       <option value="">Select Group...</option>
// //                       {meta.stockGroups.map(sg => <option key={sg._id} value={sg._id}>{sg.name}</option>)}
// //                     </select>
// //                   </div>

// //                   <div style={{ width: '150px' }}>
// //                     <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '6px' }}>UNIT</label>
// //                     <select 
// //                       style={{ 
// //                         width: '100%', padding: '10px', borderRadius: '8px', 
// //                         border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '600',
// //                         background: !form.stockGroupId ? '#f8fafc' : '#fff'
// //                       }} 
// //                       value={form.unitId} 
// //                       disabled={!form.stockGroupId}
// //                       onChange={(e) => setForm({...form, unitId: e.target.value})}
// //                     >
// //                       {!form.stockGroupId ? (
// //                         <option value="">Select Group First</option>
// //                       ) : (
// //                         filteredUnits.map(u => <option key={u._id} value={u._id}>{u.symbol}</option>)
// //                       )}
// //                     </select>
// //                   </div>

// //                   <div style={{ width: '120px' }}>
// //                     <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '6px' }}>DECIMALS</label>
// //                     <div style={{ 
// //                         display: 'flex', alignItems: 'center', gap: '8px', 
// //                         height: '40px', background: '#fff', padding: '0 10px', 
// //                         borderRadius: '8px', border: '1px solid #e2e8f0' 
// //                     }}>
// //                         <input 
// //                             type="checkbox" 
// //                             id="decimal-toggle"
// //                             checked={form.isDecimalAllowed}
// //                             onChange={(e) => setForm({...form, isDecimalAllowed: e.target.checked})}
// //                             style={{ cursor: 'pointer', width: '16px', height: '16px' }}
// //                         />
// //                         <label htmlFor="decimal-toggle" style={{ fontSize: '11px', fontWeight: '700', color: '#475569', cursor: 'pointer' }}>
// //                             Allow 1.5
// //                         </label>
// //                     </div>
// //                   </div>

// //                   <div style={{ width: '150px' }}>
// //                     <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '6px' }}>IMAGE</label>
// //                     <div style={{ position: 'relative' }}>
// //                       <input 
// //                         type="file" 
// //                         accept="image/*"
// //                         onChange={handleImageUpload}
// //                         style={{ display: 'none' }} 
// //                         id="file-upload" 
// //                       />
// //                       <label 
// //                         htmlFor="file-upload" 
// //                         style={{ 
// //                           display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', 
// //                           background: form.imageUrl ? '#f0fdf4' : '#fff', 
// //                           border: form.imageUrl ? '1px solid #22c55e' : '1px solid #e2e8f0',
// //                           borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', color: form.imageUrl ? '#16a34a' : '#64748b'
// //                         }}
// //                       >
// //                         {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
// //                         {form.imageUrl ? "Uploaded" : "Choose File"}
// //                       </label>
// //                     </div>
// //                   </div>
// //                 </>
// //               )}

// //               {tab === "units" && (
// //                 <>
// //                     <div style={{ width: '150px' }}>
// //                         <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '6px' }}>ASSIGN TO GROUP</label>
// //                         <select style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '600' }} value={form.stockGroupId} onChange={(e) => setForm({...form, stockGroupId: e.target.value})}>
// //                             <option value="">Select Group...</option>
// //                             {meta.stockGroups.map(sg => <option key={sg._id} value={sg._id}>{sg.name}</option>)}
// //                         </select>
// //                     </div>
// //                     <div style={{ width: '100px' }}>
// //                         <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '6px' }}>SYMBOL</label>
// //                         <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '600' }} placeholder="e.g. Kg" value={form.symbol} onChange={(e) => setForm({...form, symbol: e.target.value})} />
// //                     </div>
// //                 </>
// //               )}

// //               <button onClick={addRow} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '11px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// //                 <Plus size={16} /> Add {tabs.find(t => t.key === tab).label.split(' ')[0]}
// //               </button>
// //             </div>
// //           </div>

// //           {/* List Section */}
// //           <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px' }}>
// //             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// //               <thead>
// //                 <tr style={{ textAlign: 'left' }}>
// //                   <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>DETAILS</th>
// //                   {tab !== "stock-items" && (
// //                     <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
// //                       {tab === "units" ? "GROUP ASSIGNMENT" : ""}
// //                     </th>
// //                   )}
// //                   <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>ACTIONS</th>
// //                 </tr>
// //               </thead>
// //               <tbody>
// //                 {rows.map((row) => (
// //                   <tr key={row._id}>
// //                     <td style={{ padding: '16px 0', borderBottom: '1px solid #f8fafc' }}>
// //                       <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
// //                         {tab === "stock-items" && (
// //                           <div style={{ width: '40px', height: '40px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// //                             {row.imageUrl ? <img src={row.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="item" /> : <Package size={20} color="#cbd5e1" />}
// //                           </div>
// //                         )}
// //                         <div>
// //                           {editingId === row._id ? (
// //                             <input autoFocus style={{ padding: '4px 8px', borderRadius: '4px', border: '2px solid #6366f1', outline: 'none', fontWeight: '700' }} value={editName} onChange={(e) => setEditName(e.target.value)} />
// //                           ) : (
// //                             <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// //                               {row.name} {row.symbol && <span style={{ color: '#6366f1', fontSize: '12px' }}>({row.symbol})</span>}
// //                               {tab === "stock-items" && (
// //                                 <span style={{ marginLeft: '10px', display: 'inline-flex', gap: '6px' }}>
// //                                   <span style={{ fontSize: '10px', color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: '100px', border: '1px solid #e0e7ff' }}>
// //                                     {row.unitId?.symbol || 'No Unit'}
// //                                   </span>
// //                                   <span style={{ fontSize: '10px', color: '#475569', background: '#f8fafc', padding: '2px 8px', borderRadius: '100px', border: '1px solid #f1f5f9' }}>
// //                                     {row.stockGroupId?.name || 'Unassigned'}
// //                                   </span>
// //                                   {row.isDecimalAllowed && (
// //                                     <span style={{ fontSize: '10px', color: '#0891b2', background: '#ecfeff', padding: '2px 8px', borderRadius: '100px', border: '1px solid #cffafe' }}>
// //                                       Float Enabled
// //                                     </span>
// //                                   )}
// //                                 </span>
// //                               )}
// //                             </div>
// //                           )}
// //                           <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>ID: {row._id.slice(-6).toUpperCase()}</div>
// //                         </div>
// //                       </div>
// //                     </td>

// //                     {tab !== "stock-items" && (
// //                       <td style={{ padding: '16px 0', borderBottom: '1px solid #f8fafc' }}>
// //                         <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
// //                           {tab === "units" && <span>{row.stockGroupId?.name || 'Unassigned'}</span>}
// //                         </div>
// //                       </td>
// //                     )}

// //                     <td style={{ padding: '16px 0', textAlign: 'right', borderBottom: '1px solid #f8fafc' }}>
// //                       <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
// //                         {editingId === row._id ? (
// //                           <button onClick={() => saveEdit(row._id)} style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '800' }}>SAVE</button>
// //                         ) : (
// //                           <button onClick={() => { setEditingId(row._id); setEditName(row.name); }} style={{ padding: '8px', color: '#6366f1', background: '#f5f3ff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}><Edit3 size={14} /></button>
// //                         )}
// //                         <button onClick={() => removeRow(row._id)} style={{ padding: '8px', color: '#ef4444', background: '#fef2f2', border: 'none', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={14} /></button>
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





// 25







import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "../api.js";
import { useToast } from "../toast.jsx";
import * as XLSX from 'xlsx'; // 1. Added XLSX Import
import { 
  Search, FileSpreadsheet, Plus, Trash2, Edit3, 
  Package, Layers, MapPin, Ruler, Upload, Loader2 
} from "lucide-react";

const tabs = [
  { key: "stock-groups", label: "Stock Groups", icon: Layers },
  { key: "units", label: "Units & Sub-units", icon: Ruler },
  { key: "stock-items", label: "Stock Items", icon: Package },
  { key: "godowns", label: "Godowns", icon: MapPin }
];

export const InventoryPage = () => {
  const { showToast } = useToast();
  const [tab, setTab] = useState("stock-groups");
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ 
    name: "", symbol: "", stockGroupId: "", subName: "", 
    factor: "", imageUrl: "", unitId: "", defaultThreshold: "" 
  });
  const [meta, setMeta] = useState({ stockGroups: [], units: [] });
  // const [editingId, setEditingId] = useState("");
  // const [editName, setEditName] = useState("");
  const [editingId, setEditingId] = useState("");
const [editForm, setEditForm] = useState({
  name: "",
  stockGroupId: "",
  unitId: "",
  imageUrl: ""
});
  const [uploading, setUploading] = useState(false);

  // Filtered list of units based on selected Stock Group
  // const filteredUnits = useMemo(() => {
  //   if (!form.stockGroupId) return [];
  //   return meta.units.filter(u => 
  //     u.stockGroupId?._id === form.stockGroupId || u.stockGroupId === form.stockGroupId
  //   );
  // }, [meta.units, form.stockGroupId]);

  const filteredUnits = meta.units;
  // Auto-select first unit when group changes
  useEffect(() => {
    if (tab === "stock-items") {
      if (filteredUnits.length > 0) {
        setForm(prev => ({ ...prev, unitId: filteredUnits[0]._id }));
      } else {
        setForm(prev => ({ ...prev, unitId: "" }));
      }
    }
  }, [filteredUnits, tab]);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/inventory/${tab}`, { params: { q } });
      setRows(res.data || []);
    } catch (error) {
      showToast("Failed to load data", "error");
    }
  }, [tab, q, showToast]);

  const refreshMeta = useCallback(async () => {
    try {
      const [groupsRes, unitsRes] = await Promise.all([
        api.get("/inventory/stock-groups"),
        api.get("/inventory/units")
      ]);
      setMeta({ stockGroups: groupsRes.data, units: unitsRes.data });
    } catch (error) {
      console.error("Meta fetch error", error);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { refreshMeta(); }, [refreshMeta]);

  // --- EXPORT LOGIC ---
  const handleExport = () => {
    if (rows.length === 0) {
      return showToast("No data to export", "error");
    }

    const dataToExport = rows.map(row => {
      const baseData = {
        ID: row._id,
        Name: row.name,
      };

      if (tab === "units") {
        return { 
          ...baseData, 
          Symbol: row.symbol, 
          Group: row.stockGroupId?.name || 'Unassigned' 
        };
      }

      if (tab === "stock-items") {
        return { 
          ...baseData, 
          Unit: row.unitId?.symbol || 'N/A', 
          Group: row.stockGroupId?.name || 'Unassigned',
          Threshold: row.defaultThreshold || 0
        };
      }

      return baseData;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, tab);
    XLSX.writeFile(workbook, `Inventory_${tab}_${new Date().toLocaleDateString()}.xlsx`);
    showToast("Excel file downloaded", "success");
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await api.post("/inventory/stock-items/upload-image", formData);
      setForm(prev => ({ ...prev, imageUrl: res.data.imageUrl }));
      showToast("Image uploaded successfully", "success");
    } catch (error) {
      showToast("Image upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const addRow = async () => {
    try {
      if (!form.name?.trim()) return showToast("Name is required", "error");
      
      const payload = tab === "stock-groups" || tab === "godowns" 
        ? { name: form.name }
        : tab === "units" 
? { 
    name: form.name, 
    symbol: form.symbol,
    subUnits: form.subName 
      ? [{ name: form.subName, factorToBase: Number(form.factor || 1) }] 
      : [] 
  }
        
        // : tab === "units" 
        // ? { 
        //     name: form.name, 
        //     symbol: form.symbol, 
        //     stockGroupId: form.stockGroupId,
        //     subUnits: form.subName ? [{ name: form.subName, factorToBase: Number(form.factor || 1) }] : [] 
        //   }
        : { 
            name: form.name, 
            imageUrl: form.imageUrl, 
            stockGroupId: form.stockGroupId, 
            unitId: form.unitId, 
            defaultThreshold: 0 
          };

      await api.post(`/inventory/${tab}`, payload);
      showToast("Added successfully", "success");
      setForm({ name: "", symbol: "", stockGroupId: "", subName: "", factor: "", imageUrl: "", unitId: "", defaultThreshold: "" });
      load();
      refreshMeta();
    } catch (error) {
      showToast(error?.response?.data?.message || "Action failed", "error");
    }
  };

  const removeRow = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await api.delete(`/inventory/${tab}/${id}`);
      showToast("Deleted", "success");
      load();
    } catch (error) {
      showToast("Delete failed", "error");
    }
  };

  const saveEdit = async (id) => {
    try {
      await api.put(`/inventory/${tab}/${id}`, {
  name: editForm.name,
  stockGroupId: editForm.stockGroupId,
  unitId: editForm.unitId,
  imageUrl: editForm.imageUrl
});
      // await api.put(`/inventory/${tab}/${id}`, { name: editName });
      // setEditingId("");
     setEditForm({
  name: "",
  stockGroupId: "",
  unitId: "",
  imageUrl: ""
});
      load();
      showToast("Updated", "success");
    } catch (error) {
      showToast("Update failed", "error");
    }
  };

  return (
    <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Header Area */}
      <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
           <span style={{ color: '#6366f1', fontWeight: '500' }}>Inventory Management</span>
        </h1>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
            <input 
              type="text"
              placeholder="Search items..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', fontWeight: '600', width: '200px', outline: 'none' }}
            />
          </div>
          <button 
            onClick={handleExport}
            style={{ background: '#10b981', border: 'none', color: '#fff', padding: '0 16px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FileSpreadsheet size={16} /> Export
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
        {/* Sidebar Tabs */}
        <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>CATEGORIES</div>
          {tabs.map((t) => (
            <div 
              key={t.key}
              onClick={() => { setTab(t.key); setQ(""); }}
              style={{
                padding: '14px 18px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                background: tab === t.key ? '#fff' : 'transparent',
                color: tab === t.key ? '#6366f1' : '#64748b',
                border: tab === t.key ? '1px solid #6366f1' : '1px solid transparent',
                boxShadow: tab === t.key ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
                transition: 'all 0.2s', fontWeight: '700', fontSize: '14px'
              }}
            >
              <t.icon size={18} strokeWidth={tab === t.key ? 2.5 : 2} />
              {t.label}
            </div>
          ))}
        </div>

        {/* Main Content Card */}
        <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          
          {/* Quick Add Form Header */}
          <div style={{ padding: '24px 32px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '6px' }}>NAME</label>
                <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '600' }} placeholder="Enter name..." value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
              </div>

              {tab === "stock-items" && (
                <>
                  <div style={{ width: '150px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '6px' }}>ASSIGN TO GROUP</label>
                    <select style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '600' }} value={form.stockGroupId} onChange={(e) => setForm({...form, stockGroupId: e.target.value})}>
                      <option value="">Select Group...</option>
                      {meta.stockGroups.map(sg => <option key={sg._id} value={sg._id}>{sg.name}</option>)}
                    </select>
                  </div>

                  <div style={{ width: '150px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '6px' }}>UNIT</label>
                    <select 
                      style={{ 
                        width: '100%', padding: '10px', borderRadius: '8px', 
                        border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '600',
                        background: !form.stockGroupId ? '#f8fafc' : '#fff'
                      }} 
                      value={form.unitId} 
                      disabled={!form.stockGroupId}
                      onChange={(e) => setForm({...form, unitId: e.target.value})}
                    >
                      {!form.stockGroupId ? (
                        <option value="">Select Group First</option>
                      ) : (
                        filteredUnits.map(u => <option key={u._id} value={u._id}>{u.symbol}</option>)
                      )}
                    </select>
                  </div>

                  <div style={{ width: '180px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '6px' }}>IMAGE</label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }} 
                        id="file-upload" 
                      />
                      <label 
                        htmlFor="file-upload" 
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', 
                          background: form.imageUrl ? '#f0fdf4' : '#fff', 
                          border: form.imageUrl ? '1px solid #22c55e' : '1px solid #e2e8f0',
                          borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', color: form.imageUrl ? '#16a34a' : '#64748b'
                        }}
                      >
                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        {form.imageUrl ? "Uploaded" : "Choose File"}
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* {tab === "units" && (
                <div style={{ width: '150px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '6px' }}>ASSIGN TO GROUP</label>
                  <select style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '600' }} value={form.stockGroupId} onChange={(e) => setForm({...form, stockGroupId: e.target.value})}>
                    <option value="">Select Group...</option>
                    {meta.stockGroups.map(sg => <option key={sg._id} value={sg._id}>{sg.name}</option>)}
                  </select>
                </div>
              )} */}

              {tab === "units" && (
                <div style={{ width: '100px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '6px' }}>SYMBOL</label>
                  <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '600' }} placeholder="e.g. Kg" value={form.symbol} onChange={(e) => setForm({...form, symbol: e.target.value})} />
                </div>
              )}

              <button onClick={addRow} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '11px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={16} /> Add {tabs.find(t => t.key === tab).label.split(' ')[0]}
              </button>
            </div>
          </div>

          {/* List Section */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>DETAILS</th>
                  {tab !== "stock-items" && (
                    <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
                      {tab === "units" ? "GROUP ASSIGNMENT" : ""}
                    </th>
                  )}
                  <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id}>
                    <td style={{ padding: '16px 0', borderBottom: '1px solid #f8fafc' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {tab === "stock-items" && (
                          <div style={{ width: '40px', height: '40px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                            {row.imageUrl ? <img src={row.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="item" /> : <Package size={20} color="#cbd5e1" />}
                          </div>
                        )}
                        <div>
                          {editingId === row._id ? (
                           <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
  
  {/* NAME */}
  <input
    autoFocus
    value={editForm.name}
    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
    style={{ padding: "6px", border: "1px solid #6366f1", borderRadius: "6px" }}
  />

  {/* GROUP */}
  <select
    value={editForm.stockGroupId}
    onChange={(e) => setEditForm({ ...editForm, stockGroupId: e.target.value })}
  >
    <option value="">Select Group</option>
    {meta.stockGroups.map(sg => (
      <option key={sg._id} value={sg._id}>{sg.name}</option>
    ))}
  </select>

  {/* UNIT */}
  <select
    value={editForm.unitId}
    onChange={(e) => setEditForm({ ...editForm, unitId: e.target.value })}
  >
    <option value="">Select Unit</option>
    {meta.units.map(u => (
      <option key={u._id} value={u._id}>{u.symbol}</option>
    ))}
  </select>

  {/* IMAGE */}
  <input
    type="file"
    onChange={async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("image", file);

      const res = await api.post("/inventory/stock-items/upload-image", formData);
      setEditForm(prev => ({ ...prev, imageUrl: res.data.imageUrl }));
    }}
  />

</div>
                           // <input autoFocus style={{ padding: '4px 8px', borderRadius: '4px', border: '2px solid #6366f1', outline: 'none', fontWeight: '700' }} value={editName} onChange={(e) => setEditName(e.target.value)} />
                          ) : (
                            <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
                              {row.name} {row.symbol && <span style={{ color: '#6366f1', fontSize: '12px' }}>({row.symbol})</span>}
                              {tab === "stock-items" && (
                                <span style={{ marginLeft: '10px', display: 'inline-flex', gap: '6px' }}>
                                  <span style={{ fontSize: '10px', color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: '100px', border: '1px solid #e0e7ff' }}>
                                    {row.unitId?.symbol || 'No Unit'}
                                  </span>
                                  <span style={{ fontSize: '10px', color: '#475569', background: '#f8fafc', padding: '2px 8px', borderRadius: '100px', border: '1px solid #f1f5f9' }}>
                                    {row.stockGroupId?.name || 'Unassigned'}
                                  </span>
                                </span>
                              )}
                            </div>
                          )}
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>ID: {row._id.slice(-6).toUpperCase()}</div>
                        </div>
                      </div>
                    </td>

                    {tab !== "stock-items" && (
                      <td style={{ padding: '16px 0', borderBottom: '1px solid #f8fafc' }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                          
                          {tab === "units" && <span>-</span>}
                          {/* {tab === "units" && <span>{row.stockGroupId?.name || 'Unassigned'}</span>} */}
                        </div>
                      </td>
                    )}

                    <td style={{ padding: '16px 0', textAlign: 'right', borderBottom: '1px solid #f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        {editingId === row._id ? (
                          <button onClick={() => saveEdit(row._id)} style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '800' }}>SAVE</button>
                        ) : (
                          <button onClick={() => { 
  setEditingId(row._id);
  setEditForm({
    name: row.name || "",
    stockGroupId: row.stockGroupId?._id || "",
    unitId: row.unitId?._id || "",
    imageUrl: row.imageUrl || ""
  });
}} style={{ padding: '8px', color: '#6366f1', background: '#f5f3ff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}><Edit3 size={14} /></button>
                        )}
                        <button onClick={() => removeRow(row._id)} style={{ padding: '8px', color: '#ef4444', background: '#fef2f2', border: 'none', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};



