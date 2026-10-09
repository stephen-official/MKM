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



