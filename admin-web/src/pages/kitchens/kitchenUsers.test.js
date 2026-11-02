import { describe, expect, it } from "vitest";
import { draftProblems, formatPhone, isMobile, phoneDigits, phoneInput, suggestPassword } from "./kitchenUsers.js";

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

describe("WhatsApp box", () => {
  it("keeps digits only, at most 10, and knows a full mobile number", () => {
    expect(phoneInput("+91 98765-43210")).toBe("9876543210");
    expect(phoneInput("098765 43210")).toBe("9876543210");
    expect(phoneInput("98765432101")).toBe("9876543210");
    expect(phoneInput("98765 43210abc")).toBe("9876543210");
    expect(phoneDigits("+919876543210")).toBe("9876543210");
    expect(phoneDigits("")).toBe("");
    expect(isMobile("9876543210")).toBe(true);
    expect(isMobile("987654321")).toBe(false);
    expect(isMobile("5876543210")).toBe(false);
  });
});

describe("draftProblems", () => {
  it("names what a new user still lacks", () => {
    expect(draftProblems({ name: "Ravi", email: "", password: "short", phone: "98765" })).toEqual(["a Login ID", "a password of 8 or more letters", "a 10-digit WhatsApp number"]);
    expect(draftProblems({ name: "Ravi", email: "ravi@x.in", password: "Dal-12345", phone: "9876543210" })).toEqual([]);
  });
});
