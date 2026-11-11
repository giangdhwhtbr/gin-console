import { afterEach, describe, expect, it, vi } from "vitest";
import { clearEmail, EMAIL_KEY, getEmail, isEmail, resetIdentity, setEmail } from "./identity";

afterEach(() => {
  localStorage.clear();
  resetIdentity();
  vi.restoreAllMocks();
});

describe("identity", () => {
  it('REQ-UI-097 isEmail accepts a@b and " A@B.c ", refuses "giang", "a@", "@b", "a b@c", "a@b@c"', () => {
    expect(isEmail("a@b")).toBe(true);
    expect(isEmail(" A@B.c ")).toBe(true);
    for (const bad of ["giang", "a@", "@b", "a b@c", "a@b@c"]) expect(isEmail(bad)).toBe(false);
  });

  it("REQ-UI-097 setEmail stores the trimmed lower-cased value under gin-console.email and getEmail returns it", () => {
    setEmail(" Giangdhwhtbr@Gmail.com ");
    expect(localStorage.getItem(EMAIL_KEY)).toBe("giangdhwhtbr@gmail.com");
    expect(getEmail()).toBe("giangdhwhtbr@gmail.com");
  });

  it("REQ-UI-097 a stored email is read after resetIdentity", () => {
    localStorage.setItem(EMAIL_KEY, "giangdhwhtbr@gmail.com");
    resetIdentity();
    expect(getEmail()).toBe("giangdhwhtbr@gmail.com");
  });

  it("REQ-UI-097 a junk stored value reads as null", () => {
    localStorage.setItem(EMAIL_KEY, "giang");
    resetIdentity();
    expect(getEmail()).toBeNull();
  });

  it("REQ-UI-097 a stored value is trimmed and lower-cased on read", () => {
    localStorage.setItem(EMAIL_KEY, " A@B.C ");
    resetIdentity();
    expect(getEmail()).toBe("a@b.c");
  });

  it("REQ-UI-097 storage refused keeps the email for the visit", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(() => setEmail("a@b.c")).not.toThrow();
    expect(getEmail()).toBe("a@b.c");
    vi.restoreAllMocks();
    resetIdentity();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(getEmail()).toBeNull();
  });

  it("REQ-UI-098 clearEmail removes the key and getEmail returns null", () => {
    setEmail("a@b.c");
    clearEmail();
    expect(localStorage.getItem(EMAIL_KEY)).toBeNull();
    expect(getEmail()).toBeNull();
  });
});
