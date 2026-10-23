import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initTheme, THEME_KEY } from "./theme";
import { ThemeToggle } from "./ThemeToggle";

const prefersDark = (dark: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: dark && query.includes("dark"), media: query }));
const isDark = () => document.documentElement.classList.contains("dark");

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("theme", () => {
  it("REQ-UI-058 follows the system when nothing is stored", () => {
    prefersDark(true);
    initTheme();
    expect(isDark()).toBe(true);
  });

  it("REQ-UI-058 is light when matchMedia is missing", () => {
    vi.stubGlobal("matchMedia", undefined);
    initTheme();
    expect(isDark()).toBe(false);
  });

  it("REQ-UI-058 the stored choice beats the system", () => {
    prefersDark(true);
    window.localStorage.setItem(THEME_KEY, "light");
    initTheme();
    expect(isDark()).toBe(false);
  });

  it("REQ-UI-058 ignores a stored value that is neither light nor dark", () => {
    prefersDark(true);
    window.localStorage.setItem(THEME_KEY, "blue");
    initTheme();
    expect(isDark()).toBe(true);
  });

  it("REQ-UI-058 switches, remembers and restores", async () => {
    prefersDark(false);
    initTheme();
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    expect(isDark()).toBe(true);
    expect(window.localStorage.getItem(THEME_KEY)).toBe("dark");
    cleanup();
    document.documentElement.classList.remove("dark");
    initTheme();
    expect(isDark()).toBe(true);
  });

  it("REQ-UI-058 switches without an error when storage refuses", async () => {
    prefersDark(false);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    initTheme();
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    expect(isDark()).toBe(true);
  });

  it("REQ-UI-058 every toggle on the page stays in step", async () => {
    prefersDark(false);
    initTheme();
    render(
      <>
        <ThemeToggle />
        <ThemeToggle />
      </>,
    );
    await userEvent.click(screen.getAllByRole("button", { name: "Switch to dark theme" })[0]);
    expect(screen.getAllByRole("button", { name: "Switch to light theme" })).toHaveLength(2);
  });
});
