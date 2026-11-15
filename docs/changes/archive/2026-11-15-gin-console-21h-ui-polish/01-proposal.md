# UI polish: long text, long ids and graph layout

Epic: gin-console-21h
Kind: capability
Date: 2026-11-15

## Why

A sweep of every page with long titles, long ids, a long email assignee and wide Markdown found layout bugs at 1440px and 390px. The sweep used the long-text data of the example project (`scripts/make_example_project.py`, `long_text()`), with evidence in `qa/evidence/2026-11-15-long-text/` and `qa/evidence/2026-11-15-long-text-2/`.
- A long id hides the title in the List view.
- An unbroken title or email overflows a Board card and scrolls the page sideways.
- Wide Markdown, a long heading and the Reports Team selects scroll the page sideways on a phone.
- The Gantt label of an epic is squeezed to a few pixels on a phone.
- Graph nodes clip their title and cannot tell long child ids apart.
- Cut text has no tooltip.
- One milestone without dates breaks the whole Milestones page.

Separately, nodes without dependencies sit in one wide row, so "Fit to view" shrinks the graph to 40–77%.

Confirmed summary: the scope is the 11 items of the epic description. gin-console-agw (prep chips, the source of the crowded List row) shipped without changing it, and gin-console-8i7 moved the milestone Graph tab into the shared `GraphView`, so the graph items apply to the Graph view, the milestone Beads tab and the Dependencies page alike.

Comments considered: 1, latest 2026-11-15T06:05:49Z

## What Changes

- A shared rule for long text:
  - Unbroken words wrap inside their box.
  - An id longer than 24 characters is shortened to its first 14 characters, "…" and its last 9, with the full id as `title`, wherever it is cut.
  - Every ellipsis has the full text as `title`.
  - No page scrolls sideways at 360px and wider.
- List rows keep at least 8rem for the title and never lose their open/close control.
- Graph nodes keep their state on one line. Nodes without any arrow are placed apart, below the layers, in rows of 3 under "n without dependencies". This applies to the Graph view and the Dependencies page.
- Board cards wrap their title and assignee.
- Under 1024px the Gantt label wraps its second line instead of cutting every item.
- The Reports Team selects fit the panel.
- The Milestones API accepts a list entry without dates. The list shows "No dates" and the entry's error, and the other milestones as usual.

## User Stories

### US-1: Long text stays readable
As a team member, I want long titles, ids and names to stay readable without the page scrolling sideways, so that I can scan any view on a laptop or a phone.
REQ: REQ-UI-107, REQ-UI-044, REQ-UI-065, REQ-UI-049, REQ-MILESTONE-UI-013, REQ-REPORTS-012

Acceptance criteria:
- At 1440px and 390px, no page of the long-text sweep scrolls sideways.
- In the List view, the row of `ex-payments-provider-migration-and-reconciliation-2026` shows its open/close control, `ex-payments-pr…tion-2026` and the start of its title.
- Child ids `….2.1` and `….2.1.1` read differently on rows and nodes.
- Every text cut with an ellipsis shows the full text on hover.

### US-2: Graph without a wide row of loose nodes
As a team member, I want nodes without dependencies grouped apart from the chains, so that the graph stays readable without zooming out.
REQ: REQ-UI-048

Acceptance criteria:
- An epic with 7 unlinked tasks draws them in rows of 3, 3 and 1 under "7 without dependencies".
- Linked nodes keep their layers and arrows above that group.

### US-3: A milestone without dates does not break the page
As a team lead, I want the Milestones page to list every milestone even when one has no dates, so that one unfinished milestone does not hide the others.
REQ: REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-008

Acceptance criteria:
- `GET /api/milestones` answers 200 when an entry has `start: null` and `end: null`.
- The list shows that entry with "No dates" and its error, and the other milestones as usual.

## Capabilities Affected

- `ui`: ADDED REQ-UI-107. MODIFIED REQ-UI-044, REQ-UI-048, REQ-UI-049, REQ-UI-065.
  - Diagram: `docs/specs/ui/diagrams/graph-layout-activity.md`.
- `milestone-ui`: MODIFIED REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-008, REQ-MILESTONE-UI-013.
- `reports`: MODIFIED REQ-REPORTS-012.
- Assets: none.

## Non-goals

- Middle truncation of titles (titles are cut at the end).
- Changing node size or the layer algorithm for linked nodes.
- Opening the milestone page of an undated milestone beyond showing gin's error.
- Changing gin-workflow.

## Success Criteria

- Every scenario of the ADDED and MODIFIED requirements has an automated test that carries its REQ-ID.
- TC-1: the long-text sweep finds no page overflow, no offscreen text, no squeezed item and no cut text without `title` at 1440×900 and 390×844.
