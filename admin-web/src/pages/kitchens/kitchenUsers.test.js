import { describe, expect, it } from "vitest";
import { formatPhone, suggestPassword } from "./kitchenUsers.js";

describe("suggestPassword", () => {
  it("gives a kitchen word, a dash and four digits, always 8 characters or more", () => {
    expect(suggestPassword(() => 0)).toBe("Rice-0000");
    expect(suggestPassword(() => 0.99)).toMatch(/^Pepper-\d{4}$/);
    for (let i = 0; i < 200; i += 1) expect(suggestPassword().length).toBeGreaterThanOrEqual(8);
  });
});

describe("formatPhone", () => {
  it("spaces an Indian mobile number and leaves others as stored", () => {
    expect(formatPhone("+919876543210")).toBe("+91 98765 43210");
    expect(formatPhone("+447700900123")).toBe("+447700900123");
    expect(formatPhone("")).toBe("");
  });
});
