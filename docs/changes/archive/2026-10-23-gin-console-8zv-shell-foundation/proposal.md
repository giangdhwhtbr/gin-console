# Visual foundation and responsive app shell

Epic: gin-console-8zv
Date: 2026-10-22

## Why
The console looks like the stock shadcn theme: grey on grey, no identity, no way to switch to dark although the dark tokens exist, and a fixed 208px sidebar that crowds a phone. Status is shown as plain text, so the one thing the app exists to show, the state of the work, has no visual language. The user wants the console to be comfortable on a phone, a tablet and a laptop.

## What Changes
- A cool neutral palette in light and dark, with colour kept for status only (ready, in progress, blocked, done, deferred) and priority shown by weight, not by new hues.
- Geist for the interface and Geist Mono for ids and paths.
- A theme that follows the system, with a toggle that remembers the choice and no flash on load.
- One navigation landmark that is a bottom tab bar under 768px, an icon rail from 768px and a sidebar from 1024px.
- Pages never scroll sideways at 360px; wide content scrolls inside its own box.
- The page title becomes `gin-console` instead of `frontend`.

Design reference: https://claude.ai/artifact/WTC31iQ9PznEVjY79rAYgG (private; its boards Laptop, Tablet, Phone and Palette are the target; the dependencies and filter boards belong to later changes).

## User Stories

### US-1: Use the console on a phone
As a developer away from my desk, I want the console to fit my phone and be reachable with a thumb, so that I can check on my agents' work anywhere.
REQ: REQ-UI-055, REQ-UI-056, REQ-UI-057, REQ-UI-061, REQ-UI-062

Acceptance criteria:
- Under 768px the four destinations are a tab bar at the bottom of the screen.
- No page scrolls sideways at 360px.
- Buttons and links of the navigation are at least 44px high.

### US-2: Choose light or dark
As a developer, I want the console to follow my system theme and let me override it, so that it is easy to read in any light.
REQ: REQ-UI-058

Acceptance criteria:
- The first visit follows `prefers-color-scheme`.
- A toggle switches the theme and the choice is kept on reload.
- There is no flash of the wrong theme while the page loads.

### US-3: Read status at a glance
As a developer, I want status to have its own colours and nothing else to compete with them, so that I can see what is ready, blocked or done without reading.
REQ: REQ-UI-059, REQ-UI-060

Acceptance criteria:
- Five status colours exist for light and dark and meet the contrast ratios.
- Ids and paths use the monospace face.

### US-4: Know where I am
As a developer, I want the current destination marked and the tab named, so that I do not get lost between pages.
REQ: REQ-UI-057, REQ-UI-063

Acceptance criteria:
- The current destination has `aria-current="page"`.
- The browser tab says `gin-console`.

## Capabilities Affected
`ui`: three navigation requirements modified (the word "sidebar" becomes "navigation"), nine added.

## Non-goals
Per-page reflow of Board, tables, Tree, Projects, Sessions and Quota (they only get the no-sideways-scroll guarantee), the Beads filters (assignee, sprint, labels), the dependency graph per bead, a brand colour, a logo file.

## Success Criteria
On a phone, a tablet and a laptop, in light and dark, every page is usable, the navigation fits the screen, and status colours read the same everywhere. `pnpm typecheck`, `lint`, `test --run` and `build` pass.
