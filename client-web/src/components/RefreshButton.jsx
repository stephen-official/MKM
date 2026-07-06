import { FiRefreshCw } from "react-icons/fi";

export default function RefreshButton() {
  const refresh = () => {
    window.location.reload();
  };

  return (
    <button
      onClick={refresh}
      title="Refresh"
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "56px",
        height: "56px",
        borderRadius: "50%",
        border: "none",
        backgroundColor: "#1976D2",
        color: "white",
        cursor: "pointer",
        zIndex: 99999,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
      }}
    >
      <FiRefreshCw size={24} />
    </button>
  );
}