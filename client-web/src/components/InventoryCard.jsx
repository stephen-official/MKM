// // // // // // // // // // // // // // // import React, { useState } from 'react';

// // // // // // // // // // // // // // // const InventoryCard = ({ item, onAddToCart }) => {
// // // // // // // // // // // // // // //   // item contains { name, imageUrl, unitId: { name, symbol, subUnits: [...] } }
// // // // // // // // // // // // // // //   const [selectedSubUnit, setSelectedSubUnit] = useState(null);
// // // // // // // // // // // // // // //   const [inputValue, setInputValue] = useState("");

// // // // // // // // // // // // // // //   // Calculate what the "Base Quantity" will be (e.g. 500g -> 0.5kg)
// // // // // // // // // // // // // // //   const getBaseQty = () => {
// // // // // // // // // // // // // // //     if (!selectedSubUnit) return parseFloat(inputValue) || 0;
// // // // // // // // // // // // // // //     return (parseFloat(inputValue) || 0) * selectedSubUnit.factorToBase;
// // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // //   const handleAdd = () => {
// // // // // // // // // // // // // // //     if (!inputValue || inputValue <= 0) return;

// // // // // // // // // // // // // // //     const cartItem = {
// // // // // // // // // // // // // // //       stockItemId: item._id,
// // // // // // // // // // // // // // //       name: item.name,
// // // // // // // // // // // // // // //       displayQty: inputValue,
// // // // // // // // // // // // // // //       displayUnit: selectedSubUnit ? selectedSubUnit.name : item.unitId.symbol,
// // // // // // // // // // // // // // //       qtyBaseUnit: getBaseQty(), // This is what the backend actually uses
// // // // // // // // // // // // // // //     };

// // // // // // // // // // // // // // //     onAddToCart(cartItem);
// // // // // // // // // // // // // // //     setInputValue(""); // Reset
// // // // // // // // // // // // // // //   };

// // // // // // // // // // // // // // //   return (
// // // // // // // // // // // // // // //     <div className="item-card shadow-md rounded-xl p-3 mb-4 bg-white border border-gray-100">
// // // // // // // // // // // // // // //       <div className="flex items-center gap-4">
// // // // // // // // // // // // // // //         {item.imageUrl && (
// // // // // // // // // // // // // // //           <img 
// // // // // // // // // // // // // // //             src={item.imageUrl} 
// // // // // // // // // // // // // // //             alt={item.name} 
// // // // // // // // // // // // // // //             className="w-16 h-16 rounded-lg object-cover" 
// // // // // // // // // // // // // // //           />
// // // // // // // // // // // // // // //         )}
// // // // // // // // // // // // // // //         <div className="flex-1">
// // // // // // // // // // // // // // //           <h3 className="font-bold text-lg">{item.name}</h3>
// // // // // // // // // // // // // // //           <p className="text-sm text-gray-500">Base Unit: {item.unitId.symbol}</p>
// // // // // // // // // // // // // // //         </div>
// // // // // // // // // // // // // // //       </div>

// // // // // // // // // // // // // // //       <div className="mt-4 flex gap-2">
// // // // // // // // // // // // // // //         {/* Input for Quantity */}
// // // // // // // // // // // // // // //         <input
// // // // // // // // // // // // // // //           type="number"
// // // // // // // // // // // // // // //           placeholder="Qty"
// // // // // // // // // // // // // // //           className="w-20 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
// // // // // // // // // // // // // // //           value={inputValue}
// // // // // // // // // // // // // // //           onChange={(e) => setInputValue(e.target.value)}
// // // // // // // // // // // // // // //         />

// // // // // // // // // // // // // // //         {/* Dropdown for Sub-Units (if any exist) */}
// // // // // // // // // // // // // // //         {item.unitId.subUnits && item.unitId.subUnits.length > 0 && (
// // // // // // // // // // // // // // //           <select 
// // // // // // // // // // // // // // //             className="flex-1 p-2 border rounded-lg bg-gray-50"
// // // // // // // // // // // // // // //             onChange={(e) => setSelectedSubUnit(JSON.parse(e.target.value))}
// // // // // // // // // // // // // // //           >
// // // // // // // // // // // // // // //             <option value={JSON.stringify({ factorToBase: 1, name: item.unitId.symbol })}>
// // // // // // // // // // // // // // //               {item.unitId.symbol} (Base)
// // // // // // // // // // // // // // //             </option>
// // // // // // // // // // // // // // //             {item.unitId.subUnits.map((sub) => (
// // // // // // // // // // // // // // //               <option key={sub.name} value={JSON.stringify(sub)}>
// // // // // // // // // // // // // // //                 {sub.name}
// // // // // // // // // // // // // // //               </option>
// // // // // // // // // // // // // // //             ))}
// // // // // // // // // // // // // // //           </select>
// // // // // // // // // // // // // // //         )}

// // // // // // // // // // // // // // //         <button 
// // // // // // // // // // // // // // //           onClick={handleAdd}
// // // // // // // // // // // // // // //           className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold active:scale-95 transition"
// // // // // // // // // // // // // // //         >
// // // // // // // // // // // // // // //           Add
// // // // // // // // // // // // // // //         </button>
// // // // // // // // // // // // // // //       </div>

// // // // // // // // // // // // // // //       {inputValue > 0 && (
// // // // // // // // // // // // // // //         <p className="text-xs mt-2 text-blue-600 italic">
// // // // // // // // // // // // // // //           Recording as: {getBaseQty()} {item.unitId.symbol}
// // // // // // // // // // // // // // //         </p>
// // // // // // // // // // // // // // //       )}
// // // // // // // // // // // // // // //     </div>
// // // // // // // // // // // // // // //   );
// // // // // // // // // // // // // // // };

// // // // // // // // // // // // // // // export default InventoryCard;






// // // // // // // // // // // // // // import React, { useState } from 'react';

// // // // // // // // // // // // // // const InventoryCard = ({ item, onAddToCart }) => {
// // // // // // // // // // // // // //   // item contains: { name, imageUrl, unitId: { symbol, subUnits: [...] } }
// // // // // // // // // // // // // //   const [selectedSubUnit, setSelectedSubUnit] = useState(null);
// // // // // // // // // // // // // //   const [inputValue, setInputValue] = useState("");

// // // // // // // // // // // // // //   const getBaseQty = () => {
// // // // // // // // // // // // // //     if (!selectedSubUnit) return parseFloat(inputValue) || 0;
// // // // // // // // // // // // // //     return (parseFloat(inputValue) || 0) * selectedSubUnit.factorToBase;
// // // // // // // // // // // // // //   };

// // // // // // // // // // // // // //   const handleAdd = () => {
// // // // // // // // // // // // // //     if (!inputValue || inputValue <= 0) return;

// // // // // // // // // // // // // //     const cartItem = {
// // // // // // // // // // // // // //       stockItemId: item._id,
// // // // // // // // // // // // // //       name: item.name,
// // // // // // // // // // // // // //       imageUrl: item.imageUrl, // Pass the image along to the cart if needed
// // // // // // // // // // // // // //       displayQty: inputValue,
// // // // // // // // // // // // // //       displayUnit: selectedSubUnit ? selectedSubUnit.name : item.unitId.symbol,
// // // // // // // // // // // // // //       qtyBaseUnit: getBaseQty(),
// // // // // // // // // // // // // //     };

// // // // // // // // // // // // // //     onAddToCart(cartItem);
// // // // // // // // // // // // // //     setInputValue("");
// // // // // // // // // // // // // //   };

// // // // // // // // // // // // // //   return (
// // // // // // // // // // // // // //     <div className="item-card shadow-md rounded-xl p-3 mb-4 bg-white border border-gray-100">
// // // // // // // // // // // // // //       <div className="flex items-center gap-4">
// // // // // // // // // // // // // //         {/* DISPLAY ADMIN UPLOADED IMAGE */}
// // // // // // // // // // // // // //         <div className="w-20 h-20 flex-shrink-0 bg-gray-50 rounded-lg border overflow-hidden flex items-center justify-center">
// // // // // // // // // // // // // //           {item.imageUrl ? (
// // // // // // // // // // // // // //             <img 
// // // // // // // // // // // // // //               src={item.imageUrl} 
// // // // // // // // // // // // // //               alt={item.name} 
// // // // // // // // // // // // // //               className="w-full h-full object-contain"
// // // // // // // // // // // // // //               onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=No+Image'; }}
// // // // // // // // // // // // // //             />
// // // // // // // // // // // // // //           ) : (
// // // // // // // // // // // // // //             <div className="text-[10px] text-gray-400">No Image</div>
// // // // // // // // // // // // // //           )}
// // // // // // // // // // // // // //         </div>

// // // // // // // // // // // // // //         <div className="flex-1">
// // // // // // // // // // // // // //           <h3 className="font-bold text-lg text-gray-800">{item.name}</h3>
// // // // // // // // // // // // // //           <p className="text-sm text-gray-500 italic">Base: {item.unitId?.symbol || 'Unit'}</p>
// // // // // // // // // // // // // //         </div>
// // // // // // // // // // // // // //       </div>

// // // // // // // // // // // // // //       <div className="mt-4 flex gap-2">
// // // // // // // // // // // // // //         <input
// // // // // // // // // // // // // //           type="number"
// // // // // // // // // // // // // //           placeholder="Qty"
// // // // // // // // // // // // // //           className="w-24 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center font-semibold"
// // // // // // // // // // // // // //           value={inputValue}
// // // // // // // // // // // // // //           onChange={(e) => setInputValue(e.target.value)}
// // // // // // // // // // // // // //         />

