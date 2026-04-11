// // // // // // // // // // // // // // // // // // // // import { useState } from "react";
// // // // // // // // // // // // // // // // // // // // import { api } from "../api.js";

// // // // // // // // // // // // // // // // // // // // const reportEntities = ["indents", "purchase-orders", "distributions", "transfers", "requests", "consumptions"];

// // // // // // // // // // // // // // // // // // // // export const ReportsPage = () => {
// // // // // // // // // // // // // // // // // // // //   const [entity, setEntity] = useState("indents");
// // // // // // // // // // // // // // // // // // // //   const [rows, setRows] = useState([]);

// // // // // // // // // // // // // // // // // // // //   const load = async () => {
// // // // // // // // // // // // // // // // // // // //     const res = await api.get(`/reports/${entity}`);
// // // // // // // // // // // // // // // // // // // //     setRows(res.data);
// // // // // // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // // // // // //   const exportExcel = () => window.open(`http://localhost:5000/api/reports/${entity}/export/excel`, "_blank");

// // // // // // // // // // // // // // // // // // // //   return (
// // // // // // // // // // // // // // // // // // // //     <section>
// // // // // // // // // // // // // // // // // // // //       <h1>Reports</h1>
// // // // // // // // // // // // // // // // // // // //       <select value={entity} onChange={(e) => setEntity(e.target.value)}>
// // // // // // // // // // // // // // // // // // // //         {reportEntities.map((r) => <option key={r} value={r}>{r}</option>)}
// // // // // // // // // // // // // // // // // // // //       </select>
// // // // // // // // // // // // // // // // // // // //       <button onClick={load}>Preview</button>
// // // // // // // // // // // // // // // // // // // //       <button onClick={exportExcel}>Download Excel</button>
// // // // // // // // // // // // // // // // // // // //       <pre className="json-preview">{JSON.stringify(rows, null, 2)}</pre>
// // // // // // // // // // // // // // // // // // // //     </section>
// // // // // // // // // // // // // // // // // // // //   );
// // // // // // // // // // // // // // // // // // // // };









// // // // // // // // // // // // // // // // // // // import { useState } from "react";
// // // // // // // // // // // // // // // // // // // import { api } from "../api.js";

// // // // // // // // // // // // // // // // // // // const reportEntities = ["indents", "purchase-orders", "distributions", "transfers", "requests", "consumptions"];

// // // // // // // // // // // // // // // // // // // export const ReportsPage = () => {
// // // // // // // // // // // // // // // // // // //   const [entity, setEntity] = useState("indents");
// // // // // // // // // // // // // // // // // // //   const [rows, setRows] = useState([]);

// // // // // // // // // // // // // // // // // // //   const load = async () => {
// // // // // // // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // // // // // // //       const res = await api.get(`/reports/${entity}`);
// // // // // // // // // // // // // // // // // // //       setRows(res.data);
// // // // // // // // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // // // // // // // //       console.error("Failed to load report:", error);
// // // // // // // // // // // // // // // // // // //     }
// // // // // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // // // // //   const exportExcel = () => window.open(`http://localhost:5000/api/reports/${entity}/export/excel`, "_blank");

// // // // // // // // // // // // // // // // // // //   // Helper to get headers dynamically based on the first object in the array
// // // // // // // // // // // // // // // // // // //   const getHeaders = () => {
// // // // // // // // // // // // // // // // // // //     if (rows.length === 0) return [];
// // // // // // // // // // // // // // // // // // //     // Filter out internal MongoDB keys like _id and __v for a cleaner table
// // // // // // // // // // // // // // // // // // //     return Object.keys(rows[0]).filter(key => !["_id", "__v", "items"].includes(key));
// // // // // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // // // // //   const headers = getHeaders();

// // // // // // // // // // // // // // // // // // //   return (
// // // // // // // // // // // // // // // // // // //     <section className="p-8 w-full animate-in fade-in duration-700">
// // // // // // // // // // // // // // // // // // //       <div className="mb-8">
// // // // // // // // // // // // // // // // // // //         <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900">Reports</h1>
// // // // // // // // // // // // // // // // // // //         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Data Analytics & Logs</p>
// // // // // // // // // // // // // // // // // // //       </div>

// // // // // // // // // // // // // // // // // // //       <div className="flex gap-4 mb-10 bg-slate-100 p-6 rounded-[2rem] border border-slate-200 shadow-inner items-center">
// // // // // // // // // // // // // // // // // // //         <select 
// // // // // // // // // // // // // // // // // // //           className="p-4 rounded-2xl border border-slate-200 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-slate-900 bg-white"
// // // // // // // // // // // // // // // // // // //           value={entity} 
// // // // // // // // // // // // // // // // // // //           onChange={(e) => setEntity(e.target.value)}
// // // // // // // // // // // // // // // // // // //         >
// // // // // // // // // // // // // // // // // // //           {reportEntities.map((r) => <option key={r} value={r}>{r.replace("-", " ")}</option>)}
// // // // // // // // // // // // // // // // // // //         </select>
        
// // // // // // // // // // // // // // // // // // //         <button 
// // // // // // // // // // // // // // // // // // //           onClick={load}
// // // // // // // // // // // // // // // // // // //           className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest px-8 py-4 rounded-2xl hover:bg-slate-800 transition-all active:scale-95"
// // // // // // // // // // // // // // // // // // //         >
// // // // // // // // // // // // // // // // // // //           Preview
// // // // // // // // // // // // // // // // // // //         </button>

// // // // // // // // // // // // // // // // // // //         <button 
// // // // // // // // // // // // // // // // // // //           onClick={exportExcel}
// // // // // // // // // // // // // // // // // // //           className="bg-emerald-500 text-slate-900 font-black uppercase text-[10px] tracking-widest px-8 py-4 rounded-2xl hover:bg-emerald-400 transition-all active:scale-95 shadow-lg"
// // // // // // // // // // // // // // // // // // //         >
// // // // // // // // // // // // // // // // // // //           Download Excel
// // // // // // // // // // // // // // // // // // //         </button>
// // // // // // // // // // // // // // // // // // //       </div>

// // // // // // // // // // // // // // // // // // //       {/* TABLE VIEW */}
// // // // // // // // // // // // // // // // // // //       <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden w-full">
// // // // // // // // // // // // // // // // // // //         <div className="overflow-x-auto">
// // // // // // // // // // // // // // // // // // //           <table className="w-full text-left">
// // // // // // // // // // // // // // // // // // //             <thead className="bg-slate-900 text-slate-400 text-[10px] font-black uppercase tracking-widest">
// // // // // // // // // // // // // // // // // // //               <tr>
// // // // // // // // // // // // // // // // // // //                 {headers.map((header) => (
// // // // // // // // // // // // // // // // // // //                   <th key={header} className="p-7 first:pl-12 last:pr-12">{header}</th>
// // // // // // // // // // // // // // // // // // //                 ))}
// // // // // // // // // // // // // // // // // // //               </tr>
// // // // // // // // // // // // // // // // // // //             </thead>
// // // // // // // // // // // // // // // // // // //             <tbody className="divide-y divide-slate-100">
// // // // // // // // // // // // // // // // // // //               {rows.length === 0 ? (
// // // // // // // // // // // // // // // // // // //                 <tr>
// // // // // // // // // // // // // // // // // // //                   <td colSpan={headers.length || 1} className="p-32 text-center text-slate-300 uppercase font-black tracking-widest text-xs">
// // // // // // // // // // // // // // // // // // //                     No Records Loaded
// // // // // // // // // // // // // // // // // // //                   </td>
// // // // // // // // // // // // // // // // // // //                 </tr>
// // // // // // // // // // // // // // // // // // //               ) : (
// // // // // // // // // // // // // // // // // // //                 rows.map((row, idx) => (
// // // // // // // // // // // // // // // // // // //                   <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
// // // // // // // // // // // // // // // // // // //                     {headers.map((header) => (
// // // // // // // // // // // // // // // // // // //                       <td key={header} className="p-7 first:pl-12 last:pr-12 text-xs font-bold text-slate-700">
// // // // // // // // // // // // // // // // // // //                         {typeof row[header] === 'object' 
// // // // // // // // // // // // // // // // // // //                           ? JSON.stringify(row[header]) 
// // // // // // // // // // // // // // // // // // //                           : String(row[header])}
// // // // // // // // // // // // // // // // // // //                       </td>
// // // // // // // // // // // // // // // // // // //                     ))}
// // // // // // // // // // // // // // // // // // //                   </tr>
// // // // // // // // // // // // // // // // // // //                 ))
// // // // // // // // // // // // // // // // // // //               )}
// // // // // // // // // // // // // // // // // // //             </tbody>
// // // // // // // // // // // // // // // // // // //           </table>
// // // // // // // // // // // // // // // // // // //         </div>
// // // // // // // // // // // // // // // // // // //       </div>
// // // // // // // // // // // // // // // // // // //     </section>
// // // // // // // // // // // // // // // // // // //   );
// // // // // // // // // // // // // // // // // // // };








// // // // // // // // // // // // // // // // // // import { useState } from "react";
// // // // // // // // // // // // // // // // // // import { api } from "../api.js";

// // // // // // // // // // // // // // // // // // const reportEntities = ["indents", "purchase-orders", "distributions", "transfers", "requests", "consumptions"];

// // // // // // // // // // // // // // // // // // export const ReportsPage = () => {
// // // // // // // // // // // // // // // // // //   const [entity, setEntity] = useState("indents");
// // // // // // // // // // // // // // // // // //   const [rows, setRows] = useState([]);

// // // // // // // // // // // // // // // // // //   const load = async () => {
// // // // // // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // // // // // //       const res = await api.get(`/reports/${entity}`);
// // // // // // // // // // // // // // // // // //       setRows(res.data);
// // // // // // // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // // // // // // //       console.error("Failed to load report:", error);
// // // // // // // // // // // // // // // // // //     }
// // // // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // // // //   const exportExcel = () => window.open(`http://localhost:5000/api/reports/${entity}/export/excel`, "_blank");

// // // // // // // // // // // // // // // // // //   // Helper to get headers dynamically
// // // // // // // // // // // // // // // // // //   const getHeaders = () => {
// // // // // // // // // // // // // // // // // //     if (rows.length === 0) return [];
// // // // // // // // // // // // // // // // // //     // Define the headers we want to show, renamed for the UI
// // // // // // // // // // // // // // // // // //     return Object.keys(rows[0]).filter(key => 
// // // // // // // // // // // // // // // // // //       !["_id", "__v", "items", "updatedAt"].includes(key)
// // // // // // // // // // // // // // // // // //     );
// // // // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // // // //   const headers = getHeaders();

// // // // // // // // // // // // // // // // // //   // Helper to format specific cell data
// // // // // // // // // // // // // // // // // //   const formatCellValue = (header, value) => {
// // // // // // // // // // // // // // // // // //     if (!value) return "N/A";

// // // // // // // // // // // // // // // // // //     // 1. Get Name of Admin
// // // // // // // // // // // // // // // // // //     // This assumes your backend does .populate('createdBy', 'name')
// // // // // // // // // // // // // // // // // //     if (header === "createdBy") {
// // // // // // // // // // // // // // // // // //       return typeof value === 'object' ? (value.name || "System Admin") : "ID: " + value;
// // // // // // // // // // // // // // // // // //     }

// // // // // // // // // // // // // // // // // //     // 2. Format Status (removes 'stock_' prefix and underscores)
// // // // // // // // // // // // // // // // // //     if (header === "status") {
// // // // // // // // // // // // // // // // // //       return String(value).replace("stock_", "").replace("_", " ");
// // // // // // // // // // // // // // // // // //     }

// // // // // // // // // // // // // // // // // //     // 3. Date only (UK format: DD/MM/YYYY)
// // // // // // // // // // // // // // // // // //     if (header === "createdAt") {
// // // // // // // // // // // // // // // // // //       return new Date(value).toLocaleDateString('en-GB');
// // // // // // // // // // // // // // // // // //     }

// // // // // // // // // // // // // // // // // //     if (typeof value === 'object') return JSON.stringify(value);
// // // // // // // // // // // // // // // // // //     return String(value);
// // // // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // // // //   // Helper to rename headers for the UI display
// // // // // // // // // // // // // // // // // //   const renameHeader = (header) => {
// // // // // // // // // // // // // // // // // //     const names = {
// // // // // // // // // // // // // // // // // //       createdBy: "Admin",
// // // // // // // // // // // // // // // // // //       createdAt: "Date",
// // // // // // // // // // // // // // // // // //       indentNo: "Indent No",
// // // // // // // // // // // // // // // // // //       totalAmount: "Total"
// // // // // // // // // // // // // // // // // //     };
// // // // // // // // // // // // // // // // // //     return names[header] || header;
// // // // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // // // //   return (
// // // // // // // // // // // // // // // // // //     <section className="p-8 w-full animate-in fade-in duration-700">
// // // // // // // // // // // // // // // // // //       <div className="mb-8">
// // // // // // // // // // // // // // // // // //         <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900">Reports</h1>
// // // // // // // // // // // // // // // // // //         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Data Analytics & Logs</p>
// // // // // // // // // // // // // // // // // //       </div>

// // // // // // // // // // // // // // // // // //       <div className="flex gap-4 mb-10 bg-slate-100 p-6 rounded-[2rem] border border-slate-200 shadow-inner items-center">
// // // // // // // // // // // // // // // // // //         <select 
// // // // // // // // // // // // // // // // // //           className="p-4 rounded-2xl border border-slate-200 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-slate-900 bg-white"
// // // // // // // // // // // // // // // // // //           value={entity} 
// // // // // // // // // // // // // // // // // //           onChange={(e) => setEntity(e.target.value)}
// // // // // // // // // // // // // // // // // //         >
// // // // // // // // // // // // // // // // // //           {reportEntities.map((r) => <option key={r} value={r}>{r.replace("-", " ")}</option>)}
// // // // // // // // // // // // // // // // // //         </select>
        
// // // // // // // // // // // // // // // // // //         <button 
// // // // // // // // // // // // // // // // // //           onClick={load}
// // // // // // // // // // // // // // // // // //           className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest px-8 py-4 rounded-2xl hover:bg-slate-800 transition-all active:scale-95"
// // // // // // // // // // // // // // // // // //         >
// // // // // // // // // // // // // // // // // //           Preview
// // // // // // // // // // // // // // // // // //         </button>

// // // // // // // // // // // // // // // // // //         <button 
// // // // // // // // // // // // // // // // // //           onClick={exportExcel}
// // // // // // // // // // // // // // // // // //           className="bg-emerald-500 text-slate-900 font-black uppercase text-[10px] tracking-widest px-8 py-4 rounded-2xl hover:bg-emerald-400 transition-all active:scale-95 shadow-lg"
// // // // // // // // // // // // // // // // // //         >
// // // // // // // // // // // // // // // // // //           Download Excel
// // // // // // // // // // // // // // // // // //         </button>
// // // // // // // // // // // // // // // // // //       </div>

// // // // // // // // // // // // // // // // // //       <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden w-full">
// // // // // // // // // // // // // // // // // //         <div className="overflow-x-auto">
// // // // // // // // // // // // // // // // // //           <table className="w-full text-left">
// // // // // // // // // // // // // // // // // //             <thead className="bg-slate-900 text-slate-400 text-[10px] font-black uppercase tracking-widest">
// // // // // // // // // // // // // // // // // //               <tr>
// // // // // // // // // // // // // // // // // //                 {headers.map((header) => (
// // // // // // // // // // // // // // // // // //                   <th key={header} className="p-7 first:pl-12 last:pr-12">
// // // // // // // // // // // // // // // // // //                     {renameHeader(header)}
// // // // // // // // // // // // // // // // // //                   </th>
// // // // // // // // // // // // // // // // // //                 ))}
// // // // // // // // // // // // // // // // // //               </tr>
// // // // // // // // // // // // // // // // // //             </thead>
// // // // // // // // // // // // // // // // // //             <tbody className="divide-y divide-slate-100">
// // // // // // // // // // // // // // // // // //               {rows.length === 0 ? (
// // // // // // // // // // // // // // // // // //                 <tr>
// // // // // // // // // // // // // // // // // //                   <td colSpan={headers.length || 1} className="p-32 text-center text-slate-300 uppercase font-black tracking-widest text-xs">
// // // // // // // // // // // // // // // // // //                     No Records Loaded
// // // // // // // // // // // // // // // // // //                   </td>
// // // // // // // // // // // // // // // // // //                 </tr>
// // // // // // // // // // // // // // // // // //               ) : (
// // // // // // // // // // // // // // // // // //                 rows.map((row, idx) => (
// // // // // // // // // // // // // // // // // //                   <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
// // // // // // // // // // // // // // // // // //                     {headers.map((header) => (
// // // // // // // // // // // // // // // // // //                       <td key={header} className="p-7 first:pl-12 last:pr-12 text-xs font-bold text-slate-700 uppercase">
// // // // // // // // // // // // // // // // // //                         {header === 'status' ? (
// // // // // // // // // // // // // // // // // //                           <span className="bg-slate-100 px-3 py-1 rounded-md text-[10px] border border-slate-200">
// // // // // // // // // // // // // // // // // //                             {formatCellValue(header, row[header])}
// // // // // // // // // // // // // // // // // //                           </span>
// // // // // // // // // // // // // // // // // //                         ) : (
// // // // // // // // // // // // // // // // // //                           formatCellValue(header, row[header])
// // // // // // // // // // // // // // // // // //                         )}
// // // // // // // // // // // // // // // // // //                       </td>
// // // // // // // // // // // // // // // // // //                     ))}
// // // // // // // // // // // // // // // // // //                   </tr>
// // // // // // // // // // // // // // // // // //                 ))
// // // // // // // // // // // // // // // // // //               )}
// // // // // // // // // // // // // // // // // //             </tbody>
// // // // // // // // // // // // // // // // // //           </table>
// // // // // // // // // // // // // // // // // //         </div>
// // // // // // // // // // // // // // // // // //       </div>
// // // // // // // // // // // // // // // // // //     </section>
// // // // // // // // // // // // // // // // // //   );
// // // // // // // // // // // // // // // // // // };










// // // // // // // // // // // // // // // // // import { useState } from "react";
// // // // // // // // // // // // // // // // // import { api } from "../api.js";

// // // // // // // // // // // // // // // // // const reportEntities = ["indents", "purchase-orders", "distributions", "transfers", "requests", "consumptions"];

// // // // // // // // // // // // // // // // // export const ReportsPage = () => {
// // // // // // // // // // // // // // // // //   const [entity, setEntity] = useState("indents");
// // // // // // // // // // // // // // // // //   const [rows, setRows] = useState([]);

// // // // // // // // // // // // // // // // //   const load = async () => {
// // // // // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // // // // //       const res = await api.get(`/reports/${entity}`);
// // // // // // // // // // // // // // // // //       setRows(res.data);
// // // // // // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // // // // // //       console.error("Failed to load report:", error);
// // // // // // // // // // // // // // // // //     }
// // // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // // //   const exportAllExcel = () => window.open(`http://localhost:5000/api/reports/${entity}/export/excel`, "_blank");
  
// // // // // // // // // // // // // // // // //   const exportSingleExcel = (id) => window.open(`http://localhost:5000/api/reports/${entity}/export/excel/${id}`, "_blank");

// // // // // // // // // // // // // // // // //   const getHeaders = () => {
// // // // // // // // // // // // // // // // //     if (rows.length === 0) return [];
// // // // // // // // // // // // // // // // //     const baseHeaders = Object.keys(rows[0]).filter(key => 
// // // // // // // // // // // // // // // // //       !["_id", "__v", "items", "updatedAt", "userId"].includes(key)
// // // // // // // // // // // // // // // // //     );
// // // // // // // // // // // // // // // // //     return [...baseHeaders, "action"]; // Add action column manually
// // // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // // //   const headers = getHeaders();

// // // // // // // // // // // // // // // // //   const formatCellValue = (header, value) => {
// // // // // // // // // // // // // // // // //     if (!value && header !== 'action') return "N/A";

// // // // // // // // // // // // // // // // //     if (header === "createdBy" || header === "userId") {
// // // // // // // // // // // // // // // // //       return value?.name || "Admin";
// // // // // // // // // // // // // // // // //     }

// // // // // // // // // // // // // // // // //     if (header === "status") {
// // // // // // // // // // // // // // // // //       return String(value).replace("stock_", "").replace("_", " ");
// // // // // // // // // // // // // // // // //     }

// // // // // // // // // // // // // // // // //     if (header === "createdAt") {
// // // // // // // // // // // // // // // // //       return new Date(value).toLocaleDateString('en-GB');
// // // // // // // // // // // // // // // // //     }

// // // // // // // // // // // // // // // // //     return typeof value === 'object' ? "Data" : String(value);
// // // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // // //   const renameHeader = (header) => {
// // // // // // // // // // // // // // // // //     const names = { createdBy: "Admin", createdAt: "Date", indentNo: "Indent No", action: "Export" };
// // // // // // // // // // // // // // // // //     return names[header] || header;
// // // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // // //   return (
// // // // // // // // // // // // // // // // //     <section className="p-8 w-full animate-in fade-in duration-700">
// // // // // // // // // // // // // // // // //       <div className="mb-8">
// // // // // // // // // // // // // // // // //         <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900">Reports</h1>
// // // // // // // // // // // // // // // // //         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Data Analytics & Individual Downloads</p>
// // // // // // // // // // // // // // // // //       </div>

// // // // // // // // // // // // // // // // //       <div className="flex gap-4 mb-10 bg-slate-100 p-6 rounded-[2rem] border border-slate-200 shadow-inner items-center">
// // // // // // // // // // // // // // // // //         <select 
// // // // // // // // // // // // // // // // //           className="p-4 rounded-2xl border border-slate-200 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-slate-900 bg-white"
// // // // // // // // // // // // // // // // //           value={entity} 
// // // // // // // // // // // // // // // // //           onChange={(e) => { setEntity(e.target.value); setRows([]); }}
// // // // // // // // // // // // // // // // //         >
// // // // // // // // // // // // // // // // //           {reportEntities.map((r) => <option key={r} value={r}>{r.replace("-", " ")}</option>)}
// // // // // // // // // // // // // // // // //         </select>
        
// // // // // // // // // // // // // // // // //         <button onClick={load} className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest px-8 py-4 rounded-2xl hover:bg-slate-800 transition-all active:scale-95">
// // // // // // // // // // // // // // // // //           Preview Table
// // // // // // // // // // // // // // // // //         </button>

// // // // // // // // // // // // // // // // //         <button onClick={exportAllExcel} className="bg-emerald-500 text-slate-900 font-black uppercase text-[10px] tracking-widest px-8 py-4 rounded-2xl hover:bg-emerald-400 transition-all shadow-lg">
// // // // // // // // // // // // // // // // //           Export All (Excel)
// // // // // // // // // // // // // // // // //         </button>
// // // // // // // // // // // // // // // // //       </div>

// // // // // // // // // // // // // // // // //       <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden w-full">
// // // // // // // // // // // // // // // // //         <div className="overflow-x-auto">
// // // // // // // // // // // // // // // // //           <table className="w-full text-left">
// // // // // // // // // // // // // // // // //             <thead className="bg-slate-900 text-slate-400 text-[10px] font-black uppercase tracking-widest">
// // // // // // // // // // // // // // // // //               <tr>
// // // // // // // // // // // // // // // // //                 {headers.map((h) => <th key={h} className="p-7 first:pl-12 last:pr-12">{renameHeader(h)}</th>)}
// // // // // // // // // // // // // // // // //               </tr>
// // // // // // // // // // // // // // // // //             </thead>
// // // // // // // // // // // // // // // // //             <tbody className="divide-y divide-slate-100">
// // // // // // // // // // // // // // // // //               {rows.length === 0 ? (
// // // // // // // // // // // // // // // // //                 <tr><td colSpan={headers.length} className="p-32 text-center text-slate-300 uppercase font-black text-xs">No Data Loaded</td></tr>
// // // // // // // // // // // // // // // // //               ) : (
// // // // // // // // // // // // // // // // //                 rows.map((row, idx) => (
// // // // // // // // // // // // // // // // //                   <tr key={idx} className="hover:bg-slate-50 transition-colors">
// // // // // // // // // // // // // // // // //                     {headers.map((h) => (
// // // // // // // // // // // // // // // // //                       <td key={h} className="p-7 first:pl-12 last:pr-12 text-xs font-bold text-slate-700 uppercase">
// // // // // // // // // // // // // // // // //                         {h === "action" ? (
// // // // // // // // // // // // // // // // //                           <button 
// // // // // // // // // // // // // // // // //                             onClick={() => exportSingleExcel(row._id)}
// // // // // // // // // // // // // // // // //                             className="bg-slate-200 hover:bg-emerald-500 hover:text-white px-3 py-1 rounded text-[9px] transition-all font-black"
// // // // // // // // // // // // // // // // //                           >
// // // // // // // // // // // // // // // // //                             XLSX
// // // // // // // // // // // // // // // // //                           </button>
// // // // // // // // // // // // // // // // //                         ) : h === "status" ? (
// // // // // // // // // // // // // // // // //                           <span className="bg-slate-100 px-3 py-1 rounded-md text-[10px] border border-slate-200">
// // // // // // // // // // // // // // // // //                             {formatCellValue(h, row[h])}
// // // // // // // // // // // // // // // // //                           </span>
// // // // // // // // // // // // // // // // //                         ) : (
// // // // // // // // // // // // // // // // //                           formatCellValue(h, row[h])
// // // // // // // // // // // // // // // // //                         )}
// // // // // // // // // // // // // // // // //                       </td>
// // // // // // // // // // // // // // // // //                     ))}
// // // // // // // // // // // // // // // // //                   </tr>
// // // // // // // // // // // // // // // // //                 ))
// // // // // // // // // // // // // // // // //               )}
// // // // // // // // // // // // // // // // //             </tbody>
// // // // // // // // // // // // // // // // //           </table>
// // // // // // // // // // // // // // // // //         </div>
// // // // // // // // // // // // // // // // //       </div>
// // // // // // // // // // // // // // // // //     </section>
// // // // // // // // // // // // // // // // //   );
// // // // // // // // // // // // // // // // // };







// // // // // // // // // // // // // // // // import { useState, useEffect, useCallback } from "react";
// // // // // // // // // // // // // // // // import { api } from "../api.js";

// // // // // // // // // // // // // // // // const reportEntities = ["indents", "purchase-orders", "distributions", "transfers", "requests", "consumptions"];

// // // // // // // // // // // // // // // // export const ReportsPage = () => {
// // // // // // // // // // // // // // // //   const [entity, setEntity] = useState("indents");
// // // // // // // // // // // // // // // //   const [rows, setRows] = useState([]);
// // // // // // // // // // // // // // // //   const [loading, setLoading] = useState(false);

// // // // // // // // // // // // // // // //   const load = useCallback(async () => {
// // // // // // // // // // // // // // // //     setLoading(true);
// // // // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // // // //       const res = await api.get(`/reports/${entity}`);
// // // // // // // // // // // // // // // //       setRows(res.data);
// // // // // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // // // // //       console.error("Failed to load report:", error);
// // // // // // // // // // // // // // // //     } finally {
// // // // // // // // // // // // // // // //       setLoading(false);
// // // // // // // // // // // // // // // //     }
// // // // // // // // // // // // // // // //   }, [entity]);

// // // // // // // // // // // // // // // //   useEffect(() => {
// // // // // // // // // // // // // // // //     load();
// // // // // // // // // // // // // // // //   }, [load]);

