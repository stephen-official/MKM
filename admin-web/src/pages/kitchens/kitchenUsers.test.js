import { describe, expect, it } from "vitest";
import { suggestPassword } from "./kitchenUsers.js";

describe("suggestPassword", () => {
  it("gives a kitchen word, a dash and four digits, always 8 characters or more", () => {
    expect(suggestPassword(() => 0)).toBe("Rice-0000");
    expect(suggestPassword(() => 0.99)).toMatch(/^Pepper-\d{4}$/);
    for (let i = 0; i < 200; i += 1) expect(suggestPassword().length).toBeGreaterThanOrEqual(8);
  });
});
