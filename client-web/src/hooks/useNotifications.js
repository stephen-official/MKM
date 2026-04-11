import { useEffect } from 'react';
import { socket } from '../services/socket';
import { toast } from 'react-hot-toast'; // Or your preferred notification library

export const useNotifications = () => {
  useEffect(() => {
    // 1. Listen for Low Stock (Both User and Admin)
    socket.on("low_stock_alert", (data) => {
      toast.error(`⚠️ ${data.payload.message}`, {
        duration: 5000,
        position: 'top-right',
      });
    });

    // 2. Listen for Admin: New Requests
    socket.on("new_request", (data) => {
      toast.success("📩 New Consumption Request received!", {
        icon: '📝',
      });
    });

    // 3. Listen for User: Request Updates
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