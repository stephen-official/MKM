// // // // // // // // // // // // // // // // // // // // // // import { useEffect, useState } from "react";
// // // // // // // // // // // // // // // // // // // // // // import { api } from "../api.js";

// // // // // // // // // // // // // // // // // // // // // // export const ConsumptionPage = () => {
// // // // // // // // // // // // // // // // // // // // // //   const [rows, setRows] = useState([]);

// // // // // // // // // // // // // // // // // // // // // //   useEffect(() => {
// // // // // // // // // // // // // // // // // // // // // //     api.get("/consumptions").then((res) => setRows(res.data));
// // // // // // // // // // // // // // // // // // // // // //   }, []);

// // // // // // // // // // // // // // // // // // // // // //   return (
// // // // // // // // // // // // // // // // // // // // // //     <section>
// // // // // // // // // // // // // // // // // // // // // //       <h1>Consumption</h1>
// // // // // // // // // // // // // // // // // // // // // //       <table className="table">
// // // // // // // // // // // // // // // // // // // // // //         <thead><tr><th>Godown</th><th>User</th><th>Date</th><th>Items</th><th>Created</th></tr></thead>
// // // // // // // // // // // // // // // // // // // // // //         <tbody>
// // // // // // // // // // // // // // // // // // // // // //           {rows.map((r) => (
// // // // // // // // // // // // // // // // // // // // // //             <tr key={r._id}>
// // // // // // // // // // // // // // // // // // // // // //               <td>{r.godownId}</td>
// // // // // // // // // // // // // // // // // // // // // //               <td>{r.userId}</td>
// // // // // // // // // // // // // // // // // // // // // //               <td>{r.date}</td>
// // // // // // // // // // // // // // // // // // // // // //               <td>{(r.items || []).map((i) => `${i.stockItemId}:${i.qtyBaseUnit}`).join(", ")}</td>
// // // // // // // // // // // // // // // // // // // // // //               <td>{new Date(r.createdAt).toLocaleString()}</td>
// // // // // // // // // // // // // // // // // // // // // //             </tr>
// // // // // // // // // // // // // // // // // // // // // //           ))}
// // // // // // // // // // // // // // // // // // // // // //         </tbody>
// // // // // // // // // // // // // // // // // // // // // //       </table>
// // // // // // // // // // // // // // // // // // // // // //     </section>
// // // // // // // // // // // // // // // // // // // // // //   );
// // // // // // // // // // // // // // // // // // // // // // };






// // // // // // // // // // // // // // // // // // // // // import { useEffect, useState, useMemo } from "react";
// // // // // // // // // // // // // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // // // // // // // // // // // // import DatePicker from "react-datepicker";
// // // // // // // // // // // // // // // // // // // // // import "react-datepicker/dist/react-datepicker.css";

// // // // // // // // // // // // // // // // // // // // // export const ConsumptionPage = () => {
// // // // // // // // // // // // // // // // // // // // //   const [rows, setRows] = useState([]);
// // // // // // // // // // // // // // // // // // // // //   const [filterDate, setFilterDate] = useState(new Date()); // Default to Today
// // // // // // // // // // // // // // // // // // // // //   const [loading, setLoading] = useState(true);

// // // // // // // // // // // // // // // // // // // // //   useEffect(() => {
// // // // // // // // // // // // // // // // // // // // //     fetchConsumptions();
// // // // // // // // // // // // // // // // // // // // //   }, []);

// // // // // // // // // // // // // // // // // // // // //   const fetchConsumptions = async () => {
// // // // // // // // // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // // // // // // // // //       const res = await api.get("/consumptions");
// // // // // // // // // // // // // // // // // // // // //       setRows(res.data);
// // // // // // // // // // // // // // // // // // // // //     } catch (err) {
// // // // // // // // // // // // // // // // // // // // //       console.error("Failed to fetch consumption history");
// // // // // // // // // // // // // // // // // // // // //     } finally {
// // // // // // // // // // // // // // // // // // // // //       setLoading(false);
// // // // // // // // // // // // // // // // // // // // //     }
// // // // // // // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // // // // // // //   // Filter logic for "Today" or specific selected date
// // // // // // // // // // // // // // // // // // // // //   const filteredRows = useMemo(() => {
// // // // // // // // // // // // // // // // // // // // //     if (!filterDate) return rows;
// // // // // // // // // // // // // // // // // // // // //     const selectedStr = filterDate.toISOString().split('T')[0];
// // // // // // // // // // // // // // // // // // // // //     return rows.filter(r => 
// // // // // // // // // // // // // // // // // // // // //       new Date(r.createdAt).toISOString().split('T')[0] === selectedStr
// // // // // // // // // // // // // // // // // // // // //     );
// // // // // // // // // // // // // // // // // // // // //   }, [rows, filterDate]);

// // // // // // // // // // // // // // // // // // // // //   return (
// // // // // // // // // // // // // // // // // // // // //     <section className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
// // // // // // // // // // // // // // // // // // // // //       <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        
// // // // // // // // // // // // // // // // // // // // //         {/* Header Section */}
// // // // // // // // // // // // // // // // // // // // //         <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
// // // // // // // // // // // // // // // // // // // // //           <div>
// // // // // // // // // // // // // // // // // // // // //             <h1 className="text-2xl font-black uppercase italic text-slate-800">
// // // // // // // // // // // // // // // // // // // // //               Admin <span className="text-green-600">Consumption</span>
// // // // // // // // // // // // // // // // // // // // //             </h1>
// // // // // // // // // // // // // // // // // // // // //             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
// // // // // // // // // // // // // // // // // // // // //               Live Godown Order History
// // // // // // // // // // // // // // // // // // // // //             </p>
// // // // // // // // // // // // // // // // // // // // //           </div>

// // // // // // // // // // // // // // // // // // // // //           <div className="flex items-center gap-3">
// // // // // // // // // // // // // // // // // // // // //             <span className="text-[10px] font-black uppercase text-gray-500">Filter Date:</span>
// // // // // // // // // // // // // // // // // // // // //             <DatePicker
// // // // // // // // // // // // // // // // // // // // //               selected={filterDate}
// // // // // // // // // // // // // // // // // // // // //               onChange={(date) => setFilterDate(date)}
// // // // // // // // // // // // // // // // // // // // //               className="bg-gray-100 border-none rounded-lg px-4 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-2 ring-green-500"
// // // // // // // // // // // // // // // // // // // // //               dateFormat="yyyy-MM-dd"
// // // // // // // // // // // // // // // // // // // // //             />
// // // // // // // // // // // // // // // // // // // // //             <button 
// // // // // // // // // // // // // // // // // // // // //               onClick={() => setFilterDate(null)}
// // // // // // // // // // // // // // // // // // // // //               className="text-[10px] font-black text-red-500 uppercase hover:underline"
// // // // // // // // // // // // // // // // // // // // //             >
// // // // // // // // // // // // // // // // // // // // //               Clear
// // // // // // // // // // // // // // // // // // // // //             </button>
// // // // // // // // // // // // // // // // // // // // //           </div>
// // // // // // // // // // // // // // // // // // // // //         </div>

// // // // // // // // // // // // // // // // // // // // //         {/* Table Section */}
// // // // // // // // // // // // // // // // // // // // //         <div className="overflow-x-auto">
// // // // // // // // // // // // // // // // // // // // //           <table className="w-full text-left border-collapse">
// // // // // // // // // // // // // // // // // // // // //             <thead>
// // // // // // // // // // // // // // // // // // // // //               <tr className="bg-gray-50 border-b border-gray-100">
// // // // // // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500">Time</th>
// // // // // // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500">Godown / Source</th>
// // // // // // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500">User</th>
// // // // // // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500">Stock Items consumed</th>
// // // // // // // // // // // // // // // // // // // // //               </tr>
// // // // // // // // // // // // // // // // // // // // //             </thead>
// // // // // // // // // // // // // // // // // // // // //             <tbody>
// // // // // // // // // // // // // // // // // // // // //               {loading ? (
// // // // // // // // // // // // // // // // // // // // //                 <tr><td colSpan="4" className="p-10 text-center animate-pulse font-bold text-gray-400">Loading Records...</td></tr>
// // // // // // // // // // // // // // // // // // // // //               ) : filteredRows.length === 0 ? (
// // // // // // // // // // // // // // // // // // // // //                 <tr><td colSpan="4" className="p-10 text-center font-bold text-gray-400">No consumption records for this date.</td></tr>
// // // // // // // // // // // // // // // // // // // // //               ) : (
// // // // // // // // // // // // // // // // // // // // //                 filteredRows.map((r) => (
// // // // // // // // // // // // // // // // // // // // //                   <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
// // // // // // // // // // // // // // // // // // // // //                     <td className="p-4">
// // // // // // // // // // // // // // // // // // // // //                       <p className="text-xs font-bold text-gray-800">
// // // // // // // // // // // // // // // // // // // // //                         {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
// // // // // // // // // // // // // // // // // // // // //                       </p>
// // // // // // // // // // // // // // // // // // // // //                       <p className="text-[9px] text-gray-400 font-medium">{new Date(r.createdAt).toLocaleDateString()}</p>
// // // // // // // // // // // // // // // // // // // // //                     </td>
// // // // // // // // // // // // // // // // // // // // //                     <td className="p-4">
// // // // // // // // // // // // // // // // // // // // //                       <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[10px] font-black uppercase">
// // // // // // // // // // // // // // // // // // // // //                         {r.godownId?.name || r.godownId || "Main Godown"}
// // // // // // // // // // // // // // // // // // // // //                       </span>
// // // // // // // // // // // // // // // // // // // // //                     </td>
// // // // // // // // // // // // // // // // // // // // //                     <td className="p-4 text-xs font-bold text-gray-600">
// // // // // // // // // // // // // // // // // // // // //                       {r.userId?.name || "Staff Member"}
// // // // // // // // // // // // // // // // // // // // //                     </td>
// // // // // // // // // // // // // // // // // // // // //                     <td className="p-4">
// // // // // // // // // // // // // // // // // // // // //                       <div className="flex flex-wrap gap-2">
// // // // // // // // // // // // // // // // // // // // //                         {(r.items || []).map((item, idx) => (
// // // // // // // // // // // // // // // // // // // // //                           <div key={idx} className="bg-green-50 border border-green-100 px-2 py-1 rounded flex items-center gap-2">
// // // // // // // // // // // // // // // // // // // // //                             <span className="text-[10px] font-black text-gray-800 uppercase">
// // // // // // // // // // // // // // // // // // // // //                               {item.stockItemId?.name || "Item"}
// // // // // // // // // // // // // // // // // // // // //                             </span>
// // // // // // // // // // // // // // // // // // // // //                             <span className="bg-green-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
// // // // // // // // // // // // // // // // // // // // //                               {item.qtyBaseUnit}
// // // // // // // // // // // // // // // // // // // // //                             </span>
// // // // // // // // // // // // // // // // // // // // //                           </div>
// // // // // // // // // // // // // // // // // // // // //                         ))}
// // // // // // // // // // // // // // // // // // // // //                       </div>
// // // // // // // // // // // // // // // // // // // // //                     </td>
// // // // // // // // // // // // // // // // // // // // //                   </tr>
// // // // // // // // // // // // // // // // // // // // //                 ))
// // // // // // // // // // // // // // // // // // // // //               )}
// // // // // // // // // // // // // // // // // // // // //             </tbody>
// // // // // // // // // // // // // // // // // // // // //           </table>
// // // // // // // // // // // // // // // // // // // // //         </div>
// // // // // // // // // // // // // // // // // // // // //       </div>
// // // // // // // // // // // // // // // // // // // // //     </section>
// // // // // // // // // // // // // // // // // // // // //   );
// // // // // // // // // // // // // // // // // // // // // };








// // // // // // // // // // // // // // // // // // // // import { useEffect, useState, useMemo } from "react";
// // // // // // // // // // // // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // // // // // // // // // // // import DatePicker from "react-datepicker";
// // // // // // // // // // // // // // // // // // // // import "react-datepicker/dist/react-datepicker.css";

// // // // // // // // // // // // // // // // // // // // export const ConsumptionPage = () => {
// // // // // // // // // // // // // // // // // // // //   const [rows, setRows] = useState([]);
// // // // // // // // // // // // // // // // // // // //   const [filterDate, setFilterDate] = useState(new Date()); 
// // // // // // // // // // // // // // // // // // // //   const [loading, setLoading] = useState(true);

// // // // // // // // // // // // // // // // // // // //   useEffect(() => {
// // // // // // // // // // // // // // // // // // // //     fetchConsumptions();
// // // // // // // // // // // // // // // // // // // //   }, []);

// // // // // // // // // // // // // // // // // // // //   const fetchConsumptions = async () => {
// // // // // // // // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // // // // // // // //       const res = await api.get("/consumptions");
// // // // // // // // // // // // // // // // // // // //       setRows(res.data);
// // // // // // // // // // // // // // // // // // // //     } catch (err) {
// // // // // // // // // // // // // // // // // // // //       console.error("Failed to fetch consumption history");
// // // // // // // // // // // // // // // // // // // //     } finally {
// // // // // // // // // // // // // // // // // // // //       setLoading(false);
// // // // // // // // // // // // // // // // // // // //     }
// // // // // // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // // // // // //   const filteredRows = useMemo(() => {
// // // // // // // // // // // // // // // // // // // //     if (!filterDate) return rows;
// // // // // // // // // // // // // // // // // // // //     const selectedStr = filterDate.toISOString().split('T')[0];
// // // // // // // // // // // // // // // // // // // //     return rows.filter(r => 
// // // // // // // // // // // // // // // // // // // //       new Date(r.createdAt).toISOString().split('T')[0] === selectedStr
// // // // // // // // // // // // // // // // // // // //     );
// // // // // // // // // // // // // // // // // // // //   }, [rows, filterDate]);

// // // // // // // // // // // // // // // // // // // //   return (
// // // // // // // // // // // // // // // // // // // //     <section className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
// // // // // // // // // // // // // // // // // // // //       <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        
// // // // // // // // // // // // // // // // // // // //         {/* Header Section */}
// // // // // // // // // // // // // // // // // // // //         <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
// // // // // // // // // // // // // // // // // // // //           <div>
// // // // // // // // // // // // // // // // // // // //             <h1 className="text-2xl font-black uppercase italic text-slate-800">
// // // // // // // // // // // // // // // // // // // //               Admin <span className="text-green-600">Consumption</span>
// // // // // // // // // // // // // // // // // // // //             </h1>
// // // // // // // // // // // // // // // // // // // //             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
// // // // // // // // // // // // // // // // // // // //               Inventory Usage History
// // // // // // // // // // // // // // // // // // // //             </p>
// // // // // // // // // // // // // // // // // // // //           </div>

// // // // // // // // // // // // // // // // // // // //           <div className="flex items-center gap-3">
// // // // // // // // // // // // // // // // // // // //             <span className="text-[10px] font-black uppercase text-gray-500">Filter Date:</span>
// // // // // // // // // // // // // // // // // // // //             <DatePicker
// // // // // // // // // // // // // // // // // // // //               selected={filterDate}
// // // // // // // // // // // // // // // // // // // //               onChange={(date) => setFilterDate(date)}
// // // // // // // // // // // // // // // // // // // //               className="bg-gray-100 border-none rounded-lg px-4 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-2 ring-green-500"
// // // // // // // // // // // // // // // // // // // //               dateFormat="yyyy-MM-dd"
// // // // // // // // // // // // // // // // // // // //             />
// // // // // // // // // // // // // // // // // // // //             <button 
// // // // // // // // // // // // // // // // // // // //               onClick={() => setFilterDate(null)}
// // // // // // // // // // // // // // // // // // // //               className="text-[10px] font-black text-red-500 uppercase hover:underline"
// // // // // // // // // // // // // // // // // // // //             >
// // // // // // // // // // // // // // // // // // // //               Clear
// // // // // // // // // // // // // // // // // // // //             </button>
// // // // // // // // // // // // // // // // // // // //           </div>
// // // // // // // // // // // // // // // // // // // //         </div>

// // // // // // // // // // // // // // // // // // // //         {/* Table Section */}
// // // // // // // // // // // // // // // // // // // //         <div className="overflow-x-auto">
// // // // // // // // // // // // // // // // // // // //           <table className="w-full text-left border-collapse">
// // // // // // // // // // // // // // // // // // // //             <thead>
// // // // // // // // // // // // // // // // // // // //               <tr className="bg-gray-50 border-b border-gray-100">
// // // // // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500">Date</th>
// // // // // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500">Time</th>
// // // // // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500">Source (Godown)</th>
// // // // // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500">User / Staff</th>
// // // // // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500">Consumption Details</th>
// // // // // // // // // // // // // // // // // // // //               </tr>
// // // // // // // // // // // // // // // // // // // //             </thead>
// // // // // // // // // // // // // // // // // // // //             <tbody>
// // // // // // // // // // // // // // // // // // // //               {loading ? (
// // // // // // // // // // // // // // // // // // // //                 <tr><td colSpan="5" className="p-10 text-center animate-pulse font-bold text-gray-400">Loading...</td></tr>
// // // // // // // // // // // // // // // // // // // //               ) : filteredRows.length === 0 ? (
// // // // // // // // // // // // // // // // // // // //                 <tr><td colSpan="5" className="p-10 text-center font-bold text-gray-400">No records found.</td></tr>
// // // // // // // // // // // // // // // // // // // //               ) : (
// // // // // // // // // // // // // // // // // // // //                 filteredRows.map((r) => (
// // // // // // // // // // // // // // // // // // // //                   <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors align-top">
// // // // // // // // // // // // // // // // // // // //                     {/* Separate Date Column */}
// // // // // // // // // // // // // // // // // // // //                     <td className="p-4 text-xs font-bold text-gray-700">
// // // // // // // // // // // // // // // // // // // //                       {new Date(r.createdAt).toLocaleDateString('en-GB')}
// // // // // // // // // // // // // // // // // // // //                     </td>
                    
// // // // // // // // // // // // // // // // // // // //                     {/* Separate Time Column */}
// // // // // // // // // // // // // // // // // // // //                     <td className="p-4 text-xs font-bold text-blue-600">
// // // // // // // // // // // // // // // // // // // //                       {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
// // // // // // // // // // // // // // // // // // // //                     </td>

// // // // // // // // // // // // // // // // // // // //                     <td className="p-4">
// // // // // // // // // // // // // // // // // // // //                       <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-[10px] font-black uppercase">
// // // // // // // // // // // // // // // // // // // //                         {r.godownId?.name || "Main Unit"}
// // // // // // // // // // // // // // // // // // // //                       </span>
// // // // // // // // // // // // // // // // // // // //                     </td>

// // // // // // // // // // // // // // // // // // // //                     {/* User Name Column */}
// // // // // // // // // // // // // // // // // // // //                     <td className="p-4 text-xs font-bold text-gray-800 uppercase">
// // // // // // // // // // // // // // // // // // // //                       {r.userId?.name || "Unassigned Staff"}
// // // // // // // // // // // // // // // // // // // //                     </td>

// // // // // // // // // // // // // // // // // // // //                     {/* Vertical List with S.No */}
// // // // // // // // // // // // // // // // // // // //                     <td className="p-4">
// // // // // // // // // // // // // // // // // // // //                       <div className="space-y-1">
// // // // // // // // // // // // // // // // // // // //                         {(r.items || []).map((item, idx) => (
// // // // // // // // // // // // // // // // // // // //                           <div key={idx} className="flex items-center text-[11px] border-b border-gray-50 pb-1 last:border-0">
// // // // // // // // // // // // // // // // // // // //                             <span className="w-6 text-gray-400 font-black">{idx + 1}.</span>
// // // // // // // // // // // // // // // // // // // //                             <span className="flex-1 font-bold text-gray-700 uppercase">
// // // // // // // // // // // // // // // // // // // //                               {item.stockItemId?.name || "Unknown Item"}
// // // // // // // // // // // // // // // // // // // //                             </span>
// // // // // // // // // // // // // // // // // // // //                             <span className="font-black text-green-600 ml-4">
// // // // // // // // // // // // // // // // // // // //                               {item.qtyBaseUnit} {item.stockItemId?.unit || ''}
// // // // // // // // // // // // // // // // // // // //                             </span>
// // // // // // // // // // // // // // // // // // // //                           </div>
// // // // // // // // // // // // // // // // // // // //                         ))}
// // // // // // // // // // // // // // // // // // // //                       </div>
// // // // // // // // // // // // // // // // // // // //                     </td>
// // // // // // // // // // // // // // // // // // // //                   </tr>
// // // // // // // // // // // // // // // // // // // //                 ))
// // // // // // // // // // // // // // // // // // // //               )}
// // // // // // // // // // // // // // // // // // // //             </tbody>
// // // // // // // // // // // // // // // // // // // //           </table>
// // // // // // // // // // // // // // // // // // // //         </div>
// // // // // // // // // // // // // // // // // // // //       </div>
// // // // // // // // // // // // // // // // // // // //     </section>
// // // // // // // // // // // // // // // // // // // //   );
// // // // // // // // // // // // // // // // // // // // };








// // // // // // // // // // // // // // // // // // // import { useEffect, useState, useMemo } from "react";
// // // // // // // // // // // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // // // // // // // // // // import DatePicker from "react-datepicker";
// // // // // // // // // // // // // // // // // // // import "react-datepicker/dist/react-datepicker.css";

// // // // // // // // // // // // // // // // // // // export const ConsumptionPage = () => {
// // // // // // // // // // // // // // // // // // //   const [rows, setRows] = useState([]);
// // // // // // // // // // // // // // // // // // //   const [filterDate, setFilterDate] = useState(new Date()); 
// // // // // // // // // // // // // // // // // // //   const [loading, setLoading] = useState(true);

// // // // // // // // // // // // // // // // // // //   useEffect(() => {
// // // // // // // // // // // // // // // // // // //     fetchConsumptions();
// // // // // // // // // // // // // // // // // // //   }, []);

// // // // // // // // // // // // // // // // // // //   const fetchConsumptions = async () => {
// // // // // // // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // // // // // // //       const res = await api.get("/consumptions");
// // // // // // // // // // // // // // // // // // //       setRows(res.data);
// // // // // // // // // // // // // // // // // // //     } catch (err) {
// // // // // // // // // // // // // // // // // // //       console.error("Failed to fetch consumption history");
// // // // // // // // // // // // // // // // // // //     } finally {
// // // // // // // // // // // // // // // // // // //       setLoading(false);
// // // // // // // // // // // // // // // // // // //     }
// // // // // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // // // // //   const filteredRows = useMemo(() => {
// // // // // // // // // // // // // // // // // // //     if (!filterDate) return rows;
// // // // // // // // // // // // // // // // // // //     const selectedStr = filterDate.toISOString().split('T')[0];
// // // // // // // // // // // // // // // // // // //     return rows.filter(r => 
// // // // // // // // // // // // // // // // // // //       new Date(r.createdAt).toISOString().split('T')[0] === selectedStr
// // // // // // // // // // // // // // // // // // //     );
// // // // // // // // // // // // // // // // // // //   }, [rows, filterDate]);

// // // // // // // // // // // // // // // // // // //   return (
// // // // // // // // // // // // // // // // // // //     <section className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
// // // // // // // // // // // // // // // // // // //       <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        
// // // // // // // // // // // // // // // // // // //         {/* Header Section */}
// // // // // // // // // // // // // // // // // // //         <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
// // // // // // // // // // // // // // // // // // //           <div>
// // // // // // // // // // // // // // // // // // //             <h1 className="text-2xl font-black uppercase italic text-slate-800">
// // // // // // // // // // // // // // // // // // //               Admin <span className="text-green-600">Consumption</span>
// // // // // // // // // // // // // // // // // // //             </h1>
// // // // // // // // // // // // // // // // // // //             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
// // // // // // // // // // // // // // // // // // //               Live Inventory Usage History
// // // // // // // // // // // // // // // // // // //             </p>
// // // // // // // // // // // // // // // // // // //           </div>

// // // // // // // // // // // // // // // // // // //           <div className="flex items-center gap-3">
// // // // // // // // // // // // // // // // // // //             <span className="text-[10px] font-black uppercase text-gray-500">Filter Date:</span>
// // // // // // // // // // // // // // // // // // //             <DatePicker
// // // // // // // // // // // // // // // // // // //               selected={filterDate}
// // // // // // // // // // // // // // // // // // //               onChange={(date) => setFilterDate(date)}
// // // // // // // // // // // // // // // // // // //               className="bg-gray-100 border-none rounded-lg px-4 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-2 ring-green-500"
// // // // // // // // // // // // // // // // // // //               dateFormat="yyyy-MM-dd"
// // // // // // // // // // // // // // // // // // //             />
// // // // // // // // // // // // // // // // // // //             <button 
// // // // // // // // // // // // // // // // // // //               onClick={() => setFilterDate(null)}
// // // // // // // // // // // // // // // // // // //               className="text-[10px] font-black text-red-500 uppercase hover:underline"
// // // // // // // // // // // // // // // // // // //             >
// // // // // // // // // // // // // // // // // // //               Clear
// // // // // // // // // // // // // // // // // // //             </button>
// // // // // // // // // // // // // // // // // // //           </div>
// // // // // // // // // // // // // // // // // // //         </div>

