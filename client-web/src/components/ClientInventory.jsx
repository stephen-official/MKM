// // // // import React, { useState, useEffect, useMemo } from 'react';
// // // // import { api } from "../api.js";
// // // // import InventoryCard from './InventoryCard';
// // // // import { ShoppingCart, Search, Filter } from 'lucide-react'; // Optional icons

// // // // export const ClientInventory = () => {
// // // //   const [items, setItems] = useState([]);
// // // //   const [groups, setGroups] = useState([]);
// // // //   const [selectedGroup, setSelectedGroup] = useState("all");
// // // //   const [searchTerm, setSearchTerm] = useState("");
// // // //   const [cart, setCart] = useState([]);

// // // //   // 1. Fetch Items and Groups on Load
// // // //   // 1. Fetch Items and Groups on Load
// // // // useEffect(() => {
// // // //   const fetchData = async () => {
// // // //     try {
// // // //       const [itemsRes, groupsRes, myStockRes] = await Promise.all([
// // // //         api.get('/inventory/stock-items'),
// // // //         api.get('/inventory/stock-groups'),
// // // //         api.get('/my-stock') // Add this to check if sync is actually working
// // // //       ]);
// // // //       setItems(itemsRes.data);
// // // //       setGroups(groupsRes.data);
// // // //       console.log("Godown Stock Synced:", myStockRes.data);
// // // //     } catch (err) {
// // // //       console.error("Sync Error:", err);
// // // //       // This is where your "FAILED TO SYNC" toast is likely triggered
// // // //     }
// // // //   };
// // // //   fetchData();
// // // // }, []);

// // // //   // 2. Filter Logic (Search + Category)
// // // //   const filteredItems = useMemo(() => {
// // // //     return items.filter(item => {
// // // //       const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
// // // //       const matchesGroup = selectedGroup === "all" || item.stockGroupId?._id === selectedGroup;
// // // //       return matchesSearch && matchesGroup;
// // // //     });
// // // //   }, [items, searchTerm, selectedGroup]);

// // // //   // 3. Cart Logic
// // // //   const handleAddToCart = (cartItem) => {
// // // //     setCart(prev => [...prev, cartItem]);
// // // //     // Optional: Add a small toast here
// // // //   };

// // // //   return (
// // // //     <div className="min-h-screen bg-gray-50 pb-20">
// // // //       {/* STICKY HEADER */}
// // // //       <header className="sticky top-0 bg-white border-b z-10 p-4 flex justify-between items-center shadow-sm">
// // // //         <h1 className="text-xl font-black text-blue-800">CAMPUS STORE</h1>
// // // //         <div className="relative">
// // // //           <ShoppingCart className="w-6 h-6 text-gray-700" />
// // // //           {cart.length > 0 && (
// // // //             <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
// // // //               {cart.length}
// // // //             </span>
// // // //           )}
// // // //         </div>
// // // //       </header>

// // // //       {/* SEARCH & FILTERS */}
// // // //       <div className="p-4 space-y-3">
// // // //         <div className="relative">
// // // //           <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
// // // //           <input 
// // // //             type="text" 
// // // //             placeholder="Search items..." 
// // // //             className="w-full pl-10 pr-4 py-2 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500"
// // // //             value={searchTerm}
// // // //             onChange={(e) => setSearchTerm(e.target.value)}
// // // //           />
// // // //         </div>

// // // //         <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
// // // //           <button 
// // // //             onClick={() => setSelectedGroup("all")}
// // // //             className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition ${selectedGroup === "all" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600"}`}
// // // //           >
// // // //             All
// // // //           </button>
// // // //           {groups.map(group => (
// // // //             <button 
// // // //               key={group._id}
// // // //               onClick={() => setSelectedGroup(group._id)}
// // // //               className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition ${selectedGroup === group._id ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600"}`}
// // // //             >
// // // //               {group.name}
// // // //             </button>
// // // //           ))}
// // // //         </div>
// // // //       </div>

