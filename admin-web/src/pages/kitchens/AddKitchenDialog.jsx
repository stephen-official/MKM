import { useRef, useState } from "react";
import { ImagePlus, Plus, X } from "lucide-react";
import { api } from "../../api.js";
import { Button, Field, Modal } from "../../components/ui/index.jsx";

/** "Add kitchen" popup, like Add product: the name, and a logo if there is one. Calls onAdded(kitchen) once saved. */
export function AddKitchenDialog({ existingNames, onClose, onAdded }) {
  const [name, setName] = useState("");
  const [logo, setLogo] = useState(null); // { file, preview }
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const trimmed = name.trim();
  const duplicate = Boolean(trimmed) && existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase());

  const pick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) setLogo({ file, preview: URL.createObjectURL(file) });
  };

  const save = async (event) => {
    event.preventDefault();
    if (saving || !trimmed || duplicate) return;
    setSaving(true);
    setError("");
    try {
      const { data: kitchen } = await api.post("/inventory/godowns", { name: trimmed });
      let logoFailed = false;
      if (logo) {
        try {
          const body = new FormData();
          body.append("logo", logo.file);
          await api.post(`/inventory/godowns/${kitchen._id}/logo`, body);
        } catch {
          logoFailed = true; // the kitchen is saved; the logo can be added from its card
        }
      }
      onAdded(kitchen, { logoFailed });
    } catch (err) {
      setError(err?.response?.data?.message || "Could not add the kitchen. Try again.");
      setSaving(false);
    }
  };

  return (
    <Modal title="Add kitchen" onClose={() => !saving && onClose()} closeButton="right" actions={(
      <Button type="submit" form="add-kitchen" disabled={saving || !trimmed || duplicate}><Plus size={16} aria-hidden="true" /> {saving ? "Adding…" : "Add kitchen"}</Button>
    )}>
      <form id="add-kitchen" className="kp-dialog" onSubmit={save} noValidate>
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Montessori Primary Kitchen" autoFocus aria-invalid={duplicate || undefined} />
          {duplicate && <span className="field__error" role="alert">A kitchen with this name already exists.</span>}
        </Field>
        <div className="kp-logo">
          <span className="kp-mark kp-mark--big" aria-hidden="true">{logo ? <img src={logo.preview} alt="" /> : (trimmed.charAt(0).toUpperCase() || "?")}</span>
          <div className="kp-logo__text">
            <strong>Logo <span className="kp-optional">(optional)</span></strong>
            <span className="kp-hint">Shown at the top of the kitchen app. You can add or change it later.</span>
            <span className="kp-logo__buttons">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pick} aria-label="Kitchen logo" />
              <button type="button" className="kg-chip" onClick={() => fileRef.current?.click()}><ImagePlus size={14} aria-hidden="true" /> {logo ? "Change logo" : "Add logo"}</button>
              {logo && <button type="button" className="kp-link kp-link--danger" onClick={() => setLogo(null)}><X size={13} aria-hidden="true" /> Remove</button>}
            </span>
          </div>
        </div>
        <p className="kp-hint">Its card opens next, ready for the people who sign in there.</p>
        {error && <span className="field__error" role="alert">{error}</span>}
      </form>
    </Modal>
  );
}