// // // // // // // // // // // // // //         {item.unitId?.subUnits?.length > 0 && (
// // // // // // // // // // // // // //           <select 
// // // // // // // // // // // // // //             className="flex-1 p-2 border rounded-lg bg-gray-50 text-sm font-medium"
// // // // // // // // // // // // // //             onChange={(e) => setSelectedSubUnit(JSON.parse(e.target.value))}
// // // // // // // // // // // // // //           >
// // // // // // // // // // // // // //             <option value={JSON.stringify({ factorToBase: 1, name: item.unitId.symbol })}>
// // // // // // // // // // // // // //               {item.unitId.symbol} (Base)
// // // // // // // // // // // // // //             </option>
// // // // // // // // // // // // // //             {item.unitId.subUnits.map((sub) => (
// // // // // // // // // // // // // //               <option key={sub.name} value={JSON.stringify(sub)}>
// // // // // // // // // // // // // //                 {sub.name}
// // // // // // // // // // // // // //               </option>
// // // // // // // // // // // // // //             ))}
// // // // // // // // // // // // // //           </select>
// // // // // // // // // // // // // //         )}

// // // // // // // // // // // // // //         <button 
// // // // // // // // // // // // // //           onClick={handleAdd}
// // // // // // // // // // // // // //           className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold active:scale-95 transition-all shadow-sm"
// // // // // // // // // // // // // //         >
// // // // // // // // // // // // // //           Add
// // // // // // // // // // // // // //         </button>
// // // // // // // // // // // // // //       </div>

// // // // // // // // // // // // // //       {inputValue > 0 && (
// // // // // // // // // // // // // //         <p className="text-xs mt-2 text-blue-600 font-medium">
// // // // // // // // // // // // // //           Total: {getBaseQty()} {item.unitId?.symbol}
// // // // // // // // // // // // // //         </p>
// // // // // // // // // // // // // //       )}
// // // // // // // // // // // // // //     </div>
// // // // // // // // // // // // // //   );
// // // // // // // // // // // // // // };

// // // // // // // // // // // // // // export default InventoryCard;




// // // // // // // // // // // // // import React, { useState } from 'react';

// // // // // // // // // // // // // const InventoryCard = ({ item, onAddToCart }) => {
// // // // // // // // // // // // //   const [orderQty, setOrderQty] = useState(1);
// // // // // // // // // // // // //   const imgUrl = item.image ? `http://localhost:5000/uploads/${item.image}` : "https://placehold.co/200x200?text=Food+Item";

// // // // // // // // // // // // //   return (
// // // // // // // // // // // // //     <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-shadow">
// // // // // // // // // // // // //       {/* Stock availability badge */}
// // // // // // // // // // // // //       <div className="mb-2">
// // // // // // // // // // // // //         <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded-md">
// // // // // // // // // // // // //           {item.currentStock} Units Available
// // // // // // // // // // // // //         </span>
// // // // // // // // // // // // //       </div>

// // // // // // // // // // // // //       <div className="aspect-square bg-gray-50 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
// // // // // // // // // // // // //         <img 
// // // // // // // // // // // // //           src={imgUrl} 
// // // // // // // // // // // // //           alt={item.name} 
// // // // // // // // // // // // //           className="w-full h-full object-contain p-2"
// // // // // // // // // // // // //           onError={(e) => { e.target.src = "https://placehold.co/200x200?text=No+Image"; }}
// // // // // // // // // // // // //         />
// // // // // // // // // // // // //       </div>
      
// // // // // // // // // // // // //       <h3 className="text-sm font-bold text-gray-800 mb-4 line-clamp-1">{item.name}</h3>

// // // // // // // // // // // // //       {/* Quantity Selector & Add Button */}
// // // // // // // // // // // // //       <div className="mt-auto flex items-center gap-2">
// // // // // // // // // // // // //         <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
// // // // // // // // // // // // //           <button 
// // // // // // // // // // // // //             onClick={() => setOrderQty(Math.max(1, orderQty - 1))}
// // // // // // // // // // // // //             className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold"
// // // // // // // // // // // // //           >-</button>
// // // // // // // // // // // // //           <input 
// // // // // // // // // // // // //             type="number" 
// // // // // // // // // // // // //             value={orderQty}
// // // // // // // // // // // // //             onChange={(e) => setOrderQty(Math.min(item.currentStock, Math.max(1, parseInt(e.target.value) || 1)))}
// // // // // // // // // // // // //             className="w-10 text-center text-xs font-bold focus:outline-none"
// // // // // // // // // // // // //           />
// // // // // // // // // // // // //           <button 
// // // // // // // // // // // // //             onClick={() => setOrderQty(Math.min(item.currentStock, orderQty + 1))}
// // // // // // // // // // // // //             className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold"
// // // // // // // // // // // // //           >+</button>
// // // // // // // // // // // // //         </div>

// // // // // // // // // // // // //         <button 
// // // // // // // // // // // // //           onClick={() => onAddToCart({ ...item, requestedQty: orderQty })}
// // // // // // // // // // // // //           className="flex-grow bg-green-600 text-white py-2 rounded-lg font-black text-[10px] hover:bg-green-700 transition-colors uppercase"
// // // // // // // // // // // // //         >
// // // // // // // // // // // // //           Add to Cart
// // // // // // // // // // // // //         </button>
// // // // // // // // // // // // //       </div>
// // // // // // // // // // // // //     </div>
// // // // // // // // // // // // //   );
// // // // // // // // // // // // // };

// // // // // // // // // // // // // export default InventoryCard;



// // // // // // // // // // // // import React, { useState } from 'react';

// // // // // // // // // // // // const InventoryCard = ({ item, onAddToCart }) => {
// // // // // // // // // // // //   const [orderQty, setOrderQty] = useState(1);
// // // // // // // // // // // //   const imgUrl = item.image ? `http://localhost:5000/uploads/${item.image}` : "https://placehold.co/200x200?text=No+Image";

// // // // // // // // // // // //   // Handles direct number input
// // // // // // // // // // // //   const handleInputChange = (e) => {
// // // // // // // // // // // //     const val = parseInt(e.target.value);
// // // // // // // // // // // //     if (isNaN(val) || val < 1) {
// // // // // // // // // // // //       setOrderQty(1);
// // // // // // // // // // // //     } else if (val > item.currentStock) {
// // // // // // // // // // // //       setOrderQty(item.currentStock);
// // // // // // // // // // // //     } else {
// // // // // // // // // // // //       setOrderQty(val);
// // // // // // // // // // // //     }
// // // // // // // // // // // //   };

// // // // // // // // // // // //   return (
// // // // // // // // // // // //     <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-shadow">
// // // // // // // // // // // //       {/* Product Image */}
// // // // // // // // // // // //       <div className="aspect-square bg-gray-50 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
// // // // // // // // // // // //         <img 
// // // // // // // // // // // //           src={imgUrl} 
// // // // // // // // // // // //           alt={item.name} 
// // // // // // // // // // // //           className="w-full h-full object-contain p-2"
// // // // // // // // // // // //           onError={(e) => { e.target.src = "https://placehold.co/200x200?text=No+Image"; }}
// // // // // // // // // // // //         />
// // // // // // // // // // // //       </div>
      
// // // // // // // // // // // //       {/* Product Name */}
// // // // // // // // // // // //       <h3 className="text-sm font-bold text-gray-800 mb-1 line-clamp-1">{item.name}</h3>

// // // // // // // // // // // //       {/* Available Quantity - Below Image/Name */}
// // // // // // // // // // // //       <div className="mb-4">
// // // // // // // // // // // //         <div className="flex items-center justify-between bg-blue-50 px-3 py-1.5 rounded-lg">
// // // // // // // // // // // //           <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">Available Stock</span>
// // // // // // // // // // // //           <span className="text-xs font-black text-blue-700">{item.currentStock} Units</span>
// // // // // // // // // // // //         </div>
// // // // // // // // // // // //       </div>

// // // // // // // // // // // //       {/* Quantity Selector & Add Button */}
// // // // // // // // // // // //       <div className="mt-auto space-y-2">
// // // // // // // // // // // //         <div className="flex items-center justify-between border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
// // // // // // // // // // // //           <button 
// // // // // // // // // // // //             type="button"
// // // // // // // // // // // //             onClick={() => setOrderQty(Math.max(1, orderQty - 1))}
// // // // // // // // // // // //             className="px-4 py-2 hover:bg-gray-200 text-gray-600 font-black transition-colors"
// // // // // // // // // // // //           >
// // // // // // // // // // // //             −
// // // // // // // // // // // //           </button>
// // // // // // // // // // // //           <input 
// // // // // // // // // // // //             type="number" 
// // // // // // // // // // // //             value={orderQty}
// // // // // // // // // // // //             onChange={handleInputChange}
// // // // // // // // // // // //             className="w-full text-center bg-transparent text-sm font-black text-gray-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
// // // // // // // // // // // //           />
// // // // // // // // // // // //           <button 
// // // // // // // // // // // //             type="button"
// // // // // // // // // // // //             onClick={() => setOrderQty(Math.min(item.currentStock, orderQty + 1))}
// // // // // // // // // // // //             className="px-4 py-2 hover:bg-gray-200 text-gray-600 font-black transition-colors"
// // // // // // // // // // // //           >
// // // // // // // // // // // //             +
// // // // // // // // // // // //           </button>
// // // // // // // // // // // //         </div>

// // // // // // // // // // // //         <button 
// // // // // // // // // // // //           onClick={() => onAddToCart({ ...item, requestedQty: orderQty })}
// // // // // // // // // // // //           className="w-full bg-green-600 text-white py-3 rounded-xl font-black text-[11px] hover:bg-green-700 active:scale-95 transition-all uppercase tracking-widest shadow-lg shadow-green-100"
// // // // // // // // // // // //         >
// // // // // // // // // // // //           Add to Cart
// // // // // // // // // // // //         </button>
// // // // // // // // // // // //       </div>
// // // // // // // // // // // //     </div>
// // // // // // // // // // // //   );
// // // // // // // // // // // // };