// // // // // // // // // // // // // // // // // // //         {/* Table Section */}
// // // // // // // // // // // // // // // // // // //         <div className="overflow-x-auto">
// // // // // // // // // // // // // // // // // // //           <table className="w-full text-left border-collapse">
// // // // // // // // // // // // // // // // // // //             <thead>
// // // // // // // // // // // // // // // // // // //               <tr className="bg-gray-50 border-b border-gray-100">
// // // // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500">Date</th>
// // // // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500">Time</th>
// // // // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500">Source (Godown)</th>
// // // // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500">User / Staff</th>
// // // // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500">Consumption Details</th>
// // // // // // // // // // // // // // // // // // //               </tr>
// // // // // // // // // // // // // // // // // // //             </thead>
// // // // // // // // // // // // // // // // // // //             <tbody>
// // // // // // // // // // // // // // // // // // //               {loading ? (
// // // // // // // // // // // // // // // // // // //                 <tr><td colSpan="5" className="p-10 text-center animate-pulse font-bold text-gray-400">Loading Records...</td></tr>
// // // // // // // // // // // // // // // // // // //               ) : filteredRows.length === 0 ? (
// // // // // // // // // // // // // // // // // // //                 <tr><td colSpan="5" className="p-10 text-center font-bold text-gray-400">No records found for this date.</td></tr>
// // // // // // // // // // // // // // // // // // //               ) : (
// // // // // // // // // // // // // // // // // // //                 filteredRows.map((r) => (
// // // // // // // // // // // // // // // // // // //                   <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors align-top">
// // // // // // // // // // // // // // // // // // //                     {/* Date Column */}
// // // // // // // // // // // // // // // // // // //                     <td className="p-4 text-xs font-bold text-gray-700">
// // // // // // // // // // // // // // // // // // //                       {new Date(r.createdAt).toLocaleDateString('en-GB')}
// // // // // // // // // // // // // // // // // // //                     </td>
                    
// // // // // // // // // // // // // // // // // // //                     {/* Time Column */}
// // // // // // // // // // // // // // // // // // //                     <td className="p-4 text-xs font-bold text-blue-600">
// // // // // // // // // // // // // // // // // // //                       {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
// // // // // // // // // // // // // // // // // // //                     </td>

// // // // // // // // // // // // // // // // // // //                     {/* Godown Column */}
// // // // // // // // // // // // // // // // // // //                     <td className="p-4">
// // // // // // // // // // // // // // // // // // //                       <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-[10px] font-black uppercase">
// // // // // // // // // // // // // // // // // // //                         {r.godownId?.name || "Main Unit"}
// // // // // // // // // // // // // // // // // // //                       </span>
// // // // // // // // // // // // // // // // // // //                     </td>

// // // // // // // // // // // // // // // // // // //                     {/* User Name Column (Populated from Backend) */}
// // // // // // // // // // // // // // // // // // //                     <td className="p-4 text-xs font-bold text-gray-800 uppercase">
// // // // // // // // // // // // // // // // // // //                       {r.userId?.name || "Staff Member"}
// // // // // // // // // // // // // // // // // // //                     </td>

// // // // // // // // // // // // // // // // // // //                     {/* Vertical List with S.No and Units */}
// // // // // // // // // // // // // // // // // // //                     <td className="p-4">
// // // // // // // // // // // // // // // // // // //                       <div className="space-y-2">
// // // // // // // // // // // // // // // // // // //                         {(r.items || []).map((item, idx) => (
// // // // // // // // // // // // // // // // // // //                           <div key={idx} className="flex items-start text-[11px] border-b border-gray-50 pb-1 last:border-0">
// // // // // // // // // // // // // // // // // // //                             {/* Serial Number */}
// // // // // // // // // // // // // // // // // // //                             <span className="w-6 text-gray-400 font-black">{idx + 1}.</span>
                            
// // // // // // // // // // // // // // // // // // //                             {/* Item Name */}
// // // // // // // // // // // // // // // // // // //                             <span className="flex-1 font-bold text-gray-700 uppercase">
// // // // // // // // // // // // // // // // // // //                               {item.stockItemId?.name || "Unknown Item"}
// // // // // // // // // // // // // // // // // // //                             </span>
                            
// // // // // // // // // // // // // // // // // // //                             {/* Quantity + Unit */}
// // // // // // // // // // // // // // // // // // //                             <div className="flex items-center gap-1 ml-4">
// // // // // // // // // // // // // // // // // // //                               <span className="font-black text-green-600">
// // // // // // // // // // // // // // // // // // //                                 {item.qtyBaseUnit}
// // // // // // // // // // // // // // // // // // //                               </span>
// // // // // // // // // // // // // // // // // // //                               <span className="text-[9px] font-black text-gray-400 uppercase">
// // // // // // // // // // // // // // // // // // //                                 {item.stockItemId?.unitId?.symbol || item.stockItemId?.unitId?.name || ""}
// // // // // // // // // // // // // // // // // // //                               </span>
// // // // // // // // // // // // // // // // // // //                             </div>
// // // // // // // // // // // // // // // // // // //                           </div>
// // // // // // // // // // // // // // // // // // //                         ))}
// // // // // // // // // // // // // // // // // // //                       </div>
// // // // // // // // // // // // // // // // // // //                     </td>
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





// // // // // // // // // // // // // // // // // // // table 







// // // // // // // // // // // // // // // // // // import { useEffect, useState, useMemo } from "react";
// // // // // // // // // // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // // // // // // // // // import DatePicker from "react-datepicker";
// // // // // // // // // // // // // // // // // // import "react-datepicker/dist/react-datepicker.css";

// // // // // // // // // // // // // // // // // // export const ConsumptionPage = () => {
// // // // // // // // // // // // // // // // // //   const [rows, setRows] = useState([]);
// // // // // // // // // // // // // // // // // //   const [filterDate, setFilterDate] = useState(new Date()); 
// // // // // // // // // // // // // // // // // //   const [loading, setLoading] = useState(true);

// // // // // // // // // // // // // // // // // //   useEffect(() => {
// // // // // // // // // // // // // // // // // //     fetchConsumptions();
// // // // // // // // // // // // // // // // // //   }, []);

// // // // // // // // // // // // // // // // // //   const fetchConsumptions = async () => {
// // // // // // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // // // // // //       const res = await api.get("/consumptions");
// // // // // // // // // // // // // // // // // //       setRows(res.data);
// // // // // // // // // // // // // // // // // //     } catch (err) {
// // // // // // // // // // // // // // // // // //       console.error("Failed to fetch consumption history");
// // // // // // // // // // // // // // // // // //     } finally {
// // // // // // // // // // // // // // // // // //       setLoading(false);
// // // // // // // // // // // // // // // // // //     }
// // // // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // // // //   const filteredRows = useMemo(() => {
// // // // // // // // // // // // // // // // // //     if (!filterDate) return rows;
// // // // // // // // // // // // // // // // // //     const selectedStr = filterDate.toISOString().split('T')[0];
// // // // // // // // // // // // // // // // // //     return rows.filter(r => 
// // // // // // // // // // // // // // // // // //       new Date(r.createdAt).toISOString().split('T')[0] === selectedStr
// // // // // // // // // // // // // // // // // //     );
// // // // // // // // // // // // // // // // // //   }, [rows, filterDate]);

// // // // // // // // // // // // // // // // // //   return (
// // // // // // // // // // // // // // // // // //     <section className="p-4 md:p-6 bg-gray-50 min-h-screen font-sans">
// // // // // // // // // // // // // // // // // //       {/* Container changed to max-w-full to stretch to the right end */}
// // // // // // // // // // // // // // // // // //       <div className="max-w-full mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
// // // // // // // // // // // // // // // // // //         {/* Header Section */}
// // // // // // // // // // // // // // // // // //         <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
// // // // // // // // // // // // // // // // // //           <div>
// // // // // // // // // // // // // // // // // //             <h1 className="text-2xl font-black uppercase italic text-slate-800">
// // // // // // // // // // // // // // // // // //               Admin <span className="text-green-600">Consumption</span>
// // // // // // // // // // // // // // // // // //             </h1>
// // // // // // // // // // // // // // // // // //             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
// // // // // // // // // // // // // // // // // //               Live Inventory Usage History
// // // // // // // // // // // // // // // // // //             </p>
// // // // // // // // // // // // // // // // // //           </div>

// // // // // // // // // // // // // // // // // //           <div className="flex items-center gap-3">
// // // // // // // // // // // // // // // // // //             <span className="text-[10px] font-black uppercase text-gray-500">Filter Date:</span>
// // // // // // // // // // // // // // // // // //             <DatePicker
// // // // // // // // // // // // // // // // // //               selected={filterDate}
// // // // // // // // // // // // // // // // // //               onChange={(date) => setFilterDate(date)}
// // // // // // // // // // // // // // // // // //               className="bg-gray-100 border-none rounded-lg px-4 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-2 ring-green-500"
// // // // // // // // // // // // // // // // // //               dateFormat="yyyy-MM-dd"
// // // // // // // // // // // // // // // // // //             />
// // // // // // // // // // // // // // // // // //             <button 
// // // // // // // // // // // // // // // // // //               onClick={() => setFilterDate(null)}
// // // // // // // // // // // // // // // // // //               className="text-[10px] font-black text-red-500 uppercase hover:underline"
// // // // // // // // // // // // // // // // // //             >
// // // // // // // // // // // // // // // // // //               Clear
// // // // // // // // // // // // // // // // // //             </button>
// // // // // // // // // // // // // // // // // //           </div>
// // // // // // // // // // // // // // // // // //         </div>

// // // // // // // // // // // // // // // // // //         {/* Table Section */}
// // // // // // // // // // // // // // // // // //         <div className="overflow-x-auto w-full">
// // // // // // // // // // // // // // // // // //           <table className="w-full text-left border-collapse table-fixed">
// // // // // // // // // // // // // // // // // //             <thead>
// // // // // // // // // // // // // // // // // //               <tr className="bg-gray-50 border-b border-gray-100">
// // // // // // // // // // // // // // // // // //                 {/* Defined widths for standard columns, leaving details to expand */}
// // // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500 w-32">Date</th>
// // // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500 w-32">Time</th>
// // // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500 w-44">Source (Godown)</th>
// // // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500 w-44">User / Staff</th>
// // // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500">Consumption Details</th>
// // // // // // // // // // // // // // // // // //               </tr>
// // // // // // // // // // // // // // // // // //             </thead>
// // // // // // // // // // // // // // // // // //             <tbody>
// // // // // // // // // // // // // // // // // //               {loading ? (
// // // // // // // // // // // // // // // // // //                 <tr><td colSpan="5" className="p-10 text-center animate-pulse font-bold text-gray-400">Loading Records...</td></tr>
// // // // // // // // // // // // // // // // // //               ) : filteredRows.length === 0 ? (
// // // // // // // // // // // // // // // // // //                 <tr><td colSpan="5" className="p-10 text-center font-bold text-gray-400">No records found for this date.</td></tr>
// // // // // // // // // // // // // // // // // //               ) : (
// // // // // // // // // // // // // // // // // //                 filteredRows.map((r) => (
// // // // // // // // // // // // // // // // // //                   <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors align-top">
// // // // // // // // // // // // // // // // // //                     <td className="p-4 text-xs font-bold text-gray-700 whitespace-nowrap">
// // // // // // // // // // // // // // // // // //                       {new Date(r.createdAt).toLocaleDateString('en-GB')}
// // // // // // // // // // // // // // // // // //                     </td>
                    
// // // // // // // // // // // // // // // // // //                     <td className="p-4 text-xs font-bold text-blue-600 whitespace-nowrap">
// // // // // // // // // // // // // // // // // //                       {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
// // // // // // // // // // // // // // // // // //                     </td>

// // // // // // // // // // // // // // // // // //                     <td className="p-4">
// // // // // // // // // // // // // // // // // //                       <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-[10px] font-black uppercase whitespace-nowrap">
// // // // // // // // // // // // // // // // // //                         {r.godownId?.name || "Main Unit"}
// // // // // // // // // // // // // // // // // //                       </span>
// // // // // // // // // // // // // // // // // //                     </td>

// // // // // // // // // // // // // // // // // //                     <td className="p-4 text-xs font-bold text-gray-800 uppercase whitespace-nowrap">
// // // // // // // // // // // // // // // // // //                       {r.userId?.name || "Staff Member"}
// // // // // // // // // // // // // // // // // //                     </td>

// // // // // // // // // // // // // // // // // //                     {/* This column will now take up all remaining horizontal space */}
// // // // // // // // // // // // // // // // // //                     <td className="p-4">
// // // // // // // // // // // // // // // // // //                       <div className="space-y-2">
// // // // // // // // // // // // // // // // // //                         {(r.items || []).map((item, idx) => (
// // // // // // // // // // // // // // // // // //                           <div key={idx} className="flex items-center text-[11px] border-b border-gray-50 pb-1 last:border-0">
// // // // // // // // // // // // // // // // // //                             <span className="w-6 text-gray-400 font-black">{idx + 1}.</span>
                            
// // // // // // // // // // // // // // // // // //                             <span className="flex-1 font-bold text-gray-700 uppercase">
// // // // // // // // // // // // // // // // // //                               {item.stockItemId?.name || "Unknown Item"}
// // // // // // // // // // // // // // // // // //                             </span>
                            
// // // // // // // // // // // // // // // // // //                             <div className="flex items-center gap-1 ml-4 bg-green-50 px-2 py-0.5 rounded border border-green-100">
// // // // // // // // // // // // // // // // // //                               <span className="font-black text-green-700">
// // // // // // // // // // // // // // // // // //                                 {item.qtyBaseUnit}
// // // // // // // // // // // // // // // // // //                               </span>
// // // // // // // // // // // // // // // // // //                               <span className="text-[9px] font-black text-green-600 uppercase">
// // // // // // // // // // // // // // // // // //                                 {item.stockItemId?.unitId?.symbol || item.stockItemId?.unitId?.name || ""}
// // // // // // // // // // // // // // // // // //                               </span>
// // // // // // // // // // // // // // // // // //                             </div>
// // // // // // // // // // // // // // // // // //                           </div>
// // // // // // // // // // // // // // // // // //                         ))}
// // // // // // // // // // // // // // // // // //                       </div>
// // // // // // // // // // // // // // // // // //                     </td>
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






// // // // // // // // // // // // // // // // // import { useEffect, useState, useMemo } from "react";
// // // // // // // // // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // // // // // // // // import DatePicker from "react-datepicker";
// // // // // // // // // // // // // // // // // import "react-datepicker/dist/react-datepicker.css";

// // // // // // // // // // // // // // // // // export const ConsumptionPage = () => {
// // // // // // // // // // // // // // // // //   const [rows, setRows] = useState([]);
// // // // // // // // // // // // // // // // //   const [filterDate, setFilterDate] = useState(new Date()); 
// // // // // // // // // // // // // // // // //   const [loading, setLoading] = useState(true);

// // // // // // // // // // // // // // // // //   useEffect(() => {
// // // // // // // // // // // // // // // // //     fetchConsumptions();
// // // // // // // // // // // // // // // // //   }, []);

// // // // // // // // // // // // // // // // //   const fetchConsumptions = async () => {
// // // // // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // // // // //       const res = await api.get("/consumptions");
// // // // // // // // // // // // // // // // //       setRows(res.data);
// // // // // // // // // // // // // // // // //     } catch (err) {
// // // // // // // // // // // // // // // // //       console.error("Failed to fetch consumption history");
// // // // // // // // // // // // // // // // //     } finally {
// // // // // // // // // // // // // // // // //       setLoading(false);
// // // // // // // // // // // // // // // // //     }
// // // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // // //   // Processed Rows: Filters by date AND Sorts by Time (Latest Top)
// // // // // // // // // // // // // // // // //   const processedRows = useMemo(() => {
// // // // // // // // // // // // // // // // //     let data = [...rows];

// // // // // // // // // // // // // // // // //     // 1. Filter
// // // // // // // // // // // // // // // // //     if (filterDate) {
// // // // // // // // // // // // // // // // //       const selectedStr = filterDate.toISOString().split('T')[0];
// // // // // // // // // // // // // // // // //       data = data.filter(r => 
// // // // // // // // // // // // // // // // //         new Date(r.createdAt).toISOString().split('T')[0] === selectedStr
// // // // // // // // // // // // // // // // //       );
// // // // // // // // // // // // // // // // //     }

// // // // // // // // // // // // // // // // //     // 2. Sort (Newest at the top)
// // // // // // // // // // // // // // // // //     return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // // // // // // // // // // // //   }, [rows, filterDate]);

// // // // // // // // // // // // // // // // //   return (
// // // // // // // // // // // // // // // // //     /* FIXED: Added flex-1 and min-w-0 to force the container to take all available right-side space */
// // // // // // // // // // // // // // // // //     <section className="flex-1 w-full min-w-0 p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
// // // // // // // // // // // // // // // // //       <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        
// // // // // // // // // // // // // // // // //         {/* Header */}
// // // // // // // // // // // // // // // // //         <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
// // // // // // // // // // // // // // // // //           <div>
// // // // // // // // // // // // // // // // //             <h1 className="text-2xl font-black uppercase italic text-slate-800">
// // // // // // // // // // // // // // // // //               Admin <span className="text-green-600">Consumption</span>
// // // // // // // // // // // // // // // // //             </h1>
// // // // // // // // // // // // // // // // //             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
// // // // // // // // // // // // // // // // //               Live Inventory Usage History
// // // // // // // // // // // // // // // // //             </p>
// // // // // // // // // // // // // // // // //           </div>

// // // // // // // // // // // // // // // // //           <div className="flex items-center gap-3">
// // // // // // // // // // // // // // // // //             <span className="text-[10px] font-black uppercase text-gray-500">Filter Date:</span>
// // // // // // // // // // // // // // // // //             <DatePicker
// // // // // // // // // // // // // // // // //               selected={filterDate}
// // // // // // // // // // // // // // // // //               onChange={(date) => setFilterDate(date)}
// // // // // // // // // // // // // // // // //               className="bg-gray-100 border-none rounded-lg px-4 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-2 ring-green-500"
// // // // // // // // // // // // // // // // //               dateFormat="yyyy-MM-dd"
// // // // // // // // // // // // // // // // //             />
// // // // // // // // // // // // // // // // //             <button 
// // // // // // // // // // // // // // // // //               onClick={() => setFilterDate(null)}
// // // // // // // // // // // // // // // // //               className="text-[10px] font-black text-red-500 uppercase hover:underline"
// // // // // // // // // // // // // // // // //             >
// // // // // // // // // // // // // // // // //               Clear
// // // // // // // // // // // // // // // // //             </button>
// // // // // // // // // // // // // // // // //           </div>
// // // // // // // // // // // // // // // // //         </div>

// // // // // // // // // // // // // // // // //         {/* Table */}
// // // // // // // // // // // // // // // // //         <div className="overflow-x-auto w-full">
// // // // // // // // // // // // // // // // //           <table className="w-full text-left border-collapse">
// // // // // // // // // // // // // // // // //             <thead>
// // // // // // // // // // // // // // // // //               <tr className="bg-gray-50 border-b border-gray-100">
// // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500 w-32">Date</th>
// // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500 w-32">Time</th>
// // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500 w-40">Source</th>
// // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500 w-40">User / Staff</th>
// // // // // // // // // // // // // // // // //                 <th className="p-4 text-[10px] font-black uppercase text-gray-500">Consumption Details</th>
// // // // // // // // // // // // // // // // //               </tr>
// // // // // // // // // // // // // // // // //             </thead>
// // // // // // // // // // // // // // // // //             <tbody>
// // // // // // // // // // // // // // // // //               {loading ? (
// // // // // // // // // // // // // // // // //                 <tr><td colSpan="5" className="p-10 text-center animate-pulse font-bold text-gray-400">Loading...</td></tr>
// // // // // // // // // // // // // // // // //               ) : processedRows.length === 0 ? (
// // // // // // // // // // // // // // // // //                 <tr><td colSpan="5" className="p-10 text-center font-bold text-gray-400">No records found.</td></tr>
// // // // // // // // // // // // // // // // //               ) : (
// // // // // // // // // // // // // // // // //                 processedRows.map((r) => (
// // // // // // // // // // // // // // // // //                   <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors align-top">
// // // // // // // // // // // // // // // // //                     <td className="p-4 text-xs font-bold text-gray-700 whitespace-nowrap">
// // // // // // // // // // // // // // // // //                       {new Date(r.createdAt).toLocaleDateString('en-GB')}
// // // // // // // // // // // // // // // // //                     </td>
// // // // // // // // // // // // // // // // //                     <td className="p-4 text-xs font-bold text-blue-600 whitespace-nowrap">
// // // // // // // // // // // // // // // // //                       {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
// // // // // // // // // // // // // // // // //                     </td>
// // // // // // // // // // // // // // // // //                     <td className="p-4">
// // // // // // // // // // // // // // // // //                       <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-[10px] font-black uppercase whitespace-nowrap">
// // // // // // // // // // // // // // // // //                         {r.godownId?.name || "Main Unit"}
// // // // // // // // // // // // // // // // //                       </span>
// // // // // // // // // // // // // // // // //                     </td>
// // // // // // // // // // // // // // // // //                     <td className="p-4 text-xs font-bold text-gray-800 uppercase whitespace-nowrap">
// // // // // // // // // // // // // // // // //                       {r.userId?.name || "Staff"}
// // // // // // // // // // // // // // // // //                     </td>
// // // // // // // // // // // // // // // // //                     <td className="p-4">
// // // // // // // // // // // // // // // // //                       <div className="space-y-2">
// // // // // // // // // // // // // // // // //                         {(r.items || []).map((item, idx) => (
// // // // // // // // // // // // // // // // //                           <div key={idx} className="flex items-center text-[11px] border-b border-gray-50 pb-1 last:border-0">
// // // // // // // // // // // // // // // // //                             <span className="w-6 text-gray-400 font-black">{idx + 1}.</span>
// // // // // // // // // // // // // // // // //                             <span className="flex-1 font-bold text-gray-700 uppercase">
// // // // // // // // // // // // // // // // //                               {item.stockItemId?.name || "Unknown Item"}
// // // // // // // // // // // // // // // // //                             </span>
// // // // // // // // // // // // // // // // //                             <div className="flex items-center gap-1 ml-4 bg-green-50 px-2 py-0.5 rounded border border-green-100">
// // // // // // // // // // // // // // // // //                               <span className="font-black text-green-700">{item.qtyBaseUnit}</span>
// // // // // // // // // // // // // // // // //                               <span className="text-[9px] font-black text-green-600 uppercase">
// // // // // // // // // // // // // // // // //                                 {item.stockItemId?.unitId?.symbol || ""}
// // // // // // // // // // // // // // // // //                               </span>
// // // // // // // // // // // // // // // // //                             </div>
// // // // // // // // // // // // // // // // //                           </div>
// // // // // // // // // // // // // // // // //                         ))}
// // // // // // // // // // // // // // // // //                       </div>
// // // // // // // // // // // // // // // // //                     </td>
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






// // // // // // // // // // // // // // // // import { useEffect, useState, useMemo } from "react";
// // // // // // // // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // // // // // // // import DatePicker from "react-datepicker";
// // // // // // // // // // // // // // // // import "react-datepicker/dist/react-datepicker.css";

// // // // // // // // // // // // // // // // export const ConsumptionPage = () => {
// // // // // // // // // // // // // // // //   const [rows, setRows] = useState([]);
// // // // // // // // // // // // // // // //   const [filterDate, setFilterDate] = useState(new Date()); 
// // // // // // // // // // // // // // // //   const [loading, setLoading] = useState(true);

// // // // // // // // // // // // // // // //   useEffect(() => {
// // // // // // // // // // // // // // // //     fetchConsumptions();
// // // // // // // // // // // // // // // //   }, []);

// // // // // // // // // // // // // // // //   const fetchConsumptions = async () => {
// // // // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // // // //       const res = await api.get("/consumptions");
// // // // // // // // // // // // // // // //       setRows(res.data);
// // // // // // // // // // // // // // // //     } catch (err) {
// // // // // // // // // // // // // // // //       console.error("Failed to fetch consumption history");
// // // // // // // // // // // // // // // //     } finally {
// // // // // // // // // // // // // // // //       setLoading(false);
// // // // // // // // // // // // // // // //     }
// // // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // // //   // SORTING & FILTERING LOGIC
// // // // // // // // // // // // // // // //   const processedRows = useMemo(() => {
// // // // // // // // // // // // // // // //     let data = [...rows];

// // // // // // // // // // // // // // // //     // 1. Filter by Date
// // // // // // // // // // // // // // // //     if (filterDate) {
// // // // // // // // // // // // // // // //       const selectedStr = filterDate.toISOString().split('T')[0];
// // // // // // // // // // // // // // // //       data = data.filter(r => 
// // // // // // // // // // // // // // // //         new Date(r.createdAt).toISOString().split('T')[0] === selectedStr
// // // // // // // // // // // // // // // //       );
// // // // // // // // // // // // // // // //     }

// // // // // // // // // // // // // // // //     // 2. Sort by Date/Time (Newest at the top)
// // // // // // // // // // // // // // // //     return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // // // // // // // // // // //   }, [rows, filterDate]);

// // // // // // // // // // // // // // // //   return (
// // // // // // // // // // // // // // // //     // Uses your '.main' class to ensure it fills the remaining flex space
// // // // // // // // // // // // // // // //     <div className="main">
// // // // // // // // // // // // // // // //       <div className="panel">
// // // // // // // // // // // // // // // //         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
// // // // // // // // // // // // // // // //           <div>
// // // // // // // // // // // // // // // //             <h2 style={{ margin: 0, textTransform: 'uppercase', fontStyle: 'italic' }}>
// // // // // // // // // // // // // // // //               Admin <span style={{ color: '#16a34a' }}>Consumption</span>
// // // // // // // // // // // // // // // //             </h2>
// // // // // // // // // // // // // // // //             <small style={{ color: '#94a3b8', fontWeight: 'bold' }}>LIVE INVENTORY USAGE HISTORY</small>
// // // // // // // // // // // // // // // //           </div>

