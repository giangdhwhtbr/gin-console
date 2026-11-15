# Details panel only while a bead is selected

Epic: gin-console-be9
Kind: capability
Date: 2026-11-15

## Why

From 1024px, the List view always keeps two fifths of the page for a details panel. The Graph view and the Dependencies page keep a third. When nothing is selected, that space only says "Select a bead to see its details". The user asked to hide the empty panel, let the list or graph use the full width, show the panel when a bead is selected, and hide it again when the selection is cleared.

## What Changes

- The List view, the Graph view and the Dependencies page show no details panel while nothing is selected. The list or graph then takes the full width. Selecting a bead brings the panel back beside it, as today.
- The panel has a button "Close details" that clears the selection, hides the panel and moves focus back to the row or node that was selected.
- Escape clears the selection:
  - **List view:** outside text fields. Escape in the search box still clears its text first.
  - **Graph view and Dependencies page:** in two steps. The first Escape returns to the scope bead, as today. The next Escape selects nothing.
- The Graph view and the Dependencies page select the scope bead when the URL has no `select`. Closing the panel there keeps `select=none` in the URL, so a reload keeps it closed. On the project scope nothing is selected at first, so the graph starts at full width.
- Under 1024px, nothing changes. A List row opens the bead page, and the graph shows the panel below it while a bead is selected.

## User Stories

### US-1: Use the full width when nothing is selected
As a team member, I want the list or graph to use the whole page until I pick a bead, so that I see more rows and nodes, and I want the details beside it once I pick one.
REQ: REQ-UI-045, REQ-UI-051, REQ-UI-106

Acceptance criteria:
- At 1280px with no `select`, the List view has no details panel, and its rows span the content width.
- Selecting a row shows the panel and narrows the list. Closing the panel restores the full width.
- The Graph view on the project scope starts without a panel.

### US-2: Close the details quickly
As a keyboard or mouse user, I want to close the details with a button or Escape, so that I can return to the full list or graph without losing my place.
REQ: REQ-UI-045, REQ-UI-051, REQ-UI-052

Acceptance criteria:
- "Close details" and Escape clear the selection, and focus returns to the row or node that was selected.
- Escape in the search box clears the text and keeps the selection.
- On the page of an epic, the first Escape from another node selects the epic again. The second Escape closes the panel with `select=none`, and a reload keeps it closed.

## Capabilities Affected

- `ui`: MODIFIED REQ-UI-045, REQ-UI-051, REQ-UI-052, REQ-UI-106.
  - Diagram: `docs/specs/ui/diagrams/details-panel-activity.md`.
- Assets: none.

## Non-goals

- Changing the panel's content, its sticky scrolling (REQ-UI-078) or the layout under 1024px.
- Animating the panel.
- A resizable panel.

## Success Criteria

- Every scenario of the MODIFIED requirements has an automated test that carries its REQ-ID.
- TC-1 passes on the deployed console with the example project, checked by Playwright with screenshots at 1440×900.