// // // // // // // // // // // // export default InventoryCard;







// // // // // // // // // // // import React, { useState } from 'react';

// // // // // // // // // // // const InventoryCard = ({ item, onAddToCart }) => {
// // // // // // // // // // //   const [orderQty, setOrderQty] = useState(1);
  
// // // // // // // // // // //   // Your Admin code uses 'imageUrl' to store the Cloudinary link
// // // // // // // // // // //   const imgUrl = item.imageUrl || "https://placehold.co/200x200?text=No+Image";

// // // // // // // // // // //   const handleInputChange = (e) => {
// // // // // // // // // // //     const val = parseInt(e.target.value);
// // // // // // // // // // //     if (isNaN(val) || val < 1) {
// // // // // // // // // // //       setOrderQty(1);
// // // // // // // // // // //     } else if (val > item.currentStock) {
// // // // // // // // // // //       setOrderQty(item.currentStock);
// // // // // // // // // // //     } else {
// // // // // // // // // // //       setOrderQty(val);
// // // // // // // // // // //     }
// // // // // // // // // // //   };

// // // // // // // // // // //   const handleAddAction = () => {
// // // // // // // // // // //     if (item.currentStock <= 0) return;
// // // // // // // // // // //     onAddToCart(item, orderQty);
// // // // // // // // // // //     setOrderQty(1); // Reset card input after adding
// // // // // // // // // // //   };

// // // // // // // // // // //   return (
// // // // // // // // // // //     <div className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col h-full transition-all ${item.currentStock <= 0 ? 'opacity-60' : 'hover:shadow-md'}`}>
      
// // // // // // // // // // //       {/* Product Image - Using Absolute Cloudinary URL */}
// // // // // // // // // // //       <div className="aspect-square bg-gray-50 rounded-xl mb-3 flex items-center justify-center overflow-hidden border border-gray-50">
// // // // // // // // // // //         <img 
// // // // // // // // // // //           src={imgUrl} 
// // // // // // // // // // //           alt={item.name} 
// // // // // // // // // // //           className="w-full h-full object-contain p-2"
// // // // // // // // // // //           onError={(e) => { e.target.src = "https://placehold.co/200x200?text=Image+Error"; }}
// // // // // // // // // // //         />
// // // // // // // // // // //       </div>
      
// // // // // // // // // // //       {/* Product Name */}
// // // // // // // // // // //       <h3 className="text-sm font-bold text-gray-800 mb-1 line-clamp-1 uppercase tracking-tight">
// // // // // // // // // // //         {item.name}
// // // // // // // // // // //       </h3>

// // // // // // // // // // //       {/* Available Quantity Badge */}
// // // // // // // // // // //       <div className="mb-4">
// // // // // // // // // // //         <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${item.currentStock > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
// // // // // // // // // // //           <span className="text-[10px] font-black uppercase tracking-tighter">
// // // // // // // // // // //             {item.currentStock > 0 ? 'Available' : 'Out of Stock'}
// // // // // // // // // // //           </span>
// // // // // // // // // // //           <span className="text-xs font-black">{item.currentStock} Units</span>
// // // // // // // // // // //         </div>
// // // // // // // // // // //       </div>

// // // // // // // // // // //       {/* Quantity Selector & Add Button */}
// // // // // // // // // // //       <div className="mt-auto space-y-2">
// // // // // // // // // // //         <div className="flex items-center justify-between border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
// // // // // // // // // // //           <button 
// // // // // // // // // // //             type="button"
// // // // // // // // // // //             disabled={item.currentStock <= 0}
// // // // // // // // // // //             onClick={() => setOrderQty(Math.max(1, orderQty - 1))}
// // // // // // // // // // //             className="px-4 py-2 hover:bg-gray-200 text-gray-600 font-black disabled:opacity-30"
// // // // // // // // // // //           >
// // // // // // // // // // //             −
// // // // // // // // // // //           </button>
// // // // // // // // // // //           <input 
// // // // // // // // // // //             type="number" 
// // // // // // // // // // //             value={orderQty}
// // // // // // // // // // //             disabled={item.currentStock <= 0}
// // // // // // // // // // //             onChange={handleInputChange}
// // // // // // // // // // //             className="w-full text-center bg-transparent text-sm font-black text-gray-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
// // // // // // // // // // //           />
// // // // // // // // // // //           <button 
// // // // // // // // // // //             type="button"
// // // // // // // // // // //             disabled={item.currentStock <= 0}
// // // // // // // // // // //             onClick={() => setOrderQty(Math.min(item.currentStock, orderQty + 1))}
// // // // // // // // // // //             className="px-4 py-2 hover:bg-gray-200 text-gray-600 font-black disabled:opacity-30"
// // // // // // // // // // //           >
// // // // // // // // // // //             +
// // // // // // // // // // //           </button>
// // // // // // // // // // //         </div>

// // // // // // // // // // //         <button 
// // // // // // // // // // //           onClick={handleAddAction}
// // // // // // // // // // //           disabled={item.currentStock <= 0}
// // // // // // // // // // //           className="w-full bg-green-600 text-white py-3 rounded-xl font-black text-[11px] hover:bg-green-700 active:scale-95 disabled:bg-gray-300 transition-all uppercase tracking-widest shadow-lg shadow-green-100"
// // // // // // // // // // //         >
// // // // // // // // // // //           {item.currentStock > 0 ? 'Add to Cart' : 'Stock Out'}
// // // // // // // // // // //         </button>
// // // // // // // // // // //       </div>
// // // // // // // // // // //     </div>
// // // // // // // // // // //   );
// // // // // // // // // // // };

// // // // // // // // // // // export default InventoryCard;




// // // // // // // // // // import React, { useState } from 'react';

// // // // // // // // // // const InventoryCard = ({ item, onAddToCart }) => {
// // // // // // // // // //   const [orderQty, setOrderQty] = useState(1);
  
// // // // // // // // // //   // Use the imageUrl from Cloudinary stored in your DB
// // // // // // // // // //   const imgUrl = item.imageUrl || "https://placehold.co/200x200?text=No+Image";

// // // // // // // // // //   const handleInputChange = (e) => {
// // // // // // // // // //     const val = parseInt(e.target.value);
// // // // // // // // // //     // Logic: If empty/NaN, set to 0. If > stock, cap it. Otherwise, use val.
// // // // // // // // // //     if (isNaN(val) || val < 0) {
// // // // // // // // // //       setOrderQty(0);
// // // // // // // // // //     } else if (val > item.currentStock) {
// // // // // // // // // //       setOrderQty(item.currentStock);
// // // // // // // // // //     } else {
// // // // // // // // // //       setOrderQty(val);
// // // // // // // // // //     }
// // // // // // // // // //   };

// // // // // // // // // //   const handleAddAction = () => {
// // // // // // // // // //     if (item.currentStock <= 0 || orderQty <= 0) return;
// // // // // // // // // //     onAddToCart(item, orderQty);
// // // // // // // // // //     setOrderQty(1); // Reset card input to 1 after successful add
// // // // // // // // // //   };

// // // // // // // // // //   return (
// // // // // // // // // //     <div className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col h-full transition-all ${item.currentStock <= 0 ? 'opacity-60' : 'hover:shadow-md'}`}>
      
// // // // // // // // // //       {/* Product Image - Cloudinary */}
// // // // // // // // // //       <div className="aspect-square bg-gray-50 rounded-xl mb-3 flex items-center justify-center overflow-hidden border border-gray-50">
// // // // // // // // // //         <img 
// // // // // // // // // //           src={imgUrl} 
// // // // // // // // // //           alt={item.name} 
// // // // // // // // // //           className="w-full h-full object-contain p-2"
// // // // // // // // // //           onError={(e) => { e.target.src = "https://placehold.co/200x200?text=Image+Error"; }}
// // // // // // // // // //         />
// // // // // // // // // //       </div>
      
// // // // // // // // // //       {/* Product Name */}
// // // // // // // // // //       <h3 className="text-sm font-bold text-gray-800 mb-1 line-clamp-1 uppercase tracking-tight">
// // // // // // // // // //         {item.name}
// // // // // // // // // //       </h3>

// // // // // // // // // //       {/* Available Quantity Badge */}
// // // // // // // // // //       <div className="mb-4">
// // // // // // // // // //         <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${item.currentStock > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
// // // // // // // // // //           <span className="text-[10px] font-black uppercase tracking-tighter">
// // // // // // // // // //             {item.currentStock > 0 ? 'Available' : 'Out of Stock'}
// // // // // // // // // //           </span>
// // // // // // // // // //           <span className="text-xs font-black">{item.currentStock} Units</span>
// // // // // // // // // //         </div>
// // // // // // // // // //       </div>

// // // // // // // // // //       {/* Quantity Selector & Add Button */}
// // // // // // // // // //       <div className="mt-auto space-y-2">
// // // // // // // // // //         <div className="flex items-center justify-between border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
// // // // // // // // // //           <button 
// // // // // // // // // //             type="button"
// // // // // // // // // //             disabled={item.currentStock <= 0}
// // // // // // // // // //             onClick={() => setOrderQty(Math.max(0, orderQty - 1))} // Allows decreasing to 0
// // // // // // // // // //             className="px-4 py-2 hover:bg-gray-200 text-gray-600 font-black disabled:opacity-30"
// // // // // // // // // //           >
// // // // // // // // // //             −
// // // // // // // // // //           </button>
// // // // // // // // // //           <input 
// // // // // // // // // //             type="number" 
// // // // // // // // // //             value={orderQty}
// // // // // // // // // //             disabled={item.currentStock <= 0}
// // // // // // // // // //             onChange={handleInputChange}
// // // // // // // // // //             className="w-full text-center bg-transparent text-sm font-black text-gray-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
// // // // // // // // // //           />
// // // // // // // // // //           <button 
// // // // // // // // // //             type="button"
// // // // // // // // // //             disabled={item.currentStock <= 0}
// // // // // // // // // //             onClick={() => setOrderQty(Math.min(item.currentStock, orderQty + 1))}
// // // // // // // // // //             className="px-4 py-2 hover:bg-gray-200 text-gray-600 font-black disabled:opacity-30"
// // // // // // // // // //           >
// // // // // // // // // //             +
// // // // // // // // // //           </button>
// // // // // // // // // //         </div>

