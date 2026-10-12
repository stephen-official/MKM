import { useCallback, useRef, useState } from "react";
import { ConfirmDialog } from "./index.jsx";

/* Promise-based stand-in for window.confirm.
     const { confirm, dialog } = useConfirm();
     if (!(await confirm({ title, message, confirmLabel, variant: "danger" }))) return;
   Render `dialog` once in the page. */
export function useConfirm() {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setState(options);
      }),
    []
  );

  const settle = (answer) => {
    resolver.current?.(answer);
    resolver.current = null;
    setState(null);
  };

  const dialog = state ? (
    <ConfirmDialog
      title={state.title || "Are you sure?"}
      message={state.message}
      confirmLabel={state.confirmLabel}
      variant={state.variant}
      onCancel={() => settle(false)}
      onConfirm={() => settle(true)}
    />
  ) : null;

  return { confirm, dialog };
}
