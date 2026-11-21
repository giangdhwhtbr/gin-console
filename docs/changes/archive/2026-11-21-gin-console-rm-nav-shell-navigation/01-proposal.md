# Navigation shell

Epic: gin-console-rm-nav-shell
Kind: capability
Date: 2026-11-21

## Why

The UX review of 2026-11-21 (team lead, PM, member and newcomer walkthroughs) found that moving between pages is the main discomfort:
- Each page chooses its own project, so every navigation click falls back to the first project.
- Breadcrumbs show ids, and a bead opened from My Tasks or a milestone highlights "Beads".
- Every browser tab is titled `gin-console`.
- `/nope` silently shows Projects, and `/beads?project=zzz` silently shows another project.
- Back loses the scroll position and the row just opened.
- There is no skip link.

Epic gin-console-rm-retire-sessions-quota shipped on 2026-11-21 (merge 863f6d7): the navigation has five links, and `/sessions` and `/quota` now render Projects until this epic adds a not-found page.

User decisions 2026-11-21:
- **Project:** one current project for the whole console. "All projects" stays an option inside My Tasks and Reports.
- **Favorite:** a favorite project, pinned with a star in the switcher. The order is the URL, then the project last chosen in the browser tab, then the favorite, then the first configured project.
- **Reports sections:** listed under Reports in the sidebar from 1024px; a tab list below that.
- **Split:** the one-line filter bar, the click rule (select and open the details panel in every view), the Board and Focus details panel and the visible `/` hint move to a new epic, "Beads views interaction", added through `/gin:roadmap`.

## What Changes

- **Project switcher:** sits at the top of the sidebar, as a letter button in the rail, and in the phone top bar. It has a favorite star. The Beads and Milestones pages lose their own project select.
- **Current project:** the Beads, Milestones and Reports links carry `?project=`, and those pages write the project into the URL when it is missing.
- **Names in the breadcrumb:** it shows the place the bead was opened from (Beads view, milestone, My Tasks, Reports or Projects), the parent's title and the bead's title. The navigation marks that place.
- **Page titles:** one per page, such as `Team checkout · example · gin-console`.
- **Not-found page:** for unknown paths, including `/sessions` and `/quota`. Unknown project names get a notice with links to the configured projects.
- **Back to your place:** Back and Forward restore the scroll position and focus the bead the user opened.
- **Skip link:** "Skip to content".
- **Report sections in the sidebar:** listed under Reports in a wide window with the sidebar expanded.

## User Stories

### US-1: Keep my project
As a team lead, I want the console to stay on the project I chose, and to open on my favorite project, so that I never have to pick the project again on every page.
REQ: REQ-UI-123, REQ-UI-124, REQ-UI-055, REQ-UI-023, REQ-UI-088

Acceptance criteria:
- After choosing `qwikfone` on the Beads page, the Milestones and Reports links open `qwikfone`.
- With `example` as the favorite, a new browser tab opens `/beads` on `example`.
- My Tasks still opens with "All projects".

### US-2: Know where I am
As a PM, I want names instead of ids in the breadcrumb, the navigation to mark where I came from, and each browser tab to be named for its page, so that I can tell where I am and go back.
REQ: REQ-UI-072, REQ-UI-073, REQ-UI-057, REQ-UI-063

Acceptance criteria:
- A bead opened from the Checkout v2 milestone shows "Checkout v2 › …" then the bead's title, and Milestones is marked.
- The browser tab of that bead reads `<bead title> · example · gin-console`.

### US-3: Wrong addresses say so
As a newcomer, I want an unknown address or project to say so and offer a way on, so that I am never shown another project's data by mistake.
REQ: REQ-UI-125, REQ-UI-126

Acceptance criteria:
- `/nope` and `/quota` show "Page not found" with links to Projects and Beads.
- `/beads?project=zzz` says "No project zzz is configured" with links to the configured projects.

### US-4: Back to where I was
As a team member, I want the browser Back button to return me to the same place in the list, with the bead I opened in focus, so that I can work through a long list.
REQ: REQ-UI-127, REQ-UI-128

Acceptance criteria:
- Back from a bead page restores the List scroll position and focuses the opened row.
- Tab then Enter on a fresh page skips to the main content.

### US-5: Report sections at hand
As a PM, I want the report sections in the sidebar on a wide screen, so that one click reaches any section from the place I look for navigation.
REQ: REQ-UI-129, REQ-UI-095

Acceptance criteria:
- At 1440px the sidebar lists the six sections with their headlines under Reports, and the page has no tab list.
- At 900px the page shows its tab list.

## Capabilities Affected

- `ui`:
  - ADDED: REQ-UI-123, REQ-UI-124, REQ-UI-125, REQ-UI-126, REQ-UI-127, REQ-UI-128, REQ-UI-129.
  - MODIFIED: REQ-UI-023, REQ-UI-055, REQ-UI-057, REQ-UI-063, REQ-UI-072, REQ-UI-073, REQ-UI-088, REQ-UI-095.
  - Diagrams: `docs/specs/ui/diagrams/current-project-activity.md`, `docs/specs/ui/diagrams/back-to-place-activity.md`.
  - Use cases: `docs/specs/ui/use-cases/switch-project.md`, `docs/specs/ui/use-cases/return-to-place.md`.
  - Direction preview of 2026-11-21 (not a confirmed asset, kept outside the repository): boards beads, epic and reports.
- Assets: none.

## Assumptions

- **Single-project choices:** a single project chosen in the Reports or My Tasks project select also becomes the current project; "All projects" changes nothing.
- **Origin marking:** the navigation marks the origin only for a bead opened from that page in the same browser tab. A bead opened by its address marks Beads.
- **Report sections:** they keep their `tab` query, with no new paths, so shared links and REQ-REPORTS scenarios stay valid.
- **Title separator:** ` · ` joins the parts of a browser title.
- **Last opened mark:** it lasts 2 seconds. The scroll restore waits for the page's data before scrolling.
- **Restore scope:** the restore covers whole-page scrolling. Inner scrollers (canvases, the details panel) keep their own behaviour.
- **Unknown project:** an unknown project in the path of a bead or milestone page shows the notice of REQ-UI-126. An unknown bead or milestone in a known project keeps its current "not found" message.

## Non-goals

- The one-line filter bar, the shared click rule, the Board and Focus details panel and the `/` hint (new epic "Beads views interaction").
- Visual tokens and the look of the switcher beyond the current components (epic gin-console-rm-strung).
- New pages, a cross-project overview (epic gin-console-rm-overview), report content (epic gin-console-rm-reports-status).

## Success Criteria

- Every scenario of the added and modified REQs has a test that names its REQ.
- `gin specs lint --change gin-console-rm-nav-shell --against master` prints `ok`, and `gin specs trace` lists no missing REQ.
- TC-1 passes on the deployed console:
  - The project and favorite carry across pages.
  - The breadcrumbs show names.
  - Tab titles are set.
  - `/nope` and `/quota` show "Page not found".
  - Back restores the scroll position and the focus.
  - The report sections show in the sidebar at 1440px.
