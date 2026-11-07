import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { api } from "../../api.js";
import { Button, Modal } from "../../components/ui/index.jsx";
import { ItemRows } from "./ItemRows.jsx";
import { dayText, linesPayload, linesReady, neededByPreview } from "./planning.js";

/**
 * Admin popup: start an order for a kitchen (the central store too), as if that kitchen had started it. Three steps,
 * all taps: the kitchen, when it is needed (the options from Settings › Ordering rules, or Urgent), and the items.
 * onStart({ godownId, neededIn | emergency, items }, kitchenName) resolves true when the order was made.
 */
export function NewOrderDialog({ products, busy, onStart, onClose }) {
  const [kitchens, setKitchens] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [kitchenId, setKitchenId] = useState("");
  const [when, setWhen] = useState(""); // a neededIn key, or "urgent"
  const [rows, setRows] = useState([]);

  useEffect(() => {
    Promise.all([api.get("/inventory/godowns"), api.get("/ordering-settings")])
      .then(([kitchenRes, settingsRes]) => {
        setKitchens((kitchenRes.data || []).filter((k) => k.active !== false));
        setSettings(settingsRes.data?.settings || null);
      })
      .catch(() => setLoadError("Could not load the kitchens. Close this and try again."));
  }, []);

  const kitchen = kitchens?.find((k) => k._id === kitchenId);
  const neededBy = neededByPreview(when, settings);
  const ready = Boolean(kitchen) && Boolean(neededBy) && linesReady(rows);

  const start = async (event) => {
    event.preventDefault();
    if (busy || !ready) return;
    const timing = when === "urgent" ? { emergency: true } : { neededIn: when };
    await onStart({ godownId: kitchenId, ...timing, items: linesPayload(rows) }, kitchen.name);
  };

  let hint = "";
  if (!kitchen) hint = "Choose the kitchen this order is for.";
  else if (!neededBy) hint = "Choose when it is needed.";
  else if (rows.length === 0) hint = "Add at least one product.";
  else if (!linesReady(rows)) hint = "Every item needs an amount above 0.";
  else hint = `${kitchen.name} will see this order, and other kitchens can add to it until it closes.`;

  return (
    <Modal title="New order" onClose={() => !busy && onClose()} closeButton="right" wide dismissible={!busy}>
      <form className="pl-editor" onSubmit={start} noValidate>
        {loadError ? <p className="pl-error" role="alert">{loadError}</p> : !kitchens || !settings ? (
          <p className="kp-hint" role="status"><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Loading…</p>
        ) : (
          <>
            <fieldset className="pl-step">
              <legend>1 · For which kitchen?</legend>
              <div className="pl-choices">
                {kitchens.map((k) => (
                  <button key={k._id} type="button" className={`kg-chip pl-choice${kitchenId === k._id ? " is-picked" : ""}`} aria-pressed={kitchenId === k._id} onClick={() => setKitchenId(k._id)}>
                    {k.name}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="pl-step">
              <legend>2 · Needed in</legend>
              <div className="pl-choices">
                {settings.neededInOptions.map((option) => (
                  <button key={option.key} type="button" className={`kg-chip pl-choice${when === option.key ? " is-picked" : ""}`} aria-pressed={when === option.key} onClick={() => setWhen(option.key)}>
                    {option.label}
                  </button>
                ))}
                <button type="button" className={`kg-chip pl-choice pl-choice--urgent${when === "urgent" ? " is-picked" : ""}`} aria-pressed={when === "urgent"} onClick={() => setWhen("urgent")}>
                  <AlertTriangle size={14} aria-hidden="true" /> Urgent
                </button>
              </div>
              {neededBy && <p className="pl-step__note">Needed by <strong>{dayText(neededBy, when === "urgent")}</strong></p>}
            </fieldset>

            <div className="pl-step pl-step--items">
              <p className="pl-step__legend">3 · Items</p>
              <ItemRows rows={rows} setRows={setRows} products={products} busy={busy} showChanges={false} />
            </div>
          </>
        )}

        <p className={kitchen && neededBy && rows.length > 0 && !ready ? "pl-error" : "kp-hint"}>{hint}</p>
        <div className="pl-editor__actions">
          <Button type="button" variant="danger" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy || !ready}>{busy ? "Starting…" : "Start order"}</Button>
        </div>
      </form>
    </Modal>
  );
}
