import { useEffect, useState, useMemo, useCallback } from "react";
import { api } from "../api.js";
import { useToast } from "../toast.jsx";
import { Search, CheckCircle2, PackageCheck, History, Download } from "lucide-react";
import * as XLSX from "xlsx";

export const PurchaseOrdersPage = () => {
  const { showToast } = useToast();
  const [view, setView] = useState("history"); // 'history' or 'create'
  const [searchTerm, setSearchTerm] = useState("");
  
  const [indents, setIndents] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [selectedIndentId, setSelectedIndentId] = useState("");
  const [editableItems, setEditableItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [indRes, poRes, stockRes] = await Promise.all([
  api.get("/procurement/purchase-orders/purchased-indents"),
  api.get("/procurement/purchase-orders"),
  api.get("/inventory/stock-items"),
]);

      const sortedPOs = (poRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setIndents(indRes.data || []);
      setStockItems(stockRes.data || []);
      setPurchaseOrders(sortedPOs);
      
      if (sortedPOs.length > 0 && !selectedPoId) {
        setSelectedPoId(sortedPOs[0]._id);
      }
    } catch (error) {
      showToast("Failed to load records", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, selectedPoId]);

  useEffect(() => { load(); }, [load]);

  const getStockDetails = useCallback((id) => {
    const item = stockItems.find(s => s._id === id);
    if (!item) return { name: "Unknown Item", unit: "units", group: "General" };

    const unitSymbol = item.unitId?.symbol || item.unit || "units";
    const groupName = item.stockGroupId?.name || "General";
    
    return {
      name: item.name,
      unit: unitSymbol,
      group: groupName
    };
  }, [stockItems]);

  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter(po => 
      (po.indentId?.indentNo || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [purchaseOrders, searchTerm]);

  const activePO = useMemo(() => 
    purchaseOrders.find(p => p._id === selectedPoId), 
  [selectedPoId, purchaseOrders]);

  const downloadExcel = () => {
    if (!activePO) return;

    const excelData = activePO.items.map((item) => {
      const details = getStockDetails(item.stockItemId?._id || item.stockItemId);
      return {
        "Order Date": new Date(activePO.receivedAt).toLocaleDateString(),
        "Indent No": activePO.indentId?.indentNo || "N/A",
        "Product Name": details.name,
        "Stock Group": details.group,
        "Unit": details.unit,
        "Unit Price": item.unitPrice,
        "Received Qty": item.receivedQty,
        "Subtotal": item.amount,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Order");
    XLSX.writeFile(workbook, `PO_${activePO.indentId?.indentNo || activePO._id}.xlsx`);
  };

  // Logic to initialize editable items with prices from the Indent
  useEffect(() => {
    if (selectedIndentId) {
      const indent = indents.find((i) => i._id === selectedIndentId);
      if (indent?.items) {
        setEditableItems(indent.items.map((it) => {
          const sId = it.stockItemId?._id || it.stockItemId;
          const details = getStockDetails(sId);
          return {
            stockItemId: sId,
            name: details.name,
            unit: details.unit,
            group: details.group,
            orderedQty: Number(it.orderedQty || 0),
            receivedQty: Number(it.orderedQty || 0),
            unitPrice: Number(it.unitPrice || 0), 
          };
        }));
      }
    } else {
      setEditableItems([]);
    }
  }, [selectedIndentId, indents, getStockDetails]);

  const createPO = async () => {
    if (!selectedIndentId) return showToast("Select an indent", "info");
    try {
      setLoading(true);
      const totalAmount = editableItems.reduce((sum, it) => sum + it.receivedQty * it.unitPrice, 0);
      const payload = {
        indentId: selectedIndentId,
        items: editableItems.map((it) => ({ 
          ...it, 
          amount: it.receivedQty * it.unitPrice 
        })),
        totalAmount,
        receivedAt: new Date().toISOString(),
      };
      await api.post("/procurement/purchase-orders", payload);
      showToast("Inventory intake confirmed!", "success");
      setSelectedIndentId("");
      setView("history");
      load();
    } catch (e) {
      showToast("Error creating PO", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Header */}
      <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
            Purchase <span style={{ color: '#6366f1' }}>Orders</span>
          </h1>
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
            <button
              onClick={() => setView("history")}
              style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'history' ? '#fff' : 'transparent', color: view === 'history' ? '#6366f1' : '#64748b', boxShadow: view === 'history' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><History size={14}/> History</div>
            </button>
            <button
              onClick={() => setView("create")}
              style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: view === 'create' ? '#fff' : 'transparent', color: view === 'create' ? '#6366f1' : '#64748b', boxShadow: view === 'create' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><PackageCheck size={14}/> Intake</div>
            </button>
          </div>
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search POs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
        {view === "history" ? (
          <>
            <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px' }}>COMPLETED ORDERS ({filteredPOs.length})</div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredPOs.map(po => (
                  <div
                    key={po._id}
                    onClick={() => setSelectedPoId(po._id)}
                    style={{
                      padding: '16px', borderRadius: '16px', cursor: 'pointer',
                      background: selectedPoId === po._id ? '#fff' : 'transparent',
                      border: selectedPoId === po._id ? '1px solid #6366f1' : '1px solid transparent',
                      boxShadow: selectedPoId === po._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: '700', color: selectedPoId === po._id ? '#6366f1' : '#1e293b' }}>
                        {po.indentId?.indentNo || `PO-${po._id.slice(-4).toUpperCase()}`}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
                        {new Date(po.receivedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      ₹{po.totalAmount?.toLocaleString()} • {po.items?.length || 0} Items
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              {activePO ? (
                <>
                  <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>ORDER RECEIVED</div>
                      <div style={{ fontSize: '18px', fontWeight: '800' }}>{new Date(activePO.receivedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TOTAL VALUATION</div>
                      <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>₹{activePO.totalAmount?.toLocaleString()}</div>
                    </div>
                  </div>

                  <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ textAlign: 'left' }}>
                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>PRODUCT</th>
                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>GROUP</th>
                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
                          <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activePO.items.map((item, idx) => {
                          const details = getStockDetails(item.stockItemId?._id || item.stockItemId);
                          return (
                            <tr key={idx}>
                              <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
                                <div style={{ fontWeight: '700', color: '#1e293b' }}>{details.name}</div>
                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Rate: ₹{item.unitPrice} / {details.unit}</div>
                              </td>
                              <td style={{ padding: '20px 0', borderBottom: '1px solid #f8fafc' }}>
                                <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
                                  {details.group}
                                </span>
                              </td>
                              <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700', borderBottom: '1px solid #f8fafc' }}>
                                {item.receivedQty} <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '400' }}>{details.unit}</span>
                              </td>
                              <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1', borderBottom: '1px solid #f8fafc' }}>₹{item.amount?.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ padding: '24px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={downloadExcel}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '13px', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2)' }}
                    >
                      <Download size={18}/> Export Excel (.xlsx)
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No records selected</div>
              )}
            </div>
          </>
        ) : (
          /* Intake Creation Area */
          <div style={{ flex: 1, background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', display: 'block', marginBottom: '8px' }}>SELECT PENDING INDENT</label>
                <select 
                  value={selectedIndentId} 
                  onChange={(e) => setSelectedIndentId(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: '700', outline: 'none' }}>
                  <option value="">Choose an indent to process...</option>
                  {indents.map(i => (
                    <option key={i._id} value={i._id}>{i.indentNo} — ₹{i.totalAmount?.toLocaleString()}</option>
                  ))}
                </select>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1' }}>INTAKE TOTAL</div>
                <div style={{ fontSize: '24px', fontWeight: '900' }}>₹{editableItems.reduce((sum, it) => sum + it.receivedQty * it.unitPrice, 0).toLocaleString()}</div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px' }}>
              {editableItems.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
                      <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8' }}>ITEM DESCRIPTION</th>
                      <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>REQ. QTY</th>
                      <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'center', width: '150px' }}>UNIT PRICE</th>
                      <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'center', width: '150px' }}>REC. QTY</th>
                      <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>VALUATION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editableItems.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '20px 0' }}>
                          <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.name}</div>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
                            <span style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
                              {item.group}
                            </span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>• Per {item.unit}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', color: '#64748b', fontWeight: '600' }}>
                          {item.orderedQty} <span style={{ fontSize: '10px', fontWeight: '400' }}>{item.unit}</span>
                        </td>
                        
                        {/* EDITABLE UNIT PRICE */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <span style={{ color: '#94a3b8', fontWeight: '700' }}>₹</span>
                            <input 
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const newItems = [...editableItems];
                                newItems[idx].unitPrice = Number(e.target.value);
                                setEditableItems(newItems);
                              }}
                              style={{ 
                                width: '90px', 
                                padding: '8px', 
                                borderRadius: '8px', 
                                border: '2px solid #f1f5f9', 
                                textAlign: 'center', 
                                fontWeight: '800', 
                                color: '#10b981' 
                              }}
                            />
                          </div>
                        </td>

                        {/* EDITABLE RECEIVED QTY */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <input 
                              type="number"
                              value={item.receivedQty}
                              onChange={(e) => {
                                const newItems = [...editableItems];
                                newItems[idx].receivedQty = Number(e.target.value);
                                setEditableItems(newItems);
                              }}
                              style={{ width: '80px', padding: '8px', borderRadius: '8px', border: '2px solid #f1f5f9', textAlign: 'center', fontWeight: '800', color: '#6366f1' }}
                            />
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', width: '30px', textAlign: 'left' }}>{item.unit}</span>
                          </div>
                        </td>

                        <td style={{ textAlign: 'right', fontWeight: '800' }}>₹{(item.receivedQty * item.unitPrice).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>
                  Please select a pending indent from the dropdown above
                </div>
              )}
            </div>

            {editableItems.length > 0 && (
              <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={createPO}
                  disabled={loading}
                  style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' }}>
                  <CheckCircle2 size={18}/> {loading ? "Updating Stock..." : "Confirm Intake & Update Stock"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


