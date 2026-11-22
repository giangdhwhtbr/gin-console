# Strung visual system

Epic: gin-console-rm-strung
Kind: capability
Points: 13 (5 stories, 8 new and 33 changed REQs across every page, palette, type scale, 2 shared components, counts by state in 2 APIs, high: touches all screens)
Date: 2026-11-22

## Why

The UX review of 2026-11-21 found that the console has no visual identity and draws the same things in several ways:
- The type scale is flat: almost all text is 12, 14 or 20px, so a page title, a row title and a meta line look alike.
- There is no identity colour. The current place, the primary action and focus are all near-black.
- Teal means both "ready" and "closed": the Team scope bar draws closed beads in the Ready colour, and Done is grey elsewhere.
- Progress is drawn five ways (a progress bar on the bead page, two hand-made bars on the List and the Milestones list, a stacked bar on the epic page, a stacked bar in the Team tab) and written four ways ("3/5 closed", "3 of 5 done", "4 of 8 tracks closed · 50%", "3 of 4").
- A Gantt epic is a row of pills, one per working day, and its warnings stack one line each (up to nine kinds), so a risky epic takes four rows.
- Rows are crowded: a List row can carry up to 15 items, most of them pills (kind, prep, lane, size, type, priority, three labels, two counts).
- Labels are in capitals in the filter sheet and the epic cards, facts are joined by " · " in about 28 places, and navigation links are underlined.

The direction preview of 2026-11-21 ("Strung") answers this: beads are gemstones on a thread. Amethyst is the one identity colour; jade, lapis, amber and hematite say a state; a glyph's fill says how far a bead has come; a strand of beads draws progress everywhere. It is kept as the confirmed asset `docs/specs/ui/assets/2026-11-22/`.

User decisions 2026-11-22:
- **Typeface:** Recursive, from the `@fontsource-variable/recursive` file with the weight and Mono axes (about 73 KB for Latin), for both the Sans voice and the Mono voice of ids. Page titles use weight 680 without the Casual axis of the preview. The full file (305 KB) and Geist were not chosen.
- **Gantt verdict:** one verdict per row, the most severe warning, with "+n" when there are more and a tooltip listing them all. The row height no longer grows with the warnings.
- **Chips:** none for data. Pills stay for controls only (filter chips, toggles, segmented controls). Data on rows, cards, nodes and tables is plain text.
- **Approach:** semantic token names stay (`--state-*`, `--primary`, `--destructive`, `--ring`) with Strung values, plus `--identity` and `--identity-wash`. Two shared components, `StateGlyph` and `Strand`, replace the icons and the five progress drawings. The API adds counts by state to `child_counts` and to the Milestones list `epics`, so a strand is right whatever the filters.
- **State edge:** the 4px coloured left edge of cards and nodes goes; the glyph and the word say the state.
- **Gantt bars:** one continuous bar per epic in the look of its state glyph, the part past the milestone end hatched in amber.

Epic gin-console-rm-nav-shell shipped on 2026-11-21 (merge 2ca8410): the sidebar with the project switcher, breadcrumbs by name, page titles, the not-found page and the skip link are in place. This epic styles that shell and does not change its layout. The shell added strings with " · " (the breadcrumb "Board · 2 filters"), which this epic rewrites; the browser tab titles (`Team checkout · example · gin-console`) keep theirs. Epic gin-console-rm-definitions shipped on 2026-11-22 and gave `child_counts`, which the strand extends; it left "x/y closed" and "Prep x/y" in the Beads views for this epic to replace.

