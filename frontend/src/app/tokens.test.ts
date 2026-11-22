import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(import.meta.dirname, "../index.css"), "utf8");

/** The `--name: #rrggbb;` declarations of the first block that starts with `selector {`. */
function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2]]));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

const SURFACES = ["background", "card", "muted"] as const;

const EXACT = {
  light: {
    background: "#F4F5F8", card: "#FFFFFF", muted: "#ECEEF3", border: "#DDE0E7", foreground: "#1B1D26",
    "muted-foreground": "#596072", primary: "#6A3DB8", identity: "#6A3DB8", "identity-wash": "#EFE9FA", input: "#7D8695",
    "state-ready": "#0E7A5C", "state-progress": "#2557D6", "state-blocked": "#AE500A", "state-deferred": "#646A78", destructive: "#B42318",
  },
  dark: {
    background: "#12131A", card: "#1B1C25", muted: "#242632", border: "#2E303D", foreground: "#E8E9F0",
    "muted-foreground": "#A0A5B5", primary: "#B89EF6", identity: "#B89EF6", "identity-wash": "#2A2342", input: "#757B8C",
    "state-ready": "#45CF9F", "state-progress": "#93B1FF", "state-blocked": "#F2A54C", "state-deferred": "#9298A6", destructive: "#FF8A7A",
  },
} as const;
const STATUS = ["state-ready", "state-progress", "state-blocked", "state-done", "state-deferred"] as const;
const TYPES = ["type-bug"] as const;

function blend(fg: string, bg: string, alpha: number): string {
  const channel = (i: number) =>
    Math.round(parseInt(fg.slice(i, i + 2), 16) * alpha + parseInt(bg.slice(i, i + 2), 16) * (1 - alpha))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

describe.each([
  [":root", "light"],
  [".dark", "dark"],
])("palette %s", (selector, name) => {
  const t = tokens(selector);
  const get = (key: string) => t[key] ?? "#000000";

  it(`REQ-UI-059 ${name}: every token is defined`, () => {
    for (const key of [
      ...SURFACES,
      "foreground",
      "muted-foreground",
      "input",
      "border",
      "ring",
      "primary",
      "primary-foreground",
      "identity",
      "identity-wash",
      "destructive",
      ...STATUS,
      ...TYPES,
    ]) {
      expect(t[key], key).toBeDefined();
    }
  });

  it(`REQ-UI-059 ${name} values: the Strung palette, exactly`, () => {
    for (const [key, hex] of Object.entries(EXACT[name === "light" ? "light" : "dark"])) {
      expect(t[key]?.toUpperCase(), key).toBe(hex);
    }
  });

  it(`REQ-UI-059 ${name}: Done is jade`, () => {
    expect(t["state-done"]).toBe(t["state-ready"]);
  });

  it(`REQ-UI-059 ${name}: text and status colours reach 4.5:1 on every surface`, () => {
    for (const surface of SURFACES) {
      for (const text of ["foreground", "muted-foreground", "destructive", "identity", ...STATUS, ...TYPES]) {
        expect(ratio(get(text), get(surface)), `${text} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(ratio(get("primary-foreground"), get("primary"))).toBeGreaterThanOrEqual(4.5);
  });

  it(`REQ-UI-067 ${name}: a type colour reads on its own 8% tint over every surface`, () => {
    for (const surface of SURFACES) {
      for (const type of TYPES) {
        const tint = blend(get(type), get(surface), 0.08);
        expect(ratio(get(type), tint), `${type} on its tint over ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it(`REQ-UI-059 ${name}: control outlines and the focus ring reach 3:1`, () => {
    for (const surface of SURFACES) {
      expect(ratio(get("input"), get(surface)), `input on ${surface}`).toBeGreaterThanOrEqual(3);
      expect(ratio(get("ring"), get(surface)), `ring on ${surface}`).toBeGreaterThanOrEqual(3);
    }
  });
});
