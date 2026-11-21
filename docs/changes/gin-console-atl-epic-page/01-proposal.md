# Epic page

Epic: gin-console-atl
Kind: capability
Date: 2026-11-20

## Why

On 2026-11-20 the user looked for the Lanes view of an epic from the epic's page and could not find it. "View dependencies" opens the separate Dependencies page, which has no view tabs and therefore no Lanes view. The user found the epic page sparse (facts, description and a plain children list) and the Dependencies page clunky: it is a second graph next to the Graph view, without its filters.

User decisions 2026-11-20 (mockup in `docs/specs/ui/assets/2026-11-21/epic-page/`):
- **Page shape:** the epic page gets tabs: Overview · Graph · Lanes · Discussion.
- **Overview:** shows Progress, Workflow and Milestone cards, a Lanes summary, a Tracks table and the description.
- **Graph tab:** the Graph view of the Beads page with the epic as the scope, with the lane boxes of epic gin-console-5qw.
- **Lanes tab:** the existing Lanes view.
- **Discussion tab:** the existing discussion.
- **Dependencies page:** retired. Its routes go to the Graph tab or to the Graph view.
- **Order:** this work comes after epics gin-console-5qw and gin-console-csp.

Update 2026-11-21, after gin-console-csp shipped (merge 99f06d6), confirmed by the user:
- **No default panel:** the Graph and Lanes tabs open with nothing selected and no details panel; the panel opens on a click or Enter (REQ-UI-106 as shipped). REQ-UI-051 and REQ-UI-052 follow: no scope bead selected at first, and Escape selects nothing.
- **Lane tiers:** the lane boxes of the Graph tab run in tiers from left to right (REQ-UI-117 as shipped). The Graph tab shots of the mockup show the older top-to-bottom tiers; the shipped layout wins.
- **Scroll and zoom:** the page is the one vertical scroller and Fit to view fits the width (REQ-UI-122, REQ-UI-077 as shipped). REQ-UI-077 and REQ-UI-106 are rewritten on the shipped text, and REQ-UI-122 drops the canvas of the Dependencies page.
- **Assets:** the epic-page mockup moved from the confirmed folder `assets/2026-11-20/` to `assets/2026-11-21/`.

Comments considered: 3, latest 2026-11-20T15:57:50Z

## What Changes

- **Epic page (`issue_type` epic) layout:**
  - **Header:** title, badges and facts, kept above the tabs.
  - **Tabs:** Overview, Graph, Lanes (only when the epic has lanes) and Discussion (N). The open tab is kept in the URL as `tab`.
- **Overview cards:**
  - **Progress:** tracks by state as a segmented bar with counts, points done of total, open bugs and prep tasks.
  - **Workflow:** the gin-workflow stage, the gates, warnings and waivers, read through a new read-only endpoint that runs `gin state --workflow-id <epic>`.
  - **Milestone:** status, window, working days left and forecast.
- **Overview, below the cards:**
  - **Lanes summary:** one coloured row per lane.
  - **Tracks table:** sortable by any column. Merge gates appear in the Blocked by column, not as rows.
  - **Description.**
- **Dependencies page retired:**
  - `/beads/<p>/graph` and `/beads/<p>/<id>/graph` redirect.
  - "View dependencies" becomes the Graph tab on an epic and "View in graph" on other beads.
  - The requirements that named the page now name the Graph view.

## Dropped with the Dependencies page

Behaviour that only the retired page had, and that the Graph view does not take over:
- **Heading bar:** the bar over the graph (scope id and title, "n of m done") is gone. The breadcrumb and the epic's Progress card cover it.
- **Scope relations:** the links to the beads that block the scope and that it blocks, each to their Dependencies page, are gone. The bead page lists them.
- **Hide done and closed beads:** the switch "Hide done" goes, and the graph no longer draws closed beads whatever "Show closed" says. The Graph view follows "Show closed".
- **Going down:** double-click, then going back with the browser restoring the selection, is replaced. Opening a node with children sets the scope, and the breadcrumb goes up.
- **Neighbourhood graph:** the graph of a bead without children (its blockers above it, the beads it blocks below) is replaced by its parent's Graph view with the bead selected.
- **Jump buttons:** the buttons "n blockers" / "n blocked" under 1024px are gone.
- **Empty and error states:** the page's own states go: "No dependencies", "No beads in this project", "No blocking relations between these tasks" and "No dependencies between these beads". The Graph view's "No beads match these filters" and the Beads page's loading and error states take their place.