// // // //       {/* ITEMS GRID */}
// // // //       <main className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
// // // //         {filteredItems.length > 0 ? (
// // // //           filteredItems.map(item => (
// // // //             <InventoryCard 
// // // //               key={item._id} 
// // // //               item={item} 
// // // //               onAddToCart={handleAddToCart} 
// // // //             />
// // // //           ))
// // // //         ) : (
// // // //           <div className="col-span-full text-center py-20 text-gray-400">
// // // //             No items found in this category.
// // // //           </div>
// // // //         )}
// // // //       </main>

// // // //       {/* FLOATING CHECKOUT BUTTON */}
// // // //       {cart.length > 0 && (
// // // //         <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md">
// // // //           <button className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold shadow-xl flex justify-between px-6 items-center hover:bg-green-700 transition">
// // // //             <span>Review Order ({cart.length} items)</span>
// // // //             <span className="bg-green-800 px-3 py-1 rounded-lg">Next →</span>
// // // //           </button>
// // // //         </div>
// // // //       )}
// // // //     </div>
// // // //   );
// // // // };




// // // import React, { useState, useEffect, useMemo } from 'react';
// // // import { api } from "../api.js";
// // // import InventoryCard from './InventoryCard';
// // // import { ShoppingCart, Search } from 'lucide-react';

// // // export const ClientInventory = () => {
// // //   const [items, setItems] = useState([]);
// // //   const [groups, setGroups] = useState([]);
// // //   const [selectedGroup, setSelectedGroup] = useState("all");
// // //   const [searchTerm, setSearchTerm] = useState("");
// // //   const [cart, setCart] = useState([]);
// // //   const [loading, setLoading] = useState(false);

// // //   // 1. Fetch Items and Groups on Load
// // //   useEffect(() => {
// // //     const fetchData = async () => {
// // //       try {
// // //         const [itemsRes, groupsRes] = await Promise.all([
// // //           api.get('/inventory/stock-items'), 
// // //           api.get('/inventory/stock-groups')
// // //         ]);
// // //         setItems(itemsRes.data);
// // //         setGroups(groupsRes.data);
// // //       } catch (err) {
// // //         console.error("Sync Error:", err);
// // //         alert("Failed to sync inventory. Please check your connection.");
// // //       }
// // //     };
// // //     fetchData();
// // //   }, []);

// // //   // 2. Filter Logic
// // //   const filteredItems = useMemo(() => {
// // //     return items.filter(item => {
// // //       const itemName = item.stockItemId?.name || item.name || "";
// // //       const matchesSearch = itemName.toLowerCase().includes(searchTerm.toLowerCase());
      
// // //       const groupId = item.stockItemId?.stockGroupId || item.stockGroupId?._id || item.stockGroupId;
// // //       const matchesGroup = selectedGroup === "all" || groupId === selectedGroup;
      
// // //       return matchesSearch && matchesGroup;
// // //     });
// // //   }, [items, searchTerm, selectedGroup]);

// // //   // 3. Updated Cart Logic (Receives qty from InventoryCard)
// // //   const handleAddToCart = (item, orderQty) => {
// // //     if (orderQty <= 0) {
// // //       // If quantity is set to 0, remove it from cart
// // //       setCart(prev => prev.filter(i => i.stockRecordId !== item._id));
// // //       return;
// // //     }

// // //     setCart(prev => {
// // //       const existing = prev.find(i => i.stockRecordId === item._id);
// // //       if (existing) {
// // //         // Update existing item with the specific quantity chosen in the card
// // //         return prev.map(i => 
// // //           i.stockRecordId === item._id 
// // //             ? { ...i, qtyBaseUnit: orderQty } 
// // //             : i
// // //         );
// // //       }
// // //       // Add new item if not in cart
// // //       return [...prev, {
// // //         stockRecordId: item._id,
// // //         qtyBaseUnit: orderQty,
// // //         name: item.stockItemId?.name || item.name 
// // //       }];
// // //     });
// // //   };

// // //   // 4. Checkout Logic
// // //   const handleCheckout = async () => {
// // //     if (cart.length === 0) return;
    
