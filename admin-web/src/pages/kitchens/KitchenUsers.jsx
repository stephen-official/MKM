import { useId, useState } from "react";
import { Check, ChevronDown, Copy, Edit3, Eye, EyeOff, KeyRound, Power, Sparkles, UserPlus, UserRound, X } from "lucide-react";
import { api } from "../../api.js";
import { useToast } from "../../useToast.js";
import { formatPhone, suggestPassword } from "./kitchenUsers.js";

const errorOf = (error, fallback) => error?.response?.data?.message || fallback;
const MIN = 8; // backend authRoutes MIN_PASSWORD_LENGTH

/** A password box with a "Suggest" button. */
function PasswordInput({ id, value, onChange, autoFocus = false }) {
  return (
    <span className="kp-password-input">
      <input id={id} type="text" autoComplete="off" spellCheck={false} placeholder="8 or more letters" value={value} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} />
      <button type="button" className="kg-chip" onClick={() => onChange(suggestPassword())} title="Suggest an easy password"><Sparkles size={14} aria-hidden="true" /> Suggest</button>
    </span>
  );
}

/** A labelled input row. */
function Field({ label, id, children }) {
  return <label className="kp-field" htmlFor={id}><span>{label}</span>{children}</label>;
}

/** One user of this kitchen: name, Login ID, password (shown on request), WhatsApp number, and what a super-admin can change. */
function UserRow({ user, onChanged, confirm }) {
  const { showToast } = useToast();
  const uid = useId();
  const [mode, setMode] = useState(""); // "", "edit", "password"
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone || "" });
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(null); // the password while shown
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

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
  const saveDetails = async (event) => {
    event.preventDefault();
    if (await run(() => api.patch(`/users/${user._id}`, { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), expectedVersion: user.version }), "Saved")) { setMode(""); onChanged(); }
  };
  const savePassword = async (event) => {
    event.preventDefault();
    if (password.length < MIN) return showToast(`The password needs at least ${MIN} characters.`, "error");
    if (await run(() => api.post(`/users/${user._id}/password`, { password }), "Password set. Their phone is signed out.")) { setShown(password); setPassword(""); setMode(""); onChanged(); }
  };
  const toggleActive = async () => {
    if (user.active && !(await confirm({ title: `Disable ${user.name}?`, message: "They are signed out and cannot sign in until you enable them again. Their records stay.", confirmLabel: "Disable", variant: "danger" }))) return;
    if (await run(() => api.patch(`/users/${user._id}`, { active: !user.active, expectedVersion: user.version }), user.active ? "Disabled" : "Enabled")) onChanged();
  };

  return (
    <li className={`kg-row kp-user${user.active ? "" : " kp-user--off"}`}>
      <div className="kp-user__head">
        <span className="kp-user__icon" aria-hidden="true"><UserRound size={18} /></span>
        <strong>{user.name}</strong>
        <span className={`kg-pill ${user.active ? "kg-pill--ok" : "kg-pill--routine"}`}>{user.active ? "Active" : "Disabled"}</span>
      </div>

      {mode === "edit" ? (
        <form className="kp-user__form" onSubmit={saveDetails}>
          <Field label="Name" id={`${uid}-name`}><input id={`${uid}-name`} value={form.name} maxLength={100} onChange={(e) => set({ name: e.target.value })} autoFocus /></Field>
          <Field label="Login ID" id={`${uid}-email`}><input id={`${uid}-email`} type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} /></Field>
          <Field label="WhatsApp" id={`${uid}-phone`}><input id={`${uid}-phone`} type="tel" inputMode="tel" placeholder="98765 43210" value={form.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
          <div className="kp-form-actions">
            <button type="button" className="kg-chip" disabled={busy} onClick={() => { setMode(""); setForm({ name: user.name, email: user.email, phone: user.phone || "" }); }}>Cancel</button>
            <button type="submit" className="kg-btn" disabled={busy || !form.name.trim() || !form.email.trim() || !form.phone.trim()}><Check size={15} aria-hidden="true" /> Save</button>
          </div>
        </form>
      ) : mode === "password" ? (
        <form className="kp-user__form" onSubmit={savePassword}>
          <Field label="New password" id={`${uid}-pw`}><PasswordInput id={`${uid}-pw`} value={password} onChange={setPassword} autoFocus /></Field>
          <div className="kp-form-actions">
            <button type="button" className="kg-chip" disabled={busy} onClick={() => { setMode(""); setPassword(""); }}>Cancel</button>
            <button type="submit" className="kg-btn" disabled={busy || password.length < MIN}><Check size={15} aria-hidden="true" /> Set password</button>
          </div>
        </form>
      ) : (
        <dl className="kp-facts kp-facts--user">
          <div><dt>Login ID</dt><dd className="kp-wrap">{user.email}</dd></div>
          <div>
            <dt>Password</dt>
            <dd className="kp-user__password">
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
                <span className="kp-muted">Chosen by them, so it can't be shown. Set a new one to see it.</span>
              )}
            </dd>
          </div>
          <div><dt>WhatsApp</dt><dd>{user.phone ? formatPhone(user.phone) : <span className="kp-muted">No number yet. Tap Edit to add it.</span>}</dd></div>
        </dl>
      )}

      {mode === "" && (
        <div className="kp-user__actions">
          <button type="button" className="kg-chip" disabled={busy} onClick={() => setMode("edit")}><Edit3 size={14} aria-hidden="true" /> Edit</button>
          <button type="button" className="kg-chip" disabled={busy} onClick={() => setMode("password")}><KeyRound size={14} aria-hidden="true" /> Set password</button>
          <button type="button" className={`kg-chip${user.active ? " kp-chip--danger" : ""}`} disabled={busy} onClick={toggleActive}><Power size={14} aria-hidden="true" /> {user.active ? "Disable" : "Enable"}</button>
        </div>
      )}
    </li>
  );
}