// // // // // // // // // // // // // // // //           <div className="toolbar" style={{ margin: 0 }}>
// // // // // // // // // // // // // // // //             <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Filter Date:</span>
// // // // // // // // // // // // // // // //             <DatePicker
// // // // // // // // // // // // // // // //               selected={filterDate}
// // // // // // // // // // // // // // // //               onChange={(date) => setFilterDate(date)}
// // // // // // // // // // // // // // // //               dateFormat="yyyy-MM-dd"
// // // // // // // // // // // // // // // //               // Adding your standard input styling via inline or class
// // // // // // // // // // // // // // // //               customInput={<input style={{ width: '130px' }} />}
// // // // // // // // // // // // // // // //             />
// // // // // // // // // // // // // // // //             <button onClick={() => setFilterDate(null)} style={{ background: '#ef4444' }}>Clear</button>
// // // // // // // // // // // // // // // //           </div>
// // // // // // // // // // // // // // // //         </div>

// // // // // // // // // // // // // // // //         <div style={{ overflowX: 'auto' }}>
// // // // // // // // // // // // // // // //           {/* Uses your '.table' class from style.css */}
// // // // // // // // // // // // // // // //           <table className="table">
// // // // // // // // // // // // // // // //             <thead>
// // // // // // // // // // // // // // // //               <tr style={{ background: '#f8fafc' }}>
// // // // // // // // // // // // // // // //                 <th style={{ width: '120px' }}>Date</th>
// // // // // // // // // // // // // // // //                 <th style={{ width: '100px' }}>Time</th>
// // // // // // // // // // // // // // // //                 <th style={{ width: '150px' }}>Source (Godown)</th>
// // // // // // // // // // // // // // // //                 <th style={{ width: '150px' }}>User / Staff</th>
// // // // // // // // // // // // // // // //                 <th>Consumption Details</th>
// // // // // // // // // // // // // // // //               </tr>
// // // // // // // // // // // // // // // //             </thead>
// // // // // // // // // // // // // // // //             <tbody>
// // // // // // // // // // // // // // // //               {loading ? (
// // // // // // // // // // // // // // // //                 <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading records...</td></tr>
// // // // // // // // // // // // // // // //               ) : processedRows.length === 0 ? (
// // // // // // // // // // // // // // // //                 <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No records found for this date.</td></tr>
// // // // // // // // // // // // // // // //               ) : (
// // // // // // // // // // // // // // // //                 processedRows.map((r) => (
// // // // // // // // // // // // // // // //                   <tr key={r._id}>
// // // // // // // // // // // // // // // //                     <td style={{ fontWeight: 'bold', color: '#334155' }}>
// // // // // // // // // // // // // // // //                       {new Date(r.createdAt).toLocaleDateString('en-GB')}
// // // // // // // // // // // // // // // //                     </td>
// // // // // // // // // // // // // // // //                     <td style={{ fontWeight: 'bold', color: '#2563eb' }}>
// // // // // // // // // // // // // // // //                       {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
// // // // // // // // // // // // // // // //                     </td>
// // // // // // // // // // // // // // // //                     <td>
// // // // // // // // // // // // // // // //                       <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '900' }}>
// // // // // // // // // // // // // // // //                         {r.godownId?.name || "Main Unit"}
// // // // // // // // // // // // // // // //                       </span>
// // // // // // // // // // // // // // // //                     </td>
// // // // // // // // // // // // // // // //                     <td style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12px' }}>
// // // // // // // // // // // // // // // //                       {r.userId?.name || "Staff Member"}
// // // // // // // // // // // // // // // //                     </td>
// // // // // // // // // // // // // // // //                     <td>
// // // // // // // // // // // // // // // //                       {/* Vertical list of items */}
// // // // // // // // // // // // // // // //                       <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
// // // // // // // // // // // // // // // //                         {(r.items || []).map((item, idx) => (
// // // // // // // // // // // // // // // //                           <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: '1px solid #f1f5f9' }}>
// // // // // // // // // // // // // // // //                             <span style={{ fontSize: '11px', color: '#475569' }}>
// // // // // // // // // // // // // // // //                               {idx + 1}. <strong>{item.stockItemId?.name || "Unknown"}</strong>
// // // // // // // // // // // // // // // //                             </span>
// // // // // // // // // // // // // // // //                             <span style={{ fontSize: '11px', fontWeight: '900', color: '#166534' }}>
// // // // // // // // // // // // // // // //                               {item.qtyBaseUnit} {item.stockItemId?.unitId?.symbol || ""}
// // // // // // // // // // // // // // // //                             </span>
// // // // // // // // // // // // // // // //                           </div>
// // // // // // // // // // // // // // // //                         ))}
// // // // // // // // // // // // // // // //                       </div>
// // // // // // // // // // // // // // // //                     </td>
// // // // // // // // // // // // // // // //                   </tr>
// // // // // // // // // // // // // // // //                 )
// // // // // // // // // // // // // // // //               ))}
// // // // // // // // // // // // // // // //             </tbody>
// // // // // // // // // // // // // // // //           </table>
// // // // // // // // // // // // // // // //         </div>
// // // // // // // // // // // // // // // //       </div>
// // // // // // // // // // // // // // // //     </div>
// // // // // // // // // // // // // // // //   );
// // // // // // // // // // // // // // // // };





// // // // // // // // // // // // // // // import { useEffect, useState, useMemo } from "react";
// // // // // // // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // // // // // // import DatePicker from "react-datepicker";
// // // // // // // // // // // // // // // import "react-datepicker/dist/react-datepicker.css";

// // // // // // // // // // // // // // // export const ConsumptionPage = () => {
// // // // // // // // // // // // // // //   const [rows, setRows] = useState([]);
// // // // // // // // // // // // // // //   const [filterDate, setFilterDate] = useState(new Date()); 
// // // // // // // // // // // // // // //   const [loading, setLoading] = useState(true);

// // // // // // // // // // // // // // //   useEffect(() => {
// // // // // // // // // // // // // // //     fetchConsumptions();
// // // // // // // // // // // // // // //   }, []);

// // // // // // // // // // // // // // //   const fetchConsumptions = async () => {
// // // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // // //       const res = await api.get("/consumptions");
// // // // // // // // // // // // // // //       setRows(res.data);
// // // // // // // // // // // // // // //     } catch (err) {
// // // // // // // // // // // // // // //       console.error("Failed to fetch consumption history");
// // // // // // // // // // // // // // //     } finally {
// // // // // // // // // // // // // // //       setLoading(false);
// // // // // // // // // // // // // // //     }
// // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // //   const processedRows = useMemo(() => {
// // // // // // // // // // // // // // //     let data = [...rows];
// // // // // // // // // // // // // // //     if (filterDate) {
// // // // // // // // // // // // // // //       const selectedStr = filterDate.toISOString().split('T')[0];
// // // // // // // // // // // // // // //       data = data.filter(r => 
// // // // // // // // // // // // // // //         new Date(r.createdAt).toISOString().split('T')[0] === selectedStr
// // // // // // // // // // // // // // //       );
// // // // // // // // // // // // // // //     }
// // // // // // // // // // // // // // //     return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // // // // // // // // // //   }, [rows, filterDate]);

// // // // // // // // // // // // // // //   return (
// // // // // // // // // // // // // // //     <div className="main" style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      
// // // // // // // // // // // // // // //       {/* 1. Glassmorphism Header */}
// // // // // // // // // // // // // // //       <header style={{ 
// // // // // // // // // // // // // // //         display: 'flex', 
// // // // // // // // // // // // // // //         justifyContent: 'space-between', 
// // // // // // // // // // // // // // //         alignItems: 'flex-end', 
// // // // // // // // // // // // // // //         marginBottom: '32px' 
// // // // // // // // // // // // // // //       }}>
// // // // // // // // // // // // // // //         <div>
// // // // // // // // // // // // // // //           <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: '#0f172a', letterSpacing: '-1px' }}>
// // // // // // // // // // // // // // //             Inventory <span style={{ color: '#3b82f6' }}>Activity</span>
// // // // // // // // // // // // // // //           </h1>
// // // // // // // // // // // // // // //           <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
// // // // // // // // // // // // // // //             Tracking {processedRows.length} consumption events for the selected period.
// // // // // // // // // // // // // // //           </p>
// // // // // // // // // // // // // // //         </div>

// // // // // // // // // // // // // // //         <div style={{ display: 'flex', gap: '12px' }}>
// // // // // // // // // // // // // // //           <div className="panel" style={{ margin: 0, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '12px' }}>
// // // // // // // // // // // // // // //             <span style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8' }}>FILTER:</span>
// // // // // // // // // // // // // // //             <DatePicker
// // // // // // // // // // // // // // //               selected={filterDate}
// // // // // // // // // // // // // // //               onChange={(date) => setFilterDate(date)}
// // // // // // // // // // // // // // //               dateFormat="MMMM d, yyyy"
// // // // // // // // // // // // // // //               customInput={<input style={{ border: 'none', background: 'transparent', fontWeight: '700', color: '#1e293b', outline: 'none', cursor: 'pointer', width: '140px' }} />}
// // // // // // // // // // // // // // //             />
// // // // // // // // // // // // // // //           </div>
// // // // // // // // // // // // // // //           <button 
// // // // // // // // // // // // // // //             onClick={() => setFilterDate(null)} 
// // // // // // // // // // // // // // //             style={{ padding: '0 20px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', background: '#f1f5f9', color: '#475569', border: 'none' }}
// // // // // // // // // // // // // // //           >
// // // // // // // // // // // // // // //             Clear
// // // // // // // // // // // // // // //           </button>
// // // // // // // // // // // // // // //         </div>
// // // // // // // // // // // // // // //       </header>

// // // // // // // // // // // // // // //       {/* 2. Content Area */}
// // // // // // // // // // // // // // //       {loading ? (
// // // // // // // // // // // // // // //         <div style={{ textAlign: 'center', padding: '100px', color: '#94a3b8', fontSize: '14px', fontWeight: 'bold' }}>Loading activity stream...</div>
// // // // // // // // // // // // // // //       ) : processedRows.length === 0 ? (
// // // // // // // // // // // // // // //         <div className="panel" style={{ textAlign: 'center', padding: '80px', borderRadius: '24px' }}>
// // // // // // // // // // // // // // //           <div style={{ fontSize: '40px', marginBottom: '16px' }}>Empty</div>
// // // // // // // // // // // // // // //           <h3 style={{ color: '#1e293b', margin: 0 }}>No records for this date</h3>
// // // // // // // // // // // // // // //           <p style={{ color: '#64748b' }}>Try selecting a different date from the filter above.</p>
// // // // // // // // // // // // // // //         </div>
// // // // // // // // // // // // // // //       ) : (
// // // // // // // // // // // // // // //         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
// // // // // // // // // // // // // // //           {processedRows.map((r) => (
// // // // // // // // // // // // // // //             <div 
// // // // // // // // // // // // // // //               key={r._id} 
// // // // // // // // // // // // // // //               className="panel" 
// // // // // // // // // // // // // // //               style={{ 
// // // // // // // // // // // // // // //                 margin: 0, 
// // // // // // // // // // // // // // //                 padding: '20px', 
// // // // // // // // // // // // // // //                 borderRadius: '20px', 
// // // // // // // // // // // // // // //                 transition: 'transform 0.2s, box-shadow 0.2s',
// // // // // // // // // // // // // // //                 cursor: 'default',
// // // // // // // // // // // // // // //                 border: '1px solid #f1f5f9',
// // // // // // // // // // // // // // //                 display: 'flex',
// // // // // // // // // // // // // // //                 flexDirection: 'column',
// // // // // // // // // // // // // // //                 justifyContent: 'space-between'
// // // // // // // // // // // // // // //               }}
// // // // // // // // // // // // // // //               onMouseEnter={(e) => {
// // // // // // // // // // // // // // //                 e.currentTarget.style.transform = 'translateY(-4px)';
// // // // // // // // // // // // // // //                 e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1)';
// // // // // // // // // // // // // // //               }}
// // // // // // // // // // // // // // //               onMouseLeave={(e) => {
// // // // // // // // // // // // // // //                 e.currentTarget.style.transform = 'translateY(0)';
// // // // // // // // // // // // // // //                 e.currentTarget.style.boxShadow = 'none';
// // // // // // // // // // // // // // //               }}
// // // // // // // // // // // // // // //             >
// // // // // // // // // // // // // // //               {/* Card Top: User & Metadata */}
// // // // // // // // // // // // // // //               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
// // // // // // // // // // // // // // //                 <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
// // // // // // // // // // // // // // //                   <div style={{ 
// // // // // // // // // // // // // // //                     width: '40px', 
// // // // // // // // // // // // // // //                     height: '40px', 
// // // // // // // // // // // // // // //                     borderRadius: '12px', 
// // // // // // // // // // // // // // //                     background: '#3b82f6', 
// // // // // // // // // // // // // // //                     display: 'flex', 
// // // // // // // // // // // // // // //                     alignItems: 'center', 
// // // // // // // // // // // // // // //                     justifyContent: 'center', 
// // // // // // // // // // // // // // //                     color: '#fff', 
// // // // // // // // // // // // // // //                     fontWeight: '800',
// // // // // // // // // // // // // // //                     fontSize: '16px'
// // // // // // // // // // // // // // //                   }}>
// // // // // // // // // // // // // // //                     {r.userId?.name?.charAt(0) || 'S'}
// // // // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // // // //                   <div>
// // // // // // // // // // // // // // //                     <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '14px' }}>{r.userId?.name || "Staff Member"}</div>
// // // // // // // // // // // // // // //                     <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>{r.godownId?.name || "MAIN WAREHOUSE"}</div>
// // // // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // // // //                 </div>
// // // // // // // // // // // // // // //                 <div style={{ textAlign: 'right' }}>
// // // // // // // // // // // // // // //                   <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>
// // // // // // // // // // // // // // //                     {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
// // // // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // // // //                   <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>
// // // // // // // // // // // // // // //                     {new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
// // // // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // // // //                 </div>
// // // // // // // // // // // // // // //               </div>

// // // // // // // // // // // // // // //               {/* Card Middle: Items List */}
// // // // // // // // // // // // // // //               <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '12px', marginBottom: '16px' }}>
// // // // // // // // // // // // // // //                 {(r.items || []).map((item, idx) => (
// // // // // // // // // // // // // // //                   <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: idx === r.items.length - 1 ? 'none' : '1px solid #eef2f6' }}>
// // // // // // // // // // // // // // //                     <span style={{ fontSize: '13px', color: '#334155', fontWeight: '600' }}>{item.stockItemId?.name}</span>
// // // // // // // // // // // // // // //                     <span style={{ fontSize: '13px', fontWeight: '800', color: '#ef4444' }}>
// // // // // // // // // // // // // // //                       -{item.qtyBaseUnit} <small style={{ fontSize: '10px', color: '#94a3b8' }}>{item.stockItemId?.unitId?.symbol}</small>
// // // // // // // // // // // // // // //                     </span>
// // // // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // // // //                 ))}
// // // // // // // // // // // // // // //               </div>

// // // // // // // // // // // // // // //               {/* Card Bottom: Badge */}
// // // // // // // // // // // // // // //               <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
// // // // // // // // // // // // // // //                 <span style={{ 
// // // // // // // // // // // // // // //                   fontSize: '9px', 
// // // // // // // // // // // // // // //                   fontWeight: '900', 
// // // // // // // // // // // // // // //                   color: '#3b82f6', 
// // // // // // // // // // // // // // //                   background: '#eff6ff', 
// // // // // // // // // // // // // // //                   padding: '4px 8px', 
// // // // // // // // // // // // // // //                   borderRadius: '6px', 
// // // // // // // // // // // // // // //                   letterSpacing: '0.5px' 
// // // // // // // // // // // // // // //                 }}>
// // // // // // // // // // // // // // //                   ID: {r._id?.slice(-6).toUpperCase()}
// // // // // // // // // // // // // // //                 </span>
// // // // // // // // // // // // // // //               </div>
// // // // // // // // // // // // // // //             </div>
// // // // // // // // // // // // // // //           ))}
// // // // // // // // // // // // // // //         </div>
// // // // // // // // // // // // // // //       )}
// // // // // // // // // // // // // // //     </div>
// // // // // // // // // // // // // // //   );
// // // // // // // // // // // // // // // };






// // // // // // // // // // // // // // import { useEffect, useState, useMemo } from "react";
// // // // // // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // // // // // import DatePicker from "react-datepicker";
// // // // // // // // // // // // // // import "react-datepicker/dist/react-datepicker.css";

// // // // // // // // // // // // // // export const ConsumptionPage = () => {
// // // // // // // // // // // // // //   const [rows, setRows] = useState([]);
// // // // // // // // // // // // // //   const [filterDate, setFilterDate] = useState(new Date()); 
// // // // // // // // // // // // // //   const [loading, setLoading] = useState(true);

// // // // // // // // // // // // // //   useEffect(() => {
// // // // // // // // // // // // // //     fetchConsumptions();
// // // // // // // // // // // // // //   }, []);

// // // // // // // // // // // // // //   const fetchConsumptions = async () => {
// // // // // // // // // // // // // //     try {
// // // // // // // // // // // // // //       const res = await api.get("/consumptions");
// // // // // // // // // // // // // //       setRows(res.data);
// // // // // // // // // // // // // //     } catch (err) {
// // // // // // // // // // // // // //       console.error("Failed to fetch consumption history");
// // // // // // // // // // // // // //     } finally {
// // // // // // // // // // // // // //       setLoading(false);
// // // // // // // // // // // // // //     }
// // // // // // // // // // // // // //   };

// // // // // // // // // // // // // //   const processedRows = useMemo(() => {
// // // // // // // // // // // // // //     let data = [...rows];
// // // // // // // // // // // // // //     if (filterDate) {
// // // // // // // // // // // // // //       const selectedStr = filterDate.toISOString().split('T')[0];
// // // // // // // // // // // // // //       data = data.filter(r => 
// // // // // // // // // // // // // //         new Date(r.createdAt).toISOString().split('T')[0] === selectedStr
// // // // // // // // // // // // // //       );
// // // // // // // // // // // // // //     }
// // // // // // // // // // // // // //     return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // // // // // // // // //   }, [rows, filterDate]);

// // // // // // // // // // // // // //   return (
// // // // // // // // // // // // // //     <div className="main" style={{ background: '#f8fafc', minHeight: '100vh' }}>
// // // // // // // // // // // // // //       <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
        
// // // // // // // // // // // // // //         {/* Header Section */}
// // // // // // // // // // // // // //         <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // // // //           <div>
// // // // // // // // // // // // // //             <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Audit Trail</h1>
// // // // // // // // // // // // // //             <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Detailed consumption timeline</p>
// // // // // // // // // // // // // //           </div>
          
// // // // // // // // // // // // // //           <div style={{ display: 'flex', gap: '8px', background: '#fff', padding: '6px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
// // // // // // // // // // // // // //             <DatePicker
// // // // // // // // // // // // // //               selected={filterDate}
// // // // // // // // // // // // // //               onChange={(date) => setFilterDate(date)}
// // // // // // // // // // // // // //               dateFormat="dd MMM yyyy"
// // // // // // // // // // // // // //               customInput={<input style={{ border: 'none', padding: '4px 8px', fontWeight: '700', width: '110px', outline: 'none', fontSize: '13px' }} />}
// // // // // // // // // // // // // //             />
// // // // // // // // // // // // // //             <button 
// // // // // // // // // // // // // //               onClick={() => setFilterDate(null)}
// // // // // // // // // // // // // //               style={{ background: '#0f172a', border: 'none', color: '#fff', borderRadius: '8px', padding: '4px 12px', fontSize: '11px', cursor: 'pointer' }}
// // // // // // // // // // // // // //             >
// // // // // // // // // // // // // //               Today
// // // // // // // // // // // // // //             </button>
// // // // // // // // // // // // // //           </div>
// // // // // // // // // // // // // //         </div>

// // // // // // // // // // // // // //         {/* Timeline Container */}
// // // // // // // // // // // // // //         <div style={{ position: 'relative', paddingLeft: '32px' }}>
          
// // // // // // // // // // // // // //           {/* Vertical Line */}
// // // // // // // // // // // // // //           <div style={{ position: 'absolute', left: '7px', top: '0', bottom: '0', width: '2px', background: '#e2e8f0' }}></div>

// // // // // // // // // // // // // //           {loading ? (
// // // // // // // // // // // // // //             <div style={{ padding: '20px', color: '#94a3b8' }}>Loading sequence...</div>
// // // // // // // // // // // // // //           ) : processedRows.length === 0 ? (
// // // // // // // // // // // // // //             <div style={{ padding: '20px', color: '#94a3b8' }}>No activity recorded for this date.</div>
// // // // // // // // // // // // // //           ) : (
// // // // // // // // // // // // // //             processedRows.map((r, idx) => (
// // // // // // // // // // // // // //               <div key={r._id} style={{ position: 'relative', marginBottom: '32px' }}>
                
// // // // // // // // // // // // // //                 {/* Timeline Dot */}
// // // // // // // // // // // // // //                 <div style={{ 
// // // // // // // // // // // // // //                   position: 'absolute', 
// // // // // // // // // // // // // //                   left: '-32px', 
// // // // // // // // // // // // // //                   top: '4px', 
// // // // // // // // // // // // // //                   width: '16px', 
// // // // // // // // // // // // // //                   height: '16px', 
// // // // // // // // // // // // // //                   borderRadius: '50%', 
// // // // // // // // // // // // // //                   background: '#fff', 
// // // // // // // // // // // // // //                   border: '3px solid #3b82f6',
// // // // // // // // // // // // // //                   zIndex: 2 
// // // // // // // // // // // // // //                 }}></div>

// // // // // // // // // // // // // //                 {/* Content Card */}
// // // // // // // // // // // // // //                 <div className="panel" style={{ margin: 0, padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
// // // // // // // // // // // // // //                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
// // // // // // // // // // // // // //                     <div>
// // // // // // // // // // // // // //                       <span style={{ fontSize: '11px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px' }}>
// // // // // // // // // // // // // //                         {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
// // // // // // // // // // // // // //                       </span>
// // // // // // // // // // // // // //                       <h3 style={{ margin: '4px 0', fontSize: '16px', color: '#1e293b' }}>
// // // // // // // // // // // // // //                         {r.userId?.name || "System User"} 
// // // // // // // // // // // // // //                         <span style={{ fontWeight: '400', color: '#64748b', fontSize: '14px' }}> processed a consumption</span>
// // // // // // // // // // // // // //                       </h3>
// // // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // // //                     <div style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', color: '#475569' }}>
// // // // // // // // // // // // // //                       {r.godownId?.name || "Main Warehouse"}
// // // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // // //                   </div>

// // // // // // // // // // // // // //                   {/* Item Chips */}
// // // // // // // // // // // // // //                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
// // // // // // // // // // // // // //                     {(r.items || []).map((item, i) => (
// // // // // // // // // // // // // //                       <div key={i} style={{ 
// // // // // // // // // // // // // //                         display: 'flex', 
// // // // // // // // // // // // // //                         alignItems: 'center', 
// // // // // // // // // // // // // //                         gap: '8px', 
// // // // // // // // // // // // // //                         background: '#fff', 
// // // // // // // // // // // // // //                         border: '1px solid #e2e8f0', 
// // // // // // // // // // // // // //                         padding: '6px 12px', 
// // // // // // // // // // // // // //                         borderRadius: '10px' 
// // // // // // // // // // // // // //                       }}>
// // // // // // // // // // // // // //                         <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>{item.stockItemId?.name}</span>
// // // // // // // // // // // // // //                         <span style={{ width: '1px', height: '12px', background: '#e2e8f0' }}></span>
// // // // // // // // // // // // // //                         <span style={{ fontSize: '13px', fontWeight: '800', color: '#ef4444' }}>
// // // // // // // // // // // // // //                           -{item.qtyBaseUnit} <small style={{ fontWeight: '400', fontSize: '10px' }}>{item.stockItemId?.unitId?.symbol}</small>
// // // // // // // // // // // // // //                         </span>
// // // // // // // // // // // // // //                       </div>
// // // // // // // // // // // // // //                     ))}
// // // // // // // // // // // // // //                   </div>
                  
// // // // // // // // // // // // // //                   <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // // // // // // // // // // // // //                      <code style={{ fontSize: '10px', color: '#94a3b8' }}>REF: {r._id?.slice(-8)}</code>
// // // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // // //                 </div>
// // // // // // // // // // // // // //               </div>
// // // // // // // // // // // // // //             ))
// // // // // // // // // // // // // //           )}
// // // // // // // // // // // // // //         </div>
// // // // // // // // // // // // // //       </div>
// // // // // // // // // // // // // //     </div>
// // // // // // // // // // // // // //   );
// // // // // // // // // // // // // // };








// // // // // // // // // // // // // import { useEffect, useState, useMemo } from "react";
// // // // // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // // // // import DatePicker from "react-datepicker";
// // // // // // // // // // // // // import "react-datepicker/dist/react-datepicker.css";

// // // // // // // // // // // // // export const ConsumptionPage = () => {
// // // // // // // // // // // // //   const [rows, setRows] = useState([]);
// // // // // // // // // // // // //   const [selectedId, setSelectedId] = useState(null);
// // // // // // // // // // // // //   const [filterDate, setFilterDate] = useState(new Date());
// // // // // // // // // // // // //   const [loading, setLoading] = useState(true);