// // // // // // // // // // // // // // // //   const exportAllExcel = () => window.open(`http://localhost:5000/api/reports/${entity}/export/excel`, "_blank");

// // // // // // // // // // // // // // // //   // FIXED: Uses Blob and API instance for authenticated download
// // // // // // // // // // // // // // // //   const exportSingleExcel = async (id) => {
// // // // // // // // // // // // // // // //   try {
// // // // // // // // // // // // // // // //     const response = await api.get(`/reports/${entity}/export/excel/${id}`, {
// // // // // // // // // // // // // // // //       responseType: 'arraybuffer', // Using arraybuffer can be more stable than blob for some Axios configs
// // // // // // // // // // // // // // // //       headers: {
// // // // // // // // // // // // // // // //         'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
// // // // // // // // // // // // // // // //       }
// // // // // // // // // // // // // // // //     });

// // // // // // // // // // // // // // // //     // Create blob from arraybuffer
// // // // // // // // // // // // // // // //     const blob = new Blob([response.data], { 
// // // // // // // // // // // // // // // //       type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
// // // // // // // // // // // // // // // //     });
    
// // // // // // // // // // // // // // // //     const url = window.URL.createObjectURL(blob);
// // // // // // // // // // // // // // // //     const link = document.createElement('a');
// // // // // // // // // // // // // // // //     link.href = url;
    
// // // // // // // // // // // // // // // //     // Use the document number for the filename if available
// // // // // // // // // // // // // // // //     const fileName = `${entity}-${id}.xlsx`;
// // // // // // // // // // // // // // // //     link.setAttribute('download', fileName);
    
// // // // // // // // // // // // // // // //     document.body.appendChild(link);
// // // // // // // // // // // // // // // //     link.click();
    
// // // // // // // // // // // // // // // //     // Cleanup
// // // // // // // // // // // // // // // //     document.body.removeChild(link);
// // // // // // // // // // // // // // // //     window.URL.revokeObjectURL(url);
// // // // // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // // // // //     console.error("Download failed:", error);
// // // // // // // // // // // // // // // //     alert("Download failed. Check if the backend is running and you are logged in as Admin.");
// // // // // // // // // // // // // // // //   }
// // // // // // // // // // // // // // // // };

// // // // // // // // // // // // // // // //   const getHeaders = () => {
// // // // // // // // // // // // // // // //     if (rows.length === 0) return [];
// // // // // // // // // // // // // // // //     const baseHeaders = Object.keys(rows[0]).filter(key => 
// // // // // // // // // // // // // // // //       !["_id", "__v", "items", "updatedAt", "userId"].includes(key)
// // // // // // // // // // // // // // // //     );
// // // // // // // // // // // // // // // //     return [...baseHeaders, "action"];
// // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // //   const headers = getHeaders();

// // // // // // // // // // // // // // // //   const formatCellValue = (header, value) => {
// // // // // // // // // // // // // // // //     if (!value && header !== 'action') return "N/A";
// // // // // // // // // // // // // // // //     if (header === "createdBy" || header === "userId") return value?.name || "Admin";
// // // // // // // // // // // // // // // //     if (header === "status") return String(value).replace("stock_", "").replace("_", " ");
// // // // // // // // // // // // // // // //     if (header === "createdAt") return new Date(value).toLocaleDateString('en-GB');
// // // // // // // // // // // // // // // //     return typeof value === 'object' ? "Data" : String(value);
// // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // //   const renameHeader = (header) => {
// // // // // // // // // // // // // // // //     const names = { createdBy: "Admin", createdAt: "Date", indentNo: "Indent No", action: "Export" };
// // // // // // // // // // // // // // // //     return names[header] || header;
// // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // //   return (
// // // // // // // // // // // // // // // //     <section className="p-8 w-full animate-in fade-in duration-700">
// // // // // // // // // // // // // // // //       <div className="mb-8">
// // // // // // // // // // // // // // // //         <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900">Reports</h1>
// // // // // // // // // // // // // // // //         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Data Analytics & Individual Downloads</p>
// // // // // // // // // // // // // // // //       </div>

// // // // // // // // // // // // // // // //       <div className="flex gap-4 mb-10 bg-slate-100 p-6 rounded-[2rem] border border-slate-200 shadow-inner items-center">
// // // // // // // // // // // // // // // //         <select 
// // // // // // // // // // // // // // // //           className="p-4 rounded-2xl border border-slate-200 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-slate-900 bg-white"
// // // // // // // // // // // // // // // //           value={entity} 
// // // // // // // // // // // // // // // //           onChange={(e) => { setEntity(e.target.value); setRows([]); }}
// // // // // // // // // // // // // // // //         >
// // // // // // // // // // // // // // // //           {reportEntities.map((r) => <option key={r} value={r}>{r.replace("-", " ")}</option>)}
// // // // // // // // // // // // // // // //         </select>
        
// // // // // // // // // // // // // // // //         <button onClick={load} disabled={loading} className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest px-8 py-4 rounded-2xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50">
// // // // // // // // // // // // // // // //           {loading ? "Loading..." : "Preview Table"}
// // // // // // // // // // // // // // // //         </button>

// // // // // // // // // // // // // // // //         <button onClick={exportAllExcel} className="bg-emerald-500 text-slate-900 font-black uppercase text-[10px] tracking-widest px-8 py-4 rounded-2xl hover:bg-emerald-400 transition-all shadow-lg">
// // // // // // // // // // // // // // // //           Export All (Excel)
// // // // // // // // // // // // // // // //         </button>
// // // // // // // // // // // // // // // //       </div>

// // // // // // // // // // // // // // // //       <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden w-full">
// // // // // // // // // // // // // // // //         <div className="overflow-x-auto">
// // // // // // // // // // // // // // // //           <table className="w-full text-left">
// // // // // // // // // // // // // // // //             <thead className="bg-slate-900 text-slate-400 text-[10px] font-black uppercase tracking-widest">
// // // // // // // // // // // // // // // //               <tr>
// // // // // // // // // // // // // // // //                 {headers.map((h) => <th key={h} className="p-7 first:pl-12 last:pr-12">{renameHeader(h)}</th>)}
// // // // // // // // // // // // // // // //               </tr>
// // // // // // // // // // // // // // // //             </thead>
// // // // // // // // // // // // // // // //             <tbody className="divide-y divide-slate-100">
// // // // // // // // // // // // // // // //               {rows.length === 0 && !loading ? (
// // // // // // // // // // // // // // // //                 <tr><td colSpan={headers.length || 1} className="p-32 text-center text-slate-300 uppercase font-black text-xs">No Data Loaded</td></tr>
// // // // // // // // // // // // // // // //               ) : (
// // // // // // // // // // // // // // // //                 rows.map((row, idx) => (
// // // // // // // // // // // // // // // //                   <tr key={idx} className="hover:bg-slate-50 transition-colors">
// // // // // // // // // // // // // // // //                     {headers.map((h) => (
// // // // // // // // // // // // // // // //                       <td key={h} className="p-7 first:pl-12 last:pr-12 text-xs font-bold text-slate-700 uppercase">
// // // // // // // // // // // // // // // //                         {h === "action" ? (
// // // // // // // // // // // // // // // //                           <button 
// // // // // // // // // // // // // // // //                             onClick={() => exportSingleExcel(row._id)}
// // // // // // // // // // // // // // // //                             className="bg-slate-200 hover:bg-emerald-500 hover:text-white px-3 py-1 rounded text-[9px] transition-all font-black"
// // // // // // // // // // // // // // // //                           >
// // // // // // // // // // // // // // // //                             XLSX
// // // // // // // // // // // // // // // //                           </button>
// // // // // // // // // // // // // // // //                         ) : h === "status" ? (
// // // // // // // // // // // // // // // //                           <span className="bg-slate-100 px-3 py-1 rounded-md text-[10px] border border-slate-200">
// // // // // // // // // // // // // // // //                             {formatCellValue(h, row[h])}
// // // // // // // // // // // // // // // //                           </span>
// // // // // // // // // // // // // // // //                         ) : (
// // // // // // // // // // // // // // // //                           formatCellValue(h, row[h])
// // // // // // // // // // // // // // // //                         )}
// // // // // // // // // // // // // // // //                       </td>
// // // // // // // // // // // // // // // //                     ))}
// // // // // // // // // // // // // // // //                   </tr>
// // // // // // // // // // // // // // // //                 ))
// // // // // // // // // // // // // // // //               )}
// // // // // // // // // // // // // // // //             </tbody>
// // // // // // // // // // // // // // // //           </table>
// // // // // // // // // // // // // // // //         </div>
// // // // // // // // // // // // // // // //       </div>
// // // // // // // // // // // // // // // //     </section>
// // // // // // // // // // // // // // // //   );
// // // // // // // // // // // // // // // // };







// // // // // // // // // // // // // // // // woowowo










// // // // // // // // // // // // // // // import { useState, useEffect, useCallback, useMemo } from "react";
// // // // // // // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // // // // // // import { Search, FileText, Download, Table as TableIcon, Filter } from "lucide-react";

// // // // // // // // // // // // // // // const reportEntities = ["indents", "purchase-orders", "distributions", "transfers", "requests", "consumptions"];

// // // // // // // // // // // // // // // export const ReportsPage = () => {
// // // // // // // // // // // // // // //   const [entity, setEntity] = useState("indents");
// // // // // // // // // // // // // // //   const [rows, setRows] = useState([]);
// // // // // // // // // // // // // // //   const [loading, setLoading] = useState(false);
// // // // // // // // // // // // // // //   const [searchTerm, setSearchTerm] = useState("");
// // // // // // // // // // // // // // //   const [selectedRowId, setSelectedRowId] = useState(null);

// // // // // // // // // // // // // // //   const load = useCallback(async () => {
// // // // // // // // // // // // // // //     setLoading(true);
// // // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // // //       const res = await api.get(`/reports/${entity}`);
// // // // // // // // // // // // // // //       const data = res.data || [];
// // // // // // // // // // // // // // //       setRows(data);
// // // // // // // // // // // // // // //       if (data.length > 0) setSelectedRowId(data[0]._id);
// // // // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // // // //       console.error("Failed to load report:", error);
// // // // // // // // // // // // // // //     } finally {
// // // // // // // // // // // // // // //       setLoading(false);
// // // // // // // // // // // // // // //     }
// // // // // // // // // // // // // // //   }, [entity]);

// // // // // // // // // // // // // // //   useEffect(() => {
// // // // // // // // // // // // // // //     load();
// // // // // // // // // // // // // // //   }, [load]);

// // // // // // // // // // // // // // //   const filteredRows = useMemo(() => {
// // // // // // // // // // // // // // //     return rows.filter(row => 
// // // // // // // // // // // // // // //       Object.values(row).some(val => 
// // // // // // // // // // // // // // //         String(val).toLowerCase().includes(searchTerm.toLowerCase())
// // // // // // // // // // // // // // //       )
// // // // // // // // // // // // // // //     );
// // // // // // // // // // // // // // //   }, [rows, searchTerm]);

// // // // // // // // // // // // // // //   const activeRow = useMemo(() => 
// // // // // // // // // // // // // // //     rows.find(r => r._id === selectedRowId), 
// // // // // // // // // // // // // // //   [selectedRowId, rows]);

// // // // // // // // // // // // // // //   const exportAllExcel = () => window.open(`http://localhost:5000/api/reports/${entity}/export/excel`, "_blank");

// // // // // // // // // // // // // // //   const exportSingleExcel = async (id) => {
// // // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // // //       const response = await api.get(`/reports/${entity}/export/excel/${id}`, {
// // // // // // // // // // // // // // //         responseType: 'arraybuffer',
// // // // // // // // // // // // // // //         headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
// // // // // // // // // // // // // // //       });
// // // // // // // // // // // // // // //       const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
// // // // // // // // // // // // // // //       const url = window.URL.createObjectURL(blob);
// // // // // // // // // // // // // // //       const link = document.createElement('a');
// // // // // // // // // // // // // // //       link.href = url;
// // // // // // // // // // // // // // //       link.setAttribute('download', `${entity}-${id}.xlsx`);
// // // // // // // // // // // // // // //       document.body.appendChild(link);
// // // // // // // // // // // // // // //       link.click();
// // // // // // // // // // // // // // //       document.body.removeChild(link);
// // // // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // // // //       alert("Download failed.");
// // // // // // // // // // // // // // //     }
// // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // //   const getVisibleKeys = (item) => {
// // // // // // // // // // // // // // //     if (!item) return [];
// // // // // // // // // // // // // // //     return Object.keys(item).filter(key => 
// // // // // // // // // // // // // // //       !["_id", "__v", "items", "updatedAt", "userId", "createdBy"].includes(key)
// // // // // // // // // // // // // // //     );
// // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // //   return (
// // // // // // // // // // // // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // // // // // // // // // // // //       {/* Header Section */}
// // // // // // // // // // // // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// // // // // // // // // // // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
// // // // // // // // // // // // // // //             Data <span style={{ color: '#6366f1' }}>Analytics</span>
// // // // // // // // // // // // // // //           </h1>
          
// // // // // // // // // // // // // // //           <select 
// // // // // // // // // // // // // // //             value={entity} 
// // // // // // // // // // // // // // //             onChange={(e) => { setEntity(e.target.value); setRows([]); }}
// // // // // // // // // // // // // // //             style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', fontWeight: '700', cursor: 'pointer', outline: 'none', color: '#475569' }}
// // // // // // // // // // // // // // //           >
// // // // // // // // // // // // // // //             {reportEntities.map((r) => <option key={r} value={r}>{r.replace("-", " ").toUpperCase()}</option>)}
// // // // // // // // // // // // // // //           </select>
// // // // // // // // // // // // // // //         </div>

// // // // // // // // // // // // // // //         <div style={{ display: 'flex', gap: '12px' }}>
// // // // // // // // // // // // // // //             <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // // // // // // // // // // //                 <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // // // // // // // // // // // //                 <input
// // // // // // // // // // // // // // //                     type="text"
// // // // // // // // // // // // // // //                     placeholder="Filter records..."
// // // // // // // // // // // // // // //                     value={searchTerm}
// // // // // // // // // // // // // // //                     onChange={(e) => setSearchTerm(e.target.value)}
// // // // // // // // // // // // // // //                     style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '200px', outline: 'none' }}
// // // // // // // // // // // // // // //                 />
// // // // // // // // // // // // // // //             </div>
// // // // // // // // // // // // // // //             <button onClick={exportAllExcel} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // // // // // //                 <Download size={14}/> EXPORT ALL
// // // // // // // // // // // // // // //             </button>
// // // // // // // // // // // // // // //         </div>
// // // // // // // // // // // // // // //       </div>

// // // // // // // // // // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // // // // // // // // // // //         {/* Left Sidebar: List of Records */}
// // // // // // // // // // // // // // //         <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // // // // // // // // //           <div style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '1px' }}>
// // // // // // // // // // // // // // //             RECENT {entity.replace("-", " ").toUpperCase()} ({filteredRows.length})
// // // // // // // // // // // // // // //           </div>
// // // // // // // // // // // // // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
// // // // // // // // // // // // // // //             {loading ? (
// // // // // // // // // // // // // // //                 <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Loading data...</div>
// // // // // // // // // // // // // // //             ) : filteredRows.map(row => (
// // // // // // // // // // // // // // //               <div
// // // // // // // // // // // // // // //                 key={row._id}
// // // // // // // // // // // // // // //                 onClick={() => setSelectedRowId(row._id)}
// // // // // // // // // // // // // // //                 style={{
// // // // // // // // // // // // // // //                   padding: '16px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
// // // // // // // // // // // // // // //                   background: selectedRowId === row._id ? '#fff' : 'rgba(255,255,255,0.4)',
// // // // // // // // // // // // // // //                   border: selectedRowId === row._id ? '1px solid #6366f1' : '1px solid transparent',
// // // // // // // // // // // // // // //                   boxShadow: selectedRowId === row._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// // // // // // // // // // // // // // //                 }}
// // // // // // // // // // // // // // //               >
// // // // // // // // // // // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
// // // // // // // // // // // // // // //                   <div style={{ fontWeight: '800', fontSize: '13px', color: selectedRowId === row._id ? '#6366f1' : '#1e293b' }}>
// // // // // // // // // // // // // // //                     {row.indentNo || row.id || row._id.slice(-8).toUpperCase()}
// // // // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // // // //                   <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8' }}>
// // // // // // // // // // // // // // //                     {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-GB') : ''}
// // // // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // // // //                 </div>
// // // // // // // // // // // // // // //                 <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
// // // // // // // // // // // // // // //                    Status: <span style={{ color: '#0f172a' }}>{row.status || 'N/A'}</span>
// // // // // // // // // // // // // // //                 </div>
// // // // // // // // // // // // // // //               </div>
// // // // // // // // // // // // // // //             ))}
// // // // // // // // // // // // // // //           </div>
// // // // // // // // // // // // // // //         </div>

// // // // // // // // // // // // // // //         {/* Right Detail View */}
// // // // // // // // // // // // // // //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
// // // // // // // // // // // // // // //           {activeRow ? (
// // // // // // // // // // // // // // //             <>
// // // // // // // // // // // // // // //               <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
// // // // // // // // // // // // // // //                 <div>
// // // // // // // // // // // // // // //                   <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '4px' }}>DOCUMENT ID</div>
// // // // // // // // // // // // // // //                   <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>{activeRow.indentNo || activeRow._id}</div>
// // // // // // // // // // // // // // //                 </div>
// // // // // // // // // // // // // // //                 <button 
// // // // // // // // // // // // // // //                   onClick={() => exportSingleExcel(activeRow._id)}
// // // // // // // // // // // // // // //                   style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '12px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
// // // // // // // // // // // // // // //                 >
// // // // // // // // // // // // // // //                   <Download size={16}/> DOWNLOAD XLSX
// // // // // // // // // // // // // // //                 </button>
// // // // // // // // // // // // // // //               </div>

// // // // // // // // // // // // // // //               <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
// // // // // // // // // // // // // // //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px', marginBottom: '48px' }}>
// // // // // // // // // // // // // // //                   {getVisibleKeys(activeRow).map(key => (
// // // // // // // // // // // // // // //                     <div key={key} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{key.replace(/([A-Z])/g, ' $1')}</div>
// // // // // // // // // // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// // // // // // // // // // // // // // //                         {key === 'totalAmount' ? `₹${activeRow[key]?.toLocaleString()}` : String(activeRow[key])}
// // // // // // // // // // // // // // //                       </div>
// // // // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // // // //                   ))}
// // // // // // // // // // // // // // //                 </div>

// // // // // // // // // // // // // // //                 {/* If the report has items (like Indents or POs), show them in a sub-table */}
// // // // // // // // // // // // // // //                 {activeRow.items && (
// // // // // // // // // // // // // // //                   <div>
// // // // // // // // // // // // // // //                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
// // // // // // // // // // // // // // //                         <TableIcon size={16} color="#6366f1" />
// // // // // // // // // // // // // // //                         <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>ITEMIZED BREAKDOWN</span>
// // // // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // // // // // // //                       <thead>
// // // // // // // // // // // // // // //                         <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // // // // // // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>ITEM</th>
// // // // // // // // // // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'center' }}>QUANTITY</th>
// // // // // // // // // // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>AMOUNT</th>
// // // // // // // // // // // // // // //                         </tr>
// // // // // // // // // // // // // // //                       </thead>
// // // // // // // // // // // // // // //                       <tbody>
// // // // // // // // // // // // // // //                         {activeRow.items.map((item, idx) => (
// // // // // // // // // // // // // // //                           <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // // // // //                             <td style={{ padding: '16px 0', fontWeight: '700', color: '#334155', fontSize: '13px' }}>
// // // // // // // // // // // // // // //                                 {item.stockItemId?.name || "Stock Item"}
// // // // // // // // // // // // // // //                             </td>
// // // // // // // // // // // // // // //                             <td style={{ padding: '16px 0', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
// // // // // // // // // // // // // // //                                 {item.quantity || item.receivedQty || item.orderedQty}
// // // // // // // // // // // // // // //                             </td>
// // // // // // // // // // // // // // //                             <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>
// // // // // // // // // // // // // // //                                 ₹{item.amount?.toLocaleString() || "0"}
// // // // // // // // // // // // // // //                             </td>
// // // // // // // // // // // // // // //                           </tr>
// // // // // // // // // // // // // // //                         ))}
// // // // // // // // // // // // // // //                       </tbody>
// // // // // // // // // // // // // // //                     </table>
// // // // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // // // //                 )}
// // // // // // // // // // // // // // //               </div>
// // // // // // // // // // // // // // //             </>
// // // // // // // // // // // // // // //           ) : (
// // // // // // // // // // // // // // //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
// // // // // // // // // // // // // // //               <Filter size={48} color="#e2e8f0" />
// // // // // // // // // // // // // // //               <div style={{ color: '#94a3b8', fontWeight: '600' }}>Select a record to view analytics</div>
// // // // // // // // // // // // // // //             </div>
// // // // // // // // // // // // // // //           )}
// // // // // // // // // // // // // // //         </div>
// // // // // // // // // // // // // // //       </div>
// // // // // // // // // // // // // // //     </div>
// // // // // // // // // // // // // // //   );
// // // // // // // // // // // // // // // };







// // // // // // // // // // // // // // import { useState, useEffect, useCallback, useMemo } from "react";
// // // // // // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // // // // // import { Search, FileText, Download, Table as TableIcon, Filter } from "lucide-react";

// // // // // // // // // // // // // // const reportEntities = ["indents", "purchase-orders", "distributions", "transfers", "requests", "consumptions"];

// // // // // // // // // // // // // // export const ReportsPage = () => {
// // // // // // // // // // // // // //   const [entity, setEntity] = useState("indents");
// // // // // // // // // // // // // //   const [rows, setRows] = useState([]);
// // // // // // // // // // // // // //   const [loading, setLoading] = useState(false);
// // // // // // // // // // // // // //   const [searchTerm, setSearchTerm] = useState("");
// // // // // // // // // // // // // //   const [selectedRowId, setSelectedRowId] = useState(null);

// // // // // // // // // // // // // //   const load = useCallback(async () => {
// // // // // // // // // // // // // //     setLoading(true);
// // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // //       const res = await api.get(`/reports/${entity}`);
// // // // // // // // // // // // // //       const data = res.data || [];
// // // // // // // // // // // // // //       setRows(data);
// // // // // // // // // // // // // //       if (data.length > 0) setSelectedRowId(data[0]._id);
// // // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // // //       console.error("Failed to load report:", error);
// // // // // // // // // // // // // //     } finally {
// // // // // // // // // // // // // //       setLoading(false);
// // // // // // // // // // // // // //     }
// // // // // // // // // // // // // //   }, [entity]);

// // // // // // // // // // // // // //   useEffect(() => {
// // // // // // // // // // // // // //     load();
// // // // // // // // // // // // // //   }, [load]);

// // // // // // // // // // // // // //   const filteredRows = useMemo(() => {
// // // // // // // // // // // // // //     return rows.filter(row => 
// // // // // // // // // // // // // //       Object.values(row).some(val => 
// // // // // // // // // // // // // //         String(val).toLowerCase().includes(searchTerm.toLowerCase())
// // // // // // // // // // // // // //       )
// // // // // // // // // // // // // //     );
// // // // // // // // // // // // // //   }, [rows, searchTerm]);

// // // // // // // // // // // // // //   const activeRow = useMemo(() => 
// // // // // // // // // // // // // //     rows.find(r => r._id === selectedRowId), 
// // // // // // // // // // // // // //   [selectedRowId, rows]);

// // // // // // // // // // // // // //   const exportAllExcel = () => window.open(`http://localhost:5000/api/reports/${entity}/export/excel`, "_blank");

// // // // // // // // // // // // // //   // UPDATED: Fully integrated single export handler
// // // // // // // // // // // // // //   const exportSingleExcel = async (id) => {
// // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // //       const response = await api.get(`/reports/${entity}/export/excel/${id}`, {
// // // // // // // // // // // // // //         responseType: 'arraybuffer',
// // // // // // // // // // // // // //         headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
// // // // // // // // // // // // // //       });
      
// // // // // // // // // // // // // //       const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
// // // // // // // // // // // // // //       const url = window.URL.createObjectURL(blob);
// // // // // // // // // // // // // //       const link = document.createElement('a');
// // // // // // // // // // // // // //       link.href = url;
// // // // // // // // // // // // // //       link.setAttribute('download', `${entity}-${id}.xlsx`);
// // // // // // // // // // // // // //       document.body.appendChild(link);
// // // // // // // // // // // // // //       link.click();
// // // // // // // // // // // // // //       document.body.removeChild(link);
// // // // // // // // // // // // // //       window.URL.revokeObjectURL(url);
// // // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // // //       console.error("Export Error:", error);
// // // // // // // // // // // // // //       alert("Download failed.");
// // // // // // // // // // // // // //     }
// // // // // // // // // // // // // //   };

// // // // // // // // // // // // // //   const getVisibleKeys = (item) => {
// // // // // // // // // // // // // //     if (!item) return [];
// // // // // // // // // // // // // //     return Object.keys(item).filter(key => 
// // // // // // // // // // // // // //       !["_id", "__v", "items", "allocations", "leftovers", "updatedAt", "userId", "createdBy", "indentId", "purchaseOrderId"].includes(key)
// // // // // // // // // // // // // //     );
// // // // // // // // // // // // // //   };

// // // // // // // // // // // // // //   return (
// // // // // // // // // // // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // // // // // // // // // // //       {/* Header Section */}
// // // // // // // // // // // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// // // // // // // // // // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
// // // // // // // // // // // // // //             Data <span style={{ color: '#6366f1' }}>Analytics</span>
// // // // // // // // // // // // // //           </h1>
          
// // // // // // // // // // // // // //           <select 
// // // // // // // // // // // // // //             value={entity} 
// // // // // // // // // // // // // //             onChange={(e) => { setEntity(e.target.value); setRows([]); }}
// // // // // // // // // // // // // //             style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', fontWeight: '700', cursor: 'pointer', outline: 'none', color: '#475569' }}
// // // // // // // // // // // // // //           >
// // // // // // // // // // // // // //             {reportEntities.map((r) => <option key={r} value={r}>{r.replace("-", " ").toUpperCase()}</option>)}
// // // // // // // // // // // // // //           </select>
// // // // // // // // // // // // // //         </div>

// // // // // // // // // // // // // //         <div style={{ display: 'flex', gap: '12px' }}>
// // // // // // // // // // // // // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // // // // // // // // // //             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // // // // // // // // // // //             <input
// // // // // // // // // // // // // //               type="text"
// // // // // // // // // // // // // //               placeholder="Filter records..."
// // // // // // // // // // // // // //               value={searchTerm}
// // // // // // // // // // // // // //               onChange={(e) => setSearchTerm(e.target.value)}
// // // // // // // // // // // // // //               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '200px', outline: 'none' }}
// // // // // // // // // // // // // //             />
// // // // // // // // // // // // // //           </div>
// // // // // // // // // // // // // //           <button onClick={exportAllExcel} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // // // // //             <Download size={14}/> EXPORT ALL
// // // // // // // // // // // // // //           </button>
// // // // // // // // // // // // // //         </div>
// // // // // // // // // // // // // //       </div>

// // // // // // // // // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // // // // // // // // // //         {/* Left Sidebar */}
// // // // // // // // // // // // // //         <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // // // // // // // //           <div style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '1px' }}>
// // // // // // // // // // // // // //             RECENT {entity.replace("-", " ").toUpperCase()} ({filteredRows.length})
// // // // // // // // // // // // // //           </div>
// // // // // // // // // // // // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
// // // // // // // // // // // // // //             {loading ? (
// // // // // // // // // // // // // //               <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Loading data...</div>
// // // // // // // // // // // // // //             ) : filteredRows.map(row => (
// // // // // // // // // // // // // //               <div
// // // // // // // // // // // // // //                 key={row._id}
// // // // // // // // // // // // // //                 onClick={() => setSelectedRowId(row._id)}
// // // // // // // // // // // // // //                 style={{
// // // // // // // // // // // // // //                   padding: '16px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
// // // // // // // // // // // // // //                   background: selectedRowId === row._id ? '#fff' : 'rgba(255,255,255,0.4)',
// // // // // // // // // // // // // //                   border: selectedRowId === row._id ? '1px solid #6366f1' : '1px solid transparent',
// // // // // // // // // // // // // //                   boxShadow: selectedRowId === row._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// // // // // // // // // // // // // //                 }}
// // // // // // // // // // // // // //               >
// // // // // // // // // // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
// // // // // // // // // // // // // //                   <div style={{ fontWeight: '800', fontSize: '13px', color: selectedRowId === row._id ? '#6366f1' : '#1e293b' }}>
// // // // // // // // // // // // // //                     {row.indentNo || row.orderNo || row.transferNo || row._id.slice(-8).toUpperCase()}
// // // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // // //                   <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8' }}>
// // // // // // // // // // // // // //                     {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-GB') : ''}
// // // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // // //                 </div>
// // // // // // // // // // // // // //                 <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
// // // // // // // // // // // // // //                   Status: <span style={{ color: '#0f172a' }}>{row.status?.toUpperCase() || 'N/A'}</span>
// // // // // // // // // // // // // //                 </div>
// // // // // // // // // // // // // //               </div>
// // // // // // // // // // // // // //             ))}
// // // // // // // // // // // // // //           </div>
// // // // // // // // // // // // // //         </div>

// // // // // // // // // // // // // //         {/* Right Detail View */}
// // // // // // // // // // // // // //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
// // // // // // // // // // // // // //           {activeRow ? (
// // // // // // // // // // // // // //             <>
// // // // // // // // // // // // // //               <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
// // // // // // // // // // // // // //                 <div>
// // // // // // // // // // // // // //                   <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '4px' }}>DOCUMENT ID</div>
// // // // // // // // // // // // // //                   <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>{activeRow.indentNo || activeRow.orderNo || activeRow._id}</div>
// // // // // // // // // // // // // //                 </div>
// // // // // // // // // // // // // //                 <button 
// // // // // // // // // // // // // //                   onClick={() => exportSingleExcel(activeRow._id)}
// // // // // // // // // // // // // //                   style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '12px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
// // // // // // // // // // // // // //                 >
// // // // // // // // // // // // // //                   <Download size={16}/> DOWNLOAD XLSX
// // // // // // // // // // // // // //                 </button>
// // // // // // // // // // // // // //               </div>

// // // // // // // // // // // // // //               <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
// // // // // // // // // // // // // //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px', marginBottom: '48px' }}>
// // // // // // // // // // // // // //                   {getVisibleKeys(activeRow).map(key => (
// // // // // // // // // // // // // //                     <div key={key} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{key.replace(/([A-Z])/g, ' $1')}</div>
// // // // // // // // // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// // // // // // // // // // // // // //                         {key === 'totalAmount' ? `₹${activeRow[key]?.toLocaleString()}` : String(activeRow[key])}
// // // // // // // // // // // // // //                       </div>
// // // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // // //                   ))}
// // // // // // // // // // // // // //                 </div>

// // // // // // // // // // // // // //                 {/* Unified Itemized Breakdown */}
// // // // // // // // // // // // // //                 {(activeRow.items || activeRow.allocations) && (
// // // // // // // // // // // // // //                   <div>
// // // // // // // // // // // // // //                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
// // // // // // // // // // // // // //                         <TableIcon size={16} color="#6366f1" />
// // // // // // // // // // // // // //                         <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>ITEMIZED BREAKDOWN</span>
// // // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // // // // // //                       <thead>
// // // // // // // // // // // // // //                         <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // // // // // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>ITEM</th>
// // // // // // // // // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'center' }}>QUANTITY</th>
// // // // // // // // // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>AMOUNT</th>
// // // // // // // // // // // // // //                         </tr>
// // // // // // // // // // // // // //                       </thead>
// // // // // // // // // // // // // //                       <tbody>
// // // // // // // // // // // // // //                         {(activeRow.items || activeRow.allocations || []).map((item, idx) => {
// // // // // // // // // // // // // //                           const itemName = item.stockItemId?.name || "Unknown Item";
// // // // // // // // // // // // // //                           const quantity = item.quantity || item.receivedQty || item.orderedQty || item.qtyBaseUnit || 0;
// // // // // // // // // // // // // //                           const unitSymbol = item.stockItemId?.unitId?.symbol || "";

// // // // // // // // // // // // // //                           return (
// // // // // // // // // // // // // //                             <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // // // //                               <td style={{ padding: '16px 0', fontWeight: '700', color: '#334155', fontSize: '13px' }}>
// // // // // // // // // // // // // //                                 {itemName}
// // // // // // // // // // // // // //                               </td>
// // // // // // // // // // // // // //                               <td style={{ padding: '16px 0', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
// // // // // // // // // // // // // //                                 {quantity} <span style={{ fontSize: '10px', color: '#94a3b8' }}>{unitSymbol}</span>
// // // // // // // // // // // // // //                               </td>
// // // // // // // // // // // // // //                               <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>
// // // // // // // // // // // // // //                                 {item.amount || item.unitPrice ? `₹${(item.amount || (quantity * (item.unitPrice || 0))).toLocaleString()}` : "—"}
// // // // // // // // // // // // // //                               </td>
// // // // // // // // // // // // // //                             </tr>
// // // // // // // // // // // // // //                           );
// // // // // // // // // // // // // //                         })}
// // // // // // // // // // // // // //                       </tbody>
// // // // // // // // // // // // // //                     </table>
// // // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // // //                 )}
// // // // // // // // // // // // // //               </div>
// // // // // // // // // // // // // //             </>
// // // // // // // // // // // // // //           ) : (
// // // // // // // // // // // // // //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
// // // // // // // // // // // // // //               <Filter size={48} color="#e2e8f0" />
// // // // // // // // // // // // // //               <div style={{ color: '#94a3b8', fontWeight: '600' }}>Select a record to view analytics</div>
// // // // // // // // // // // // // //             </div>
// // // // // // // // // // // // // //           )}
// // // // // // // // // // // // // //         </div>
// // // // // // // // // // // // // //       </div>
// // // // // // // // // // // // // //     </div>
// // // // // // // // // // // // // //   );
// // // // // // // // // // // // // // };











// // // // // // // // // // // // // // above is final







// // // // // // // // // // // // // import { useState, useEffect, useCallback, useMemo } from "react";
// // // // // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // // // // import { Search, FileText, Download, Table as TableIcon, Filter } from "lucide-react";

// // // // // // // // // // // // // const reportEntities = ["indents", "purchase-orders", "distributions", "transfers", "requests", "consumptions"];

// // // // // // // // // // // // // export const ReportsPage = () => {
// // // // // // // // // // // // //   const [entity, setEntity] = useState("indents");
// // // // // // // // // // // // //   const [rows, setRows] = useState([]);
// // // // // // // // // // // // //   const [loading, setLoading] = useState(false);
// // // // // // // // // // // // //   const [searchTerm, setSearchTerm] = useState("");
// // // // // // // // // // // // //   const [selectedRowId, setSelectedRowId] = useState(null);

// // // // // // // // // // // // //   const load = useCallback(async () => {
// // // // // // // // // // // // //     setLoading(true);
// // // // // // // // // // // // //     try {
// // // // // // // // // // // // //       const res = await api.get(`/reports/${entity}`);
// // // // // // // // // // // // //       const data = res.data || [];
// // // // // // // // // // // // //       setRows(data);
// // // // // // // // // // // // //       if (data.length > 0) setSelectedRowId(data[0]._id);
// // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // //       console.error("Failed to load report:", error);
// // // // // // // // // // // // //     } finally {
// // // // // // // // // // // // //       setLoading(false);
// // // // // // // // // // // // //     }
// // // // // // // // // // // // //   }, [entity]);

// // // // // // // // // // // // //   useEffect(() => {
// // // // // // // // // // // // //     load();
// // // // // // // // // // // // //   }, [load]);

// // // // // // // // // // // // //   const filteredRows = useMemo(() => {
// // // // // // // // // // // // //     return rows.filter(row => 
// // // // // // // // // // // // //       Object.values(row).some(val => 
// // // // // // // // // // // // //         String(val).toLowerCase().includes(searchTerm.toLowerCase())
// // // // // // // // // // // // //       )
// // // // // // // // // // // // //     );
// // // // // // // // // // // // //   }, [rows, searchTerm]);

// // // // // // // // // // // // //   const activeRow = useMemo(() => 
// // // // // // // // // // // // //     rows.find(r => r._id === selectedRowId), 
// // // // // // // // // // // // //   [selectedRowId, rows]);

// // // // // // // // // // // // //   const exportAllExcel = () => window.open(`http://localhost:5000/api/reports/${entity}/export/excel`, "_blank");

// // // // // // // // // // // // //   const exportSingleExcel = async (id) => {
// // // // // // // // // // // // //     try {
// // // // // // // // // // // // //       const response = await api.get(`/reports/${entity}/export/excel/${id}`, {
// // // // // // // // // // // // //         responseType: 'arraybuffer',
// // // // // // // // // // // // //         headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
// // // // // // // // // // // // //       });
      
// // // // // // // // // // // // //       const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
// // // // // // // // // // // // //       const url = window.URL.createObjectURL(blob);
// // // // // // // // // // // // //       const link = document.createElement('a');
// // // // // // // // // // // // //       link.href = url;
// // // // // // // // // // // // //       link.setAttribute('download', `${entity}-${id}.xlsx`);
// // // // // // // // // // // // //       document.body.appendChild(link);
// // // // // // // // // // // // //       link.click();
// // // // // // // // // // // // //       document.body.removeChild(link);
// // // // // // // // // // // // //       window.URL.revokeObjectURL(url);
// // // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // // //       console.error("Export Error:", error);
// // // // // // // // // // // // //       alert("Download failed.");
// // // // // // // // // // // // //     }
// // // // // // // // // // // // //   };

// // // // // // // // // // // // //   // UPDATED: Filter out specific IDs and Godown objects to handle them manually
// // // // // // // // // // // // //   const getVisibleKeys = (item) => {
// // // // // // // // // // // // //     if (!item) return [];
// // // // // // // // // // // // //     return Object.keys(item).filter(key => 
// // // // // // // // // // // // //       !["_id", "__v", "items", "allocations", "leftovers", "updatedAt", "userId", "createdBy", 
// // // // // // // // // // // // //         "indentId", "purchaseOrderId", "leftoverSourceId", "fromGodownId", "toGodownId"].includes(key)
// // // // // // // // // // // // //     );
// // // // // // // // // // // // //   };

// // // // // // // // // // // // //   return (
// // // // // // // // // // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // // // // // // // // // //       {/* Header Section */}
// // // // // // // // // // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// // // // // // // // // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
// // // // // // // // // // // // //             Data <span style={{ color: '#6366f1' }}>Analytics</span>
// // // // // // // // // // // // //           </h1>
          
// // // // // // // // // // // // //           <select 
// // // // // // // // // // // // //             value={entity} 
// // // // // // // // // // // // //             onChange={(e) => { setEntity(e.target.value); setRows([]); }}
// // // // // // // // // // // // //             style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', fontWeight: '700', cursor: 'pointer', outline: 'none', color: '#475569' }}
// // // // // // // // // // // // //           >
// // // // // // // // // // // // //             {reportEntities.map((r) => <option key={r} value={r}>{r.replace("-", " ").toUpperCase()}</option>)}
// // // // // // // // // // // // //           </select>
// // // // // // // // // // // // //         </div>

// // // // // // // // // // // // //         <div style={{ display: 'flex', gap: '12px' }}>
// // // // // // // // // // // // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // // // // // // // // //             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // // // // // // // // // //             <input
// // // // // // // // // // // // //               type="text"
// // // // // // // // // // // // //               placeholder="Filter records..."
// // // // // // // // // // // // //               value={searchTerm}
// // // // // // // // // // // // //               onChange={(e) => setSearchTerm(e.target.value)}
// // // // // // // // // // // // //               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '200px', outline: 'none' }}
// // // // // // // // // // // // //             />
// // // // // // // // // // // // //           </div>
// // // // // // // // // // // // //           <button onClick={exportAllExcel} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // // // //             <Download size={14}/> EXPORT ALL
// // // // // // // // // // // // //           </button>
// // // // // // // // // // // // //         </div>
// // // // // // // // // // // // //       </div>

// // // // // // // // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // // // // // // // // //         {/* Left Sidebar */}
// // // // // // // // // // // // //         <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // // // // // // //           <div style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '1px' }}>
// // // // // // // // // // // // //             RECENT {entity.replace("-", " ").toUpperCase()} ({filteredRows.length})
// // // // // // // // // // // // //           </div>
// // // // // // // // // // // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
// // // // // // // // // // // // //             {loading ? (
// // // // // // // // // // // // //               <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Loading data...</div>
// // // // // // // // // // // // //             ) : filteredRows.map(row => (
// // // // // // // // // // // // //               <div
// // // // // // // // // // // // //                 key={row._id}
// // // // // // // // // // // // //                 onClick={() => setSelectedRowId(row._id)}
// // // // // // // // // // // // //                 style={{
// // // // // // // // // // // // //                   padding: '16px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
// // // // // // // // // // // // //                   background: selectedRowId === row._id ? '#fff' : 'rgba(255,255,255,0.4)',
// // // // // // // // // // // // //                   border: selectedRowId === row._id ? '1px solid #6366f1' : '1px solid transparent',
// // // // // // // // // // // // //                   boxShadow: selectedRowId === row._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// // // // // // // // // // // // //                 }}
// // // // // // // // // // // // //               >
// // // // // // // // // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
// // // // // // // // // // // // //                   <div style={{ fontWeight: '800', fontSize: '13px', color: selectedRowId === row._id ? '#6366f1' : '#1e293b' }}>
// // // // // // // // // // // // //                     {row.indentNo || row.orderNo || row.transferNo || row._id.slice(-8).toUpperCase()}
// // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // //                   <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8' }}>
// // // // // // // // // // // // //                     {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-GB') : ''}
// // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // //                 </div>
// // // // // // // // // // // // //                 <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
// // // // // // // // // // // // //                   Status: <span style={{ color: '#0f172a' }}>{row.status?.toUpperCase() || 'N/A'}</span>
// // // // // // // // // // // // //                 </div>
// // // // // // // // // // // // //               </div>
// // // // // // // // // // // // //             ))}
// // // // // // // // // // // // //           </div>
// // // // // // // // // // // // //         </div>

// // // // // // // // // // // // //         {/* Right Detail View */}
// // // // // // // // // // // // //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
// // // // // // // // // // // // //           {activeRow ? (
// // // // // // // // // // // // //             <>
// // // // // // // // // // // // //               <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
// // // // // // // // // // // // //                 <div>
// // // // // // // // // // // // //                   <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '4px' }}>DOCUMENT ID</div>
// // // // // // // // // // // // //                   <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>{activeRow.indentNo || activeRow.orderNo || activeRow.transferNo || activeRow._id}</div>
// // // // // // // // // // // // //                 </div>
// // // // // // // // // // // // //                 <button 
// // // // // // // // // // // // //                   onClick={() => exportSingleExcel(activeRow._id)}
// // // // // // // // // // // // //                   style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '12px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
// // // // // // // // // // // // //                 >
// // // // // // // // // // // // //                   <Download size={16}/> DOWNLOAD XLSX
// // // // // // // // // // // // //                 </button>
// // // // // // // // // // // // //               </div>

// // // // // // // // // // // // //               <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
// // // // // // // // // // // // //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px', marginBottom: '48px' }}>
                  
// // // // // // // // // // // // //                   {/* UPDATED: Manual rendering for Godown Names to avoid [object Object] */}
// // // // // // // // // // // // //                   {activeRow.fromGodownId && (
// // // // // // // // // // // // //                     <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>FROM GODOWN</div>
// // // // // // // // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// // // // // // // // // // // // //                         {activeRow.fromGodownId.name || "Main Store"}
// // // // // // // // // // // // //                       </div>
// // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // //                   )}

// // // // // // // // // // // // //                   {activeRow.toGodownId && (
// // // // // // // // // // // // //                     <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>TO GODOWN</div>
// // // // // // // // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// // // // // // // // // // // // //                         {activeRow.toGodownId.name || "Kitchen"}
// // // // // // // // // // // // //                       </div>
// // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // //                   )}

// // // // // // // // // // // // //                   {getVisibleKeys(activeRow).map(key => (
// // // // // // // // // // // // //                     <div key={key} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{key.replace(/([A-Z])/g, ' $1')}</div>
// // // // // // // // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// // // // // // // // // // // // //                         {key === 'totalAmount' ? `₹${activeRow[key]?.toLocaleString()}` : String(activeRow[key])}
// // // // // // // // // // // // //                       </div>
// // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // //                   ))}
// // // // // // // // // // // // //                 </div>

// // // // // // // // // // // // //                 {/* Unified Itemized Breakdown */}
// // // // // // // // // // // // //                 {(activeRow.items || activeRow.allocations) && (
// // // // // // // // // // // // //                   <div>
// // // // // // // // // // // // //                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
// // // // // // // // // // // // //                         <TableIcon size={16} color="#6366f1" />
// // // // // // // // // // // // //                         <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>ITEMIZED BREAKDOWN</span>
// // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // // // // //                       <thead>
// // // // // // // // // // // // //                         <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // // // // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>ITEM</th>
// // // // // // // // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'center' }}>QUANTITY</th>
// // // // // // // // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>AMOUNT</th>
// // // // // // // // // // // // //                         </tr>
// // // // // // // // // // // // //                       </thead>
// // // // // // // // // // // // //                       <tbody>
// // // // // // // // // // // // //                         {(activeRow.items || activeRow.allocations || []).map((item, idx) => {
// // // // // // // // // // // // //                           const itemName = item.stockItemId?.name || "Unknown Item";
// // // // // // // // // // // // //                           const quantity = item.quantity || item.receivedQty || item.orderedQty || item.qtyBaseUnit || 0;
// // // // // // // // // // // // //                           const unitSymbol = item.stockItemId?.unitId?.symbol || "";

// // // // // // // // // // // // //                           return (
// // // // // // // // // // // // //                             <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // // //                               <td style={{ padding: '16px 0', fontWeight: '700', color: '#334155', fontSize: '13px' }}>
// // // // // // // // // // // // //                                 {itemName}
// // // // // // // // // // // // //                               </td>
// // // // // // // // // // // // //                               <td style={{ padding: '16px 0', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
// // // // // // // // // // // // //                                 {quantity} <span style={{ fontSize: '10px', color: '#94a3b8' }}>{unitSymbol}</span>
// // // // // // // // // // // // //                               </td>
// // // // // // // // // // // // //                               <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>
// // // // // // // // // // // // //                                 {item.amount || item.unitPrice ? `₹${(item.amount || (quantity * (item.unitPrice || 0))).toLocaleString()}` : "—"}
// // // // // // // // // // // // //                               </td>
// // // // // // // // // // // // //                             </tr>
// // // // // // // // // // // // //                           );
// // // // // // // // // // // // //                         })}
// // // // // // // // // // // // //                       </tbody>
// // // // // // // // // // // // //                     </table>
// // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // //                 )}
// // // // // // // // // // // // //               </div>
// // // // // // // // // // // // //             </>
// // // // // // // // // // // // //           ) : (
// // // // // // // // // // // // //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
// // // // // // // // // // // // //               <Filter size={48} color="#e2e8f0" />
// // // // // // // // // // // // //               <div style={{ color: '#94a3b8', fontWeight: '600' }}>Select a record to view analytics</div>
// // // // // // // // // // // // //             </div>
// // // // // // // // // // // // //           )}
// // // // // // // // // // // // //         </div>
// // // // // // // // // // // // //       </div>
// // // // // // // // // // // // //     </div>
// // // // // // // // // // // // //   );
// // // // // // // // // // // // // };




// // // // // // // // // // // // // very very good






// // // // // // // // // // // // import { useState, useEffect, useCallback, useMemo } from "react";
// // // // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // // // import { Search, FileText, Download, Table as TableIcon, Filter } from "lucide-react";

// // // // // // // // // // // // const reportEntities = ["indents", "purchase-orders", "distributions", "transfers", "requests", "consumptions"];

// // // // // // // // // // // // export const ReportsPage = () => {
// // // // // // // // // // // //   const [entity, setEntity] = useState("indents");
// // // // // // // // // // // //   const [rows, setRows] = useState([]);
// // // // // // // // // // // //   const [loading, setLoading] = useState(false);
// // // // // // // // // // // //   const [searchTerm, setSearchTerm] = useState("");
// // // // // // // // // // // //   const [selectedRowId, setSelectedRowId] = useState(null);

// // // // // // // // // // // //   const load = useCallback(async () => {
// // // // // // // // // // // //     setLoading(true);
// // // // // // // // // // // //     try {
// // // // // // // // // // // //       const res = await api.get(`/reports/${entity}`);
// // // // // // // // // // // //       const data = res.data || [];
// // // // // // // // // // // //       setRows(data);
// // // // // // // // // // // //       if (data.length > 0) setSelectedRowId(data[0]._id);
// // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // //       console.error("Failed to load report:", error);
// // // // // // // // // // // //     } finally {
// // // // // // // // // // // //       setLoading(false);
// // // // // // // // // // // //     }
// // // // // // // // // // // //   }, [entity]);

// // // // // // // // // // // //   useEffect(() => {
// // // // // // // // // // // //     load();
// // // // // // // // // // // //   }, [load]);

// // // // // // // // // // // //   const filteredRows = useMemo(() => {
// // // // // // // // // // // //     return rows.filter(row => 
// // // // // // // // // // // //       Object.values(row).some(val => 
// // // // // // // // // // // //         String(val).toLowerCase().includes(searchTerm.toLowerCase())
// // // // // // // // // // // //       )
// // // // // // // // // // // //     );
// // // // // // // // // // // //   }, [rows, searchTerm]);

// // // // // // // // // // // //   const activeRow = useMemo(() => 
// // // // // // // // // // // //     rows.find(r => r._id === selectedRowId), 
// // // // // // // // // // // //   [selectedRowId, rows]);

// // // // // // // // // // // //   const exportAllExcel = () => window.open(`http://localhost:5000/api/reports/${entity}/export/excel`, "_blank");

// // // // // // // // // // // //   const exportSingleExcel = async (id) => {
// // // // // // // // // // // //     try {
// // // // // // // // // // // //       const response = await api.get(`/reports/${entity}/export/excel/${id}`, {
// // // // // // // // // // // //         responseType: 'arraybuffer',
// // // // // // // // // // // //         headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
// // // // // // // // // // // //       });
      
// // // // // // // // // // // //       const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
// // // // // // // // // // // //       const url = window.URL.createObjectURL(blob);
// // // // // // // // // // // //       const link = document.createElement('a');
// // // // // // // // // // // //       link.href = url;
// // // // // // // // // // // //       link.setAttribute('download', `${entity}-${id}.xlsx`);
// // // // // // // // // // // //       document.body.appendChild(link);
// // // // // // // // // // // //       link.click();
// // // // // // // // // // // //       document.body.removeChild(link);
// // // // // // // // // // // //       window.URL.revokeObjectURL(url);
// // // // // // // // // // // //     } catch (error) {
// // // // // // // // // // // //       console.error("Export Error:", error);
// // // // // // // // // // // //       alert("Download failed.");
// // // // // // // // // // // //     }
// // // // // // // // // // // //   };

// // // // // // // // // // // //   // UPDATED: Filter out godownId to prevent raw object/ID display
// // // // // // // // // // // //   const getVisibleKeys = (item) => {
// // // // // // // // // // // //     if (!item) return [];
// // // // // // // // // // // //     return Object.keys(item).filter(key => 
// // // // // // // // // // // //       !["_id", "__v", "items", "allocations", "leftovers", "updatedAt", "userId", "createdBy", 
// // // // // // // // // // // //         "indentId", "purchaseOrderId", "leftoverSourceId", "fromGodownId", "toGodownId", "godownId"].includes(key)
// // // // // // // // // // // //     );
// // // // // // // // // // // //   };

// // // // // // // // // // // //   return (
// // // // // // // // // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // // // // // // // // //       {/* Header Section */}
// // // // // // // // // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// // // // // // // // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
// // // // // // // // // // // //             Data <span style={{ color: '#6366f1' }}>Analytics</span>
// // // // // // // // // // // //           </h1>
          
// // // // // // // // // // // //           <select 
// // // // // // // // // // // //             value={entity} 
// // // // // // // // // // // //             onChange={(e) => { setEntity(e.target.value); setRows([]); }}
// // // // // // // // // // // //             style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', fontWeight: '700', cursor: 'pointer', outline: 'none', color: '#475569' }}
// // // // // // // // // // // //           >
// // // // // // // // // // // //             {reportEntities.map((r) => <option key={r} value={r}>{r.replace("-", " ").toUpperCase()}</option>)}
// // // // // // // // // // // //           </select>
// // // // // // // // // // // //         </div>

// // // // // // // // // // // //         <div style={{ display: 'flex', gap: '12px' }}>
// // // // // // // // // // // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // // // // // // // //             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // // // // // // // // //             <input
// // // // // // // // // // // //               type="text"
// // // // // // // // // // // //               placeholder="Filter records..."
// // // // // // // // // // // //               value={searchTerm}
// // // // // // // // // // // //               onChange={(e) => setSearchTerm(e.target.value)}
// // // // // // // // // // // //               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '200px', outline: 'none' }}
// // // // // // // // // // // //             />
// // // // // // // // // // // //           </div>
// // // // // // // // // // // //           <button onClick={exportAllExcel} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // // //             <Download size={14}/> EXPORT ALL
// // // // // // // // // // // //           </button>
// // // // // // // // // // // //         </div>
// // // // // // // // // // // //       </div>

// // // // // // // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // // // // // // // //         {/* Left Sidebar */}
// // // // // // // // // // // //         <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // // // // // //           <div style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '1px' }}>
// // // // // // // // // // // //             RECENT {entity.replace("-", " ").toUpperCase()} ({filteredRows.length})
// // // // // // // // // // // //           </div>
// // // // // // // // // // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
// // // // // // // // // // // //             {loading ? (
// // // // // // // // // // // //               <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Loading data...</div>
// // // // // // // // // // // //             ) : filteredRows.map(row => (
// // // // // // // // // // // //               <div
// // // // // // // // // // // //                 key={row._id}
// // // // // // // // // // // //                 onClick={() => setSelectedRowId(row._id)}
// // // // // // // // // // // //                 style={{
// // // // // // // // // // // //                   padding: '16px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
// // // // // // // // // // // //                   background: selectedRowId === row._id ? '#fff' : 'rgba(255,255,255,0.4)',
// // // // // // // // // // // //                   border: selectedRowId === row._id ? '1px solid #6366f1' : '1px solid transparent',
// // // // // // // // // // // //                   boxShadow: selectedRowId === row._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// // // // // // // // // // // //                 }}
// // // // // // // // // // // //               >
// // // // // // // // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
// // // // // // // // // // // //                   <div style={{ fontWeight: '800', fontSize: '13px', color: selectedRowId === row._id ? '#6366f1' : '#1e293b' }}>
// // // // // // // // // // // //                     {row.indentNo || row.orderNo || row.transferNo || row.requestNo || row._id.slice(-8).toUpperCase()}
// // // // // // // // // // // //                   </div>
// // // // // // // // // // // //                   <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8' }}>
// // // // // // // // // // // //                     {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-GB') : ''}
// // // // // // // // // // // //                   </div>
// // // // // // // // // // // //                 </div>
// // // // // // // // // // // //                 <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
// // // // // // // // // // // //                   Status: <span style={{ color: '#0f172a' }}>{row.status?.toUpperCase() || 'N/A'}</span>
// // // // // // // // // // // //                 </div>
// // // // // // // // // // // //               </div>
// // // // // // // // // // // //             ))}
// // // // // // // // // // // //           </div>
// // // // // // // // // // // //         </div>

