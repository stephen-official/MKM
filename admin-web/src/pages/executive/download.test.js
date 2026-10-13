import { describe, expect, it } from "vitest";
import { readBlobError } from "./download.js";

describe("readBlobError", () => {
  it("parses JSON error bodies returned as blobs", async () => {
    const data = new Blob([JSON.stringify({ code: "EXPORT_TIMEOUT", message: "Too long" })], { type: "application/json" });
    expect(await readBlobError({ response: { data } })).toEqual({ code: "EXPORT_TIMEOUT", message: "Too long" });
  });
  it("returns null for a malformed JSON body with a JSON content type", async () => {
    const data = new Blob(["{not json"], { type: "application/json" });
    expect(await readBlobError({ response: { data } })).toBe(null);
  });
  it("returns null for non-JSON or missing bodies", async () => {
    expect(await readBlobError({ response: { data: new Blob(["<html>"], { type: "text/html" }) } })).toBe(null);
    expect(await readBlobError({})).toBe(null);
  });
});
