
import { useEffect, useState, useMemo } from "react";
import { api } from "../api.js";
import { toast } from "react-hot-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from "xlsx";
import { Calendar, Search, FileSpreadsheet, CheckCircle, XCircle } from "lucide-react";

export const RequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [filterDate, setFilterDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get("/requests");
      setRequests(res.data);
      if (res.data.length > 0) setSelectedId(res.data[0]._id);
    } catch (err) {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const processedRows = useMemo(() => {
    let data = [...requests];
    if (filterDate) {
      const selectedStr = filterDate.toISOString().split('T')[0];
      data = data.filter(r => 
        new Date(r.createdAt).toISOString().split('T')[0] === selectedStr
      );
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      data = data.filter(r => 
        r.requestedBy?.toLowerCase().includes(query) || 
        r.godownId?.name?.toLowerCase().includes(query) ||
        r.reason?.toLowerCase().includes(query)
      );
    }
    return data.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [requests, filterDate, searchQuery]);

  const activeRecord = useMemo(() => 
    processedRows.find(r => r._id === selectedId) || processedRows[0], 
  [selectedId, processedRows]);

  const handleAction = async (id, action) => {
    const note = window.prompt(`Enter a note for this ${action}:`, `Request ${action}ed by admin`);
    if (note === null) return;

    try {
      await api.post(`/requests/${id}/${action}`, { note });
      toast.success(`Request ${action}ed successfully`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Action failed");
    }
  };

  const handleDownloadExcel = () => {
    if (!activeRecord) return;
    const excelData = activeRecord.items.map((item) => ({
      "Stock Item": item.stockItemId?.name,
      "Quantity": item.qtyBaseUnit || item.quantity,
      "Unit": item.stockItemId?.unitId?.symbol || item.unit || "Units",
      "Status": activeRecord.status,
      "Reason": activeRecord.reason,
      "Authorised By": activeRecord.requestedBy || 'Admin',
      "Date": new Date(activeRecord.createdAt).toLocaleDateString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Request");
    XLSX.writeFile(workbook, `Request_${activeRecord.requestedBy || 'Admin'}_${Date.now()}.xlsx`);
  };

  return (
    <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Header Area */}
      <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
          <span style={{ color: '#6366f1', fontWeight: '500' }}>Requests</span>
        </h1>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
            <input 
              type="text" placeholder="Search requests..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px 10px 36px', fontSize: '13px', fontWeight: '600', width: '220px', outline: 'none' }}
            />
          </div>

          <div style={{ background: '#f8fafc', padding: '0 12px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="#6366f1" />
            <DatePicker
              selected={filterDate}
              onChange={(date) => setFilterDate(date)}
              dateFormat="dd MMM yyyy"
              customInput={<input style={{ border: 'none', background: 'transparent', fontWeight: '700', fontSize: '13px', width: '90px', cursor: 'pointer' }} />}
            />
          </div>
        </div>
      </div>

      {/* Content Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
        {/* Sidebar List */}
        <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', paddingLeft: '8px', letterSpacing: '0.5px' }}>
            {searchQuery ? 'SEARCH RESULTS' : 'RECENT RECORDS'} ({processedRows.length})
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {processedRows.map(r => (
              <div 
                key={r._id} onClick={() => setSelectedId(r._id)}
                style={{
                  padding: '16px', borderRadius: '16px', cursor: 'pointer',
                  background: selectedId === r._id ? '#fff' : 'transparent',
                  border: selectedId === r._id ? '1px solid #6366f1' : '1px solid transparent',
                  boxShadow: selectedId === r._id ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: '700', color: selectedId === r._id ? '#6366f1' : '#1e293b', fontSize: '14px' }}>
                    {r.godownId?.name || 'Main Hub'}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: r.status === 'pending' ? '#f59e0b' : '#94a3b8' }}>
                    {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{r.items?.length} items • {r.requestedBy || 'Admin'}</span>
                  <span style={{ fontWeight: '800', textTransform: 'uppercase', fontSize: '10px' }}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Canvas */}
        <div style={{ flex: 1, background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          {activeRecord ? (
            <>
              <div style={{ padding: '40px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>TARGET DATE</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{activeRecord.targetDate ? new Date(activeRecord.targetDate).toLocaleDateString() : 'Immediate'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>STATUS</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: activeRecord.status === 'pending' ? '#f59e0b' : activeRecord.status === 'approved' ? '#10b981' : '#ef4444', textTransform: 'uppercase' }}>{activeRecord.status}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', marginBottom: '6px' }}>REQUESTED BY</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{activeRecord.requestedBy || 'Admin'}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{activeRecord.godownId?.name}</div>
                  </div>
                </div>

                {activeRecord.reason && (
                  <div style={{ marginTop: '24px', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', borderLeft: '4px solid #6366f1' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', marginBottom: '4px' }}>REASON</div>
                    <div style={{ fontSize: '13px', color: '#1e293b', fontStyle: 'italic' }}>"{activeRecord.reason}"</div>
                  </div>
                )}
              </div>

              <div style={{ flex: 1, padding: '0 40px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left' }}>
                      <th style={{ padding: '24px 0 12px', fontSize: '11px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>STOCK ITEM</th>
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
                        <td style={{ padding: '20px 0', textAlign: 'right', borderBottom: '1px solid #f8fafc' }}>
                          <span style={{ fontWeight: '800', color: '#0f172a' }}>{item.qtyBaseUnit || item.quantity}</span>
                          <span style={{ marginLeft: '4px', fontSize: '12px', color: '#64748b' }}>
                            {item.stockItemId?.unitId?.symbol || item.unit || ""}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Footer */}
              <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {/* UPDATED EXCEL BUTTON COLOR */}
                <button 
                  onClick={handleDownloadExcel}
                  style={{ 
                    background: '#10b981', 
                    border: 'none', 
                    color: '#fff', 
                    padding: '12px 20px', 
                    borderRadius: '12px', 
                    fontWeight: '700', 
                    fontSize: '13px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' 
                  }}
                >
                  <FileSpreadsheet size={16} /> Export to Excel
                </button>

                <div style={{ display: 'flex', gap: '12px' }}>
                  {activeRecord.status === 'pending' ? (
                    <>
                      <button 
                        onClick={() => handleAction(activeRecord._id, 'reject')}
                        style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <XCircle size={16} /> Reject
                      </button>
                      <button 
                        onClick={() => handleAction(activeRecord._id, 'approve')}
                        style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2)' }}
                      >
                        <CheckCircle size={16} /> Approve Request
                      </button>
                    </>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', background: '#fff', padding: '10px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      Admin Note: {activeRecord.adminDecision || 'No note provided'}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              <div style={{ textAlign: 'center' }}>
                <Search size={40} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <div style={{ fontWeight: '600' }}>No matching requests found</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};