// // // // // // // // // // // // //   useEffect(() => {
// // // // // // // // // // // // //     fetchConsumptions();
// // // // // // // // // // // // //   }, []);

// // // // // // // // // // // // //   const fetchConsumptions = async () => {
// // // // // // // // // // // // //     try {
// // // // // // // // // // // // //       const res = await api.get("/consumptions");
// // // // // // // // // // // // //       setRows(res.data);
// // // // // // // // // // // // //       if (res.data.length > 0) setSelectedId(res.data[0]._id);
// // // // // // // // // // // // //     } catch (err) {
// // // // // // // // // // // // //       console.error("Failed to fetch consumption history");
// // // // // // // // // // // // //     } finally {
// // // // // // // // // // // // //       setLoading(false);
// // // // // // // // // // // // //     }
// // // // // // // // // // // // //   };

// // // // // // // // // // // // //   const processedRows = useMemo(() => {
// // // // // // // // // // // // //     let data = [...rows];
// // // // // // // // // // // // //     if (filterDate) {
// // // // // // // // // // // // //       const selectedStr = filterDate.toISOString().split('T')[0];
// // // // // // // // // // // // //       data = data.filter(r => 
// // // // // // // // // // // // //         new Date(r.createdAt).toISOString().split('T')[0] === selectedStr
// // // // // // // // // // // // //       );
// // // // // // // // // // // // //     }
// // // // // // // // // // // // //     return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // // // // // // // //   }, [rows, filterDate]);

// // // // // // // // // // // // //   const activeRecord = useMemo(() => 
// // // // // // // // // // // // //     processedRows.find(r => r._id === selectedId) || processedRows[0], 
// // // // // // // // // // // // //   [selectedId, processedRows]);

// // // // // // // // // // // // //   return (
// // // // // // // // // // // // //     <div className="main" style={{ height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '20px' }}>
      
// // // // // // // // // // // // //       {/* 1. Slim Top Bar */}
// // // // // // // // // // // // //       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
// // // // // // // // // // // // //         <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
// // // // // // // // // // // // //           Consumption <span style={{ color: '#6366f1' }}>Explorer</span>
// // // // // // // // // // // // //         </h2>
// // // // // // // // // // // // //         <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#fff', padding: '5px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
// // // // // // // // // // // // //           <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8' }}>BROWSE DATE:</span>
// // // // // // // // // // // // //           <DatePicker
// // // // // // // // // // // // //             selected={filterDate}
// // // // // // // // // // // // //             onChange={(date) => setFilterDate(date)}
// // // // // // // // // // // // //             dateFormat="dd/MM/yyyy"
// // // // // // // // // // // // //             customInput={<input style={{ border: 'none', fontWeight: '700', width: '90px', outline: 'none' }} />}
// // // // // // // // // // // // //           />
// // // // // // // // // // // // //         </div>
// // // // // // // // // // // // //       </div>

// // // // // // // // // // // // //       {/* 2. Main Explorer Body */}
// // // // // // // // // // // // //       <div style={{ display: 'flex', flex: 1, gap: '20px', overflow: 'hidden' }}>
        
// // // // // // // // // // // // //         {/* LEFT: Scrollable List */}
// // // // // // // // // // // // //         <div style={{ width: '350px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
// // // // // // // // // // // // //           {loading ? (
// // // // // // // // // // // // //             <div style={{ padding: '20px', color: '#94a3b8' }}>Loading logs...</div>
// // // // // // // // // // // // //           ) : processedRows.map(r => (
// // // // // // // // // // // // //             <div 
// // // // // // // // // // // // //               key={r._id}
// // // // // // // // // // // // //               onClick={() => setSelectedId(r._id)}
// // // // // // // // // // // // //               style={{
// // // // // // // // // // // // //                 padding: '16px',
// // // // // // // // // // // // //                 cursor: 'pointer',
// // // // // // // // // // // // //                 borderBottom: '1px solid #f1f5f9',
// // // // // // // // // // // // //                 background: selectedId === r._id ? '#f5f7ff' : 'transparent',
// // // // // // // // // // // // //                 borderLeft: selectedId === r._id ? '4px solid #6366f1' : '4px solid transparent',
// // // // // // // // // // // // //                 transition: 'all 0.2s'
// // // // // // // // // // // // //               }}
// // // // // // // // // // // // //             >
// // // // // // // // // // // // //               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
// // // // // // // // // // // // //                 <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b' }}>{r.userId?.name || "Staff"}</span>
// // // // // // // // // // // // //                 <span style={{ fontSize: '10px', color: '#6366f1', fontWeight: 'bold' }}>
// // // // // // // // // // // // //                    {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
// // // // // // // // // // // // //                 </span>
// // // // // // // // // // // // //               </div>
// // // // // // // // // // // // //               <div style={{ fontSize: '11px', color: '#64748b' }}>{r.items?.length || 0} items consumed at {r.godownId?.name}</div>
// // // // // // // // // // // // //             </div>
// // // // // // // // // // // // //           ))}
// // // // // // // // // // // // //         </div>

// // // // // // // // // // // // //         {/* RIGHT: Detail View */}
// // // // // // // // // // // // //         <div style={{ flex: 1, background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
// // // // // // // // // // // // //           {activeRecord ? (
// // // // // // // // // // // // //             <>
// // // // // // // // // // // // //               {/* Detail Header */}
// // // // // // // // // // // // //               <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
// // // // // // // // // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
// // // // // // // // // // // // //                   <div>
// // // // // // // // // // // // //                     <div style={{ background: '#e0e7ff', color: '#4338ca', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '900', display: 'inline-block', marginBottom: '8px' }}>
// // // // // // // // // // // // //                       TRANSACTION RECORD
// // // // // // // // // // // // //                     </div>
// // // // // // // // // // // // //                     <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>Consumption #{activeRecord._id?.slice(-6).toUpperCase()}</h1>
// // // // // // // // // // // // //                     <p style={{ margin: '4px 0', color: '#64748b' }}>Issued on {new Date(activeRecord.createdAt).toLocaleString()}</p>
// // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // //                   <div style={{ textAlign: 'right' }}>
// // // // // // // // // // // // //                     <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8' }}>LOCATION</div>
// // // // // // // // // // // // //                     <div style={{ fontWeight: '800', color: '#1e293b' }}>{activeRecord.godownId?.name}</div>
// // // // // // // // // // // // //                   </div>
// // // // // // // // // // // // //                 </div>
// // // // // // // // // // // // //               </div>

// // // // // // // // // // // // //               {/* Detail Items */}
// // // // // // // // // // // // //               <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
// // // // // // // // // // // // //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // // // // //                   <thead>
// // // // // // // // // // // // //                     <tr style={{ textAlign: 'left' }}>
// // // // // // // // // // // // //                       <th style={{ padding: '12px 0', fontSize: '11px', color: '#94a3b8', borderBottom: '2px solid #f1f5f9' }}>ITEM NAME</th>
// // // // // // // // // // // // //                       <th style={{ padding: '12px 0', fontSize: '11px', color: '#94a3b8', borderBottom: '2px solid #f1f5f9', textAlign: 'right' }}>QUANTITY</th>
// // // // // // // // // // // // //                     </tr>
// // // // // // // // // // // // //                   </thead>
// // // // // // // // // // // // //                   <tbody>
// // // // // // // // // // // // //                     {(activeRecord.items || []).map((item, idx) => (
// // // // // // // // // // // // //                       <tr key={idx}>
// // // // // // // // // // // // //                         <td style={{ padding: '16px 0', fontWeight: '700', color: '#334155', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // // //                           {item.stockItemId?.name}
// // // // // // // // // // // // //                         </td>
// // // // // // // // // // // // //                         <td style={{ padding: '16px 0', fontWeight: '900', color: '#ef4444', textAlign: 'right', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // // //                           -{item.qtyBaseUnit} <small style={{ color: '#94a3b8' }}>{item.stockItemId?.unitId?.symbol}</small>
// // // // // // // // // // // // //                         </td>
// // // // // // // // // // // // //                       </tr>
// // // // // // // // // // // // //                     ))}
// // // // // // // // // // // // //                   </tbody>
// // // // // // // // // // // // //                 </table>
// // // // // // // // // // // // //               </div>

// // // // // // // // // // // // //               {/* Footer */}
// // // // // // // // // // // // //               <div style={{ padding: '20px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between' }}>
// // // // // // // // // // // // //                 <span style={{ fontSize: '12px', color: '#64748b' }}>Authorized by: <strong>{activeRecord.userId?.name}</strong></span>
// // // // // // // // // // // // //                 <button style={{ background: '#0f172a', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Export PDF</button>
// // // // // // // // // // // // //               </div>
// // // // // // // // // // // // //             </>
// // // // // // // // // // // // //           ) : (
// // // // // // // // // // // // //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// // // // // // // // // // // // //               Select a record from the list to view details
// // // // // // // // // // // // //             </div>
// // // // // // // // // // // // //           )}
// // // // // // // // // // // // //         </div>

// // // // // // // // // // // // //       </div>
// // // // // // // // // // // // //     </div>
// // // // // // // // // // // // //   );
// // // // // // // // // // // // // };




// // // // // // // // // // // // import { useEffect, useState, useMemo } from "react";
// // // // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // // // import DatePicker from "react-datepicker";
// // // // // // // // // // // // import "react-datepicker/dist/react-datepicker.css";

// // // // // // // // // // // // export const ConsumptionPage = () => {
// // // // // // // // // // // //   const [rows, setRows] = useState([]);
// // // // // // // // // // // //   const [selectedId, setSelectedId] = useState(null);
// // // // // // // // // // // //   const [filterDate, setFilterDate] = useState(new Date());
// // // // // // // // // // // //   const [loading, setLoading] = useState(true);

// // // // // // // // // // // //   useEffect(() => {
// // // // // // // // // // // //     fetchConsumptions();
// // // // // // // // // // // //   }, []);

// // // // // // // // // // // //   const fetchConsumptions = async () => {
// // // // // // // // // // // //     try {
// // // // // // // // // // // //       const res = await api.get("/consumptions");
// // // // // // // // // // // //       setRows(res.data);
// // // // // // // // // // // //       if (res.data.length > 0) setSelectedId(res.data[0]._id);
// // // // // // // // // // // //     } catch (err) {
// // // // // // // // // // // //       console.error("Failed to fetch consumption history");
// // // // // // // // // // // //     } finally {
// // // // // // // // // // // //       setLoading(false);
// // // // // // // // // // // //     }
// // // // // // // // // // // //   };

// // // // // // // // // // // //   const processedRows = useMemo(() => {
// // // // // // // // // // // //     let data = [...rows];
// // // // // // // // // // // //     if (filterDate) {
// // // // // // // // // // // //       const selectedStr = filterDate.toISOString().split('T')[0];
// // // // // // // // // // // //       data = data.filter(r => 
// // // // // // // // // // // //         new Date(r.createdAt).toISOString().split('T')[0] === selectedStr
// // // // // // // // // // // //       );
// // // // // // // // // // // //     }
// // // // // // // // // // // //     return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // // // // // // //   }, [rows, filterDate]);

// // // // // // // // // // // //   const activeRecord = useMemo(() => 
// // // // // // // // // // // //     processedRows.find(r => r._id === selectedId) || processedRows[0], 
// // // // // // // // // // // //   [selectedId, processedRows]);

// // // // // // // // // // // //   return (
// // // // // // // // // // // //     <div style={{ 
// // // // // // // // // // // //       height: '100vh', 
// // // // // // // // // // // //       background: '#f1f5f9', 
// // // // // // // // // // // //       display: 'flex', 
// // // // // // // // // // // //       flexDirection: 'column', 
// // // // // // // // // // // //       fontFamily: "'Inter', sans-serif" 
// // // // // // // // // // // //     }}>
      
// // // // // // // // // // // //       {/* 1. Header Area */}
// // // // // // // // // // // //       <div style={{ padding: '24px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // //         <div>
// // // // // // // // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
// // // // // // // // // // // //             <span style={{ color: '#6366f1', fontWeight: '500' }}>  Daily Consumptions  </span>
// // // // // // // // // // // //           </h1>
// // // // // // // // // // // //         </div>
        
// // // // // // // // // // // //         <div style={{ display: 'flex', gap: '12px' }}>
// // // // // // // // // // // //           <div style={{ background: '#f8fafc', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
// // // // // // // // // // // //             <span style={{ fontSize: '11px', fontWeight: '900', color: '#64748b' }}>DATE</span>
// // // // // // // // // // // //             <DatePicker
// // // // // // // // // // // //               selected={filterDate}
// // // // // // // // // // // //               onChange={(date) => setFilterDate(date)}
// // // // // // // // // // // //               dateFormat="MMM d, yyyy"
// // // // // // // // // // // //               customInput={<input style={{ border: 'none', background: 'transparent', fontWeight: '700', width: '100px', outline: 'none', color: '#1e293b' }} />}
// // // // // // // // // // // //             />
// // // // // // // // // // // //           </div>
// // // // // // // // // // // //         </div>
// // // // // // // // // // // //       </div>

// // // // // // // // // // // //       {/* 2. Content Body */}
// // // // // // // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // // // // // // // //         {/* LEFT: Activity Sidebar */}
// // // // // // // // // // // //         <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // // // // // //           <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', paddingLeft: '8px' }}>
// // // // // // // // // // // //             RECENT ACTIVITY ({processedRows.length})
// // // // // // // // // // // //           </div>
// // // // // // // // // // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // // // // // // //             {processedRows.map(r => (
// // // // // // // // // // // //               <div 
// // // // // // // // // // // //                 key={r._id}
// // // // // // // // // // // //                 onClick={() => setSelectedId(r._id)}
// // // // // // // // // // // //                 style={{
// // // // // // // // // // // //                   padding: '16px',
// // // // // // // // // // // //                   borderRadius: '16px',
// // // // // // // // // // // //                   cursor: 'pointer',
// // // // // // // // // // // //                   background: selectedId === r._id ? '#fff' : 'transparent',
// // // // // // // // // // // //                   border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent',
// // // // // // // // // // // //                   boxShadow: selectedId === r._id ? '0 4px 12px rgba(99, 102, 241, 0.1)' : 'none',
// // // // // // // // // // // //                   transition: 'all 0.2s'
// // // // // // // // // // // //                 }}
// // // // // // // // // // // //               >
// // // // // // // // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // // //                   <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b', fontSize: '14px' }}>
// // // // // // // // // // // //                     {r.userId?.name || "Staff Member"}
// // // // // // // // // // // //                   </div>
// // // // // // // // // // // //                   <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
// // // // // // // // // // // //                     {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
// // // // // // // // // // // //                   </div>
// // // // // // // // // // // //                 </div>
// // // // // // // // // // // //                 <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: '500' }}>
// // // // // // // // // // // //                   {r.items?.length} items • {r.godownId?.name || "Warehouse"}
// // // // // // // // // // // //                 </div>
// // // // // // // // // // // //               </div>
// // // // // // // // // // // //             ))}
// // // // // // // // // // // //           </div>
// // // // // // // // // // // //         </div>

// // // // // // // // // // // //         {/* RIGHT: Detail Canvas */}
// // // // // // // // // // // //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // // // // // // // //           {activeRecord ? (
// // // // // // // // // // // //             <>
// // // // // // // // // // // //               {/* Receipt Header */}
// // // // // // // // // // // //               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9' }}>
// // // // // // // // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
// // // // // // // // // // // //                   <div>
// // // // // // // // // // // //                     <span style={{ fontSize: '11px', fontWeight: '900', color: '#6366f1', background: '#eef2ff', padding: '4px 8px', borderRadius: '6px' }}>
// // // // // // // // // // // //                       CONSUMPTION VOUCHER
// // // // // // // // // // // //                     </span>
// // // // // // // // // // // //                     <h2 style={{ margin: '16px 0 8px', fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>
// // // // // // // // // // // //                       #{activeRecord._id?.slice(-6).toUpperCase()}
// // // // // // // // // // // //                     </h2>
// // // // // // // // // // // //                     <div style={{ display: 'flex', gap: '20px' }}>
// // // // // // // // // // // //                       <div>
// // // // // // // // // // // //                         <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8' }}>DATE</div>
// // // // // // // // // // // //                         <div style={{ fontSize: '13px', fontWeight: '600' }}>{new Date(activeRecord.createdAt).toLocaleDateString()}</div>
// // // // // // // // // // // //                       </div>
// // // // // // // // // // // //                       <div>
// // // // // // // // // // // //                         <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8' }}>TIME</div>
// // // // // // // // // // // //                         <div style={{ fontSize: '13px', fontWeight: '600' }}>{new Date(activeRecord.createdAt).toLocaleTimeString()}</div>
// // // // // // // // // // // //                       </div>
// // // // // // // // // // // //                     </div>
// // // // // // // // // // // //                   </div>
                  
// // // // // // // // // // // //                   <div style={{ textAlign: 'right' }}>
// // // // // // // // // // // //                     <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8' }}>AUTHORIZED BY</div>
// // // // // // // // // // // //                     <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>{activeRecord.userId?.name}</div>
// // // // // // // // // // // //                     <div style={{ fontSize: '12px', color: '#64748b' }}>{activeRecord.godownId?.name}</div>
// // // // // // // // // // // //                   </div>
// // // // // // // // // // // //                 </div>
// // // // // // // // // // // //               </div>

// // // // // // // // // // // //               {/* Items Table */}
// // // // // // // // // // // //               <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // // // // // // // //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // // // //                   <thead>
// // // // // // // // // // // //                     <tr style={{ textAlign: 'left' }}>
// // // // // // // // // // // //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '800', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>STOCK ITEM</th>
// // // // // // // // // // // //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '800', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>QUANTITY</th>
// // // // // // // // // // // //                     </tr>
// // // // // // // // // // // //                   </thead>
// // // // // // // // // // // //                   <tbody>
// // // // // // // // // // // //                     {(activeRecord.items || []).map((item, idx) => (
// // // // // // // // // // // //                       <tr key={idx}>
// // // // // // // // // // // //                         <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // //                           <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '15px' }}>{item.stockItemId?.name}</div>
// // // // // // // // // // // //                           <div style={{ fontSize: '11px', color: '#94a3b8' }}>Batch: Auto-Allocated</div>
// // // // // // // // // // // //                         </td>
// // // // // // // // // // // //                         <td style={{ padding: '20px 0', textAlign: 'right', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // // //                           <span style={{ fontWeight: '800', color: '#ef4444', fontSize: '16px' }}>
// // // // // // // // // // // //                             -{item.qtyBaseUnit}
// // // // // // // // // // // //                           </span>
// // // // // // // // // // // //                           <span style={{ marginLeft: '4px', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
// // // // // // // // // // // //                             {item.stockItemId?.unitId?.symbol}
// // // // // // // // // // // //                           </span>
// // // // // // // // // // // //                         </td>
// // // // // // // // // // // //                       </tr>
// // // // // // // // // // // //                     ))}
// // // // // // // // // // // //                   </tbody>
// // // // // // // // // // // //                 </table>
// // // // // // // // // // // //               </div>

// // // // // // // // // // // //               {/* Action Footer */}
// // // // // // // // // // // //               <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // // // // // // // //                 <button style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#475569', padding: '10px 20px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
// // // // // // // // // // // //                   Print Receipt
// // // // // // // // // // // //                 </button>
// // // // // // // // // // // //                 <button style={{ background: '#0f172a', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
// // // // // // // // // // // //                   Download PDF
// // // // // // // // // // // //                 </button>
// // // // // // // // // // // //               </div>
// // // // // // // // // // // //             </>
// // // // // // // // // // // //           ) : (
// // // // // // // // // // // //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#94a3b8' }}>
// // // // // // // // // // // //               <div style={{ fontSize: '40px', marginBottom: '16px' }}>📝</div>
// // // // // // // // // // // //               <div style={{ fontWeight: '600' }}>Select a log to view full details</div>
// // // // // // // // // // // //             </div>
// // // // // // // // // // // //           )}
// // // // // // // // // // // //         </div>

// // // // // // // // // // // //       </div>
// // // // // // // // // // // //     </div>
// // // // // // // // // // // //   );
// // // // // // // // // // // // };









// // // // // // // // // // // import { useEffect, useState, useMemo } from "react";
// // // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // // import DatePicker from "react-datepicker";
// // // // // // // // // // // import "react-datepicker/dist/react-datepicker.css";

// // // // // // // // // // // export const ConsumptionPage = () => {
// // // // // // // // // // //   const [rows, setRows] = useState([]);
// // // // // // // // // // //   const [selectedId, setSelectedId] = useState(null);
// // // // // // // // // // //   const [filterDate, setFilterDate] = useState(new Date());
// // // // // // // // // // //   const [loading, setLoading] = useState(true);

// // // // // // // // // // //   useEffect(() => {
// // // // // // // // // // //     fetchConsumptions();
// // // // // // // // // // //   }, []);

// // // // // // // // // // //   const fetchConsumptions = async () => {
// // // // // // // // // // //     try {
// // // // // // // // // // //       const res = await api.get("/consumptions");
// // // // // // // // // // //       setRows(res.data);
// // // // // // // // // // //       if (res.data.length > 0) setSelectedId(res.data[0]._id);
// // // // // // // // // // //     } catch (err) {
// // // // // // // // // // //       console.error("Failed to fetch consumption history");
// // // // // // // // // // //     } finally {
// // // // // // // // // // //       setLoading(false);
// // // // // // // // // // //     }
// // // // // // // // // // //   };

// // // // // // // // // // //   const processedRows = useMemo(() => {
// // // // // // // // // // //     let data = [...rows];
// // // // // // // // // // //     if (filterDate) {
// // // // // // // // // // //       const selectedStr = filterDate.toISOString().split('T')[0];
// // // // // // // // // // //       data = data.filter(r => 
// // // // // // // // // // //         new Date(r.createdAt).toISOString().split('T')[0] === selectedStr
// // // // // // // // // // //       );
// // // // // // // // // // //     }
// // // // // // // // // // //     return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // // // // // //   }, [rows, filterDate]);

// // // // // // // // // // //   const activeRecord = useMemo(() => 
// // // // // // // // // // //     processedRows.find(r => r._id === selectedId) || processedRows[0], 
// // // // // // // // // // //   [selectedId, processedRows]);

// // // // // // // // // // //   return (
// // // // // // // // // // //     <div style={{ 
// // // // // // // // // // //       height: '100vh', 
// // // // // // // // // // //       background: '#f1f5f9', 
// // // // // // // // // // //       display: 'flex', 
// // // // // // // // // // //       flexDirection: 'column', 
// // // // // // // // // // //       fontFamily: "'Inter', sans-serif" 
// // // // // // // // // // //     }}>
      
// // // // // // // // // // //       {/* 1. Header Area */}
// // // // // // // // // // //       <div style={{ padding: '24px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // //         <div>
// // // // // // // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
// // // // // // // // // // //             <span style={{ color: '#6366f1', fontWeight: '500' }}>Daily Consumptions</span>
// // // // // // // // // // //           </h1>
// // // // // // // // // // //         </div>
        
// // // // // // // // // // //         <div style={{ display: 'flex', gap: '12px' }}>
// // // // // // // // // // //           <div style={{ background: '#f8fafc', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
// // // // // // // // // // //             <span style={{ fontSize: '11px', fontWeight: '900', color: '#64748b' }}>DATE</span>
// // // // // // // // // // //             <DatePicker
// // // // // // // // // // //               selected={filterDate}
// // // // // // // // // // //               onChange={(date) => setFilterDate(date)}
// // // // // // // // // // //               dateFormat="MMM d, yyyy"
// // // // // // // // // // //               customInput={<input style={{ border: 'none', background: 'transparent', fontWeight: '700', width: '100px', outline: 'none', color: '#1e293b' }} />}
// // // // // // // // // // //             />
// // // // // // // // // // //           </div>
// // // // // // // // // // //         </div>
// // // // // // // // // // //       </div>

// // // // // // // // // // //       {/* 2. Content Body */}
// // // // // // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // // // // // // //         {/* LEFT: Activity Sidebar */}
// // // // // // // // // // //         <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // // // // //           <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', paddingLeft: '8px' }}>
// // // // // // // // // // //             RECENT ACTIVITY ({processedRows.length})
// // // // // // // // // // //           </div>
// // // // // // // // // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // // // // // //             {processedRows.map(r => (
// // // // // // // // // // //               <div 
// // // // // // // // // // //                 key={r._id}
// // // // // // // // // // //                 onClick={() => setSelectedId(r._id)}
// // // // // // // // // // //                 style={{
// // // // // // // // // // //                   padding: '16px',
// // // // // // // // // // //                   borderRadius: '16px',
// // // // // // // // // // //                   cursor: 'pointer',
// // // // // // // // // // //                   background: selectedId === r._id ? '#fff' : 'transparent',
// // // // // // // // // // //                   border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent',
// // // // // // // // // // //                   boxShadow: selectedId === r._id ? '0 4px 12px rgba(99, 102, 241, 0.1)' : 'none',
// // // // // // // // // // //                   transition: 'all 0.2s'
// // // // // // // // // // //                 }}
// // // // // // // // // // //               >
// // // // // // // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // // //                   <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b', fontSize: '14px' }}>
// // // // // // // // // // //                     {r.userId?.name || "Staff Member"}
// // // // // // // // // // //                   </div>
// // // // // // // // // // //                   <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
// // // // // // // // // // //                     {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
// // // // // // // // // // //                   </div>
// // // // // // // // // // //                 </div>
// // // // // // // // // // //                 <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: '500' }}>
// // // // // // // // // // //                   {r.items?.length} items • {r.godownId?.name || "Warehouse"}
// // // // // // // // // // //                 </div>
// // // // // // // // // // //               </div>
// // // // // // // // // // //             ))}
// // // // // // // // // // //           </div>
// // // // // // // // // // //         </div>