// // //     setLoading(true);
// // //     try {
// // //       const payload = {
// // //         items: cart.map(item => ({
// // //           stockRecordId: item.stockRecordId,
// // //           qtyBaseUnit: item.qtyBaseUnit
// // //         }))
// // //       };
      
// // //       await api.post("/orders", payload);
// // //       alert("Order Placed Successfully!");
// // //       setCart([]); 
// // //     } catch (err) {
// // //       const errorMsg = err.response?.data?.error || "Checkout Failed";
// // //       alert(errorMsg);
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   };

// // //   return (
// // //     <div className="min-h-screen bg-gray-50 pb-20">
// // //       {/* STICKY HEADER */}
// // //       <header className="sticky top-0 bg-white border-b z-10 p-4 flex justify-between items-center shadow-sm">
// // //         <h1 className="text-xl font-black text-blue-800 italic uppercase tracking-tighter">Campus Store</h1>
// // //         <div className="relative">
// // //           <ShoppingCart className="w-6 h-6 text-gray-700" />
// // //           {cart.length > 0 && (
// // //             <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">
// // //               {cart.length}
// // //             </span>
// // //           )}
// // //         </div>
// // //       </header>

// // //       {/* SEARCH & FILTERS */}
// // //       <div className="p-4 space-y-3">
// // //         <div className="relative">
// // //           <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
// // //           <input 
// // //             type="text" 
// // //             placeholder="Search items..." 
// // //             className="w-full pl-10 pr-4 py-2 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500"
// // //             value={searchTerm}
// // //             onChange={(e) => setSearchTerm(e.target.value)}
// // //           />
// // //         </div>

// // //         <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
// // //           <button 
// // //             onClick={() => setSelectedGroup("all")}
// // //             className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition ${selectedGroup === "all" ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-gray-600"}`}
// // //           >
// // //             All
// // //           </button>
// // //           {groups.map(group => (
// // //             <button 
// // //               key={group._id}
// // //               onClick={() => setSelectedGroup(group._id)}
// // //               className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition ${selectedGroup === group._id ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-gray-600"}`}
// // //             >
// // //               {group.name}
// // //             </button>
// // //           ))}
// // //         </div>
// // //       </div>

// // //       {/* ITEMS GRID */}
// // //       <main className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
// // //         {filteredItems.length > 0 ? (
// // //           filteredItems.map(item => {
// // //             const cartItem = cart.find(i => i.stockRecordId === item._id);
// // //             return (
// // //               <InventoryCard 
// // //                 key={item._id} 
// // //                 item={item} 
// // //                 cartQty={cartItem ? cartItem.qtyBaseUnit : 0}
// // //                 unit={item.stockItemId?.unit}
// // //                 onAddToCart={(item, qty) => handleAddToCart(item, qty)} 
// // //               />
// // //             );
// // //           })
// // //         ) : (
// // //           <div className="col-span-full text-center py-20 text-gray-400">
// // //             <p className="font-medium text-lg">No items found.</p>
// // //           </div>
// // //         )}
// // //       </main>

// // //       {/* FLOATING CHECKOUT BUTTON */}
// // //       {cart.length > 0 && (
// // //         <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md animate-in slide-in-from-bottom-4">
// // //           <button 
// // //             onClick={handleCheckout}
// // //             disabled={loading}
// // //             className={`w-full ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white py-4 rounded-2xl font-bold shadow-xl flex justify-between px-6 items-center transition-all active:scale-95`}
// // //           >
// // //             <div className="flex items-center gap-2">
// // //               <ShoppingCart className="w-5 h-5" />
// // //               <span>{loading ? "Processing..." : `Review Order (${cart.length})`}</span>
// // //             </div>
// // //             <span className="bg-green-800 px-3 py-1 rounded-lg">Next →</span>
// // //           </button>
// // //         </div>
// // //       )}
// // //     </div>
// // //   );
// // // };






// // import React, { useState, useEffect, useMemo } from 'react';
// // import { api } from "../api.js";
// // import InventoryCard from './InventoryCard';
// // import { ShoppingCart, Search, PackageOpen } from 'lucide-react';