// // // // // // // // // //         <button 
// // // // // // // // // //           onClick={handleAddAction}
// // // // // // // // // //           disabled={item.currentStock <= 0 || orderQty === 0}
// // // // // // // // // //           className="w-full bg-green-600 text-white py-3 rounded-xl font-black text-[11px] hover:bg-green-700 active:scale-95 disabled:bg-gray-300 transition-all uppercase tracking-widest shadow-lg shadow-green-100"
// // // // // // // // // //         >
// // // // // // // // // //           {item.currentStock > 0 ? (orderQty === 0 ? 'Select Qty' : 'Add to Cart') : 'Stock Out'}
// // // // // // // // // //         </button>
// // // // // // // // // //       </div>
// // // // // // // // // //     </div>
// // // // // // // // // //   );
// // // // // // // // // // };

// // // // // // // // // // export default InventoryCard;






// // // // // // // // // import React, { useState } from 'react';

// // // // // // // // // const InventoryCard = ({ item, onAddToCart }) => {
// // // // // // // // //   const [orderQty, setOrderQty] = useState(1);
// // // // // // // // //   const imgUrl = item.imageUrl || "https://placehold.co/200x200?text=No+Image";
  
// // // // // // // // //   // Use unit from item (e.g., 'KG', 'Units', 'GM') or default to 'Units'
// // // // // // // // //   const unit = item.unit || "Units";

// // // // // // // // //   const handleInputChange = (e) => {
// // // // // // // // //     const val = parseFloat(e.target.value); // Use parseFloat for decimals like 0.5kg
// // // // // // // // //     if (isNaN(val) || val < 0) {
// // // // // // // // //       setOrderQty(0);
// // // // // // // // //     } else if (val > item.currentStock) {
// // // // // // // // //       setOrderQty(item.currentStock);
// // // // // // // // //     } else {
// // // // // // // // //       setOrderQty(val);
// // // // // // // // //     }
// // // // // // // // //   };

// // // // // // // // //   const handleAddAction = () => {
// // // // // // // // //     if (item.currentStock <= 0 || orderQty <= 0) return;
// // // // // // // // //     onAddToCart(item, orderQty);
// // // // // // // // //     setOrderQty(1); 
// // // // // // // // //   };

// // // // // // // // //   return (
// // // // // // // // //     <div className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col h-full transition-all ${item.currentStock <= 0 ? 'opacity-60' : 'hover:shadow-md'}`}>
      
// // // // // // // // //       {/* Product Image */}
// // // // // // // // //       <div className="aspect-square bg-gray-50 rounded-xl mb-3 flex items-center justify-center overflow-hidden border border-gray-50">
// // // // // // // // //         <img 
// // // // // // // // //           src={imgUrl} 
// // // // // // // // //           alt={item.name} 
// // // // // // // // //           className="w-full h-full object-contain p-2"
// // // // // // // // //           onError={(e) => { e.target.src = "https://placehold.co/200x200?text=Image+Error"; }}
// // // // // // // // //         />
// // // // // // // // //       </div>
      
// // // // // // // // //       {/* Name and Unit Type */}
// // // // // // // // //       <div className="mb-1">
// // // // // // // // //         <h3 className="text-sm font-bold text-gray-800 line-clamp-1 uppercase tracking-tight">{item.name}</h3>
// // // // // // // // //         <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Per {unit.replace('s', '')}</p>
// // // // // // // // //       </div>

// // // // // // // // //       {/* Available Quantity Badge */}
// // // // // // // // //       <div className="mb-4">
// // // // // // // // //         <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${item.currentStock > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
// // // // // // // // //           <span className="text-[10px] font-black uppercase tracking-tighter">
// // // // // // // // //             {item.currentStock > 0 ? 'Available' : 'Out of Stock'}
// // // // // // // // //           </span>
// // // // // // // // //           <span className="text-xs font-black">{item.currentStock} {unit}</span>
// // // // // // // // //         </div>
// // // // // // // // //       </div>

// // // // // // // // //       <div className="mt-auto space-y-2">
// // // // // // // // //         {/* Quantity Selector with Hidden Arrows */}
// // // // // // // // //         <div className="flex items-center justify-between border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
// // // // // // // // //           <button 
// // // // // // // // //             type="button"
// // // // // // // // //             disabled={item.currentStock <= 0}
// // // // // // // // //             onClick={() => setOrderQty(Math.max(0, orderQty - 1))}
// // // // // // // // //             className="px-4 py-2 hover:bg-gray-200 text-gray-600 font-black disabled:opacity-30"
// // // // // // // // //           >−</button>
          
// // // // // // // // //           <div className="flex items-center justify-center w-full">
// // // // // // // // //             <input 
// // // // // // // // //               type="number" 
// // // // // // // // //               value={orderQty}
// // // // // // // // //               disabled={item.currentStock <= 0}
// // // // // // // // //               onChange={handleInputChange}
// // // // // // // // //               className="w-12 text-center bg-transparent text-sm font-black text-gray-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
// // // // // // // // //             />
// // // // // // // // //             <span className="text-[10px] font-bold text-gray-400 ml-1 uppercase">{unit}</span>
// // // // // // // // //           </div>

// // // // // // // // //           <button 
// // // // // // // // //             type="button"
// // // // // // // // //             disabled={item.currentStock <= 0}
// // // // // // // // //             onClick={() => setOrderQty(Math.min(item.currentStock, orderQty + 1))}
// // // // // // // // //             className="px-4 py-2 hover:bg-gray-200 text-gray-600 font-black disabled:opacity-30"
// // // // // // // // //           >+</button>
// // // // // // // // //         </div>

// // // // // // // // //         <button 
// // // // // // // // //           onClick={handleAddAction}
// // // // // // // // //           disabled={item.currentStock <= 0 || orderQty === 0}
// // // // // // // // //           className="w-full bg-green-600 text-white py-3 rounded-xl font-black text-[11px] hover:bg-green-700 active:scale-95 disabled:bg-gray-300 transition-all uppercase tracking-widest shadow-lg shadow-green-100"
// // // // // // // // //         >
// // // // // // // // //           {item.currentStock > 0 ? (orderQty === 0 ? 'Select Qty' : 'Add to Cart') : 'Stock Out'}
// // // // // // // // //         </button>
// // // // // // // // //       </div>
// // // // // // // // //     </div>
// // // // // // // // //   );
// // // // // // // // // };

// // // // // // // // // export default InventoryCard;



// // // // // // // // import React, { useState, useEffect } from 'react';

// // // // // // // // const InventoryCard = ({ item, onAddToCart, cartQty }) => {
// // // // // // // //   // Sync local state with cart quantity
// // // // // // // //   const [orderQty, setOrderQty] = useState(cartQty || 0);
// // // // // // // //   const imgUrl = item.imageUrl || "https://placehold.co/200x200?text=No+Image";
// // // // // // // //   const unit = item.unit || "Units";

// // // // // // // //   // If cart changes (like removal), update the local input
// // // // // // // //   useEffect(() => {
// // // // // // // //     setOrderQty(cartQty || 0);
// // // // // // // //   }, [cartQty]);

// // // // // // // //   const handleInputChange = (e) => {
// // // // // // // //     const val = parseFloat(e.target.value);
// // // // // // // //     if (isNaN(val) || val < 0) {
// // // // // // // //       setOrderQty(0);
// // // // // // // //     } else if (val > item.currentStock + cartQty) {
// // // // // // // //       setOrderQty(item.currentStock + cartQty);
// // // // // // // //     } else {
// // // // // // // //       setOrderQty(val);
// // // // // // // //     }
// // // // // // // //   };

// // // // // // // //   const handleAddAction = () => {
// // // // // // // //     if (orderQty <= 0 && cartQty === 0) return;
// // // // // // // //     onAddToCart(item, orderQty);
// // // // // // // //   };

// // // // // // // //   return (
// // // // // // // //     <div className={`bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col h-full transition-all ${item.currentStock <= 0 && cartQty === 0 ? 'opacity-60' : 'hover:shadow-md'}`}>
      
// // // // // // // //       <div className="aspect-square bg-gray-50 rounded-2xl mb-3 flex items-center justify-center overflow-hidden border border-gray-50">
// // // // // // // //         <img 
// // // // // // // //           src={imgUrl} 
// // // // // // // //           alt={item.name} 
// // // // // // // //           className="w-full h-full object-contain p-2"
// // // // // // // //           onError={(e) => { e.target.src = "https://placehold.co/200x200?text=Image+Error"; }}
// // // // // // // //         />
// // // // // // // //       </div>
      
// // // // // // // //       <div className="mb-1">
// // // // // // // //         <h3 className="text-xs font-black text-gray-800 line-clamp-1 uppercase tracking-tighter">{item.name}</h3>
// // // // // // // //         <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Per {unit.replace('s', '')}</p>
// // // // // // // //       </div>

// // // // // // // //       <div className="mb-4">
// // // // // // // //         <div className={`flex items-center justify-between px-3 py-1.5 rounded-xl ${item.currentStock > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
// // // // // // // //           <span className="text-[9px] font-black uppercase tracking-tighter">Available</span>
// // // // // // // //           <span className="text-xs font-black">{item.currentStock} {unit}</span>
// // // // // // // //         </div>
// // // // // // // //       </div>

