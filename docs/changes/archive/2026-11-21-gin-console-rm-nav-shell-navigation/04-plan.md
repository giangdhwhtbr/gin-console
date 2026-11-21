# Plan: Navigation shell

Epic: gin-console-rm-nav-shell
Spec: `01-proposal.md`, `02-spec-delta.md` and `03-design.md` in this folder; diagrams `docs/specs/ui/diagrams/current-project-activity.md` and `back-to-place-activity.md`; use cases `docs/specs/ui/use-cases/switch-project.md` and `return-to-place.md`.

## Objective
The console remembers where you are and how you got there:
- **One current project:** taken from the URL, then the browser tab, then a starred favorite, then the first project. It is carried by the Beads, Milestones and Reports links and changed in a sidebar switcher.
- **Way back:** breadcrumbs by name follow the page a bead was opened from, and the navigation marks that page.
- **Orientation:** every page has its own browser title. Unknown paths and projects say so.
- **Back:** it restores the scroll position and focuses the bead just opened.
- **Skip link:** every page has one.
- **Report sections:** they sit in the sidebar on a wide screen.

Done when:
- Every scenario of REQ-UI-123 to REQ-UI-129 and of the modified REQ-UI-023, 055, 057, 063, 072, 073, 088 and 095 has a test that names its REQ.
- `gin-qa cases check --change gin-console-rm-nav-shell` prints `ok`.
- TC-1 passes on the deployed console.

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
- **Problem statement:**
  - Each page picks its own project, and nav clicks reset it.
  - Breadcrumbs show ids, and the navigation marks Beads for every bead.
  - Every tab is titled `gin-console`.
  - Unknown paths and projects silently show other content.
  - Back loses the scroll position.
  - There is no skip link.
- **Success criteria:**
  - Everything in the Objective.
  - The frontend checks pass: `pnpm -C frontend test --run`, `typecheck`, `lint` and `build`.
  - The backend suite is untouched and passes.
  - `gin specs lint --change gin-console-rm-nav-shell --against master` prints `ok`, and `gin specs trace --change gin-console-rm-nav-shell` lists no missing REQ.
