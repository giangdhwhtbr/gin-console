# Plan: Collapsible sidebar

Epic: gin-console-0ct
Spec: `docs/changes/gin-console-0ct-sidebar-collapse/` (`01-proposal.md`, `02-spec-delta.md`, `03-design.md`, `05-tests.md`)

## Objective
From 1024px a button at the bottom of the sidebar collapses the 224px sidebar into the 80px icon rail of 768–1023px and expands it again; the choice is kept in `localStorage` under `gin-console-sidebar`.

**Goal:** every scenario of REQ-UI-094 and the changed REQ-UI-056 has a passing vitest case named with its REQ-ID or a manual case in `05-tests.md`; `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass; TC-1 to TC-3 pass by hand.

**Architecture:** frontend shell only (`03-design.md`).
- `frontend/src/app/Layout.tsx` owns the collapsed state (`useState` initialised from `localStorage`, written on toggle inside `try/catch`), leaves out the `lg:` classes of the column, brand word, links and theme control while collapsed, and renders the collapse button under the theme control.
- `frontend/src/app/ThemeToggle.tsx` exports its button classes (`RAIL_BUTTON`, `RAIL_BUTTON_WIDE`) for the collapse button and takes `wide` to drop its `lg:` label.

**Tech Stack:** React 19, TypeScript, Tailwind 4 (`cn` = clsx + tailwind-merge), lucide icons (`PanelLeftClose`, `PanelLeftOpen`), vitest and Testing Library (jsdom). No new dependency, no backend change.

**Global Constraints (verbatim from the spec):**
- Collapsing or hiding the navigation below 1024px: the tab bar and the tablet rail stay as they are.
- An icon-only rail or tooltips. Decided 2026-11-02 (user): the tablet rail, labels stay visible.
- A keyboard shortcut, and an animation of the width change.
- Any backend change.

## Route Rubric
- Choose the weakest model that can do the work.
- Raise the model for broad context or design judgement.
- Raise the effort for intrinsic difficulty: intricate logic, many edge cases, or long chains of steps.

| Kind of work | Model | Effort |
|---|---|---|
| Mechanical edits, documentation, boilerplate | weakest | `low` |
| Bounded implementation with a clear spec | middle | `medium` |
| Cross-module change, security, migration, concurrency | strongest | `high` |

Unclear requirements never raise the model or effort.

## Requirement Analysis
- Problem statement: from 1024px the "Main" navigation is a fixed 224px sidebar that takes width from wide pages, and the user cannot narrow it.
- Success criteria: the six scenarios of REQ-UI-094 and the four of REQ-UI-056 pass (vitest for names, `aria-expanded`, storage and links; TC-1 to TC-3 for widths, which jsdom cannot measure).
- Constraints: read-only console (ADR-0001); REQ-UI-055 and REQ-UI-057 stay true (one "Main" navigation, five links, current page marked); REQ-UI-062 (no non-essential motion, focus visible); the stored-choice pattern of `theme.ts` (refused storage never throws).
- Non-goals: see Global Constraints.

## Approach Options
### Option 1: React state in `Layout`, conditional `lg:` classes
- Summary: `Layout` reads `gin-console-sidebar` in its `useState` initializer and, while collapsed, leaves out the `lg:` classes so the `md:` rail styles apply from 1024px.
- Pros: one component owns the state; no pre-paint script, since the navigation is rendered by React from the first frame; plain class strings, testable in jsdom.
- Cons: the `lg:` classes are split into "wide" constants, so the sidebar look is described in two places per element.

### Option 2: `data-sidebar` on `<html>` with a Tailwind custom variant
- Summary: a `wide:` variant (`lg` and not collapsed) replaces `lg:`, set by a script in `index.html` like the theme.
- Pros: no conditional class strings.
- Cons: a second pre-paint script and a global store for a state only `Layout` reads; CSS selector logic jsdom cannot check.

### Recommended Approach
- Selected option: Option 1, as confirmed in discuss (`03-design.md`).
- Rationale: smallest change inside the component that already owns the navigation. The code below was built and checked in a scratch worktree on 2026-11-02 against `6e12739`: 507 frontend tests, typecheck, lint and build pass; a headless Chromium on the built app showed the collapsed column at 80px at 1280px, the choice kept after reload, and no button at 820px.

## Scope
- In scope: `frontend/src/app/Layout.tsx`, `frontend/src/app/ThemeToggle.tsx`, `frontend/src/app/Layout.test.tsx`, and the evidence of TC-1 to TC-3 in `05-tests.md`.
- Out of scope: the backend, other pages, the living specs (updated at archive), the e2e specs and their recorded ARIA evidence under `qa/`.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Track 2 checks the build of Track 1 in a browser, so the tracks run one after another.
```