// // // // // // // //       <div className="mt-auto space-y-2">
// // // // // // // //         <div className="flex items-center justify-between border-2 border-gray-100 rounded-2xl overflow-hidden bg-white p-1">
// // // // // // // //           <button 
// // // // // // // //             type="button"
// // // // // // // //             onClick={() => setOrderQty(Math.max(0, orderQty - 1))}
// // // // // // // //             className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 text-gray-600 font-black rounded-xl"
// // // // // // // //           >−</button>
          
// // // // // // // //           <div className="flex flex-col items-center justify-center">
// // // // // // // //             <input 
// // // // // // // //               type="number" 
// // // // // // // //               value={orderQty}
// // // // // // // //               onChange={handleInputChange}
// // // // // // // //               className="w-10 text-center bg-transparent text-sm font-black text-gray-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
// // // // // // // //             />
// // // // // // // //           </div>

// // // // // // // //           <button 
// // // // // // // //             type="button"
// // // // // // // //             disabled={item.currentStock <= 0}
// // // // // // // //             onClick={() => setOrderQty(Math.min(item.currentStock + cartQty, orderQty + 1))}
// // // // // // // //             className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 text-gray-600 font-black rounded-xl"
// // // // // // // //           >+</button>
// // // // // // // //         </div>

// // // // // // // //         <button 
// // // // // // // //           onClick={handleAddAction}
// // // // // // // //           className={`w-full py-3 rounded-2xl font-black text-[10px] transition-all uppercase tracking-widest shadow-lg ${
// // // // // // // //             cartQty > 0 ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-green-600 text-white shadow-green-100'
// // // // // // // //           } active:scale-95 disabled:bg-gray-200`}
// // // // // // // //         >
// // // // // // // //           {cartQty > 0 ? 'Update Cart' : (item.currentStock > 0 ? 'Add to Cart' : 'Out of Stock')}
// // // // // // // //         </button>
// // // // // // // //       </div>
// // // // // // // //     </div>
// // // // // // // //   );
// // // // // // // // };

// // // // // // // // export default InventoryCard;





// // // // // // // import React, { useState, useEffect } from 'react';

// // // // // // // const InventoryCard = ({ item, onAddToCart, cartQty, unit }) => {
// // // // // // //   const [orderQty, setOrderQty] = useState(cartQty || 0);
// // // // // // //   const imgUrl = item.imageUrl || "https://placehold.co/200x200?text=No+Image";
  
// // // // // // //   // Prioritize unit passed from props (Admin Assigned)
// // // // // // //   const displayUnit = unit || item.unit || "Units";

// // // // // // //   useEffect(() => {
// // // // // // //     setOrderQty(cartQty || 0);
// // // // // // //   }, [cartQty]);

// // // // // // //   const handleInputChange = (e) => {
// // // // // // //     const val = parseFloat(e.target.value);
// // // // // // //     if (isNaN(val) || val < 0) {
// // // // // // //       setOrderQty(0);
// // // // // // //     } else if (val > item.currentStock + cartQty) {
// // // // // // //       setOrderQty(item.currentStock + cartQty);
// // // // // // //     } else {
// // // // // // //       setOrderQty(val);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const handleAddAction = () => {
// // // // // // //     if (orderQty <= 0 && cartQty === 0) return;
// // // // // // //     onAddToCart(item, orderQty);
// // // // // // //   };

// // // // // // //   return (
// // // // // // //     <div className={`bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col h-full transition-all ${item.currentStock <= 0 && cartQty === 0 ? 'opacity-60' : 'hover:shadow-md'}`}>
      
// // // // // // //       <div className="aspect-square bg-gray-50 rounded-2xl mb-3 flex items-center justify-center overflow-hidden border border-gray-50">
// // // // // // //         <img 
// // // // // // //           src={imgUrl} 
// // // // // // //           alt={item.name} 
// // // // // // //           className="w-full h-full object-contain p-2"
// // // // // // //           onError={(e) => { e.target.src = "https://placehold.co/200x200?text=Image+Error"; }}
// // // // // // //         />
// // // // // // //       </div>
      
// // // // // // //       <div className="mb-1">
// // // // // // //         <h3 className="text-xs font-black text-gray-800 line-clamp-1 uppercase tracking-tighter">{item.name}</h3>
// // // // // // //         <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Per {displayUnit}</p>
// // // // // // //       </div>

// // // // // // //       <div className="mb-4">
// // // // // // //         <div className={`flex items-center justify-between px-3 py-1.5 rounded-xl ${item.currentStock > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
// // // // // // //           <span className="text-[9px] font-black uppercase tracking-tighter">Available</span>
// // // // // // //           <span className="text-xs font-black">{item.currentStock} {displayUnit}</span>
// // // // // // //         </div>
// // // // // // //       </div>

// // // // // // //       <div className="mt-auto space-y-2">
// // // // // // //         <div className="flex items-center justify-between border-2 border-gray-100 rounded-2xl overflow-hidden bg-white p-1">
// // // // // // //           <button 
// // // // // // //             type="button"
// // // // // // //             onClick={() => setOrderQty(Math.max(0, orderQty - 1))}
// // // // // // //             className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 text-gray-600 font-black rounded-xl"
// // // // // // //           >−</button>
          
// // // // // // //           <div className="flex flex-col items-center justify-center">
// // // // // // //             <input 
// // // // // // //               type="number" 
// // // // // // //               value={orderQty}
// // // // // // //               onChange={handleInputChange}
// // // // // // //               className="w-10 text-center bg-transparent text-sm font-black text-gray-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
// // // // // // //             />
// // // // // // //           </div>

// // // // // // //           <button 
// // // // // // //             type="button"
// // // // // // //             disabled={item.currentStock <= 0}
// // // // // // //             onClick={() => setOrderQty(Math.min(item.currentStock + cartQty, orderQty + 1))}
// // // // // // //             className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 text-gray-600 font-black rounded-xl"
// // // // // // //           >+</button>
// // // // // // //         </div>

// // // // // // //         <button 
// // // // // // //           onClick={handleAddAction}
// // // // // // //           className={`w-full py-3 rounded-2xl font-black text-[10px] transition-all uppercase tracking-widest shadow-lg ${
// // // // // // //             cartQty > 0 ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-green-600 text-white shadow-green-100'
// // // // // // //           } active:scale-95 disabled:bg-gray-200`}
// // // // // // //         >
// // // // // // //           {cartQty > 0 ? 'Update Cart' : (item.currentStock > 0 ? 'Add to Cart' : 'Out of Stock')}
// // // // // // //         </button>
// // // // // // //       </div>
// // // // // // //     </div>
// // // // // // //   );
// // // // // // // };

// // // // // // // export default InventoryCard;






// // // // // // import React, { useState, useEffect } from 'react';

// // // // // // const InventoryCard = ({ item, onAddToCart, cartQty, unit }) => {
// // // // // //   // Sync local state with cart quantity
// // // // // //   const [orderQty, setOrderQty] = useState(cartQty || 0);
// // // // // //   const imgUrl = item.imageUrl || "https://placehold.co/200x200?text=No+Image";
  
// // // // // //   // Prioritize unit passed from props (Admin Assigned) or fallback
// // // // // //   const displayUnit = unit || item.unit || "Units";

// // // // // //   // If cart changes (like removal or update from drawer), update the local input
// // // // // //   useEffect(() => {
// // // // // //     setOrderQty(cartQty || 0);
// // // // // //   }, [cartQty]);

// // // // // //   const handleInputChange = (e) => {
// // // // // //     const val = parseFloat(e.target.value);
// // // // // //     if (isNaN(val) || val < 0) {
// // // // // //       setOrderQty(0);
// // // // // //     } else if (val > item.currentStock + cartQty) {
// // // // // //       setOrderQty(item.currentStock + cartQty);
// // // // // //     } else {
// // // // // //       setOrderQty(val);
// // // // // //     }
// // // // // //   };

// // // // // //   const handleAddAction = () => {
// // // // // //     if (orderQty <= 0 && cartQty === 0) return;
// // // // // //     onAddToCart(item, orderQty);
// // // // // //   };

// // // // // //   return (
// // // // // //     <div className={`bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col h-full transition-all ${item.currentStock <= 0 && cartQty === 0 ? 'opacity-60' : 'hover:shadow-md'}`}>
      
// // // // // //       {/* Image Section */}
// // // // // //       <div className="aspect-square bg-gray-50 rounded-2xl mb-3 flex items-center justify-center overflow-hidden border border-gray-50">
// // // // // //         <img 
// // // // // //           src={imgUrl} 
// // // // // //           alt={item.name} 
// // // // // //           className="w-full h-full object-contain p-2"
// // // // // //           onError={(e) => { e.target.src = "https://placehold.co/200x200?text=Image+Error"; }}
// // // // // //         />
// // // // // //       </div>
      
// // // // // //       {/* Header Section */}
// // // // // //       <div className="mb-1">
// // // // // //         <h3 className="text-xs font-black text-gray-800 line-clamp-1 uppercase tracking-tighter">{item.name}</h3>
// // // // // //         <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
// // // // // //           Per {displayUnit}
// // // // // //         </p>
// // // // // //       </div>

// // // // // //       {/* Stock Availability Badge */}
// // // // // //       <div className="mb-4">
// // // // // //         <div className={`flex items-center justify-between px-3 py-1.5 rounded-xl ${item.currentStock > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
// // // // // //           <span className="text-[9px] font-black uppercase tracking-tighter">Available</span>
// // // // // //           <span className="text-xs font-black">{item.currentStock} {displayUnit}</span>
// // // // // //         </div>
// // // // // //       </div>