/** The users of one kitchen (super-admins only), and "Add user" which folds out the form for one more. */
export function KitchenUsers({ kitchen, users, onChanged, confirm }) {
  const { showToast } = useToast();
  const uid = useId();
  const empty = { name: "", email: "", password: "", phone: "" };
  const [form, setForm] = useState(empty);
  const [adding, setAdding] = useState(false); // the Add user form is open
  const [saving, setSaving] = useState(false);
  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const ready = form.name.trim() && form.email.trim() && form.password.length >= MIN && form.phone.trim();

  const add = async (event) => {
    event.preventDefault();
    if (!ready || saving) return;
    setSaving(true);
    try {
      await api.post("/users", { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), role: "user", godownId: kitchen._id, password: form.password });
      showToast(`${form.name.trim()} can now sign in to ${kitchen.name}`, "success");
      setForm(empty);
      setAdding(false);
      onChanged();
    } catch (error) {
      showToast(errorOf(error, "Could not add this user."), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="kp-section" aria-label={`Users of ${kitchen.name}`}>
      <div className="kp-section__head">
        <h3>Users</h3>
      </div>
      <p className="kp-hint">Everyone here can record usage and ask for supplies for this kitchen, even on a shared phone. They sign in with their Login ID and password.</p>
      {users.length === 0
        ? <p className="kp-muted">No users yet.</p>
        : <ul className="kp-users">{users.map((u) => <UserRow key={u._id} user={u} onChanged={onChanged} confirm={confirm} />)}</ul>}

      <div className={`kp-adduser${adding ? " kp-adduser--open" : ""}`}>
        <button type="button" className="kp-adduser__toggle" aria-expanded={adding} aria-controls={`${uid}-add`} onClick={() => setAdding((v) => !v)}>
          <UserPlus size={16} aria-hidden="true" /> Add user
          <ChevronDown size={18} className="kp-card__chevron" aria-hidden="true" />
        </button>
        {adding && (
          <form id={`${uid}-add`} className="kp-user__form" onSubmit={add}>
            <Field label="Name" id={`${uid}-n`}><input id={`${uid}-n`} placeholder="Full name" maxLength={100} value={form.name} onChange={(e) => set({ name: e.target.value })} autoFocus /></Field>
            <Field label="Login ID" id={`${uid}-e`}><input id={`${uid}-e`} type="email" placeholder="Their email address" value={form.email} onChange={(e) => set({ email: e.target.value })} /></Field>
            <Field label="Password" id={`${uid}-p`}><PasswordInput id={`${uid}-p`} value={form.password} onChange={(password) => set({ password })} /></Field>
            <Field label="WhatsApp" id={`${uid}-w`}><input id={`${uid}-w`} type="tel" inputMode="tel" placeholder="98765 43210" value={form.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
            <p className="kp-hint">All four are needed. Their phone signs in with the Login ID and password.</p>
            <div className="kp-form-actions">
              <button type="button" className="kg-chip" disabled={saving} onClick={() => { setAdding(false); setForm(empty); }}><X size={14} aria-hidden="true" /> Cancel</button>
              <button type="submit" className="kg-btn" disabled={saving || !ready}><UserPlus size={15} aria-hidden="true" /> {saving ? "Adding…" : "Add user"}</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