- **Global constraints** (from the spec and the user's decisions):
  - **No new dependency;** the console keeps `app/route.ts` and `Link.tsx`.
  - **Project resolution** (REQ-UI-124):
    - The order is the URL `project` (configured, directory exists), then the tab's last choice (`sessionStorage` `gin-console-project`), then the favorite (`localStorage` `gin-console-favorite-project`), then the first configured project.
    - Every storage access is wrapped and falls back to memory for the visit.
  - **"All projects":**
    - It stays inside My Tasks (default) and Reports (`project=all`); it never becomes the current project.
    - My Tasks' nav link carries no project.
  - **Project selects:** the Beads and Milestones pages lose their own selects. The Reports and My Tasks selects stay, and a single project chosen there becomes the current project.
  - **Report sections** keep the `tab` query; no new paths.
  - **Title format:** `<name> · <project> · gin-console`, and `gin-console` while loading.
  - **Last opened mark:** 2 seconds, no motion under reduced motion.
  - **Out of scope:** the filter bar, the click rule, the Board and Focus panel and the `/` hint belong to epic gin-console-rm-beads-views.
- **Non-goals:**
  - Visual tokens.
  - New pages.
  - Report content.
  - Inner scrollers (canvases, details panel) keep their own scroll.

## Approach Options
### Option 1: Shared navigation modules in `app/`, tracks by concern
- **Summary:**
  - New modules: `project.ts`, `ProjectSwitcher.tsx`, `origin.ts`, `usePageTitle.ts`, `NotFoundPage.tsx`, `UnknownProject.tsx`, scroll keys in `route.ts`.
  - Pages call them.
  - One track per concern, in dependency order.
- **Pros:**
  - Each concern has one owner module and its own tests.
  - Reviews stay small.
  - Conflicts are avoided by running in order.
- **Cons:** nine tracks; several touch the same pages one after another.

### Option 2: One track per page
- **Summary:** change each page for every concern at once.
- **Pros:** each page is touched once.
- **Cons:**
  - The shared modules would be written by whichever page comes first.
  - Reviews mix concerns.
  - A defect in the project rules spreads across every page track.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** the rules (resolution order, origin, restore) are what reviewers must check carefully, so each gets its own module, test file and review; the page edits after them are small.

## Scope
- **In scope:** the seven added and eight modified REQs of `02-spec-delta.md`, their gin-qa cases and e2e specs, and TC-1.
- **Out of scope:** the non-goals above and epic gin-console-rm-beads-views.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: One lane (roadmap AI capacity 1); later tracks edit the same pages and Layout as earlier ones, so they run in order on feat/navigation-shell.
```

## Tasks
### Track 1: Current project store
- **Dependencies**: none
- **Requirements**: REQ-UI-124
- **Files**:
  - Create `frontend/src/app/project.ts`
  - Test `frontend/src/app/project.test.ts`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a small module with an exact resolution order, storage fallbacks and URL rules; every later track builds on it.
- **Acceptance criteria**:
  - Each scenario of REQ-UI-124 that concerns resolution, memory, the favorite, a removed project and refused storage has a unit test named for it.
  - `switchProject` follows REQ-UI-123's URL rules.
  - `pnpm -C frontend test --run src/app/project.test.ts`, `typecheck` and `lint` pass.
- **Estimated complexity**: medium

Interfaces produced (`@/app/project`):
- `TAB_PROJECT_KEY = "gin-console-project"`, `FAVORITE_KEY = "gin-console-favorite-project"`
- `resolveProject(asked: string, names: readonly string[]): string`: `asked` when in `names`; else the tab choice, else the favorite, else `names[0]` (skipping ones not in `names`); `""` when `names` is empty.
- `isUnknownProject(asked: string, names: readonly string[]): boolean`: `asked !== "" && asked !== "all" && !names.includes(asked)`.
- `rememberProject(name: string): void` (tab choice) and `setFavorite(name: string | null): void`.
- `useFavorite(): string | null` and `useTabProject(): string | null` (`useSyncExternalStore`, like `app/theme.ts`).
- `projectHref(path: "/beads" | "/milestones" | "/reports", project: string): string`, which returns `path` when `project` is `""`.
- `switchProject(pathname: string, search: string, name: string): string`. It returns:
  - for `/beads`, `/milestones` and `/reports`: the same path with `project` replaced, keeping only `view`, `closed`, `tab`, `days` and `q`;
  - for `/beads/<p>/<id>` and `/beads/<p>/graph...`: `/beads?project=<name>`;
  - for `/milestones/<p>/<id>`: `/milestones?project=<name>`;
  - otherwise the unchanged `pathname + search`.
- `useConfiguredProjects(): { status: "loading" } | { status: "error"; message: string } | { status: "ok"; names: string[] }`: `fetchProjectBeads()` filtered to `exists`, cached per page load (a module promise) and dropped by `forgetConfiguredProjects()`. Layout calls that on Refresh.

Steps:
1. Write `frontend/src/app/project.test.ts` first. Cover:
   - `resolveProject` order: URL; tab over favorite; favorite in a new tab; first project; removed favorite skipped; empty list → `""`.
   - `isUnknownProject` for `"zzz"`, `""` and `"all"`.
   - `rememberProject`/`setFavorite` surviving a throwing `Storage.prototype.setItem` (vi.spyOn) for the visit.
   - `switchProject` for `/beads?project=a&view=board&milestone=m1&status=open&q=x` → `/beads?project=b&view=board&q=x`, for `/reports?project=a&tab=quality&days=7&member=ann` → `/reports?project=b&tab=quality&days=7`, `/beads/a/a-1` → `/beads?project=b`, `/milestones/a/m1?tab=beads` → `/milestones?project=b`, `/my-tasks?project=a` unchanged, and `/` unchanged.
   - `projectHref("/beads", "")` → `/beads`.

   Name each test after its REQ, e.g. `it("REQ-UI-124 prefers the tab's choice to the favorite", …)`. Run `pnpm -C frontend test --run src/app/project.test.ts`. Expected: it fails because `./project` is missing.
2. Write `frontend/src/app/project.ts`:
   - Storage readers and writers in the `theme.ts`/`returnState.ts` style: try/catch with an in-memory value set on every write, and a listener set notified on change.
   - `resolveProject`, `isUnknownProject`, `projectHref` and `switchProject` as pure functions over `URLSearchParams`. Build query strings with `URLSearchParams` and `?` only when non-empty.
   - `useConfiguredProjects` with a module-level `let loading: Promise<string[]> | null`.

   Run the test. Expected: all pass.
3. Run `pnpm -C frontend typecheck` and `pnpm -C frontend lint`. Commit: `git commit -m "feat(frontend): current project store with favorite and tab memory (gin-console-rm-nav-shell)"`

### Track 2: Project switcher and navigation links
- **Dependencies**: Track 1
- **Requirements**: REQ-UI-123, REQ-UI-055, REQ-UI-124
- **Files**:
  - Create `frontend/src/app/ProjectSwitcher.tsx`
  - Test `frontend/src/app/ProjectSwitcher.test.tsx`
  - Modify `frontend/src/app/Layout.tsx:10-16` (NAV `to` for Beads, Milestones and Reports from `projectHref`), `:66-81` (phone top bar), `:91-107` (sidebar header), and the Refresh handler (`forgetConfiguredProjects()` before `onRefreshed`)
  - Modify `frontend/src/app/Layout.test.tsx` (the REQ-UI-055 link list now carries `?project=`, plus switcher placement cases)
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** one new component on the existing base-ui popover pattern (`features/beads/MultiSelectPopover.tsx`) and link edits in Layout.
- **Acceptance criteria**:
  - Every REQ-UI-123 scenario and the REQ-UI-055 and REQ-UI-124 "Links carry the project" scenarios have tests.
  - The favorite is listed first with `aria-pressed`.
  - The rail shows a letter button labelled `Project: <name>`, and the phone top bar holds the switcher.
  - The frontend checks pass.
- **Estimated complexity**: medium

Interfaces consumed: `useConfiguredProjects`, `resolveProject`, `rememberProject`, `setFavorite`, `useFavorite`, `useTabProject`, `switchProject`, `projectHref` (Track 1).
Interfaces produced: `ProjectSwitcher({ variant }: { variant: "sidebar" | "rail" | "bar" })`.

Steps:
1. Write `ProjectSwitcher.test.tsx` with stubbed `fetch` for `/api/projects/beads` (pattern: `app/App.test.tsx` `json` helper). Cover: the current project named, the favorite first and pressed, the star toggling `setFavorite`, a choice calling `navigate(switchProject(...))` and `rememberProject`, and each `variant`'s accessible name. Run. Expected: it fails.
2. Implement `ProjectSwitcher.tsx` with the base-ui `Popover` used by `MultiSelectPopover.tsx`: a trigger button with the current project (sidebar: name and "<n> projects"; rail: first letter; bar: name), and a list of options, each with a star toggle button (`aria-pressed`, label "Make <name> the favorite" or "Remove <name> as favorite"). Run. Expected: pass.
3. In `Layout.tsx`:
   - Compute `const project = resolveProject(new URLSearchParams(search).get("project") ?? "", names)` from `useLocation()` and `useConfiguredProjects()`.
   - Build the Beads, Milestones and Reports `to` with `projectHref`.
   - Render `ProjectSwitcher` in the sidebar header (`variant="sidebar"` when wide, `"rail"` otherwise) and in the phone header (`variant="bar"`).
   - Call `forgetConfiguredProjects()` in the Refresh path.
   - Update `Layout.test.tsx` for the new hrefs and placements. Run the app tests.
4. Run the four frontend checks. Commit: `git commit -m "feat(frontend): project switcher and project-carrying navigation (gin-console-rm-nav-shell)"`

### Track 3: Pages follow the current project
- **Dependencies**: Track 1
- **Requirements**: REQ-UI-124, REQ-UI-023, REQ-UI-088, REQ-UI-126
- **Files**:
  - Create `frontend/src/app/UnknownProject.tsx`
  - Test `frontend/src/app/UnknownProject.test.tsx`
  - Modify `frontend/src/features/beads/BeadsPage.tsx:37-79` (`resolveProject` instead of `names[0]`, write `project` with `replace` when missing, remove the project `<select>` at lines 64-79, show `UnknownProject` when `isUnknownProject`)
  - Modify `frontend/src/features/milestones/MilestonesPage.tsx:26-55` (the same, removing its `<select>` near line 46)
  - Modify `frontend/src/features/reports/ReportsPage.tsx:61,102,150-155` (default from `resolveProject` unless `project=all`; a single project chosen calls `rememberProject`; unknown → `UnknownProject`)
  - Modify `frontend/src/features/my-tasks/MyTasksPage.tsx:60,99` (a single project chosen calls `rememberProject`; the default stays All)
  - Modify `frontend/src/features/beads/BeadDetailPage.tsx` and `frontend/src/features/milestones/MilestonePage.tsx` (`rememberProject(project)` once the project is known to be configured; `UnknownProject` when the path project is not)
  - Modify the tests that pin the old default and selects: `frontend/src/features/beads/BeadsPage.test.tsx`, `frontend/src/features/milestones/*.test.tsx`, `frontend/src/features/reports/ReportsPage.test.tsx`, `frontend/src/features/my-tasks/MyTasksPage.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** the same small change on five pages, with tests that pinned the first-project default to update.
- **Acceptance criteria**:
  - Every scenario of REQ-UI-023, REQ-UI-088 (default and choice), REQ-UI-126 and the page scenarios of REQ-UI-124 ("Last chosen beats the favorite", "My Tasks keeps all projects") has a test.
  - No page shows another project for an unknown name.
  - The frontend checks pass.
- **Estimated complexity**: medium

Interfaces produced: `UnknownProject({ name, names, hrefOf }: { name: string; names: readonly string[]; hrefOf: (project: string) => string })`, which renders "No project <name> is configured" and one link per project.

Steps:
1. Write `UnknownProject.test.tsx`. Add page tests:
   - `/beads?project=zzz` shows the notice and requests no beads.
   - `/beads` with tab choice `b` writes `?project=b` with `replace`.
   - `/beads/zzz/z-1` shows the notice and leaves `useTabProject()` unchanged.
   - Reports `project=all` is accepted.
   - My Tasks opens on All.

   Run. Expected: they fail.
2. Implement `UnknownProject.tsx` and the five page changes above. Use `isUnknownProject(asked, names)` before resolving. Write the resolved project into the URL with `navigate(..., { replace: true })` only when `project` is missing.
3. Update the old tests that expected `names[0]` or the removed selects. Run the four frontend checks. Commit: `git commit -m "feat(frontend): pages follow the current project and name unknown projects (gin-console-rm-nav-shell)"`

### Track 4: Not found, page titles and skip link
- **Dependencies**: Track 1, Track 3
- **Requirements**: REQ-UI-125, REQ-UI-063, REQ-UI-128, REQ-UI-057 ("Address of a retired page")
- **Files**:
  - Create `frontend/src/app/NotFoundPage.tsx`, `frontend/src/app/usePageTitle.ts`
  - Test `frontend/src/app/NotFoundPage.test.tsx`, `frontend/src/app/usePageTitle.test.tsx`
  - Modify `frontend/src/app/App.tsx` (an explicit `/` match for Projects; the fallback renders `NotFoundPage`)
  - Modify `frontend/src/app/Layout.tsx` (skip link as the first child; `<main id="main" tabIndex={-1}>`)
  - Modify `frontend/src/app/App.test.tsx` (the REQ-UI-057 retired-address test now expects "Page not found")
  - Modify the pages to call `usePageTitle`: `features/projects/ProjectsPage.tsx`, `features/beads/BeadsPage.tsx`, `features/my-tasks/MyTasksPage.tsx`, `features/milestones/MilestonesPage.tsx`, `features/milestones/MilestonePage.tsx`, `features/reports/ReportsPage.tsx`, `features/beads/BeadDetailPage.tsx`
  - Modify `frontend/src/app/document.test.ts:9-11` (the `index.html` title stays `gin-console` as the loading title; rename the test to "REQ-UI-063 starts with the loading title")
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** two small shared pieces and one-line calls in each page, plus the router fallback.
- **Acceptance criteria**:
  - Every scenario of REQ-UI-125, REQ-UI-063 and REQ-UI-128 has a test.
  - `/nope`, `/sessions`, `/sessions/alpha/s-1` and `/quota` render "Page not found" with no nav link marked.
  - `/` still renders Projects.
  - The frontend checks pass.
- **Estimated complexity**: medium

Interfaces produced:
- `usePageTitle(name: string | null, project?: string | null): void`. It sets `document.title` to `[name, project, "gin-console"].join(" · ")` without empty parts, or `gin-console` when `name` is null, and restores `gin-console` on unmount:
  ```ts
  import { useEffect } from "react";

  export function usePageTitle(name: string | null, project?: string | null): void {
    const title = name === null ? "gin-console" : [name, project, "gin-console"].filter((part): part is string => Boolean(part)).join(" · ");
    useEffect(() => {
      document.title = title;
      return () => {
        document.title = "gin-console";
      };
    }, [title]);
  }
  ```
- `NotFoundPage({ path }: { path: string })`. It uses `useConfiguredProjects` and `resolveProject("", names)` for the Beads link and calls `usePageTitle("Page not found")`.

Steps:
1. Write the tests:
   - `usePageTitle` for a name, a name with a project, null, and unmount.
   - `NotFoundPage` for its heading, path, links and title.
   - The `App.test.tsx` cases for `/nope`, `/quota` and `/sessions/alpha/s-1` showing "Page not found" with no `aria-current` link, and `/` still showing Projects.
   - A `Layout.test.tsx` case: Tab from the body focuses "Skip to content", and Enter moves the focus to `main`.

   Run. Expected: they fail.
2. Create the two modules. In `App.tsx` match `pathname === "/"` for `ProjectsPage` and render `<NotFoundPage path={pathname} />` in the final branch. Add the skip link (`<a href="#main" className="sr-only focus:not-sr-only …">Skip to content</a>`, with `onClick` focusing `#main`) and `id="main" tabIndex={-1}` on `<main>` in `Layout.tsx`.
3. Call `usePageTitle` in each page, with exactly the names of REQ-UI-063:
   - "Projects"
   - "Beads"
   - "My Tasks"
   - "Milestones"
   - the milestone title once loaded
   - `` `Reports · ${tabLabel}` `` with the project unless `all`
   - the bead title once loaded

   Pass `null` while loading.
4. Run the four frontend checks. Commit: `git commit -m "feat(frontend): not-found page, page titles and skip link (gin-console-rm-nav-shell)"`

### Track 5: Origin and breadcrumb names
- **Dependencies**: Track 2, Track 3
- **Requirements**: REQ-UI-072, REQ-UI-073, REQ-UI-057
- **Files**:
  - Create `frontend/src/app/origin.ts` (`git mv frontend/src/features/beads/returnState.ts frontend/src/app/origin.ts`, then extend it)
  - Modify every importer of `returnState`: `frontend/src/features/beads/BeadsPage.tsx:7,46`, `frontend/src/features/beads/ListView.tsx:10,31`, `frontend/src/features/beads/Breadcrumb.tsx:3,44`, `frontend/src/features/milestones/MilestonePage.tsx:8,46`, and their tests
  - Modify `frontend/src/features/my-tasks/MyTasksPage.tsx`, `frontend/src/features/reports/ReportsPage.tsx` and `frontend/src/features/projects/ProjectsPage.tsx` (call `rememberOrigin` on show)
  - Modify `frontend/src/features/beads/Breadcrumb.tsx` (names of REQ-UI-072, titles cut to one line with the full title and id as `title`)
  - Modify `frontend/src/app/Layout.tsx:10-16` (`current()` for bead pages reads the origin)
  - Test `frontend/src/app/origin.test.ts`, `frontend/src/features/beads/Breadcrumb.test.tsx`, `frontend/src/features/beads/ReturnFlow.test.tsx`, `frontend/src/app/Layout.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `high`
- **Why:** a cross-module refactor of the remembered place used by six pages, the breadcrumb and the navigation, with many pinned tests and project rules for which origin applies.
- **Acceptance criteria**:
  - Every scenario of REQ-UI-072, REQ-UI-073 and REQ-UI-057 has a test, including "From My Tasks", "My Tasks with all projects", "Bead page from My Tasks" and "Bead page by address".
  - No import of `features/beads/returnState` remains.
  - The frontend checks pass.
- **Estimated complexity**: high

Interfaces produced (`@/app/origin`), extending the current `returnState` API:
- `type OriginKind = "beads" | "milestone" | "my-tasks" | "reports" | "projects"`
- `type Origin = { kind: OriginKind; path: string; search: string; project: string | null; label: string | null; open: Record<string, string[]> }`. `project` is `null` for Projects, My Tasks with All and Reports with `all`. `label` is the milestone title.
- `rememberOrigin(kind: OriginKind, path: string, search: string, project: string | null, label?: string | null): void`, which replaces `rememberPlace`. `rememberSearch` becomes `rememberOrigin("beads", "/beads", search, project)`.
- `useOrigin(): Origin`, `getOrigin(): Origin`, `rememberOpen` and `clearReturn` (renamed `clearOrigin`). The storage key stays `gin-console-beads-return`, so a reload keeps the place. Old saved values without `kind` parse as `beads`.
- `originFor(beadProject: string, origin: Origin): Origin | null`: the origin when `origin.project` is `null` or equals `beadProject`, else `null` (the breadcrumb then uses `/beads?project=<beadProject>` and the nav marks Beads).

Steps:
1. `git mv` the module. Update the imports, and run the suite to confirm nothing changed (green).
2. Write the new tests:
   - The `origin.test.ts` parse of old values, `originFor` and storage refused.
   - Breadcrumb names per REQ-UI-072 scenario: "Beads › Board · 2 filters" then the bead title, the parent title link, "Checkout v2 › Board · 1 filter", and "My Tasks".
   - `ReturnFlow.test.tsx` "My Tasks with all projects".
   - The `Layout.test.tsx` bead page marking: from My Tasks → My Tasks, by address → Beads.

   Run. Expected: they fail.
3. Implement:
   - The `Origin` fields.
   - `rememberOrigin` calls in Beads (kind `beads`), the milestone page (every tab: kind `milestone`, `label` the milestone title), My Tasks, Reports (project or `null` for `all`) and Projects.
   - Breadcrumb labels: take the parent and bead titles from the loaded `BeadDetail` and the project's `fetchBeads` list the page already has; when a parent title is not loaded, show its id.
   - Layout `current()` for `/beads/<p>/<id>`: `originFor(p, getOrigin())?.kind` mapped to My Tasks, Milestones, Reports or Projects, else Beads.
4. Run the four frontend checks. Commit: `git commit -m "feat(frontend): origin-aware breadcrumbs by name and navigation marking (gin-console-rm-nav-shell)"`

### Track 6: Back to your place
- **Dependencies**: Track 5
- **Requirements**: REQ-UI-127
- **Files**:
  - Modify `frontend/src/app/route.ts:1-29` (history entry keys, saving the leaving position and the opened bead, `useRestoreOnBack`)
  - Modify `frontend/src/main.tsx` (`history.scrollRestoration = "manual"` once)
  - Modify `frontend/src/features/beads/BeadCard.tsx` and `frontend/src/features/beads/GraphNode.tsx` (add `data-id={bead.id}` like `ListRow.tsx:49`)
  - Modify `frontend/src/index.css` (`[data-last-opened]` ring that fades over 2 s, none under `prefers-reduced-motion`)
  - Modify the pages to call `useRestoreOnBack(ready)`: `features/projects/ProjectsPage.tsx`, `features/beads/BeadsView.tsx`, `features/my-tasks/MyTasksPage.tsx`, `features/milestones/MilestonesPage.tsx`, `features/milestones/MilestonePage.tsx`, `features/reports/ReportsPage.tsx`
  - Test `frontend/src/app/route.test.ts`, `frontend/src/app/restore.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `high`
- **Why:** browser history timing: keys on replaced and pushed entries, a synthetic popstate versus a real Back, waiting for data before scrolling, and focus without scrolling twice.
- **Acceptance criteria**:
  - Every REQ-UI-127 scenario has a test, with `window.scrollTo`, `history` and `sessionStorage` stubbed: Back to a long list, last opened card, link starts at the top, storage refused.
  - The saved positions are capped at 50 entries.
  - The frontend checks pass.
- **Estimated complexity**: high

Interfaces produced (`@/app/route`):
- `navigate(to, options)` keeps its signature. Before a push it saves `{ y: window.scrollY, opened }` for the current entry key in `sessionStorage` `gin-console-scroll`. `opened` is the id when `to` is `/beads/<p>/<id>`, else `null`. It then pushes `{ key: newKey() }`; a replace keeps the current key. Every entry gets a key on first use through `history.replaceState`.
- `navigate` marks its own popstate as synthetic. A real browser popstate sets `cameBack = true` for the entry it lands on.
- `useRestoreOnBack(ready: boolean): void`. When `cameBack` and a position exists for the current key, and once `ready`, it:
  1. scrolls with `window.scrollTo(0, y)`;
  2. focuses `document.querySelector(`[data-id="${CSS.escape(opened)}"]`)` with `focus({ preventScroll: true })`;
  3. sets `data-last-opened` for 2000 ms.

  Otherwise it does nothing. The page then starts at the top, because `scrollRestoration` is manual and `navigate` scrolls to the top after a push.

Steps:
1. Write `route.test.ts` cases for the keys, the saved position on push, the cap at 50, and refused storage. Write `restore.test.tsx` rendering a tall list with `data-id` rows under a stubbed `cameBack`, checking `scrollTo`, focus and the attribute removal after `vi.advanceTimersByTime(2000)`. Run. Expected: they fail.
2. Implement in `route.ts`. Add `window.scrollTo(0, 0)` after a push. Add the `index.css` rule and the `data-id` attributes. Call `useRestoreOnBack` in each page with its "data shown" flag (Beads: the views' loaded state in `BeadsView.tsx`; Reports: the report loaded).
3. Run the four frontend checks. Commit: `git commit -m "feat(frontend): back to your place with scroll and last opened bead (gin-console-rm-nav-shell)"`

### Track 7: Report sections in the sidebar
- **Dependencies**: Track 2
- **Requirements**: REQ-UI-129, REQ-UI-095
- **Files**:
  - Create `frontend/src/features/reports/sectionStore.ts`
  - Modify `frontend/src/features/reports/ReportsPage.tsx:190-201` (publish the sections, headlines and selected tab; wrap the `TabStrip` so it hides while the sidebar lists the sections)
  - Modify `frontend/src/app/Layout.tsx` (`data-sidebar="expanded|collapsed"` and `group/shell` on the root; under the Reports link, while `pathname === "/reports"` and expanded, the section links, shown only from `lg`)
  - Test `frontend/src/features/reports/sectionStore.test.ts`, `frontend/src/app/Layout.test.tsx`, `frontend/src/features/reports/ReportsPage.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a small store on the `useSyncExternalStore` pattern and CSS-driven visibility, with links that reuse the page's `reportSearch`.
- **Acceptance criteria**:
  - Every REQ-UI-129 scenario has a test, and the REQ-UI-095 tests still pass.
  - The section links carry the current query with `tab` replaced.
  - No section links show on other pages.
  - The frontend checks pass.
- **Estimated complexity**: medium

Interfaces produced (`@/features/reports/sectionStore`):
- `type SectionLink = { tab: ReportTab; label: string; headline: string; warn: boolean; href: string }`
- `publishSections(sections: readonly SectionLink[], selected: ReportTab): void`, `clearSections(): void`, `useSections(): { sections: readonly SectionLink[]; selected: ReportTab | null }`

Steps:
1. Write the store test and the Layout and ReportsPage cases:
   - The sidebar lists the six sections with headlines on `/reports?project=a&tab=delivery` when expanded.
   - Clicking Quality navigates to `?…&tab=quality`.
   - Nothing is listed on `/beads`.
   - `TabStrip`'s wrapper has the class that hides it while `data-sidebar=expanded` at `lg`.

   Run. Expected: they fail.
2. Implement the store. Publish from `ReportsPage` in an effect: the headline text from `headlines.ts`, `href` from `reportSearch({ ...filters, tab })`. Clear on unmount. Render the links in `Layout.tsx`, and wrap `TabStrip` with `className="lg:group-data-[sidebar=expanded]/shell:hidden"`.
3. Run the four frontend checks. Commit: `git commit -m "feat(frontend): report sections in the sidebar (gin-console-rm-nav-shell)"`

### Track 8: QA cases and their tests
- **Dependencies**: Track 2, Track 3, Track 4, Track 5, Track 6, Track 7
- **Requirements**: REQ-UI-123, REQ-UI-124, REQ-UI-125, REQ-UI-126, REQ-UI-127, REQ-UI-128, REQ-UI-129, REQ-UI-023, REQ-UI-055, REQ-UI-057, REQ-UI-063, REQ-UI-072, REQ-UI-073, REQ-UI-088, REQ-UI-095
- **Files**:
  - Create cases in `qa/cases/ui/` (e2e) for every scenario of the added REQs and the changed scenarios of the modified REQs
  - Modify, re-pin or remove the cases pinned to the modified REQs, as `gin-qa cases plan --change gin-console-rm-nav-shell` lists them
  - Create or modify the e2e specs of those cases under `qa/e2e/ui/`, setting localStorage `gin-console.email` with `addInitScript` and stubbing `/api/*` with `qa/e2e/support/api.ts`
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** cases from written scenarios and specs in existing patterns, with one judgement per pinned case.
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-rm-nav-shell` prints `ok`.
  - `gin-qa cases plan --change gin-console-rm-nav-shell` lists nothing missing or stale.
  - `gin-qa e2e plan` lists none of these cases as missing or stale.
  - `npx playwright test qa/e2e/ui qa/e2e/beads qa/e2e/milestone-ui qa/e2e/reports --trace off --workers 4` passes on the built UI.
- **Estimated complexity**: medium

Steps:
1. Run `gin-qa cases plan --change gin-console-rm-nav-shell` and `gin-qa cases check --change gin-console-rm-nav-shell`. Write, update, re-pin and remove cases per `qa/guidelines.md`: explicit URLs, one action per step, stubbable preconditions.
2. Write or update the e2e specs. Build the UI, run the specs and fix them until they pass. Report a product defect instead of changing product code.
3. Commit: `git commit -m "test(qa): cases and e2e specs for the navigation shell (gin-console-rm-nav-shell)"`

### Track 9: Check on the deployed console
- **Dependencies**: Track 1, Track 2, Track 3, Track 4, Track 5, Track 6, Track 7, Track 8
- **Requirements**: REQ-UI-123, REQ-UI-124, REQ-UI-125, REQ-UI-126, REQ-UI-127, REQ-UI-128, REQ-UI-129, REQ-UI-057, REQ-UI-063, REQ-UI-072
- **Files**:
  - Modify `docs/changes/gin-console-rm-nav-shell-navigation/05-tests.md` (TC-1 result)
  - Create `qa/evidence/<date>-nav-shell-tc1/` (gitignored, kept on disk)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** run the written check and record it.
- **Acceptance criteria**: TC-1 is recorded as `pass, claude (Playwright on the Tailscale build of <commit>, N/N checks, screenshots in qa/evidence/...)`, every expectation of TC-1 is a scripted check or is named as seen in a screenshot, and no page error occurred.
- **Estimated complexity**: low

Steps:
1. Deploy the branch to the systemd service, one command at a time: `pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile`, `pnpm -C /home/gin/gin-fam/gin-console/frontend build`, `uv --directory /home/gin/gin-fam/gin-console/backend sync`, `systemctl --user restart gin-console`, `systemctl --user is-active gin-console`, and `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/health`. Expected: `active` and `200`.
2. Write a Playwright script outside the repo and run it with `NODE_PATH=/home/gin/scotty/node_modules node <script> qa/evidence/<date>-nav-shell-tc1`:
   - Set localStorage `gin-console.email`; use 1440×900 at deviceScaleFactor 2, and a 900px pass for the report sections.
   - Make one check per TC-1 expectation, each in try/catch with a screenshot, and fail on any `pageerror`.
   - Save `results.json` and the script.
3. Look at the key screenshots, then record TC-1 in `05-tests.md` with the exact N/N count of `results.json`. Commit: `git commit -m "test(specs): TC-1 passed by Playwright (gin-console-rm-nav-shell)"`

## Integration
- **Branch**: `feat/navigation-shell`
- **Merge strategy**: sequential

## Validation
- [ ] `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass; `uv run --directory backend pytest` still passes.
- [ ] `gin specs lint --change gin-console-rm-nav-shell --against master` prints `ok`, and `gin specs trace --change gin-console-rm-nav-shell` lists no missing REQ.
- [ ] `gin-qa cases check --change gin-console-rm-nav-shell` prints `ok`.
- [ ] TC-1 passed on the deployed console.

## Notes
- The user may override `Model:` and `Effort:` before approval.
- The parent bead stays open until a human confirms the merge. Each track bead closes when its tests and review pass.
- Line numbers come from `master` at 204378f and may drift by a line or two after earlier tracks; anchor edits on content.
- Epic gin-console-rm-beads-views depends on this epic and will change `BeadFilterBar`, the click rule and the Board and Focus panel; this plan does not touch them.