// // // // // // // // // // //         {/* RIGHT: Detail Canvas */}
// // // // // // // // // // //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // // // // // // //           {activeRecord ? (
// // // // // // // // // // //             <>
// // // // // // // // // // //               {/* Simplified Header */}
// // // // // // // // // // //               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9' }}>
// // // // // // // // // // //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
// // // // // // // // // // //                   <div>
// // // // // // // // // // //                     <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', marginBottom: '4px' }}>DATE</div>
// // // // // // // // // // //                     <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
// // // // // // // // // // //                       {new Date(activeRecord.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
// // // // // // // // // // //                     </div>
// // // // // // // // // // //                   </div>
                  
// // // // // // // // // // //                   <div>
// // // // // // // // // // //                     <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', marginBottom: '4px' }}>TIME</div>
// // // // // // // // // // //                     <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
// // // // // // // // // // //                       {new Date(activeRecord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
// // // // // // // // // // //                     </div>
// // // // // // // // // // //                   </div>

// // // // // // // // // // //                   <div style={{ textAlign: 'right' }}>
// // // // // // // // // // //                     <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', marginBottom: '4px' }}>AUTHORISED BY</div>
// // // // // // // // // // //                     <div style={{ fontSize: '15px', fontWeight: '700', color: '#6366f1' }}>{activeRecord.userId?.name}</div>
// // // // // // // // // // //                     <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>{activeRecord.godownId?.name}</div>
// // // // // // // // // // //                   </div>
// // // // // // // // // // //                 </div>
// // // // // // // // // // //               </div>

// // // // // // // // // // //               {/* Items Table */}
// // // // // // // // // // //               <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // // // // // // //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // // //                   <thead>
// // // // // // // // // // //                     <tr style={{ textAlign: 'left' }}>
// // // // // // // // // // //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '800', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>STOCK ITEM</th>
// // // // // // // // // // //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '800', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>QUANTITY</th>
// // // // // // // // // // //                     </tr>
// // // // // // // // // // //                   </thead>
// // // // // // // // // // //                   <tbody>
// // // // // // // // // // //                     {(activeRecord.items || []).map((item, idx) => (
// // // // // // // // // // //                       <tr key={idx}>
// // // // // // // // // // //                         <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // //                           <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '15px' }}>{item.stockItemId?.name}</div>
// // // // // // // // // // //                           <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {item.stockItemId?._id?.slice(-6).toUpperCase()}</div>
// // // // // // // // // // //                         </td>
// // // // // // // // // // //                         <td style={{ padding: '20px 0', textAlign: 'right', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // // //                           <span style={{ fontWeight: '800', color: '#ef4444', fontSize: '16px' }}>
// // // // // // // // // // //                             -{item.qtyBaseUnit}
// // // // // // // // // // //                           </span>
// // // // // // // // // // //                           <span style={{ marginLeft: '4px', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
// // // // // // // // // // //                             {item.stockItemId?.unitId?.symbol}
// // // // // // // // // // //                           </span>
// // // // // // // // // // //                         </td>
// // // // // // // // // // //                       </tr>
// // // // // // // // // // //                     ))}
// // // // // // // // // // //                   </tbody>
// // // // // // // // // // //                 </table>
// // // // // // // // // // //               </div>

// // // // // // // // // // //               {/* Action Footer */}
// // // // // // // // // // //               <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // // // // // // //                 <button style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#475569', padding: '10px 20px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
// // // // // // // // // // //                   Print Receipt
// // // // // // // // // // //                 </button>
// // // // // // // // // // //                 <button style={{ background: '#0f172a', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
// // // // // // // // // // //                   Download PDF
// // // // // // // // // // //                 </button>
// // // // // // // // // // //               </div>
// // // // // // // // // // //             </>
// // // // // // // // // // //           ) : (
// // // // // // // // // // //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#94a3b8' }}>
// // // // // // // // // // //               <div style={{ fontSize: '40px', marginBottom: '16px' }}>📝</div>
// // // // // // // // // // //               <div style={{ fontWeight: '600' }}>Select a record to view details</div>
// // // // // // // // // // //             </div>
// // // // // // // // // // //           )}
// // // // // // // // // // //         </div>

// // // // // // // // // // //       </div>
// // // // // // // // // // //     </div>
// // // // // // // // // // //   );
// // // // // // // // // // // };





// // // // // // // // // // import { useEffect, useState, useMemo } from "react";
// // // // // // // // // // import { api } from "../api.js";
// // // // // // // // // // import DatePicker from "react-datepicker";
// // // // // // // // // // import "react-datepicker/dist/react-datepicker.css";

// // // // // // // // // // export const ConsumptionPage = () => {
// // // // // // // // // //   const [rows, setRows] = useState([]);
// // // // // // // // // //   const [selectedId, setSelectedId] = useState(null);
// // // // // // // // // //   const [filterDate, setFilterDate] = useState(new Date());
// // // // // // // // // //   const [loading, setLoading] = useState(true);

// // // // // // // // // //   useEffect(() => {
// // // // // // // // // //     fetchConsumptions();
// // // // // // // // // //   }, []);

// // // // // // // // // //   const fetchConsumptions = async () => {
// // // // // // // // // //     try {
// // // // // // // // // //       const res = await api.get("/consumptions");
// // // // // // // // // //       setRows(res.data);
// // // // // // // // // //       if (res.data.length > 0) setSelectedId(res.data[0]._id);
// // // // // // // // // //     } catch (err) {
// // // // // // // // // //       console.error("Failed to fetch consumption history");
// // // // // // // // // //     } finally {
// // // // // // // // // //       setLoading(false);
// // // // // // // // // //     }
// // // // // // // // // //   };

// // // // // // // // // //   const processedRows = useMemo(() => {
// // // // // // // // // //     let data = [...rows];
// // // // // // // // // //     if (filterDate) {
// // // // // // // // // //       const selectedStr = filterDate.toISOString().split('T')[0];
// // // // // // // // // //       data = data.filter(r => 
// // // // // // // // // //         new Date(r.createdAt).toISOString().split('T')[0] === selectedStr
// // // // // // // // // //       );
// // // // // // // // // //     }
// // // // // // // // // //     return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // // // // //   }, [rows, filterDate]);

// // // // // // // // // //   const activeRecord = useMemo(() => 
// // // // // // // // // //     processedRows.find(r => r._id === selectedId) || processedRows[0], 
// // // // // // // // // //   [selectedId, processedRows]);

// // // // // // // // // //   return (
// // // // // // // // // //     <div style={{ 
// // // // // // // // // //       height: '100vh', 
// // // // // // // // // //       background: '#f1f5f9', 
// // // // // // // // // //       display: 'flex', 
// // // // // // // // // //       flexDirection: 'column', 
// // // // // // // // // //       fontFamily: "'Inter', sans-serif" 
// // // // // // // // // //     }}>
      
// // // // // // // // // //       {/* 1. Header Area */}
// // // // // // // // // //       <div style={{ padding: '24px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // //         <div>
// // // // // // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
// // // // // // // // // //             <span style={{ color: '#6366f1', fontWeight: '500' }}>Daily Consumptions</span>
// // // // // // // // // //           </h1>
// // // // // // // // // //         </div>
        
// // // // // // // // // //         <div style={{ display: 'flex', gap: '12px' }}>
// // // // // // // // // //           <div style={{ background: '#f8fafc', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
// // // // // // // // // //             <span style={{ fontSize: '11px', fontWeight: '900', color: '#1e293b' }}>DATE</span>
// // // // // // // // // //             <DatePicker
// // // // // // // // // //               selected={filterDate}
// // // // // // // // // //               onChange={(date) => setFilterDate(date)}
// // // // // // // // // //               dateFormat="MMM d, yyyy"
// // // // // // // // // //               customInput={<input style={{ border: 'none', background: 'transparent', fontWeight: '700', width: '100px', outline: 'none', color: '#1e293b' }} />}
// // // // // // // // // //             />
// // // // // // // // // //           </div>
// // // // // // // // // //         </div>
// // // // // // // // // //       </div>

// // // // // // // // // //       {/* 2. Content Body */}
// // // // // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // // // // // //         {/* LEFT: Activity Sidebar */}
// // // // // // // // // //         <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // // // //           <div style={{ fontSize: '12px', fontWeight: '900', color: '#1e293b', paddingLeft: '8px' }}>
// // // // // // // // // //             RECENT ACTIVITY ({processedRows.length})
// // // // // // // // // //           </div>
// // // // // // // // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // // // // //             {processedRows.map(r => (
// // // // // // // // // //               <div 
// // // // // // // // // //                 key={r._id}
// // // // // // // // // //                 onClick={() => setSelectedId(r._id)}
// // // // // // // // // //                 style={{
// // // // // // // // // //                   padding: '16px',
// // // // // // // // // //                   borderRadius: '16px',
// // // // // // // // // //                   cursor: 'pointer',
// // // // // // // // // //                   background: selectedId === r._id ? '#fff' : 'transparent',
// // // // // // // // // //                   border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent',
// // // // // // // // // //                   boxShadow: selectedId === r._id ? '0 4px 12px rgba(99, 102, 241, 0.1)' : 'none',
// // // // // // // // // //                   transition: 'all 0.2s'
// // // // // // // // // //                 }}
// // // // // // // // // //               >
// // // // // // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // // //                   <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b', fontSize: '14px' }}>
// // // // // // // // // //                     {r.userId?.name || "Staff Member"}
// // // // // // // // // //                   </div>
// // // // // // // // // //                   <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
// // // // // // // // // //                     {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
// // // // // // // // // //                   </div>
// // // // // // // // // //                 </div>
// // // // // // // // // //                 <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: '500' }}>
// // // // // // // // // //                   {r.items?.length} items • {r.godownId?.name || "Warehouse"}
// // // // // // // // // //                 </div>
// // // // // // // // // //               </div>
// // // // // // // // // //             ))}
// // // // // // // // // //           </div>
// // // // // // // // // //         </div>

// // // // // // // // // //         {/* RIGHT: Detail Canvas */}
// // // // // // // // // //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // // // // // //           {activeRecord ? (
// // // // // // // // // //             <>
// // // // // // // // // //               {/* Header Info */}
// // // // // // // // // //               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9' }}>
// // // // // // // // // //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
// // // // // // // // // //                   <div>
// // // // // // // // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#0f172a', marginBottom: '4px', letterSpacing: '0.5px' }}>DATE</div>
// // // // // // // // // //                     <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
// // // // // // // // // //                       {new Date(activeRecord.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
// // // // // // // // // //                     </div>
// // // // // // // // // //                   </div>
                  
// // // // // // // // // //                   <div>
// // // // // // // // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#0f172a', marginBottom: '4px', letterSpacing: '0.5px' }}>TIME</div>
// // // // // // // // // //                     <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
// // // // // // // // // //                       {new Date(activeRecord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
// // // // // // // // // //                     </div>
// // // // // // // // // //                   </div>

// // // // // // // // // //                   <div style={{ textAlign: 'right' }}>
// // // // // // // // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#0f172a', marginBottom: '4px', letterSpacing: '0.5px' }}>AUTHORISED BY</div>
// // // // // // // // // //                     <div style={{ fontSize: '15px', fontWeight: '700', color: '#6366f1' }}>{activeRecord.userId?.name}</div>
// // // // // // // // // //                     <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>{activeRecord.godownId?.name}</div>
// // // // // // // // // //                   </div>
// // // // // // // // // //                 </div>
// // // // // // // // // //               </div>

// // // // // // // // // //               {/* Items Table */}
// // // // // // // // // //               <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // // // // // //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // // //                   <thead>
// // // // // // // // // //                     <tr style={{ textAlign: 'left' }}>
// // // // // // // // // //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0', letterSpacing: '0.5px' }}>STOCK ITEM</th>
// // // // // // // // // //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0', textAlign: 'right', letterSpacing: '0.5px' }}>QUANTITY</th>
// // // // // // // // // //                     </tr>
// // // // // // // // // //                   </thead>
// // // // // // // // // //                   <tbody>
// // // // // // // // // //                     {(activeRecord.items || []).map((item, idx) => (
// // // // // // // // // //                       <tr key={idx}>
// // // // // // // // // //                         <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // //                           <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '15px' }}>{item.stockItemId?.name}</div>
// // // // // // // // // //                           <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {item.stockItemId?._id?.slice(-6).toUpperCase()}</div>
// // // // // // // // // //                         </td>
// // // // // // // // // //                         <td style={{ padding: '20px 0', textAlign: 'right', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // // //                           <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '16px' }}>
// // // // // // // // // //                             {item.qtyBaseUnit}
// // // // // // // // // //                           </span>
// // // // // // // // // //                           <span style={{ marginLeft: '4px', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
// // // // // // // // // //                             {item.stockItemId?.unitId?.symbol}
// // // // // // // // // //                           </span>
// // // // // // // // // //                         </td>
// // // // // // // // // //                       </tr>
// // // // // // // // // //                     ))}
// // // // // // // // // //                   </tbody>
// // // // // // // // // //                 </table>
// // // // // // // // // //               </div>

// // // // // // // // // //               {/* Action Footer */}
// // // // // // // // // //               <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // // // // // //                 <button style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#475569', padding: '10px 20px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
// // // // // // // // // //                   Print Receipt
// // // // // // // // // //                 </button>
// // // // // // // // // //                 <button style={{ background: '#0f172a', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
// // // // // // // // // //                   Download PDF
// // // // // // // // // //                 </button>
// // // // // // // // // //               </div>
// // // // // // // // // //             </>
// // // // // // // // // //           ) : (
// // // // // // // // // //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#94a3b8' }}>
// // // // // // // // // //               <div style={{ fontSize: '40px', marginBottom: '16px' }}>📝</div>
// // // // // // // // // //               <div style={{ fontWeight: '600' }}>Select a record to view details</div>
// // // // // // // // // //             </div>
// // // // // // // // // //           )}
// // // // // // // // // //         </div>

// // // // // // // // // //       </div>
// // // // // // // // // //     </div>
// // // // // // // // // //   );
// // // // // // // // // // };







// // // // // // // // // import { useEffect, useState, useMemo } from "react";
// // // // // // // // // import { api } from "../api.js";
// // // // // // // // // import DatePicker from "react-datepicker";
// // // // // // // // // import "react-datepicker/dist/react-datepicker.css";

// // // // // // // // // export const ConsumptionPage = () => {
// // // // // // // // //   const [rows, setRows] = useState([]);
// // // // // // // // //   const [selectedId, setSelectedId] = useState(null);
// // // // // // // // //   const [filterDate, setFilterDate] = useState(new Date());
// // // // // // // // //   const [loading, setLoading] = useState(true);

// // // // // // // // //   useEffect(() => {
// // // // // // // // //     fetchConsumptions();
// // // // // // // // //   }, []);

// // // // // // // // //   const fetchConsumptions = async () => {
// // // // // // // // //     try {
// // // // // // // // //       const res = await api.get("/consumptions");
// // // // // // // // //       setRows(res.data);
// // // // // // // // //       if (res.data.length > 0) setSelectedId(res.data[0]._id);
// // // // // // // // //     } catch (err) {
// // // // // // // // //       console.error("Failed to fetch consumption history");
// // // // // // // // //     } finally {
// // // // // // // // //       setLoading(false);
// // // // // // // // //     }
// // // // // // // // //   };

// // // // // // // // //   const processedRows = useMemo(() => {
// // // // // // // // //     let data = [...rows];
// // // // // // // // //     if (filterDate) {
// // // // // // // // //       const selectedStr = filterDate.toISOString().split('T')[0];
// // // // // // // // //       data = data.filter(r => 
// // // // // // // // //         new Date(r.createdAt).toISOString().split('T')[0] === selectedStr
// // // // // // // // //       );
// // // // // // // // //     }
// // // // // // // // //     return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // // // //   }, [rows, filterDate]);

// // // // // // // // //   const activeRecord = useMemo(() => 
// // // // // // // // //     processedRows.find(r => r._id === selectedId) || processedRows[0], 
// // // // // // // // //   [selectedId, processedRows]);

// // // // // // // // //   return (
// // // // // // // // //     <div style={{ 
// // // // // // // // //       height: '100vh', 
// // // // // // // // //       background: '#f1f5f9', 
// // // // // // // // //       display: 'flex', 
// // // // // // // // //       flexDirection: 'column', 
// // // // // // // // //       fontFamily: "'Inter', sans-serif" 
// // // // // // // // //     }}>
      
// // // // // // // // //       {/* 1. Header Area */}
// // // // // // // // //       <div style={{ padding: '24px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // //         <div>
// // // // // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
// // // // // // // // //             <span style={{ color: '#6366f1', fontWeight: '500' }}>Daily Consumptions</span>
// // // // // // // // //           </h1>
// // // // // // // // //         </div>
        
// // // // // // // // //         <div style={{ display: 'flex', gap: '12px' }}>
// // // // // // // // //           <div style={{ background: '#f8fafc', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
// // // // // // // // //             <span style={{ fontSize: '11px', fontWeight: '900', color: '#6366f1' }}>DATE</span>
// // // // // // // // //             <DatePicker
// // // // // // // // //               selected={filterDate}
// // // // // // // // //               onChange={(date) => setFilterDate(date)}
// // // // // // // // //               dateFormat="MMM d, yyyy"
// // // // // // // // //               customInput={<input style={{ border: 'none', background: 'transparent', fontWeight: '700', width: '100px', outline: 'none', color: '#1e293b' }} />}
// // // // // // // // //             />
// // // // // // // // //           </div>
// // // // // // // // //         </div>
// // // // // // // // //       </div>

// // // // // // // // //       {/* 2. Content Body */}
// // // // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // // // // //         {/* LEFT: Activity Sidebar */}
// // // // // // // // //         <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // // //           <div style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', paddingLeft: '8px' }}>
// // // // // // // // //             RECENT ACTIVITY ({processedRows.length})
// // // // // // // // //           </div>
// // // // // // // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // // // //             {processedRows.map(r => (
// // // // // // // // //               <div 
// // // // // // // // //                 key={r._id}
// // // // // // // // //                 onClick={() => setSelectedId(r._id)}
// // // // // // // // //                 style={{
// // // // // // // // //                   padding: '16px',
// // // // // // // // //                   borderRadius: '16px',
// // // // // // // // //                   cursor: 'pointer',
// // // // // // // // //                   background: selectedId === r._id ? '#fff' : 'transparent',
// // // // // // // // //                   border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent',
// // // // // // // // //                   boxShadow: selectedId === r._id ? '0 4px 12px rgba(99, 102, 241, 0.1)' : 'none',
// // // // // // // // //                   transition: 'all 0.2s'
// // // // // // // // //                 }}
// // // // // // // // //               >
// // // // // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // // //                   <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b', fontSize: '14px' }}>
// // // // // // // // //                     {r.userId?.name || "Staff Member"}
// // // // // // // // //                   </div>
// // // // // // // // //                   <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
// // // // // // // // //                     {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
// // // // // // // // //                   </div>
// // // // // // // // //                 </div>
// // // // // // // // //                 <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: '500' }}>
// // // // // // // // //                   {r.items?.length} items • {r.godownId?.name || "Warehouse"}
// // // // // // // // //                 </div>
// // // // // // // // //               </div>
// // // // // // // // //             ))}
// // // // // // // // //           </div>
// // // // // // // // //         </div>

// // // // // // // // //         {/* RIGHT: Detail Canvas */}
// // // // // // // // //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // // // // //           {activeRecord ? (
// // // // // // // // //             <>
// // // // // // // // //               {/* Info Header */}
// // // // // // // // //               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9' }}>
// // // // // // // // //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
// // // // // // // // //                   <div>
// // // // // // // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px', letterSpacing: '0.5px' }}>DATE</div>
// // // // // // // // //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
// // // // // // // // //                       {new Date(activeRecord.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
// // // // // // // // //                     </div>
// // // // // // // // //                   </div>
                  
// // // // // // // // //                   <div>
// // // // // // // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px', letterSpacing: '0.5px' }}>TIME</div>
// // // // // // // // //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
// // // // // // // // //                       {new Date(activeRecord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
// // // // // // // // //                     </div>
// // // // // // // // //                   </div>

// // // // // // // // //                   <div style={{ textAlign: 'right' }}>
// // // // // // // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px', letterSpacing: '0.5px' }}>AUTHORISED BY</div>
// // // // // // // // //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{activeRecord.userId?.name}</div>
// // // // // // // // //                     <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>{activeRecord.godownId?.name}</div>
// // // // // // // // //                   </div>
// // // // // // // // //                 </div>
// // // // // // // // //               </div>

// // // // // // // // //               {/* Items Table */}
// // // // // // // // //               <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // // // // //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // // //                   <thead>
// // // // // // // // //                     <tr style={{ textAlign: 'left' }}>
// // // // // // // // //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0', letterSpacing: '0.5px' }}>STOCK ITEM</th>
// // // // // // // // //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0', textAlign: 'right', letterSpacing: '0.5px' }}>QUANTITY</th>
// // // // // // // // //                     </tr>
// // // // // // // // //                   </thead>
// // // // // // // // //                   <tbody>
// // // // // // // // //                     {(activeRecord.items || []).map((item, idx) => (
// // // // // // // // //                       <tr key={idx}>
// // // // // // // // //                         <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // //                           <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '15px' }}>{item.stockItemId?.name}</div>
// // // // // // // // //                           <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {item.stockItemId?._id?.slice(-6).toUpperCase()}</div>
// // // // // // // // //                         </td>
// // // // // // // // //                         <td style={{ padding: '20px 0', textAlign: 'right', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // // //                           <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '16px' }}>
// // // // // // // // //                             {item.qtyBaseUnit}
// // // // // // // // //                           </span>
// // // // // // // // //                           <span style={{ marginLeft: '4px', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
// // // // // // // // //                             {item.stockItemId?.unitId?.symbol}
// // // // // // // // //                           </span>
// // // // // // // // //                         </td>
// // // // // // // // //                       </tr>
// // // // // // // // //                     ))}
// // // // // // // // //                   </tbody>
// // // // // // // // //                 </table>
// // // // // // // // //               </div>

// // // // // // // // //               {/* Action Footer */}
// // // // // // // // //               <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // // // // //                 <button style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#475569', padding: '10px 20px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
// // // // // // // // //                   Print Receipt
// // // // // // // // //                 </button>
// // // // // // // // //                 <button style={{ background: '#0f172a', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
// // // // // // // // //                   Download PDF
// // // // // // // // //                 </button>
// // // // // // // // //               </div>
// // // // // // // // //             </>
// // // // // // // // //           ) : (
// // // // // // // // //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#94a3b8' }}>
// // // // // // // // //               <div style={{ fontSize: '40px', marginBottom: '16px' }}>📝</div>
// // // // // // // // //               <div style={{ fontWeight: '600' }}>Select a record to view details</div>
// // // // // // // // //             </div>
// // // // // // // // //           )}
// // // // // // // // //         </div>

// // // // // // // // //       </div>
// // // // // // // // //     </div>
// // // // // // // // //   );
// // // // // // // // // };








// // // // // // // // import { useEffect, useState, useMemo } from "react";
// // // // // // // // import { api } from "../api.js";
// // // // // // // // import DatePicker from "react-datepicker";
// // // // // // // // import "react-datepicker/dist/react-datepicker.css";

// // // // // // // // export const ConsumptionPage = () => {
// // // // // // // //   const [rows, setRows] = useState([]);
// // // // // // // //   const [selectedId, setSelectedId] = useState(null);
// // // // // // // //   const [filterDate, setFilterDate] = useState(new Date());
// // // // // // // //   const [searchQuery, setSearchQuery] = useState(""); // New: For User/Godown name
// // // // // // // //   const [loading, setLoading] = useState(true);

// // // // // // // //   useEffect(() => {
// // // // // // // //     fetchConsumptions();
// // // // // // // //   }, []);

// // // // // // // //   const fetchConsumptions = async () => {
// // // // // // // //     try {
// // // // // // // //       const res = await api.get("/consumptions");
// // // // // // // //       setRows(res.data);
// // // // // // // //       if (res.data.length > 0) setSelectedId(res.data[0]._id);
// // // // // // // //     } catch (err) {
// // // // // // // //       console.error("Failed to fetch consumption history");
// // // // // // // //     } finally {
// // // // // // // //       setLoading(false);
// // // // // // // //     }
// // // // // // // //   };

// // // // // // // //   const processedRows = useMemo(() => {
// // // // // // // //     let data = [...rows];

// // // // // // // //     // 1. Date Filter
// // // // // // // //     if (filterDate) {
// // // // // // // //       const selectedStr = filterDate.toISOString().split('T')[0];
// // // // // // // //       data = data.filter(r => 
// // // // // // // //         new Date(r.createdAt).toISOString().split('T')[0] === selectedStr
// // // // // // // //       );
// // // // // // // //     }

// // // // // // // //     // 2. Name/Godown Search Filter
// // // // // // // //     if (searchQuery.trim()) {
// // // // // // // //       const query = searchQuery.toLowerCase();
// // // // // // // //       data = data.filter(r => 
// // // // // // // //         r.userId?.name?.toLowerCase().includes(query) || 
// // // // // // // //         r.godownId?.name?.toLowerCase().includes(query)
// // // // // // // //       );
// // // // // // // //     }

// // // // // // // //     return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // // //   }, [rows, filterDate, searchQuery]);