// // // // // //       {/* Action Section */}
// // // // // //       <div className="mt-auto space-y-2">
// // // // // //         <div className="flex items-center justify-between border-2 border-gray-100 rounded-2xl overflow-hidden bg-white p-1">
// // // // // //           <button 
// // // // // //             type="button"
// // // // // //             onClick={() => setOrderQty(Math.max(0, orderQty - 1))}
// // // // // //             className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 text-gray-600 font-black rounded-xl"
// // // // // //           >−</button>
          
// // // // // //           <div className="flex flex-col items-center justify-center relative px-2">
// // // // // //             <input 
// // // // // //               type="number" 
// // // // // //               value={orderQty}
// // // // // //               onChange={handleInputChange}
// // // // // //               className="w-12 text-center bg-transparent text-sm font-black text-gray-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
// // // // // //             />
// // // // // //             {/* Unit indicator inside the input area */}
// // // // // //             <span className="absolute -right-1 text-[7px] font-bold text-gray-400 uppercase">{displayUnit}</span>
// // // // // //           </div>

// // // // // //           <button 
// // // // // //             type="button"
// // // // // //             disabled={item.currentStock <= 0}
// // // // // //             onClick={() => setOrderQty(Math.min(item.currentStock + cartQty, orderQty + 1))}
// // // // // //             className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 text-gray-600 font-black rounded-xl"
// // // // // //           >+</button>
// // // // // //         </div>

// // // // // //         <button 
// // // // // //           onClick={handleAddAction}
// // // // // //           className={`w-full py-3 rounded-2xl font-black text-[10px] transition-all uppercase tracking-widest shadow-lg ${
// // // // // //             cartQty > 0 ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-green-600 text-white shadow-green-100'
// // // // // //           } active:scale-95 disabled:bg-gray-200`}
// // // // // //         >
// // // // // //           {cartQty > 0 ? 'Update Cart' : (item.currentStock > 0 ? 'Add to Cart' : 'Out of Stock')}
// // // // // //         </button>
// // // // // //       </div>
// // // // // //     </div>
// // // // // //   );
// // // // // // };

// // // // // // export default InventoryCard;







// // // // // // 03-04-2026









// // // // // import React, { useState, useEffect } from 'react';

// // // // // const InventoryCard = ({ item, onAddToCart, cartQty, unit }) => {
// // // // //   // Local state for the input field
// // // // //   const [orderQty, setOrderQty] = useState(cartQty || 0);
// // // // //   const imgUrl = item.image || item.imageUrl || "https://placehold.co/200x200?text=No+Image";
  
// // // // //   const displayUnit = unit || item.unit || "Units";

// // // // //   // Keep local input in sync if cart is modified elsewhere
// // // // //   useEffect(() => {
// // // // //     setOrderQty(cartQty || 0);
// // // // //   }, [cartQty]);

// // // // //   const handleInputChange = (e) => {
// // // // //     const val = parseFloat(e.target.value);
// // // // //     const maxAvailable = item.currentStock + cartQty; // Stock + what we already have in cart

// // // // //     if (isNaN(val) || val < 0) {
// // // // //       setOrderQty(0);
// // // // //     } else if (val > maxAvailable) {
// // // // //       setOrderQty(maxAvailable);
// // // // //     } else {
// // // // //       setOrderQty(val);
// // // // //     }
// // // // //   };

// // // // //   const handleAddAction = () => {
// // // // //     // If we have an amount or we are trying to clear the cart
// // // // //     if (orderQty === 0 && cartQty === 0) return;
// // // // //     onAddToCart(item, orderQty);
// // // // //   };

// // // // //   const isOutOfStock = item.currentStock <= 0 && cartQty === 0;

// // // // //   return (
// // // // //     <div className={`bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col h-full transition-all ${isOutOfStock ? 'opacity-60' : 'hover:shadow-md'}`}>
      
// // // // //       {/* Image Section */}
// // // // //       <div className="aspect-square bg-gray-50 rounded-2xl mb-3 flex items-center justify-center overflow-hidden border border-gray-50">
// // // // //         <img 
// // // // //           src={imgUrl} 
// // // // //           alt={item.name} 
// // // // //           className="w-full h-full object-contain p-2"
// // // // //           onError={(e) => { e.target.src = "https://placehold.co/200x200?text=Image+Error"; }}
// // // // //         />
// // // // //       </div>
      
// // // // //       {/* Header Section */}
// // // // //       <div className="mb-1">
// // // // //         <h3 className="text-xs font-black text-gray-800 line-clamp-1 uppercase tracking-tighter">{item.name}</h3>
// // // // //         <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
// // // // //           Per {displayUnit}
// // // // //         </p>
// // // // //       </div>

// // // // //       {/* Stock Availability Badge */}
// // // // //       <div className="mb-4">
// // // // //         <div className={`flex items-center justify-between px-3 py-1.5 rounded-xl ${item.currentStock > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
// // // // //           <span className="text-[9px] font-black uppercase tracking-tighter">
// // // // //             {item.currentStock > 0 ? 'Available' : 'Out of Stock'}
// // // // //           </span>
// // // // //           <span className="text-xs font-black">{item.currentStock} {displayUnit}</span>
// // // // //         </div>
// // // // //       </div>

// // // // //       {/* Action Section */}
// // // // //       <div className="mt-auto space-y-2">
// // // // //         <div className="flex items-center justify-between border-2 border-gray-100 rounded-2xl overflow-hidden bg-white p-1">
// // // // //           <button 
// // // // //             type="button"
// // // // //             onClick={() => setOrderQty(Math.max(0, orderQty - 1))}
// // // // //             className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 text-gray-600 font-black rounded-xl"
// // // // //           >−</button>
          
// // // // //           <div className="flex flex-col items-center justify-center relative px-2">
// // // // //             <input 
// // // // //               type="number" 
// // // // //               value={orderQty}
// // // // //               onChange={handleInputChange}
// // // // //               className="w-12 text-center bg-transparent text-sm font-black text-gray-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
// // // // //             />
// // // // //             <span className="absolute -right-1 text-[7px] font-bold text-gray-400 uppercase">{displayUnit}</span>
// // // // //           </div>

// // // // //           <button 
// // // // //             type="button"
// // // // //             disabled={item.currentStock <= 0}
// // // // //             onClick={() => {
// // // // //                 const nextVal = orderQty + 1;
// // // // //                 if(nextVal <= (item.currentStock + cartQty)) setOrderQty(nextVal);
// // // // //             }}
// // // // //             className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 text-gray-600 font-black rounded-xl"
// // // // //           >+</button>
// // // // //         </div>

// // // // //         <button 
// // // // //           onClick={handleAddAction}
// // // // //           disabled={isOutOfStock && orderQty === 0}
// // // // //           className={`w-full py-3 rounded-2xl font-black text-[10px] transition-all uppercase tracking-widest shadow-lg ${
// // // // //             cartQty > 0 ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-green-600 text-white shadow-green-100'
// // // // //           } active:scale-95 disabled:bg-gray-200 disabled:shadow-none`}
// // // // //         >
// // // // //           {cartQty > 0 ? 'Update Cart' : (item.currentStock > 0 ? 'Add to Cart' : 'Out of Stock')}
// // // // //         </button>
// // // // //       </div>
// // // // //     </div>
// // // // //   );
// // // // // };

// // // // // export default InventoryCard;










// // // // import React, { useState, useEffect } from 'react';

// // // // const InventoryCard = ({ item, onAddToCart, cartQty, unit }) => {
// // // //   const [orderQty, setOrderQty] = useState(cartQty || 0);
// // // //   const imgUrl = item.image || item.imageUrl || "https://placehold.co/200x200?text=No+Image";
// // // //   const displayUnit = unit || item.unit || "Units";

// // // //   useEffect(() => {
// // // //     setOrderQty(cartQty || 0);
// // // //   }, [cartQty]);

// // // //   const handleInputChange = (e) => {
// // // //     const rawVal = e.target.value;
// // // //     if (rawVal === "") {
// // // //       setOrderQty(0);
// // // //       return;
// // // //     }

// // // //     const val = parseFloat(rawVal);
// // // //     const maxAvailable = (item.currentStock || 0) + (cartQty || 0);

// // // //     if (isNaN(val) || val < 0) {
// // // //       setOrderQty(0);
// // // //     } else if (val > maxAvailable) {
// // // //       setOrderQty(maxAvailable);
// // // //     } else {
// // // //       setOrderQty(val);
// // // //     }
// // // //   };

// // // //   const handleAddAction = () => {
// // // //     // Ensure we send a valid number, defaulting to 0 if something went wrong
// // // //     const finalQty = isNaN(orderQty) ? 0 : orderQty;
// // // //     if (finalQty === 0 && cartQty === 0) return;
// // // //     onAddToCart(item, finalQty);
// // // //   };

// // // //   const isOutOfStock = (item.currentStock <= 0) && (cartQty === 0);

// // // //   return (
// // // //     <div className={`bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col h-full transition-all ${isOutOfStock ? 'opacity-60' : 'hover:shadow-md'}`}>
      
// // // //       <div className="aspect-square bg-gray-50 rounded-2xl mb-3 flex items-center justify-center overflow-hidden border border-gray-50">
// // // //         <img 
// // // //           src={imgUrl} 
// // // //           alt={item.name} 
// // // //           className="w-full h-full object-contain p-2"
// // // //           onError={(e) => { e.target.src = "https://placehold.co/200x200?text=Image+Error"; }}
// // // //         />
// // // //       </div>
      
// // // //       <div className="mb-1">
// // // //         <h3 className="text-xs font-black text-gray-800 line-clamp-1 uppercase tracking-tighter">{item.name}</h3>
// // // //         <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
// // // //           Per {displayUnit}
// // // //         </p>
// // // //       </div>

