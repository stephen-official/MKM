import { FiRefreshCw } from "react-icons/fi";
import { useLocation } from "react-router-dom";

// The kitchen app ("/") has a reload button in its header; a floating one there covered the
// bottom navigation's last tab and the bottom of open sheets. Sign-in pages have no header, so keep it there.
const PATHS_WITH_HEADER_RELOAD = new Set(["/"]);

export default function RefreshButton() {
  const { pathname } = useLocation();
  if (PATHS_WITH_HEADER_RELOAD.has(pathname)) return null;

  const refresh = () => {
    window.location.reload();
  };

  return (
    <button
      type="button"
      onClick={refresh}
      title="Refresh"
      aria-label="Reload the app"
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