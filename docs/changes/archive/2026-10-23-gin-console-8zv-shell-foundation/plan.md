# Plan: Visual foundation and responsive app shell

Epic: gin-console-8zv
Spec: `docs/changes/gin-console-8zv-shell-foundation/` (`proposal.md`, `spec-delta.md`, `design.md`, `tests.md`)

## Objective
A neutral cool palette with shared status colours, Geist and Geist Mono, a light/dark theme that follows the system and can be toggled, and one `Main` navigation that is a bottom tab bar under 768px, an icon rail from 768px and a sidebar from 1024px; no page scrolls sideways at 360px.

**Goal:** REQ-UI-055 to 063 and the modified REQ-UI-008, 015, 022 pass their scenarios.
**Architecture:** tokens in `index.css`; a small external-store theme module (`theme.ts`) shared by every toggle; one `<nav>` restyled by Tailwind breakpoints in `Layout.tsx`; an inline script in `index.html` that sets the theme before paint.
**Tech Stack:** React 19, TypeScript 6, Tailwind 4, lucide-react, vitest + Testing Library (installed); new dependency `@fontsource-variable/geist-mono`.

**Global Constraints (verbatim from the spec):**
- Frontend only. No backend change.
- Non-goals: per-page reflow of Board, tables, Tree, Projects, Sessions and Quota (they only get the no-sideways-scroll guarantee), the Beads filters (assignee, sprint, labels), the dependency graph per bead, a brand colour, a logo file.
- Storage that throws (private window, blocked data) is ignored: the toggle still works for the session and the system theme applies next time. `matchMedia` missing means light.
- The one new dependency is `@fontsource-variable/geist-mono`.