// // // // // // // //   const activeRecord = useMemo(() => 
// // // // // // // //     processedRows.find(r => r._id === selectedId) || processedRows[0], 
// // // // // // // //   [selectedId, processedRows]);

// // // // // // // //   return (
// // // // // // // //     <div style={{ 
// // // // // // // //       height: '100vh', 
// // // // // // // //       background: '#f1f5f9', 
// // // // // // // //       display: 'flex', 
// // // // // // // //       flexDirection: 'column', 
// // // // // // // //       fontFamily: "'Inter', sans-serif" 
// // // // // // // //     }}>
      
// // // // // // // //       {/* 1. Header Area */}
// // // // // // // //       <div style={{ padding: '24px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // //         <div>
// // // // // // // //           <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
// // // // // // // //             <span style={{ color: '#6366f1', fontWeight: '500' }}>Daily Consumptions</span>
// // // // // // // //           </h1>
// // // // // // // //         </div>
        
// // // // // // // //         <div style={{ display: 'flex', gap: '16px' }}>
// // // // // // // //           {/* Global Search Input */}
// // // // // // // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // // // //              <input 
// // // // // // // //               type="text"
// // // // // // // //               placeholder="Search user or godown..."
// // // // // // // //               value={searchQuery}
// // // // // // // //               onChange={(e) => setSearchQuery(e.target.value)}
// // // // // // // //               style={{
// // // // // // // //                 background: '#f8fafc',
// // // // // // // //                 border: '1px solid #e2e8f0',
// // // // // // // //                 borderRadius: '12px',
// // // // // // // //                 padding: '10px 16px',
// // // // // // // //                 fontSize: '13px',
// // // // // // // //                 fontWeight: '600',
// // // // // // // //                 width: '240px',
// // // // // // // //                 outline: 'none',
// // // // // // // //                 color: '#1e293b'
// // // // // // // //               }}
// // // // // // // //              />
// // // // // // // //           </div>

// // // // // // // //           <div style={{ background: '#f8fafc', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
// // // // // // // //             <span style={{ fontSize: '11px', fontWeight: '900', color: '#6366f1' }}>DATE</span>
// // // // // // // //             <DatePicker
// // // // // // // //               selected={filterDate}
// // // // // // // //               onChange={(date) => setFilterDate(date)}
// // // // // // // //               dateFormat="MMM d, yyyy"
// // // // // // // //               customInput={<input style={{ border: 'none', background: 'transparent', fontWeight: '700', width: '100px', outline: 'none', color: '#1e293b' }} />}
// // // // // // // //             />
// // // // // // // //           </div>
// // // // // // // //         </div>
// // // // // // // //       </div>

// // // // // // // //       {/* 2. Content Body */}
// // // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // // // //         {/* LEFT: Activity Sidebar */}
// // // // // // // //         <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // // //           <div style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', paddingLeft: '8px' }}>
// // // // // // // //             {searchQuery ? 'SEARCH RESULTS' : 'RECENT ACTIVITY'} ({processedRows.length})
// // // // // // // //           </div>
// // // // // // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // // //             {processedRows.map(r => (
// // // // // // // //               <div 
// // // // // // // //                 key={r._id}
// // // // // // // //                 onClick={() => setSelectedId(r._id)}
// // // // // // // //                 style={{
// // // // // // // //                   padding: '16px',
// // // // // // // //                   borderRadius: '16px',
// // // // // // // //                   cursor: 'pointer',
// // // // // // // //                   background: selectedId === r._id ? '#fff' : 'transparent',
// // // // // // // //                   border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent',
// // // // // // // //                   boxShadow: selectedId === r._id ? '0 4px 12px rgba(99, 102, 241, 0.1)' : 'none',
// // // // // // // //                   transition: 'all 0.2s'
// // // // // // // //                 }}
// // // // // // // //               >
// // // // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // // //                   <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b', fontSize: '14px' }}>
// // // // // // // //                     {r.userId?.name || "Staff Member"}
// // // // // // // //                   </div>
// // // // // // // //                   <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
// // // // // // // //                     {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
// // // // // // // //                   </div>
// // // // // // // //                 </div>
// // // // // // // //                 <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: '500' }}>
// // // // // // // //                   {r.items?.length} items • {r.godownId?.name || "Warehouse"}
// // // // // // // //                 </div>
// // // // // // // //               </div>
// // // // // // // //             ))}
// // // // // // // //           </div>
// // // // // // // //         </div>

// // // // // // // //         {/* RIGHT: Detail Canvas */}
// // // // // // // //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // // // //           {activeRecord ? (
// // // // // // // //             <>
// // // // // // // //               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9' }}>
// // // // // // // //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
// // // // // // // //                   <div>
// // // // // // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px', letterSpacing: '0.5px' }}>DATE</div>
// // // // // // // //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
// // // // // // // //                       {new Date(activeRecord.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
// // // // // // // //                     </div>
// // // // // // // //                   </div>
                  
// // // // // // // //                   <div>
// // // // // // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px', letterSpacing: '0.5px' }}>TIME</div>
// // // // // // // //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
// // // // // // // //                       {new Date(activeRecord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
// // // // // // // //                     </div>
// // // // // // // //                   </div>

// // // // // // // //                   <div style={{ textAlign: 'right' }}>
// // // // // // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px', letterSpacing: '0.5px' }}>AUTHORISED BY</div>
// // // // // // // //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{activeRecord.userId?.name}</div>
// // // // // // // //                     <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>{activeRecord.godownId?.name}</div>
// // // // // // // //                   </div>
// // // // // // // //                 </div>
// // // // // // // //               </div>

// // // // // // // //               <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // // // //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // // //                   <thead>
// // // // // // // //                     <tr style={{ textAlign: 'left' }}>
// // // // // // // //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0', letterSpacing: '0.5px' }}>STOCK ITEM</th>
// // // // // // // //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0', textAlign: 'right', letterSpacing: '0.5px' }}>QUANTITY</th>
// // // // // // // //                     </tr>
// // // // // // // //                   </thead>
// // // // // // // //                   <tbody>
// // // // // // // //                     {(activeRecord.items || []).map((item, idx) => (
// // // // // // // //                       <tr key={idx}>
// // // // // // // //                         <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // //                           <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '15px' }}>{item.stockItemId?.name}</div>
// // // // // // // //                           <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {item.stockItemId?._id?.slice(-6).toUpperCase()}</div>
// // // // // // // //                         </td>
// // // // // // // //                         <td style={{ padding: '20px 0', textAlign: 'right', borderBottom: '1px solid #f8fafc' }}>
// // // // // // // //                           <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '16px' }}>
// // // // // // // //                             {item.qtyBaseUnit}
// // // // // // // //                           </span>
// // // // // // // //                           <span style={{ marginLeft: '4px', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
// // // // // // // //                             {item.stockItemId?.unitId?.symbol}
// // // // // // // //                           </span>
// // // // // // // //                         </td>
// // // // // // // //                       </tr>
// // // // // // // //                     ))}
// // // // // // // //                   </tbody>
// // // // // // // //                 </table>
// // // // // // // //               </div>

// // // // // // // //               <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
// // // // // // // //                 <button style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#475569', padding: '10px 20px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
// // // // // // // //                   Print Receipt
// // // // // // // //                 </button>
// // // // // // // //                 <button style={{ background: '#0f172a', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
// // // // // // // //                   Download PDF
// // // // // // // //                 </button>
// // // // // // // //               </div>
// // // // // // // //             </>
// // // // // // // //           ) : (
// // // // // // // //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#94a3b8' }}>
// // // // // // // //               <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔍</div>
// // // // // // // //               <div style={{ fontWeight: '600' }}>No matching records found</div>
// // // // // // // //             </div>
// // // // // // // //           )}
// // // // // // // //         </div>
// // // // // // // //       </div>
// // // // // // // //     </div>
// // // // // // // //   );
// // // // // // // // };









// // // // // // // import { useEffect, useState, useMemo } from "react";
// // // // // // // import { api } from "../api.js";
// // // // // // // import DatePicker from "react-datepicker";
// // // // // // // import "react-datepicker/dist/react-datepicker.css";
// // // // // // // import * as XLSX from "xlsx"; // Import SheetJS

// // // // // // // export const ConsumptionPage = () => {
// // // // // // //   const [rows, setRows] = useState([]);
// // // // // // //   const [selectedId, setSelectedId] = useState(null);
// // // // // // //   const [filterDate, setFilterDate] = useState(new Date());
// // // // // // //   const [searchQuery, setSearchQuery] = useState("");
// // // // // // //   const [loading, setLoading] = useState(true);

// // // // // // //   useEffect(() => {
// // // // // // //     fetchConsumptions();
// // // // // // //   }, []);

// // // // // // //   const fetchConsumptions = async () => {
// // // // // // //     try {
// // // // // // //       const res = await api.get("/consumptions");
// // // // // // //       setRows(res.data);
// // // // // // //       if (res.data.length > 0) setSelectedId(res.data[0]._id);
// // // // // // //     } catch (err) {
// // // // // // //       console.error("Failed to fetch consumption history");
// // // // // // //     } finally {
// // // // // // //       setLoading(false);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const processedRows = useMemo(() => {
// // // // // // //     let data = [...rows];
// // // // // // //     if (filterDate) {
// // // // // // //       const selectedStr = filterDate.toISOString().split('T')[0];
// // // // // // //       data = data.filter(r => 
// // // // // // //         new Date(r.createdAt).toISOString().split('T')[0] === selectedStr
// // // // // // //       );
// // // // // // //     }
// // // // // // //     if (searchQuery.trim()) {
// // // // // // //       const query = searchQuery.toLowerCase();
// // // // // // //       data = data.filter(r => 
// // // // // // //         r.userId?.name?.toLowerCase().includes(query) || 
// // // // // // //         r.godownId?.name?.toLowerCase().includes(query)
// // // // // // //       );
// // // // // // //     }
// // // // // // //     return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // // //   }, [rows, filterDate, searchQuery]);

// // // // // // //   const activeRecord = useMemo(() => 
// // // // // // //     processedRows.find(r => r._id === selectedId) || processedRows[0], 
// // // // // // //   [selectedId, processedRows]);

// // // // // // //   // --- Excel Export Logic ---
// // // // // // //   const handleDownloadExcel = () => {
// // // // // // //     if (!activeRecord) return;

// // // // // // //     // Prepare the data for Excel
// // // // // // //     const excelData = activeRecord.items.map((item) => ({
// // // // // // //       "Stock Item": item.stockItemId?.name,
// // // // // // //       "Item ID": item.stockItemId?._id?.toUpperCase(),
// // // // // // //       "Quantity": item.qtyBaseUnit,
// // // // // // //       "Unit": item.stockItemId?.unitId?.symbol,
// // // // // // //       "Date": new Date(activeRecord.createdAt).toLocaleDateString(),
// // // // // // //       "Authorised By": activeRecord.userId?.name,
// // // // // // //       "Godown": activeRecord.godownId?.name
// // // // // // //     }));

// // // // // // //     // Create worksheet and workbook
// // // // // // //     const worksheet = XLSX.utils.json_to_sheet(excelData);
// // // // // // //     const workbook = XLSX.utils.book_new();
// // // // // // //     XLSX.utils.book_append_sheet(workbook, worksheet, "Consumption Report");

// // // // // // //     // Generate filename based on user and date
// // // // // // //     const fileName = `Consumption_${activeRecord.userId?.name || 'Report'}_${new Date().getTime()}.xlsx`;

// // // // // // //     // Download the file
// // // // // // //     XLSX.writeFile(workbook, fileName);
// // // // // // //   };

// // // // // // //   return (
// // // // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // // // //       {/* Header Area */}
// // // // // // //       <div style={{ padding: '24px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // //         <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // // // // //           <span style={{ color: '#6366f1', fontWeight: '500' }}>Daily Consumptions</span>
// // // // // // //         </h1>
        
// // // // // // //         <div style={{ display: 'flex', gap: '16px' }}>
// // // // // // //           <input 
// // // // // // //             type="text"
// // // // // // //             placeholder="Search user or godown..."
// // // // // // //             value={searchQuery}
// // // // // // //             onChange={(e) => setSearchQuery(e.target.value)}
// // // // // // //             style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 16px', fontSize: '13px', fontWeight: '600', width: '240px', outline: 'none' }}
// // // // // // //           />
// // // // // // //           <div style={{ background: '#f8fafc', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
// // // // // // //             <span style={{ fontSize: '11px', fontWeight: '900', color: '#6366f1' }}>DATE</span>
// // // // // // //             <DatePicker
// // // // // // //               selected={filterDate}
// // // // // // //               onChange={(date) => setFilterDate(date)}
// // // // // // //               dateFormat="MMM d, yyyy"
// // // // // // //               customInput={<input style={{ border: 'none', background: 'transparent', fontWeight: '700', width: '100px', outline: 'none' }} />}
// // // // // // //             />
// // // // // // //           </div>
// // // // // // //         </div>
// // // // // // //       </div>

// // // // // // //       {/* Content Body */}
// // // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // // // //         {/* Sidebar */}
// // // // // // //         <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // // //           <div style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', paddingLeft: '8px' }}>
// // // // // // //             {searchQuery ? 'SEARCH RESULTS' : 'RECENT ACTIVITY'} ({processedRows.length})
// // // // // // //           </div>
// // // // // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // // //             {processedRows.map(r => (
// // // // // // //               <div 
// // // // // // //                 key={r._id}
// // // // // // //                 onClick={() => setSelectedId(r._id)}
// // // // // // //                 style={{
// // // // // // //                   padding: '16px', borderRadius: '16px', cursor: 'pointer',
// // // // // // //                   background: selectedId === r._id ? '#fff' : 'transparent',
// // // // // // //                   border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent',
// // // // // // //                   boxShadow: selectedId === r._id ? '0 4px 12px rgba(99, 102, 241, 0.1)' : 'none',
// // // // // // //                   transition: 'all 0.2s'
// // // // // // //                 }}
// // // // // // //               >
// // // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // // //                   <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b', fontSize: '14px' }}>{r.userId?.name}</div>
// // // // // // //                   <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
// // // // // // //                 </div>
// // // // // // //                 <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{r.items?.length} items • {r.godownId?.name}</div>
// // // // // // //               </div>
// // // // // // //             ))}
// // // // // // //           </div>
// // // // // // //         </div>

// // // // // // //         {/* Detail Canvas */}
// // // // // // //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // // //           {activeRecord ? (
// // // // // // //             <>
// // // // // // //               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9' }}>
// // // // // // //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
// // // // // // //                   <div>
// // // // // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>DATE</div>
// // // // // // //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{new Date(activeRecord.createdAt).toLocaleDateString()}</div>
// // // // // // //                   </div>
// // // // // // //                   <div>
// // // // // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TIME</div>
// // // // // // //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{new Date(activeRecord.createdAt).toLocaleTimeString()}</div>
// // // // // // //                   </div>
// // // // // // //                   <div style={{ textAlign: 'right' }}>
// // // // // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>AUTHORISED BY</div>
// // // // // // //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{activeRecord.userId?.name}</div>
// // // // // // //                     <div style={{ fontSize: '12px', color: '#64748b' }}>{activeRecord.godownId?.name}</div>
// // // // // // //                   </div>
// // // // // // //                 </div>
// // // // // // //               </div>

// // // // // // //               <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // // //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // // //                   <thead>
// // // // // // //                     <tr style={{ textAlign: 'left' }}>
// // // // // // //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>STOCK ITEM</th>
// // // // // // //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>QUANTITY</th>
// // // // // // //                     </tr>
// // // // // // //                   </thead>
// // // // // // //                   <tbody>
// // // // // // //                     {activeRecord.items.map((item, idx) => (
// // // // // // //                       <tr key={idx}>
// // // // // // //                         <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // // //                           <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.stockItemId?.name}</div>
// // // // // // //                           <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {item.stockItemId?._id?.slice(-6).toUpperCase()}</div>
// // // // // // //                         </td>
// // // // // // //                         <td style={{ padding: '20px 0', textAlign: 'right', borderBottom: '1px solid #f8fafc' }}>
// // // // // // //                           <span style={{ fontWeight: '800', color: '#0f172a' }}>{item.qtyBaseUnit}</span>
// // // // // // //                           <span style={{ marginLeft: '4px', fontSize: '12px', color: '#64748b' }}>{item.stockItemId?.unitId?.symbol}</span>
// // // // // // //                         </td>
// // // // // // //                       </tr>
// // // // // // //                     ))}
// // // // // // //                   </tbody>
// // // // // // //                 </table>
// // // // // // //               </div>

// // // // // // //               {/* Action Footer */}
// // // // // // //               <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // // // // // //                 <button 
// // // // // // //                   onClick={handleDownloadExcel}
// // // // // // //                   style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
// // // // // // //                 >
// // // // // // //                   Download Excel (.xlsx)
// // // // // // //                 </button>
// // // // // // //               </div>
// // // // // // //             </>
// // // // // // //           ) : (
// // // // // // //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// // // // // // //               <div style={{ fontWeight: '600' }}>No matching records found</div>
// // // // // // //             </div>
// // // // // // //           )}
// // // // // // //         </div>
// // // // // // //       </div>
// // // // // // //     </div>
// // // // // // //   );
// // // // // // // };






























// // // // // // import { useEffect, useState, useMemo } from "react";
// // // // // // import { api } from "../api.js";
// // // // // // import DatePicker from "react-datepicker";
// // // // // // import "react-datepicker/dist/react-datepicker.css";
// // // // // // import * as XLSX from "xlsx";
// // // // // // import { Calendar, Search, FileSpreadsheet } from "lucide-react"; // Added Icons

// // // // // // export const ConsumptionPage = () => {
// // // // // //   const [rows, setRows] = useState([]);
// // // // // //   const [selectedId, setSelectedId] = useState(null);
// // // // // //   const [filterDate, setFilterDate] = useState(new Date());
// // // // // //   const [searchQuery, setSearchQuery] = useState("");
// // // // // //   const [loading, setLoading] = useState(true);

// // // // // //   useEffect(() => {
// // // // // //     fetchConsumptions();
// // // // // //   }, []);

// // // // // //   const fetchConsumptions = async () => {
// // // // // //     try {
// // // // // //       const res = await api.get("/consumptions");
// // // // // //       setRows(res.data);
// // // // // //       if (res.data.length > 0) setSelectedId(res.data[0]._id);
// // // // // //     } catch (err) {
// // // // // //       console.error("Failed to fetch consumption history");
// // // // // //     } finally {
// // // // // //       setLoading(false);
// // // // // //     }
// // // // // //   };

// // // // // //   const processedRows = useMemo(() => {
// // // // // //     let data = [...rows];
// // // // // //     if (filterDate) {
// // // // // //       const selectedStr = filterDate.toISOString().split('T')[0];
// // // // // //       data = data.filter(r => 
// // // // // //         new Date(r.createdAt).toISOString().split('T')[0] === selectedStr
// // // // // //       );
// // // // // //     }
// // // // // //     if (searchQuery.trim()) {
// // // // // //       const query = searchQuery.toLowerCase();
// // // // // //       data = data.filter(r => 
// // // // // //         r.userId?.name?.toLowerCase().includes(query) || 
// // // // // //         r.godownId?.name?.toLowerCase().includes(query)
// // // // // //       );
// // // // // //     }
// // // // // //     return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // // //   }, [rows, filterDate, searchQuery]);

// // // // // //   const activeRecord = useMemo(() => 
// // // // // //     processedRows.find(r => r._id === selectedId) || processedRows[0], 
// // // // // //   [selectedId, processedRows]);

// // // // // //   const handleDownloadExcel = () => {
// // // // // //     if (!activeRecord) return;
// // // // // //     const excelData = activeRecord.items.map((item) => ({
// // // // // //       "Stock Item": item.stockItemId?.name,
// // // // // //       "Item ID": item.stockItemId?._id?.toUpperCase(),
// // // // // //       "Quantity": item.qtyBaseUnit,
// // // // // //       "Unit": item.stockItemId?.unitId?.symbol,
// // // // // //       "Date": new Date(activeRecord.createdAt).toLocaleDateString(),
// // // // // //       "Authorised By": activeRecord.userId?.name,
// // // // // //       "Godown": activeRecord.godownId?.name
// // // // // //     }));
// // // // // //     const worksheet = XLSX.utils.json_to_sheet(excelData);
// // // // // //     const workbook = XLSX.utils.book_new();
// // // // // //     XLSX.utils.book_append_sheet(workbook, worksheet, "Consumption Report");
// // // // // //     XLSX.writeFile(workbook, `Consumption_${activeRecord.userId?.name}_${Date.now()}.xlsx`);
// // // // // //   };

// // // // // //   return (
// // // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // // //       {/* Header Area */}
// // // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // //         <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // // // //           <span style={{ color: '#6366f1', fontWeight: '500' }}>Daily Consumptions</span>
// // // // // //         </h1>
        
// // // // // //         <div style={{ display: 'flex', gap: '16px' }}>
// // // // // //           {/* Modern Search Input with Icon */}
// // // // // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // // //             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // // //             <input 
// // // // // //               type="text"
// // // // // //               placeholder="Search user or godown..."
// // // // // //               value={searchQuery}
// // // // // //               onChange={(e) => setSearchQuery(e.target.value)}
// // // // // //               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 16px 10px 36px', fontSize: '13px', fontWeight: '600', width: '240px', outline: 'none', transition: 'border 0.2s' }}
// // // // // //             />
// // // // // //           </div>

// // // // // //           {/* Modern Date Picker with Icon */}
// // // // // //           <div style={{ background: '#f8fafc', padding: '6px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
// // // // // //             <Calendar size={16} color="#6366f1" strokeWidth={2.5} />
// // // // // //             <div style={{ display: 'flex', flexDirection: 'column' }}>
// // // // // //                 <span style={{ fontSize: '9px', fontWeight: '900', color: '#6366f1', lineHeight: '1' }}>FILTER DATE</span>
// // // // // //                 <DatePicker
// // // // // //                     selected={filterDate}
// // // // // //                     onChange={(date) => setFilterDate(date)}
// // // // // //                     dateFormat="MMM d, yyyy"
// // // // // //                     customInput={<input style={{ border: 'none', background: 'transparent', fontWeight: '700', fontSize: '13px', width: '95px', outline: 'none', color: '#1e293b', padding: 0 }} />}
// // // // // //                 />
// // // // // //             </div>
// // // // // //           </div>
// // // // // //         </div>
// // // // // //       </div>

// // // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
// // // // // //         {/* Sidebar */}
// // // // // //         <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // // //           <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>
// // // // // //             {searchQuery ? 'SEARCH RESULTS' : 'RECENT RECORDS'} ({processedRows.length})
// // // // // //           </div>
// // // // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // // //             {processedRows.map(r => (
// // // // // //               <div 
// // // // // //                 key={r._id}
// // // // // //                 onClick={() => setSelectedId(r._id)}
// // // // // //                 style={{
// // // // // //                   padding: '16px', borderRadius: '16px', cursor: 'pointer',
// // // // // //                   background: selectedId === r._id ? '#fff' : 'transparent',
// // // // // //                   border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent',
// // // // // //                   boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// // // // // //                   transition: 'all 0.2s'
// // // // // //                 }}
// // // // // //               >
// // // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // // //                   <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b', fontSize: '14px' }}>{r.userId?.name}</div>
// // // // // //                   <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
// // // // // //                 </div>
// // // // // //                 <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{r.items?.length} items • {r.godownId?.name}</div>
// // // // // //               </div>
// // // // // //             ))}
// // // // // //           </div>
// // // // // //         </div>

// // // // // //         {/* Detail Canvas */}
// // // // // //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // // //           {activeRecord ? (
// // // // // //             <>
// // // // // //               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9' }}>
// // // // // //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
// // // // // //                   <div>
// // // // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>DATE</div>
// // // // // //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{new Date(activeRecord.createdAt).toLocaleDateString()}</div>
// // // // // //                   </div>
// // // // // //                   <div>
// // // // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TIME</div>
// // // // // //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{new Date(activeRecord.createdAt).toLocaleTimeString()}</div>
// // // // // //                   </div>
// // // // // //                   <div style={{ textAlign: 'right' }}>
// // // // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>AUTHORISED BY</div>
// // // // // //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{activeRecord.userId?.name}</div>
// // // // // //                     <div style={{ fontSize: '12px', color: '#64748b' }}>{activeRecord.godownId?.name}</div>
// // // // // //                   </div>
// // // // // //                 </div>
// // // // // //               </div>

// // // // // //               <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // // //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // // //                   <thead>
// // // // // //                     <tr style={{ textAlign: 'left' }}>
// // // // // //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>STOCK ITEM</th>
// // // // // //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>QUANTITY</th>
// // // // // //                     </tr>
// // // // // //                   </thead>
// // // // // //                   <tbody>
// // // // // //                     {activeRecord.items.map((item, idx) => (
// // // // // //                       <tr key={idx}>
// // // // // //                         <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // // //                           <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.stockItemId?.name}</div>
// // // // // //                           <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {item.stockItemId?._id?.slice(-6).toUpperCase()}</div>
// // // // // //                         </td>
// // // // // //                         <td style={{ padding: '20px 0', textAlign: 'right', borderBottom: '1px solid #f8fafc' }}>
// // // // // //                           <span style={{ fontWeight: '800', color: '#0f172a' }}>{item.qtyBaseUnit}</span>
// // // // // //                           <span style={{ marginLeft: '4px', fontSize: '12px', color: '#64748b' }}>{item.stockItemId?.unitId?.symbol}</span>
// // // // // //                         </td>
// // // // // //                       </tr>
// // // // // //                     ))}
// // // // // //                   </tbody>
// // // // // //                 </table>
// // // // // //               </div>

