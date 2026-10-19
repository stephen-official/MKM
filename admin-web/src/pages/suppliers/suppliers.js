// Pure helpers behind the Suppliers tab. The server repeats every check (routes/supplierRoutes.js).

export const emptySupplierForm = () => ({ name: "", fssaiLicence: "", phone: "", active: true });

export const formFromSupplier = (supplier) => ({
  name: supplier.name || "", fssaiLicence: supplier.fssaiLicence || "", phone: supplier.phone || "", active: supplier.active !== false
});

/** The licence as digits only, so "1234 5678 9012 34" and "12345678901234" are the same. */
export const normalizeLicence = (text) => String(text || "").replace(/\s+/g, "");

export const validateSupplierForm = (form) => {
  const errors = {};
  if (!form.name.trim()) errors.name = "Enter the supplier's name.";
  else if (form.name.trim().length > 120) errors.name = "Keep the name under 120 characters.";
  if (!/^\d{14}$/.test(normalizeLicence(form.fssaiLicence))) errors.fssaiLicence = "The FSSAI licence number is 14 digits.";
  return errors;
};

export const payloadFromSupplierForm = (form) => ({
  name: form.name.trim(), fssaiLicence: normalizeLicence(form.fssaiLicence), phone: form.phone.trim(), active: form.active
});

/** "1234 5678 9012 34" for reading a licence off the screen. */
export const formatLicence = (licence) => normalizeLicence(licence).replace(/(\d{4})(?=\d)/g, "$1 ");
