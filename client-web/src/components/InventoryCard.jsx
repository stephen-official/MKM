import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

const InventoryCard = ({
  item,
  onAddToCart,
  cartQty,
  isRequestMode,
  isDailyUse
}) => {
  // Use 3 decimal places for precision logic
  const PRECISION = 3;
  const STEP = 0.001;

  const normalizedCartQty = cartQty > 0 ? parseFloat(cartQty) : "";
  const [orderQty, setOrderQty] = useState(normalizedCartQty);
  const [previousCartQty, setPreviousCartQty] = useState(cartQty);
  const stockAvailable = Number(item.currentQty) || 0; 
  const displayUnit = item.unit || "Units";
  const imgUrl = item.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'Item')}&background=f8f9fa&color=2563eb&bold=true`;

  // Keep local input in sync when the parent clears or replaces the cart.
  if (cartQty !== previousCartQty) {
    setPreviousCartQty(cartQty);
    setOrderQty(normalizedCartQty);
  }

  const handleInputChange = (e) => {
  const value = e.target.value;

  // allow empty
  if (value === "") {
    setOrderQty("");
    return;
  }

  // stop if more than 3 decimals
  if (!/^\d*(\.\d{0,3})?$/.test(value)) {
    return;
  }

  setOrderQty(value);
};

  const adjustQty = (amount) => {
    setOrderQty(prev => {
      const current = parseFloat(prev) || 0;
      const newVal = Math.max(0, current + amount);
      const fixedNewVal = Number(newVal.toFixed(3));
      
      const maxAvailable = stockAvailable + (parseFloat(cartQty) || 0);
      
      if (
  !isRequestMode &&
  fixedNewVal > maxAvailable
){
        toast.error("Exceeds available stock");
        return current;
      }
      return fixedNewVal;
    });
  };

  const isOutOfStock = stockAvailable <= 0;

  return (
    <div
  className={`bg-white rounded-3xl p-3 shadow-sm border border-gray-100 flex flex-col h-full transition-all ${
    isOutOfStock && !isRequestMode
      ? "opacity-60 grayscale-[0.5]"
      : "hover:shadow-md"
  }`}
>
      
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
      {/* Stock Badge */}
  <div className="mb-3">
    <div
      className={`flex items-center justify-between px-2 py-1 rounded-lg ${
        stockAvailable > 0
          ? "bg-green-50 text-green-700"
          : "bg-red-50 text-red-700"
      }`}
    >
      <span className="text-[7px] font-black uppercase">
        In Stock
      </span>

      <span className="text-[10px] font-black">
        {stockAvailable.toFixed(PRECISION)}
      </span>
    </div>
  </div>
{isDailyUse && <p className="mb-3 text-[7px] font-black uppercase text-blue-700">Daily use</p>}

      {/* Controls */}
      <div className="mt-auto space-y-2">
        <div className="flex items-center justify-between border-2 border-gray-100 rounded-xl overflow-hidden bg-gray-50/50 p-1">
          <button 
            type="button"
            onClick={() => adjustQty(-STEP)} 
            className="w-7 h-7 flex items-center justify-center text-gray-400 font-black hover:bg-white rounded-lg transition-colors"
          >–</button>
          
<input
  type="text"
  step={STEP}
  inputMode="decimal"
  value={orderQty === 0 ? "" : orderQty}
            placeholder="0.000" 
            onChange={handleInputChange} 
            className="w-16 text-center bg-transparent text-[10px] font-black focus:outline-none appearance-none" 
          />
          
          <button 
            type="button"
            onClick={() => adjustQty(STEP)} 
            className="w-7 h-7 flex items-center justify-center text-gray-400 font-black hover:bg-white rounded-lg transition-colors"
          >+</button>
        </div>

        <button 
          onClick={() => {
  onAddToCart(item, parseFloat(orderQty) || 0);

  if ((parseFloat(orderQty) || 0) === 0) {
    setOrderQty("");
  }
}}
          className={`w-full py-2.5 rounded-xl font-black text-[8px] transition-all uppercase tracking-widest ${
            cartQty > 0 ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-gray-900 text-white shadow-gray-200'
          } shadow-lg active:scale-95`}
        >
          {
  cartQty > 0
    ? "Update"
    : (
        stockAvailable > 0 ||
        isRequestMode
      )
        ? "Add"
        : "Empty"
}
        </button>
      </div>
    </div>
  );
};

export default InventoryCard;