// // export const ClientInventory = () => {
// //   const [items, setItems] = useState([]);
// //   const [groups, setGroups] = useState([]);
// //   const [selectedGroup, setSelectedGroup] = useState("all");
// //   const [searchTerm, setSearchTerm] = useState("");
// //   const [cart, setCart] = useState([]);
// //   const [loading, setLoading] = useState(false);

// //   // 1. Fetch User-Specific Stock (Integrated with Backend Fix)
// //   useEffect(() => {
// //     const fetchData = async () => {
// //       try {
// //         setLoading(true);
// //         // CRITICAL FIX: Changed endpoint to /operations/my-kitchen-stock
// //         const [itemsRes, groupsRes] = await Promise.all([
// //           api.get('/operations/my-kitchen-stock'), 
// //           api.get('/inventory/stock-groups')
// //         ]);
// //         setItems(itemsRes.data);
// //         setGroups(groupsRes.data);
// //       } catch (err) {
// //         console.error("Sync Error:", err);
// //         // This handles the error shown in your screenshot
// //       } finally {
// //         setLoading(false);
// //       }
// //     };
// //     fetchData();
// //   }, []);

// //   // 2. Filter & Sort Logic
// //   const filteredItems = useMemo(() => {
// //     return items
// //       .filter(item => {
// //         const itemName = item.name || "";
// //         const matchesSearch = itemName.toLowerCase().includes(searchTerm.toLowerCase());
        
// //         // Match group using the ID from the populated stockItemId
// //         const groupId = item.stockGroupId; 
// //         const matchesGroup = selectedGroup === "all" || groupId === selectedGroup;
        
// //         return matchesSearch && matchesGroup;
// //       })
// //       .sort((a, b) => a.name.localeCompare(b.name)); // Alphabetical sorting
// //   }, [items, searchTerm, selectedGroup]);

// //   // 3. Cart Logic (Uses stockRecordId as required by backend)
// //   const handleAddToCart = (item, orderQty) => {
// //     if (orderQty <= 0) {
// //       setCart(prev => prev.filter(i => i.stockRecordId !== item.stockRecordId));
// //       return;
// //     }

// //     setCart(prev => {
// //       const existing = prev.find(i => i.stockRecordId === item.stockRecordId);
// //       if (existing) {
// //         return prev.map(i => 
// //           i.stockRecordId === item.stockRecordId 
// //             ? { ...i, qtyBaseUnit: orderQty } 
// //             : i
// //         );
// //       }
// //       return [...prev, {
// //         stockRecordId: item.stockRecordId,
// //         qtyBaseUnit: orderQty,
// //         name: item.name 
// //       }];
// //     });
// //   };

// //   // 4. Checkout Logic
// //   const handleCheckout = async () => {
// //     if (cart.length === 0) return;
    
// //     setLoading(true);
// //     try {
// //       const payload = {
// //         items: cart.map(item => ({
// //           stockRecordId: item.stockRecordId,
// //           qtyBaseUnit: item.qtyBaseUnit
// //         }))
// //       };
      
// //       await api.post("/operations/orders", payload);
// //       alert("Order Placed Successfully!");
// //       setCart([]); 
      
// //       // Refresh stock levels after order
// //       const itemsRes = await api.get('/operations/my-kitchen-stock');
// //       setItems(itemsRes.data);
// //     } catch (err) {
// //       const errorMsg = err.response?.data?.error || "Checkout Failed";
// //       alert(errorMsg);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   return (
// //     <div className="min-h-screen bg-gray-50 pb-20">
// //       <header className="sticky top-0 bg-white border-b z-10 p-4 flex justify-between items-center shadow-sm">
// //         <h1 className="text-xl font-black text-blue-800 italic uppercase tracking-tighter">Kitchen Store</h1>
// //         <div className="relative">
// //           <ShoppingCart className="w-6 h-6 text-gray-700" />
// //           {cart.length > 0 && (
// //             <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">
// //               {cart.length}
// //             </span>
// //           )}
// //         </div>
// //       </header>