// // // // // // // // // // // //         {/* Right Detail View */}
// // // // // // // // // // // //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
// // // // // // // // // // // //           {activeRow ? (
// // // // // // // // // // // //             <>
// // // // // // // // // // // //               <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
// // // // // // // // // // // //                 <div>
// // // // // // // // // // // //                   <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '4px' }}>DOCUMENT ID</div>
// // // // // // // // // // // //                   <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>{activeRow.indentNo || activeRow.orderNo || activeRow.transferNo || activeRow.requestNo || activeRow._id}</div>
// // // // // // // // // // // //                 </div>
// // // // // // // // // // // //                 <button 
// // // // // // // // // // // //                   onClick={() => exportSingleExcel(activeRow._id)}
// // // // // // // // // // // //                   style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '12px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
// // // // // // // // // // // //                 >
// // // // // // // // // // // //                   <Download size={16}/> DOWNLOAD XLSX
// // // // // // // // // // // //                 </button>
// // // // // // // // // // // //               </div>

// // // // // // // // // // // //               <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
// // // // // // // // // // // //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px', marginBottom: '48px' }}>
                  
// // // // // // // // // // // //                   {/* Manual rendering for Godown Names across all relevant entities */}
// // // // // // // // // // // //                   {activeRow.fromGodownId && (
// // // // // // // // // // // //                     <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>FROM GODOWN</div>
// // // // // // // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// // // // // // // // // // // //                         {activeRow.fromGodownId.name || "Main Store"}
// // // // // // // // // // // //                       </div>
// // // // // // // // // // // //                     </div>
// // // // // // // // // // // //                   )}

// // // // // // // // // // // //                   {activeRow.toGodownId && (
// // // // // // // // // // // //                     <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>TO GODOWN</div>
// // // // // // // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// // // // // // // // // // // //                         {activeRow.toGodownId.name || "Kitchen"}
// // // // // // // // // // // //                       </div>
// // // // // // // // // // // //                     </div>
// // // // // // // // // // // //                   )}

// // // // // // // // // // // //                   {/* Manual rendering for generic Godown field (Requests/Consumptions) */}
// // // // // // // // // // // //                   {activeRow.godownId && (
// // // // // // // // // // // //                     <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>GODOWN</div>
// // // // // // // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// // // // // // // // // // // //                         {activeRow.godownId.name || "N/A"}
// // // // // // // // // // // //                       </div>
// // // // // // // // // // // //                     </div>
// // // // // // // // // // // //                   )}

// // // // // // // // // // // //                   {getVisibleKeys(activeRow).map(key => (
// // // // // // // // // // // //                     <div key={key} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{key.replace(/([A-Z])/g, ' $1')}</div>
// // // // // // // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// // // // // // // // // // // //                         {key === 'totalAmount' ? `₹${activeRow[key]?.toLocaleString()}` : String(activeRow[key])}
// // // // // // // // // // // //                       </div>
// // // // // // // // // // // //                     </div>
// // // // // // // // // // // //                   ))}
// // // // // // // // // // // //                 </div>

// // // // // // // // // // // //                 {/* Unified Itemized Breakdown */}
// // // // // // // // // // // //                 {(activeRow.items || activeRow.allocations) && (
// // // // // // // // // // // //                   <div>
// // // // // // // // // // // //                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
// // // // // // // // // // // //                         <TableIcon size={16} color="#6366f1" />
// // // // // // // // // // // //                         <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>ITEMIZED BREAKDOWN</span>
// // // // // // // // // // // //                     </div>
// // // // // // // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // // // //                       <thead>
// // // // // // // // // // // //                         <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // // // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>ITEM</th>
// // // // // // // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'center' }}>QUANTITY</th>
// // // // // // // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>AMOUNT</th>
// // // // // // // // // // // //                         </tr>
// // // // // // // // // // // //                       </thead>
// // // // // // // // // // // //                       <tbody>
// // // // // // // // // // // //                         {(activeRow.items || activeRow.allocations || []).map((item, idx) => {
// // // // // // // // // // // //                           const itemName = item.stockItemId?.name || "Unknown Item";
// // // // // // // // // // // //                           const quantity = item.quantity || item.receivedQty || item.orderedQty || item.qtyBaseUnit || 0;
// // // // // // // // // // // //                           const unitSymbol = item.stockItemId?.unitId?.symbol || "";

// // // // // // // // // // // //                           return (
// // // // // // // // // // // //                             <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // //                               <td style={{ padding: '16px 0', fontWeight: '700', color: '#334155', fontSize: '13px' }}>
// // // // // // // // // // // //                                 {itemName}
// // // // // // // // // // // //                               </td>
// // // // // // // // // // // //                               <td style={{ padding: '16px 0', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
// // // // // // // // // // // //                                 {quantity} <span style={{ fontSize: '10px', color: '#94a3b8' }}>{unitSymbol}</span>
// // // // // // // // // // // //                               </td>
// // // // // // // // // // // //                               <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>
// // // // // // // // // // // //                                 {item.amount || item.unitPrice ? `₹${(item.amount || (quantity * (item.unitPrice || 0))).toLocaleString()}` : "—"}
// // // // // // // // // // // //                               </td>
// // // // // // // // // // // //                             </tr>
// // // // // // // // // // // //                           );
// // // // // // // // // // // //                         })}
// // // // // // // // // // // //                       </tbody>
// // // // // // // // // // // //                     </table>
// // // // // // // // // // // //                   </div>
// // // // // // // // // // // //                 )}
// // // // // // // // // // // //               </div>
// // // // // // // // // // // //             </>
// // // // // // // // // // // //           ) : (
// // // // // // // // // // // //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
// // // // // // // // // // // //               <Filter size={48} color="#e2e8f0" />
// // // // // // // // // // // //               <div style={{ color: '#94a3b8', fontWeight: '600' }}>Select a record to view analytics</div>
// // // // // // // // // // // //             </div>
// // // // // // // // // // // //           )}
// // // // // // // // // // // //         </div>
// // // // // // // // // // // //       </div>
// // // // // // // // // // // //     </div>
// // // // // // // // // // // //   );
// // // // // // // // // // // // };














// // // // // // // // // // // import { useState, useEffect, useCallback, useMemo } from "react";
// // // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // // import { Search, FileText, Download, Table as TableIcon, Filter, LayoutGrid } from "lucide-react";

// // // // // // // // // // // const reportEntities = ["indents", "purchase-orders", "distributions", "transfers", "requests", "consumptions"];

// // // // // // // // // // // export const ReportsPage = () => {
// // // // // // // // // // //   const [entity, setEntity] = useState("indents");
// // // // // // // // // // //   const [rows, setRows] = useState([]);
// // // // // // // // // // //   const [loading, setLoading] = useState(false);
// // // // // // // // // // //   const [searchTerm, setSearchTerm] = useState("");
// // // // // // // // // // //   const [selectedRowId, setSelectedRowId] = useState(null);

// // // // // // // // // // //   const load = useCallback(async () => {
// // // // // // // // // // //     setLoading(true);
// // // // // // // // // // //     try {
// // // // // // // // // // //       const res = await api.get(`/reports/${entity}`);
// // // // // // // // // // //       const data = res.data || [];
// // // // // // // // // // //       setRows(data);
// // // // // // // // // // //       if (data.length > 0) setSelectedRowId(data[0]._id);
// // // // // // // // // // //     } catch (error) {
// // // // // // // // // // //       console.error("Failed to load report:", error);
// // // // // // // // // // //     } finally {
// // // // // // // // // // //       setLoading(false);
// // // // // // // // // // //     }
// // // // // // // // // // //   }, [entity]);

// // // // // // // // // // //   useEffect(() => {
// // // // // // // // // // //     load();
// // // // // // // // // // //   }, [load]);

// // // // // // // // // // //   const filteredRows = useMemo(() => {
// // // // // // // // // // //     return rows.filter(row => 
// // // // // // // // // // //       Object.values(row).some(val => 
// // // // // // // // // // //         String(val).toLowerCase().includes(searchTerm.toLowerCase())
// // // // // // // // // // //       )
// // // // // // // // // // //     );
// // // // // // // // // // //   }, [rows, searchTerm]);

// // // // // // // // // // //   const activeRow = useMemo(() => 
// // // // // // // // // // //     rows.find(r => r._id === selectedRowId), 
// // // // // // // // // // //   [selectedRowId, rows]);

// // // // // // // // // // //   const exportAllExcel = () => window.open(`http://localhost:5000/api/reports/${entity}/export/excel`, "_blank");

// // // // // // // // // // //   const exportSingleExcel = async (id) => {
// // // // // // // // // // //     try {
// // // // // // // // // // //       const response = await api.get(`/reports/${entity}/export/excel/${id}`, {
// // // // // // // // // // //         responseType: 'arraybuffer',
// // // // // // // // // // //         headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
// // // // // // // // // // //       });
      
// // // // // // // // // // //       const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
// // // // // // // // // // //       const url = window.URL.createObjectURL(blob);
// // // // // // // // // // //       const link = document.createElement('a');
// // // // // // // // // // //       link.href = url;
// // // // // // // // // // //       link.setAttribute('download', `${entity}-${id}.xlsx`);
// // // // // // // // // // //       document.body.appendChild(link);
// // // // // // // // // // //       link.click();
// // // // // // // // // // //       document.body.removeChild(link);
// // // // // // // // // // //       window.URL.revokeObjectURL(url);
// // // // // // // // // // //     } catch (error) {
// // // // // // // // // // //       console.error("Export Error:", error);
// // // // // // // // // // //       alert("Download failed.");
// // // // // // // // // // //     }
// // // // // // // // // // //   };

// // // // // // // // // // //   const getVisibleKeys = (item) => {
// // // // // // // // // // //     if (!item) return [];
// // // // // // // // // // //     return Object.keys(item).filter(key => 
// // // // // // // // // // //       !["_id", "__v", "items", "allocations", "leftovers", "updatedAt", "userId", "createdBy", 
// // // // // // // // // // //         "indentId", "purchaseOrderId", "leftoverSourceId", "fromGodownId", "toGodownId", "godownId"].includes(key)
// // // // // // // // // // //     );
// // // // // // // // // // //   };

// // // // // // // // // // //   return (
// // // // // // // // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // // // // // // // //       {/* Header Section */}
// // // // // // // // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// // // // // // // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
// // // // // // // // // // //             Data <span style={{ color: '#6366f1' }}>Analytics</span>
// // // // // // // // // // //           </h1>
          
// // // // // // // // // // //           <select 
// // // // // // // // // // //             value={entity} 
// // // // // // // // // // //             onChange={(e) => { setEntity(e.target.value); setRows([]); }}
// // // // // // // // // // //             style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', fontWeight: '700', cursor: 'pointer', outline: 'none', color: '#475569' }}
// // // // // // // // // // //           >
// // // // // // // // // // //             {reportEntities.map((r) => <option key={r} value={r}>{r.replace("-", " ").toUpperCase()}</option>)}
// // // // // // // // // // //           </select>
// // // // // // // // // // //         </div>

// // // // // // // // // // //         <div style={{ display: 'flex', gap: '12px' }}>
// // // // // // // // // // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // // // // // // //             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // // // // // // // //             <input
// // // // // // // // // // //               type="text"
// // // // // // // // // // //               placeholder="Filter records..."
// // // // // // // // // // //               value={searchTerm}
// // // // // // // // // // //               onChange={(e) => setSearchTerm(e.target.value)}
// // // // // // // // // // //               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '200px', outline: 'none' }}
// // // // // // // // // // //             />
// // // // // // // // // // //           </div>
// // // // // // // // // // //           <button onClick={exportAllExcel} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // // // //             <Download size={14}/> EXPORT ALL
// // // // // // // // // // //           </button>
// // // // // // // // // // //         </div>
// // // // // // // // // // //       </div>

// // // // // // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // // // // // // //         {/* Left Sidebar */}
// // // // // // // // // // //         <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // // // // //           <div style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '1px' }}>
// // // // // // // // // // //             RECENT {entity.replace("-", " ").toUpperCase()} ({filteredRows.length})
// // // // // // // // // // //           </div>
// // // // // // // // // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
// // // // // // // // // // //             {loading ? (
// // // // // // // // // // //               <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Loading data...</div>
// // // // // // // // // // //             ) : filteredRows.map(row => (
// // // // // // // // // // //               <div
// // // // // // // // // // //                 key={row._id}
// // // // // // // // // // //                 onClick={() => setSelectedRowId(row._id)}
// // // // // // // // // // //                 style={{
// // // // // // // // // // //                   padding: '16px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
// // // // // // // // // // //                   background: selectedRowId === row._id ? '#fff' : 'rgba(255,255,255,0.4)',
// // // // // // // // // // //                   border: selectedRowId === row._id ? '1px solid #6366f1' : '1px solid transparent',
// // // // // // // // // // //                   boxShadow: selectedRowId === row._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// // // // // // // // // // //                 }}
// // // // // // // // // // //               >
// // // // // // // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
// // // // // // // // // // //                   <div style={{ fontWeight: '800', fontSize: '13px', color: selectedRowId === row._id ? '#6366f1' : '#1e293b' }}>
// // // // // // // // // // //                     {row.indentNo || row.orderNo || row.transferNo || row.requestNo || row.distributionNo || row._id.slice(-8).toUpperCase()}
// // // // // // // // // // //                   </div>
// // // // // // // // // // //                   <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8' }}>
// // // // // // // // // // //                     {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-GB') : ''}
// // // // // // // // // // //                   </div>
// // // // // // // // // // //                 </div>
// // // // // // // // // // //                 <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
// // // // // // // // // // //                   Status: <span style={{ color: '#0f172a' }}>{row.status?.toUpperCase() || 'N/A'}</span>
// // // // // // // // // // //                 </div>
// // // // // // // // // // //               </div>
// // // // // // // // // // //             ))}
// // // // // // // // // // //           </div>
// // // // // // // // // // //         </div>

// // // // // // // // // // //         {/* Right Detail View */}
// // // // // // // // // // //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
// // // // // // // // // // //           {activeRow ? (
// // // // // // // // // // //             <>
// // // // // // // // // // //               <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
// // // // // // // // // // //                 <div>
// // // // // // // // // // //                   <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '4px' }}>DOCUMENT ID</div>
// // // // // // // // // // //                   <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>{activeRow.indentNo || activeRow.orderNo || activeRow.transferNo || activeRow.requestNo || activeRow.distributionNo || activeRow._id}</div>
// // // // // // // // // // //                 </div>
// // // // // // // // // // //                 <button 
// // // // // // // // // // //                   onClick={() => exportSingleExcel(activeRow._id)}
// // // // // // // // // // //                   style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '12px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
// // // // // // // // // // //                 >
// // // // // // // // // // //                   <Download size={16}/> DOWNLOAD XLSX
// // // // // // // // // // //                 </button>
// // // // // // // // // // //               </div>

// // // // // // // // // // //               <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
// // // // // // // // // // //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px', marginBottom: '48px' }}>
                  
// // // // // // // // // // //                   {/* Standard Godown Mappings */}
// // // // // // // // // // //                   {activeRow.fromGodownId && (
// // // // // // // // // // //                     <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>FROM GODOWN</div>
// // // // // // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{activeRow.fromGodownId.name || "Main Store"}</div>
// // // // // // // // // // //                     </div>
// // // // // // // // // // //                   )}

// // // // // // // // // // //                   {activeRow.toGodownId && (
// // // // // // // // // // //                     <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>TO GODOWN</div>
// // // // // // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{activeRow.toGodownId.name || "Kitchen"}</div>
// // // // // // // // // // //                     </div>
// // // // // // // // // // //                   )}

// // // // // // // // // // //                   {activeRow.godownId && (
// // // // // // // // // // //                     <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>GODOWN</div>
// // // // // // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{activeRow.godownId.name || "N/A"}</div>
// // // // // // // // // // //                     </div>
// // // // // // // // // // //                   )}

// // // // // // // // // // //                   {getVisibleKeys(activeRow).map(key => (
// // // // // // // // // // //                     <div key={key} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{key.replace(/([A-Z])/g, ' $1')}</div>
// // // // // // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// // // // // // // // // // //                         {key === 'totalAmount' ? `₹${activeRow[key]?.toLocaleString()}` : String(activeRow[key])}
// // // // // // // // // // //                       </div>
// // // // // // // // // // //                     </div>
// // // // // // // // // // //                   ))}
// // // // // // // // // // //                 </div>

// // // // // // // // // // //                 {/* DISTRIBUTION SPECIFIC: Godowns List */}
// // // // // // // // // // //                 {entity === "distributions" && activeRow.allocations && (
// // // // // // // // // // //                   <div style={{ marginBottom: '48px', padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
// // // // // // // // // // //                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
// // // // // // // // // // //                         <LayoutGrid size={16} color="#6366f1" />
// // // // // // // // // // //                         <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>TARGET DISTRIBUTION UNITS</span>
// // // // // // // // // // //                     </div>
// // // // // // // // // // //                     <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
// // // // // // // // // // //                       {activeRow.allocations.map((alloc, i) => (
// // // // // // // // // // //                         <div key={i} style={{ background: '#fff', padding: '10px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
// // // // // // // // // // //                           <div style={{ fontSize: '9px', fontWeight: '800', color: '#94a3b8' }}>GODOWN</div>
// // // // // // // // // // //                           <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{alloc.godownId?.name || "Unknown"}</div>
// // // // // // // // // // //                         </div>
// // // // // // // // // // //                       ))}
// // // // // // // // // // //                     </div>
// // // // // // // // // // //                   </div>
// // // // // // // // // // //                 )}

// // // // // // // // // // //                 {/* Unified Itemized Breakdown */}
// // // // // // // // // // //                 {(activeRow.items || activeRow.allocations) && (
// // // // // // // // // // //                   <div>
// // // // // // // // // // //                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
// // // // // // // // // // //                         <TableIcon size={16} color="#6366f1" />
// // // // // // // // // // //                         <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>ITEMIZED BREAKDOWN</span>
// // // // // // // // // // //                     </div>
// // // // // // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // // //                       <thead>
// // // // // // // // // // //                         <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>ITEM</th>
// // // // // // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'center' }}>QUANTITY</th>
// // // // // // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>AMOUNT</th>
// // // // // // // // // // //                         </tr>
// // // // // // // // // // //                       </thead>
// // // // // // // // // // //                       <tbody>
// // // // // // // // // // //                         {(activeRow.items || activeRow.allocations || []).map((item, idx) => {
// // // // // // // // // // //                           const itemName = item.stockItemId?.name || "Unknown Item";
// // // // // // // // // // //                           const quantity = item.quantity || item.receivedQty || item.orderedQty || item.qtyBaseUnit || 0;
// // // // // // // // // // //                           const unitSymbol = item.stockItemId?.unitId?.symbol || "";

// // // // // // // // // // //                           return (
// // // // // // // // // // //                             <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // //                               <td style={{ padding: '16px 0', fontWeight: '700', color: '#334155', fontSize: '13px' }}>{itemName}</td>
// // // // // // // // // // //                               <td style={{ padding: '16px 0', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
// // // // // // // // // // //                                 {quantity} <span style={{ fontSize: '10px', color: '#94a3b8' }}>{unitSymbol}</span>
// // // // // // // // // // //                               </td>
// // // // // // // // // // //                               <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>
// // // // // // // // // // //                                 {item.amount || item.unitPrice ? `₹${(item.amount || (quantity * (item.unitPrice || 0))).toLocaleString()}` : "—"}
// // // // // // // // // // //                               </td>
// // // // // // // // // // //                             </tr>
// // // // // // // // // // //                           );
// // // // // // // // // // //                         })}
// // // // // // // // // // //                       </tbody>
// // // // // // // // // // //                     </table>
// // // // // // // // // // //                   </div>
// // // // // // // // // // //                 )}
// // // // // // // // // // //               </div>
// // // // // // // // // // //             </>
// // // // // // // // // // //           ) : (
// // // // // // // // // // //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
// // // // // // // // // // //               <Filter size={48} color="#e2e8f0" />
// // // // // // // // // // //               <div style={{ color: '#94a3b8', fontWeight: '600' }}>Select a record to view analytics</div>
// // // // // // // // // // //             </div>
// // // // // // // // // // //           )}
// // // // // // // // // // //         </div>
// // // // // // // // // // //       </div>
// // // // // // // // // // //     </div>
// // // // // // // // // // //   );
// // // // // // // // // // // };







// // // // // // // // // // //  final final





// // // // // // // // // import { useState, useEffect, useCallback, useMemo } from "react";
// // // // // // // // // import { api } from "../api.js";
// // // // // // // // // import { Search, FileText, Download, Table as TableIcon, Filter, LayoutGrid } from "lucide-react";

// // // // // // // // // const reportEntities = ["indents", "purchase-orders", "distributions", "transfers", "requests", "consumptions"];

// // // // // // // // // export const ReportsPage = () => {
// // // // // // // // //   const [entity, setEntity] = useState("indents");
// // // // // // // // //   const [rows, setRows] = useState([]);
// // // // // // // // //   const [loading, setLoading] = useState(false);
// // // // // // // // //   const [searchTerm, setSearchTerm] = useState("");
// // // // // // // // //   const [selectedRowId, setSelectedRowId] = useState(null);

// // // // // // // // //   const load = useCallback(async () => {
// // // // // // // // //     setLoading(true);
// // // // // // // // //     try {
// // // // // // // // //       const res = await api.get(`/reports/${entity}`);
// // // // // // // // //       const data = res.data || [];
// // // // // // // // //       setRows(data);
// // // // // // // // //       if (data.length > 0) setSelectedRowId(data[0]._id);
// // // // // // // // //     } catch (error) {
// // // // // // // // //       console.error("Failed to load report:", error);
// // // // // // // // //     } finally {
// // // // // // // // //       setLoading(false);
// // // // // // // // //     }
// // // // // // // // //   }, [entity]);

// // // // // // // // //   useEffect(() => {
// // // // // // // // //     load();
// // // // // // // // //   }, [load]);

// // // // // // // // //   const filteredRows = useMemo(() => {
// // // // // // // // //     return rows.filter(row => 
// // // // // // // // //       Object.values(row).some(val => 
// // // // // // // // //         String(val).toLowerCase().includes(searchTerm.toLowerCase())
// // // // // // // // //       )
// // // // // // // // //     );
// // // // // // // // //   }, [rows, searchTerm]);

// // // // // // // // //   const activeRow = useMemo(() => 
// // // // // // // // //     rows.find(r => r._id === selectedRowId), 
// // // // // // // // //   [selectedRowId, rows]);

// // // // // // // // //   // Helper to resolve status for entities that don't have a explicit "status" field
// // // // // // // // //   const resolveStatus = (row) => {
// // // // // // // // //     if (row.status) return row.status.toUpperCase();
// // // // // // // // //     if (entity === "distributions" || entity === "transfers" || entity === "consumptions") {
// // // // // // // // //       return "COMPLETED"; // Usually these records exist only once the action is done
// // // // // // // // //     }
// // // // // // // // //     return "N/A";
// // // // // // // // //   };

// // // // // // // // //   const exportAllExcel = () => window.open(`http://localhost:5000/api/reports/${entity}/export/excel`, "_blank");

// // // // // // // // //   const exportSingleExcel = async (id) => {
// // // // // // // // //     try {
// // // // // // // // //       const response = await api.get(`/reports/${entity}/export/excel/${id}`, {
// // // // // // // // //         responseType: 'arraybuffer',
// // // // // // // // //         headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
// // // // // // // // //       });
      
// // // // // // // // //       const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
// // // // // // // // //       const url = window.URL.createObjectURL(blob);
// // // // // // // // //       const link = document.createElement('a');
// // // // // // // // //       link.href = url;
// // // // // // // // //       link.setAttribute('download', `${entity}-${id}.xlsx`);
// // // // // // // // //       document.body.appendChild(link);
// // // // // // // // //       link.click();
// // // // // // // // //       document.body.removeChild(link);
// // // // // // // // //       window.URL.revokeObjectURL(url);
// // // // // // // // //     } catch (error) {
// // // // // // // // //       console.error("Export Error:", error);
// // // // // // // // //       alert("Download failed.");
// // // // // // // // //     }
// // // // // // // // //   };

// // // // // // // // //   const getVisibleKeys = (item) => {
// // // // // // // // //     if (!item) return [];
// // // // // // // // //     return Object.keys(item).filter(key => 
// // // // // // // // //       !["_id", "__v", "items", "allocations", "leftovers", "updatedAt", "userId", "createdBy", 
// // // // // // // // //         "indentId", "purchaseOrderId", "leftoverSourceId", "fromGodownId", "toGodownId", "godownId", "status"].includes(key)
// // // // // // // // //     );
// // // // // // // // //   };

// // // // // // // // //   return (
// // // // // // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // // // // // //       {/* Header Section */}
// // // // // // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// // // // // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
// // // // // // // // //             Data <span style={{ color: '#6366f1' }}>Analytics</span>
// // // // // // // // //           </h1>
          
// // // // // // // // //           <select 
// // // // // // // // //             value={entity} 
// // // // // // // // //             onChange={(e) => { setEntity(e.target.value); setRows([]); }}
// // // // // // // // //             style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', fontWeight: '700', cursor: 'pointer', outline: 'none', color: '#475569' }}
// // // // // // // // //           >
// // // // // // // // //             {reportEntities.map((r) => <option key={r} value={r}>{r.replace("-", " ").toUpperCase()}</option>)}
// // // // // // // // //           </select>
// // // // // // // // //         </div>

// // // // // // // // //         <div style={{ display: 'flex', gap: '12px' }}>
// // // // // // // // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // // // // //             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // // // // // //             <input
// // // // // // // // //               type="text"
// // // // // // // // //               placeholder="Filter records..."
// // // // // // // // //               value={searchTerm}
// // // // // // // // //               onChange={(e) => setSearchTerm(e.target.value)}
// // // // // // // // //               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '200px', outline: 'none' }}
// // // // // // // // //             />
// // // // // // // // //           </div>
// // // // // // // // //           <button onClick={exportAllExcel} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // // //             <Download size={14}/> EXPORT ALL
// // // // // // // // //           </button>
// // // // // // // // //         </div>
// // // // // // // // //       </div>

// // // // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // // // // //         {/* Left Sidebar */}
// // // // // // // // //         <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // // //           <div style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '1px' }}>
// // // // // // // // //             RECENT {entity.replace("-", " ").toUpperCase()} ({filteredRows.length})
// // // // // // // // //           </div>
// // // // // // // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
// // // // // // // // //             {loading ? (
// // // // // // // // //               <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Loading data...</div>
// // // // // // // // //             ) : filteredRows.map(row => (
// // // // // // // // //               <div
// // // // // // // // //                 key={row._id}
// // // // // // // // //                 onClick={() => setSelectedRowId(row._id)}
// // // // // // // // //                 style={{
// // // // // // // // //                   padding: '16px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
// // // // // // // // //                   background: selectedRowId === row._id ? '#fff' : 'rgba(255,255,255,0.4)',
// // // // // // // // //                   border: selectedRowId === row._id ? '1px solid #6366f1' : '1px solid transparent',
// // // // // // // // //                   boxShadow: selectedRowId === row._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// // // // // // // // //                 }}
// // // // // // // // //               >
// // // // // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
// // // // // // // // //                   <div style={{ fontWeight: '800', fontSize: '13px', color: selectedRowId === row._id ? '#6366f1' : '#1e293b' }}>
// // // // // // // // //                     {row.indentNo || row.orderNo || row.transferNo || row.requestNo || row.distributionNo || row._id.slice(-8).toUpperCase()}
// // // // // // // // //                   </div>
// // // // // // // // //                   <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8' }}>
// // // // // // // // //                     {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-GB') : ''}
// // // // // // // // //                   </div>
// // // // // // // // //                 </div>
// // // // // // // // //                 <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
// // // // // // // // //                   Status: <span style={{ color: selectedRowId === row._id ? '#6366f1' : '#0f172a' }}>{resolveStatus(row)}</span>
// // // // // // // // //                 </div>
// // // // // // // // //               </div>
// // // // // // // // //             ))}
// // // // // // // // //           </div>
// // // // // // // // //         </div>

// // // // // // // // //         {/* Right Detail View */}
// // // // // // // // //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
// // // // // // // // //           {activeRow ? (
// // // // // // // // //             <>
// // // // // // // // //               <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
// // // // // // // // //                 <div>
// // // // // // // // //                   <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '4px' }}>DOCUMENT ID</div>
// // // // // // // // //                   <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>{activeRow.indentNo || activeRow.orderNo || activeRow.transferNo || activeRow.requestNo || activeRow.distributionNo || activeRow._id}</div>
// // // // // // // // //                 </div>
// // // // // // // // //                 <button 
// // // // // // // // //                   onClick={() => exportSingleExcel(activeRow._id)}
// // // // // // // // //                   style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '12px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
// // // // // // // // //                 >
// // // // // // // // //                   <Download size={16}/> DOWNLOAD XLSX
// // // // // // // // //                 </button>
// // // // // // // // //               </div>

// // // // // // // // //               <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
// // // // // // // // //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px', marginBottom: '48px' }}>
                  
// // // // // // // // //                   {/* Status Mapping */}
// // // // // // // // //                   <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>STATUS</div>
// // // // // // // // //                     <div style={{ fontWeight: '700', color: '#6366f1', fontSize: '14px' }}>{resolveStatus(activeRow)}</div>
// // // // // // // // //                   </div>

// // // // // // // // //                   {/* Standard Godown Mappings */}
// // // // // // // // //                   {activeRow.fromGodownId && (
// // // // // // // // //                     <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>FROM GODOWN</div>
// // // // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{activeRow.fromGodownId.name || "Main Store"}</div>
// // // // // // // // //                     </div>
// // // // // // // // //                   )}

// // // // // // // // //                   {activeRow.toGodownId && (
// // // // // // // // //                     <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>TO GODOWN</div>
// // // // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{activeRow.toGodownId.name || "Kitchen"}</div>
// // // // // // // // //                     </div>
// // // // // // // // //                   )}

// // // // // // // // //                   {activeRow.godownId && (
// // // // // // // // //                     <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>GODOWN</div>
// // // // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{activeRow.godownId.name || "N/A"}</div>
// // // // // // // // //                     </div>
// // // // // // // // //                   )}

// // // // // // // // //                   {getVisibleKeys(activeRow).map(key => (
// // // // // // // // //                     <div key={key} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{key.replace(/([A-Z])/g, ' $1')}</div>
// // // // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// // // // // // // // //                         {key === 'totalAmount' ? `₹${activeRow[key]?.toLocaleString()}` : String(activeRow[key])}
// // // // // // // // //                       </div>
// // // // // // // // //                     </div>
// // // // // // // // //                   ))}
// // // // // // // // //                 </div>

// // // // // // // // //                 {/* DISTRIBUTION SPECIFIC: Godowns List */}
// // // // // // // // //                 {entity === "distributions" && activeRow.allocations && (
// // // // // // // // //                   <div style={{ marginBottom: '48px', padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
// // // // // // // // //                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
// // // // // // // // //                         <LayoutGrid size={16} color="#6366f1" />
// // // // // // // // //                         <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>TARGET DISTRIBUTION UNITS</span>
// // // // // // // // //                     </div>
// // // // // // // // //                     <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
// // // // // // // // //                       {activeRow.allocations.map((alloc, i) => (
// // // // // // // // //                         <div key={i} style={{ background: '#fff', padding: '10px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
// // // // // // // // //                           <div style={{ fontSize: '9px', fontWeight: '800', color: '#94a3b8' }}>GODOWN</div>
// // // // // // // // //                           <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{alloc.godownId?.name || "Unknown"}</div>
// // // // // // // // //                         </div>
// // // // // // // // //                       ))}
// // // // // // // // //                     </div>
// // // // // // // // //                   </div>
// // // // // // // // //                 )}

// // // // // // // // //                 {/* Unified Itemized Breakdown */}
// // // // // // // // //                 {(activeRow.items || activeRow.allocations) && (
// // // // // // // // //                   <div>
// // // // // // // // //                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
// // // // // // // // //                         <TableIcon size={16} color="#6366f1" />
// // // // // // // // //                         <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>ITEMIZED BREAKDOWN</span>
// // // // // // // // //                     </div>
// // // // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // //                       <thead>
// // // // // // // // //                         <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>ITEM</th>
// // // // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'center' }}>QUANTITY</th>
// // // // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>AMOUNT</th>
// // // // // // // // //                         </tr>
// // // // // // // // //                       </thead>
// // // // // // // // //                       <tbody>
// // // // // // // // //                         {(activeRow.items || activeRow.allocations || []).map((item, idx) => {
// // // // // // // // //                           // Handle both nested and direct item names
// // // // // // // // //                           const itemName = item.stockItemId?.name || item.itemName || "Unknown Item";
// // // // // // // // //                           const quantity = item.quantity || item.receivedQty || item.orderedQty || item.qtyBaseUnit || 0;
// // // // // // // // //                           const unitSymbol = item.stockItemId?.unitId?.symbol || item.unit || "";

// // // // // // // // //                           return (
// // // // // // // // //                             <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // //                               <td style={{ padding: '16px 0', fontWeight: '700', color: '#334155', fontSize: '13px' }}>{itemName}</td>
// // // // // // // // //                               <td style={{ padding: '16px 0', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
// // // // // // // // //                                 {quantity} <span style={{ fontSize: '10px', color: '#94a3b8' }}>{unitSymbol}</span>
// // // // // // // // //                               </td>
// // // // // // // // //                               <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>
// // // // // // // // //                                 {item.amount || item.unitPrice ? `₹${(item.amount || (quantity * (item.unitPrice || 0))).toLocaleString()}` : "—"}
// // // // // // // // //                               </td>
// // // // // // // // //                             </tr>
// // // // // // // // //                           );
// // // // // // // // //                         })}
// // // // // // // // //                       </tbody>
// // // // // // // // //                     </table>
// // // // // // // // //                   </div>
// // // // // // // // //                 )}
// // // // // // // // //               </div>
// // // // // // // // //             </>
// // // // // // // // //           ) : (
// // // // // // // // //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
// // // // // // // // //               <Filter size={48} color="#e2e8f0" />
// // // // // // // // //               <div style={{ color: '#94a3b8', fontWeight: '600' }}>Select a record to view analytics</div>
// // // // // // // // //             </div>
// // // // // // // // //           )}
// // // // // // // // //         </div>
// // // // // // // // //       </div>
// // // // // // // // //     </div>
// // // // // // // // //   );
// // // // // // // // // };





// // // // // // // // import { useState, useEffect, useCallback, useMemo } from "react";
// // // // // // // // import { api } from "../api.js";
// // // // // // // // import { Search, FileText, Download, Table as TableIcon, Filter, LayoutGrid } from "lucide-react";

// // // // // // // // const reportEntities = ["indents", "purchase-orders", "distributions", "transfers", "requests", "consumptions"];

// // // // // // // // export const ReportsPage = () => {
// // // // // // // //   const [entity, setEntity] = useState("indents");
// // // // // // // //   const [rows, setRows] = useState([]);
// // // // // // // //   const [loading, setLoading] = useState(false);
// // // // // // // //   const [searchTerm, setSearchTerm] = useState("");
// // // // // // // //   const [selectedRowId, setSelectedRowId] = useState(null);

// // // // // // // //   const load = useCallback(async () => {
// // // // // // // //     setLoading(true);
// // // // // // // //     try {
// // // // // // // //       const res = await api.get(`/reports/${entity}`);
// // // // // // // //       const data = res.data || [];
// // // // // // // //       setRows(data);
// // // // // // // //       if (data.length > 0) setSelectedRowId(data[0]._id);
// // // // // // // //     } catch (error) {
// // // // // // // //       console.error("Failed to load report:", error);
// // // // // // // //     } finally {
// // // // // // // //       setLoading(false);
// // // // // // // //     }
// // // // // // // //   }, [entity]);

// // // // // // // //   useEffect(() => {
// // // // // // // //     load();
// // // // // // // //   }, [load]);

// // // // // // // //   const filteredRows = useMemo(() => {
// // // // // // // //     return rows.filter(row => 
// // // // // // // //       Object.values(row).some(val => 
// // // // // // // //         String(val).toLowerCase().includes(searchTerm.toLowerCase())
// // // // // // // //       )
// // // // // // // //     );
// // // // // // // //   }, [rows, searchTerm]);

// // // // // // // //   const activeRow = useMemo(() => 
// // // // // // // //     rows.find(r => r._id === selectedRowId), 
// // // // // // // //   [selectedRowId, rows]);

// // // // // // // //   const resolveStatus = (row) => {
// // // // // // // //     if (row.status) return row.status.toUpperCase();
// // // // // // // //     if (["distributions", "transfers", "consumptions"].includes(entity)) {
// // // // // // // //       return "COMPLETED";
// // // // // // // //     }
// // // // // // // //     return "N/A";
// // // // // // // //   };

// // // // // // // //   const exportAllExcel = () => window.open(`http://localhost:5000/api/reports/${entity}/export/excel`, "_blank");

// // // // // // // //   const exportSingleExcel = async (id) => {
// // // // // // // //     try {
// // // // // // // //       const response = await api.get(`/reports/${entity}/export/excel/${id}`, {
// // // // // // // //         responseType: 'arraybuffer',
// // // // // // // //         headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
// // // // // // // //       });
      
// // // // // // // //       const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
// // // // // // // //       const url = window.URL.createObjectURL(blob);
// // // // // // // //       const link = document.createElement('a');
// // // // // // // //       link.href = url;
// // // // // // // //       link.setAttribute('download', `${entity}-${id}.xlsx`);
// // // // // // // //       document.body.appendChild(link);
// // // // // // // //       link.click();
// // // // // // // //       document.body.removeChild(link);
// // // // // // // //       window.URL.revokeObjectURL(url);
// // // // // // // //     } catch (error) {
// // // // // // // //       console.error("Export Error:", error);
// // // // // // // //       alert("Download failed.");
// // // // // // // //     }
// // // // // // // //   };

// // // // // // // //   const getVisibleKeys = (item) => {
// // // // // // // //     if (!item) return [];
// // // // // // // //     return Object.keys(item).filter(key => 
// // // // // // // //       !["_id", "__v", "items", "allocations", "leftovers", "updatedAt", "userId", "createdBy", 
// // // // // // // //         "indentId", "purchaseOrderId", "leftoverSourceId", "fromGodownId", "toGodownId", "godownId", "status"].includes(key)
// // // // // // // //     );
// // // // // // // //   };

// // // // // // // //   return (
// // // // // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // // // // //       {/* Header Section */}
// // // // // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// // // // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
// // // // // // // //             Data <span style={{ color: '#6366f1' }}>Analytics</span>
// // // // // // // //           </h1>
          
// // // // // // // //           <select 
// // // // // // // //             value={entity} 
// // // // // // // //             onChange={(e) => { setEntity(e.target.value); setRows([]); }}
// // // // // // // //             style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', fontWeight: '700', cursor: 'pointer', outline: 'none', color: '#475569' }}
// // // // // // // //           >
// // // // // // // //             {reportEntities.map((r) => <option key={r} value={r}>{r.replace("-", " ").toUpperCase()}</option>)}
// // // // // // // //           </select>
// // // // // // // //         </div>

// // // // // // // //         <div style={{ display: 'flex', gap: '12px' }}>
// // // // // // // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // // // //             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // // // // //             <input
// // // // // // // //               type="text"
// // // // // // // //               placeholder="Filter records..."
// // // // // // // //               value={searchTerm}
// // // // // // // //               onChange={(e) => setSearchTerm(e.target.value)}
// // // // // // // //               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '200px', outline: 'none' }}
// // // // // // // //             />
// // // // // // // //           </div>
// // // // // // // //           <button onClick={exportAllExcel} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // // //             <Download size={14}/> EXPORT ALL
// // // // // // // //           </button>
// // // // // // // //         </div>
// // // // // // // //       </div>

// // // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // // // //         {/* Left Sidebar */}
// // // // // // // //         <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // //           <div style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '1px' }}>
// // // // // // // //             RECENT {entity.replace("-", " ").toUpperCase()} ({filteredRows.length})
// // // // // // // //           </div>
// // // // // // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
// // // // // // // //             {loading ? (
// // // // // // // //               <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Loading data...</div>
// // // // // // // //             ) : filteredRows.map(row => (
// // // // // // // //               <div
// // // // // // // //                 key={row._id}
// // // // // // // //                 onClick={() => setSelectedRowId(row._id)}
// // // // // // // //                 style={{
// // // // // // // //                   padding: '16px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
// // // // // // // //                   background: selectedRowId === row._id ? '#fff' : 'rgba(255,255,255,0.4)',
// // // // // // // //                   border: selectedRowId === row._id ? '1px solid #6366f1' : '1px solid transparent',
// // // // // // // //                   boxShadow: selectedRowId === row._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// // // // // // // //                 }}
// // // // // // // //               >
// // // // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
// // // // // // // //                   <div style={{ fontWeight: '800', fontSize: '13px', color: selectedRowId === row._id ? '#6366f1' : '#1e293b' }}>
// // // // // // // //                     {row.indentNo || row.orderNo || row.transferNo || row.requestNo || row.distributionNo || row._id.slice(-8).toUpperCase()}
// // // // // // // //                   </div>
// // // // // // // //                   <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8' }}>
// // // // // // // //                     {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-GB') : ''}
// // // // // // // //                   </div>
// // // // // // // //                 </div>
// // // // // // // //                 <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
// // // // // // // //                   Status: <span style={{ color: selectedRowId === row._id ? '#6366f1' : '#0f172a' }}>{resolveStatus(row)}</span>
// // // // // // // //                 </div>
// // // // // // // //               </div>
// // // // // // // //             ))}
// // // // // // // //           </div>
// // // // // // // //         </div>

// // // // // // // //         {/* Right Detail View */}
// // // // // // // //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
// // // // // // // //           {activeRow ? (
// // // // // // // //             <>
// // // // // // // //               <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
// // // // // // // //                 <div>
// // // // // // // //                   <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '4px' }}>DOCUMENT ID</div>
// // // // // // // //                   <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
// // // // // // // //                     {activeRow.indentNo || activeRow.orderNo || activeRow.transferNo || activeRow.requestNo || activeRow.distributionNo || activeRow._id}
// // // // // // // //                   </div>
// // // // // // // //                 </div>
// // // // // // // //                 <button 
// // // // // // // //                   onClick={() => exportSingleExcel(activeRow._id)}
// // // // // // // //                   style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '12px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
// // // // // // // //                 >
// // // // // // // //                   <Download size={16}/> DOWNLOAD XLSX
// // // // // // // //                 </button>
// // // // // // // //               </div>

// // // // // // // //               <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
// // // // // // // //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px', marginBottom: '48px' }}>
                  
// // // // // // // //                   <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>STATUS</div>
// // // // // // // //                     <div style={{ fontWeight: '700', color: '#6366f1', fontSize: '14px' }}>{resolveStatus(activeRow)}</div>
// // // // // // // //                   </div>

// // // // // // // //                   {activeRow.fromGodownId && (
// // // // // // // //                     <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>FROM GODOWN</div>
// // // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{activeRow.fromGodownId.name || "Main Store"}</div>
// // // // // // // //                     </div>
// // // // // // // //                   )}

// // // // // // // //                   {activeRow.toGodownId && (
// // // // // // // //                     <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>TO GODOWN</div>
// // // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{activeRow.toGodownId.name || "Kitchen"}</div>
// // // // // // // //                     </div>
// // // // // // // //                   )}

// // // // // // // //                   {activeRow.godownId && (
// // // // // // // //                     <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>GODOWN</div>
// // // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{activeRow.godownId.name || "N/A"}</div>
// // // // // // // //                     </div>
// // // // // // // //                   )}

// // // // // // // //                   {getVisibleKeys(activeRow).map(key => (
// // // // // // // //                     <div key={key} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{key.replace(/([A-Z])/g, ' $1')}</div>
// // // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// // // // // // // //                         {key === 'totalAmount' ? `₹${activeRow[key]?.toLocaleString()}` : String(activeRow[key])}
// // // // // // // //                       </div>
// // // // // // // //                     </div>
// // // // // // // //                   ))}
// // // // // // // //                 </div>

// // // // // // // //                 {entity === "distributions" && activeRow.allocations && (
// // // // // // // //                   <div style={{ marginBottom: '48px', padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
// // // // // // // //                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
// // // // // // // //                         <LayoutGrid size={16} color="#6366f1" />
// // // // // // // //                         <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>TARGET DISTRIBUTION UNITS</span>
// // // // // // // //                     </div>
// // // // // // // //                     <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
// // // // // // // //                       {activeRow.allocations.map((alloc, i) => (
// // // // // // // //                         <div key={i} style={{ background: '#fff', padding: '10px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
// // // // // // // //                           <div style={{ fontSize: '9px', fontWeight: '800', color: '#94a3b8' }}>GODOWN</div>
// // // // // // // //                           <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{alloc.godownId?.name || "Unknown"}</div>
// // // // // // // //                         </div>
// // // // // // // //                       ))}
// // // // // // // //                     </div>
// // // // // // // //                   </div>
// // // // // // // //                 )}

// // // // // // // //                 {(activeRow.items || activeRow.allocations) && (
// // // // // // // //                   <div>
// // // // // // // //                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
// // // // // // // //                         <TableIcon size={16} color="#6366f1" />
// // // // // // // //                         <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>ITEMIZED BREAKDOWN</span>
// // // // // // // //                     </div>
// // // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // //                       <thead>
// // // // // // // //                         <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>ITEM</th>
// // // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'center' }}>QUANTITY</th>
// // // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>AMOUNT</th>
// // // // // // // //                         </tr>
// // // // // // // //                       </thead>
// // // // // // // //                       <tbody>
// // // // // // // //                         {(activeRow.items || activeRow.allocations || []).map((item, idx) => {
// // // // // // // //                           const itemName = item.stockItemId?.name || item.itemName || "Unknown Item";
                          
// // // // // // // //                           // Robust Quantity Picker
// // // // // // // //                           const quantity = item.quantity || item.qtyBaseUnit || item.receivedQty || item.orderedQty || 0;
                          
// // // // // // // //                           // Fully Integrated Unit Resolution
// // // // // // // //                           const unitSymbol = 
// // // // // // // //                             item.stockItemId?.unitId?.symbol || 
// // // // // // // //                             item.unitId?.symbol || 
// // // // // // // //                             item.unit || 
// // // // // // // //                             (["distributions", "consumptions", "transfers"].includes(entity) ? "Kg" : "");

// // // // // // // //                           return (
// // // // // // // //                             <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
// // // // // // // //                               <td style={{ padding: '16px 0', fontWeight: '700', color: '#334155', fontSize: '13px' }}>{itemName}</td>
// // // // // // // //                               <td style={{ padding: '16px 0', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
// // // // // // // //                                 {quantity} <span style={{ fontSize: '10px', color: '#94a3b8' }}>{unitSymbol}</span>
// // // // // // // //                               </td>
// // // // // // // //                               <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>
// // // // // // // //                                 {item.amount || item.unitPrice ? `₹${(item.amount || (quantity * (item.unitPrice || 0))).toLocaleString()}` : "—"}
// // // // // // // //                               </td>
// // // // // // // //                             </tr>
// // // // // // // //                           );
// // // // // // // //                         })}
// // // // // // // //                       </tbody>
// // // // // // // //                     </table>
// // // // // // // //                   </div>
// // // // // // // //                 )}
// // // // // // // //               </div>
// // // // // // // //             </>
// // // // // // // //           ) : (
// // // // // // // //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
// // // // // // // //               <Filter size={48} color="#e2e8f0" />
// // // // // // // //               <div style={{ color: '#94a3b8', fontWeight: '600' }}>Select a record to view analytics</div>
// // // // // // // //             </div>
// // // // // // // //           )}
// // // // // // // //         </div>
// // // // // // // //       </div>
// // // // // // // //     </div>
// // // // // // // //   );
// // // // // // // // };









// // // // // // // //  only export all pending
















// // // // // // // import { useState, useEffect, useCallback, useMemo } from "react";
// // // // // // // import { api } from "../api.js";
// // // // // // // import { Search, FileText, Download, Table as TableIcon, Filter, LayoutGrid } from "lucide-react";

// // // // // // // const reportEntities = ["indents", "purchase-orders", "distributions", "transfers", "requests", "consumptions"];

// // // // // // // export const ReportsPage = () => {
// // // // // // //   const [entity, setEntity] = useState("indents");
// // // // // // //   const [rows, setRows] = useState([]);
// // // // // // //   const [loading, setLoading] = useState(false);
// // // // // // //   const [searchTerm, setSearchTerm] = useState("");
// // // // // // //   const [selectedRowId, setSelectedRowId] = useState(null);

// // // // // // //   const load = useCallback(async () => {
// // // // // // //     setLoading(true);
// // // // // // //     try {
// // // // // // //       const res = await api.get(`/reports/${entity}`);
// // // // // // //       const data = res.data || [];
// // // // // // //       setRows(data);
// // // // // // //       if (data.length > 0) setSelectedRowId(data[0]._id);
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Failed to load report:", error);
// // // // // // //     } finally {
// // // // // // //       setLoading(false);
// // // // // // //     }
// // // // // // //   }, [entity]);

// // // // // // //   useEffect(() => {
// // // // // // //     load();
// // // // // // //   }, [load]);

// // // // // // //   const filteredRows = useMemo(() => {
// // // // // // //     return rows.filter(row => 
// // // // // // //       Object.values(row).some(val => 
// // // // // // //         String(val).toLowerCase().includes(searchTerm.toLowerCase())
// // // // // // //       )
// // // // // // //     );
// // // // // // //   }, [rows, searchTerm]);

// // // // // // //   const activeRow = useMemo(() => 
// // // // // // //     rows.find(r => r._id === selectedRowId), 
// // // // // // //   [selectedRowId, rows]);

// // // // // // //   const resolveStatus = (row) => {
// // // // // // //     if (row.status) return row.status.toUpperCase();
// // // // // // //     if (["distributions", "transfers", "consumptions"].includes(entity)) {
// // // // // // //       return "COMPLETED";
// // // // // // //     }
// // // // // // //     return "N/A";
// // // // // // //   };

// // // // // // //   // FIXED: Integrated Export All with Auth Headers and Blob handling
// // // // // // //   const exportAllExcel = async () => {
// // // // // // //     try {
// // // // // // //       const response = await api.get(`/reports/${entity}/export/excel`, {
// // // // // // //         responseType: 'arraybuffer',
// // // // // // //         headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
// // // // // // //       });
      
