import { useCallback, useRef, useState } from "react";
import "./ConfirmDialog.css";

/**
 * In-app replacement for window.confirm. `confirm({ title, message, confirmLabel, cancelLabel, danger })`
 * resolves true or false; render `dialog` once in the screen.
 */
export function useConfirm() {
  const [request, setRequest] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setRequest(options);
  }), []);

  const answer = (value) => {
    resolver.current?.(value);
    resolver.current = null;
    setRequest(null);
  };

  const dialog = request && (
    <div className="cd-layer" role="presentation">
      <button type="button" className="cd-backdrop" aria-label="Cancel" onClick={() => answer(false)} />
      <section className="cd-panel" role="alertdialog" aria-modal="true" aria-labelledby="cd-title" aria-describedby="cd-message">
        <h2 id="cd-title">{request.title}</h2>
        {request.message && <p id="cd-message">{request.message}</p>}
        <footer>
          <button type="button" className="cd-cancel" onClick={() => answer(false)} autoFocus>{request.cancelLabel || "Cancel"}</button>
          <button type="button" className={request.danger ? "cd-confirm cd-confirm--danger" : "cd-confirm"} onClick={() => answer(true)}>{request.confirmLabel || "OK"}</button>
        </footer>
      </section>
    </div>
  );

  return [confirm, dialog];
}
