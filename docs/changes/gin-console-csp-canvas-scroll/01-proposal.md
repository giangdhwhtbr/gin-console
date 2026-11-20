# Graph and Lanes canvas usability

Epic: gin-console-csp
Kind: capability
Date: 2026-11-20

## Why

On 2026-11-20 the user reported that the Lanes view scrolls badly. There are scroll bars on both the canvas and the page, and with the mouse over the Lanes view the page does not scroll down, so the user has to move the mouse out to the page first. A browser check (Playwright, Chromium, 1440×900 and 1920×1080) found two causes.

- **Scroll chaining is blocked.** The canvases of the Lanes view, the Graph view and the lane boxes carry `overscroll-behavior: contain` (`frontend/src/features/beads/LanesCanvas.tsx:75`, `LaneGraphCanvas.tsx:67`, `GraphCanvas.tsx:54`). This stops a wheel over the canvas from reaching the page, even on an axis the canvas cannot scroll or when it is at its end. The living REQ-UI-077 "Wheel" scenario says the page scrolls as usual without `Ctrl`.
- **Two vertical scrollers are nested.** The canvas height is fixed at `calc(100dvh - 14rem)`, its bottom lies below the window, and the page scrolls as well.

Later the same day the user asked for two more changes to the Graph view of an epic with lanes (epic gin-console-5qw):
- The details panel on the right must stay closed when the Graph opens, and open only when a bead is clicked.
- The lane boxes are stacked top to bottom, which is hard to read on a wide screen and leaves the right of the graph empty.

They were folded into this epic, because they touch the same canvases and the same reading goal.

User decision 2026-11-20:
- The canvas grows to its content height and scrolls only sideways.
- The page is the one vertical scroller. A plain wheel over the canvas scrolls the page, and `Ctrl`/`⌘` with the wheel still zooms.
- "Fit to view" fits the width.
- The details panel keeps its own scroll (REQ-UI-078).
- The Graph and Lanes views open with no bead selected and no details panel.
- The lane boxes are laid out in tiers from left to right (mockup C, `docs/changes/gin-console-csp-canvas-scroll/assets/mockup-c.html`, `assets/c-light.png`):
  - the boxes of a tier stand one under another;
  - arrows between lanes run from left to right into the left edge of the waiting box;
  - chips sit in the gap between tiers;
  - arrows of lanes in a loop run in a channel below the boxes.
- This ships before epic gin-console-atl.

## What Changes

- **Canvas height:** the Graph view, lane box and Lanes view canvases are as tall as their content at the current scale.
- **Scrolling:**
  - The canvases scroll only sideways, with `overscroll-behavior-x: contain` so a sideways trackpad swipe at an edge does not go back in history.
  - A plain wheel or vertical swipe over a canvas scrolls the page.
- **Fit to view:** fits the width, never above 100%.
- **No default selection:** the Graph view (and the Lanes view, which follows it) selects nothing while `select` is absent, so the details panel opens only on a click or Enter.
- **Lane boxes left to right:**
  - Tiers run left to right, and the boxes of a tier stand one under another.
  - Cross-lane arrows end on the left edge of the waiting box.
  - Arrow Left and Arrow Right cross tiers along the arrows; Arrow Up and Arrow Down move between the boxes of a tier.

## User Stories

### US-1: Scroll the page from anywhere
As a team member, I want the page to scroll when I turn the wheel over the Graph or Lanes view, so that I can read a long view without moving the pointer to the page's edge.
REQ: REQ-UI-122, REQ-UI-077

Acceptance criteria:
- With the pointer over the Lanes view of `ex-e12` at 1440×900, a wheel turn scrolls the page.
- No vertical scroll bar shows on the canvas.
- With the pointer over the Graph view, the same holds.
- `Ctrl`+wheel still changes the zoom.

### US-2: Room for the graph
As a team lead, I want the Graph of an epic to open without the details panel and its lanes laid out across the width, so that a wide screen shows the whole epic without empty space on the right.
REQ: REQ-UI-106, REQ-UI-117

Acceptance criteria:
- Opening the Graph view of `ex-e12` shows no details panel; clicking a card opens it.
- Boxes be, fe and infra stand in the first tier on the left, and qa and "No lane" stand to their right.
- The arrows into qa run from left to right with the Waiting and Merged chips between the tiers.

## Capabilities Affected

- `ui`: ADDED REQ-UI-122; MODIFIED REQ-UI-077, REQ-UI-106, REQ-UI-117.
  - Mockup: `docs/changes/gin-console-csp-canvas-scroll/assets/mockup-c.html` (variant C), `assets/c-light.png`, `assets/c-dark.png`.
- Assets: none.

## Assumptions

- REQ-UI-122 is used instead of the next free id (REQ-UI-119), because the open change of epic gin-console-atl already holds REQ-UI-119 to REQ-UI-121.
- The Dependencies page shares `GraphCanvas`, so it scrolls the same way until gin-console-atl retires it.
- A very tall graph makes the page long. The breadcrumb, filters and zoom buttons scroll away with the page.

## Non-goals

- Changing how the details panel scrolls (REQ-UI-078), the Gantt or the List view.
- The Lanes view layout (rows stay top to bottom).
- Virtual scrolling for very large graphs.

## Success Criteria

- Every scenario of REQ-UI-122 and the modified REQ-UI-077 has an automated test that carries its REQ-ID, with the wheel scenarios checked in a browser.
- TC-1 passes on the deployed console:
  - A wheel over the Lanes view and the Graph view of `ex-e12` scrolls the page at 1440 and 1920px.
  - The readability check reports no finding on those pages at 390, 1024, 1440 and 1920px in both themes.