// // // //       <div className="mb-4">
// // // //         <div className={`flex items-center justify-between px-3 py-1.5 rounded-xl ${item.currentStock > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
// // // //           <span className="text-[9px] font-black uppercase tracking-tighter">
// // // //             {item.currentStock > 0 ? 'Available' : 'Out of Stock'}
// // // //           </span>
// // // //           <span className="text-xs font-black">{item.currentStock} {displayUnit}</span>
// // // //         </div>
// // // //       </div>

// // // //       <div className="mt-auto space-y-2">
// // // //         <div className="flex items-center justify-between border-2 border-gray-100 rounded-2xl overflow-hidden bg-white p-1">
// // // //           <button 
// // // //             type="button"
// // // //             onClick={() => setOrderQty(prev => Math.max(0, prev - 1))}
// // // //             className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 text-gray-600 font-black rounded-xl"
// // // //           >−</button>
          
// // // //           <div className="flex flex-col items-center justify-center relative px-2">
// // // //             <input 
// // // //               type="number" 
// // // //               value={orderQty === 0 ? "" : orderQty}
// // // //               placeholder="0"
// // // //               onChange={handleInputChange}
// // // //               className="w-12 text-center bg-transparent text-sm font-black text-gray-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
// // // //             />
// // // //             <span className="absolute -right-1 text-[7px] font-bold text-gray-400 uppercase">{displayUnit}</span>
// // // //           </div>

// // // //           <button 
// // // //             type="button"
// // // //             disabled={item.currentStock <= 0}
// // // //             onClick={() => {
// // // //                 const nextVal = orderQty + 1;
// // // //                 const max = (item.currentStock || 0) + (cartQty || 0);
// // // //                 if(nextVal <= max) setOrderQty(nextVal);
// // // //             }}
// // // //             className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 text-gray-600 font-black rounded-xl"
// // // //           >+</button>
// // // //         </div>

// // // //         <button 
// // // //           onClick={handleAddAction}
// // // //           disabled={isOutOfStock && orderQty === 0}
// // // //           className={`w-full py-3 rounded-2xl font-black text-[10px] transition-all uppercase tracking-widest shadow-lg ${
// // // //             cartQty > 0 ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-green-600 text-white shadow-green-100'
// // // //           } active:scale-95 disabled:bg-gray-200 disabled:shadow-none`}
// // // //         >
// // // //           {cartQty > 0 ? 'Update Cart' : (item.currentStock > 0 ? 'Add to Cart' : 'Out of Stock')}
// // // //         </button>
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // };

// // // // export default InventoryCard;




// // // import React, { useState, useEffect } from 'react';

// // // const InventoryCard = ({ item, onAddToCart, cartQty, unit }) => {
// // //   const [orderQty, setOrderQty] = useState(cartQty || 0);
  
// // //   // Dynamic Image Logic
// // //   const imgUrl = item.image || item.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=f8f9fa&color=10b981&bold=true`;
// // //   const displayUnit = unit || "Units";

// // //   useEffect(() => {
// // //     setOrderQty(cartQty || 0);
// // //   }, [cartQty]);

// // //   const handleInputChange = (e) => {
// // //     const val = parseFloat(e.target.value);
// // //     const maxAvailable = (item.currentStock || 0) + (cartQty || 0);

// // //     if (e.target.value === "") {
// // //       setOrderQty(0);
// // //     } else if (isNaN(val) || val < 0) {
// // //       setOrderQty(0);
// // //     } else if (val > maxAvailable) {
// // //       setOrderQty(maxAvailable);
// // //     } else {
// // //       setOrderQty(val);
// // //     }
// // //   };

// // //   const isOutOfStock = (item.currentStock <= 0) && (cartQty === 0);

// // //   return (
// // //     <div className={`bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col h-full transition-all ${isOutOfStock ? 'opacity-60' : 'hover:shadow-md hover:border-green-100'}`}>
      
// // //       {/* Image Container with Fallback */}
// // //       <div className="aspect-square bg-gray-50 rounded-2xl mb-3 flex items-center justify-center overflow-hidden border border-gray-100 group">
// // //         <img 
// // //           src={imgUrl} 
// // //           alt={item.name} 
// // //           className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-300"
// // //           onError={(e) => { e.target.src = "https://placehold.co/200x200?text=No+Image"; }}
// // //         />
// // //       </div>
      
// // //       <div className="mb-1">
// // //         <h3 className="text-[11px] font-black text-gray-800 line-clamp-1 uppercase tracking-tight">{item.name}</h3>
// // //         <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
// // //           Unit: {displayUnit}
// // //         </p>
// // //       </div>

// // //       <div className="mb-4">
// // //         <div className={`flex items-center justify-between px-3 py-1.5 rounded-xl ${item.currentStock > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
// // //           <span className="text-[8px] font-black uppercase tracking-tighter">
// // //             {item.currentStock > 0 ? 'Available' : 'Empty'}
// // //           </span>
// // //           <span className="text-xs font-black">{item.currentStock}</span>
// // //         </div>
// // //       </div>

// // //       <div className="mt-auto space-y-2">
// // //         {/* Counter UI */}
// // //         <div className="flex items-center justify-between border-2 border-gray-100 rounded-2xl overflow-hidden bg-white p-1 focus-within:border-green-400 transition-colors">
// // //           <button 
// // //             type="button"
// // //             onClick={() => setOrderQty(prev => Math.max(0, prev - 1))}
// // //             className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 text-gray-400 hover:text-red-500 font-black rounded-xl transition-colors"
// // //           >−</button>
          
// // //           <div className="flex flex-col items-center justify-center relative">
// // //             <input 
// // //               type="number" 
// // //               value={orderQty === 0 ? "" : orderQty}
// // //               placeholder="0"
// // //               onChange={handleInputChange}
// // //               className="w-12 text-center bg-transparent text-xs font-black text-gray-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
// // //             />
// // //           </div>

// // //           <button 
// // //             type="button"
// // //             disabled={item.currentStock <= 0}
// // //             onClick={() => {
// // //                 const nextVal = orderQty + 1;
// // //                 const max = (item.currentStock || 0) + (cartQty || 0);
// // //                 if(nextVal <= max) setOrderQty(nextVal);
// // //             }}
// // //             className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 text-gray-400 hover:text-green-500 font-black rounded-xl transition-colors"
// // //           >+</button>
// // //         </div>

// // //         <button 
// // //           onClick={() => onAddToCart(item, orderQty)}
// // //           disabled={isOutOfStock && orderQty === 0}
// // //           className={`w-full py-3 rounded-2xl font-black text-[9px] transition-all uppercase tracking-widest shadow-lg ${
// // //             cartQty > 0 ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-gray-900 text-white shadow-gray-200'
// // //           } active:scale-95 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none`}
// // //         >
// // //           {cartQty > 0 ? 'Update Cart' : (item.currentStock > 0 ? 'Add Item' : 'Out of Stock')}
// // //         </button>
// // //       </div>
// // //     </div>
// // //   );
// // // };

// // // export default InventoryCard;





// // import React, { useState, useEffect } from 'react';

// // const InventoryCard = ({ item, onAddToCart, cartQty }) => {
// //   const [orderQty, setOrderQty] = useState(cartQty || 0);
  
// //   // Use currentQty from backend
// //   const stockAvailable = item.currentQty || 0; 
// //   const displayUnit = item.unit || "Units";
// //   const imgUrl = item.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=f8f9fa&color=2563eb&bold=true`;

// //   useEffect(() => {
// //     setOrderQty(cartQty || 0);
// //   }, [cartQty]);

// //   const handleInputChange = (e) => {
// //     const val = parseFloat(e.target.value);
// //     const maxAvailable = stockAvailable + (cartQty || 0);

// //     if (e.target.value === "") setOrderQty(0);
// //     else if (isNaN(val) || val < 0) setOrderQty(0);
// //     else if (val > maxAvailable) setOrderQty(maxAvailable);
// //     else setOrderQty(val);
// //   };

// //   const isOutOfStock = (stockAvailable <= 0) && (cartQty === 0);

// //   return (
// //     <div className={`bg-white rounded-3xl p-3 shadow-sm border border-gray-100 flex flex-col h-full transition-all ${isOutOfStock ? 'opacity-50 grayscale' : 'hover:shadow-md'}`}>
// //       <div className="aspect-square bg-gray-50 rounded-2xl mb-3 flex items-center justify-center overflow-hidden border border-gray-50">
// //         <img src={imgUrl} alt={item.name} className="w-full h-full object-contain p-2" />
// //       </div>
      
// //       <div className="mb-2">
// //         <h3 className="text-[10px] font-black text-gray-800 line-clamp-1 uppercase tracking-tight">{item.name}</h3>
// //         <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{displayUnit}</p>
// //       </div>

// //       <div className="mb-3">
// //         <div className={`flex items-center justify-between px-2 py-1 rounded-lg ${stockAvailable > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
// //           <span className="text-[7px] font-black uppercase">Stock</span>
// //           <span className="text-[10px] font-black">{stockAvailable}</span>
// //         </div>
// //       </div>

// //       <div className="mt-auto space-y-2">
// //         <div className="flex items-center justify-between border-2 border-gray-50 rounded-xl overflow-hidden bg-gray-50/50 p-1">
// //           <button onClick={() => setOrderQty(q => Math.max(0, q - 1))} className="w-7 h-7 flex items-center justify-center text-gray-400 font-black">-</button>
// //           <input type="number" value={orderQty || ""} placeholder="0" onChange={handleInputChange} className="w-10 text-center bg-transparent text-[10px] font-black focus:outline-none" />
// //           <button onClick={() => {
// //               if(orderQty + 1 <= (stockAvailable + cartQty)) setOrderQty(q => q + 1);
// //           }} className="w-7 h-7 flex items-center justify-center text-gray-400 font-black">+</button>
// //         </div>

