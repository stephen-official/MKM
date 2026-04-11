import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const ConsumptionHistory = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch the user's previous consumptions
  useEffect(() => {
    const fetchMyLogs = async () => {
      try {
        const res = await axios.get('/api/consumptions/me');
        setLogs(res.data);
      } catch (err) {
        toast.error("Failed to load history");
      } finally {
        setLoading(false);
      }
    };
    fetchMyLogs();
  }, []);

  // 2. The Logic House: handleEditPrevious
  const handleEditPrevious = async (pastConsumption) => {
    const consumptionDate = new Date(pastConsumption.date).toDateString();
    const today = new Date().toDateString();

    if (consumptionDate === today) {
      // Logic for same-day edits (Direct)
      console.log("Opening direct edit modal for today's item...");
      // openEditModal(pastConsumption); 
    } else {
      // Logic for past-day edits (Admin Request)
      const reason = prompt("Please enter a reason for this edit request:");
      if (!reason) return;

      const requestPayload = {
        targetDate: pastConsumption.date,
        reason: reason,
        items: pastConsumption.items, // In a real UI, you'd let them edit these first
      };

      try {
        await axios.post('/api/requests', requestPayload);
        toast.success("Request sent to Admin for approval.");
      } catch (err) {
        toast.error("Failed to send request.");
      }
    }
  };

  if (loading) return <p>Loading history...</p>;

  return (
    <div className="history-container">
      <h2 className="text-xl font-bold mb-4">Daily Consumption Logs</h2>
      {logs.map((log) => (
        <div key={log._id} className="p-4 border rounded-lg mb-3 flex justify-between items-center bg-white shadow-sm">
          <div>
            <p className="font-medium">Date: {log.date}</p>
            <p className="text-sm text-gray-500">{log.items.length} items consumed</p>
          </div>
          
          {/* THE EDIT BUTTON */}
          <button 
            onClick={() => handleEditPrevious(log)}
            className="px-4 py-2 bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200 transition"
          >
            Edit / Request Change
          </button>
        </div>
      ))}
    </div>
  );
};

export default ConsumptionHistory;