// // // // // // //       const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
// // // // // // //       const url = window.URL.createObjectURL(blob);
// // // // // // //       const link = document.createElement('a');
// // // // // // //       link.href = url;
// // // // // // //       link.setAttribute('download', `all-${entity}-${new Date().toLocaleDateString()}.xlsx`);
// // // // // // //       document.body.appendChild(link);
// // // // // // //       link.click();
// // // // // // //       document.body.removeChild(link);
// // // // // // //       window.URL.revokeObjectURL(url);
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Bulk Export Error:", error);
// // // // // // //       alert("Bulk download failed. Ensure the backend route /reports/:entity/export/excel exists.");
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const exportSingleExcel = async (id) => {
// // // // // // //     try {
// // // // // // //       const response = await api.get(`/reports/${entity}/export/excel/${id}`, {
// // // // // // //         responseType: 'arraybuffer',
// // // // // // //         headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
// // // // // // //       });
      
// // // // // // //       const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
// // // // // // //       const url = window.URL.createObjectURL(blob);
// // // // // // //       const link = document.createElement('a');
// // // // // // //       link.href = url;
// // // // // // //       link.setAttribute('download', `${entity}-${id}.xlsx`);
// // // // // // //       document.body.appendChild(link);
// // // // // // //       link.click();
// // // // // // //       document.body.removeChild(link);
// // // // // // //       window.URL.revokeObjectURL(url);
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Single Export Error:", error);
// // // // // // //       alert("Download failed.");
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const getVisibleKeys = (item) => {
// // // // // // //     if (!item) return [];
// // // // // // //     return Object.keys(item).filter(key => 
// // // // // // //       !["_id", "__v", "items", "allocations", "leftovers", "updatedAt", "userId", "createdBy", 
// // // // // // //         "indentId", "purchaseOrderId", "leftoverSourceId", "fromGodownId", "toGodownId", "godownId", "status"].includes(key)
// // // // // // //     );
// // // // // // //   };

// // // // // // //   return (
// // // // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // // // //       {/* Header Section */}
// // // // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// // // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
// // // // // // //             Data <span style={{ color: '#6366f1' }}>Analytics</span>
// // // // // // //           </h1>
          
// // // // // // //           <select 
// // // // // // //             value={entity} 
// // // // // // //             onChange={(e) => { setEntity(e.target.value); setRows([]); }}
// // // // // // //             style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', fontWeight: '700', cursor: 'pointer', outline: 'none', color: '#475569' }}
// // // // // // //           >
// // // // // // //             {reportEntities.map((r) => <option key={r} value={r}>{r.replace("-", " ").toUpperCase()}</option>)}
// // // // // // //           </select>
// // // // // // //         </div>

// // // // // // //         <div style={{ display: 'flex', gap: '12px' }}>
// // // // // // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // // //             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // // // //             <input
// // // // // // //               type="text"
// // // // // // //               placeholder="Filter records..."
// // // // // // //               value={searchTerm}
// // // // // // //               onChange={(e) => setSearchTerm(e.target.value)}
// // // // // // //               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '200px', outline: 'none' }}
// // // // // // //             />
// // // // // // //           </div>
// // // // // // //           <button onClick={exportAllExcel} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // // //             <Download size={14}/> EXPORT ALL
// // // // // // //           </button>
// // // // // // //         </div>
// // // // // // //       </div>

// // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // // //         {/* Left Sidebar */}
// // // // // // //         <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // //           <div style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '1px' }}>
// // // // // // //             RECENT {entity.replace("-", " ").toUpperCase()} ({filteredRows.length})
// // // // // // //           </div>
// // // // // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
// // // // // // //             {loading ? (
// // // // // // //               <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Loading data...</div>
// // // // // // //             ) : filteredRows.map(row => (
// // // // // // //               <div
// // // // // // //                 key={row._id}
// // // // // // //                 onClick={() => setSelectedRowId(row._id)}
// // // // // // //                 style={{
// // // // // // //                   padding: '16px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
// // // // // // //                   background: selectedRowId === row._id ? '#fff' : 'rgba(255,255,255,0.4)',
// // // // // // //                   border: selectedRowId === row._id ? '1px solid #6366f1' : '1px solid transparent',
// // // // // // //                   boxShadow: selectedRowId === row._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// // // // // // //                 }}
// // // // // // //               >
// // // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
// // // // // // //                   <div style={{ fontWeight: '800', fontSize: '13px', color: selectedRowId === row._id ? '#6366f1' : '#1e293b' }}>
// // // // // // //                     {row.indentNo || row.orderNo || row.transferNo || row.requestNo || row.distributionNo || row._id.slice(-8).toUpperCase()}
// // // // // // //                   </div>
// // // // // // //                   <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8' }}>
// // // // // // //                     {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-GB') : ''}
// // // // // // //                   </div>
// // // // // // //                 </div>
// // // // // // //                 <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
// // // // // // //                   Status: <span style={{ color: selectedRowId === row._id ? '#6366f1' : '#0f172a' }}>{resolveStatus(row)}</span>
// // // // // // //                 </div>
// // // // // // //               </div>
// // // // // // //             ))}
// // // // // // //           </div>
// // // // // // //         </div>

// // // // // // //         {/* Right Detail View */}
// // // // // // //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
// // // // // // //           {activeRow ? (
// // // // // // //             <>
// // // // // // //               <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
// // // // // // //                 <div>
// // // // // // //                   <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '4px' }}>DOCUMENT ID</div>
// // // // // // //                   <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
// // // // // // //                     {activeRow.indentNo || activeRow.orderNo || activeRow.transferNo || activeRow.requestNo || activeRow.distributionNo || activeRow._id}
// // // // // // //                   </div>
// // // // // // //                 </div>
// // // // // // //                 <button 
// // // // // // //                   onClick={() => exportSingleExcel(activeRow._id)}
// // // // // // //                   style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '12px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
// // // // // // //                 >
// // // // // // //                   <Download size={16}/> DOWNLOAD XLSX
// // // // // // //                 </button>
// // // // // // //               </div>

// // // // // // //               <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
// // // // // // //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px', marginBottom: '48px' }}>
                  
// // // // // // //                   <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>STATUS</div>
// // // // // // //                     <div style={{ fontWeight: '700', color: '#6366f1', fontSize: '14px' }}>{resolveStatus(activeRow)}</div>
// // // // // // //                   </div>

// // // // // // //                   {activeRow.fromGodownId && (
// // // // // // //                     <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>FROM GODOWN</div>
// // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{activeRow.fromGodownId.name || "Main Store"}</div>
// // // // // // //                     </div>
// // // // // // //                   )}

// // // // // // //                   {activeRow.toGodownId && (
// // // // // // //                     <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>TO GODOWN</div>
// // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{activeRow.toGodownId.name || "Kitchen"}</div>
// // // // // // //                     </div>
// // // // // // //                   )}

// // // // // // //                   {activeRow.godownId && (
// // // // // // //                     <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>GODOWN</div>
// // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{activeRow.godownId.name || "N/A"}</div>
// // // // // // //                     </div>
// // // // // // //                   )}

// // // // // // //                   {getVisibleKeys(activeRow).map(key => (
// // // // // // //                     <div key={key} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{key.replace(/([A-Z])/g, ' $1')}</div>
// // // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// // // // // // //                         {key === 'totalAmount' ? `₹${activeRow[key]?.toLocaleString()}` : String(activeRow[key])}
// // // // // // //                       </div>
// // // // // // //                     </div>
// // // // // // //                   ))}
// // // // // // //                 </div>

// // // // // // //                 {entity === "distributions" && activeRow.allocations && (
// // // // // // //                   <div style={{ marginBottom: '48px', padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
// // // // // // //                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
// // // // // // //                         <LayoutGrid size={16} color="#6366f1" />
// // // // // // //                         <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>TARGET DISTRIBUTION UNITS</span>
// // // // // // //                     </div>
// // // // // // //                     <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
// // // // // // //                       {activeRow.allocations.map((alloc, i) => (
// // // // // // //                         <div key={i} style={{ background: '#fff', padding: '10px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
// // // // // // //                           <div style={{ fontSize: '9px', fontWeight: '800', color: '#94a3b8' }}>GODOWN</div>
// // // // // // //                           <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{alloc.godownId?.name || "Unknown"}</div>
// // // // // // //                         </div>
// // // // // // //                       ))}
// // // // // // //                     </div>
// // // // // // //                   </div>
// // // // // // //                 )}

// // // // // // //                 {(activeRow.items || activeRow.allocations) && (
// // // // // // //                   <div>
// // // // // // //                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
// // // // // // //                         <TableIcon size={16} color="#6366f1" />
// // // // // // //                         <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>ITEMIZED BREAKDOWN</span>
// // // // // // //                     </div>
// // // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // //                       <thead>
// // // // // // //                         <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>ITEM</th>
// // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'center' }}>QUANTITY</th>
// // // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>AMOUNT</th>
// // // // // // //                         </tr>
// // // // // // //                       </thead>
// // // // // // //                       <tbody>
// // // // // // //                         {(activeRow.items || activeRow.allocations || []).map((item, idx) => {
// // // // // // //                           const itemName = item.stockItemId?.name || item.itemName || "Unknown Item";
                          
// // // // // // //                           // Robust Quantity Picker
// // // // // // //                           const quantity = item.quantity || item.qtyBaseUnit || item.receivedQty || item.orderedQty || 0;
                          
// // // // // // //                           // FIXED: Enhanced Unit Resolution
// // // // // // //                           const unitSymbol = 
// // // // // // //                             item.stockItemId?.unitId?.symbol || 
// // // // // // //                             item.unitId?.symbol || 
// // // // // // //                             item.unit || 
// // // // // // //                             (["distributions", "consumptions", "transfers"].includes(entity) ? "Kg" : "");

// // // // // // //                           return (
// // // // // // //                             <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
// // // // // // //                               <td style={{ padding: '16px 0', fontWeight: '700', color: '#334155', fontSize: '13px' }}>{itemName}</td>
// // // // // // //                               <td style={{ padding: '16px 0', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
// // // // // // //                                 {quantity} <span style={{ fontSize: '10px', color: '#94a3b8' }}>{unitSymbol}</span>
// // // // // // //                               </td>
// // // // // // //                               <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>
// // // // // // //                                 {item.amount || item.unitPrice ? `₹${(item.amount || (quantity * (item.unitPrice || 0))).toLocaleString()}` : "—"}
// // // // // // //                               </td>
// // // // // // //                             </tr>
// // // // // // //                           );
// // // // // // //                         })}
// // // // // // //                       </tbody>
// // // // // // //                     </table>
// // // // // // //                   </div>
// // // // // // //                 )}
// // // // // // //               </div>
// // // // // // //             </>
// // // // // // //           ) : (
// // // // // // //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
// // // // // // //               <Filter size={48} color="#e2e8f0" />
// // // // // // //               <div style={{ color: '#94a3b8', fontWeight: '600' }}>Select a record to view analytics</div>
// // // // // // //             </div>
// // // // // // //           )}
// // // // // // //         </div>
// // // // // // //       </div>
// // // // // // //     </div>
// // // // // // //   );
// // // // // // // };














// // // // // // import { useState, useEffect, useCallback, useMemo } from "react";
// // // // // // import { api } from "../api.js";
// // // // // // import { Search, FileText, Download, Table as TableIcon, Filter, LayoutGrid, Calendar } from "lucide-react";

// // // // // // const reportEntities = ["indents", "purchase-orders", "distributions", "transfers", "requests", "consumptions"];

// // // // // // export const ReportsPage = () => {
// // // // // //   const [entity, setEntity] = useState("indents");
// // // // // //   const [rows, setRows] = useState([]);
// // // // // //   const [loading, setLoading] = useState(false);
// // // // // //   const [searchTerm, setSearchTerm] = useState("");
// // // // // //   const [selectedRowId, setSelectedRowId] = useState(null);
// // // // // //   // NEW: Date state (defaults to today)
// // // // // //   const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

// // // // // //   const load = useCallback(async () => {
// // // // // //     setLoading(true);
// // // // // //     try {
// // // // // //       // Pass date as a query parameter to filter results
// // // // // //       const res = await api.get(`/reports/${entity}`, { params: { date: reportDate } });
// // // // // //       const data = res.data || [];
// // // // // //       setRows(data);
// // // // // //       if (data.length > 0) {
// // // // // //         setSelectedRowId(data[0]._id);
// // // // // //       } else {
// // // // // //         setSelectedRowId(null);
// // // // // //       }
// // // // // //     } catch (error) {
// // // // // //       console.error("Failed to load report:", error);
// // // // // //     } finally {
// // // // // //       setLoading(false);
// // // // // //     }
// // // // // //   }, [entity, reportDate]);

// // // // // //   useEffect(() => {
// // // // // //     load();
// // // // // //   }, [load]);

// // // // // //   const filteredRows = useMemo(() => {
// // // // // //     return rows.filter(row => 
// // // // // //       Object.values(row).some(val => 
// // // // // //         String(val).toLowerCase().includes(searchTerm.toLowerCase())
// // // // // //       )
// // // // // //     );
// // // // // //   }, [rows, searchTerm]);

// // // // // //   const activeRow = useMemo(() => 
// // // // // //     rows.find(r => r._id === selectedRowId), 
// // // // // //   [selectedRowId, rows]);

// // // // // //   const resolveStatus = (row) => {
// // // // // //     if (row.status) return row.status.toUpperCase();
// // // // // //     if (["distributions", "transfers", "consumptions"].includes(entity)) return "COMPLETED";
// // // // // //     return "N/A";
// // // // // //   };

// // // // // //   const exportAllExcel = async () => {
// // // // // //     try {
// // // // // //       // Passing the reportDate ensures the backend filters all godowns for that specific day
// // // // // //       const response = await api.get(`/reports/${entity}/export/excel`, {
// // // // // //         params: { date: reportDate },
// // // // // //         responseType: 'arraybuffer',
// // // // // //         headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
// // // // // //       });
      
// // // // // //       const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
// // // // // //       const url = window.URL.createObjectURL(blob);
// // // // // //       const link = document.createElement('a');
// // // // // //       link.href = url;
// // // // // //       link.setAttribute('download', `all-${entity}-${reportDate}.xlsx`);
// // // // // //       document.body.appendChild(link);
// // // // // //       link.click();
// // // // // //       document.body.removeChild(link);
// // // // // //       window.URL.revokeObjectURL(url);
// // // // // //     } catch (error) {
// // // // // //       console.error("Bulk Export Error:", error);
// // // // // //       alert("Bulk download failed.");
// // // // // //     }
// // // // // //   };

// // // // // //   const exportSingleExcel = async (id) => {
// // // // // //     try {
// // // // // //       const response = await api.get(`/reports/${entity}/export/excel/${id}`, {
// // // // // //         responseType: 'arraybuffer',
// // // // // //         headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
// // // // // //       });
// // // // // //       const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
// // // // // //       const url = window.URL.createObjectURL(blob);
// // // // // //       const link = document.createElement('a');
// // // // // //       link.href = url;
// // // // // //       link.setAttribute('download', `${entity}-${id}.xlsx`);
// // // // // //       document.body.appendChild(link);
// // // // // //       link.click();
// // // // // //       document.body.removeChild(link);
// // // // // //       window.URL.revokeObjectURL(url);
// // // // // //     } catch (error) {
// // // // // //       console.error("Export Error:", error);
// // // // // //       alert("Download failed.");
// // // // // //     }
// // // // // //   };

// // // // // //   const getVisibleKeys = (item) => {
// // // // // //     if (!item) return [];
// // // // // //     return Object.keys(item).filter(key => 
// // // // // //       !["_id", "__v", "items", "allocations", "leftovers", "updatedAt", "userId", "createdBy", 
// // // // // //         "indentId", "purchaseOrderId", "leftoverSourceId", "fromGodownId", "toGodownId", "godownId", "status", "createdAt"].includes(key)
// // // // // //     );
// // // // // //   };

// // // // // //   return (
// // // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // // //       {/* Header Section */}
// // // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
// // // // // //             Data <span style={{ color: '#6366f1' }}>Analytics</span>
// // // // // //           </h1>
          
// // // // // //           <select 
// // // // // //             value={entity} 
// // // // // //             onChange={(e) => { setEntity(e.target.value); setRows([]); }}
// // // // // //             style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', fontWeight: '700', cursor: 'pointer', outline: 'none', color: '#475569' }}
// // // // // //           >
// // // // // //             {reportEntities.map((r) => <option key={r} value={r}>{r.replace("-", " ").toUpperCase()}</option>)}
// // // // // //           </select>

// // // // // //           {/* NEW: Date Picker UI */}
// // // // // //           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '4px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
// // // // // //             <Calendar size={14} color="#64748b" />
// // // // // //             <input 
// // // // // //               type="date" 
// // // // // //               value={reportDate}
// // // // // //               onChange={(e) => setReportDate(e.target.value)}
// // // // // //               style={{ border: 'none', background: 'transparent', fontSize: '12px', fontWeight: '700', color: '#475569', outline: 'none', cursor: 'pointer' }}
// // // // // //             />
// // // // // //           </div>
// // // // // //         </div>

// // // // // //         <div style={{ display: 'flex', gap: '12px' }}>
// // // // // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // //             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // // //             <input
// // // // // //               type="text"
// // // // // //               placeholder="Filter records..."
// // // // // //               value={searchTerm}
// // // // // //               onChange={(e) => setSearchTerm(e.target.value)}
// // // // // //               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '180px', outline: 'none' }}
// // // // // //             />
// // // // // //           </div>
// // // // // //           <button onClick={exportAllExcel} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // // //             <Download size={14}/> EXPORT {reportDate}
// // // // // //           </button>
// // // // // //         </div>
// // // // // //       </div>

// // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // //         {/* Left Sidebar */}
// // // // // //         <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // //           <div style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '1px' }}>
// // // // // //             RECENT {entity.replace("-", " ").toUpperCase()} ({filteredRows.length})
// // // // // //           </div>
// // // // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
// // // // // //             {loading ? (
// // // // // //               <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Loading...</div>
// // // // // //             ) : filteredRows.length > 0 ? filteredRows.map(row => (
// // // // // //               <div
// // // // // //                 key={row._id}
// // // // // //                 onClick={() => setSelectedRowId(row._id)}
// // // // // //                 style={{
// // // // // //                   padding: '16px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
// // // // // //                   background: selectedRowId === row._id ? '#fff' : 'rgba(255,255,255,0.4)',
// // // // // //                   border: selectedRowId === row._id ? '1px solid #6366f1' : '1px solid transparent',
// // // // // //                   boxShadow: selectedRowId === row._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// // // // // //                 }}
// // // // // //               >
// // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
// // // // // //                   <div style={{ fontWeight: '800', fontSize: '13px', color: selectedRowId === row._id ? '#6366f1' : '#1e293b' }}>
// // // // // //                     {row.indentNo || row.orderNo || row.transferNo || row.requestNo || row.distributionNo || row.consumptionNo || row._id.slice(-8).toUpperCase()}
// // // // // //                   </div>
// // // // // //                   <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8' }}>
// // // // // //                     {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-GB') : ''}
// // // // // //                   </div>
// // // // // //                 </div>
// // // // // //                 <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
// // // // // //                   Status: <span style={{ color: selectedRowId === row._id ? '#6366f1' : '#0f172a' }}>{resolveStatus(row)}</span>
// // // // // //                 </div>
// // // // // //               </div>
// // // // // //             )) : (
// // // // // //               <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>No records found for this date.</div>
// // // // // //             )}
// // // // // //           </div>
// // // // // //         </div>

// // // // // //         {/* Right Detail View */}
// // // // // //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
// // // // // //           {activeRow ? (
// // // // // //             <>
// // // // // //               <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
// // // // // //                 <div>
// // // // // //                   <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '4px' }}>DOCUMENT ID</div>
// // // // // //                   <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
// // // // // //                     {activeRow.indentNo || activeRow.orderNo || activeRow.transferNo || activeRow.requestNo || activeRow.distributionNo || activeRow.consumptionNo || activeRow._id}
// // // // // //                   </div>
// // // // // //                 </div>
// // // // // //                 <button 
// // // // // //                   onClick={() => exportSingleExcel(activeRow._id)}
// // // // // //                   style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '12px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
// // // // // //                 >
// // // // // //                   <Download size={16}/> DOWNLOAD XLSX
// // // // // //                 </button>
// // // // // //               </div>

// // // // // //               <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
// // // // // //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px', marginBottom: '48px' }}>
// // // // // //                   <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>STATUS</div>
// // // // // //                     <div style={{ fontWeight: '700', color: '#6366f1', fontSize: '14px' }}>{resolveStatus(activeRow)}</div>
// // // // // //                   </div>

// // // // // //                   {(activeRow.godownId || activeRow.fromGodownId) && (
// // // // // //                     <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>LOCATION</div>
// // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// // // // // //                         {(activeRow.godownId?.name || activeRow.fromGodownId?.name || "Main Store")}
// // // // // //                       </div>
// // // // // //                     </div>
// // // // // //                   )}

// // // // // //                   {getVisibleKeys(activeRow).map(key => (
// // // // // //                     <div key={key} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{key.replace(/([A-Z])/g, ' $1')}</div>
// // // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// // // // // //                         {key === 'totalAmount' ? `₹${activeRow[key]?.toLocaleString()}` : String(activeRow[key])}
// // // // // //                       </div>
// // // // // //                     </div>
// // // // // //                   ))}
// // // // // //                 </div>

// // // // // //                 {(activeRow.items || activeRow.allocations) && (
// // // // // //                   <div>
// // // // // //                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
// // // // // //                         <TableIcon size={16} color="#6366f1" />
// // // // // //                         <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>ITEMIZED BREAKDOWN</span>
// // // // // //                     </div>
// // // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // //                       <thead>
// // // // // //                         <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>ITEM</th>
// // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'center' }}>QUANTITY</th>
// // // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>AMOUNT</th>
// // // // // //                         </tr>
// // // // // //                       </thead>
// // // // // //                       <tbody>
// // // // // //                         {(activeRow.items || activeRow.allocations || []).map((item, idx) => {
// // // // // //                           const quantity = item.quantity || item.qtyBaseUnit || item.receivedQty || item.orderedQty || 0;
// // // // // //                           const unitSymbol = item.stockItemId?.unitId?.symbol || item.unitId?.symbol || item.unit || (["distributions", "consumptions"].includes(entity) ? "Kg" : "");
                          
// // // // // //                           return (
// // // // // //                             <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
// // // // // //                               <td style={{ padding: '16px 0', fontWeight: '700', color: '#334155', fontSize: '13px' }}>{item.stockItemId?.name || item.itemName || "Unknown Item"}</td>
// // // // // //                               <td style={{ padding: '16px 0', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
// // // // // //                                 {quantity} <span style={{ fontSize: '10px', color: '#94a3b8' }}>{unitSymbol}</span>
// // // // // //                               </td>
// // // // // //                               <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>
// // // // // //                                 {item.amount || item.unitPrice ? `₹${(item.amount || (quantity * (item.unitPrice || 0))).toLocaleString()}` : "—"}
// // // // // //                               </td>
// // // // // //                             </tr>
// // // // // //                           );
// // // // // //                         })}
// // // // // //                       </tbody>
// // // // // //                     </table>
// // // // // //                   </div>
// // // // // //                 )}
// // // // // //               </div>
// // // // // //             </>
// // // // // //           ) : (
// // // // // //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
// // // // // //               <Filter size={48} color="#e2e8f0" />
// // // // // //               <div style={{ color: '#94a3b8', fontWeight: '600' }}>No analytics available for this selection</div>
// // // // // //             </div>
// // // // // //           )}
// // // // // //         </div>
// // // // // //       </div>
// // // // // //     </div>
// // // // // //   );
// // // // // // };











// // // // // import { useState, useEffect, useCallback, useMemo } from "react";
// // // // // import { api } from "../api.js";
// // // // // import { Search, FileText, Download, Table as TableIcon, Filter, LayoutGrid, Calendar } from "lucide-react";

// // // // // const reportEntities = ["indents", "purchase-orders", "distributions", "transfers", "requests", "consumptions"];

// // // // // export const ReportsPage = () => {
// // // // //   const [entity, setEntity] = useState("indents");
// // // // //   const [rows, setRows] = useState([]);
// // // // //   const [loading, setLoading] = useState(false);
// // // // //   const [searchTerm, setSearchTerm] = useState("");
// // // // //   const [selectedRowId, setSelectedRowId] = useState(null);
  
// // // // //   // Date state: Defaults to today (YYYY-MM-DD)
// // // // //   const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

// // // // //   /**
// // // // //    * LOAD DATA: 
// // // // //    * Triggers whenever entity or reportDate changes.
// // // // //    * Sends the date to the backend to ensure ONLY that day's data is returned.
// // // // //    */
// // // // //   const load = useCallback(async () => {
// // // // //     setLoading(true);
// // // // //     try {
// // // // //       // We pass 'date' as a param. Backend must handle: { createdAt: { $gte: startOfDay, $lte: endOfDay } }
// // // // //       const res = await api.get(`/reports/${entity}`, { 
// // // // //         params: { date: reportDate } 
// // // // //       });
      
// // // // //       const data = res.data || [];
// // // // //       setRows(data);
      
// // // // //       // Auto-select the first item from the new date's list
// // // // //       if (data.length > 0) {
// // // // //         setSelectedRowId(data[0]._id);
// // // // //       } else {
// // // // //         setSelectedRowId(null);
// // // // //       }
// // // // //     } catch (error) {
// // // // //       console.error("Failed to load report:", error);
// // // // //       setRows([]);
// // // // //       setSelectedRowId(null);
// // // // //     } finally {
// // // // //       setLoading(false);
// // // // //     }
// // // // //   }, [entity, reportDate]);

// // // // //   // Sync effect to reload data when filters change
// // // // //   useEffect(() => {
// // // // //     load();
// // // // //   }, [load]);

// // // // //   // Search filtering within the already date-filtered list
// // // // //   const filteredRows = useMemo(() => {
// // // // //     return rows.filter(row => 
// // // // //       Object.values(row).some(val => 
// // // // //         String(val).toLowerCase().includes(searchTerm.toLowerCase())
// // // // //       )
// // // // //     );
// // // // //   }, [rows, searchTerm]);

// // // // //   const activeRow = useMemo(() => 
// // // // //     rows.find(r => r._id === selectedRowId), 
// // // // //   [selectedRowId, rows]);

// // // // //   const resolveStatus = (row) => {
// // // // //     if (row.status) return row.status.toUpperCase();
// // // // //     if (["distributions", "transfers", "consumptions"].includes(entity)) return "COMPLETED";
// // // // //     return "N/A";
// // // // //   };

// // // // //   const exportAllExcel = async () => {
// // // // //     try {
// // // // //       const response = await api.get(`/reports/${entity}/export/excel`, {
// // // // //         params: { date: reportDate },
// // // // //         responseType: 'arraybuffer',
// // // // //         headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
// // // // //       });
      
// // // // //       const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
// // // // //       const url = window.URL.createObjectURL(blob);
// // // // //       const link = document.createElement('a');
// // // // //       link.href = url;
// // // // //       link.setAttribute('download', `all-${entity}-${reportDate}.xlsx`);
// // // // //       document.body.appendChild(link);
// // // // //       link.click();
// // // // //       document.body.removeChild(link);
// // // // //       window.URL.revokeObjectURL(url);
// // // // //     } catch (error) {
// // // // //       console.error("Bulk Export Error:", error);
// // // // //       alert("Bulk download failed.");
// // // // //     }
// // // // //   };

// // // // //   const exportSingleExcel = async (id) => {
// // // // //     try {
// // // // //       const response = await api.get(`/reports/${entity}/export/excel/${id}`, {
// // // // //         responseType: 'arraybuffer',
// // // // //         headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
// // // // //       });
// // // // //       const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
// // // // //       const url = window.URL.createObjectURL(blob);
// // // // //       const link = document.createElement('a');
// // // // //       link.href = url;
// // // // //       link.setAttribute('download', `${entity}-${id}.xlsx`);
// // // // //       document.body.appendChild(link);
// // // // //       link.click();
// // // // //       document.body.removeChild(link);
// // // // //       window.URL.revokeObjectURL(url);
// // // // //     } catch (error) {
// // // // //       console.error("Export Error:", error);
// // // // //       alert("Download failed.");
// // // // //     }
// // // // //   };

// // // // //   const getVisibleKeys = (item) => {
// // // // //     if (!item) return [];
// // // // //     return Object.keys(item).filter(key => 
// // // // //       !["_id", "__v", "items", "allocations", "leftovers", "updatedAt", "userId", "createdBy", 
// // // // //         "indentId", "purchaseOrderId", "leftoverSourceId", "fromGodownId", "toGodownId", "godownId", "status", "createdAt"].includes(key)
// // // // //     );
// // // // //   };

// // // // //   return (
// // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // //       {/* Header Section */}
// // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
// // // // //             Data <span style={{ color: '#6366f1' }}>Analytics</span>
// // // // //           </h1>
          
// // // // //           <select 
// // // // //             value={entity} 
// // // // //             onChange={(e) => { setEntity(e.target.value); setRows([]); }}
// // // // //             style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', fontWeight: '700', cursor: 'pointer', outline: 'none', color: '#475569' }}
// // // // //           >
// // // // //             {reportEntities.map((r) => <option key={r} value={r}>{r.replace("-", " ").toUpperCase()}</option>)}
// // // // //           </select>

// // // // //           {/* Date Picker UI */}
// // // // //           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '4px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
// // // // //             <Calendar size={14} color="#6366f1" />
// // // // //             <input 
// // // // //               type="date" 
// // // // //               value={reportDate}
// // // // //               onChange={(e) => setReportDate(e.target.value)}
// // // // //               style={{ border: 'none', background: 'transparent', fontSize: '12px', fontWeight: '800', color: '#1e293b', outline: 'none', cursor: 'pointer' }}
// // // // //             />
// // // // //           </div>
// // // // //         </div>

// // // // //         <div style={{ display: 'flex', gap: '12px' }}>
// // // // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // //             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // //             <input
// // // // //               type="text"
// // // // //               placeholder="Filter current view..."
// // // // //               value={searchTerm}
// // // // //               onChange={(e) => setSearchTerm(e.target.value)}
// // // // //               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '180px', outline: 'none' }}
// // // // //             />
// // // // //           </div>
// // // // //           <button onClick={exportAllExcel} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // // //             <Download size={14}/> EXPORT {reportDate}
// // // // //           </button>
// // // // //         </div>
// // // // //       </div>

// // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // //         {/* Left Sidebar - Strict Date Filtered List */}
// // // // //         <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // //           <div style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '1px' }}>
// // // // //             {entity.replace("-", " ").toUpperCase()} FOR {reportDate} ({filteredRows.length})
// // // // //           </div>
// // // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
// // // // //             {loading ? (
// // // // //               <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Updating list...</div>
// // // // //             ) : filteredRows.length > 0 ? filteredRows.map(row => (
// // // // //               <div
// // // // //                 key={row._id}
// // // // //                 onClick={() => setSelectedRowId(row._id)}
// // // // //                 style={{
// // // // //                   padding: '16px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
// // // // //                   background: selectedRowId === row._id ? '#fff' : 'rgba(255,255,255,0.4)',
// // // // //                   border: selectedRowId === row._id ? '1px solid #6366f1' : '1px solid transparent',
// // // // //                   boxShadow: selectedRowId === row._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// // // // //                 }}
// // // // //               >
// // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
// // // // //                   <div style={{ fontWeight: '800', fontSize: '13px', color: selectedRowId === row._id ? '#6366f1' : '#1e293b' }}>
// // // // //                     {row.indentNo || row.orderNo || row.transferNo || row.requestNo || row.distributionNo || row.consumptionNo || row._id.slice(-8).toUpperCase()}
// // // // //                   </div>
// // // // //                   <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8' }}>
// // // // //                     {row.createdAt ? new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
// // // // //                   </div>
// // // // //                 </div>
// // // // //                 <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
// // // // //                   Status: <span style={{ color: selectedRowId === row._id ? '#6366f1' : '#0f172a' }}>{resolveStatus(row)}</span>
// // // // //                 </div>
// // // // //               </div>
// // // // //             )) : (
// // // // //               <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', background: 'rgba(255,255,255,0.3)', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
// // // // //                 No records found for this date.
// // // // //               </div>
// // // // //             )}
// // // // //           </div>
// // // // //         </div>

// // // // //         {/* Right Detail View */}
// // // // //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
// // // // //           {activeRow ? (
// // // // //             <>
// // // // //               <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
// // // // //                 <div>
// // // // //                   <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '4px' }}>DOCUMENT ID</div>
// // // // //                   <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
// // // // //                     {activeRow.indentNo || activeRow.orderNo || activeRow.transferNo || activeRow.requestNo || activeRow.distributionNo || activeRow.consumptionNo || activeRow._id}
// // // // //                   </div>
// // // // //                 </div>
// // // // //                 <button 
// // // // //                   onClick={() => exportSingleExcel(activeRow._id)}
// // // // //                   style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '12px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
// // // // //                 >
// // // // //                   <Download size={16}/> DOWNLOAD XLSX
// // // // //                 </button>
// // // // //               </div>

// // // // //               <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
// // // // //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px', marginBottom: '48px' }}>
// // // // //                   <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>STATUS</div>
// // // // //                     <div style={{ fontWeight: '700', color: '#6366f1', fontSize: '14px' }}>{resolveStatus(activeRow)}</div>
// // // // //                   </div>

// // // // //                   {(activeRow.godownId || activeRow.fromGodownId) && (
// // // // //                     <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>LOCATION</div>
// // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// // // // //                         {(activeRow.godownId?.name || activeRow.fromGodownId?.name || "Main Store")}
// // // // //                       </div>
// // // // //                     </div>
// // // // //                   )}

// // // // //                   {getVisibleKeys(activeRow).map(key => (
// // // // //                     <div key={key} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{key.replace(/([A-Z])/g, ' $1')}</div>
// // // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// // // // //                         {key === 'totalAmount' ? `₹${activeRow[key]?.toLocaleString()}` : String(activeRow[key])}
// // // // //                       </div>
// // // // //                     </div>
// // // // //                   ))}
// // // // //                 </div>

// // // // //                 {(activeRow.items || activeRow.allocations) && (
// // // // //                   <div>
// // // // //                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
// // // // //                         <TableIcon size={16} color="#6366f1" />
// // // // //                         <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>ITEMIZED BREAKDOWN</span>
// // // // //                     </div>
// // // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // //                       <thead>
// // // // //                         <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>ITEM</th>
// // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'center' }}>QUANTITY</th>
// // // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>AMOUNT</th>
// // // // //                         </tr>
// // // // //                       </thead>
// // // // //                       <tbody>
// // // // //                         {(activeRow.items || activeRow.allocations || []).map((item, idx) => {
// // // // //                           const quantity = item.quantity || item.qtyBaseUnit || item.receivedQty || item.orderedQty || 0;
// // // // //                           const unitSymbol = item.stockItemId?.unitId?.symbol || item.unitId?.symbol || item.unit || (["distributions", "consumptions"].includes(entity) ? "Kg" : "");
                          
// // // // //                           return (
// // // // //                             <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
// // // // //                               <td style={{ padding: '16px 0', fontWeight: '700', color: '#334155', fontSize: '13px' }}>{item.stockItemId?.name || item.itemName || "Unknown Item"}</td>
// // // // //                               <td style={{ padding: '16px 0', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
// // // // //                                 {quantity} <span style={{ fontSize: '10px', color: '#94a3b8' }}>{unitSymbol}</span>
// // // // //                               </td>
// // // // //                               <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>
// // // // //                                 {item.amount || item.unitPrice ? `₹${(item.amount || (quantity * (item.unitPrice || 0))).toLocaleString()}` : "—"}
// // // // //                               </td>
// // // // //                             </tr>
// // // // //                           );
// // // // //                         })}
// // // // //                       </tbody>
// // // // //                     </table>
// // // // //                   </div>
// // // // //                 )}
// // // // //               </div>
// // // // //             </>
// // // // //           ) : (
// // // // //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
// // // // //               <Filter size={48} color="#e2e8f0" />
// // // // //               <div style={{ color: '#94a3b8', fontWeight: '600' }}>No records to display for this date.</div>
// // // // //             </div>
// // // // //           )}
// // // // //         </div>
// // // // //       </div>
// // // // //     </div>
// // // // //   );
// // // // // };













// // // // import { useState, useEffect, useCallback, useMemo } from "react";
// // // // import { api } from "../api.js";
// // // // import { Search, FileText, Download, Table as TableIcon, Filter, LayoutGrid, Calendar } from "lucide-react";

// // // // const reportEntities = ["indents", "purchase-orders", "distributions", "transfers", "requests", "consumptions"];

// // // // export const ReportsPage = () => {
// // // //   const [entity, setEntity] = useState("indents");
// // // //   const [rows, setRows] = useState([]);
// // // //   const [loading, setLoading] = useState(false);
// // // //   const [searchTerm, setSearchTerm] = useState("");
// // // //   const [selectedRowId, setSelectedRowId] = useState(null);
  
// // // //   // Date state: Defaults to today (YYYY-MM-DD)
// // // //   const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

// // // //   /**
// // // //    * LOAD DATA: 
// // // //    * Fetches data specifically for the selected entity and the selected date.
// // // //    */
// // // //   const load = useCallback(async () => {
// // // //     setLoading(true);
// // // //     try {
// // // //       // The 'params' object sends the date to your backend.
// // // //       // Your backend should use this to query: { createdAt: { $gte: startOfDay, $lte: endOfDay } }
// // // //       const res = await api.get(`/reports/${entity}`, { 
// // // //         params: { date: reportDate } 
// // // //       });
      
// // // //       const data = res.data || [];
// // // //       setRows(data);
      
// // // //       // Reset selection to the first item of the new date's list
// // // //       if (data.length > 0) {
// // // //         setSelectedRowId(data[0]._id);
// // // //       } else {
// // // //         setSelectedRowId(null);
// // // //       }
// // // //     } catch (error) {
// // // //       console.error("Failed to load report data:", error);
// // // //       setRows([]);
// // // //       setSelectedRowId(null);
// // // //     } finally {
// // // //       setLoading(false);
// // // //     }
// // // //   }, [entity, reportDate]);

// // // //   // Re-run load whenever the Entity or the Date changes
// // // //   useEffect(() => {
// // // //     load();
// // // //   }, [load]);

// // // //   // Handle local searching/filtering within the date-specific results
// // // //   const filteredRows = useMemo(() => {
// // // //     return rows.filter(row => 
// // // //       Object.values(row).some(val => 
// // // //         String(val).toLowerCase().includes(searchTerm.toLowerCase())
// // // //       )
// // // //     );
// // // //   }, [rows, searchTerm]);

// // // //   const activeRow = useMemo(() => 
// // // //     rows.find(r => r._id === selectedRowId), 
// // // //   [selectedRowId, rows]);

// // // //   const resolveStatus = (row) => {
// // // //     if (row.status) return row.status.toUpperCase();
// // // //     if (["distributions", "transfers", "consumptions"].includes(entity)) return "COMPLETED";
// // // //     return "N/A";
// // // //   };

// // // //   const exportAllExcel = async () => {
// // // //     try {
// // // //       const response = await api.get(`/reports/${entity}/export/excel`, {
// // // //         params: { date: reportDate },
// // // //         responseType: 'arraybuffer',
// // // //         headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
// // // //       });
      
// // // //       const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
// // // //       const url = window.URL.createObjectURL(blob);
// // // //       const link = document.createElement('a');
// // // //       link.href = url;
// // // //       link.setAttribute('download', `all-${entity}-${reportDate}.xlsx`);
// // // //       document.body.appendChild(link);
// // // //       link.click();
// // // //       document.body.removeChild(link);
// // // //       window.URL.revokeObjectURL(url);
// // // //     } catch (error) {
// // // //       console.error("Bulk Export Error:", error);
// // // //       alert("Export failed for the selected date.");
// // // //     }
// // // //   };

// // // //   const exportSingleExcel = async (id) => {
// // // //     try {
// // // //       const response = await api.get(`/reports/${entity}/export/excel/${id}`, {
// // // //         responseType: 'arraybuffer',
// // // //         headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
// // // //       });
// // // //       const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
// // // //       const url = window.URL.createObjectURL(blob);
// // // //       const link = document.createElement('a');
// // // //       link.href = url;
// // // //       link.setAttribute('download', `${entity}-${id}.xlsx`);
// // // //       document.body.appendChild(link);
// // // //       link.click();
// // // //       document.body.removeChild(link);
// // // //       window.URL.revokeObjectURL(url);
// // // //     } catch (error) {
// // // //       console.error("Single Export Error:", error);
// // // //       alert("Download failed.");
// // // //     }
// // // //   };

// // // //   const getVisibleKeys = (item) => {
// // // //     if (!item) return [];
// // // //     return Object.keys(item).filter(key => 
// // // //       !["_id", "__v", "items", "allocations", "leftovers", "updatedAt", "userId", "createdBy", 
// // // //         "indentId", "purchaseOrderId", "leftoverSourceId", "fromGodownId", "toGodownId", "godownId", "status", "createdAt"].includes(key)
// // // //     );
// // // //   };

// // // //   return (
// // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // //       {/* Top Navigation / Header */}
// // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
// // // //             Data <span style={{ color: '#6366f1' }}>Analytics</span>
// // // //           </h1>
          
// // // //           {/* Entity Selector */}
// // // //           <select 
// // // //             value={entity} 
// // // //             onChange={(e) => { setEntity(e.target.value); setRows([]); }}
// // // //             style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', fontWeight: '700', cursor: 'pointer', outline: 'none', color: '#475569' }}
// // // //           >
// // // //             {reportEntities.map((r) => <option key={r} value={r}>{r.replace("-", " ").toUpperCase()}</option>)}
// // // //           </select>

// // // //           {/* Date Picker - The Filter Controller */}
// // // //           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '4px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
// // // //             <Calendar size={14} color="#6366f1" />
// // // //             <input 
// // // //               type="date" 
// // // //               value={reportDate}
// // // //               onChange={(e) => setReportDate(e.target.value)}
// // // //               style={{ border: 'none', background: 'transparent', fontSize: '12px', fontWeight: '800', color: '#1e293b', outline: 'none', cursor: 'pointer' }}
// // // //             />
// // // //           </div>
// // // //         </div>

// // // //         <div style={{ display: 'flex', gap: '12px' }}>
// // // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // //             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // //             <input
// // // //               type="text"
// // // //               placeholder="Search results..."
// // // //               value={searchTerm}
// // // //               onChange={(e) => setSearchTerm(e.target.value)}
// // // //               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '180px', outline: 'none' }}
// // // //             />
// // // //           </div>
// // // //           <button onClick={exportAllExcel} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // // //             <Download size={14}/> EXPORT {reportDate}
// // // //           </button>
// // // //         </div>
// // // //       </div>

// // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // //         {/* Sidebar - Filtered strictly by date via API */}
// // // //         <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // //           <div style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '1px' }}>
// // // //             {entity.replace("-", " ").toUpperCase()} ON {new Date(reportDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ({filteredRows.length})
// // // //           </div>
// // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
// // // //             {loading ? (
// // // //               <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Fetching records...</div>
// // // //             ) : filteredRows.length > 0 ? filteredRows.map(row => (
// // // //               <div
// // // //                 key={row._id}
// // // //                 onClick={() => setSelectedRowId(row._id)}
// // // //                 style={{
// // // //                   padding: '16px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
// // // //                   background: selectedRowId === row._id ? '#fff' : 'rgba(255,255,255,0.4)',
// // // //                   border: selectedRowId === row._id ? '1px solid #6366f1' : '1px solid transparent',
// // // //                   boxShadow: selectedRowId === row._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// // // //                 }}
// // // //               >
// // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
// // // //                   <div style={{ fontWeight: '800', fontSize: '13px', color: selectedRowId === row._id ? '#6366f1' : '#1e293b' }}>
// // // //                     {row.indentNo || row.orderNo || row.transferNo || row.requestNo || row.distributionNo || row.consumptionNo || row._id.slice(-8).toUpperCase()}
// // // //                   </div>
// // // //                   <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8' }}>
// // // //                     {row.createdAt ? new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
// // // //                   </div>
// // // //                 </div>
// // // //                 <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
// // // //                   Status: <span style={{ color: selectedRowId === row._id ? '#6366f1' : '#0f172a' }}>{resolveStatus(row)}</span>
// // // //                 </div>
// // // //               </div>
// // // //             )) : (
// // // //               <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', background: 'rgba(255,255,255,0.3)', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
// // // //                 No records found for this date.
// // // //               </div>
// // // //             )}
// // // //           </div>
// // // //         </div>

// // // //         {/* Detail View Container */}
// // // //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
// // // //           {activeRow ? (
// // // //             <>
// // // //               <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
// // // //                 <div>
// // // //                   <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '4px' }}>DOCUMENT ID</div>
// // // //                   <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
// // // //                     {activeRow.indentNo || activeRow.orderNo || activeRow.transferNo || activeRow.requestNo || activeRow.distributionNo || activeRow.consumptionNo || activeRow._id}
// // // //                   </div>
// // // //                 </div>
// // // //                 <button 
// // // //                   onClick={() => exportSingleExcel(activeRow._id)}
// // // //                   style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '12px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
// // // //                 >
// // // //                   <Download size={16}/> DOWNLOAD XLSX
// // // //                 </button>
// // // //               </div>

// // // //               <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
// // // //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px', marginBottom: '48px' }}>
// // // //                   <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>STATUS</div>
// // // //                     <div style={{ fontWeight: '700', color: '#6366f1', fontSize: '14px' }}>{resolveStatus(activeRow)}</div>
// // // //                   </div>

// // // //                   {(activeRow.godownId || activeRow.fromGodownId) && (
// // // //                     <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>LOCATION</div>
// // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// // // //                         {(activeRow.godownId?.name || activeRow.fromGodownId?.name || "Main Store")}
// // // //                       </div>
// // // //                     </div>
// // // //                   )}

// // // //                   {getVisibleKeys(activeRow).map(key => (
// // // //                     <div key={key} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{key.replace(/([A-Z])/g, ' $1')}</div>
// // // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// // // //                         {key === 'totalAmount' ? `₹${activeRow[key]?.toLocaleString()}` : String(activeRow[key])}
// // // //                       </div>
// // // //                     </div>
// // // //                   ))}
// // // //                 </div>

// // // //                 {/* Items Table */}
// // // //                 {(activeRow.items || activeRow.allocations) && (
// // // //                   <div>
// // // //                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
// // // //                         <TableIcon size={16} color="#6366f1" />
// // // //                         <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>ITEMIZED BREAKDOWN</span>
// // // //                     </div>
// // // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // //                       <thead>
// // // //                         <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>ITEM</th>
// // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'center' }}>QUANTITY</th>
// // // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>AMOUNT</th>
// // // //                         </tr>
// // // //                       </thead>
// // // //                       <tbody>
// // // //                         {(activeRow.items || activeRow.allocations || []).map((item, idx) => {
// // // //                           const quantity = item.quantity || item.qtyBaseUnit || item.receivedQty || item.orderedQty || 0;
// // // //                           const unitSymbol = item.stockItemId?.unitId?.symbol || item.unitId?.symbol || item.unit || (["distributions", "consumptions"].includes(entity) ? "Kg" : "");
                          
// // // //                           return (
// // // //                             <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
// // // //                               <td style={{ padding: '16px 0', fontWeight: '700', color: '#334155', fontSize: '13px' }}>{item.stockItemId?.name || item.itemName || "Unknown Item"}</td>
// // // //                               <td style={{ padding: '16px 0', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
// // // //                                 {quantity} <span style={{ fontSize: '10px', color: '#94a3b8' }}>{unitSymbol}</span>
// // // //                               </td>
// // // //                               <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>
// // // //                                 {item.amount || item.unitPrice ? `₹${(item.amount || (quantity * (item.unitPrice || 0))).toLocaleString()}` : "—"}
// // // //                               </td>
// // // //                             </tr>
// // // //                           );
// // // //                         })}
// // // //                       </tbody>
// // // //                     </table>
// // // //                   </div>
// // // //                 )}
// // // //               </div>
// // // //             </>
// // // //           ) : (
// // // //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
// // // //               <Filter size={48} color="#e2e8f0" />
// // // //               <div style={{ color: '#94a3b8', fontWeight: '600' }}>Select a record to view analytics</div>
// // // //             </div>
// // // //           )}
// // // //         </div>
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // };




// // // // 9-4-2026




// // // import { useState, useEffect, useCallback, useMemo } from "react";
// // // import { api } from "../api.js";
// // // import { Search, Download, Table as TableIcon, Filter, Calendar } from "lucide-react";

// // // const reportEntities = ["indents", "purchase-orders", "distributions", "transfers", "requests", "consumptions"];

// // // export const ReportsPage = () => {
// // //   const [entity, setEntity] = useState("indents");
// // //   const [rows, setRows] = useState([]);
// // //   const [loading, setLoading] = useState(false);
// // //   const [searchTerm, setSearchTerm] = useState("");
// // //   const [selectedRowId, setSelectedRowId] = useState(null);

// // //   /**
// // //    * LOAD DATA: 
// // //    * Fetches all data for the selected entity (Date filter removed).
// // //    */
// // //   const load = useCallback(async () => {
// // //     setLoading(true);
// // //     try {
// // //       // API call now requests all records for the entity
// // //       const res = await api.get(`/reports/${entity}`);
      
// // //       const data = res.data || [];
// // //       setRows(data);
      
// // //       // Auto-select the first record of the new results
// // //       if (data.length > 0) {
// // //         setSelectedRowId(data[0]._id);
// // //       } else {
// // //         setSelectedRowId(null);
// // //       }
// // //     } catch (error) {
// // //       console.error("Failed to load report data:", error);
// // //       setRows([]);
// // //       setSelectedRowId(null);
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   }, [entity]);

