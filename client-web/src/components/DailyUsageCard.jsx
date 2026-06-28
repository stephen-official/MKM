// 28-06-2026








import React, { useState } from "react";

export default function DailyUsageCard({
  item,
  onAdd
}) {
  const [qty, setQty] = useState("");

  const imgUrl =
    item.image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      item.name || "Item"
    )}`;

  const adjustQty = (amount) => {
    const current = parseFloat(qty) || 0;
    const newVal = Math.max(0, current + amount);
    setQty(Number(newVal.toFixed(3)));
  };

  const handleInputChange = (e) => {
    const value = e.target.value;

    if (value === "") {
      setQty("");
      return;
    }

    if (!/^\d*(\.\d{0,3})?$/.test(value)) {
      return;
    }

    setQty(value);
  };

  return (
    <div className="bg-white rounded-3xl p-3 shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-all">
      
      {/* Image */}
      <div className="aspect-square bg-gray-50 rounded-2xl mb-3 flex items-center justify-center overflow-hidden border border-gray-50">
        <img
          src={imgUrl}
          alt={item.name}
          className="w-full h-full object-contain p-2"
          onError={(e) => {
            e.target.src =
              "https://placehold.co/200x200?text=No+Image";
          }}
        />
      </div>

      {/* Item Name */}
      <div className="mb-3">
        <h3 className="text-[10px] font-black text-gray-800 uppercase line-clamp-1">
          {item.name}
        </h3>

        <p className="text-[8px] font-bold text-gray-400 uppercase">
          {item.unit}
        </p>
      </div>

      {/* Daily Usage Badge */}
      <div className="mb-3">
        <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-blue-50 text-blue-700">
          <span className="text-[7px] font-black uppercase">
            Qty Used
          </span>

          <span className="text-[10px] font-black">
            Today
          </span>
        </div>
      </div>

      {/* Quantity Controls */}
      <div className="mt-auto space-y-2">
        <div className="flex items-center justify-between border-2 border-gray-100 rounded-xl overflow-hidden bg-gray-50/50 p-1">
          
          <button
            type="button"
            onClick={() => adjustQty(-0.001)}
            className="w-7 h-7 flex items-center justify-center text-gray-400 font-black hover:bg-white rounded-lg"
          >
            –
          </button>

          <input
            type="text"
            inputMode="decimal"
            value={qty}
            placeholder="0.000"
            onChange={handleInputChange}
            className="w-16 text-center bg-transparent text-[10px] font-black focus:outline-none"
          />

          <button
            type="button"
            onClick={() => adjustQty(0.001)}
            className="w-7 h-7 flex items-center justify-center text-gray-400 font-black hover:bg-white rounded-lg"
          >
            +
          </button>
        </div>

        <button
          onClick={() => {
            onAdd(item, parseFloat(qty) || 0);
          }}
          className="w-full py-2.5 rounded-xl font-black text-[8px] uppercase tracking-widest bg-gray-900 text-white shadow-lg active:scale-95"
        >
          Add
        </button>
      </div>
    </div>
  );
}