Comments considered: 1, latest 2026-11-21T16:00:33Z (the `[gin ship]` note that gin-console-rm-nav-shell shipped and its outcome may change this epic's needs).

## What Changes

- **Palette:** light and dark Strung values for every token; amethyst for where you are and what you can do; jade for Ready and Done, lapis for In progress, amber for Blocked and warnings, hematite for Deferred, carnelian for bugs and errors. The type colours of epic and feature go.
- **Typeface and type scale:** Recursive replaces Geist and Geist Mono; text only at 12, 13, 14, 16, 20, 28 and 40px; tabular figures everywhere.
- **State glyphs:** hollow (Ready), half (In progress), full (Done), knot (Blocked), dashed (Deferred), on every page, with the state's word; milestone statuses use the same glyphs.
- **Strand:** one drawing for progress on the List, the Graph, the bead page, the epic page, the lanes, the Milestones list, the Gantt and the Team scope, with "done/total" and an accessible sentence.
- **Calmer Gantt:** one continuous bar per epic and one verdict per row.
- **Plain text:** no capitals by style, no " · " in page text, no underlined navigation, no pills for data.
- **Identity in the shell:** current sidebar item, selected tab, selected row, active filter, primary button, focus ring and today line in amethyst; a brand mark of three beads on a thread.
- **API:** `child_counts` gains `in_progress`, `blocked`, `ready` and `deferred`; the Milestones list `epics` gains the same counts.

## User Stories

### US-1: Read a state at a glance
As a team member, I want each state to have its own shape and one colour that means only that state, so that I can tell ready from done and blocked from in progress without reading the word or relying on colour.
REQ: REQ-UI-059, REQ-UI-064, REQ-UI-067

Acceptance criteria:
- A ready bead shows a hollow ring and a done bead a full bead, both in jade; a blocked bead shows the amber knot.
- In grayscale, the five glyphs still differ by shape.
- Cards and nodes no longer have a coloured left edge.
- An active milestone reads "Active" after the half-filled glyph.

### US-2: See progress the same way everywhere
As a team lead, I want progress drawn as one strand of beads on every page, with the same count, so that I read an epic's or a milestone's progress in one look and the numbers never disagree.
REQ: REQ-UI-138, REQ-BEADS-022, REQ-MILESTONE-UI-025, REQ-UI-044, REQ-UI-028, REQ-UI-049, REQ-UI-120, REQ-UI-112, REQ-UI-118, REQ-UI-121, REQ-UI-130, REQ-UI-134, REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-015, REQ-REPORTS-013

Acceptance criteria:
- An epic with 2 done, 1 in progress, 1 blocked and 3 ready tracks shows 7 beads in that order and "2/7" on the List, the Graph node, the bead page and the Gantt.
- An epic with 19 tracks shows a segmented thread and "11/19".
- The epic page reads "4 done, 1 in progress, 1 blocked, 2 ready" under a large strand.
- "Show closed" off does not change any strand.
- The Milestones list draws each milestone's epics as a strand with their states.

### US-3: Know an epic's risk from one line
As a PM, I want each Gantt row to say one verdict, the most severe, and to list the rest on hover, so that I can scan a milestone without rows growing with every warning.
REQ: REQ-MILESTONE-UI-024, REQ-MILESTONE-UI-003, REQ-MILESTONE-UI-013, REQ-UI-132, REQ-UI-133

Acceptance criteria:
- An epic with three warnings shows "2 working days past the end +2", and its tooltip lists all three.
- A late epic shows its late verdict first, after the amber knot.
- Every epic row has the same height whatever its warnings.
- Each epic is one continuous bar in the look of its state; the part past the end is hatched in amber.

### US-4: Read pages without noise
As a newcomer, I want a clear type scale, one typeface and plain text instead of pills, capitals and dots, so that titles stand out and rows are easy to read.
REQ: REQ-UI-136, REQ-UI-137, REQ-UI-139, REQ-UI-140, REQ-UI-090, REQ-UI-065, REQ-UI-110, REQ-UI-109, REQ-UI-115, REQ-UI-116, REQ-UI-117, REQ-UI-003, REQ-UI-072, REQ-UI-095, REQ-MILESTONE-UI-023, REQ-REPORTS-012, REQ-REPORTS-016

Acceptance criteria:
- Page titles are 28px, row titles 14px and dates 12px, in Recursive; ids use its Mono voice.
- A List row of a P1 bug shows "bug" in carnelian, "P1" bold and its labels as plain text, with no pill.
- No page text contains " · ", and no label is in capitals by style.
- Breadcrumb and sidebar links are never underlined; a link in a description is.

### US-5: Always see where I am
As a team member, I want the current page, the selected row and focus marked in one identity colour, so that I always know where I am and what I can act on.
REQ: REQ-UI-141

Acceptance criteria:
- The current sidebar item has an amethyst bar and icon.
- The selected List row has a pale amethyst wash and a bar inside its left edge.
- The focus ring is amethyst.
- The sidebar header shows three beads on a thread before "gin-console".

## Capabilities Affected

- `ui`:
  - ADDED: REQ-UI-136, REQ-UI-137, REQ-UI-138, REQ-UI-139, REQ-UI-140, REQ-UI-141.
  - MODIFIED: REQ-UI-003, REQ-UI-028, REQ-UI-044, REQ-UI-049, REQ-UI-059, REQ-UI-064, REQ-UI-065, REQ-UI-067, REQ-UI-072, REQ-UI-090, REQ-UI-095, REQ-UI-109, REQ-UI-110, REQ-UI-112, REQ-UI-115, REQ-UI-116, REQ-UI-117, REQ-UI-118, REQ-UI-120, REQ-UI-121, REQ-UI-130, REQ-UI-132, REQ-UI-133, REQ-UI-134.
  - Diagrams: `docs/specs/ui/diagrams/strand-activity.md`.
  - Assets: `docs/specs/ui/assets/2026-11-22/` (the Strung direction preview: `index.html`, `tokens-light.png`, `tokens-dark.png`, `beads-light.png`, `epic-light.png`, `timeline-light.png`, `reports-light.png`).
- `milestone-ui`:
  - ADDED: REQ-MILESTONE-UI-024, REQ-MILESTONE-UI-025.
  - MODIFIED: REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-003, REQ-MILESTONE-UI-013, REQ-MILESTONE-UI-015, REQ-MILESTONE-UI-023.
  - Diagrams: `docs/specs/milestone-ui/diagrams/gantt-verdict-activity.md`.
  - Use cases: `docs/specs/milestone-ui/use-cases/read-gantt-verdict.md`.
- `reports`:
  - MODIFIED: REQ-REPORTS-012, REQ-REPORTS-013, REQ-REPORTS-016.
- `beads`:
  - MODIFIED: REQ-BEADS-022.

## Assumptions

- **Lane dot:** a List row, card, node, Gantt row or bead page does not know the sorted lanes of its scope, so its lane dot is muted; the Tracks table, which draws the epic's lanes, colours it (REQ-UI-115). Corrected at plan, 2026-11-22.
- **Lane and chart colours:** `--lane-1..8` and `--series-1..8` keep their values. They name a lane, a person or a series, never a state. A chart that shows states uses the state colours.
- **Document titles:** the browser tab titles of REQ-UI-063 keep " · "; the rule against middle dots covers the text shown in pages.
- **Initials:** avatar and rail initials stay capital letters, written in capitals by the code.
- **Priority:** P0 and P1 are bold in the text colour, P2 to P4 in the muted colour. No priority has a hue; carnelian stays for bugs and errors.
- **Type on rows:** only "bug" is shown on rows and cards. The bead page shows every type, and the Type filter is unchanged.
- **Ids:** ids are 13px in the Mono voice, not the 12.5px of the preview, so that they stay on the scale.
- **Unestimated Gantt bars:** they lose their dashed border, which now means Deferred; their verdict says "No estimate".
- **Merge gate labels:** a gate on an arrow reads "Waiting for be #2" or "Merged fe #3", in place of "Waiting · be #2".
- **Milestones list counts:** `total` and `closed` stay those of `gin milestone list`; the other states come from the children of the milestone bead in the Beads export, so the frontend clamps Ready at 0 if the two disagree.
- **Other epics in the preview:** the headline sentences, the one-line filter bar, the epic header with tabs, the Reports status page, the project timeline, the WBS export and the bug lightbox belong to other epics.

## Non-goals

- Layout changes beyond the shell: no new page, column, tab or panel; elements keep their places and change their look.
- The one-line filter bar and the click rule (epic gin-console-rm-beads-views).
- The Reports status page and its verdict banner (epic "Reports status").
- The Casual voice of Recursive and the full font file.
- Any change to gin-workflow's JSON.

## Success Criteria

- Every scenario of the added and modified REQs has a test that names its REQ.
- The guard test finds no font size outside the scale, no `uppercase`, no " · " in page text and no underline on navigation in the frontend sources.
- `gin specs lint --change gin-console-rm-strung --against master` prints `ok`, and `gin specs trace` lists no missing REQ.
- TC-1 passes on the Tailscale build with the `example` project: every page in the light and the dark theme at 1440px and 390px shows the Strung palette, Recursive, the glyphs and strands, one verdict per Gantt row, no data pill, no " · " and no underlined navigation, with screenshots.
