import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ post: vi.fn(), apiPost: vi.fn() }));

vi.mock("axios", () => {
  const api = { defaults: { headers: { common: {} } }, interceptors: { response: { use: vi.fn() } }, post: mocks.apiPost };
  return { default: { create: () => api, post: mocks.post } };
});

const token = (exp) => `h.${btoa(JSON.stringify({ exp })).replace(/=+$/, "")}.s`;

const makeStorage = (initial) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    data
  };
};

const load = async (initial) => {
  const storage = makeStorage(initial);
  vi.stubGlobal("localStorage", storage);
  vi.resetModules();
  const mod = await import("./api.js");
  return { ...mod, storage };
};

describe("logout", () => {
  beforeEach(() => {
    mocks.post.mockReset();
    mocks.apiPost.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  const future = Math.floor(Date.now() / 1000) + 3600;
  const past = Math.floor(Date.now() / 1000) - 3600;

  it("calls /auth/logout without refreshing when the access token is still valid", async () => {
    const { logout, storage } = await load({ accessToken: token(future), refreshToken: "r1", userRole: "admin" });
    mocks.apiPost.mockResolvedValue({});
    await logout();
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.apiPost).toHaveBeenCalledWith("/auth/logout", null, { timeout: 15_000 });
    expect(storage.data.size).toBe(0);
  });

  it("refreshes once before /auth/logout when the access token is expired", async () => {
    const { logout, storage } = await load({ accessToken: token(past), refreshToken: "r1", userRole: "admin" });
    mocks.post.mockResolvedValue({ data: { accessToken: token(future), refreshToken: "r2" } });
    mocks.apiPost.mockResolvedValue({});
    await logout();
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.post.mock.calls[0][1]).toEqual({ refreshToken: "r1" });
    expect(mocks.post.mock.calls[0][2]).toEqual({ timeout: 15_000 });
    expect(mocks.post.mock.invocationCallOrder[0]).toBeLessThan(mocks.apiPost.mock.invocationCallOrder[0]);
    expect(mocks.apiPost).toHaveBeenCalledWith("/auth/logout", null, { timeout: 15_000 });
    expect(storage.data.size).toBe(0);
  });

  it("never throws and still clears the session when refresh and logout both fail", async () => {
    const { logout, storage } = await load({ accessToken: token(past), refreshToken: "r1", userRole: "admin" });
    mocks.post.mockRejectedValue(new Error("refresh denied"));
    mocks.apiPost.mockRejectedValue(new Error("401"));
    await expect(logout()).resolves.toBeUndefined();
    expect(storage.data.size).toBe(0);
  });

  it("does not call the API when there is no stored access token", async () => {
    const { logout } = await load({});
    await logout();
    expect(mocks.apiPost).not.toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
