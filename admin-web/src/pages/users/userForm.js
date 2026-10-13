const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateUserForm = ({ name, email, role, godownId, confirmSuperAdmin }) => {
  const errors = {};
  if (!String(name || "").trim()) errors.name = "Enter a name.";
  if (email !== undefined && !EMAIL.test(String(email || "").trim())) errors.email = "Enter a valid email.";
  if (role === "user" && !godownId) errors.godownId = "Choose a kitchen.";
  if (role === "super_admin" && confirmSuperAdmin !== true) errors.confirmSuperAdmin = "Tick to confirm super-admin access.";
  return errors;
};

export const patchFromForm = (original, form) => {
  const body = { expectedUpdatedAt: original.updatedAt };
  if (form.name.trim() !== original.name) body.name = form.name.trim();
  if (form.role !== original.role) body.role = form.role;
  const nextKitchen = form.role === "user" ? form.godownId || null : null;
  if (String(nextKitchen || "") !== String(original.godownId || "")) body.godownId = nextKitchen;
  if (form.active !== original.active) body.active = form.active;
  if (form.confirmSuperAdmin) body.confirmSuperAdmin = true;
  return body;
};