// // //   useEffect(() => {
// // //     load();
// // //   }, [load]);

// // //   const filteredRows = useMemo(() => {
// // //     return rows.filter(row => 
// // //       Object.values(row).some(val => 
// // //         String(val).toLowerCase().includes(searchTerm.toLowerCase())
// // //       )
// // //     );
// // //   }, [rows, searchTerm]);

// // //   const activeRow = useMemo(() => 
// // //     rows.find(r => r._id === selectedRowId), 
// // //   [selectedRowId, rows]);

// // //   const resolveStatus = (row) => {
// // //     if (row.status) return row.status.toUpperCase();
// // //     if (["distributions", "transfers", "consumptions"].includes(entity)) return "COMPLETED";
// // //     return "N/A";
// // //   };

// // //   const exportAllExcel = async () => {
// // //     try {
// // //       const response = await api.get(`/reports/${entity}/export/excel`, {
// // //         responseType: 'arraybuffer',
// // //         headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
// // //       });
      
// // //       const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
// // //       const url = window.URL.createObjectURL(blob);
// // //       const link = document.createElement('a');
// // //       link.href = url;
// // //       link.setAttribute('download', `all-${entity}-report.xlsx`);
// // //       document.body.appendChild(link);
// // //       link.click();
// // //       document.body.removeChild(link);
// // //       window.URL.revokeObjectURL(url);
// // //     } catch (error) {
// // //       console.error("Bulk Export Error:", error);
// // //       alert("Export failed.");
// // //     }
// // //   };

// // //   const exportSingleExcel = async (id) => {
// // //     try {
// // //       const response = await api.get(`/reports/${entity}/export/excel/${id}`, {
// // //         responseType: 'arraybuffer',
// // //         headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
// // //       });
// // //       const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
// // //       const url = window.URL.createObjectURL(blob);
// // //       const link = document.createElement('a');
// // //       link.href = url;
// // //       link.setAttribute('download', `${entity}-${id}.xlsx`);
// // //       document.body.appendChild(link);
// // //       link.click();
// // //       document.body.removeChild(link);
// // //       window.URL.revokeObjectURL(url);
// // //     } catch (error) {
// // //       console.error("Single Export Error:", error);
// // //       alert("Download failed.");
// // //     }
// // //   };

// // //   const getVisibleKeys = (item) => {
// // //     if (!item) return [];
// // //     return Object.keys(item).filter(key => 
// // //       !["_id", "__v", "items", "allocations", "leftovers", "updatedAt", "userId", "createdBy", 
// // //         "indentId", "purchaseOrderId", "leftoverSourceId", "fromGodownId", "toGodownId", "godownId", "status", "createdAt"].includes(key)
// // //     );
// // //   };

// // //   return (
// // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // //       {/* Top Navigation */}
// // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
// // //             Data <span style={{ color: '#6366f1' }}>Analytics</span>
// // //           </h1>
          
// // //           <select 
// // //             value={entity} 
// // //             onChange={(e) => { 
// // //                 setEntity(e.target.value); 
// // //                 setRows([]); 
// // //                 setSelectedRowId(null); 
// // //             }}
// // //             style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', fontWeight: '700', cursor: 'pointer', outline: 'none', color: '#475569' }}
// // //           >
// // //             {reportEntities.map((r) => <option key={r} value={r}>{r.replace("-", " ").toUpperCase()}</option>)}
// // //           </select>
// // //         </div>

// // //         <div style={{ display: 'flex', gap: '12px' }}>
// // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // //             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // //             <input
// // //               type="text"
// // //               placeholder="Search records..."
// // //               value={searchTerm}
// // //               onChange={(e) => setSearchTerm(e.target.value)}
// // //               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '220px', outline: 'none' }}
// // //             />
// // //           </div>
// // //           <button onClick={exportAllExcel} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// // //             <Download size={14}/> EXPORT ALL
// // //           </button>
// // //         </div>
// // //       </div>

// // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // //         {/* Sidebar */}
// // //         <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // //           <div style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '1px' }}>
// // //             {entity.replace("-", " ").toUpperCase()} RECORDS ({filteredRows.length})
// // //           </div>
// // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
// // //             {loading ? (
// // //               <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Fetching records...</div>
// // //             ) : filteredRows.length > 0 ? filteredRows.map(row => (
// // //               <div
// // //                 key={row._id}
// // //                 onClick={() => setSelectedRowId(row._id)}
// // //                 style={{
// // //                   padding: '16px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
// // //                   background: selectedRowId === row._id ? '#fff' : 'rgba(255,255,255,0.4)',
// // //                   border: selectedRowId === row._id ? '1px solid #6366f1' : '1px solid transparent',
// // //                   boxShadow: selectedRowId === row._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// // //                 }}
// // //               >
// // //                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
// // //                   <div style={{ fontWeight: '800', fontSize: '13px', color: selectedRowId === row._id ? '#6366f1' : '#1e293b' }}>
// // //                     {row.indentNo || row.orderNo || row.transferNo || row.requestNo || row.distributionNo || row.consumptionNo || row._id.slice(-8).toUpperCase()}
// // //                   </div>
// // //                   <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8' }}>
// // //                     {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}
// // //                   </div>
// // //                 </div>
// // //                 <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
// // //                   Status: <span style={{ color: selectedRowId === row._id ? '#6366f1' : '#0f172a' }}>{resolveStatus(row)}</span>
// // //                 </div>
// // //               </div>
// // //             )) : (
// // //               <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', background: 'rgba(255,255,255,0.3)', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
// // //                 No records found.
// // //               </div>
// // //             )}
// // //           </div>
// // //         </div>

// // //         {/* Detail View */}
// // //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
// // //           {activeRow ? (
// // //             <>
// // //               <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
// // //                 <div>
// // //                   <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '4px' }}>DOCUMENT ID</div>
// // //                   <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
// // //                     {activeRow.indentNo || activeRow.orderNo || activeRow.transferNo || activeRow.requestNo || activeRow.distributionNo || activeRow.consumptionNo || activeRow._id}
// // //                   </div>
// // //                 </div>
// // //                 <button 
// // //                   onClick={() => exportSingleExcel(activeRow._id)}
// // //                   style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '12px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
// // //                 >
// // //                   <Download size={16}/> DOWNLOAD XLSX
// // //                 </button>
// // //               </div>

// // //               <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
// // //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px', marginBottom: '48px' }}>
// // //                   <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>DATE CREATED</div>
// // //                     <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// // //                         {activeRow.createdAt ? new Date(activeRow.createdAt).toLocaleString('en-GB') : 'N/A'}
// // //                     </div>
// // //                   </div>

// // //                   <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>STATUS</div>
// // //                     <div style={{ fontWeight: '700', color: '#6366f1', fontSize: '14px' }}>{resolveStatus(activeRow)}</div>
// // //                   </div>

// // //                   {getVisibleKeys(activeRow).map(key => (
// // //                     <div key={key} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// // //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{key.replace(/([A-Z])/g, ' $1')}</div>
// // //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// // //                         {key === 'totalAmount' ? `₹${activeRow[key]?.toLocaleString()}` : String(activeRow[key])}
// // //                       </div>
// // //                     </div>
// // //                   ))}
// // //                 </div>

// // //                 {/* Items Table */}
// // //                 {(activeRow.items || activeRow.allocations) && (
// // //                   <div>
// // //                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
// // //                         <TableIcon size={16} color="#6366f1" />
// // //                         <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>ITEMIZED BREAKDOWN</span>
// // //                     </div>
// // //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // //                       <thead>
// // //                         <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>ITEM</th>
// // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'center' }}>QUANTITY</th>
// // //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>AMOUNT</th>
// // //                         </tr>
// // //                       </thead>
// // //                       <tbody>
// // //                         {(activeRow.items || activeRow.allocations || []).map((item, idx) => {
// // //                           const quantity = item.quantity || item.qtyBaseUnit || item.receivedQty || item.orderedQty || 0;
// // //                           const unitSymbol = item.stockItemId?.unitId?.symbol || item.unitId?.symbol || item.unit || (["distributions", "consumptions"].includes(entity) ? "Kg" : "");
                          
