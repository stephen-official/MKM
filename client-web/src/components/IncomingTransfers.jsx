// 01-07-2026





import { useEffect, useState } from "react";
import { api } from "../api";
import { toast } from "react-hot-toast";
import {
  CheckCircle,
  XCircle,
  ArrowRightLeft,
  Package,
  Calendar,
  FileText,
} from "lucide-react";

export const IncomingTransfers = () => {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");

  // ===========================
  // Load Incoming Transfers
  // ===========================
  const loadTransfers = async () => {
    try {
      setLoading(true);

      const { data } = await api.get("/user-transfers/incoming");

      setTransfers(data || []);
    } catch (err) {
      toast.error("Failed to load transfers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransfers();
  }, []);

  // ===========================
  // Accept Transfer
  // ===========================
  const acceptTransfer = async (id) => {
    try {
      setProcessingId(id);

      await api.post(`/user-transfers/${id}/accept`);

      toast.success("Transfer Accepted");

      loadTransfers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Accept failed");
    } finally {
      setProcessingId("");
    }
  };

  // ===========================
  // Reject Transfer
  // ===========================
  const rejectTransfer = async (id) => {
    try {
      setProcessingId(id);

      await api.post(`/user-transfers/${id}/reject`);

      toast.success("Transfer Rejected");

      loadTransfers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Reject failed");
    } finally {
      setProcessingId("");
    }
  };

  // ===========================
  // Styles
  // ===========================

  const styles = {
    page: {
      padding: 24,
      background: "#f8fafc",
      minHeight: "100vh",
      fontFamily: "Inter, sans-serif",
    },

    title: {
      fontSize: 28,
      fontWeight: 800,
      marginBottom: 25,
      color: "#0f172a",
    },

    empty: {
      background: "#fff",
      borderRadius: 12,
      padding: 40,
      textAlign: "center",
      border: "1px solid #e2e8f0",
      color: "#64748b",
      fontWeight: 600,
    },

    card: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 14,
      padding: 20,
      marginBottom: 20,
      boxShadow: "0 3px 8px rgba(0,0,0,.04)",
    },

    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 15,
    },

    route: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontWeight: 700,
      fontSize: 18,
      color: "#1e293b",
    },

    date: {
      fontSize: 13,
      color: "#64748b",
    },

    table: {
      width: "100%",
      borderCollapse: "collapse",
      marginTop: 10,
    },

    th: {
      textAlign: "left",
      padding: "10px",
      borderBottom: "1px solid #e5e7eb",
      color: "#64748b",
      fontSize: 12,
      textTransform: "uppercase",
    },

    td: {
      padding: "12px 10px",
      borderBottom: "1px solid #f1f5f9",
      fontSize: 14,
    },

    badge: {
      display: "inline-block",
      background: "#eef2ff",
      color: "#4338ca",
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
    },

    note: {
      marginTop: 15,
      padding: 12,
      background: "#f8fafc",
      borderRadius: 8,
      display: "flex",
      alignItems: "center",
      gap: 8,
      color: "#475569",
    },

    actions: {
      display: "flex",
      justifyContent: "flex-end",
      gap: 12,
      marginTop: 18,
    },

    acceptBtn: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "#16a34a",
      color: "#fff",
      border: "none",
      borderRadius: 8,
      padding: "10px 18px",
      cursor: "pointer",
      fontWeight: 700,
    },

    rejectBtn: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "#dc2626",
      color: "#fff",
      border: "none",
      borderRadius: 8,
      padding: "10px 18px",
      cursor: "pointer",
      fontWeight: 700,
    },
  };

  // ===========================
  // UI
  // ===========================

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Incoming Transfer Requests</h1>

      {loading ? (
        <div style={styles.empty}>Loading...</div>
      ) : transfers.length === 0 ? (
        <div style={styles.empty}>
          <Package size={45} style={{ marginBottom: 10 }} />
          <br />
          No Pending Transfers
        </div>
      ) : (
        transfers.map((t) => (
          <div key={t._id} style={styles.card}>
            <div style={styles.header}>
              <div style={styles.route}>
                <span>{t.fromGodownId?.name}</span>

                <ArrowRightLeft size={18} />

                <span>{t.toGodownId?.name}</span>
              </div>

              <div style={styles.date}>
                <Calendar
                  size={14}
                  style={{
                    display: "inline",
                    marginRight: 5,
                    verticalAlign: "middle",
                  }}
                />

                {new Date(t.createdAt).toLocaleString()}
              </div>
            </div>

            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Item</th>
                  <th style={styles.th}>Group</th>
                  <th style={styles.th}>Quantity</th>
                  <th style={styles.th}>Unit</th>
                </tr>
              </thead>

              <tbody>
                {t.items.map((item) => (
                  <tr key={item.stockItemId?._id}>
                    <td style={styles.td}>
                      {item.stockItemId?.name}
                    </td>

                    <td style={styles.td}>
                      <span style={styles.badge}>
                        {item.stockItemId?.stockGroupId?.name || "General"}
                      </span>
                    </td>

                    <td style={styles.td}>
                      {item.qtyBaseUnit}
                    </td>

                    <td style={styles.td}>
                      {item.stockItemId?.unitId?.symbol || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={styles.note}>
              <FileText size={16} />
              <strong>Reason:</strong> {t.note || "No reason provided"}
            </div>

            <div style={styles.actions}>
              <button
                style={styles.acceptBtn}
                disabled={processingId === t._id}
                onClick={() => acceptTransfer(t._id)}
              >
                <CheckCircle size={18} />
                {processingId === t._id ? "Processing..." : "Accept"}
              </button>

              <button
                style={styles.rejectBtn}
                disabled={processingId === t._id}
                onClick={() => rejectTransfer(t._id)}
              >
                <XCircle size={18} />
                {processingId === t._id ? "Processing..." : "Reject"}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};