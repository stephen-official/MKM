import { useId, useRef, useState } from "react";
import { Check, ChevronDown, ImagePlus, Trash2, Users, X } from "lucide-react";
import { api } from "../../api.js";
import { useToast } from "../../useToast.js";
import { KitchenUsers } from "./KitchenUsers.jsx";

const errorOf = (error, fallback) => error?.response?.data?.message || fallback;

/** One kitchen as a fold-out glass card: its logo and name, then (opened) its details and the people who sign in there. */
export function KitchenCard({ kitchen, users, canManageUsers, open, onToggle, onChanged, onUsersChanged, confirm }) {
  const { showToast } = useToast();
  const bodyId = useId();
  const fileRef = useRef(null);
  const [name, setName] = useState(kitchen.name);
  const [busy, setBusy] = useState("");
  const active = users.filter((u) => u.active).length;

  const run = async (what, work, done) => {
    setBusy(what);
    try { await work(); if (done) showToast(done, "success"); onChanged(); }
    catch (error) { showToast(errorOf(error, "That did not work. Try again."), "error"); }
    finally { setBusy(""); }
  };

  const uploadLogo = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const body = new FormData();
    body.append("logo", file);
    run("logo", () => api.post(`/inventory/godowns/${kitchen._id}/logo`, body), "Logo saved. The kitchen app shows it next time it opens.");
  };
  const removeLogo = async () => {
    if (await confirm({ title: "Remove the logo?", message: `${kitchen.name} goes back to the plain school mark.`, confirmLabel: "Remove", variant: "danger" })) {
      run("logo", () => api.delete(`/inventory/godowns/${kitchen._id}/logo`), "Logo removed");
    }
  };
  const rename = () => run("name", () => api.put(`/inventory/godowns/${kitchen._id}`, { name: name.trim() }), "Renamed");
  const remove = async () => {
    if (await confirm({ title: `Delete “${kitchen.name}”?`, message: "Only a kitchen with no users, stock, usage, orders or requests can be deleted. This cannot be undone.", confirmLabel: "Delete", variant: "danger" })) {
      run("delete", () => api.delete(`/inventory/godowns/${kitchen._id}`), "Deleted");
    }
  };

  return (
    <li className={`kg-glass kp-card${open ? " kp-card--open" : ""}`}>
      <button type="button" className="kp-card__head" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
        <span className="kp-mark" aria-hidden="true">{kitchen.logoUrl ? <img src={kitchen.logoUrl} alt="" /> : kitchen.name.trim().charAt(0).toUpperCase()}</span>
        <span className="kp-card__title">
          <strong>{kitchen.name}</strong>
          {canManageUsers && <small><Users size={12} aria-hidden="true" /> {users.length === 0 ? "No one signs in yet" : `${users.length} ${users.length === 1 ? "person signs" : "people sign"} in${active < users.length ? ` · ${users.length - active} off` : ""}`}</small>}
        </span>
        <ChevronDown size={20} className="kp-card__chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="kp-card__body" id={bodyId}>
          <section className="kp-section" aria-label={`${kitchen.name} details`}>
            <h3>Kitchen</h3>
            <div className="kp-logo">
              <span className="kp-mark kp-mark--big" aria-hidden="true">{kitchen.logoUrl ? <img src={kitchen.logoUrl} alt="" /> : kitchen.name.trim().charAt(0).toUpperCase()}</span>
              <div className="kp-logo__text">
                <strong>Logo</strong>
                <span className="kp-hint">Shown at the top of the kitchen app for everyone who signs in here.</span>
                <span className="kp-logo__buttons">
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={uploadLogo} aria-label="Kitchen logo" />
                  <button type="button" className="kg-chip" disabled={busy === "logo"} onClick={() => fileRef.current?.click()}><ImagePlus size={14} aria-hidden="true" /> {busy === "logo" ? "Saving…" : kitchen.logoUrl ? "Change logo" : "Add logo"}</button>
                  {kitchen.logoUrl && <button type="button" className="kp-link kp-link--danger" disabled={busy === "logo"} onClick={removeLogo}><X size={13} aria-hidden="true" /> Remove</button>}
                </span>
              </div>
            </div>
            <div className="kp-rename">
              <label htmlFor={`${bodyId}-name`}>Name</label>
              <input id={`${bodyId}-name`} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
              {name.trim() !== kitchen.name && (
                <>
                  <button type="button" className="kg-btn" disabled={busy === "name" || !name.trim()} onClick={rename}><Check size={15} aria-hidden="true" /> Save</button>
                  <button type="button" className="kg-chip kp-icon" aria-label="Undo the change" title="Undo" onClick={() => setName(kitchen.name)}><X size={16} aria-hidden="true" /></button>
                </>
              )}
            </div>
          </section>

          {canManageUsers && <KitchenUsers kitchen={kitchen} users={users} onChanged={onUsersChanged} confirm={confirm} />}

          <div className="kp-danger">
            <button type="button" className="kp-link kp-link--danger" disabled={busy === "delete"} onClick={remove}><Trash2 size={13} aria-hidden="true" /> Delete this kitchen</button>
          </div>
        </div>
      )}
    </li>
  );
}
