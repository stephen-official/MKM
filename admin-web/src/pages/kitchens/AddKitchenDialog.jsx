import { useRef, useState } from "react";
import { Check, ImagePlus, UserPlus, UserRound, X } from "lucide-react";
import { api } from "../../api.js";
import { Modal } from "../../components/ui/index.jsx";
import { Field, PasswordInput } from "./KitchenUsers.jsx";
import { draftProblems, phoneInput } from "./kitchenUsers.js";

let draftKey = 0;
const newDraft = () => ({ key: ++draftKey, name: "", email: "", password: "", phone: "" });
const isEmpty = (u) => !u.name.trim() && !u.email.trim() && !u.password && !u.phone;
const errorOf = (error, fallback) => error?.response?.data?.message || fallback;

/**
 * "Add kitchen" popup, laid out like an opened kitchen card: the kitchen (name, logo) and, for super-admins, its users.
 * The kitchen is created first, then its logo and users; onAdded(kitchen, { notes }) reports anything that did not go in.
 */
export function AddKitchenDialog({ existingNames, canManageUsers, onClose, onAdded }) {
  const [name, setName] = useState("");
  const [logo, setLogo] = useState(null); // { file, preview }
  const [details, setDetails] = useState({ inChargeName: "", phone: "", address: "", isCentralStore: false });
  const setDetail = (patch) => setDetails((prev) => ({ ...prev, ...patch }));
  const [users, setUsers] = useState(() => [newDraft()]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const trimmed = name.trim();
  const duplicate = Boolean(trimmed) && existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase());
  const filled = canManageUsers ? users.filter((u) => !isEmpty(u)) : [];

  const setUser = (key, patch) => setUsers((prev) => prev.map((u) => (u.key === key ? { ...u, ...patch } : u)));
  const pick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) setLogo({ file, preview: URL.createObjectURL(file) });
  };

  const save = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!trimmed) return setError("Give the kitchen a name.");
    if (duplicate) return setError("A kitchen with this name already exists.");
    const incomplete = filled.map((u) => [u, draftProblems(u)]).filter(([, p]) => p.length);
    if (incomplete.length) {
      const [u, problems] = incomplete[0];
      return setError(`${u.name.trim() || `User ${users.indexOf(u) + 1}`} still needs ${problems.join(", ")}. Or clear that user to skip them.`);
    }
    const ids = filled.map((u) => u.email.trim().toLowerCase());
    if (new Set(ids).size !== ids.length) return setError("Two users have the same Login ID. Each needs their own.");
    setSaving(true);
    setError("");
    let kitchen;
    try {
      ({ data: kitchen } = await api.post("/inventory/godowns", { name: trimmed, ...details, inChargeName: details.inChargeName.trim(), address: details.address.trim() }));
    } catch (err) {
      setSaving(false);
      return setError(errorOf(err, "Could not add the kitchen. Try again."));
    }
    // The kitchen exists now; anything after this that fails is reported, and can be done from its card.
    const notes = [];
    if (logo) {
      try {
        const body = new FormData();
        body.append("logo", logo.file);
        await api.post(`/inventory/godowns/${kitchen._id}/logo`, body);
      } catch {
        notes.push("the logo did not upload");
      }
    }
    for (const u of filled) {
      try {
        await api.post("/users", { name: u.name.trim(), email: u.email.trim(), phone: u.phone, password: u.password, role: "user", godownId: kitchen._id });
      } catch (err) {
        notes.push(`${u.name.trim()} was not added (${errorOf(err, "error").replace(/\.$/, "")})`);
      }
    }
    onAdded(kitchen, { notes, users: filled.length - notes.filter((n) => n.includes("was not added")).length });
  };

  return (
    <Modal title="Add kitchen" onClose={() => !saving && onClose()} closeButton="right" wide dismissible={false}>
      <form className="kp-dialog" onSubmit={save} noValidate>
        <section className="kp-section" aria-label="Kitchen">
          <div className="kp-section__head"><h3>Kitchen</h3></div>
          <Field label="Name" id="new-kitchen-name">
            <input id="new-kitchen-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Montessori Primary Kitchen" autoFocus aria-invalid={duplicate || undefined} />
          </Field>
          {duplicate && <span className="field__error" role="alert">A kitchen with this name already exists.</span>}
          <label className="kp-check">
            <input type="checkbox" checked={details.isCentralStore} onChange={(e) => setDetail({ isCentralStore: e.target.checked })} />
            <span><strong>This is the central store</strong><small>Where purchases arrive before going to the kitchens. Only one place can be the store.</small></span>
          </label>
          <Field label="Person in charge" id="new-kitchen-incharge"><input id="new-kitchen-incharge" value={details.inChargeName} maxLength={80} placeholder="e.g. Head cook's name" onChange={(e) => setDetail({ inChargeName: e.target.value })} /></Field>
          <Field label="Kitchen phone" id="new-kitchen-phone"><input id="new-kitchen-phone" type="tel" inputMode="numeric" pattern="[0-9]*" value={details.phone} placeholder="9876543210" onChange={(e) => setDetail({ phone: e.target.value.replace(/\D/g, "").slice(0, 15) })} /></Field>
          <Field label="Address" id="new-kitchen-address"><textarea id="new-kitchen-address" rows={2} value={details.address} maxLength={200} placeholder="Where deliveries go" onChange={(e) => setDetail({ address: e.target.value })} /></Field>
          <div className="kp-logo">
            <span className="kp-mark kp-mark--big" aria-hidden="true">{logo ? <img src={logo.preview} alt="" /> : (trimmed.charAt(0).toUpperCase() || "?")}</span>
            <div className="kp-logo__text">
              <strong>Logo <span className="kp-optional">(optional)</span></strong>
              <span className="kp-hint">Shown at the top of the kitchen app for everyone who signs in here.</span>
              <span className="kp-logo__buttons">
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pick} aria-label="Kitchen logo" />
                <button type="button" className="kg-chip" onClick={() => fileRef.current?.click()}><ImagePlus size={14} aria-hidden="true" /> {logo ? "Change logo" : "Add logo"}</button>
                {logo && <button type="button" className="kp-link kp-link--danger" onClick={() => setLogo(null)}><X size={13} aria-hidden="true" /> Remove</button>}
              </span>
            </div>
          </div>
        </section>

        {canManageUsers && (
          <section className="kp-section" aria-label="Users">
            <div className="kp-section__head"><h3>Users</h3></div>
            <p className="kp-hint">Optional. Everyone here can record usage and ask for supplies for this kitchen. Leave a user empty to skip them.</p>
            <ul className="kp-users">
              {users.map((u, index) => (
                <li key={u.key} className="kg-row kp-user">
                  <div className="kp-user__head">
                    <span className="kp-user__icon" aria-hidden="true"><UserRound size={18} /></span>
                    <span className="kp-user__name"><strong>{u.name.trim() || `User ${index + 1}`}</strong></span>
                    {users.length > 1 && (
                      <span className="kp-user__tools">
                        <button type="button" className="kg-chip kp-icon kp-chip--cancel" onClick={() => setUsers((prev) => prev.filter((x) => x.key !== u.key))} aria-label={`Remove ${u.name.trim() || `user ${index + 1}`}`} title="Remove this user"><X size={18} aria-hidden="true" /></button>
                      </span>
                    )}
                  </div>
                  <div className="kp-user__form">
                    <Field label="Name" id={`nu-${u.key}-n`}><input id={`nu-${u.key}-n`} placeholder="Full name" maxLength={100} value={u.name} onChange={(e) => setUser(u.key, { name: e.target.value })} /></Field>
                    <Field label="Login ID" id={`nu-${u.key}-e`}><input id={`nu-${u.key}-e`} type="email" placeholder="Their email address" value={u.email} onChange={(e) => setUser(u.key, { email: e.target.value })} /></Field>
                    <Field label="Password" id={`nu-${u.key}-p`}><PasswordInput id={`nu-${u.key}-p`} value={u.password} onChange={(password) => setUser(u.key, { password })} /></Field>
                    <Field label="WhatsApp" id={`nu-${u.key}-w`}><input id={`nu-${u.key}-w`} type="tel" inputMode="numeric" pattern="[0-9]*" placeholder="9876543210" value={u.phone} onChange={(e) => setUser(u.key, { phone: phoneInput(e.target.value) })} /></Field>
                  </div>
                </li>
              ))}
            </ul>
            <div className="kp-adduser">
              <button type="button" className="kp-adduser__toggle" onClick={() => setUsers((prev) => [...prev, newDraft()])}><UserPlus size={16} aria-hidden="true" /> Add user</button>
            </div>
          </section>
        )}

        {error && <span className="field__error" role="alert">{error}</span>}
        <div className="kp-form-actions kp-form-actions--dialog">
          <button type="button" className="kg-chip kp-icon kp-chip--cancel" disabled={saving} onClick={onClose} aria-label="Cancel" title="Cancel"><X size={18} aria-hidden="true" /></button>
          <button type="submit" className="kg-chip kp-icon kp-chip--save" disabled={saving || !trimmed || duplicate} aria-label="Save the new kitchen" title="Save"><Check size={18} aria-hidden="true" /></button>
        </div>
      </form>
    </Modal>
  );
}
