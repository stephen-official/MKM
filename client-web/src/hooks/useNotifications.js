import { useEffect } from 'react';
import { socket } from "../socket";
import { toast } from 'react-hot-toast'; // Or your preferred notification library

export const useNotifications = () => {
  useEffect(() => {
    socket.on("low_stock_alert", (data) => {
      toast.error(`⚠️ ${data.payload.message}`, {
        duration: 5000,
        position: 'top-right',
      });
    });

    socket.on("new_request", () => {
      toast.success("📩 New Consumption Request received!", {
        icon: '📝',
      });
    });

    socket.on("request_approved", () => {
      toast.success("✅ Your consumption request was approved!");
    });

    socket.on("request_rejected", () => {
      toast.error("❌ Your consumption request was rejected.");
    });

    return () => {
      socket.off("low_stock_alert");
      socket.off("new_request");
      socket.off("request_approved");
      socket.off("request_rejected");
    };
  }, []);
};
