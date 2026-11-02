import { useState } from "react";
import { Check, Copy, Edit3, Eye, EyeOff, KeyRound, Plus, Power, Sparkles, X } from "lucide-react";
import { api } from "../../api.js";
import { useToast } from "../../useToast.js";
import { suggestPassword } from "./kitchenUsers.js";

const errorOf = (error, fallback) => error?.response?.data?.message || fallback;
const MIN = 8; // backend authRoutes MIN_PASSWORD_LENGTH

/** A password box with a "Suggest one" button. */
function PasswordInput({ value, onChange, label = "Password", autoFocus = false }) {
  return (
    <span className="kp-password-input">
      <input type="text" autoComplete="off" spellCheck={false} placeholder={`${label} (8+ letters)`} aria-label={label} value={value} autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)} />
      <button type="button" className="kg-chip" onClick={() => onChange(suggestPassword())} title="Suggest an easy password"><Sparkles size={14} aria-hidden="true" /> Suggest</button>
    </span>
  );
}

/** One person who signs in to this kitchen: name, email, password (shown on request), and what a super-admin can change. */
function UserRow({ user, onChanged, confirm }) {
  const { showToast } = useToast();
  const [mode, setMode] = useState(""); // "", "edit", "password"
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(null); // the password text while shown
  const [busy, setBusy] = useState(false);

  const run = async (work, done) => {
    setBusy(true);
    try { await work(); if (done) showToast(done, "success"); return true; }
    catch (error) { showToast(errorOf(error, "That did not work. Try again."), "error"); return false; }
    finally { setBusy(false); }
  };

  const show = () => run(async () => { const { data } = await api.get(`/users/${user._id}/password`); setShown(data.password); });
  const copy = async () => {
    try { await navigator.clipboard.writeText(shown); showToast("Password copied", "success"); }
    catch { showToast("Could not copy. Select it and copy by hand.", "error"); }
  };
  const saveDetails = async () => {
    const ok = await run(() => api.patch(`/users/${user._id}`, { name: name.trim(), email: email.trim(), expectedVersion: user.version }), "Saved");
    if (ok) { setMode(""); onChanged(); }
  };
  const savePassword = async () => {
    if (password.length < MIN) return showToast(`The password needs at least ${MIN} characters.`, "error");
    const ok = await run(() => api.post(`/users/${user._id}/password`, { password }), "Password set. Their phone is signed out.");
    if (ok) { setShown(password); setPassword(""); setMode(""); onChanged(); }
  };
  const toggleActive = async () => {
    if (user.active && !(await confirm({ title: `Turn off ${user.name}?`, message: "They are signed out and cannot sign in until you turn them on again. Their records stay.", confirmLabel: "Turn off", variant: "danger" }))) return;
    if (await run(() => api.patch(`/users/${user._id}`, { active: !user.active, expectedVersion: user.version }), user.active ? "Turned off" : "Turned on")) onChanged();
  };

  return (
    <li className={`kg-row kp-user${user.active ? "" : " kp-user--off"}`}>
      {mode === "edit" ? (
        <div className="kp-user__edit">
          <input aria-label="Name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} autoFocus />
          <input aria-label="Email (sign-in name)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <span className="kp-user__buttons">
            <button type="button" className="kg-btn" disabled={busy || !name.trim() || !email.trim()} onClick={saveDetails}><Check size={15} aria-hidden="true" /> Save</button>
            <button type="button" className="kg-chip kp-icon" aria-label="Cancel" title="Cancel" onClick={() => { setMode(""); setName(user.name); setEmail(user.email); }}><X size={16} aria-hidden="true" /></button>
          </span>
        </div>
      ) : (
        <div className="kp-user__who">
          <strong>{user.name}</strong>
          <span className="kp-user__email">{user.email}</span>
          <span className={`kg-pill ${user.active ? "kg-pill--ok" : "kg-pill--routine"}`}>{user.active ? "Active" : "Off"}</span>
        </div>
      )}

      {mode === "password" ? (
        <div className="kp-user__edit">
          <PasswordInput value={password} onChange={setPassword} label="New password" autoFocus />
          <span className="kp-user__buttons">
            <button type="button" className="kg-btn" disabled={busy || password.length < MIN} onClick={savePassword}><Check size={15} aria-hidden="true" /> Set</button>
            <button type="button" className="kg-chip kp-icon" aria-label="Cancel" title="Cancel" onClick={() => { setMode(""); setPassword(""); }}><X size={16} aria-hidden="true" /></button>
          </span>
        </div>
      ) : (
        <div className="kp-user__password">
          <KeyRound size={15} aria-hidden="true" />
          {shown !== null ? (
            <>
              <code className="kp-user__secret">{shown}</code>
              <button type="button" className="kp-link" onClick={copy}><Copy size={13} aria-hidden="true" /> Copy</button>
              <button type="button" className="kp-link" onClick={() => setShown(null)}><EyeOff size={13} aria-hidden="true" /> Hide</button>
            </>
          ) : user.passwordViewable ? (
            <>
              <span className="kp-user__dots" aria-label="Password hidden">••••••••</span>
              <button type="button" className="kp-link" disabled={busy} onClick={show}><Eye size={13} aria-hidden="true" /> Show</button>
            </>
          ) : (
            <span className="kp-user__note">Chosen by them, so it can't be shown. Set a new one to see it.</span>
          )}
        </div>
      )}

      {mode === "" && (
        <div className="kp-user__actions">
          <button type="button" className="kg-chip" disabled={busy} onClick={() => setMode("edit")}><Edit3 size={14} aria-hidden="true" /> Edit</button>
          <button type="button" className="kg-chip" disabled={busy} onClick={() => setMode("password")}><KeyRound size={14} aria-hidden="true" /> Set password</button>
          <button type="button" className="kg-chip" disabled={busy} onClick={toggleActive}><Power size={14} aria-hidden="true" /> {user.active ? "Turn off" : "Turn on"}</button>
        </div>
      )}
    </li>
  );
}