// //       <div className="p-4 space-y-3">
// //         <div className="relative">
// //           <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
// //           <input 
// //             type="text" 
// //             placeholder="Search kitchen items..." 
// //             className="w-full pl-10 pr-4 py-2 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500"
// //             value={searchTerm}
// //             onChange={(e) => setSearchTerm(e.target.value)}
// //           />
// //         </div>

// //         <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
// //           <button 
// //             onClick={() => setSelectedGroup("all")}
// //             className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition ${selectedGroup === "all" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600"}`}
// //           >
// //             All Items
// //           </button>
// //           {groups.map(group => (
// //             <button 
// //               key={group._id}
// //               onClick={() => setSelectedGroup(group._id)}
// //               className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition ${selectedGroup === group._id ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600"}`}
// //             >
// //               {group.name}
// //             </button>
// //           ))}
// //         </div>
// //       </div>

// //       <main className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
// //         {loading ? (
// //            <div className="col-span-full text-center py-20 text-gray-400">Syncing Inventory...</div>
// //         ) : filteredItems.length > 0 ? (
// //           filteredItems.map(item => (
// //             <InventoryCard 
// //               key={item.stockRecordId} 
// //               item={item} 
// //               cartQty={cart.find(i => i.stockRecordId === item.stockRecordId)?.qtyBaseUnit || 0}
// //               onAddToCart={handleAddToCart} 
// //             />
// //           ))
// //         ) : (
// //           <div className="col-span-full text-center py-20 text-gray-400 flex flex-col items-center">
// //             <PackageOpen className="w-12 h-12 mb-2 opacity-20" />
// //             <p className="font-medium">Your kitchen stock is empty.</p>
// //             <p className="text-sm">Contact admin to transfer items.</p>
// //           </div>
// //         )}
// //       </main>

// //       {cart.length > 0 && (
// //         <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md">
// //           <button 
// //             onClick={handleCheckout}
// //             disabled={loading}
// //             className={`w-full ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white py-4 rounded-2xl font-bold shadow-xl flex justify-between px-6 items-center transition-all active:scale-95`}
// //           >
// //             <div className="flex items-center gap-2">
// //               <ShoppingCart className="w-5 h-5" />
// //               <span>{loading ? "Ordering..." : `Confirm Order (${cart.length} Items)`}</span>
// //             </div>
// //             <span className="bg-green-800 px-3 py-1 rounded-lg">Send →</span>
// //           </button>
// //         </div>
// //       )}
// //     </div>
// //   );
// // };








// import React, { useState, useEffect, useMemo } from 'react';
// import { api } from "../api.js";
// import InventoryCard from './InventoryCard';
// import { ShoppingCart, Search, PackageOpen } from 'lucide-react';

// export const ClientInventory = () => {
//   const [items, setItems] = useState([]);
//   const [groups, setGroups] = useState([]);
//   const [selectedGroup, setSelectedGroup] = useState("all");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [cart, setCart] = useState([]);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         setLoading(true);
//         // Using the specific operations route we built
//         const [itemsRes, groupsRes] = await Promise.all([
//           api.get('/operations/my-kitchen-stock'), 
//           api.get('/inventory/stock-groups')
//         ]);
//         setItems(itemsRes.data);
//         setGroups(groupsRes.data);
//       } catch (err) {
//         console.error("Sync Error:", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, []);

//   // Filter & Alphabetical Sort
//   const filteredItems = useMemo(() => {
//     return items
//       .filter(item => {
//         const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase());
//         const matchesGroup = selectedGroup === "all" || item.stockGroupId === selectedGroup;
//         return matchesSearch && matchesGroup;
//       })
//       .sort((a, b) => a.name.localeCompare(b.name)); // Alphabetical Sort
//   }, [items, searchTerm, selectedGroup]);

