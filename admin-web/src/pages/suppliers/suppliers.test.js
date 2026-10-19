import { describe, expect, it } from "vitest";
import { emptySupplierForm, formFromSupplier, formatLicence, payloadFromSupplierForm, validateSupplierForm } from "./suppliers.js";

const filled = (extra = {}) => ({ ...emptySupplierForm(), name: "Sri Lakshmi Traders", fssaiLicence: "1234 5678 9012 34", ...extra });

describe("supplier form", () => {
  it("needs a name and a 14-digit licence, spaces allowed", () => {
    expect(validateSupplierForm(filled())).toEqual({});
    expect(validateSupplierForm(filled({ name: "  " })).name).toBeTruthy();
    expect(validateSupplierForm(filled({ fssaiLicence: "1234" })).fssaiLicence).toBeTruthy();
    expect(validateSupplierForm(filled({ fssaiLicence: "1234567890123x" })).fssaiLicence).toBeTruthy();
  });

  it("sends the licence as digits and trims the rest", () => {
    expect(payloadFromSupplierForm(filled({ name: " Sri Lakshmi Traders ", phone: " 98765 " }))).toEqual({
      name: "Sri Lakshmi Traders", fssaiLicence: "12345678901234", phone: "98765", active: true
    });
  });

  it("round-trips a supplier from the API and formats the licence for reading", () => {
    expect(formFromSupplier({ name: "X", fssaiLicence: "12345678901234", active: false })).toEqual({ name: "X", fssaiLicence: "12345678901234", phone: "", active: false });
    expect(formatLicence("12345678901234")).toBe("1234 5678 9012 34");
  });
});
