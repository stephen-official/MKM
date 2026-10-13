import { describe, expect, it } from "vitest";
import { linePath, niceMax, niceMin } from "./chartScale.js";

describe("chart scale", () => {
  it("rounds the axis maximum up to a readable number", () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(87)).toBe(100);
    expect(niceMax(1234)).toBe(1500);
    expect(niceMax(227.25)).toBe(250);
  });
  it("only goes below zero when data does", () => {
    expect(niceMin(5)).toBe(0);
    expect(niceMin(-10)).toBe(-10);
    expect(niceMin(-11)).toBe(-15);
  });
  it("draws a path across the full width", () => {
    const d = linePath([{ value: 0 }, { value: 10 }], { width: 100, height: 50, max: 10, min: 0 });
    expect(d).toBe("M0,50 L100,0");
    expect(linePath([{ value: 5 }], { width: 100, height: 50, max: 10, min: 0 })).toBe("M50,25");
  });
});