## User Stories

### US-1: An epic at a glance
As a team lead, I want an epic's progress, workflow stage, milestone, lanes and tracks on one page, so that I know where the epic stands without opening other pages.
REQ: REQ-UI-119, REQ-UI-120, REQ-UI-121, REQ-BEADS-020

Acceptance criteria:
- The page of `ex-e12` opens on Overview.
- Progress reads "4 of 8 tracks closed · 50%" with Done 4, In progress 1, Ready 2 and Blocked 1.
- The Workflow card shows the stage that `gin state` reports.
- The Milestone card shows `ex-m2` with its window.
- The Lanes summary shows be, fe, infra and qa.
- The Tracks table lists 8 tracks and no merge gate.

### US-2: Graph and Lanes from the epic
As a team member, I want the epic's graph and lanes as tabs of its page, so that I reach them from the epic without a second graph page.
REQ: REQ-UI-119, REQ-UI-053, REQ-UI-075, REQ-UI-106

Acceptance criteria:
- The Graph tab of `ex-e12` shows the Graph view with `ex-e12` as the scope, with its filters.
- The Lanes tab shows the Lanes view.
- `/beads/example/ex-e12/graph` shows the page of `ex-e12` with the Graph tab.

## Capabilities Affected

- `ui`:
  - ADDED: REQ-UI-119, REQ-UI-120, REQ-UI-121.
  - MODIFIED: REQ-UI-048, REQ-UI-049, REQ-UI-050, REQ-UI-051, REQ-UI-052, REQ-UI-053, REQ-UI-054, REQ-UI-072, REQ-UI-075, REQ-UI-077, REQ-UI-078, REQ-UI-079, REQ-UI-081, REQ-UI-106, REQ-UI-122.
  - REMOVED: REQ-UI-076, REQ-UI-080.
  - Assets: `docs/specs/ui/assets/2026-11-21/epic-page/mockup/index.html`, `docs/specs/ui/assets/2026-11-21/epic-page/shots/overview-light.png`.
  - Diagrams: `docs/specs/ui/diagrams/epic-page-activity.md`; `docs/specs/ui/diagrams/details-panel-activity.md` (no default selection, no Dependencies page).
- `beads`:
  - ADDED: REQ-BEADS-020.
  - Diagram: `docs/specs/beads/diagrams/epic-workflow-activity.md`.

## Assumptions

- Only beads of type `epic` use the tabbed page. Tasks and bugs keep the current page.
- The details panel of the Beads views keeps its compact form with "Open page".
- An epic page keeps the discussion column rule of REQ-UI-068 inside its Discussion tab: with no comments, the tab reads "Discussion (0)" and shows "No comments".
- Points are the sum of the tracks' `points`. The card says "No points" when no track has points.
- The Workflow card shows "No workflow" when `gin state` reports no stage for the epic, and the error when it fails.

## Non-goals

- New data for tasks and bugs pages.
- Editing anything from the epic page: the console stays read-only.
- Lane colours outside the Graph boxes and the epic page (Lanes summary rows and the lane chips of the Tracks table).

## Success Criteria

- Every scenario of the ADDED, MODIFIED and REMOVED requirements has an automated test that carries its REQ-ID, or its removal is reflected in the tests.
- TC-1 passes on the deployed console: the readability check reports no finding on the epic page tabs of `ex-e12` and `ex-e3` at 390, 1024, 1440 and 1920px in both themes, and screenshots match the confirmed mockup.
