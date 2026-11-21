# Design: Navigation shell

Epic: gin-console-rm-nav-shell

## Architecture

The console keeps its own small router (`frontend/src/app/route.ts`, `Link.tsx`) and adds no dependency. Navigation state lives in a few `app/` modules that every page uses instead of parsing it itself.

- **Current project:** `frontend/src/app/project.ts`, with `useCurrentProject()` and `projectLink()`.
  - It resolves the current project in the order of REQ-UI-124, from `GET /api/projects/beads` (already loaded by the pages).
  - The tab choice is in `sessionStorage` (`gin-console-project`), the favorite in `localStorage` (`gin-console-favorite-project`), both wrapped in try/catch with an in-memory fallback.
  - BeadsPage (`parseFilters` default), MilestonesPage, ReportsPage (`parseReportSearch` fallback) and the bead and milestone pages call it.
  - My Tasks keeps `""` as "All projects".
  - Pages missing `project` write it with `navigate(..., {replace: true})`.
- **Switcher:** `frontend/src/app/ProjectSwitcher.tsx`, a base-ui popover listing the projects with a star toggle. Layout renders it in the sidebar header, in the rail as a letter button, and in the phone top bar. Choosing a project calls `switchProject(pathname, search, name)`, which builds the next URL from the rules of REQ-UI-123.
  - The Beads page project select (`BeadsPage`) and the Milestones page select (`MilestonesPage`) are removed.
  - The Reports and My Tasks selects stay and call `rememberProject` for a single project.
- **Origin:** `features/beads/returnState.ts` moves to `frontend/src/app/origin.ts`. Its `{path, search, open}` gains `kind` (`beads`, `milestone`, `my-tasks`, `reports`, `projects`), `label` (milestone title) and `project`.
  - Projects, Beads, My Tasks, Reports and every milestone tab call `rememberOrigin`.
  - `Breadcrumb.tsx` names the first link from it, and takes the parent's and the bead's titles from the bead detail and the project's beads that the page already loads.
  - `Layout`'s `current()` rules read the origin for bead pages (REQ-UI-057).
- **Titles:** `frontend/src/app/usePageTitle.ts` sets `document.title` from parts and resets it to `gin-console` on unmount. Every page calls it with its name, project and loaded title.
- **Not found and unknown project:**
  - `frontend/src/app/NotFoundPage.tsx` replaces the `App.tsx` fallback for unknown paths. `/` keeps Projects, and `/sessions*` and `/quota` become unknown.
  - `frontend/src/app/UnknownProject.tsx` is shown by the pages when `project` (query or path) is not configured.
- **Back to your place:** `route.ts` gives every history entry a key in `history.state`.
  - Before `navigate` pushes and on `pagehide`, it saves `{scrollY, opened}` for the current key in `sessionStorage` (`gin-console-scroll`, capped at 50 entries).
  - On `popstate` it tells pages through `useRestoreOnBack(ready, openedSelector)`. Each list page calls it with "data shown" and a selector for the bead element (`[data-bead-id]`). The hook scrolls, focuses and adds `data-last-opened`, styled as a fading ring, or with no fade under `prefers-reduced-motion`.
  - `history.scrollRestoration` is set to `manual`.
- **Skip link:** the first child of `Layout`, which focuses `<main id="main" tabIndex={-1}>`.
- **Report sections:**
  - `ReportsPage` publishes its sections and headlines to a small store (`frontend/src/features/reports/sectionStore.ts`, a `useSyncExternalStore` like `theme.ts`).
  - `Layout` renders them under Reports when the sidebar is expanded at `lg`.
  - `ReportsPage` hides its `TabStrip` under the same condition (CSS `lg:` and the collapsed state).

## Data Flow

- `docs/specs/ui/diagrams/current-project-activity.md`: how a page picks its project and what the switcher does.
- `docs/specs/ui/diagrams/back-to-place-activity.md`: how the origin and the scroll position are remembered and restored.

No backend change: every project list comes from `GET /api/projects/beads`, and the SPA fallback already serves `index.html` for unknown paths.

## Error Handling

- **Storage refused:** every `sessionStorage` and `localStorage` access is wrapped, and the choice lasts for the visit (REQ-UI-124, REQ-UI-073, REQ-UI-127).
- **Project not configured:**
  - A stored or favorite project that is no longer configured is skipped.
  - An unknown project in the URL shows REQ-UI-126 and never replaces the current project.
- **Restore data:** if the page's data does not arrive (error state), the restore gives up and the page stays at the top. A restore never runs when the entry has no saved position.
- **Titles:** they fall back to `gin-console` while a name is loading or a request failed.

## Testing

- **vitest by REQ:**
  - `project.test.ts`: the resolution order, storage refused, a removed project, `switchProject` URL rules.
  - `ProjectSwitcher.test.tsx`: the favorite first, the star toggle, the rail and phone placement.
  - `Layout.test.tsx`: links carry the project, origin marking, the skip link, report sections.
  - `NotFoundPage.test.tsx` and `UnknownProject` cases on the Beads, Milestones, Reports and bead pages.
  - `Breadcrumb.test.tsx` and `ReturnFlow.test.tsx`: names and origins.
  - `usePageTitle` cases per page.
  - `route.test.ts`: history keys and scroll saving.
- **Changed existing tests:** those that pin the first-project default, the Beads page select, the `gin-console` title (REQ-UI-063) or id breadcrumbs.
- **gin-qa cases:** e2e cases for the added and modified REQs, and e2e specs for them under `qa/e2e/ui/`.
- **TC-1:** Playwright on the deployed console (05-tests.md).

## Open Technical Questions