// //         <button 
// //           onClick={() => onAddToCart(item, orderQty)}
// //           disabled={isOutOfStock && orderQty === 0}
// //           className={`w-full py-2.5 rounded-xl font-black text-[8px] transition-all uppercase tracking-widest ${
// //             cartQty > 0 ? 'bg-blue-600 text-white' : 'bg-gray-900 text-white'
// //           } disabled:bg-gray-100 disabled:text-gray-300`}
// //         >
// //           {cartQty > 0 ? 'Update' : (stockAvailable > 0 ? 'Add' : 'Empty')}
// //         </button>
// //       </div>
// //     </div>
// //   );
// // };

// // export default InventoryCard;







// import React, { useState, useEffect } from 'react';
// import { toast } from 'react-hot-toast';

// const InventoryCard = ({ item, onAddToCart, cartQty, isRequestMode }) => {
//   const [orderQty, setOrderQty] = useState(cartQty || 0);
  
//   // Use currentQty from backend, default to 0
//   const stockAvailable = Number(item.currentQty) || 0; 
//   const displayUnit = item.unit || "Units";
//   const imgUrl = item.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'Item')}&background=f8f9fa&color=2563eb&bold=true`;

//   useEffect(() => {
//     setOrderQty(cartQty || 0);
//   }, [cartQty]);

//   const handleInputChange = (e) => {
//     const val = parseInt(e.target.value, 10);
//     const maxAvailable = stockAvailable + (cartQty || 0);

//     if (e.target.value === "") {
//         setOrderQty(0);
//     } else if (isNaN(val) || val < 0) {
//         setOrderQty(0);
//     } else if (!isRequestMode && val > maxAvailable) {
//         // Only cap at stock limit if we are NOT in request mode
//         setOrderQty(maxAvailable);
//     } else {
//         setOrderQty(val);
//     }
//   };

//   // If stock is 0 and we aren't requesting more, it's out of stock
//   const isOutOfStock = stockAvailable <= 0;

//   return (
//     <div className={`bg-white rounded-3xl p-3 shadow-sm border border-gray-100 flex flex-col h-full transition-all ${isOutOfStock && !isRequestMode ? 'opacity-60 grayscale-[0.5]' : 'hover:shadow-md'}`}>
      
//       {/* Image Section */}
//       <div className="aspect-square bg-gray-50 rounded-2xl mb-3 flex items-center justify-center overflow-hidden border border-gray-50">
//         <img 
//           src={imgUrl} 
//           alt={item.name} 
//           className="w-full h-full object-contain p-2"
//           onError={(e) => { e.target.src = "https://placehold.co/200x200?text=No+Image"; }}
//         />
//       </div>
      
//       {/* Info Section */}
//       <div className="mb-2">
//         <h3 className="text-[10px] font-black text-gray-800 line-clamp-1 uppercase tracking-tight">
//           {item.name}
//         </h3>
//         <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{displayUnit}</p>
//       </div>

//       {/* Stock Badge */}
//       <div className="mb-3">
//         <div className={`flex items-center justify-between px-2 py-1 rounded-lg ${stockAvailable > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
//           <span className="text-[7px] font-black uppercase">In Stock</span>
//           <span className="text-[10px] font-black">{stockAvailable}</span>
//         </div>
//       </div>

//       {/* Controls */}
//       <div className="mt-auto space-y-2">
//         <div className="flex items-center justify-between border-2 border-gray-100 rounded-xl overflow-hidden bg-gray-50/50 p-1">
//           <button 
//             type="button"
//             onClick={() => setOrderQty(q => Math.max(0, q - 1))} 
//             className="w-7 h-7 flex items-center justify-center text-gray-400 font-black hover:bg-white rounded-lg transition-colors"
//           >-</button>
          
//           <input 
//             type="number" 
//             value={orderQty || ""} 
//             placeholder="0" 
//             onChange={handleInputChange} 
//             className="w-10 text-center bg-transparent text-[10px] font-black focus:outline-none appearance-none" 
//           />
          
//           <button 
//             type="button"
//             onClick={() => {
//                 // If Request Mode, allow infinite. If Order Mode, cap at stock available.
//                 if(isRequestMode || (orderQty + 1 <= (stockAvailable + cartQty))) {
//                     setOrderQty(q => q + 1);
//                 } else {
//                     toast.error("Exceeds available stock");
//                 }
//             }} 
//             className="w-7 h-7 flex items-center justify-center text-gray-400 font-black hover:bg-white rounded-lg transition-colors"
//           >+</button>
//         </div>

//         <button 
//           onClick={() => onAddToCart(item, orderQty)}
//           className={`w-full py-2.5 rounded-xl font-black text-[8px] transition-all uppercase tracking-widest ${
//             cartQty > 0 ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-gray-900 text-white shadow-gray-200'
//           } shadow-lg active:scale-95`}
//         >
//           {cartQty > 0 ? 'Update' : (stockAvailable > 0 || isRequestMode ? 'Add' : 'Empty')}
//         </button>
//       </div>
//     </div>
//   );
// };

// export default InventoryCard;






// 10










import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const InventoryCard = ({ item, onAddToCart, cartQty, isRequestMode }) => {
  // Use parseFloat for initial state to support decimals from the start
  const [orderQty, setOrderQty] = useState(parseFloat(cartQty) || 0);
  
  // Ensure stock matches decimal format
  const stockAvailable = Number(item.currentQty) || 0; 
  const displayUnit = item.unit || "Units";
  const imgUrl = item.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'Item')}&background=f8f9fa&color=2563eb&bold=true`;

  useEffect(() => {
    setOrderQty(parseFloat(cartQty) || 0);
  }, [cartQty]);

  const handleInputChange = (e) => {
    const rawValue = e.target.value;
    // Use parseFloat instead of parseInt to allow decimals
    const val = parseFloat(rawValue); 
    const maxAvailable = stockAvailable + (parseFloat(cartQty) || 0);

    if (rawValue === "") {
      setOrderQty(0);
    } else if (isNaN(val) || val < 0) {
      setOrderQty(0);
    } else if (!isRequestMode && val > maxAvailable) {
      // Cap at stock limit using float max
      setOrderQty(maxAvailable);
    } else {
      // Limit to one decimal place: multiply by 10, round, divide by 10
      const fixedVal = Math.round(val * 10) / 10;
      // Allow user to type the dot without immediately rounding it away
      setOrderQty(rawValue.endsWith('.') ? rawValue : fixedVal);
    }
  };

  // Logic for + and - buttons to handle 0.1 increments
  const adjustQty = (amount) => {
    setOrderQty(prev => {
      const current = parseFloat(prev) || 0;
      const newVal = Math.max(0, current + amount);
      const fixedNewVal = Math.round(newVal * 10) / 10;
      
      const maxAvailable = stockAvailable + (parseFloat(cartQty) || 0);
      
      if (!isRequestMode && fixedNewVal > maxAvailable) {
        toast.error("Exceeds available stock");
        return current;
      }
      return fixedNewVal;
    });
  };

  const isOutOfStock = stockAvailable <= 0;

  return (
    <div className={`bg-white rounded-3xl p-3 shadow-sm border border-gray-100 flex flex-col h-full transition-all ${isOutOfStock && !isRequestMode ? 'opacity-60 grayscale-[0.5]' : 'hover:shadow-md'}`}>
      
      {/* Image Section */}
      <div className="aspect-square bg-gray-50 rounded-2xl mb-3 flex items-center justify-center overflow-hidden border border-gray-50">
        <img 
          src={imgUrl} 
          alt={item.name} 
          className="w-full h-full object-contain p-2"
          onError={(e) => { e.target.src = "https://placehold.co/200x200?text=No+Image"; }}
        />
      </div>
      
      {/* Info Section */}
      <div className="mb-2">
        <h3 className="text-[10px] font-black text-gray-800 line-clamp-1 uppercase tracking-tight">
          {item.name}
        </h3>
        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{displayUnit}</p>
      </div>

      {/* Stock Badge */}
      <div className="mb-3">
        <div className={`flex items-center justify-between px-2 py-1 rounded-lg ${stockAvailable > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          <span className="text-[7px] font-black uppercase">In Stock</span>
          <span className="text-[10px] font-black">{stockAvailable}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-auto space-y-2">
        <div className="flex items-center justify-between border-2 border-gray-100 rounded-xl overflow-hidden bg-gray-50/50 p-1">
          <button 
            type="button"
            onClick={() => adjustQty(-0.1)} 
            className="w-7 h-7 flex items-center justify-center text-gray-400 font-black hover:bg-white rounded-lg transition-colors"
          >–</button>
          
          <input 
            type="number" 
            step="0.1"
            inputMode="decimal"
            value={orderQty || ""} 
            placeholder="0" 
            onChange={handleInputChange} 
            className="w-10 text-center bg-transparent text-[10px] font-black focus:outline-none appearance-none" 
          />
          
          <button 
            type="button"
            onClick={() => adjustQty(0.1)} 
            className="w-7 h-7 flex items-center justify-center text-gray-400 font-black hover:bg-white rounded-lg transition-colors"
          >+</button>
        </div>

        <button 
          onClick={() => onAddToCart(item, orderQty)}
          className={`w-full py-2.5 rounded-xl font-black text-[8px] transition-all uppercase tracking-widest ${
            cartQty > 0 ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-gray-900 text-white shadow-gray-200'
          } shadow-lg active:scale-95`}
        >
          {cartQty > 0 ? 'Update' : (stockAvailable > 0 || isRequestMode ? 'Add' : 'Empty')}
        </button>
      </div>
    </div>
  );
};

export default InventoryCard;