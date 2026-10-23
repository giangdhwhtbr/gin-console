import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_KEY } from "./theme";

const html = readFileSync(resolve(import.meta.dirname, "../../index.html"), "utf8");

describe("index.html", () => {
  it("REQ-UI-063 sets the document title", () => {
    expect(html).toContain("<title>gin-console</title>");
  });
});

const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? "";
const run = () => {
  window.eval(script); // the repo lints with no-implied-eval, which rejects `new Function`
};
const dark = () => document.documentElement.classList.contains("dark");

describe("index.html theme script", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("REQ-UI-058 uses the same key as the app", () => {
    expect(script).toContain(THEME_KEY);
  });

  it("REQ-UI-058 sets dark before the first paint from the stored choice or the system", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    run();
    expect(dark()).toBe(true);
    document.documentElement.classList.remove("dark");
    window.localStorage.setItem(THEME_KEY, "light");
    run();
    expect(dark()).toBe(false);
  });

  it("REQ-UI-058 ignores a stored value that is neither light nor dark", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    window.localStorage.setItem(THEME_KEY, "blue");
    run();
    expect(dark()).toBe(true);
  });

  it("REQ-UI-058 leaves no globals behind", () => {
    run();
    expect("stored" in window).toBe(false);
  });

  it("REQ-UI-058 does not throw when storage refuses", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(run).not.toThrow();
  });
});
