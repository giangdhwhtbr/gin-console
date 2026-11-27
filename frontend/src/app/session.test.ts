import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, getSession, loadSession, resetSession, signIn, signOut } from "./session";

const user = { name: "An", email: "an@example.com", projects: ["a"] };
const reply = (status: number, body?: unknown, headers: Record<string, string> = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers });

beforeEach(() => {
  resetSession();
  window.history.replaceState(null, "", "/");
});
afterEach(() => vi.unstubAllGlobals());

describe("loadSession", () => {
  it("REQ-AUTH-014 maps auth off to off", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(200, { enabled: false, user: null }))));
    await loadSession();
    expect(getSession()).toEqual({ status: "off" });
  });

  it("REQ-AUTH-014 maps enabled without a user to signed-out", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(200, { enabled: true, user: null }))));
    await loadSession();
    expect(getSession()).toEqual({ status: "signed-out", returnTo: null });
  });

  it("REQ-AUTH-002 drops a mockup_grant from the user", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(200, { enabled: true, user: { ...user, mockup_grant: "g1" } }))));
    await loadSession();
    expect(getSession()).toEqual({ status: "signed-in", user });
  });

  it("REQ-AUTH-014 maps enabled with a user to signed-in", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(200, { enabled: true, user }))));
    await loadSession();
    expect(getSession()).toEqual({ status: "signed-in", user });
  });

  it("REQ-AUTH-014 a network error or an unknown answer means off", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("down"))));
    await loadSession();
    expect(getSession()).toEqual({ status: "off" });
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(200, []))));
    await loadSession();
    expect(getSession()).toEqual({ status: "off" });
  });
});

describe("signIn", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(200, { enabled: true, user: null }))));
    return loadSession();
  });

  it("REQ-AUTH-014 posts the credentials and signs in on 200", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(reply(200, user)));
    vi.stubGlobal("fetch", fetchMock);
    expect(await signIn("an", "pw")).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ username: "an", password: "pw" }) }),
    );
    expect(getSession()).toEqual({ status: "signed-in", user });
  });

  it("REQ-AUTH-014 401 is invalid", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(401, { error: "invalid username or password" }))));
    expect(await signIn("an", "bad")).toEqual({ ok: false, reason: "invalid" });
    expect(getSession().status).toBe("signed-out");
  });

  it("REQ-AUTH-014 429 reads Retry-After in minutes, at least one", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(429, {}, { "Retry-After": "600" }))));
    expect(await signIn("an", "x")).toEqual({ ok: false, reason: "locked", minutes: 10 });
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(429, {}, { "Retry-After": "61" }))));
    expect(await signIn("an", "x")).toEqual({ ok: false, reason: "locked", minutes: 2 });
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(429, {}))));
    expect(await signIn("an", "x")).toEqual({ ok: false, reason: "locked", minutes: 1 });
  });

  it("REQ-AUTH-014 a network error or another status is error", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("down"))));
    expect(await signIn("an", "x")).toEqual({ ok: false, reason: "error" });
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(500, {}))));
    expect(await signIn("an", "x")).toEqual({ ok: false, reason: "error" });
  });

  it("REQ-AUTH-015 navigates to returnTo after the next sign-in", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(200, user))));
    await signIn("an", "pw");
    window.history.replaceState(null, "", "/beads?project=a");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(401, {}))));
    await apiFetch("/api/beads?project=a");
    window.history.replaceState(null, "", "/");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(200, user))));
    await signIn("an", "pw");
    expect(window.location.pathname + window.location.search).toBe("/beads?project=a");
  });
});

describe("apiFetch", () => {
  it("REQ-AUTH-015 a 401 while signed in signs out and remembers the page", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(200, { enabled: true, user }))));
    await loadSession();
    window.history.replaceState(null, "", "/beads?project=a");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(401, { error: "sign-in required" }))));
    const response = await apiFetch("/api/beads?project=a");
    expect(response.status).toBe(401);
    expect(getSession()).toEqual({ status: "signed-out", returnTo: "/beads?project=a" });
  });

  it("REQ-AUTH-015 a 401 while auth is off changes nothing", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(200, { enabled: false, user: null }))));
    await loadSession();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(401, {}))));
    expect((await apiFetch("/api/x")).status).toBe(401);
    expect(getSession()).toEqual({ status: "off" });
  });

  it("passes the request through to fetch", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(reply(200, {})));
    vi.stubGlobal("fetch", fetchMock);
    await apiFetch("/api/refresh", { method: "POST" });
    expect(fetchMock).toHaveBeenCalledWith("/api/refresh", { method: "POST" });
  });
});

describe("signOut", () => {
  it("REQ-AUTH-014 posts to logout and returns to the sign-in screen", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(200, { enabled: true, user }))));
    await loadSession();
    const fetchMock = vi.fn(() => Promise.resolve(reply(204)));
    vi.stubGlobal("fetch", fetchMock);
    await signOut();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", expect.objectContaining({ method: "POST" }));
    expect(getSession()).toEqual({ status: "signed-out", returnTo: null });
  });
});
