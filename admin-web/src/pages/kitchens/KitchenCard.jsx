import { useId, useRef, useState } from "react";
import { Check, ChevronDown, Edit3, ImagePlus, Trash2, Users, X } from "lucide-react";
import { api } from "../../api.js";
import { useToast } from "../../useToast.js";
import { KitchenUsers } from "./KitchenUsers.jsx";

const errorOf = (error, fallback) => error?.response?.data?.message || fallback;
const initial = (name) => String(name || "").trim().charAt(0).toUpperCase() || "?";

/** One kitchen as a fold-out glass card: its logo and name; opened, its details (Edit / Delete kitchen) and its users. */
export function KitchenCard({ kitchen, kitchens, users, canManageUsers, open, onToggle, onChanged, onUsersChanged, confirm }) {
  const { showToast } = useToast();
  const bodyId = useId();
  const fileRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const detailsOf = (k) => ({ name: k.name, address: k.address || "", inChargeName: k.inChargeName || "", phone: k.phone || "", isCentralStore: Boolean(k.isCentralStore) });
  const [details, setDetails] = useState(() => detailsOf(kitchen));
  const name = details.name;
  const set = (patch) => setDetails((prev) => ({ ...prev, ...patch }));
  const [logo, setLogo] = useState(null); // staged until Save: { file, preview } for a new one, { remove: true } to take it off
  const [saving, setSaving] = useState(false);
  const active = users.filter((u) => u.active).length;
  const shownLogo = logo?.preview || (logo?.remove ? "" : kitchen.logoUrl);

  const startEdit = () => { setDetails(detailsOf(kitchen)); setLogo(null); setEditing(true); };
  const cancel = () => { setEditing(false); setDetails(detailsOf(kitchen)); setLogo(null); };
  const pick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) setLogo({ file, preview: URL.createObjectURL(file) });
  };

  const save = async (event) => {
    event.preventDefault();
    if (saving || !name.trim()) return;
    setSaving(true);
    try {
      const before = detailsOf(kitchen);
      const next = { ...details, name: name.trim(), address: details.address.trim(), inChargeName: details.inChargeName.trim() };
      if (Object.keys(next).some((key) => next[key] !== before[key])) await api.put(`/inventory/godowns/${kitchen._id}`, next);
      if (logo?.file) {
        const body = new FormData();
        body.append("logo", logo.file);
        await api.post(`/inventory/godowns/${kitchen._id}/logo`, body);
      } else if (logo?.remove) {
        await api.delete(`/inventory/godowns/${kitchen._id}/logo`);
      }
      showToast("Kitchen saved", "success");
      setEditing(false);
      setLogo(null);
      onChanged();
    } catch (error) {
      showToast(errorOf(error, "Could not save. Try again."), "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!(await confirm({ title: `Delete “${kitchen.name}”?`, message: "Only a kitchen with no users, stock, usage, orders or requests can be deleted. This cannot be undone.", confirmLabel: "Delete", variant: "danger" }))) return;
    try {
      await api.delete(`/inventory/godowns/${kitchen._id}`);
      showToast("Deleted", "success");
      onChanged();
    } catch (error) {
      showToast(errorOf(error, "Could not delete it."), "error");
    }
  };

  return (
    <li className={`kg-glass kp-card${open ? " kp-card--open" : ""}`}>
      <button type="button" className="kp-card__head" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
        <span className="kp-mark" aria-hidden="true">{kitchen.logoUrl ? <img src={kitchen.logoUrl} alt="" /> : initial(kitchen.name)}</span>
        <span className="kp-card__title">
          <strong>{kitchen.name}{kitchen.isCentralStore && <span className="kg-pill kg-pill--low kp-store-pill">Central store</span>}</strong>
          {canManageUsers && <small><Users size={12} aria-hidden="true" /> {users.length === 0 ? "No users yet" : `${users.length} ${users.length === 1 ? "user" : "users"}${active < users.length ? ` · ${users.length - active} disabled` : ""}`}</small>}
        </span>
        <ChevronDown size={20} className="kp-card__chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="kp-card__body" id={bodyId}>
          <section className="kp-section" aria-label={`${kitchen.name} details`}>
            <div className="kp-section__head">
              <h3>Kitchen</h3>
              {!editing && (
                <span className="kp-section__actions">
                  <button type="button" className="kg-chip kp-icon kp-chip--edit" onClick={startEdit} aria-label={`Edit ${kitchen.name}`} title="Edit"><Edit3 size={16} aria-hidden="true" /></button>
                  <button type="button" className="kg-chip kp-icon kp-chip--danger" onClick={remove} aria-label={`Delete ${kitchen.name}`} title="Delete kitchen"><Trash2 size={16} aria-hidden="true" /></button>
                </span>
              )}
            </div>

            {editing ? (
              <form className="kp-kitchen-form" onSubmit={save}>
                <label className="kp-field">
                  <span>Name</span>
                  <input value={name} maxLength={80} onChange={(e) => set({ name: e.target.value })} autoFocus />
                </label>
                <label className="kp-check">
                  <input type="checkbox" checked={details.isCentralStore} onChange={(e) => set({ isCentralStore: e.target.checked })} />
                  <span><strong>This is the central store</strong><small>Where purchases arrive before going to the kitchens. Only one place can be the store.</small></span>
                </label>
                <label className="kp-field">
                  <span>Person in charge</span>
                  <input value={details.inChargeName} maxLength={80} placeholder="e.g. Head cook's name" onChange={(e) => set({ inChargeName: e.target.value })} />
                </label>
                <label className="kp-field">
                  <span>Kitchen phone</span>
                  <input type="tel" inputMode="numeric" pattern="[0-9]*" value={details.phone} placeholder="9876543210" onChange={(e) => set({ phone: e.target.value.replace(/\D/g, "").slice(0, 15) })} />
                </label>
                <label className="kp-field">
                  <span>Address</span>
                  <textarea rows={2} value={details.address} maxLength={200} placeholder="Where deliveries go" onChange={(e) => set({ address: e.target.value })} />
                </label>
                <div className="kp-logo">
                  <span className="kp-mark kp-mark--big" aria-hidden="true">{shownLogo ? <img src={shownLogo} alt="" /> : initial(name)}</span>
                  <div className="kp-logo__text">
                    <strong>Logo</strong>
                    <span className="kp-hint">Shown at the top of the kitchen app for everyone who signs in here.</span>
                    <span className="kp-logo__buttons">
                      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pick} aria-label="Kitchen logo" />
                      <button type="button" className="kg-chip" onClick={() => fileRef.current?.click()}><ImagePlus size={14} aria-hidden="true" /> {shownLogo ? "Change logo" : "Add logo"}</button>
                      {shownLogo && <button type="button" className="kp-link kp-link--danger" onClick={() => setLogo(kitchen.logoUrl ? { remove: true } : null)}><X size={13} aria-hidden="true" /> Remove</button>}
                    </span>
                  </div>
                </div>
                <div className="kp-form-actions">
                  <button type="button" className="kg-chip kp-icon kp-chip--cancel" disabled={saving} onClick={cancel} aria-label="Cancel" title="Cancel"><X size={18} aria-hidden="true" /></button>
                  <button type="submit" className="kg-chip kp-icon kp-chip--save" disabled={saving || !name.trim()} aria-label="Save" title="Save"><Check size={18} aria-hidden="true" /></button>
                </div>
              </form>
            ) : (
              <dl className="kp-facts">
                <div><dt>Name</dt><dd>{kitchen.name}</dd></div>
                <div><dt>Type</dt><dd>{kitchen.isCentralStore ? "Central store" : "School kitchen"}</dd></div>
                <div><dt>In charge</dt><dd>{kitchen.inChargeName || <span className="kp-muted">Not given</span>}</dd></div>
                <div><dt>Phone</dt><dd>{kitchen.phone ? <a className="kp-link" href={`tel:${kitchen.phone}`}>{kitchen.phone}</a> : <span className="kp-muted">Not given</span>}</dd></div>
                <div><dt>Address</dt><dd className="kp-wrap">{kitchen.address || <span className="kp-muted">Not given</span>}</dd></div>
                <div>
                  <dt>Logo</dt>
                  <dd>{kitchen.logoUrl ? <span className="kp-mark kp-mark--big" aria-label="Kitchen logo"><img src={kitchen.logoUrl} alt="" /></span> : <span className="kp-muted">No logo yet: the kitchen app shows the school mark.</span>}</dd>
                </div>
              </dl>
            )}
          </section>

          {canManageUsers && <KitchenUsers kitchen={kitchen} kitchens={kitchens} users={users} onChanged={onUsersChanged} confirm={confirm} />}
        </div>
      )}
    </li>
  );
}
