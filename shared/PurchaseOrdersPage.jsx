import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { api } from "../api.js";
import { useToast } from "../toast.jsx";
import { Search, CheckCircle2, PackageCheck, History, Download, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

export const PurchaseOrdersPage = () => {
  const { showToast } = useToast();
  const [view, setView] = useState("history"); 
  const [searchTerm, setSearchTerm] = useState("");
  
  const [indents, setIndents] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [selectedIndentId, setSelectedIndentId] = useState("");
  const [editableItems, setEditableItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState(null);

  // Use a ref to track if we've already set the initial PO selection
  const initialSelectionDone = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Note: Ensure your axios 'api' instance has the correct baseURL 
      // or add '/api' prefix here if needed.
      const [indRes, poRes, stockRes] = await Promise.all([
        api.get("/procurement/indents"), 
        api.get("/procurement/purchase-orders"), 
        api.get("/procurement/godown-stocks"), 
      ]);

      const sortedPOs = (poRes.data || []).sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      const pendingIntake = (indRes.data || []).filter(i => i.status === "purchased");
      
      setIndents(pendingIntake);
      setStockItems(stockRes.data || []);
      setPurchaseOrders(sortedPOs);
      
      // Only auto-select the first PO on the very first successful load
      if (sortedPOs.length > 0 && !initialSelectionDone.current) {
        setSelectedPoId(sortedPOs[0]._id);
        initialSelectionDone.current = true;
      }
    } catch (error) {
      console.error("Load Error:", error);
      showToast("Failed to connect to procurement service", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getStockDetails = useCallback((id) => {
    const stockRecord = stockItems.find(s => 
      s.stockItemId?._id === id || s.stockItemId === id
    );
    if (!stockRecord?.stockItemId) return { name: "Unknown Item", unit: "units" };

    const item = stockRecord.stockItemId;
    return {
      name: item.name,
      unit: item.unitId?.symbol || "units"
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

  const createPO = async () => {
    if (!selectedIndentId) return showToast("Select an indent", "info");
    try {
      setLoading(true);
      const totalAmount = editableItems.reduce((sum, it) => 
        sum + (Number(it.receivedQty || 0) * Number(it.unitPrice || 0)), 0
      );
      
      const payload = {
        indentId: selectedIndentId,
        items: editableItems.map((it) => ({
          stockItemId: it.stockItemId,
          orderedQty: it.orderedQty,
          receivedQty: it.receivedQty,
          unitPrice: it.unitPrice,
          amount: it.receivedQty * it.unitPrice 
        })),
        totalAmount,
        receivedAt: new Date().toISOString(),
      };

      await api.post("/procurement/purchase-orders", payload);
      showToast("Stock successfully added to inventory!", "success");
      
      // Reset and Refresh
      setSelectedIndentId("");
      setView("history");
      initialSelectionDone.current = false; // Allow re-selection of the new PO
      loadData();
    } catch (e) {
      showToast(e.response?.data?.message || "Error creating PO", "error");
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    if (!activePO) return;
    const excelData = activePO.items.map((item) => {
      const details = getStockDetails(item.stockItemId?._id || item.stockItemId);
      return {
        "Order Date": new Date(activePO.receivedAt || activePO.createdAt).toLocaleDateString(),
        "Indent No": activePO.indentId?.indentNo || "N/A",
        "Product Name": details.name,
        "Unit": details.unit,
        "Unit Price": item.unitPrice,
        "Received Qty": item.receivedQty,
        "Subtotal": item.amount,
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Order");
    XLSX.writeFile(workbook, `PO_${activePO.indentId?.indentNo || "Export"}.xlsx`);
  };

  // Sync editable items when an indent is selected
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {loading && <Loader2 size={16} className="animate-spin" style={{ color: '#6366f1' }} />}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search Indent No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', width: '240px', outline: 'none' }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
        {view === "history" ? (
          <>
            <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px' }}>COMPLETED ORDERS ({filteredPOs.length})</div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredPOs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '13px' }}>No orders found</div>
                ) : (
                  filteredPOs.map(po => (
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
                          {new Date(po.receivedAt || po.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        ₹{po.totalAmount?.toLocaleString()} • {po.items?.length || 0} Items
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              {activePO ? (
                <>
                  <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>ORDER RECEIVED</div>
                      <div style={{ fontSize: '18px', fontWeight: '800' }}>{new Date(activePO.receivedAt || activePO.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
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
                              <td style={{ padding: '20px 0', textAlign: 'center', fontWeight: '700' }}>
                                {item.receivedQty} <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '400' }}>{details.unit}</span>
                              </td>
                              <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>₹{item.amount?.toLocaleString()}</td>
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
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Select an order from the list</div>
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
                      <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'center', width: '180px' }}>REC. QTY</th>
                      <th style={{ padding: '20px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>VALUATION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editableItems.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '20px 0' }}>
                          <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.name}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price: ₹{item.unitPrice} / {item.unit}</div>
                        </td>
                        <td style={{ textAlign: 'center', color: '#64748b', fontWeight: '600' }}>
                          {item.orderedQty} <span style={{ fontSize: '10px', fontWeight: '400' }}>{item.unit}</span>
                        </td>
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
                  Select a pending indent (marked as 'Purchased') to begin intake.
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