**Spec amendment included in this plan (needs the user's approval with the plan):** REQ-UI-059 as first confirmed asked for 3:1 on "borders", which a soft card border cannot meet. The amended text holds control outlines (inputs, selects) to 3:1 and treats separators and card borders as decoration; `design.md` gains an `input` token and darker `blocked`/`done` values so that status colours also pass 4.5:1 on the muted surface; `tests.md` gains TC-4 and TC-5. Already committed with this plan.

## Model Guidance
- `default_model_class`: `standard_impl`
- `phase_guidance`: `brainstorm`: `high_reasoning`, `design`: `high_reasoning`, `plan`: `standard_impl`, `implement`: `standard_impl`, `review`: `high_reasoning`, `docs`: `cheap_simple`
- `override_rule`: Use `high_reasoning` for planning only when execution boundaries, dependency sequencing, or major tradeoffs are still unresolved.

## Requirement Analysis
- Problem statement: stock grey theme, no dark toggle, fixed 208px sidebar that crowds a phone, status as plain text.
- Success criteria: on a phone, a tablet and a laptop, in light and dark, every page is usable, the navigation fits the screen and status colours read the same everywhere; `pnpm -C frontend typecheck`, `lint`, `test --run`, `build` pass.
- Constraints: see Global Constraints.
- Non-goals: see Global Constraints.

## Approach Options
### Option 1: One `<nav>` restyled by breakpoints (chosen)
- Summary: the link list is declared once; Tailwind turns the element into a tab bar, a rail or a sidebar.
- Pros: one source of links, no JS measuring, tests see one link per destination.
- Cons: the class strings are long; layout is verified by hand, not in jsdom.

### Option 2: Three components and `useMediaQuery`
- Summary: render a different component per width.
- Pros: each form is easy to read alone.
- Cons: repeated link list, extra JS, flicker on load, tests must fake the window size.

### Recommended Approach
- Selected option: 1.
- Reasoning: smallest code and one landmark. Two small consequences are accepted: the theme toggle appears twice in the DOM (header under 768px, rail or sidebar from 768px; CSS shows one), so it keeps its state in a shared store rather than in each button; and CSS media queries cannot run in jsdom, so responsive behaviour has manual cases TC-1, TC-3, TC-4, TC-5.

## Scope
- In scope: `frontend/src/index.css`, `frontend/index.html`, `frontend/package.json` and lockfile, `frontend/src/app/` (`Layout.tsx`, `Link.tsx`, new `theme.ts`, `ThemeToggle.tsx`, tests), `frontend/src/main.tsx`, one class in `frontend/src/features/sessions/SessionLogPage.tsx`.
- Out of scope: see Global Constraints.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Four tracks that build on each other in one small frontend; no independent parallel work.
```

## Tasks

### Track 1: Tokens, fonts and title
- **Dependencies**: none
- **Requirements**: REQ-UI-059, REQ-UI-060, REQ-UI-062, REQ-UI-063
- **Files**: modify `frontend/package.json` and `frontend/pnpm-lock.yaml`, `frontend/tsconfig.app.json` (add `"node"` to `types` so the tests may read files; found while executing, the jsdom `URL` cannot be given to `readFileSync` and `?raw` of a CSS file is empty under vitest), `frontend/src/index.css`, `frontend/index.html:6`; create `frontend/src/app/tokens.test.ts`, `frontend/src/app/document.test.ts`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: every colour pair of REQ-UI-059 passes its ratio in both themes (`tokens.test.ts`); the title is `gin-console`; Geist Mono is bundled and `font-mono` uses it; focus outline, 16px phone inputs and reduced motion rules exist.
- **Estimated complexity**: medium

**Interfaces produced:** CSS variables unchanged in name (`--background`, `--card`, `--foreground`, `--muted-foreground`, `--muted`, `--border`, `--input`, `--ring`, `--primary`, `--primary-foreground`, `--destructive`, `--state-ready|progress|blocked|done|deferred`); Tailwind `font-mono` now Geist Mono.

- [ ] **Step 1: Add the font.** `pnpm -C frontend add @fontsource-variable/geist-mono`. Expected: `package.json` gains `"@fontsource-variable/geist-mono"`.

- [ ] **Step 2: Failing tests.** `frontend/src/app/tokens.test.ts`:
```ts
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
const STATUS = ["state-ready", "state-progress", "state-blocked", "state-done", "state-deferred"] as const;

describe.each([
  [":root", "light"],
  [".dark", "dark"],
])("palette %s", (selector, name) => {
  const t = tokens(selector);
  const get = (key: string) => t[key] ?? "#000000";

  it(`REQ-UI-059 ${name}: every token is defined`, () => {
    for (const key of [...SURFACES, "foreground", "muted-foreground", "input", "border", "ring", "primary", "primary-foreground", "destructive", ...STATUS]) {
      expect(t[key], key).toBeDefined();
    }
  });

  it(`REQ-UI-059 ${name}: text and status colours reach 4.5:1 on every surface`, () => {
    for (const surface of SURFACES) {
      for (const text of ["foreground", "muted-foreground", "destructive", ...STATUS]) {
        expect(ratio(get(text), get(surface)), `${text} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(ratio(get("primary-foreground"), get("primary"))).toBeGreaterThanOrEqual(4.5);
  });

  it(`REQ-UI-059 ${name}: control outlines and the focus ring reach 3:1`, () => {
    for (const surface of ["background", "card"]) {
      expect(ratio(get("input"), get(surface)), `input on ${surface}`).toBeGreaterThanOrEqual(3);
      expect(ratio(get("ring"), get(surface)), `ring on ${surface}`).toBeGreaterThanOrEqual(3);
    }
  });
});
```
`frontend/src/app/document.test.ts`:
```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const html = readFileSync(resolve(import.meta.dirname, "../../index.html"), "utf8");

describe("index.html", () => {
  it("REQ-UI-063 sets the document title", () => {
    expect(html).toContain("<title>gin-console</title>");
  });
});
```
(Track 2 appends the inline-script tests to this file and reuses `html`; merge the vitest imports.)

- [ ] **Step 3: Run, expect FAIL:** `pnpm -C frontend test --run tokens.test document.test`.

- [ ] **Step 4: Implement.** `index.html`: change `<title>frontend</title>` to `<title>gin-console</title>`, and add `<meta name="color-scheme" content="light dark" />` after the viewport meta. `index.css`: add `@import "@fontsource-variable/geist-mono";` under the Geist import; inside `@theme inline {` add `--font-mono: 'Geist Mono Variable', ui-monospace, monospace;`. Replace the whole `:root { … }` and `.dark { … }` blocks with (keep `--radius: 0.625rem;` and the `@theme inline` block as it is):
```css
:root {
    --background: #f6f7f9;
    --foreground: #12161c;
    --card: #ffffff;
    --card-foreground: #12161c;
    --popover: #ffffff;
    --popover-foreground: #12161c;
    --primary: #12161c;
    --primary-foreground: #ffffff;
    --secondary: #eceff3;
    --secondary-foreground: #12161c;
    --muted: #eceff3;
    --muted-foreground: #566072;
    --accent: #eceff3;
    --accent-foreground: #12161c;
    --destructive: #b91c1c;
    --border: #cfd5de;
    --input: #7d8695;
    --ring: #12161c;
    --chart-1: #cfd5de;
    --chart-2: #7d8695;
    --chart-3: #566072;
    --chart-4: #2c343f;
    --chart-5: #12161c;
    --radius: 0.625rem;
    --sidebar: #ffffff;
    --sidebar-foreground: #12161c;
    --sidebar-primary: #12161c;
    --sidebar-primary-foreground: #ffffff;
    --sidebar-accent: #eceff3;
    --sidebar-accent-foreground: #12161c;
    --sidebar-border: #cfd5de;
    --sidebar-ring: #12161c;
    --state-ready: #0f766e;
    --state-progress: #4338ca;
    --state-blocked: #a3470a;
    --state-done: #5d6573;
    --state-deferred: #5d6573;
}

.dark {
    --background: #0e1217;
    --foreground: #e7eaf0;
    --card: #161b22;
    --card-foreground: #e7eaf0;
    --popover: #161b22;
    --popover-foreground: #e7eaf0;
    --primary: #e7eaf0;
    --primary-foreground: #12161c;
    --secondary: #1d242d;
    --secondary-foreground: #e7eaf0;
    --muted: #1d242d;
    --muted-foreground: #9aa4b2;
    --accent: #1d242d;
    --accent-foreground: #e7eaf0;
    --destructive: #f87171;
    --border: #2c343f;
    --input: #667085;
    --ring: #e7eaf0;
    --chart-1: #2c343f;
    --chart-2: #667085;
    --chart-3: #9aa4b2;
    --chart-4: #cfd5de;
    --chart-5: #e7eaf0;
    --sidebar: #161b22;
    --sidebar-foreground: #e7eaf0;
    --sidebar-primary: #e7eaf0;
    --sidebar-primary-foreground: #12161c;
    --sidebar-accent: #1d242d;
    --sidebar-accent-foreground: #e7eaf0;
    --sidebar-border: #2c343f;
    --sidebar-ring: #e7eaf0;
    --state-ready: #2dd4bf;
    --state-progress: #a5b4fc;
    --state-blocked: #fbbf24;
    --state-done: #9ca3af;
    --state-deferred: #9ca3af;
}
```
(the existing `--state-*` lines added by the graph change move into these blocks; delete the old ones so each is declared once.) In `@layer base` add inside it:
```css
  :focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
```
and at the end of the file, outside any layer, so that it beats `text-sm`:
```css
@media (max-width: 767px) {
  input:not([type="checkbox"]):not([type="radio"]),
  select,
  textarea {
    font-size: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  ::before,
  ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 5: Run, expect PASS.** `pnpm -C frontend test --run tokens.test document.test`. If a contrast assertion names a pair, change that one token a few steps darker (light) or lighter (dark) and rerun; do not lower the thresholds. Then `pnpm -C frontend typecheck && pnpm -C frontend lint && pnpm -C frontend build`.
- [ ] **Step 6: Commit:** `git add frontend && git commit -m "feat(frontend): add the neutral palette, Geist Mono and the page title"`

### Track 2: Theme
- **Dependencies**: Track 1
- **Requirements**: REQ-UI-058
- **Files**: create `frontend/src/app/theme.ts`, `frontend/src/app/ThemeToggle.tsx`, `frontend/src/app/theme.test.tsx`; modify `frontend/index.html` (inline script), `frontend/src/main.tsx:5`, `frontend/src/app/document.test.ts`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: first visit follows the system; the toggle switches the class on `<html>`, keeps the choice and works when storage throws; every toggle on the page stays in step; the inline script and `theme.ts` agree on the key and the rule.
- **Estimated complexity**: medium

**Interfaces produced** (exact):
```ts
export type Theme = "light" | "dark";
export const THEME_KEY: "gin-console-theme";
export function initTheme(): void;                 // applies stored ?? system, call once before render
export function useTheme(): [Theme, () => void];   // shared by all toggles
export function ThemeToggle(props: { className?: string }): JSX.Element;
```

- [ ] **Step 1: Failing tests.** `frontend/src/app/theme.test.tsx`:
```tsx
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
    await userEvent.click(screen.getAllByRole("button", { name: "Switch to dark theme" })[0] as HTMLElement);
    expect(screen.getAllByRole("button", { name: "Switch to light theme" })).toHaveLength(2);
  });
});
```
Add to `document.test.ts`:
```ts
import { THEME_KEY } from "./theme";

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

  it("REQ-UI-058 does not throw when storage refuses", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(run).not.toThrow();
  });
});
```
(import `afterEach, beforeEach, vi` from vitest in that file.)

- [ ] **Step 2: Run, expect FAIL:** `pnpm -C frontend test --run theme.test document.test`.

- [ ] **Step 3: `theme.ts`:**
```ts
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
```
`ThemeToggle.tsx`:
```tsx
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./theme";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, toggle] = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={cn(
        "flex size-11 items-center justify-center gap-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:size-10 lg:h-10 lg:w-full lg:justify-start lg:px-3 lg:text-sm lg:font-medium",
        className,
      )}
    >
      <Icon aria-hidden className="size-5" />
      <span className="hidden lg:inline">{`Switch to ${next}`}</span>
    </button>
  );
}
```
`index.html`: add before `</head>`:
```html
    <script>
      try {
        var stored = localStorage.getItem("gin-console-theme");
        var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (dark) document.documentElement.classList.add("dark");
      } catch (error) {}
    </script>