// // //                           return (
// // //                             <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
// // //                               <td style={{ padding: '16px 0', fontWeight: '700', color: '#334155', fontSize: '13px' }}>{item.stockItemId?.name || item.itemName || "Unknown Item"}</td>
// // //                               <td style={{ padding: '16px 0', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
// // //                                 {quantity} <span style={{ fontSize: '10px', color: '#94a3b8' }}>{unitSymbol}</span>
// // //                               </td>
// // //                               <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>
// // //                                 {item.amount || item.unitPrice ? `₹${(item.amount || (quantity * (item.unitPrice || 0))).toLocaleString()}` : "—"}
// // //                               </td>
// // //                             </tr>
// // //                           );
// // //                         })}
// // //                       </tbody>
// // //                     </table>
// // //                   </div>
// // //                 )}
// // //               </div>
// // //             </>
// // //           ) : (
// // //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
// // //               <Filter size={48} color="#e2e8f0" />
// // //               <div style={{ color: '#94a3b8', fontWeight: '600' }}>Select a record to view analytics</div>
// // //             </div>
// // //           )}
// // //         </div>
// // //       </div>
// // //     </div>
// // //   );
// // // };







// // import { useState, useEffect, useCallback, useMemo } from "react";
// // import { api } from "../api.js";
// // import { Search, Download, Table as TableIcon, Filter } from "lucide-react";

// // const reportEntities = ["indents", "purchase-orders", "distributions", "transfers", "requests", "consumptions"];

// // export const ReportsPage = () => {
// //   const [entity, setEntity] = useState("indents");
// //   const [rows, setRows] = useState([]);
// //   const [loading, setLoading] = useState(false);
// //   const [searchTerm, setSearchTerm] = useState("");
// //   const [selectedRowId, setSelectedRowId] = useState(null);

// //   /**
// //    * LOAD DATA: 
// //    * Fetches all data for the selected entity.
// //    */
// //   const load = useCallback(async () => {
// //     setLoading(true);
// //     try {
// //       const res = await api.get(`/reports/${entity}`);
// //       const data = res.data || [];
// //       setRows(data);
      
// //       if (data.length > 0) {
// //         setSelectedRowId(data[0]._id);
// //       } else {
// //         setSelectedRowId(null);
// //       }
// //     } catch (error) {
// //       console.error("Failed to load report data:", error);
// //       setRows([]);
// //       setSelectedRowId(null);
// //     } finally {
// //       setLoading(false);
// //     }
// //   }, [entity]);

// //   useEffect(() => {
// //     load();
// //   }, [load]);

// //   const filteredRows = useMemo(() => {
// //     return rows.filter(row => 
// //       Object.values(row).some(val => 
// //         String(val).toLowerCase().includes(searchTerm.toLowerCase())
// //       )
// //     );
// //   }, [rows, searchTerm]);

// //   const activeRow = useMemo(() => 
// //     rows.find(r => r._id === selectedRowId), 
// //   [selectedRowId, rows]);

// //   const resolveStatus = (row) => {
// //     if (row.status) return row.status.toUpperCase();
// //     if (["distributions", "transfers", "consumptions"].includes(entity)) return "COMPLETED";
// //     return "N/A";
// //   };

// //   const exportAllExcel = async () => {
// //     try {
// //       const response = await api.get(`/reports/${entity}/export/excel`, {
// //         responseType: 'arraybuffer',
// //         headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
// //       });
// //       const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
// //       const url = window.URL.createObjectURL(blob);
// //       const link = document.createElement('a');
// //       link.href = url;
// //       link.setAttribute('download', `all-${entity}-report.xlsx`);
// //       document.body.appendChild(link);
// //       link.click();
// //       document.body.removeChild(link);
// //       window.URL.revokeObjectURL(url);
// //     } catch (error) {
// //       console.error("Bulk Export Error:", error);
// //       alert("Export failed.");
// //     }
// //   };

// //   const exportSingleExcel = async (id) => {
// //     try {
// //       const response = await api.get(`/reports/${entity}/export/excel/${id}`, {
// //         responseType: 'arraybuffer',
// //         headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
// //       });
// //       const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
// //       const url = window.URL.createObjectURL(blob);
// //       const link = document.createElement('a');
// //       link.href = url;
// //       link.setAttribute('download', `${entity}-${id}.xlsx`);
// //       document.body.appendChild(link);
// //       link.click();
// //       document.body.removeChild(link);
// //       window.URL.revokeObjectURL(url);
// //     } catch (error) {
// //       console.error("Single Export Error:", error);
// //       alert("Download failed.");
// //     }
// //   };

// //   const getVisibleKeys = (item) => {
// //     if (!item) return [];
// //     return Object.keys(item).filter(key => 
// //       !["_id", "__v", "items", "allocations", "leftovers", "updatedAt", "userId", "createdBy", 
// //         "indentId", "purchaseOrderId", "leftoverSourceId", "fromGodownId", "toGodownId", "godownId", "status", "createdAt"].includes(key)
// //     );
// //   };

// //   return (
// //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// //       {/* Top Navigation */}
// //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// //         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
// //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
// //             Data <span style={{ color: '#6366f1' }}>Analytics</span>
// //           </h1>
          
// //           <select 
// //             value={entity} 
// //             onChange={(e) => { 
// //                 setEntity(e.target.value); 
// //                 setRows([]); 
// //                 setSelectedRowId(null); 
// //             }}
// //             style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', fontWeight: '700', cursor: 'pointer', outline: 'none', color: '#475569' }}
// //           >
// //             {reportEntities.map((r) => <option key={r} value={r}>{r.replace("-", " ").toUpperCase()}</option>)}
// //           </select>
// //         </div>

// //         <div style={{ display: 'flex', gap: '12px' }}>
// //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// //             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// //             <input
// //               type="text"
// //               placeholder="Search records..."
// //               value={searchTerm}
// //               onChange={(e) => setSearchTerm(e.target.value)}
// //               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '220px', outline: 'none' }}
// //             />
// //           </div>
// //           <button onClick={exportAllExcel} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
// //             <Download size={14}/> EXPORT ALL
// //           </button>
// //         </div>
// //       </div>

// //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// //         {/* Sidebar */}
// //         <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// //           <div style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '1px' }}>
// //             {entity.replace("-", " ").toUpperCase()} RECORDS ({filteredRows.length})
// //           </div>
// //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
// //             {loading ? (
// //               <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Fetching records...</div>
// //             ) : filteredRows.length > 0 ? filteredRows.map(row => (
// //               <div
// //                 key={row._id}
// //                 onClick={() => setSelectedRowId(row._id)}
// //                 style={{
// //                   padding: '16px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
// //                   background: selectedRowId === row._id ? '#fff' : 'rgba(255,255,255,0.4)',
// //                   border: selectedRowId === row._id ? '1px solid #6366f1' : '1px solid transparent',
// //                   boxShadow: selectedRowId === row._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// //                 }}
// //               >
// //                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
// //                   <div style={{ fontWeight: '800', fontSize: '13px', color: selectedRowId === row._id ? '#6366f1' : '#1e293b' }}>
// //                     {row.indentNo || row.orderNo || row.transferNo || row.requestNo || row.distributionNo || row.consumptionNo || row._id.slice(-8).toUpperCase()}
// //                   </div>
// //                   <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8' }}>
// //                     {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}
// //                   </div>
// //                 </div>
// //                 <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
// //                   Status: <span style={{ color: selectedRowId === row._id ? '#6366f1' : '#0f172a' }}>{resolveStatus(row)}</span>
// //                 </div>
// //               </div>
// //             )) : (
// //               <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', background: 'rgba(255,255,255,0.3)', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
// //                 No records found.
// //               </div>
// //             )}
// //           </div>
// //         </div>

// //         {/* Detail View */}
// //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
// //           {activeRow ? (
// //             <>
// //               <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
// //                 <div>
// //                   <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '4px' }}>DOCUMENT ID</div>
// //                   <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
// //                     {activeRow.indentNo || activeRow.orderNo || activeRow.transferNo || activeRow.requestNo || activeRow.distributionNo || activeRow.consumptionNo || activeRow._id}
// //                   </div>
// //                 </div>
// //                 <button 
// //                   onClick={() => exportSingleExcel(activeRow._id)}
// //                   style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '12px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
// //                 >
// //                   <Download size={16}/> DOWNLOAD XLSX
// //                 </button>
// //               </div>

// //               <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
// //                 {/* Meta Grid */}
// //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px', marginBottom: '48px' }}>
// //                   <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>DATE CREATED</div>
// //                     <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// //                         {activeRow.createdAt ? new Date(activeRow.createdAt).toLocaleString('en-GB') : 'N/A'}
// //                     </div>
// //                   </div>

// //                   <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>STATUS</div>
// //                     <div style={{ fontWeight: '700', color: '#6366f1', fontSize: '14px' }}>{resolveStatus(activeRow)}</div>
// //                   </div>

// //                   {getVisibleKeys(activeRow).map(key => (
// //                     <div key={key} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
// //                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{key.replace(/([A-Z])/g, ' $1')}</div>
// //                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
// //                         {key === 'totalAmount' ? `₹${activeRow[key]?.toLocaleString()}` : String(activeRow[key])}
// //                       </div>
// //                     </div>
// //                   ))}
// //                 </div>

// //                 {/* Items Table with Group Column Integration */}
// //                 {(activeRow.items || activeRow.allocations) && (
// //                   <div>
// //                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
// //                       <TableIcon size={16} color="#6366f1" />
// //                       <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>ITEMIZED BREAKDOWN</span>
// //                     </div>
// //                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// //                       <thead>
// //                         <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
// //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>ITEM</th>
// //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>GROUP</th>
// //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'center' }}>QUANTITY</th>
// //                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>AMOUNT</th>
// //                         </tr>
// //                       </thead>
// //                       <tbody>
// //                         {(activeRow.items || activeRow.allocations || []).map((item, idx) => {
// //                           const quantity = item.quantity || item.qtyBaseUnit || item.receivedQty || item.orderedQty || 0;
// //                           const unitSymbol = item.stockItemId?.unitId?.symbol || item.unitId?.symbol || item.unit || (["distributions", "consumptions"].includes(entity) ? "Kg" : "");
                          
// //                           // Logic to extract Stock Group Name from populated backend data
// //                           const groupName = item.stockItemId?.stockGroupId?.name || item.groupName || "General";

// //                           return (
// //                             <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
// //                               <td style={{ padding: '16px 0', fontWeight: '700', color: '#334155', fontSize: '13px' }}>
// //                                 {item.stockItemId?.name || item.itemName || "Unknown Item"}
// //                               </td>
// //                               <td style={{ padding: '16px 0', fontSize: '11px', fontWeight: '600', color: '#64748b' }}>
// //                                 <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
// //                                   {groupName}
// //                                 </span>
// //                               </td>
// //                               <td style={{ padding: '16px 0', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
// //                                 {quantity} <span style={{ fontSize: '10px', color: '#94a3b8' }}>{unitSymbol}</span>
// //                               </td>
// //                               <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>
// //                                 {item.amount || item.unitPrice ? `₹${(item.amount || (quantity * (item.unitPrice || 0))).toLocaleString()}` : "—"}
// //                               </td>
// //                             </tr>
// //                           );
// //                         })}
// //                       </tbody>
// //                     </table>
// //                   </div>
// //                 )}
// //               </div>
// //             </>
// //           ) : (
// //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
// //               <Filter size={48} color="#e2e8f0" />
// //               <div style={{ color: '#94a3b8', fontWeight: '600' }}>Select a record to view analytics</div>
// //             </div>
// //           )}
// //         </div>
// //       </div>
// //     </div>
// //   );
// // };










// import React, { useState, useEffect, useCallback, useMemo } from "react";
// import { api } from "../api.js";
// import { Search, Download, Table as TableIcon, Filter } from "lucide-react";

// const reportEntities = ["indents", "purchase-orders", "distributions", "transfers", "requests", "consumptions"];

// export const ReportsPage = () => {
//   const [entity, setEntity] = useState("indents");
//   const [rows, setRows] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [selectedRowId, setSelectedRowId] = useState(null);

//   /**
//    * LOAD DATA: 
//    * Fetches data based on the active entity selection.
//    */
//   const load = useCallback(async () => {
//     setLoading(true);
//     try {
//       const res = await api.get(`/reports/${entity}`);
//       const data = res.data || [];
//       setRows(data);
//       if (data.length > 0) {
//         setSelectedRowId(data[0]._id);
//       } else {
//         setSelectedRowId(null);
//       }
//     } catch (error) {
//       console.error("Failed to load report data:", error);
//       setRows([]);
//       setSelectedRowId(null);
//     } finally {
//       setLoading(false);
//     }
//   }, [entity]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   /**
//    * SEARCH LOGIC: 
//    * Filters the sidebar list based on user input across all object values.
//    */
//   const filteredRows = useMemo(() => {
//     return rows.filter(row => 
//       Object.values(row).some(val => 
//         String(val).toLowerCase().includes(searchTerm.toLowerCase())
//       )
//     );
//   }, [rows, searchTerm]);

//   const activeRow = useMemo(() => 
//     rows.find(r => r._id === selectedRowId), 
//   [selectedRowId, rows]);

//   const resolveStatus = (row) => {
//     if (row.status) return row.status.toUpperCase();
//     if (["distributions", "transfers", "consumptions"].includes(entity)) return "COMPLETED";
//     return "N/A";
//   };

//   /**
//    * EXPORT UTILITIES
//    */
//   const exportAllExcel = async () => {
//     try {
//       const response = await api.get(`/reports/${entity}/export/excel`, {
//         responseType: 'arraybuffer',
//         headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
//       });
//       const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
//       const url = window.URL.createObjectURL(blob);
//       const link = document.createElement('a');
//       link.href = url;
//       link.setAttribute('download', `all-${entity}-report.xlsx`);
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//       window.URL.revokeObjectURL(url);
//     } catch (error) {
//       console.error("Bulk Export Error:", error);
//       alert("Export failed.");
//     }
//   };

//   const exportSingleExcel = async (id) => {
//     try {
//       const response = await api.get(`/reports/${entity}/export/excel/${id}`, { 
//         responseType: 'arraybuffer' 
//       });
//       const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
//       const url = window.URL.createObjectURL(blob);
//       const link = document.createElement('a');
//       link.href = url;
//       link.setAttribute('download', `${entity}-${id}.xlsx`);
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//       window.URL.revokeObjectURL(url);
//     } catch (error) {
//       console.error("Single Export Error:", error);
//       alert("Download failed.");
//     }
//   };

//   const getVisibleKeys = (item) => {
//     if (!item) return [];
//     return Object.keys(item).filter(key => 
//       !["_id", "__v", "items", "allocations", "leftovers", "updatedAt", "userId", "createdBy", 
//         "indentId", "purchaseOrderId", "leftoverSourceId", "fromGodownId", "toGodownId", "godownId", "status", "createdAt"].includes(key)
//     );
//   };

//   return (
//     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
//       {/* Top Navigation */}
//       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
//           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
//             Data <span style={{ color: '#6366f1' }}>Analytics</span>
//           </h1>
          
//           <select 
//             value={entity} 
//             onChange={(e) => { 
//                 setEntity(e.target.value); 
//                 setRows([]); 
//                 setSelectedRowId(null); 
//             }}
//             style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', fontWeight: '700', cursor: 'pointer', outline: 'none', color: '#475569' }}
//           >
//             {reportEntities.map((r) => <option key={r} value={r}>{r.replace("-", " ").toUpperCase()}</option>)}
//           </select>
//         </div>

//         <div style={{ display: 'flex', gap: '12px' }}>
//           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
//             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
//             <input
//               type="text"
//               placeholder="Search records..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '220px', outline: 'none' }}
//             />
//           </div>
//           <button onClick={exportAllExcel} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
//             <Download size={14}/> EXPORT ALL
//           </button>
//         </div>
//       </div>

//       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
//         {/* Sidebar */}
//         <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
//           <div style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '1px' }}>
//             {entity.replace("-", " ").toUpperCase()} RECORDS ({filteredRows.length})
//           </div>
//           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
//             {loading ? (
//               <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Fetching records...</div>
//             ) : filteredRows.length > 0 ? filteredRows.map(row => (
//               <div
//                 key={row._id}
//                 onClick={() => setSelectedRowId(row._id)}
//                 style={{
//                   padding: '16px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
//                   background: selectedRowId === row._id ? '#fff' : 'rgba(255,255,255,0.4)',
//                   border: selectedRowId === row._id ? '1px solid #6366f1' : '1px solid transparent',
//                   boxShadow: selectedRowId === row._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
//                 }}
//               >
//                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
//                   <div style={{ fontWeight: '800', fontSize: '13px', color: selectedRowId === row._id ? '#6366f1' : '#1e293b' }}>
//                     {row.indentNo || row.orderNo || row.transferNo || row.requestNo || row.distributionNo || row.consumptionNo || row._id.slice(-8).toUpperCase()}
//                   </div>
//                   <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8' }}>
//                     {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}
//                   </div>
//                 </div>
//                 <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
//                   Status: <span style={{ color: selectedRowId === row._id ? '#6366f1' : '#0f172a' }}>{resolveStatus(row)}</span>
//                 </div>
//               </div>
//             )) : (
//               <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', background: 'rgba(255,255,255,0.3)', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
//                 No records found.
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Detail View */}
//         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
//           {activeRow ? (
//             <>
//               <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
//                 <div>
//                   <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '4px' }}>DOCUMENT ID</div>
//                   <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
//                     {activeRow.indentNo || activeRow.orderNo || activeRow.transferNo || activeRow.requestNo || activeRow.distributionNo || activeRow.consumptionNo || activeRow._id}
//                   </div>
//                 </div>
//                 <button 
//                   onClick={() => exportSingleExcel(activeRow._id)}
//                   style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '12px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
//                 >
//                   <Download size={16}/> DOWNLOAD XLSX
//                 </button>
//               </div>

//               <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
//                 {/* Meta Grid */}
//                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px', marginBottom: '48px' }}>
//                   <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
//                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>DATE CREATED</div>
//                     <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
//                         {activeRow.createdAt ? new Date(activeRow.createdAt).toLocaleString('en-GB') : 'N/A'}
//                     </div>
//                   </div>

//                   <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
//                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>STATUS</div>
//                     <div style={{ fontWeight: '700', color: '#6366f1', fontSize: '14px' }}>{resolveStatus(activeRow)}</div>
//                   </div>

//                   {getVisibleKeys(activeRow).map(key => (
//                     <div key={key} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
//                       <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{key.replace(/([A-Z])/g, ' $1')}</div>
//                       <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
//                         {key.toLowerCase().includes('amount') ? `₹${activeRow[key]?.toLocaleString()}` : String(activeRow[key])}
//                       </div>
//                     </div>
//                   ))}
//                 </div>

//                 {/* Items Table */}
//                 {(activeRow.items || activeRow.allocations) && (
//                   <div>
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
//                       <TableIcon size={16} color="#6366f1" />
//                       <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>ITEMIZED BREAKDOWN</span>
//                     </div>
//                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//                       <thead>
//                         <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
//                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>ITEM</th>
//                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>GROUP</th>
//                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'center' }}>QUANTITY</th>
//                           <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>AMOUNT</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {(activeRow.items || activeRow.allocations || []).map((item, idx) => {
//                           const quantity = item.quantity || item.qtyBaseUnit || item.receivedQty || item.orderedQty || 0;
//                           const groupName = item.stockItemId?.stockGroupId?.name || item.stockItemId?.groupName || item.groupName || "General";
//                           const unitSymbol = item.stockItemId?.unitId?.symbol || item.unitId?.symbol || item.unit || "";

//                           return (
//                             <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
//                               <td style={{ padding: '16px 0', fontWeight: '700', color: '#334155', fontSize: '13px' }}>
//                                 {item.stockItemId?.name || item.itemName || "Unknown Item"}
//                               </td>
//                               <td style={{ padding: '16px 0', fontSize: '11px', fontWeight: '600', color: '#64748b' }}>
//                                 <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
//                                   {groupName}
//                                 </span>
//                               </td>
//                               <td style={{ padding: '16px 0', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
//                                 {quantity} <span style={{ fontSize: '10px', color: '#94a3b8' }}>{unitSymbol}</span>
//                               </td>
//                               <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>
//                                 {item.amount || item.unitPrice ? `₹${(item.amount || (quantity * (item.unitPrice || 0))).toLocaleString()}` : "—"}
//                               </td>
//                             </tr>
//                           );
//                         })}
//                       </tbody>
//                     </table>
//                   </div>
//                 )}
//               </div>
//             </>
//           ) : (
//             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
//               <Filter size={48} color="#e2e8f0" />
//               <div style={{ color: '#94a3b8', fontWeight: '600' }}>Select a record to view analytics</div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };





// the above is final



import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../api.js";
import { Search, Download, Table as TableIcon, Filter, X } from "lucide-react";

const reportEntities = ["indents", "purchase-orders", "distributions", "transfers", "requests", "consumptions"];

export const ReportsPage = () => {
  const [entity, setEntity] = useState("indents");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowId, setSelectedRowId] = useState(null);
  
  // Date Filter States
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  /**
   * LOAD DATA: 
   * Fetches data based on the active entity selection and date range.
   */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/${entity}`, {
        params: { startDate, endDate }
      });
      const data = res.data || [];
      setRows(data);
      setSelectedRowId(data.length > 0 ? data[0]._id : null);
    } catch (error) {
      console.error("Failed to load report data:", error);
      setRows([]);
      setSelectedRowId(null);
    } finally {
      setLoading(false);
    }
  }, [entity, startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * SEARCH LOGIC: 
   * Filters the sidebar list based on user input across all object values.
   */
  const filteredRows = useMemo(() => {
    return rows.filter(row => 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [rows, searchTerm]);

  const activeRow = useMemo(() => 
    rows.find(r => r._id === selectedRowId), 
  [selectedRowId, rows]);

  const resolveStatus = (row) => {
    if (row.status) return row.status.toUpperCase();
    if (["distributions", "transfers", "consumptions"].includes(entity)) return "COMPLETED";
    return "N/A";
  };

  /**
   * EXPORT UTILITIES
   */
  const exportAllExcel = async () => {
    try {
      const response = await api.get(`/reports/${entity}/export/excel`, {
        params: { startDate, endDate },
        responseType: 'arraybuffer',
        headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `all-${entity}-${startDate || 'start'}-to-${endDate || 'end'}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Bulk Export Error:", error);
      alert("Export failed.");
    }
  };

  const exportSingleExcel = async (id) => {
    try {
      const response = await api.get(`/reports/${entity}/export/excel/${id}`, { 
        responseType: 'arraybuffer' 
      });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${entity}-${id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Single Export Error:", error);
      alert("Download failed.");
    }
  };

  const getVisibleKeys = (item) => {
    if (!item) return [];
    return Object.keys(item).filter(key => 
      !["_id", "__v", "items", "allocations", "leftovers", "updatedAt", "userId", "createdBy", 
        "indentId", "purchaseOrderId", "leftoverSourceId", "fromGodownId", "toGodownId", "godownId", "status", "createdAt"].includes(key)
    );
  };

  return (
    <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Top Navigation */}
      <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
            Data <span style={{ color: '#6366f1' }}>Analytics</span>
          </h1>
          
          <select 
            value={entity} 
            onChange={(e) => { 
                setEntity(e.target.value); 
                setRows([]); 
                setSelectedRowId(null); 
            }}
            style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', fontWeight: '700', cursor: 'pointer', outline: 'none', color: '#475569' }}
          >
            {reportEntities.map((r) => <option key={r} value={r}>{r.replace("-", " ").toUpperCase()}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Date Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '4px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8' }}>FROM</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: '12px', outline: 'none', color: '#475569' }}
            />
            <span style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8' }}>TO</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: '12px', outline: 'none', color: '#475569' }}
            />
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(""); setEndDate(""); }}
                style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Clear Dates"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '200px', outline: 'none' }}
            />
          </div>
          
          <button onClick={exportAllExcel} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={14}/> EXPORT ALL
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
        {/* Sidebar */}
        <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '1px' }}>
            {entity.replace("-", " ").toUpperCase()} RECORDS ({filteredRows.length})
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Fetching records...</div>
            ) : filteredRows.length > 0 ? filteredRows.map(row => (
              <div
                key={row._id}
                onClick={() => setSelectedRowId(row._id)}
                style={{
                  padding: '16px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
                  background: selectedRowId === row._id ? '#fff' : 'rgba(255,255,255,0.4)',
                  border: selectedRowId === row._id ? '1px solid #6366f1' : '1px solid transparent',
                  boxShadow: selectedRowId === row._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: selectedRowId === row._id ? '#6366f1' : '#1e293b' }}>
                    {row.indentNo || row.orderNo || row.transferNo || row.requestNo || row.distributionNo || row.consumptionNo || row._id.slice(-8).toUpperCase()}
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8' }}>
                    {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                  Status: <span style={{ color: selectedRowId === row._id ? '#6366f1' : '#0f172a' }}>{resolveStatus(row)}</span>
                </div>
              </div>
            )) : (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', background: 'rgba(255,255,255,0.3)', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                No records found.
              </div>
            )}
          </div>
        </div>

        {/* Detail View */}
        <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          {activeRow ? (
            <>
              <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '4px' }}>DOCUMENT ID</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
                    {activeRow.indentNo || activeRow.orderNo || activeRow.transferNo || activeRow.requestNo || activeRow.distributionNo || activeRow.consumptionNo || activeRow._id}
                  </div>
                </div>
                <button 
                  onClick={() => exportSingleExcel(activeRow._id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '12px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
                >
                  <Download size={16}/> DOWNLOAD XLSX
                </button>
              </div>

              <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                {/* Meta Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px', marginBottom: '48px' }}>
                  <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>DATE CREATED</div>
                    <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
                        {activeRow.createdAt ? new Date(activeRow.createdAt).toLocaleString('en-GB') : 'N/A'}
                    </div>
                  </div>

                  <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>STATUS</div>
                    <div style={{ fontWeight: '700', color: '#6366f1', fontSize: '14px' }}>{resolveStatus(activeRow)}</div>
                  </div>

                  {getVisibleKeys(activeRow).map(key => (
                    <div key={key} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                      <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{key.replace(/([A-Z])/g, ' $1')}</div>
                      <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
                        {key.toLowerCase().includes('amount') ? `₹${activeRow[key]?.toLocaleString()}` : String(activeRow[key])}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Items Table */}
                {(activeRow.items || activeRow.allocations) && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                      <TableIcon size={16} color="#6366f1" />
                      <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>ITEMIZED BREAKDOWN</span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
                          <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>ITEM</th>
                          <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8' }}>GROUP</th>
                          <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'center' }}>QUANTITY</th>
                          <th style={{ padding: '12px 0', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textAlign: 'right' }}>AMOUNT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activeRow.items || activeRow.allocations || []).map((item, idx) => {
                          const quantity = item.quantity || item.qtyBaseUnit || item.receivedQty || item.orderedQty || 0;
                          const groupName = item.stockItemId?.stockGroupId?.name || item.stockItemId?.groupName || item.groupName || "General";
                          const unitSymbol = item.stockItemId?.unitId?.symbol || item.unitId?.symbol || item.unit || "";

                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                              <td style={{ padding: '16px 0', fontWeight: '700', color: '#334155', fontSize: '13px' }}>
                                {item.stockItemId?.name || item.itemName || "Unknown Item"}
                              </td>
                              <td style={{ padding: '16px 0', fontSize: '11px', fontWeight: '600', color: '#64748b' }}>
                                <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                                  {groupName}
                                </span>
                              </td>
                              <td style={{ padding: '16px 0', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
                                {quantity} <span style={{ fontSize: '10px', color: '#94a3b8' }}>{unitSymbol}</span>
                              </td>
                              <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>
                                {item.amount || item.unitPrice ? `₹${(item.amount || (quantity * (item.unitPrice || 0))).toLocaleString()}` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
              <Filter size={48} color="#e2e8f0" />
              <div style={{ color: '#94a3b8', fontWeight: '600' }}>Select a record to view analytics</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};