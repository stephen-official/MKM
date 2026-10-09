








import { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";
import { toast } from "react-hot-toast";

export const UserTransferPage = () => {
  const [transfers, setTransfers] = useState([]);
const fetchTransfers = useCallback(async () => {
  try {
    const [historyRes, incomingRes] = await Promise.all([
      api.get("/user-transfers/history"),
      api.get("/user-transfers/incoming"),
    ]);

    const history = historyRes.data || [];
    const incoming = incomingRes.data || [];

    // Mark incoming requests
   const incomingMarked = incoming.map((t) => ({
  ...t,
  isIncoming: true,
}));

const map = new Map();

history.forEach((t) => {
  map.set(t._id, {
    ...t,
    isIncoming: false,
  });
});

incomingMarked.forEach((t) => {
  map.set(t._id, t);
});
    const merged = [...map.values()].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    setTransfers(merged);
  } catch {
    toast.error("Failed to load transfers");
  }
}, []);

  useEffect(() => {
    void Promise.resolve().then(fetchTransfers);
  }, [fetchTransfers]);
  return (
  <div className="flex flex-col h-full bg-gray-50/50 p-2 space-y-3">

    {/* LIST */}
    <div className="flex-1 overflow-y-auto space-y-3">

      {transfers.length > 0 ? (
        transfers.map((t) => (
          <div
            key={t._id}
            className="bg-white p-4 rounded-2xl border shadow-sm"
          >

            {/* TOP ROW */}
            <div className="flex justify-between mb-2">
              <span className={`text-[9px] font-black px-2 py-1 rounded uppercase ${
                t.status === "accepted"
                  ? "bg-green-100 text-green-600"
                  : t.status === "rejected"
                  ? "bg-red-100 text-red-600"
                  : "bg-orange-100 text-orange-600"
              }`}>
                {t.status || "pending"}
              </span>

              <span className="text-[10px] font-black text-gray-600">
                {new Date(t.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* FLOW */}
            <div className="flex justify-between mb-2">

  <div className="text-[10px] font-black text-gray-500">
    {t.fromGodownId?.name} ➜ {t.toGodownId?.name}
  </div>

  <span
    className={`text-[9px] px-2 py-1 rounded-full font-bold ${
      t.isIncoming
        ? "bg-blue-100 text-blue-700"
        : "bg-gray-100 text-gray-700"
    }`}
  >
    {t.isIncoming ? "Incoming" : "Outgoing"}
  </span>

</div>

{/* ITEMS */}
<div className="space-y-1">
  {t.items?.map((it, i) => (
    <div key={i} className="flex justify-between text-xs">
      <span className="font-black text-blue-600 uppercase">
        {it.stockItemId?.name}
      </span>

      <span className="font-bold">
        -{it.qtyBaseUnit}
      </span>
    </div>
  ))}
</div>

{/* SHOW ONLY FOR INCOMING PENDING REQUESTS */}
{t.isIncoming && t.status === "pending" && (
  <div className="flex gap-2 mt-4">

    <button
      onClick={async () => {
        try {
          await api.post(`/user-transfers/${t._id}/accept`);

          toast.success("Transfer Accepted");

          fetchTransfers();
        } catch (err) {
          toast.error(err.response?.data?.error || "Accept failed");
        }
      }}
      className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold"
    >
      Accept
    </button>

    <button
      onClick={async () => {
        try {
          await api.post(`/user-transfers/${t._id}/reject`);

          toast.success("Transfer Rejected");

          fetchTransfers();
        } catch (err) {
          toast.error(err.response?.data?.error || "Reject failed");
        }
      }}
      className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold"
    >
      Reject
    </button>

  </div>
)}

</div>
        ))
      ) : (
        <div className="text-center py-10 text-gray-400 font-black text-xs uppercase">
          No transfers found
        </div>
      )}

    </div>
  </div>
);
};