```
`main.tsx`: add `import { initTheme } from "./app/theme";` and call `initTheme();` right after the `root` null check, before `createRoot`.

- [ ] **Step 4: Run, expect PASS:** `pnpm -C frontend test --run && pnpm -C frontend typecheck && pnpm -C frontend lint`.
- [ ] **Step 5: Commit:** `git add frontend && git commit -m "feat(frontend): add the light and dark theme with a toggle"`

### Track 3: Responsive navigation shell
- **Dependencies**: Track 2
- **Requirements**: REQ-UI-055, REQ-UI-056, REQ-UI-057, REQ-UI-062, REQ-UI-008, REQ-UI-015, REQ-UI-022
- **Files**: modify `frontend/src/app/Layout.tsx` (whole file), `frontend/src/app/Link.tsx`; create `frontend/src/app/Layout.test.tsx`
- **Provider role**: `frontend`
- **Reasoning**: `high`
- **Acceptance criteria**: one `nav` named Main with the four links, the current one marked `aria-current="page"` (and only it); the existing routing tests in `App.test.tsx` still pass; the classes give a bottom bar under 768px, a rail to 1023px and a sidebar above (checked by hand, TC-1).
- **Estimated complexity**: medium

**Interfaces consumed:** `ThemeToggle` (Track 2). **Produced:** `Link` accepts `"aria-current"?: "page"`; `Layout` unchanged signature.

- [ ] **Step 1: Failing test** `frontend/src/app/Layout.test.tsx`:
```tsx
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Layout } from "./Layout";

