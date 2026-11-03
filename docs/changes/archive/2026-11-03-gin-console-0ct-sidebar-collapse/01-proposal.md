# Sidebar collapse

Epic: gin-console-0ct
Date: 2026-11-02

## Why
From 1024px the "Main" navigation is a sidebar 224px wide (REQ-UI-056). On a laptop it takes space from wide pages such as the Board, the Gantt and the dependency graph, and the user cannot narrow it.

## What Changes
1. **Collapse control**: from 1024px an icon button next to the theme control collapses the sidebar and expands it again.
2. **Controls at the top**: the theme and collapse controls move from the bottom of the navigation column to its top, as icons: on the brand mark's row on the expanded sidebar, under the brand mark on the icon rail. The column grows with the page, so at the bottom they were off-screen on long pages. Decided 2026-11-03 (user).
3. **Collapsed look**: a collapsed sidebar looks like the 80px icon rail used from 768px to 1023px: a label under each icon and the brand mark without its word.
4. **Remembered**: the choice is kept in the browser and used on the next visit. The sidebar starts expanded when no choice is stored.

## User Stories

### US-1: Make room for wide pages
As a user on a laptop, I want to collapse the sidebar to an icon rail, so that wide pages get more width.
REQ: REQ-UI-094, REQ-UI-056

Acceptance criteria:
- From 1024px a "Collapse sidebar" icon button is shown on the brand mark's row at the top of the sidebar, next to the theme control; below 1024px it is not shown.
- On a page taller than the window, the theme and collapse controls are visible without scrolling.
- Pressing it turns the sidebar into the 80px icon rail with a label under each icon, and the button becomes "Expand sidebar".
- Pressing "Expand sidebar" restores the 224px sidebar.
- The collapsed rail still holds the five links of the "Main" navigation and marks the current page.

### US-2: Keep my choice
As a user, I want the console to remember that I collapsed the sidebar, so that I do not collapse it on every visit.
REQ: REQ-UI-094

Acceptance criteria:
- After collapsing the sidebar and reloading the page, the sidebar is collapsed.
- With no stored choice the sidebar is expanded.
- If the browser refuses to store the choice, the button still collapses and expands the sidebar for the current visit, without an error.

## Capabilities Affected
- `ui`: REQ-UI-094 added; REQ-UI-056 modified so that a collapsed sidebar is the icon rail from 1024px.

## Non-goals
- Collapsing or hiding the navigation below 1024px: the tab bar and the tablet rail stay as they are.
- An icon-only rail or tooltips on the links. Decided 2026-11-02 (user): the tablet rail, labels stay visible.
- A sticky sidebar. Decided 2026-11-03 (user): move the controls to the top instead.
- A keyboard shortcut, and an animation of the width change.
- Any backend change.

## Success Criteria
- On a 1280px window, collapsing the sidebar gives the page 144px more width, and the choice survives a reload.
- Vitest cases carry REQ-UI-094; `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