// // // // // //               <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // // // // //                 <button 
// // // // // //                   onClick={handleDownloadExcel}
// // // // // //                   style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
// // // // // //                 >
// // // // // //                   <FileSpreadsheet size={16} />
// // // // // //                   Export to Excel (.xlsx)
// // // // // //                 </button>
// // // // // //               </div>
// // // // // //             </>
// // // // // //           ) : (
// // // // // //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// // // // // //               <div style={{ textAlign: 'center' }}>
// // // // // //                 <Search size={40} style={{ marginBottom: '16px', opacity: 0.5 }} />
// // // // // //                 <div style={{ fontWeight: '600' }}>No matching records found</div>
// // // // // //               </div>
// // // // // //             </div>
// // // // // //           )}
// // // // // //         </div>
// // // // // //       </div>
// // // // // //     </div>
// // // // // //   );
// // // // // // };



















// // // // // import { useEffect, useState, useMemo } from "react";
// // // // // import { api } from "../api.js";
// // // // // import DatePicker from "react-datepicker";
// // // // // import "react-datepicker/dist/react-datepicker.css";
// // // // // import * as XLSX from "xlsx";
// // // // // import { Calendar, Search, FileSpreadsheet } from "lucide-react";

// // // // // export const ConsumptionPage = () => {
// // // // //   const [rows, setRows] = useState([]);
// // // // //   const [selectedId, setSelectedId] = useState(null);
// // // // //   const [filterDate, setFilterDate] = useState(new Date());
// // // // //   const [searchQuery, setSearchQuery] = useState("");
// // // // //   const [loading, setLoading] = useState(true);

// // // // //   useEffect(() => {
// // // // //     fetchConsumptions();
// // // // //   }, []);

// // // // //   const fetchConsumptions = async () => {
// // // // //     try {
// // // // //       const res = await api.get("/consumptions");
// // // // //       setRows(res.data);
// // // // //       if (res.data.length > 0) setSelectedId(res.data[0]._id);
// // // // //     } catch (err) {
// // // // //       console.error("Failed to fetch consumption history");
// // // // //     } finally {
// // // // //       setLoading(false);
// // // // //     }
// // // // //   };

// // // // //   // Data Filtering and Sorting Logic
// // // // //   const processedRows = useMemo(() => {
// // // // //     let data = [...rows];
// // // // //     if (filterDate) {
// // // // //       const selectedStr = filterDate.toISOString().split('T')[0];
// // // // //       data = data.filter(r => 
// // // // //         new Date(r.createdAt).toISOString().split('T')[0] === selectedStr
// // // // //       );
// // // // //     }
// // // // //     if (searchQuery.trim()) {
// // // // //       const query = searchQuery.toLowerCase();
// // // // //       data = data.filter(r => 
// // // // //         r.userId?.name?.toLowerCase().includes(query) || 
// // // // //         r.godownId?.name?.toLowerCase().includes(query)
// // // // //       );
// // // // //     }
// // // // //     return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // // //   }, [rows, filterDate, searchQuery]);

// // // // //   // Determine active record for the detail view
// // // // //   const activeRecord = useMemo(() => 
// // // // //     processedRows.find(r => r._id === selectedId) || processedRows[0], 
// // // // //   [selectedId, processedRows]);

// // // // //   // Excel Export
// // // // //   const handleDownloadExcel = () => {
// // // // //     if (!activeRecord) return;
// // // // //     const excelData = activeRecord.items.map((item) => ({
// // // // //       "Stock Item": item.stockItemId?.name,
// // // // //       "Item ID": item.stockItemId?._id?.toUpperCase(),
// // // // //       "Quantity": item.qtyBaseUnit,
// // // // //       "Unit": item.stockItemId?.unitId?.symbol,
// // // // //       "Date": new Date(activeRecord.createdAt).toLocaleDateString(),
// // // // //       "Authorised By": activeRecord.userId?.name,
// // // // //       "Godown": activeRecord.godownId?.name
// // // // //     }));

// // // // //     const worksheet = XLSX.utils.json_to_sheet(excelData);
// // // // //     const workbook = XLSX.utils.book_new();
// // // // //     XLSX.utils.book_append_sheet(workbook, worksheet, "Consumption Report");
// // // // //     XLSX.writeFile(workbook, `Consumption_${activeRecord.userId?.name || 'Report'}_${Date.now()}.xlsx`);
// // // // //   };

// // // // //   return (
// // // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // // //       {/* 1. Header Area */}
// // // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // //         <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // // //           <span style={{ color: '#6366f1', fontWeight: '500' }}>Daily Consumptions</span>
// // // // //         </h1>
        
// // // // //         <div style={{ display: 'flex', gap: '12px' }}>
// // // // //           {/* Search Input */}
// // // // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // // //             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // // //             <input 
// // // // //               type="text"
// // // // //               placeholder="Search..."
// // // // //               value={searchQuery}
// // // // //               onChange={(e) => setSearchQuery(e.target.value)}
// // // // //               style={{ 
// // // // //                 background: '#f8fafc', 
// // // // //                 border: '1px solid #e2e8f0', 
// // // // //                 borderRadius: '10px', 
// // // // //                 padding: '10px 12px 10px 36px', 
// // // // //                 fontSize: '13px', 
// // // // //                 fontWeight: '600', 
// // // // //                 width: '200px', 
// // // // //                 outline: 'none' 
// // // // //               }}
// // // // //             />
// // // // //           </div>

// // // // //           {/* Minimal Date Picker - Icon Only */}
// // // // //           <div style={{ 
// // // // //             background: '#f8fafc', 
// // // // //             padding: '0 12px', 
// // // // //             borderRadius: '10px', 
// // // // //             border: '1px solid #e2e8f0', 
// // // // //             display: 'flex', 
// // // // //             alignItems: 'center', 
// // // // //             gap: '8px' 
// // // // //           }}>
// // // // //             <Calendar size={18} color="#6366f1" strokeWidth={2} />
// // // // //             <DatePicker
// // // // //               selected={filterDate}
// // // // //               onChange={(date) => setFilterDate(date)}
// // // // //               dateFormat="dd MMM yyyy"
// // // // //               customInput={
// // // // //                 <input style={{ 
// // // // //                   border: 'none', 
// // // // //                   background: 'transparent', 
// // // // //                   fontWeight: '700', 
// // // // //                   fontSize: '13px', 
// // // // //                   width: '90px', 
// // // // //                   outline: 'none', 
// // // // //                   color: '#1e293b',
// // // // //                   cursor: 'pointer'
// // // // //                 }} />
// // // // //               }
// // // // //             />
// // // // //           </div>
// // // // //         </div>
// // // // //       </div>

// // // // //       {/* 2. Content Body */}
// // // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // // //         {/* Sidebar - List of Records */}
// // // // //         <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // // //           <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>
// // // // //             {searchQuery ? 'SEARCH RESULTS' : 'RECENT RECORDS'} ({processedRows.length})
// // // // //           </div>
// // // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // // //             {processedRows.map(r => (
// // // // //               <div 
// // // // //                 key={r._id}
// // // // //                 onClick={() => setSelectedId(r._id)}
// // // // //                 style={{
// // // // //                   padding: '16px', borderRadius: '16px', cursor: 'pointer',
// // // // //                   background: selectedId === r._id ? '#fff' : 'transparent',
// // // // //                   border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent',
// // // // //                   boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// // // // //                   transition: 'all 0.2s'
// // // // //                 }}
// // // // //               >
// // // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // // //                   <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b', fontSize: '14px' }}>{r.userId?.name}</div>
// // // // //                   <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
// // // // //                 </div>
// // // // //                 <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{r.items?.length} items • {r.godownId?.name}</div>
// // // // //               </div>
// // // // //             ))}
// // // // //           </div>
// // // // //         </div>

// // // // //         {/* Detail Canvas - Record Details */}
// // // // //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // // //           {activeRecord ? (
// // // // //             <>
// // // // //               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9' }}>
// // // // //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
// // // // //                   <div>
// // // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>DATE</div>
// // // // //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{new Date(activeRecord.createdAt).toLocaleDateString()}</div>
// // // // //                   </div>
// // // // //                   <div>
// // // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TIME</div>
// // // // //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{new Date(activeRecord.createdAt).toLocaleTimeString()}</div>
// // // // //                   </div>
// // // // //                   <div style={{ textAlign: 'right' }}>
// // // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>AUTHORISED BY</div>
// // // // //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{activeRecord.userId?.name}</div>
// // // // //                     <div style={{ fontSize: '12px', color: '#64748b' }}>{activeRecord.godownId?.name}</div>
// // // // //                   </div>
// // // // //                 </div>
// // // // //               </div>

// // // // //               <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // // //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // // //                   <thead>
// // // // //                     <tr style={{ textAlign: 'left' }}>
// // // // //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>STOCK ITEM</th>
// // // // //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>QUANTITY</th>
// // // // //                     </tr>
// // // // //                   </thead>
// // // // //                   <tbody>
// // // // //                     {activeRecord.items.map((item, idx) => (
// // // // //                       <tr key={idx}>
// // // // //                         <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // // //                           <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.stockItemId?.name}</div>
// // // // //                           <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {item.stockItemId?._id?.slice(-6).toUpperCase()}</div>
// // // // //                         </td>
// // // // //                         <td style={{ padding: '20px 0', textAlign: 'right', borderBottom: '1px solid #f8fafc' }}>
// // // // //                           <span style={{ fontWeight: '800', color: '#0f172a' }}>{item.qtyBaseUnit}</span>
// // // // //                           <span style={{ marginLeft: '4px', fontSize: '12px', color: '#64748b' }}>{item.stockItemId?.unitId?.symbol}</span>
// // // // //                         </td>
// // // // //                       </tr>
// // // // //                     ))}
// // // // //                   </tbody>
// // // // //                 </table>
// // // // //               </div>

// // // // //               {/* Action Footer */}
// // // // //               <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // // // //                 <button 
// // // // //                   onClick={handleDownloadExcel}
// // // // //                   style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
// // // // //                 >
// // // // //                   <FileSpreadsheet size={16} />
// // // // //                   Export to Excel (.xlsx)
// // // // //                 </button>
// // // // //               </div>
// // // // //             </>
// // // // //           ) : (
// // // // //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// // // // //               <div style={{ textAlign: 'center' }}>
// // // // //                 <Search size={40} style={{ marginBottom: '16px', opacity: 0.5 }} />
// // // // //                 <div style={{ fontWeight: '600' }}>No matching records found</div>
// // // // //               </div>
// // // // //             </div>
// // // // //           )}
// // // // //         </div>
// // // // //       </div>
// // // // //     </div>
// // // // //   );
// // // // // };










// // // // import { useEffect, useState, useMemo } from "react";
// // // // import { api } from "../api.js";
// // // // import DatePicker from "react-datepicker";
// // // // import "react-datepicker/dist/react-datepicker.css";
// // // // import * as XLSX from "xlsx";
// // // // import { Calendar, Search, FileSpreadsheet } from "lucide-react";

// // // // export const ConsumptionPage = () => {
// // // //   const [rows, setRows] = useState([]);
// // // //   const [selectedId, setSelectedId] = useState(null);
// // // //   const [filterDate, setFilterDate] = useState(new Date());
// // // //   const [searchQuery, setSearchQuery] = useState("");
// // // //   const [loading, setLoading] = useState(true);

// // // //   useEffect(() => {
// // // //     fetchConsumptions();
// // // //   }, []);

// // // //   const fetchConsumptions = async () => {
// // // //     try {
// // // //       const res = await api.get("/consumptions");
// // // //       setRows(res.data);
// // // //       if (res.data.length > 0) setSelectedId(res.data[0]._id);
// // // //     } catch (err) {
// // // //       console.error("Failed to fetch consumption history");
// // // //     } finally {
// // // //       setLoading(false);
// // // //     }
// // // //   };

// // // //   // Data Filtering and Sorting Logic
// // // //   const processedRows = useMemo(() => {
// // // //     let data = [...rows];
// // // //     if (filterDate) {
// // // //       const selectedStr = filterDate.toISOString().split('T')[0];
// // // //       data = data.filter(r => 
// // // //         new Date(r.createdAt).toISOString().split('T')[0] === selectedStr
// // // //       );
// // // //     }
// // // //     if (searchQuery.trim()) {
// // // //       const query = searchQuery.toLowerCase();
// // // //       data = data.filter(r => 
// // // //         r.userId?.name?.toLowerCase().includes(query) || 
// // // //         r.godownId?.name?.toLowerCase().includes(query)
// // // //       );
// // // //     }
// // // //     return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // // //   }, [rows, filterDate, searchQuery]);

// // // //   // Determine active record for the detail view
// // // //   const activeRecord = useMemo(() => 
// // // //     processedRows.find(r => r._id === selectedId) || processedRows[0], 
// // // //   [selectedId, processedRows]);

// // // //   // Excel Export with Stock Group Integrated
// // // //   const handleDownloadExcel = () => {
// // // //     if (!activeRecord) return;
// // // //     const excelData = activeRecord.items.map((item) => ({
// // // //       "Stock Item": item.stockItemId?.name,
// // // //       "Stock Group": item.stockItemId?.stockGroupId?.name || "General", // Integrated Group
// // // //       "Item ID": item.stockItemId?._id?.toUpperCase(),
// // // //       "Quantity": item.qtyBaseUnit,
// // // //       "Unit": item.stockItemId?.unitId?.symbol,
// // // //       "Date": new Date(activeRecord.createdAt).toLocaleDateString(),
// // // //       "Authorised By": activeRecord.userId?.name,
// // // //       "Godown": activeRecord.godownId?.name
// // // //     }));

// // // //     const worksheet = XLSX.utils.json_to_sheet(excelData);
// // // //     const workbook = XLSX.utils.book_new();
// // // //     XLSX.utils.book_append_sheet(workbook, worksheet, "Consumption Report");
// // // //     XLSX.writeFile(workbook, `Consumption_${activeRecord.userId?.name || 'Report'}_${Date.now()}.xlsx`);
// // // //   };

// // // //   return (
// // // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // // //       {/* 1. Header Area */}
// // // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // //         <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // // //           <span style={{ color: '#6366f1', fontWeight: '500' }}>Daily Consumptions</span>
// // // //         </h1>
        
// // // //         <div style={{ display: 'flex', gap: '12px' }}>
// // // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // // //             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // // //             <input 
// // // //               type="text"
// // // //               placeholder="Search..."
// // // //               value={searchQuery}
// // // //               onChange={(e) => setSearchQuery(e.target.value)}
// // // //               style={{ 
// // // //                 background: '#f8fafc', 
// // // //                 border: '1px solid #e2e8f0', 
// // // //                 borderRadius: '10px', 
// // // //                 padding: '10px 12px 10px 36px', 
// // // //                 fontSize: '13px', 
// // // //                 fontWeight: '600', 
// // // //                 width: '200px', 
// // // //                 outline: 'none' 
// // // //               }}
// // // //             />
// // // //           </div>

// // // //           <div style={{ 
// // // //             background: '#f8fafc', 
// // // //             padding: '0 12px', 
// // // //             borderRadius: '10px', 
// // // //             border: '1px solid #e2e8f0', 
// // // //             display: 'flex', 
// // // //             alignItems: 'center', 
// // // //             gap: '8px' 
// // // //           }}>
// // // //             <Calendar size={18} color="#6366f1" strokeWidth={2} />
// // // //             <DatePicker
// // // //               selected={filterDate}
// // // //               onChange={(date) => setFilterDate(date)}
// // // //               dateFormat="dd MMM yyyy"
// // // //               customInput={
// // // //                 <input style={{ 
// // // //                   border: 'none', 
// // // //                   background: 'transparent', 
// // // //                   fontWeight: '700', 
// // // //                   fontSize: '13px', 
// // // //                   width: '90px', 
// // // //                   outline: 'none', 
// // // //                   color: '#1e293b',
// // // //                   cursor: 'pointer'
// // // //                 }} />
// // // //               }
// // // //             />
// // // //           </div>
// // // //         </div>
// // // //       </div>

// // // //       {/* 2. Content Body */}
// // // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // // //         {/* Sidebar - List of Records */}
// // // //         <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // // //           <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>
// // // //             {searchQuery ? 'SEARCH RESULTS' : 'RECENT RECORDS'} ({processedRows.length})
// // // //           </div>
// // // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // // //             {processedRows.map(r => (
// // // //               <div 
// // // //                 key={r._id}
// // // //                 onClick={() => setSelectedId(r._id)}
// // // //                 style={{
// // // //                   padding: '16px', borderRadius: '16px', cursor: 'pointer',
// // // //                   background: selectedId === r._id ? '#fff' : 'transparent',
// // // //                   border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent',
// // // //                   boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// // // //                   transition: 'all 0.2s'
// // // //                 }}
// // // //               >
// // // //                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // // //                   <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b', fontSize: '14px' }}>{r.userId?.name}</div>
// // // //                   <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
// // // //                 </div>
// // // //                 <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{r.items?.length} items • {r.godownId?.name}</div>
// // // //               </div>
// // // //             ))}
// // // //           </div>
// // // //         </div>

// // // //         {/* Detail Canvas */}
// // // //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // // //           {activeRecord ? (
// // // //             <>
// // // //               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9' }}>
// // // //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
// // // //                   <div>
// // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>DATE</div>
// // // //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{new Date(activeRecord.createdAt).toLocaleDateString()}</div>
// // // //                   </div>
// // // //                   <div>
// // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TIME</div>
// // // //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{new Date(activeRecord.createdAt).toLocaleTimeString()}</div>
// // // //                   </div>
// // // //                   <div style={{ textAlign: 'right' }}>
// // // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>AUTHORISED BY</div>
// // // //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{activeRecord.userId?.name}</div>
// // // //                     <div style={{ fontSize: '12px', color: '#64748b' }}>{activeRecord.godownId?.name}</div>
// // // //                   </div>
// // // //                 </div>
// // // //               </div>

// // // //               <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // // //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // // //                   <thead>
// // // //                     <tr style={{ textAlign: 'left' }}>
// // // //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>STOCK ITEM</th>
// // // //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>STOCK GROUP</th>
// // // //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>QUANTITY</th>
// // // //                     </tr>
// // // //                   </thead>
// // // //                   <tbody>
// // // //                     {activeRecord.items.map((item, idx) => (
// // // //                       <tr key={idx}>
// // // //                         <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // //                           <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.stockItemId?.name}</div>
// // // //                           <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {item.stockItemId?._id?.slice(-6).toUpperCase()}</div>
// // // //                         </td>
// // // //                         <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // // //                           <span style={{ 
// // // //                             fontSize: '10px', 
// // // //                             color: '#6366f1', 
// // // //                             background: '#eef2ff', 
// // // //                             padding: '4px 10px', 
// // // //                             borderRadius: '100px', 
// // // //                             fontWeight: '700',
// // // //                             border: '1px solid #e0e7ff'
// // // //                           }}>
// // // //                             {item.stockItemId?.stockGroupId?.name || "General"}
// // // //                           </span>
// // // //                         </td>
// // // //                         <td style={{ padding: '20px 0', textAlign: 'right', borderBottom: '1px solid #f8fafc' }}>
// // // //                           <span style={{ fontWeight: '800', color: '#0f172a' }}>{item.qtyBaseUnit}</span>
// // // //                           <span style={{ marginLeft: '4px', fontSize: '12px', color: '#64748b' }}>{item.stockItemId?.unitId?.symbol}</span>
// // // //                         </td>
// // // //                       </tr>
// // // //                     ))}
// // // //                   </tbody>
// // // //                 </table>
// // // //               </div>

// // // //               <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // // //                 <button 
// // // //                   onClick={handleDownloadExcel}
// // // //                   style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
// // // //                 >
// // // //                   <FileSpreadsheet size={16} />
// // // //                   Export to Excel (.xlsx)
// // // //                 </button>
// // // //               </div>
// // // //             </>
// // // //           ) : (
// // // //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// // // //               <div style={{ textAlign: 'center' }}>
// // // //                 <Search size={40} style={{ marginBottom: '16px', opacity: 0.5 }} />
// // // //                 <div style={{ fontWeight: '600' }}>No matching records found</div>
// // // //               </div>
// // // //             </div>
// // // //           )}
// // // //         </div>
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // };











// // // import { useEffect, useState, useMemo } from "react";
// // // import { api } from "../api.js";
// // // import DatePicker from "react-datepicker";
// // // import "react-datepicker/dist/react-datepicker.css";
// // // import * as XLSX from "xlsx";
// // // import { Calendar, Search, FileSpreadsheet } from "lucide-react";

// // // export const ConsumptionPage = () => {
// // //   const [rows, setRows] = useState([]);
// // //   const [selectedId, setSelectedId] = useState(null);
// // //   const [filterDate, setFilterDate] = useState(new Date());
// // //   const [searchQuery, setSearchQuery] = useState("");
// // //   const [loading, setLoading] = useState(true);

// // //   useEffect(() => {
// // //     fetchConsumptions();
// // //   }, []);

// // //   const fetchConsumptions = async () => {
// // //     try {
// // //       const res = await api.get("/consumptions");
// // //       setRows(res.data);
// // //       if (res.data.length > 0) setSelectedId(res.data[0]._id);
// // //     } catch (err) {
// // //       console.error("Failed to fetch consumption history");
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   };

// // //   // Data Filtering and Sorting Logic
// // //   const processedRows = useMemo(() => {
// // //     let data = [...rows];
// // //     if (filterDate) {
// // //       const selectedStr = filterDate.toISOString().split('T')[0];
// // //       data = data.filter(r => 
// // //         new Date(r.createdAt).toISOString().split('T')[0] === selectedStr
// // //       );
// // //     }
// // //     if (searchQuery.trim()) {
// // //       const query = searchQuery.toLowerCase();
// // //       data = data.filter(r => 
// // //         r.userId?.name?.toLowerCase().includes(query) || 
// // //         r.godownId?.name?.toLowerCase().includes(query)
// // //       );
// // //     }
// // //     return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// // //   }, [rows, filterDate, searchQuery]);

// // //   // Determine active record for the detail view
// // //   const activeRecord = useMemo(() => 
// // //     processedRows.find(r => r._id === selectedId) || processedRows[0], 
// // //   [selectedId, processedRows]);

// // //   // Updated Excel Export with robust Group handling
// // //   const handleDownloadExcel = () => {
// // //     if (!activeRecord) return;
    
// // //     const excelData = activeRecord.items.map((item) => {
// // //       return {
// // //         "Stock Item": item.stockItemId?.name || "N/A",
// // //         "Stock Group": typeof item.stockItemId?.stockGroupId === 'object' 
// // //           ? item.stockItemId?.stockGroupId?.name 
// // //           : "General", 
// // //         "Item ID": item.stockItemId?._id?.toUpperCase(),
// // //         "Quantity": item.qtyBaseUnit,
// // //         "Unit": item.stockItemId?.unitId?.symbol || "",
// // //         "Date": new Date(activeRecord.createdAt).toLocaleDateString(),
// // //         "Authorised By": activeRecord.userId?.name,
// // //         "Godown": activeRecord.godownId?.name
// // //       };
// // //     });

// // //     const worksheet = XLSX.utils.json_to_sheet(excelData);
// // //     const workbook = XLSX.utils.book_new();
// // //     XLSX.utils.book_append_sheet(workbook, worksheet, "Consumption Report");
// // //     XLSX.writeFile(workbook, `Consumption_${activeRecord.userId?.name || 'Report'}_${Date.now()}.xlsx`);
// // //   };

// // //   return (
// // //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// // //       {/* 1. Header Area */}
// // //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // //         <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// // //           <span style={{ color: '#6366f1', fontWeight: '500' }}>Daily Consumptions</span>
// // //         </h1>
        
// // //         <div style={{ display: 'flex', gap: '12px' }}>
// // //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// // //             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// // //             <input 
// // //               type="text"
// // //               placeholder="Search..."
// // //               value={searchQuery}
// // //               onChange={(e) => setSearchQuery(e.target.value)}
// // //               style={{ 
// // //                 background: '#f8fafc', 
// // //                 border: '1px solid #e2e8f0', 
// // //                 borderRadius: '10px', 
// // //                 padding: '10px 12px 10px 36px', 
// // //                 fontSize: '13px', 
// // //                 fontWeight: '600', 
// // //                 width: '200px', 
// // //                 outline: 'none' 
// // //               }}
// // //             />
// // //           </div>

// // //           <div style={{ 
// // //             background: '#f8fafc', 
// // //             padding: '0 12px', 
// // //             borderRadius: '10px', 
// // //             border: '1px solid #e2e8f0', 
// // //             display: 'flex', 
// // //             alignItems: 'center', 
// // //             gap: '8px' 
// // //           }}>
// // //             <Calendar size={18} color="#6366f1" strokeWidth={2} />
// // //             <DatePicker
// // //               selected={filterDate}
// // //               onChange={(date) => setFilterDate(date)}
// // //               dateFormat="dd MMM yyyy"
// // //               customInput={
// // //                 <input style={{ 
// // //                   border: 'none', 
// // //                   background: 'transparent', 
// // //                   fontWeight: '700', 
// // //                   fontSize: '13px', 
// // //                   width: '90px', 
// // //                   outline: 'none', 
// // //                   color: '#1e293b',
// // //                   cursor: 'pointer'
// // //                 }} />
// // //               }
// // //             />
// // //           </div>
// // //         </div>
// // //       </div>