afterEach(cleanup);

const open = (path: string) => {
  window.history.replaceState(null, "", path);
  render(<Layout>page</Layout>);
};
const nav = () => screen.getByRole("navigation", { name: "Main" });
const marked = () =>
  within(nav())
    .getAllByRole("link")
    .filter((link) => link.getAttribute("aria-current") === "page")
    .map((link) => link.textContent);

describe("Layout", () => {
  it("REQ-UI-055 has one Main navigation with the four links", () => {
    open("/");
    expect(screen.getAllByRole("navigation", { name: "Main" })).toHaveLength(1);
    expect(within(nav()).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Projects", "/"],
      ["Beads", "/beads"],
      ["Sessions", "/sessions"],
      ["Quota", "/quota"],
    ]);
  });

  it.each([
    ["/", ["Projects"]],
    ["/beads", ["Beads"]],
    ["/beads/alpha/a-1", ["Beads"]],
    ["/sessions", ["Sessions"]],
    ["/sessions/alpha/11111111-1111-4111-8111-111111111111", ["Sessions"]],
    ["/quota", ["Quota"]],
    ["/nowhere", []],
  ])("REQ-UI-057 %s marks %j", (path, expected) => {
    open(path);
    expect(marked()).toEqual(expected);
  });

  it("REQ-UI-057 follows a click", async () => {
    open("/");
    await userEvent.click(within(nav()).getByRole("link", { name: "Quota" }));
    expect(marked()).toEqual(["Quota"]);
  });

  it("REQ-UI-062 offers the theme control", () => {
    open("/");
    expect(screen.getAllByRole("button", { name: /Switch to (dark|light) theme/ }).length).toBeGreaterThan(0);
  });
});
```
- [ ] **Step 2: Run, expect FAIL:** `pnpm -C frontend test --run Layout.test`.
- [ ] **Step 3: `Link.tsx`:** change the props to `{ to, className, children, "aria-current": ariaCurrent }: { to: string; className?: string; children: ReactNode; "aria-current"?: "page" }` and render `<a href={to} onClick={onClick} className={className} aria-current={ariaCurrent}>`.
- [ ] **Step 4: `Layout.tsx`** (whole file):
```tsx
import { Gauge, LayoutGrid, ListChecks, MessageSquare } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Link } from "./Link";
import { useLocation } from "./route";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { to: "/", label: "Projects", icon: LayoutGrid, current: (path: string) => path === "/" },
  { to: "/beads", label: "Beads", icon: ListChecks, current: (path: string) => path.startsWith("/beads") },
  { to: "/sessions", label: "Sessions", icon: MessageSquare, current: (path: string) => path.startsWith("/sessions") },
  { to: "/quota", label: "Quota", icon: Gauge, current: (path: string) => path === "/quota" },
] as const;

