import { useState } from "react";
import { Button, Field, Modal, Select } from "../../components/ui/index.jsx";
import { isKitchenRole } from "../../roles.js";
import { needsSuperAdminConfirm, validateUserForm } from "./userForm.js";

const ROLE_LABEL = { user: "Kitchen user", admin: "Admin", super_admin: "Super-admin" };

export function UserForm({ title, initial, kitchens, isNew, isSelf = false, busy, onCancel, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const submit = (event) => {
    event.preventDefault();
    const found = validateUserForm({ ...form, email: isNew ? form.email : undefined, confirmSuperAdmin: needsSuperAdminConfirm(initial, form) ? form.confirmSuperAdmin : true });
    setErrors(found);
    if (!Object.keys(found).length) onSubmit(form);
  };
  const error = (key) => errors[key] && <span className="field__error" role="alert">{errors[key]}</span>;
  return (
    <Modal title={title} onClose={onCancel} actions={(
      <>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button type="submit" form="user-form" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
      </>
    )}>
      <form id="user-form" onSubmit={submit} className="form-grid form-grid--stack" noValidate>
        <Field label="Name"><input value={form.name} onChange={(e) => set({ name: e.target.value })} />{error("name")}</Field>
        {isNew && <Field label="Email"><input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />{error("email")}</Field>}
        <Field label="Role">
          <Select value={form.role} disabled={isSelf} onChange={(e) => set({ role: e.target.value })}>
            {Object.entries(ROLE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </Field>
        {isSelf && <p className="exec-section__note">This is your own account, so you cannot change your role or deactivate it.</p>}
        {isKitchenRole(form.role) && (
          <Field label="Kitchen">
            <Select value={form.godownId || ""} onChange={(e) => set({ godownId: e.target.value })}>
              <option value="">Choose…</option>
              {kitchens.filter((k) => k.active !== false || String(k._id) === String(form.godownId)).map((k) => <option key={k._id} value={k._id}>{k.name}</option>)}
            </Select>
            {error("godownId")}
          </Field>
        )}
        {needsSuperAdminConfirm(initial, form) && (
          <label className="checkbox">
            <input type="checkbox" checked={!!form.confirmSuperAdmin} onChange={(e) => set({ confirmSuperAdmin: e.target.checked })} />
            <span>This person should have full access, including user management and feature settings.{error("confirmSuperAdmin")}</span>
          </label>
        )}
        {!isNew && (
          <label className="checkbox">
            <input type="checkbox" checked={form.active} disabled={isSelf} onChange={(e) => set({ active: e.target.checked })} />
            <span>Account active</span>
          </label>
        )}
        {isNew && <p className="exec-section__note">They will receive an email to set their password (valid 24 hours).</p>}
      </form>
    </Modal>
  );
}
