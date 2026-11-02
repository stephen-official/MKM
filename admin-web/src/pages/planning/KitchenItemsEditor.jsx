import { useState } from "react";
import { Button, Modal } from "../../components/ui/index.jsx";
import { ItemRows } from "./ItemRows.jsx";
import { changeCount, editableLines, linesPayload, linesReady } from "./planning.js";

/**
 * Super-admin popup: change one kitchen's items on an order still being planned. Each item has − / + around its
 * amount and a bin; a removed item stays struck through with Undo; products are added from a search box. Every changed
 * row shows what the kitchen will see (was 10 kg ↑ More). onSave(items) resolves true when saved.
 */
export function KitchenItemsEditor({ kitchenName, orderName, share, products, busy, onSave, onClose }) {
  const [rows, setRows] = useState(() => editableLines(share));
  const changes = changeCount(rows);
  const ready = linesReady(rows);
  const keptCount = rows.filter((row) => !row.removed).length;

  const save = async (event) => {
    event.preventDefault();
    if (busy || !ready || changes === 0) return;
    await onSave(linesPayload(rows));
  };

  let hint = "The kitchen will see these changes.";
  if (keptCount === 0) hint = "A kitchen keeps at least one item. Undo a removal to save.";
  else if (!ready) hint = "Every item needs an amount above 0.";
  else if (changes === 0) hint = "Nothing changed yet.";

  return (
    <Modal title={`Change items · ${kitchenName}`} onClose={() => !busy && onClose()} closeButton="right" wide dismissible={!busy}>
      <form className="pl-editor" onSubmit={save} noValidate>
        <p className="pl-editor__order">{orderName}</p>
        <ItemRows rows={rows} setRows={setRows} products={products} busy={busy} />

        <p className={keptCount === 0 || !ready ? "pl-error" : "kp-hint"} role={keptCount === 0 || !ready ? "alert" : undefined}>{hint}</p>
        <div className="pl-editor__actions">
          <Button type="button" variant="danger" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy || !ready || changes === 0}>
            {busy ? "Saving…" : changes === 0 ? "Save changes" : `Save ${changes} ${changes === 1 ? "change" : "changes"}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