const LINK = cn(
  "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground",
  "aria-[current=page]:font-semibold aria-[current=page]:text-foreground aria-[current=page]:shadow-[inset_0_2px_0_0_var(--foreground)]",
  "md:min-h-14 md:flex-none md:rounded-lg md:hover:bg-muted md:aria-[current=page]:bg-muted md:aria-[current=page]:shadow-none",
  "lg:min-h-10 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-sm",
);

/** Three beads on a thread, in the status colours: the only brand mark. */
function Brand({ wordClass }: { wordClass?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="30" height="12" viewBox="0 0 30 12" aria-hidden="true">
        <path d="M5 6h20" className="stroke-border" strokeWidth="2" />
        <circle cx="5" cy="6" r="4.5" className="fill-state-ready" />
        <circle cx="15" cy="6" r="4.5" className="fill-state-progress" />
        <circle cx="25" cy="6" r="4.5" className="fill-state-blocked" />
      </svg>
      <span className={cn("text-sm font-semibold", wordClass)}>gin-console</span>
    </span>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground md:flex-row">
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card pl-4 pr-1 md:hidden">
        <Brand />
        <ThemeToggle />
      </header>
      <aside className="md:flex md:w-20 md:shrink-0 md:flex-col md:gap-4 md:border-r md:bg-card md:px-2 md:py-4 lg:w-56 lg:px-3">
        <div className="hidden justify-center px-2 py-1 md:flex lg:justify-start">
          <Brand wordClass="max-lg:hidden" />
        </div>
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-card pb-[env(safe-area-inset-bottom)] md:static md:flex-col md:gap-1 md:border-t-0 md:pb-0"
        >
          {NAV.map(({ to, label, icon: Icon, current }) => (
            <Link key={to} to={to} aria-current={current(pathname) ? "page" : undefined} className={LINK}>
              <Icon aria-hidden className="size-5" />
              {label}
            </Link>
          ))}
        </nav>
        <ThemeToggle className="hidden md:mt-auto md:flex" />
      </aside>
      <main className="min-w-0 flex-1 p-4 pb-24 md:p-6">{children}</main>
    </div>
  );
}
```
If `lucide-react` lacks one of the four icon names, `tsc -b` names it: pick the closest from the same package (for example `LayoutDashboard`) and keep the rest.
- [ ] **Step 5: Run, expect PASS:** `pnpm -C frontend test --run && pnpm -C frontend typecheck && pnpm -C frontend lint && pnpm -C frontend build`.
- [ ] **Step 6: Commit:** `git add frontend && git commit -m "feat(frontend): make the app shell responsive with one navigation"`

### Track 4: No sideways scroll and the manual checks
- **Dependencies**: Track 3
- **Requirements**: REQ-UI-061, REQ-UI-056, REQ-UI-059, REQ-UI-060, REQ-UI-062
- **Files**: modify `frontend/src/features/sessions/SessionLogPage.tsx:103`, `docs/changes/gin-console-8zv-shell-foundation/tests.md` (evidence column)
- **Provider role**: `frontend`
- **Reasoning**: `low`
- **Acceptance criteria**: at 360px none of Projects, Beads (List, Board, Focus, Tree, Graph), a bead page, Sessions, a session log and Quota scrolls sideways; TC-1 to TC-5 have an evidence line each.
- **Estimated complexity**: low

- [ ] **Step 1:** In `SessionLogPage.tsx` change `<span className="font-mono text-sm">{summary.cwd}</span>` to `<span className="break-all font-mono text-sm">{summary.cwd}</span>` (a long directory has no break points). Run `pnpm -C frontend test --run SessionLogPage`; expected PASS.
- [ ] **Step 2 (manual, TC-3):** `pnpm -C frontend dev` (backend on 8700 or the fixtures in the browser), device width 360px. For each page above, drag the page sideways and run in the console `document.documentElement.scrollWidth <= document.documentElement.clientWidth`; expected `true`. Anything wider than the window must scroll inside its own box (tables and `pre` already do). For any page that fails, add `min-w-0` to the offending flex child or `break-words` / `overflow-x-auto` to the offending element, nothing else, and rerun the page's tests.
- [ ] **Step 3 (manual, TC-1, TC-2, TC-4, TC-5):** at 390, 820 and 1280px in light and dark, check the tab bar, the rail, the sidebar, the status colours and input outlines, a 16px input on a phone width, Tab focus on every page and `prefers-reduced-motion` (DevTools rendering panel). If no browser can be driven in this session, write "not run: no browser" in the evidence column for that case; never claim a pass.
- [ ] **Step 4:** write one evidence line per case into the `evidence` column of `tests.md` (what was seen, at which width and theme).
- [ ] **Step 5: Commit:** `git add frontend docs && git commit -m "fix(frontend): keep long paths inside the page and record the manual checks"`

## Integration
- **Branch**: `feat/shell-foundation` (from the updated base after the spec change is merged or alongside it)
- **Merge strategy**: sequential

## Validation
- [ ] All tests pass (`pnpm -C frontend test --run`; the 2100-bead Tree test can time out when the machine is loaded: rerun it alone before calling it a failure)
- [ ] Type checks clean (`pnpm -C frontend typecheck`), lint (`pnpm -C frontend lint`), build (`pnpm -C frontend build`)
- [ ] Manual TC-1 to TC-5 recorded in `tests.md`
- [ ] `gin-workflow specs trace --change gin-console-8zv` reports no missing REQ

## Notes
- Model guidance is planning metadata, not Beads state.
- Only the Parent Bead (the epic) stays open until the human-confirmed merge; track beads close after tests and review pass.
- The preview artifact is the visual target for Laptop, Tablet, Phone and Palette: https://claude.ai/artifact/WTC31iQ9PznEVjY79rAYgG
