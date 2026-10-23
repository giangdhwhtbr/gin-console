import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";
export const THEME_KEY = "gin-console-theme";

const listeners = new Set<() => void>();

function systemTheme(): Theme {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function storedTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null; // storage refused: fall back to the system theme
  }
}

function apply(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  listeners.forEach((listener) => listener());
}

export function initTheme(): void {
  apply(storedTheme() ?? systemTheme());
}

function choose(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // storage refused: the choice lasts for this visit only
  }
  apply(theme);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const current = (): Theme => (document.documentElement.classList.contains("dark") ? "dark" : "light");

export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(subscribe, current);
  return [theme, () => choose(theme === "dark" ? "light" : "dark")];
}
