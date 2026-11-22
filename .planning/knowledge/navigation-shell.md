# Navigation shell: current project, origin, titles and Back

**Context**
The UX review of 2026-11-21 found that every page picked its own project, breadcrumbs showed ids, every tab was titled `gin-console`, unknown paths silently showed Projects, and Back lost the scroll position. Epic gin-console-rm-nav-shell (2026-11-21) moved navigation state into shared modules in `frontend/src/app/`.

**Decision/Solution**
- **Current project:** `frontend/src/app/project.ts`.
  - Resolution order: the URL `project`, then the browser tab's last choice (`sessionStorage` `gin-console-project`), then the starred favorite (`localStorage` `gin-console-favorite-project`), then the first configured project. Names no longer configured are skipped.
  - `useConfiguredProjects` caches one `/api/projects/beads` load per page load. `forgetConfiguredProjects` (called on Refresh) bumps a version, so a mounted hook refetches.
  - `switchProject` keeps only `view`, `closed`, `tab`, `days` and `q` when the project changes.
  - "All projects" stays inside My Tasks (default) and Reports (`project=all`) and never becomes current.
- **Switcher:** `ProjectSwitcher.tsx` has three variants: sidebar from 1024px, a letter button in the rail, and the phone top bar. The Beads and Milestones pages have no project select of their own.
- **Unknown project:** `UnknownProject.tsx` shows "No project <name> is configured" and makes no data request. `ProjectGuard` wraps the bead and milestone pages and shows "Loading projects…" while the list loads.
- **Origin:** `frontend/src/app/origin.ts`, moved from `features/beads/returnState.ts`.
  - Fields: `kind` (`beads`, `milestone`, `my-tasks`, `reports`, `projects`), `project` (null for Projects, My Tasks with All and Reports with `all`), `label` (the milestone title) and `open`. The storage key `gin-console-beads-return` is unchanged.
  - `originFor` decides whether the breadcrumb's first link and the marked nav link use the origin.
  - The parent title in the breadcrumb comes from the loaded bead's `parent-child` dependency, with no extra request.
- **Titles and Not found:**
  - `usePageTitle(name, project)` joins the parts with ` · ` and resets to `gin-console`. Document titles are the one place that keeps ` · ` (REQ-UI-139, style guard).
  - `NotFoundPage` is the router fallback; `/` matches Projects explicitly.
  - The details panel (an embedded `BeadDetailPage`) never retitles the page.
- **Back:** `route.ts` gives every history entry a `{key}` in `history.state`.
  - A push saves `{y, opened}` for the leaving entry in `sessionStorage` `gin-console-scroll` (50 entries) and scrolls to the top.
  - Only a real browser popstate marks an arrival; `navigate`'s own popstate is synthetic and clears it.
  - `useRestoreOnBack(ready)` scrolls once the data is shown, or to the top when nothing is saved. It then focuses `[data-id=<opened>]` and sets `data-last-opened` for 2 s, using a module-level timer.
  - `history.scrollRestoration` is `manual` (`main.tsx`).
- **Report sections:** `features/reports/sectionStore.ts`. ReportsPage publishes the sections and headlines; Layout lists them under Reports while the sidebar is expanded from `lg`. The page's tab list hides through `lg:group-data-[sidebar=expanded]/shell:hidden`.

**Consequences**
- **Test isolation:** the stores are module state that survives between vitest cases. Page tests reset them in `beforeEach` (`setFavorite(null)`, `rememberProject(...)`, `forgetConfiguredProjects()`, `clearOrigin()`) or re-import with `vi.resetModules()`.
- **Bead stubs:** stubs that need a parent title must include the `parent-child` relation (`qa/e2e/support/shell.ts` `detailOf`).
- **Playwright names in e2e:**
  - The switcher is `<project> N projects` (sidebar), `Project: <name>` (rail), or `<name>` in the banner (phone).
  - Report tabs exist only below 1024px. Wider, use the "Report sections" list in the Main nav.
- **Sticky sidebar:** the sidebar is not sticky, so its links scroll away with a long page (TC-UI-243 dispatches the click). Epic gin-console-rm-strung should make the shell sticky.
- **Tab list fade:** `TabStrip` observes each tab as well as the list, so the fade follows headlines that load late (bug gin-console-rm-nav-shell.10).

**References**
- Change: `docs/changes/archive/*-gin-console-rm-nav-shell-navigation/`; diagrams `docs/specs/ui/diagrams/current-project-activity.md`, `back-to-place-activity.md`; use cases `docs/specs/ui/use-cases/switch-project.md`, `return-to-place.md`.
- Evidence: `qa/evidence/2026-11-21-nav-shell-tc1/`.
- Beads: gin-console-rm-nav-shell (tracks .1 to .9, bug .10); next: gin-console-rm-beads-views (filter bar, click rule).
- Related: [epic-page](epic-page.md), [beads-filters-and-epic-kind](beads-filters-and-epic-kind.md), [retired-sessions-quota](retired-sessions-quota.md).

**Scope**
Anything that reads or changes the current project, links between pages, breadcrumbs, browser titles, unknown paths, Back behaviour and the sidebar.