//   const handleAddToCart = (item, orderQty) => {
//     setCart(prev => {
//       const existing = prev.find(i => i.stockRecordId === item.stockRecordId);
//       if (orderQty <= 0) return prev.filter(i => i.stockRecordId !== item.stockRecordId);
      
//       if (existing) {
//         return prev.map(i => i.stockRecordId === item.stockRecordId ? { ...i, qtyBaseUnit: orderQty } : i);
//       }
//       return [...prev, { stockRecordId: item.stockRecordId, qtyBaseUnit: orderQty, name: item.name }];
//     });
//   };

//   const handleCheckout = async () => {
//     if (cart.length === 0) return;
//     setLoading(true);
//     try {
//       await api.post("/operations/orders", { items: cart });
//       alert("Order Placed Successfully!");
//       setCart([]); 
//       const itemsRes = await api.get('/operations/my-kitchen-stock');
//       setItems(itemsRes.data);
//     } catch (err) {
//       alert(err.response?.data?.error || "Checkout Failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 pb-20 font-sans">
//       <header className="sticky top-0 bg-white border-b z-10 p-4 flex justify-between items-center shadow-sm">
//         <div className="flex items-center gap-2">
//             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">K</div>
//             <h1 className="text-xl font-black text-gray-800 tracking-tighter italic uppercase">Kitchen Hub</h1>
//         </div>
//         <div className="relative p-2 bg-gray-100 rounded-full">
//           <ShoppingCart className="w-5 h-5 text-gray-700" />
//           {cart.length > 0 && (
//             <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
//               {cart.length}
//             </span>
//           )}
//         </div>
//       </header>

//       <div className="p-4 space-y-4">
//         <div className="relative group">
//           <Search className="absolute left-4 top-3 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
//           <input 
//             type="text" 
//             placeholder="Search kitchen inventory..." 
//             className="w-full pl-11 pr-4 py-3 border-2 border-gray-100 rounded-2xl bg-white outline-none focus:border-blue-500 transition-all shadow-sm"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//           />
//         </div>

//         <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
//           <button 
//             onClick={() => setSelectedGroup("all")}
//             className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${selectedGroup === "all" ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "bg-white text-gray-400 border border-gray-100"}`}
//           >All</button>
//           {groups.map(group => (
//             <button 
//               key={group._id}
//               onClick={() => setSelectedGroup(group._id)}
//               className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedGroup === group._id ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "bg-white text-gray-400 border border-gray-100"}`}
//             >{group.name}</button>
//           ))}
//         </div>
//       </div>

//       <main className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
//         {loading ? (
//            <div className="col-span-full text-center py-20 text-gray-400 animate-pulse font-bold">Syncing Kitchen Stock...</div>
//         ) : filteredItems.length > 0 ? (
//           filteredItems.map(item => (
//             <InventoryCard 
//               key={item.stockRecordId} 
//               item={item} 
//               cartQty={cart.find(i => i.stockRecordId === item.stockRecordId)?.qtyBaseUnit || 0}
//               onAddToCart={handleAddToCart} 
//             />
//           ))
//         ) : (
//           <div className="col-span-full text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center">
//             <PackageOpen className="w-12 h-12 mb-4 text-gray-200" />
//             <p className="font-black text-gray-400 uppercase text-xs tracking-widest">No Items in Kitchen</p>
//           </div>
//         )}
//       </main>

//       {cart.length > 0 && (
//         <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md">
//           <button 
//             onClick={handleCheckout}
//             disabled={loading}
//             className="w-full bg-gray-900 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex justify-between px-8 items-center active:scale-95 transition-all"
//           >
//             <span>{loading ? "Ordering..." : `Confirm Order (${cart.length})`}</span>
//             <span className="bg-white/20 px-3 py-1 rounded-lg">Proceed →</span>
//           </button>
//         </div>
//       )}
//     </div>
//   );
// };





import React, { useState, useEffect, useMemo } from 'react';
import { api } from "../api.js";
import InventoryCard from './InventoryCard';
import { ShoppingCart, Search, PackageOpen } from 'lucide-react';

