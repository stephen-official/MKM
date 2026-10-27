// Transfer calls shared by the Orders → Ongoing list and Transfer history (kept apart from the components for fast refresh).
import { toast } from "react-hot-toast";
import { api } from "../../api";

export const isPendingTransfer = (transfer) => (transfer.status || "pending") === "pending";

/** Accept or reject a transfer sent to this kitchen; true once the server has taken it. */
export const respondToTransfer = async (transfer, action) => {
  try {
    await api.post(`/user-transfers/${transfer._id}/${action}`);
    toast.success(`Transfer ${action === "accept" ? "accepted" : "rejected"}`);
    return true;
  } catch (error) {
    toast.error(error.response?.data?.error || `Could not ${action} transfer`);
    return false;
  }
};

/** Transfers other kitchens sent here that still wait for Accept / Reject (shown under Orders → Ongoing). */
export const fetchWaitingTransfers = async () => {
  const { data } = await api.get("/user-transfers/incoming");
  return (data || []).filter(isPendingTransfer).map((transfer) => ({ ...transfer, isIncoming: true }));
};