// // //       {/* 2. Content Body */}
// // //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// // //         {/* Sidebar - List of Records */}
// // //         <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// // //           <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>
// // //             {searchQuery ? 'SEARCH RESULTS' : 'RECENT RECORDS'} ({processedRows.length})
// // //           </div>
// // //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// // //             {processedRows.map(r => (
// // //               <div 
// // //                 key={r._id}
// // //                 onClick={() => setSelectedId(r._id)}
// // //                 style={{
// // //                   padding: '16px', borderRadius: '16px', cursor: 'pointer',
// // //                   background: selectedId === r._id ? '#fff' : 'transparent',
// // //                   border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent',
// // //                   boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// // //                   transition: 'all 0.2s'
// // //                 }}
// // //               >
// // //                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// // //                   <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b', fontSize: '14px' }}>{r.userId?.name}</div>
// // //                   <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
// // //                 </div>
// // //                 <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{r.items?.length} items • {r.godownId?.name}</div>
// // //               </div>
// // //             ))}
// // //           </div>
// // //         </div>

// // //         {/* Detail Canvas */}
// // //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// // //           {activeRecord ? (
// // //             <>
// // //               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9' }}>
// // //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
// // //                   <div>
// // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>DATE</div>
// // //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{new Date(activeRecord.createdAt).toLocaleDateString()}</div>
// // //                   </div>
// // //                   <div>
// // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TIME</div>
// // //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{new Date(activeRecord.createdAt).toLocaleTimeString()}</div>
// // //                   </div>
// // //                   <div style={{ textAlign: 'right' }}>
// // //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>AUTHORISED BY</div>
// // //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{activeRecord.userId?.name}</div>
// // //                     <div style={{ fontSize: '12px', color: '#64748b' }}>{activeRecord.godownId?.name}</div>
// // //                   </div>
// // //                 </div>
// // //               </div>

// // //               <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// // //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // //                   <thead>
// // //                     <tr style={{ textAlign: 'left' }}>
// // //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>STOCK ITEM</th>
// // //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>STOCK GROUP</th>
// // //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>QUANTITY</th>
// // //                     </tr>
// // //                   </thead>
// // //                   <tbody>
// // //                     {activeRecord.items.map((item, idx) => (
// // //                       <tr key={idx}>
// // //                         <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // //                           <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.stockItemId?.name}</div>
// // //                           <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {item.stockItemId?._id?.slice(-6).toUpperCase()}</div>
// // //                         </td>
// // //                         <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// // //                           <span style={{ 
// // //                             fontSize: '10px', 
// // //                             color: '#6366f1', 
// // //                             background: '#eef2ff', 
// // //                             padding: '4px 10px', 
// // //                             borderRadius: '100px', 
// // //                             fontWeight: '700',
// // //                             border: '1px solid #e0e7ff'
// // //                           }}>
// // //                             {typeof item.stockItemId?.stockGroupId === 'object' 
// // //                               ? item.stockItemId?.stockGroupId?.name 
// // //                               : "General"}
// // //                           </span>
// // //                         </td>
// // //                         <td style={{ padding: '20px 0', textAlign: 'right', borderBottom: '1px solid #f8fafc' }}>
// // //                           <span style={{ fontWeight: '800', color: '#0f172a' }}>{item.qtyBaseUnit}</span>
// // //                           <span style={{ marginLeft: '4px', fontSize: '12px', color: '#64748b' }}>{item.stockItemId?.unitId?.symbol}</span>
// // //                         </td>
// // //                       </tr>
// // //                     ))}
// // //                   </tbody>
// // //                 </table>
// // //               </div>

// // //               <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// // //                 <button 
// // //                   onClick={handleDownloadExcel}
// // //                   style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
// // //                 >
// // //                   <FileSpreadsheet size={16} />
// // //                   Export to Excel (.xlsx)
// // //                 </button>
// // //               </div>
// // //             </>
// // //           ) : (
// // //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// // //               <div style={{ textAlign: 'center' }}>
// // //                 <Search size={40} style={{ marginBottom: '16px', opacity: 0.5 }} />
// // //                 <div style={{ fontWeight: '600' }}>No matching records found</div>
// // //               </div>
// // //             </div>
// // //           )}
// // //         </div>
// // //       </div>
// // //     </div>
// // //   );
// // // };






// // import { useEffect, useState, useMemo } from "react";
// // import { api } from "../api.js";
// // import DatePicker from "react-datepicker";
// // import "react-datepicker/dist/react-datepicker.css";
// // import * as XLSX from "xlsx";
// // import { Calendar, Search, FileSpreadsheet } from "lucide-react";

// // export const ConsumptionPage = () => {
// //   const [rows, setRows] = useState([]);
// //   const [selectedId, setSelectedId] = useState(null);
// //   const [filterDate, setFilterDate] = useState(new Date());
// //   const [searchQuery, setSearchQuery] = useState("");
// //   const [loading, setLoading] = useState(true);

// //   useEffect(() => {
// //     fetchConsumptions();
// //   }, []);

// //   const fetchConsumptions = async () => {
// //     try {
// //       const res = await api.get("/consumptions");
// //       setRows(res.data);
// //       if (res.data.length > 0) setSelectedId(res.data[0]._id);
// //     } catch (err) {
// //       console.error("Failed to fetch consumption history");
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   // Data Filtering and Sorting Logic
// //   const processedRows = useMemo(() => {
// //     let data = [...rows];
// //     if (filterDate) {
// //       const selectedStr = filterDate.toISOString().split('T')[0];
// //       data = data.filter(r => 
// //         new Date(r.createdAt).toISOString().split('T')[0] === selectedStr
// //       );
// //     }
// //     if (searchQuery.trim()) {
// //       const query = searchQuery.toLowerCase();
// //       data = data.filter(r => 
// //         r.userId?.name?.toLowerCase().includes(query) || 
// //         r.godownId?.name?.toLowerCase().includes(query)
// //       );
// //     }
// //     return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// //   }, [rows, filterDate, searchQuery]);

// //   // Determine active record for the detail view
// //   const activeRecord = useMemo(() => 
// //     processedRows.find(r => r._id === selectedId) || processedRows[0], 
// //   [selectedId, processedRows]);

// //   // Integrated Excel Export Logic
// //   const handleDownloadExcel = () => {
// //     if (!activeRecord) return;
    
// //     const excelData = activeRecord.items.map((item) => {
// //       return {
// //         "Stock Item": item.stockItemId?.name || "N/A",
// //         // Accessing the newly populated nested name property
// //         "Stock Group": item.stockItemId?.stockGroupId?.name || "General", 
// //         "Item ID": item.stockItemId?._id?.toUpperCase(),
// //         "Quantity": item.qtyBaseUnit,
// //         "Unit": item.stockItemId?.unitId?.symbol || "",
// //         "Date": new Date(activeRecord.createdAt).toLocaleDateString(),
// //         "Authorised By": activeRecord.userId?.name,
// //         "Godown": activeRecord.godownId?.name
// //       };
// //     });

// //     const worksheet = XLSX.utils.json_to_sheet(excelData);
// //     const workbook = XLSX.utils.book_new();
// //     XLSX.utils.book_append_sheet(workbook, worksheet, "Consumption Report");
// //     XLSX.writeFile(workbook, `Consumption_${activeRecord.userId?.name || 'Report'}_${Date.now()}.xlsx`);
// //   };

// //   return (
// //     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
// //       {/* 1. Header Area */}
// //       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// //         <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
// //           <span style={{ color: '#6366f1', fontWeight: '500' }}>Daily Consumptions</span>
// //         </h1>
        
// //         <div style={{ display: 'flex', gap: '12px' }}>
// //           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
// //             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
// //             <input 
// //               type="text"
// //               placeholder="Search..."
// //               value={searchQuery}
// //               onChange={(e) => setSearchQuery(e.target.value)}
// //               style={{ 
// //                 background: '#f8fafc', 
// //                 border: '1px solid #e2e8f0', 
// //                 borderRadius: '10px', 
// //                 padding: '10px 12px 10px 36px', 
// //                 fontSize: '13px', 
// //                 fontWeight: '600', 
// //                 width: '200px', 
// //                 outline: 'none' 
// //               }}
// //             />
// //           </div>

// //           <div style={{ 
// //             background: '#f8fafc', 
// //             padding: '0 12px', 
// //             borderRadius: '10px', 
// //             border: '1px solid #e2e8f0', 
// //             display: 'flex', 
// //             alignItems: 'center', 
// //             gap: '8px' 
// //           }}>
// //             <Calendar size={18} color="#6366f1" strokeWidth={2} />
// //             <DatePicker
// //               selected={filterDate}
// //               onChange={(date) => setFilterDate(date)}
// //               dateFormat="dd MMM yyyy"
// //               customInput={
// //                 <input style={{ 
// //                   border: 'none', 
// //                   background: 'transparent', 
// //                   fontWeight: '700', 
// //                   fontSize: '13px', 
// //                   width: '90px', 
// //                   outline: 'none', 
// //                   color: '#1e293b',
// //                   cursor: 'pointer'
// //                 }} />
// //               }
// //             />
// //           </div>
// //         </div>
// //       </div>

// //       {/* 2. Content Body */}
// //       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
// //         {/* Sidebar - List of Records */}
// //         <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
// //           <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>
// //             {searchQuery ? 'SEARCH RESULTS' : 'RECENT RECORDS'} ({processedRows.length})
// //           </div>
// //           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
// //             {loading ? (
// //                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading history...</div>
// //             ) : processedRows.map(r => (
// //               <div 
// //                 key={r._id}
// //                 onClick={() => setSelectedId(r._id)}
// //                 style={{
// //                   padding: '16px', borderRadius: '16px', cursor: 'pointer',
// //                   background: selectedId === r._id ? '#fff' : 'transparent',
// //                   border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent',
// //                   boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
// //                   transition: 'all 0.2s'
// //                 }}
// //               >
// //                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// //                   <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b', fontSize: '14px' }}>{r.userId?.name || "System User"}</div>
// //                   <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
// //                 </div>
// //                 <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{r.items?.length} items • {r.godownId?.name || "Global"}</div>
// //               </div>
// //             ))}
// //           </div>
// //         </div>

// //         {/* Detail Canvas */}
// //         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// //           {activeRecord ? (
// //             <>
// //               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9' }}>
// //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
// //                   <div>
// //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>DATE</div>
// //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{new Date(activeRecord.createdAt).toLocaleDateString()}</div>
// //                   </div>
// //                   <div>
// //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TIME</div>
// //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{new Date(activeRecord.createdAt).toLocaleTimeString()}</div>
// //                   </div>
// //                   <div style={{ textAlign: 'right' }}>
// //                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>AUTHORISED BY</div>
// //                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{activeRecord.userId?.name || "N/A"}</div>
// //                     <div style={{ fontSize: '12px', color: '#64748b' }}>{activeRecord.godownId?.name || "Global"}</div>
// //                   </div>
// //                 </div>
// //               </div>

// //               <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
// //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// //                   <thead>
// //                     <tr style={{ textAlign: 'left' }}>
// //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>STOCK ITEM</th>
// //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>STOCK GROUP</th>
// //                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>QUANTITY</th>
// //                     </tr>
// //                   </thead>
// //                   <tbody>
// //                     {activeRecord.items.map((item, idx) => (
// //                       <tr key={idx}>
// //                         <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// //                           <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.stockItemId?.name || "Unknown Item"}</div>
// //                           <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {item.stockItemId?._id?.slice(-6).toUpperCase()}</div>
// //                         </td>
// //                         <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
// //                           <span style={{ 
// //                             fontSize: '10px', 
// //                             color: '#6366f1', 
// //                             background: '#eef2ff', 
// //                             padding: '4px 10px', 
// //                             borderRadius: '100px', 
// //                             fontWeight: '700',
// //                             border: '1px solid #e0e7ff'
// //                           }}>
// //                             {/* Robust check for nested name property from backend population */}
// //                             {item.stockItemId?.stockGroupId?.name || "General"}
// //                           </span>
// //                         </td>
// //                         <td style={{ padding: '20px 0', textAlign: 'right', borderBottom: '1px solid #f8fafc' }}>
// //                           <span style={{ fontWeight: '800', color: '#0f172a' }}>{item.qtyBaseUnit}</span>
// //                           <span style={{ marginLeft: '4px', fontSize: '12px', color: '#64748b' }}>{item.stockItemId?.unitId?.symbol || ""}</span>
// //                         </td>
// //                       </tr>
// //                     ))}
// //                   </tbody>
// //                 </table>
// //               </div>

// //               <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
// //                 <button 
// //                   onClick={handleDownloadExcel}
// //                   style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
// //                 >
// //                   <FileSpreadsheet size={16} />
// //                   Export to Excel (.xlsx)
// //                 </button>
// //               </div>
// //             </>
// //           ) : (
// //             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
// //               <div style={{ textAlign: 'center' }}>
// //                 <Search size={40} style={{ marginBottom: '16px', opacity: 0.5 }} />
// //                 <div style={{ fontWeight: '600' }}>{loading ? "Fetching data..." : "No matching records found"}</div>
// //               </div>
// //             </div>
// //           )}
// //         </div>
// //       </div>
// //     </div>
// //   );
// // };





// import { useEffect, useState, useMemo } from "react";
// import { api } from "../api.js";
// import DatePicker from "react-datepicker";
// import "react-datepicker/dist/react-datepicker.css";
// import * as XLSX from "xlsx";
// import { Calendar, Search, FileSpreadsheet } from "lucide-react";

// export const ConsumptionPage = () => {
//   const [rows, setRows] = useState([]);
//   const [selectedId, setSelectedId] = useState(null);
//   const [filterDate, setFilterDate] = useState(new Date());
//   const [searchQuery, setSearchQuery] = useState("");
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     fetchConsumptions();
//   }, []);

//   const fetchConsumptions = async () => {
//     try {
//       const res = await api.get("/consumptions");
//       setRows(res.data);
//       if (res.data.length > 0) setSelectedId(res.data[0]._id);
//     } catch (err) {
//       console.error("Failed to fetch consumption history");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // HELPER: Extract Group Name from nested backend data
//   const getGroupName = (item) => {
//     // Check 1: Deep population (item.stockItemId.stockGroupId.name)
//     if (item.stockItemId?.stockGroupId?.name) return item.stockItemId.stockGroupId.name;
    
//     // Check 2: Flatter structure if provided by some routes
//     if (item.stockItemId?.groupName) return item.stockItemId.groupName;
    
//     // Check 3: Fallback
//     return "General";
//   };

//   const processedRows = useMemo(() => {
//     let data = [...rows];
//     if (filterDate) {
//       const selectedStr = filterDate.toISOString().split('T')[0];
//       data = data.filter(r => 
//         new Date(r.createdAt).toISOString().split('T')[0] === selectedStr
//       );
//     }
//     if (searchQuery.trim()) {
//       const query = searchQuery.toLowerCase();
//       data = data.filter(r => 
//         r.userId?.name?.toLowerCase().includes(query) || 
//         r.godownId?.name?.toLowerCase().includes(query)
//       );
//     }
//     return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
//   }, [rows, filterDate, searchQuery]);

//   const activeRecord = useMemo(() => 
//     processedRows.find(r => r._id === selectedId) || processedRows[0], 
//   [selectedId, processedRows]);

//   const handleDownloadExcel = () => {
//     if (!activeRecord) return;
//     const excelData = activeRecord.items.map((item) => ({
//       "Stock Item": item.stockItemId?.name || "N/A",
//       "Stock Group": getGroupName(item), 
//       "Item ID": item.stockItemId?._id?.toUpperCase(),
//       "Quantity": item.qtyBaseUnit,
//       "Unit": item.stockItemId?.unitId?.symbol || "",
//       "Date": new Date(activeRecord.createdAt).toLocaleDateString(),
//       "Authorised By": activeRecord.userId?.name,
//       "Godown": activeRecord.godownId?.name
//     }));

//     const worksheet = XLSX.utils.json_to_sheet(excelData);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, "Consumption Report");
//     XLSX.writeFile(workbook, `Consumption_${activeRecord.userId?.name || 'Report'}_${Date.now()}.xlsx`);
//   };

//   return (
//     <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
//       <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//         <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
//           <span style={{ color: '#6366f1', fontWeight: '500' }}>Daily Consumptions</span>
//         </h1>
//         <div style={{ display: 'flex', gap: '12px' }}>
//           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
//             <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
//             <input 
//               type="text" placeholder="Search..." value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', fontWeight: '600', width: '200px', outline: 'none' }}
//             />
//           </div>
//           <div style={{ background: '#f8fafc', padding: '0 12px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
//             <Calendar size={18} color="#6366f1" strokeWidth={2} />
//             <DatePicker
//               selected={filterDate}
//               onChange={(date) => setFilterDate(date)}
//               dateFormat="dd MMM yyyy"
//               customInput={<input style={{ border: 'none', background: 'transparent', fontWeight: '700', fontSize: '13px', width: '90px', outline: 'none', color: '#1e293b', cursor: 'pointer' }} />}
//             />
//           </div>
//         </div>
//       </div>

//       <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
//         <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
//           <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>
//             {searchQuery ? 'SEARCH RESULTS' : 'RECENT RECORDS'} ({processedRows.length})
//           </div>
//           <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
//             {processedRows.map(r => (
//               <div 
//                 key={r._id} onClick={() => setSelectedId(r._id)}
//                 style={{ padding: '16px', borderRadius: '16px', cursor: 'pointer', background: selectedId === r._id ? '#fff' : 'transparent', border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent', transition: 'all 0.2s' }}
//               >
//                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//                   <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b', fontSize: '14px' }}>{r.userId?.name}</div>
//                   <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
//                 </div>
//                 <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{r.items?.length} items • {r.godownId?.name}</div>
//               </div>
//             ))}
//           </div>
//         </div>

//         <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
//           {activeRecord ? (
//             <>
//               <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9' }}>
//                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
//                   <div>
//                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>DATE</div>
//                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{new Date(activeRecord.createdAt).toLocaleDateString()}</div>
//                   </div>
//                   <div>
//                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TIME</div>
//                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{new Date(activeRecord.createdAt).toLocaleTimeString()}</div>
//                   </div>
//                   <div style={{ textAlign: 'right' }}>
//                     <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>AUTHORISED BY</div>
//                     <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{activeRecord.userId?.name}</div>
//                     <div style={{ fontSize: '12px', color: '#64748b' }}>{activeRecord.godownId?.name}</div>
//                   </div>
//                 </div>
//               </div>

//               <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
//                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//                   <thead>
//                     <tr style={{ textAlign: 'left' }}>
//                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>STOCK ITEM</th>
//                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>STOCK GROUP</th>
//                       <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>QUANTITY</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {activeRecord.items.map((item, idx) => (
//                       <tr key={idx}>
//                         <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
//                           <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.stockItemId?.name}</div>
//                           <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {item.stockItemId?._id?.slice(-6).toUpperCase()}</div>
//                         </td>
//                         <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
//                           <span style={{ fontSize: '10px', color: '#6366f1', background: '#eef2ff', padding: '4px 10px', borderRadius: '100px', fontWeight: '700', border: '1px solid #e0e7ff' }}>
//                             {getGroupName(item)}
//                           </span>
//                         </td>
//                         <td style={{ padding: '20px 0', textAlign: 'right', borderBottom: '1px solid #f8fafc' }}>
//                           <span style={{ fontWeight: '800', color: '#0f172a' }}>{item.qtyBaseUnit}</span>
//                           <span style={{ marginLeft: '4px', fontSize: '12px', color: '#64748b' }}>{item.stockItemId?.unitId?.symbol}</span>
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>

//               <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
//                 <button onClick={handleDownloadExcel} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
//                   <FileSpreadsheet size={16} /> Export to Excel (.xlsx)
//                 </button>
//               </div>
//             </>
//           ) : (
//             <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
//               <div style={{ textAlign: 'center' }}>
//                 <Search size={40} style={{ marginBottom: '16px', opacity: 0.5 }} />
//                 <div style={{ fontWeight: '600' }}>No matching records found</div>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };





import { useEffect, useState, useMemo } from "react";
import { api } from "../api.js";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from "xlsx";
import { Calendar, Search, FileSpreadsheet } from "lucide-react";

export const ConsumptionPage = () => {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [filterDate, setFilterDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConsumptions();
  }, []);

  const fetchConsumptions = async () => {
    try {
      const res = await api.get("/consumptions");
      setRows(res.data);
      if (res.data.length > 0) setSelectedId(res.data[0]._id);
    } catch (err) {
      console.error("Failed to fetch consumption history");
    } finally {
      setLoading(false);
    }
  };

  /**
   * UPDATED HELPER: Robust Stock Group Resolution
   * Checks for deep population first, then falls back to ID or 'General'
   */
  const getGroupName = (item) => {
    // 1. Standard path after deep population: item -> stockItemId -> stockGroupId -> name
    if (item.stockItemId?.stockGroupId?.name) {
      return item.stockItemId.stockGroupId.name;
    }

    // 2. Fallback if stockGroupId was only an ID (population failed)
    if (item.stockItemId?.stockGroupId && typeof item.stockItemId.stockGroupId === 'string') {
      return "ID: " + item.stockItemId.stockGroupId.slice(-4);
    }

    // 3. Last resort
    return "General";
  };

  const processedRows = useMemo(() => {
    let data = [...rows];
    if (filterDate) {
      const selectedStr = filterDate.toISOString().split('T')[0];
      data = data.filter(r => 
        new Date(r.createdAt).toISOString().split('T')[0] === selectedStr
      );
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      data = data.filter(r => 
        r.userId?.name?.toLowerCase().includes(query) || 
        r.godownId?.name?.toLowerCase().includes(query)
      );
    }
    return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [rows, filterDate, searchQuery]);

  const activeRecord = useMemo(() => 
    processedRows.find(r => r._id === selectedId) || processedRows[0], 
  [selectedId, processedRows]);

  const handleDownloadExcel = () => {
    if (!activeRecord) return;
    const excelData = activeRecord.items.map((item) => ({
      "Stock Item": item.stockItemId?.name || "N/A",
      "Stock Group": getGroupName(item), // Using the updated helper here
      "Item ID": item.stockItemId?._id?.toUpperCase(),
      "Quantity": item.qtyBaseUnit,
      "Unit": item.stockItemId?.unitId?.symbol || "",
      "Date": new Date(activeRecord.createdAt).toLocaleDateString(),
      "Authorised By": activeRecord.userId?.name,
      "Godown": activeRecord.godownId?.name
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Consumption Report");
    XLSX.writeFile(workbook, `Consumption_${activeRecord.userId?.name || 'Report'}_${Date.now()}.xlsx`);
  };

  return (
    <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
          <span style={{ color: '#6366f1', fontWeight: '500' }}>Daily Consumptions</span>
        </h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
            <input 
              type="text" placeholder="Search..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', fontWeight: '600', width: '200px', outline: 'none' }}
            />
          </div>
          <div style={{ background: '#f8fafc', padding: '0 12px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="#6366f1" strokeWidth={2} />
            <DatePicker
              selected={filterDate}
              onChange={(date) => setFilterDate(date)}
              dateFormat="dd MMM yyyy"
              customInput={<input style={{ border: 'none', background: 'transparent', fontWeight: '700', fontSize: '13px', width: '90px', outline: 'none', color: '#1e293b', cursor: 'pointer' }} />}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
        {/* Sidebar: List of Records */}
        <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>
            {searchQuery ? 'SEARCH RESULTS' : 'RECENT RECORDS'} ({processedRows.length})
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {processedRows.map(r => (
              <div 
                key={r._id} onClick={() => setSelectedId(r._id)}
                style={{ 
                  padding: '16px', 
                  borderRadius: '16px', 
                  cursor: 'pointer', 
                  background: selectedId === r._id ? '#fff' : 'transparent', 
                  border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent', 
                  transition: 'all 0.2s',
                  boxShadow: selectedId === r._id ? '0 4px 12px rgba(99, 102, 241, 0.08)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b', fontSize: '14px' }}>{r.userId?.name}</div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{r.items?.length} items • {r.godownId?.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed View */}
        <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          {activeRecord ? (
            <>
              {/* Detail Header */}
              <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>DATE</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{new Date(activeRecord.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TIME</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{new Date(activeRecord.createdAt).toLocaleTimeString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>AUTHORISED BY</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{activeRecord.userId?.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{activeRecord.godownId?.name}</div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left' }}>
                      <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>STOCK ITEM</th>
                      <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>STOCK GROUP</th>
                      <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>QUANTITY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRecord.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
                          <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.stockItemId?.name}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {item.stockItemId?._id?.slice(-6).toUpperCase()}</div>
                        </td>
                        <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
                          <span style={{ fontSize: '10px', color: '#6366f1', background: '#eef2ff', padding: '4px 10px', borderRadius: '100px', fontWeight: '700', border: '1px solid #e0e7ff' }}>
                            {getGroupName(item)} {/* Using the updated helper here */}
                          </span>
                        </td>
                        <td style={{ padding: '20px 0', textAlign: 'right', borderBottom: '1px solid #f8fafc' }}>
                          <span style={{ fontWeight: '800', color: '#0f172a' }}>{item.qtyBaseUnit}</span>
                          <span style={{ marginLeft: '4px', fontSize: '12px', color: '#64748b' }}>{item.stockItemId?.unitId?.symbol}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Export Button */}
              <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  onClick={handleDownloadExcel} 
                  style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'transform 0.1s' }}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <FileSpreadsheet size={16} /> Export to Excel (.xlsx)
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              <div style={{ textAlign: 'center' }}>
                <Search size={40} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <div style={{ fontWeight: '600' }}>No matching records found</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};