/** Everyone who signs in to one kitchen (super-admins only), and a form to add one more. */
export function KitchenUsers({ kitchen, users, onChanged, confirm }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [adding, setAdding] = useState(false);
  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const add = async (event) => {
    event.preventDefault();
    if (form.password.length < MIN) return showToast(`The password needs at least ${MIN} characters.`, "error");
    setAdding(true);
    try {
      await api.post("/users", { name: form.name.trim(), email: form.email.trim(), role: "user", godownId: kitchen._id, password: form.password });
      showToast(`${form.name.trim()} can now sign in to ${kitchen.name}`, "success");
      setForm({ name: "", email: "", password: "" });
      onChanged();
    } catch (error) {
      showToast(errorOf(error, "Could not add this person."), "error");
    } finally {
      setAdding(false);
    }
  };

  return (
    <section className="kp-section" aria-label={`People who sign in to ${kitchen.name}`}>
      <h3>People who sign in here</h3>
      <p className="kp-hint">Everyone here can record usage and ask for supplies for this kitchen, even on a shared phone. Their email is their sign-in name.</p>
      {users.length === 0
        ? <p className="kp-empty">No one signs in to this kitchen yet.</p>
        : <ul className="kp-users">{users.map((u) => <UserRow key={u._id} user={u} onChanged={onChanged} confirm={confirm} />)}</ul>}
      <form className="kp-add" onSubmit={add}>
        <strong className="kp-add__title"><Plus size={14} aria-hidden="true" /> Add a person</strong>
        <input aria-label="Name" placeholder="Name" maxLength={100} value={form.name} onChange={(e) => set({ name: e.target.value })} />
        <input aria-label="Email (sign-in name)" type="email" placeholder="Email (sign-in name)" value={form.email} onChange={(e) => set({ email: e.target.value })} />
        <PasswordInput value={form.password} onChange={(password) => set({ password })} />
        <button type="submit" className="kg-btn" disabled={adding || !form.name.trim() || !form.email.trim() || form.password.length < MIN}>
          <Plus size={15} aria-hidden="true" /> {adding ? "Adding…" : "Add person"}
        </button>
      </form>
    </section>
  );
}
