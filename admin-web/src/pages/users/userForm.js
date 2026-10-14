import { isKitchenRole, isSuperAdmin } from "../../roles.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A super-admin is being created, promoted to, or reactivated: the server wants an explicit confirmation. */
export const needsSuperAdminConfirm = (original, form) =>
  isSuperAdmin(form.role) && (!isSuperAdmin(original.role) || (original.active === false && form.active === true));

export const validateUserForm = ({ name, email, role, godownId, confirmSuperAdmin }) => {
  const errors = {};
  if (!String(name || "").trim()) errors.name = "Enter a name.";
  if (email !== undefined && !EMAIL.test(String(email || "").trim())) errors.email = "Enter a valid email.";
  if (isKitchenRole(role) && !godownId) errors.godownId = "Choose a kitchen.";
  if (isSuperAdmin(role) && confirmSuperAdmin !== true) errors.confirmSuperAdmin = "Tick to confirm super-admin access.";
  return errors;
};

export const patchFromForm = (original, form) => {
  const body = { expectedVersion: original.version ?? 0 };
  if (form.name.trim() !== original.name) body.name = form.name.trim();
  if (form.role !== original.role) body.role = form.role;
  const nextKitchen = isKitchenRole(form.role) ? form.godownId || null : null;
  if (String(nextKitchen || "") !== String(original.godownId || "")) body.godownId = nextKitchen;
  if (form.active !== original.active) body.active = form.active;
  if (needsSuperAdminConfirm(original, form) && form.confirmSuperAdmin) body.confirmSuperAdmin = true;
  return body;
};