## Tasks

### Track 1: Collapse control in the sidebar
- **Dependencies**: none
- **Requirements**: REQ-UI-094, REQ-UI-056
- **Files**:
  - Modify `frontend/src/app/ThemeToggle.tsx:5-22` (export `RAIL_BUTTON`, `RAIL_BUTTON_WIDE`; add `wide` prop)
  - Modify `frontend/src/app/Layout.tsx:1-6,16-21,38-62` (imports; split `LINK_WIDE`; `SIDEBAR_KEY`, `storedCollapsed`; state, toggle and collapse button)
  - Test `frontend/src/app/Layout.test.tsx:1-6,12` (imports, storage reset, `sidebarToggle`) and five cases before the final `});`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** two components and one test file, with the exact diffs and tests given below; no cross-module logic.
- **Acceptance criteria**: the new `Layout.test.tsx` cases (REQ-UI-094; REQ-UI-055/056/057 collapsed) and all existing frontend tests pass; `pnpm -C frontend typecheck`, `lint` and `build` pass; with the sidebar expanded the rendered classes are the same as before this change.
- **Estimated complexity**: low

**Interfaces produced:**
```ts
// frontend/src/app/Layout.tsx
export const SIDEBAR_KEY = "gin-console-sidebar"; // stored value "collapsed" | "expanded"
export function Layout({ children }: { children: ReactNode }): JSX.Element;
// frontend/src/app/ThemeToggle.tsx
export const RAIL_BUTTON: string;      // button classes below 1024px
export const RAIL_BUTTON_WIDE: string; // added from 1024px while the sidebar is expanded
export function ThemeToggle(props: { className?: string; wide?: boolean }): JSX.Element; // wide defaults to true
```

- [ ] **Step 1: Write the failing tests.** Save this diff to a file and run `git apply <file>` from the repo root:

```diff
diff --git a/frontend/src/app/Layout.test.tsx b/frontend/src/app/Layout.test.tsx
index 943a9fe..01db701 100644
--- a/frontend/src/app/Layout.test.tsx
+++ b/frontend/src/app/Layout.test.tsx
@@ -1,15 +1,20 @@
 import { cleanup, render, screen, within } from "@testing-library/react";
 import userEvent from "@testing-library/user-event";
-import { afterEach, describe, expect, it } from "vitest";
-import { Layout } from "./Layout";
+import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
+import { Layout, SIDEBAR_KEY } from "./Layout";
 
-afterEach(cleanup);
+beforeEach(() => window.localStorage.clear());
+afterEach(() => {
+  cleanup();
+  vi.restoreAllMocks();
+});
 
 const open = (path: string) => {
   window.history.replaceState(null, "", path);
   render(<Layout>page</Layout>);
 };
 const nav = () => screen.getByRole("navigation", { name: "Main" });
+const sidebarToggle = () => screen.getByRole("button", { name: /(Collapse|Expand) sidebar/ });
 const marked = () =>
   within(nav())
     .getAllByRole("link")
@@ -63,4 +68,48 @@ describe("Layout", () => {
     open("/");
     expect(screen.getAllByRole("button", { name: /Switch to (dark|light) theme/ }).length).toBeGreaterThan(0);
   });
+
+  it("REQ-UI-094 starts expanded when nothing is stored", () => {
+    open("/");
+    expect(sidebarToggle()).toHaveAccessibleName("Collapse sidebar");
+    expect(sidebarToggle()).toHaveAttribute("aria-expanded", "true");
+  });
+
+  it("REQ-UI-094 collapses, stores the choice, and expands again", async () => {
+    open("/");
+    await userEvent.click(sidebarToggle());
+    expect(sidebarToggle()).toHaveAccessibleName("Expand sidebar");
+    expect(sidebarToggle()).toHaveAttribute("aria-expanded", "false");
+    expect(window.localStorage.getItem(SIDEBAR_KEY)).toBe("collapsed");
+    await userEvent.click(sidebarToggle());
+    expect(sidebarToggle()).toHaveAccessibleName("Collapse sidebar");
+    expect(window.localStorage.getItem(SIDEBAR_KEY)).toBe("expanded");
+  });
+
+  it("REQ-UI-094 starts collapsed when the choice is stored", () => {
+    window.localStorage.setItem(SIDEBAR_KEY, "collapsed");
+    open("/");
+    expect(sidebarToggle()).toHaveAccessibleName("Expand sidebar");
+  });
+
+  it("REQ-UI-094 toggles for this visit when storage is refused", async () => {
+    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
+      throw new Error("denied");
+    });
+    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
+      throw new Error("denied");
+    });
+    open("/");
+    expect(sidebarToggle()).toHaveAccessibleName("Collapse sidebar");
+    await userEvent.click(sidebarToggle());
+    expect(sidebarToggle()).toHaveAccessibleName("Expand sidebar");
+  });
+
+  it("REQ-UI-055 REQ-UI-056 REQ-UI-057 keeps one Main navigation with the five links when collapsed", () => {
+    window.localStorage.setItem(SIDEBAR_KEY, "collapsed");
+    open("/beads");
+    expect(screen.getAllByRole("navigation", { name: "Main" })).toHaveLength(1);
+    expect(within(nav()).getAllByRole("link")).toHaveLength(5);
+    expect(marked()).toEqual(["Beads"]);
+  });
 });
```