export const ClientInventory = () => {
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [itemsRes, groupsRes] = await Promise.all([
          api.get('/operations/my-kitchen-stock'), 
          api.get('/inventory/stock-groups')
        ]);
        setItems(itemsRes.data);
        setGroups(groupsRes.data);
      } catch (err) {
        console.error("Sync Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredItems = useMemo(() => {
    return items
      .filter(item => {
        const itemName = item.name || "";
        const matchesSearch = itemName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGroup = selectedGroup === "all" || item.stockGroupId === selectedGroup;
        return matchesSearch && matchesGroup;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, searchTerm, selectedGroup]);

  const handleAddToCart = (item, orderQty) => {
    setCart(prev => {
      const existing = prev.find(i => i.stockRecordId === item.stockRecordId);
      if (orderQty <= 0) return prev.filter(i => i.stockRecordId !== item.stockRecordId);
      
      if (existing) {
        return prev.map(i => i.stockRecordId === item.stockRecordId ? { ...i, qtyBaseUnit: orderQty } : i);
      }
      return [...prev, { stockRecordId: item.stockRecordId, qtyBaseUnit: orderQty, name: item.name }];
    });
  };

  const handleCheckout = async () => {
  if (cart.length === 0) return;
  setLoading(true);
  try {
    // The backend expects { items: [...] } 
    // Your handleStockProcessing uses item.stockRecordId and item.qtyBaseUnit
    await api.post("/operations/orders", { items: cart });
    
    alert("Order Placed Successfully!");
    setCart([]); 
    
    // Refresh stock from backend to reflect new quantities
    const itemsRes = await api.get('/operations/my-kitchen-stock');
    setItems(itemsRes.data);
  } catch (err) {
    alert(err.response?.data?.error || "Checkout Failed");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      <header className="sticky top-0 bg-white border-b z-10 p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold">K</div>
            <h1 className="text-xl font-black text-gray-800 tracking-tighter italic uppercase">Kitchen Hub</h1>
        </div>
        <div className="relative p-2 bg-gray-100 rounded-full">
          <ShoppingCart className="w-5 h-5 text-gray-700" />
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
              {cart.length}
            </span>
          )}
        </div>
      </header>

      <div className="p-4 space-y-4">
        <div className="relative group">
          <Search className="absolute left-4 top-3 w-4 h-4 text-gray-400 group-focus-within:text-green-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search kitchen inventory..." 
            className="w-full pl-11 pr-4 py-3 border-2 border-gray-100 rounded-2xl bg-white outline-none focus:border-green-500 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setSelectedGroup("all")}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${selectedGroup === "all" ? "bg-green-600 text-white shadow-lg" : "bg-white text-gray-400 border border-gray-100"}`}
          >All</button>
          {groups.map(group => (
            <button 
              key={group._id}
              onClick={() => setSelectedGroup(group._id)}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedGroup === group._id ? "bg-green-600 text-white shadow-lg" : "bg-white text-gray-400 border border-gray-100"}`}
            >{group.name}</button>
          ))}
        </div>
      </div>

      <main className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? (
           <div className="col-span-full text-center py-20 text-gray-400 animate-pulse font-bold">Syncing...</div>
        ) : filteredItems.length > 0 ? (
          filteredItems.map(item => (
            <InventoryCard 
              key={item.stockRecordId} 
              item={item} 
              cartQty={cart.find(i => i.stockRecordId === item.stockRecordId)?.qtyBaseUnit || 0}
              onAddToCart={handleAddToCart} 
            />
          ))
        ) : (
          <div className="col-span-full text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center">
            <PackageOpen className="w-12 h-12 mb-4 text-gray-200" />
            <p className="font-black text-gray-400 uppercase text-xs tracking-widest">No Items Found</p>
          </div>
        )}
      </main>

      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md">
          <button 
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-gray-900 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex justify-between px-8 items-center active:scale-95 transition-all"
          >
            <span>Confirm Order ({cart.length})</span>
            <span className="bg-white/20 px-3 py-1 rounded-lg">Proceed →</span>
          </button>
        </div>
      )}
    </div>
  );
};



