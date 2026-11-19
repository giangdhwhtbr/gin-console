# Readable UI

Epic: gin-console-3rr
Kind: capability
Date: 2026-11-19

## Why

On 2026-11-19 the user found Gantt label text running over the bars at a wide window and a bead page whose facts ("Owner … · Assignee … · Created … · Points 8 (…) · 0 comments") are one faint run with no label/value distinction and no emphasis on the story points, and asked for an audit of the whole UI. The audit (47 pages × 9 widths × light and dark, projects `example` and `qwikfone`, report `/tmp/ui-audit/report.md`) found:
- Gantt (high): the label's second line spills over the bars (every item `shrink-0` in a `lg:flex-nowrap` row); titles after bars cross the end and today lines and show through the label column when scrolled; the "End" header label overlaps the month label; lines and arrows cut label text; points, days left and closed tracks are one muted line, and the spec state shows twice (grey "No confirmed spec" and an orange warning).
- Bead page and details panel (high): one muted `" · "`-joined run; dates with seconds; status shown as raw `in_progress`; priority as plain text.
- Beads views (medium): points only from `@xl` and muted in List rows; no size on Board and Focus cards.
- Milestone page (medium): the velocity line is one run of one style.
- Reports (medium): a long email runs under the tokens column of AI usage; the tab list is cut at 768/1024px with no hint; milestone ids at 3.1:1 contrast in the Team and Velocity tabs.
- Low: label chips cut without an ellipsis; a few chart labels touching; the Projects card does not stress blocked work.
No page scrolls sideways at any width; muted text elsewhere is at 6.2:1 or more.

User decisions 2026-11-19: the bead page gets a badge row and a label/value fact grid; the Gantt label column gets wider (fixed, by window width) and the days move right.

## What Changes

- Shared pieces: a label/value fact list, a priority pill (P0 destructive, P1 warning), a size badge ("<p> pt" or "<n>d"), and the existing state mark for status.
- Bead page and details panel: badge row (status, priority, size), points reason line, fact grid (Owner, Assignee, Created by, Created, Updated, Comments) with dates without seconds.
- List rows, Board and Focus cards: the size badge at every width.
- Gantt: label column 300/380/440px by window width; second line led by the size badge and cut with an ellipsis; spec state once; tail titles stop before end/today lines and never show through the label column; header labels and lines never cross label text.
- Milestone page velocity line, Reports tables and tab list, contrast of milestone ids, label chips, chart labels, Projects blocked count.
- A reusable readability check (overlap, spill, contrast) from the audit scripts, run in TC-1.

## User Stories

### US-1: Read a bead at a glance
As a team member, I want a bead's state, priority and size up front and its facts as clear label/value pairs, so that I can read it without parsing a grey sentence.
REQ: REQ-UI-028, REQ-UI-110, REQ-UI-109

Acceptance criteria:
- The bead page of an in-progress P1 epic with 5 points shows "In progress", "P1" and "5 pt" as badges, the points reason on its own line, and Owner, Assignee, Created by, Created, Updated and Comments as label/value pairs, dates without seconds.

### US-2: See size everywhere a bead is listed
As a team lead, I want each epic's points (or days) on its List row, Board and Focus card at every width, so that I can weigh work without opening it.
REQ: REQ-UI-109, REQ-UI-065, REQ-UI-110

Acceptance criteria:
- The size badge "5 pt" shows on the row at 390px and 1440px and on the card.

### US-3: A Gantt whose text never collides
As a team lead, I want the Gantt labels and titles to stay readable at any width, so that the plan is legible on a large screen and a phone.
REQ: REQ-MILESTONE-UI-013, REQ-UI-110

Acceptance criteria:
- At 2000px the label column is 440px, its second line starts with the size and is cut with an ellipsis inside the column, and no label text crosses a bar or line.
- A title after a bar ends with an ellipsis before the end line.

### US-4: Nothing important hides
As a team member, I want blocked work, hidden tabs and cut text to be visible as such, and all text legible in both themes.
REQ: REQ-UI-004, REQ-UI-095, REQ-UI-110

Acceptance criteria:
- A project's blocked count above 0 is in the warning color with an icon.
- The Reports tab list fades at an edge with hidden tabs.
- The readability check finds no overlap, spill or low contrast on the listed pages, widths and themes.

## Capabilities Affected

- `ui`: ADDED REQ-UI-110; MODIFIED REQ-UI-004, REQ-UI-028, REQ-UI-065, REQ-UI-095, REQ-UI-109.
  - Diagram: `docs/specs/ui/diagrams/readability-check-activity.md`.
- `milestone-ui`: MODIFIED REQ-MILESTONE-UI-013.
- Assets: none.

## Non-goals

- Data or API changes; the Graph view's nodes (184px wide) keep their content.
- A resizable Gantt label column.
- A redesign of colors or the theme beyond the contrast fix.

## Success Criteria

- Every scenario of the ADDED and MODIFIED requirements has an automated test that carries its REQ-ID (layout scenarios by the readability check in Playwright).
- TC-1 passes on the deployed console: the readability check reports no finding on the listed pages at 390, 1024, 1440 and 1920px in both themes, with screenshots.