- [ ] **Step 2: Run them and see them fail.** `pnpm -C frontend test --run src/app/Layout.test.tsx` fails: `SIDEBAR_KEY` is not exported by `./Layout` and no "Collapse sidebar" button exists.

- [ ] **Step 3: Implement.** Save this diff to a file and run `git apply <file>` from the repo root:

```diff
diff --git a/frontend/src/app/Layout.tsx b/frontend/src/app/Layout.tsx
index b6020e0..1491d0b 100644
--- a/frontend/src/app/Layout.tsx
+++ b/frontend/src/app/Layout.tsx
@@ -1,9 +1,9 @@
-import { ChartColumn, Flag, Gauge, LayoutGrid, ListChecks } from "lucide-react";
-import type { ReactNode } from "react";
+import { ChartColumn, Flag, Gauge, LayoutGrid, ListChecks, PanelLeftClose, PanelLeftOpen } from "lucide-react";
+import { useState, type ReactNode } from "react";
 import { cn } from "@/lib/utils";
 import { Link } from "./Link";
 import { useLocation } from "./route";
-import { ThemeToggle } from "./ThemeToggle";
+import { RAIL_BUTTON, RAIL_BUTTON_WIDE, ThemeToggle } from "./ThemeToggle";
 
 const NAV = [
   { to: "/", label: "Projects", icon: LayoutGrid, current: (path: string) => path === "/" },
@@ -17,8 +17,19 @@ const LINK = cn(
   "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground",
   "aria-[current=page]:font-semibold aria-[current=page]:text-foreground aria-[current=page]:shadow-[inset_0_2px_0_0_var(--foreground)]",
   "md:min-h-14 md:flex-none md:rounded-lg md:hover:bg-muted md:aria-[current=page]:bg-muted md:aria-[current=page]:shadow-none",
-  "lg:min-h-10 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-sm",
 );
+/** The sidebar look of a link from 1024px, left out while the sidebar is collapsed. */
+const LINK_WIDE = "lg:min-h-10 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-sm";
+
+export const SIDEBAR_KEY = "gin-console-sidebar";
+
+function storedCollapsed(): boolean {
+  try {
+    return window.localStorage.getItem(SIDEBAR_KEY) === "collapsed";
+  } catch {
+    return false; // storage refused: start expanded
+  }
+}
 
 /** Three beads on a thread, in the status colours: the only brand mark. */
 function Brand({ wordClass }: { wordClass?: string }) {
@@ -37,28 +48,57 @@ function Brand({ wordClass }: { wordClass?: string }) {
 
 export function Layout({ children }: { children: ReactNode }) {
   const { pathname } = useLocation();
+  const [collapsed, setCollapsed] = useState(storedCollapsed);
+  const wide = !collapsed;
+  const toggle = () => {
+    setCollapsed(wide);
+    try {
+      window.localStorage.setItem(SIDEBAR_KEY, wide ? "collapsed" : "expanded");
+    } catch {
+      // storage refused: the choice lasts for this visit only
+    }
+  };
+  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
   return (
     <div className="flex min-h-screen flex-col bg-background text-foreground md:flex-row">
       <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card pl-4 pr-1 md:hidden">
         <Brand />
         <ThemeToggle />
       </header>
-      <div className="md:flex md:w-20 md:shrink-0 md:flex-col md:gap-4 md:border-r md:bg-card md:px-2 md:py-4 lg:w-56 lg:px-3">
-        <div className="hidden justify-center px-2 py-1 md:flex lg:justify-start">
-          <Brand wordClass="max-lg:hidden" />
+      <div
+        className={cn(
+          "md:flex md:w-20 md:shrink-0 md:flex-col md:gap-4 md:border-r md:bg-card md:px-2 md:py-4",
+          wide && "lg:w-56 lg:px-3",
+        )}
+      >
+        <div className={cn("hidden justify-center px-2 py-1 md:flex", wide && "lg:justify-start")}>
+          <Brand wordClass={wide ? "max-lg:hidden" : "hidden"} />
         </div>
         <nav
           aria-label="Main"
           className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-card pb-[env(safe-area-inset-bottom)] md:static md:flex-col md:gap-1 md:border-t-0 md:pb-0"
         >
           {NAV.map(({ to, label, icon: Icon, current }) => (
-            <Link key={to} to={to} aria-current={current(pathname) ? "page" : undefined} className={LINK}>
+            <Link key={to} to={to} aria-current={current(pathname) ? "page" : undefined} className={cn(LINK, wide && LINK_WIDE)}>
               <Icon aria-hidden className="size-5" />
               {label}
             </Link>
           ))}
         </nav>
-        <ThemeToggle className="hidden md:mt-auto md:flex" />
+        <div className="hidden md:mt-auto md:flex md:flex-col md:gap-1">
+          <ThemeToggle wide={wide} />
+          <button
+            type="button"
+            onClick={toggle}
+            aria-expanded={wide}
+            aria-label={wide ? "Collapse sidebar" : "Expand sidebar"}
+            title={wide ? "Collapse sidebar" : "Expand sidebar"}
+            className={cn(RAIL_BUTTON, wide && RAIL_BUTTON_WIDE, "hidden lg:flex")}
+          >
+            <ToggleIcon aria-hidden className="size-5" />
+            <span className={cn("hidden", wide && "lg:inline")}>Collapse sidebar</span>
+          </button>
+        </div>
       </div>
       <main className="min-w-0 flex-1 p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:p-6">{children}</main>
     </div>
diff --git a/frontend/src/app/ThemeToggle.tsx b/frontend/src/app/ThemeToggle.tsx
index a4b90f9..8adc1e1 100644
--- a/frontend/src/app/ThemeToggle.tsx
+++ b/frontend/src/app/ThemeToggle.tsx
@@ -2,7 +2,12 @@ import { Moon, Sun } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { useTheme } from "./theme";
 
-export function ThemeToggle({ className }: { className?: string }) {
+/** A sidebar button: icon only up to 1023px, icon and label from 1024px unless the sidebar is collapsed. */
+export const RAIL_BUTTON =
+  "flex size-11 items-center justify-center gap-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:size-10";
+export const RAIL_BUTTON_WIDE = "lg:h-10 lg:w-full lg:justify-start lg:px-3 lg:text-sm lg:font-medium";
+
+export function ThemeToggle({ className, wide = true }: { className?: string; wide?: boolean }) {
   const [theme, toggle] = useTheme();
   const next = theme === "dark" ? "light" : "dark";
   const Icon = theme === "dark" ? Sun : Moon;
@@ -12,13 +17,10 @@ export function ThemeToggle({ className }: { className?: string }) {
       onClick={toggle}
       aria-label={`Switch to ${next} theme`}
       title={`Switch to ${next} theme`}
-      className={cn(
-        "flex size-11 items-center justify-center gap-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:size-10 lg:h-10 lg:w-full lg:justify-start lg:px-3 lg:text-sm lg:font-medium",
-        className,
-      )}
+      className={cn(RAIL_BUTTON, wide && RAIL_BUTTON_WIDE, className)}
     >
       <Icon aria-hidden className="size-5" />
-      <span className="hidden lg:inline">{`Switch to ${next}`}</span>
+      <span className={cn("hidden", wide && "lg:inline")}>{`Switch to ${next}`}</span>
     </button>
   );
 }
```

- [ ] **Step 4: Run the tests and see them pass.** `pnpm -C frontend test --run src/app` prints `Test Files  6 passed (6)` and `Tests  61 passed (61)`.

- [ ] **Step 5: Run every frontend check.** `pnpm -C frontend test --run` (52 files, 507 tests pass), `pnpm -C frontend typecheck`, `pnpm -C frontend lint` and `pnpm -C frontend build` exit 0.

- [ ] **Step 6: Commit.** `git add frontend/src/app/Layout.tsx frontend/src/app/ThemeToggle.tsx frontend/src/app/Layout.test.tsx` and commit `feat(ui): collapse the sidebar to the icon rail (gin-console-0ct.1)`.

### Track 2: Check the sidebar in a browser
- **Dependencies**: Track 1
- **Requirements**: REQ-UI-094, REQ-UI-056
- **Files**:
  - Modify `docs/changes/gin-console-0ct-sidebar-collapse/05-tests.md` (TC-1 to TC-3 evidence)
- **Provider role**: `general`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** a person runs the manual cases and the evidence is recorded as text.
- **Human gate**: a person opens the built console at 1280px, 820px and 390px, in light and dark, and runs TC-1 to TC-3 of `05-tests.md` (jsdom cannot measure widths).
- **Acceptance criteria**: TC-1 to TC-3 have dated evidence naming the build checked and the result.
- **Estimated complexity**: low

- [ ] **Step 1:** Deploy the branch to the Tailscale console (bd memory `deploy-to-tailscale-for-ui-verification`): `git -C /home/gin/gin-fam/gin-console merge --ff-only feat/sidebar-collapse`, `pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile`, `pnpm -C /home/gin/gin-fam/gin-console/frontend build`, `systemctl --user restart gin-console`, `systemctl --user is-active gin-console` (prints `active`), `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/health` (prints `200`). Report the rollback command (`git -C /home/gin/gin-fam/gin-console reset --hard <previous HEAD>` then rebuild and restart).
- [ ] **Step 2:** The person checks TC-1 at 1280px, light and dark: "Collapse sidebar" turns the sidebar into the 80px rail with the label under each icon and the brand mark without its word; "Expand sidebar" restores the 224px sidebar; the current page stays marked; Tab reaches the button with a visible focus ring.
- [ ] **Step 3:** The person checks TC-2: collapse, reload, the sidebar is still collapsed; and TC-3: at 820px and 390px there is no collapse button and the rail and tab bar look as before.
- [ ] **Step 4:** Record the results in the TC-1 to TC-3 evidence cells and commit `docs(specs): record gin-console-0ct sidebar check (gin-console-0ct.2)`.

## Integration
- **Branch**: `feat/sidebar-collapse` (holds the spec commit `6e12739`)
- **Merge strategy**: sequential (Track 1 → Track 2)

## Validation
- [ ] `pnpm -C frontend test --run`, `typecheck`, `lint`, `build` pass
- [ ] `gin-workflow specs trace --change gin-console-0ct` reports every REQ covered
- [ ] TC-1 to TC-3 passed at 1280px, 820px and 390px, light and dark

## Notes
- `Model:` and `Effort:` are chosen from the main harness catalog using the route rubric.
- The diffs apply to `6e12739` and were checked in a scratch worktree on 2026-11-02 (see Recommended Approach).
- The theme and collapse buttons sit at the left of the 80px rail, as the theme button already does on the tablet rail today; the collapsed rail matches the tablet rail exactly. Centring both is a separate visual fix if wanted.
- The Parent Bead `gin-console-0ct` stays open until a human-confirmed merge; track beads close after tests and review pass.
