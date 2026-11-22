# Spec Delta: Strung visual system

<!-- One block per requirement: "### REQ-<CAP>-<NNN>: <title>", one SHALL/MUST statement,
     and at least one "#### Scenario:" with "- GIVEN", "- WHEN", "- THEN" bullets.
     Get new IDs from `gin specs next-id <cap>`.
     MODIFIED and REMOVED blocks put an HTML comment "base: <hash>" on the line after the heading,
     the living block hash from `gin specs hash <REQ-ID>`; REMOVED blocks add "Reason: <why>".
     A requirement taken from a confirmed input adds "Source:" after its statement, with backticked paths
     relative to the living spec.md, such as `assets/<YYYY-MM-DD>/mockup/index.html#<screen-id>`.
     Preferred sentence patterns (EARS): "WHEN <trigger>, the <system> SHALL <response>",
     "WHILE <state>, ...", "IF <unwanted condition>, THEN ...", "WHERE <feature>, ...".
     A requirement may add, right under its heading, `Type: functional | non-functional | business-rule`
     (default functional). A non-functional one adds `Category:` (performance, security, reliability,
     usability, compatibility, maintainability, portability, constraint) and either a scenario or `Measure:`
     with a measurable target; it needs no activity diagram. A business rule keeps a scenario; use cases
     cite it on `Requirements:`. -->

## ADDED

### REQ-UI-136: Typeface
Type: non-functional
Category: usability
The frontend SHALL set all its text in Recursive, served by the console itself from the font file with the weight and Mono axes only, SHALL draw ids, commands and code in the Mono voice of Recursive (`MONO` 1) and every other text in its Sans voice (`MONO` 0), and SHALL NOT load Geist or Geist Mono.
Source: `assets/2026-11-22/index.html#tokens`, `assets/2026-11-22/tokens-light.png`

#### Scenario: One family, two voices
- GIVEN the built console
- WHEN the Beads page of the `example` project loads
- THEN the body text is set in Recursive with `MONO` 0, every bead id in Recursive with `MONO` 1, and no Geist font file is requested

#### Scenario: Served by the console
- GIVEN a browser with no access to any host but the console
- WHEN a page loads
- THEN its text is drawn in Recursive

### REQ-UI-137: Type scale
Type: non-functional
Category: usability
The frontend SHALL draw text only at 12, 13, 14, 16, 20, 28 and 40px, using 12px for dates, meta lines and secondary facts, 13px for controls, filter labels and ids, 14px for body text and the titles of rows and cards (the base size), 16px for a page's lead sentence and for inputs on a phone, 20px for section and card headings, 28px for page titles and 40px for a headline number, and SHALL draw every number in tabular figures.
Source: `assets/2026-11-22/index.html#tokens`, `assets/2026-11-22/tokens-light.png`

#### Scenario: Sizes on a page
- GIVEN the Beads page of the `example` project
- WHEN it is shown at 1440px
- THEN its page title is 28px, a row title 14px, a row's date 12px and the filter labels 13px

#### Scenario: Numbers line up
- GIVEN the Milestones list with the forecasts "Finishes 1 Dec" and "Finishes 11 Nov"
- WHEN it is shown
- THEN every number on the page uses tabular figures (`font-variant-numeric: tabular-nums`)

#### Scenario: No size outside the scale
- GIVEN the frontend sources
- WHEN the guard test reads them
- THEN no class or style sets a font size outside 12, 13, 14, 16, 20, 28 and 40px

### REQ-UI-138: Progress strand
Wherever the frontend shows how many of a bead's tracks or of a milestone's epics are done (the List row, REQ-UI-044; the Graph node, REQ-UI-049; the bead page, REQ-UI-028; the epic Progress card, REQ-UI-120; the lane header, REQ-UI-112 and REQ-UI-118; the Lanes section, REQ-UI-121; the Milestones list, REQ-MILESTONE-UI-001; the Gantt row, REQ-MILESTONE-UI-013 and REQ-MILESTONE-UI-015; the Team scope, REQ-REPORTS-013), it SHALL draw a strand: a thin thread in the border colour carrying one bead per item, ordered Done, In progress, Blocked, Ready, Deferred, each drawn as the glyph of its state (REQ-UI-064) without the word, and, WHEN there are more than 16 items, one segment per state in place of the beads, its length in proportion to its count and drawn in the look of that state's glyph; and, where the room is narrower than the beads need (the Graph node, the lane box, the lane header and the large strand), it SHALL draw the segmented thread in the room it has; it SHALL follow the strand with "<done>/<total>" in tabular figures, SHALL give it `role="img"` and the accessible name "<done> done, <n> in progress, <n> blocked, <n> ready, <n> deferred of <total> <tracks, epics or beads>" without the states counted 0, SHALL show the same sentence in its tooltip (REQ-UI-132) with what progress means, SHALL take the counts from the bead's `child_counts` (REQ-BEADS-022) or the milestone's `epics` (REQ-MILESTONE-UI-025), SHALL draw nothing WHEN the total is 0, and SHALL show the prep tasks of an epic apart, after the strand, as the text "Prep <closed>/<total>". The strand of the epic Progress card SHALL use beads twice the size and SHALL be followed by "<done> done, <n> in progress, <n> blocked, <n> ready, <n> deferred" without the states counted 0, in place of "<done>/<total>".
Source: `assets/2026-11-22/index.html#tokens`, `assets/2026-11-22/beads-light.png`, `assets/2026-11-22/epic-light.png`

#### Scenario: Epic with seven tracks
- GIVEN epic `e-1` with 7 tracks: 2 closed, 1 in progress, 1 blocked and 3 ready
- WHEN its List row is shown
- THEN the row shows a strand of 7 beads, in order 2 full, 1 half, 1 knot and 3 hollow, followed by "2/7", named "2 done, 1 in progress, 1 blocked, 3 ready of 7 tracks"

#### Scenario: More than 16 tracks
- GIVEN epic `e-2` with 19 tracks: 11 closed, 1 in progress, 6 ready and 1 deferred
- WHEN its List row is shown
- THEN the strand is 4 segments whose lengths are in the ratio 11, 1, 6 and 1, followed by "11/19"

#### Scenario: No track
- GIVEN epic `e-3` without children
- WHEN its List row is shown
- THEN the row shows no strand and no count

#### Scenario: Prep apart
- GIVEN epic `e-4` with tracks `t-1` (closed) and `t-2` (open), and the open prep task `p-1` labelled `prep`
- WHEN its List row is shown
- THEN the row shows a strand of 2 beads, "1/2" and "Prep 0/1"

#### Scenario: Large strand on the epic page
- GIVEN epic `ex-e12` with 8 tracks: 4 closed, 1 in progress, 1 blocked and 2 ready
- WHEN its Overview is shown
- THEN the Progress card shows a strand of 8 large beads followed by "4 done, 1 in progress, 1 blocked, 2 ready"

#### Scenario: Narrow node
- GIVEN epic `e-5` with 12 tracks, 3 closed
- WHEN its Graph node is drawn
- THEN the node shows the segmented thread and "3/12" in full

### REQ-UI-139: Plain text style
The frontend SHALL NOT set a label, heading or value in capitals by style (`text-transform: uppercase`), an initial in an avatar being written in capitals by the code; SHALL NOT join facts in the text of a page with a middle dot " · ", but SHALL use a comma, separate elements with space between them, or words, the document title of REQ-UI-063 being the only exception; SHALL NOT underline a link that names a place or a thing (a sidebar item, a breadcrumb item, a tab, the title or id of a row, card, node or table cell), at rest or on hover, and SHALL mark it on hover with the identity colour (REQ-UI-141); and SHALL underline a link inside a sentence (Markdown text, a notice, an empty state) with a thin line in the identity colour at half strength.
Source: `assets/2026-11-22/beads-light.png`, `assets/2026-11-22/index.html#beads`

#### Scenario: No capitals by style
- GIVEN the filter sheet of the Beads page at 390px
- WHEN it is opened
- THEN its section labels read "Status", "Priority" and "Labels", each in sentence case

#### Scenario: No middle dots
- GIVEN the Projects, Beads, bead, My Tasks, Milestones, milestone and Reports pages of the `example` project
- WHEN they are shown
- THEN no text on them contains " · ", and the browser tab of the Beads page still reads "Beads · example · gin-console"

#### Scenario: Navigation links
- GIVEN the bead page of `ex-e12` opened from the Beads List
- WHEN the pointer rests on the breadcrumb link "Beads"
- THEN the link is not underlined and its text takes the identity colour

#### Scenario: Link in a sentence
- GIVEN a bead whose description contains `[docs](https://example.com)`
- WHEN its page loads
- THEN "docs" is underlined with a thin line in the identity colour

### REQ-UI-140: Data as text
Pills and chips SHALL be used only for controls (a filter chip, a toggle, a segmented control); on a List or Tree row, a Board or Focus card, a Graph node, a Gantt row, a table row, the line of facts of the bead page and a Projects card, the frontend SHALL show data as text without a border or a tint: the priority as `P<n>`, bold in the text colour for P0 and P1 and in the muted colour otherwise; the type as REQ-UI-067 describes; the kind, size, labels, capabilities and Prep, and a status or an "On time" figure, as plain words in the muted colour, or in the warning colour where a requirement gives them that colour; the comment and dependency indicators as an icon and a number; and a lane as a dot followed by its name (REQ-UI-115).
Source: `assets/2026-11-22/beads-light.png`, `assets/2026-11-22/index.html#beads`

#### Scenario: List row without chips
- GIVEN a blocked P1 bug `b-1` assigned to alice with the labels `area:backend` and `ui`, the lane `be` and 2 comments
- WHEN the List view is shown at 1440px
- THEN the row shows "bug" in the bug colour, "P1" bold, "area:backend", "ui", a muted dot and "be", and a comment icon with 2, and none of them has a border or a background

#### Scenario: Board card without chips
- GIVEN an in-progress P2 epic with `points: 8` and the kind `technical`
- WHEN its Board card is shown
- THEN it shows "P2" in the muted colour, "Technical" and "8 pt" as text, and no pill

#### Scenario: Projects card
- GIVEN a configured project whose directory is missing
- WHEN the Projects page is shown
- THEN its card says "missing" in the danger colour as text, without a badge

#### Scenario: Controls keep their chips
- GIVEN the Beads page with the status filter "Open"
- WHEN it is shown
- THEN the active filter is a removable chip

### REQ-UI-141: Identity colour in the shell
The frontend SHALL use the identity colour (REQ-UI-059) for where the user is and what the user can do, and for nothing else: the current sidebar item (a 3px bar on its left edge and its icon), the underline of the selected tab, the selected row, card or node (a pale identity wash with a 3px bar inside its left edge), an active filter chip, the primary button, the focus ring and the today line of a chart; and SHALL show before the name "gin-console" in the sidebar a mark of three beads (Done, In progress and Ready) on a thread in the identity colour.
Source: `assets/2026-11-22/beads-light.png`, `assets/2026-11-22/index.html#beads`

#### Scenario: Current place
- GIVEN the Beads page of the `example` project with bead `ex-e3` selected in the List
- WHEN it is shown at 1440px
- THEN the Beads sidebar item has a bar on its left edge and its icon in the identity colour, and the row of `ex-e3` has the identity wash and a bar inside its left edge

#### Scenario: Focus
- GIVEN any page
- WHEN the keyboard focus reaches a link
- THEN its focus ring is drawn in the identity colour

#### Scenario: Brand mark
- GIVEN any page at 1440px with the sidebar expanded
- WHEN it is shown
- THEN the sidebar header shows three beads on a thread before "gin-console"

### REQ-MILESTONE-UI-024: One verdict per Gantt row
Each epic row of the Gantt SHALL show at most one verdict, on one line under its label: the first of the epic's warning lines (REQ-MILESTONE-UI-003, one line per warning and one per entry of `external_depends_on` for `external_blocker`) in the order `late`, `overflow`, `external_blocker`, `after_integration`, `oversized`, `open_bugs`, `spec_due`, `spec_not_ready`, `unestimated`, then any other code, written as REQ-MILESTONE-UI-003 writes it, in the warning colour after the Blocked glyph (REQ-UI-064) drawn in the warning colour for `late` and `external_blocker` and a dashed ring in the warning colour for any other code, followed by "+<n>" WHEN the epic has n further warning lines; the verdict SHALL carry a tooltip (REQ-UI-132) listing every warning line of the epic in that order; an epic without warnings SHALL show no verdict, and the height of a row SHALL NOT depend on the number of its warnings.
Source: `../ui/assets/2026-11-22/index.html#reports`, `../ui/assets/2026-11-22/reports-light.png`

#### Scenario: Several warnings
- GIVEN epic A of milestone M1 with the warnings `spec_due`, `open_bugs` with `count: 2` and `overflow` with `days: 2`
- WHEN the Gantt of M1 is shown
- THEN A's verdict reads "2 working days past the end" after a dashed ring, followed by "+2", and its tooltip lists "2 working days past the end", "2 open bugs" and "Spec due before kick-off" in that order

#### Scenario: Late comes first
- GIVEN epic B with the warnings `unestimated` and `late`, planned to end on 12 Nov
- WHEN the Gantt is shown
- THEN B's verdict reads "Late: should have finished 12 Nov" after the Blocked glyph, followed by "+1"

#### Scenario: No warnings
- GIVEN epic C without warnings
- WHEN the Gantt is shown
- THEN C's row shows no verdict

#### Scenario: Same height
- GIVEN epic D with 5 warnings and epic E with 1 warning
- WHEN the Gantt is shown
- THEN the rows of D and E have the same height

### REQ-MILESTONE-UI-025: Epic counts by state in the Milestones list
WHEN a client requests `GET /api/milestones?project=<name>`, the server SHALL add to the `epics` of each list entry the counts `in_progress`, `blocked`, `ready` and `deferred` of the milestone's epics that are not closed, each epic counted in the state the Board gives it (REQ-UI-031, REQ-BEADS-021), taken from the project's Beads export (REQ-BEADS-012) by the children of the milestone bead, keeping `total` and `closed` from `gin milestone list`; WHEN the milestone bead is not in the export, these counts SHALL be 0 and `ready` SHALL be `total` minus `closed`.

#### Scenario: Counts by state
- GIVEN milestone `m1` whose list entry has `epics` `{total: 4, closed: 1}`, and whose bead has the epics `e-1` (closed), `e-2` (in progress), `e-3` (open, blocked by an open bead) and `e-4` (open and ready)
- WHEN a client requests `GET /api/milestones?project=<name>`
- THEN `m1` has `epics` `{total: 4, closed: 1, in_progress: 1, blocked: 1, ready: 1, deferred: 0}`

#### Scenario: Milestone bead missing
- GIVEN milestone `m2` whose list entry has `epics` `{total: 3, closed: 1}` and no bead in the export
- WHEN a client requests the list
- THEN `m2` has `epics` `{total: 3, closed: 1, in_progress: 0, blocked: 0, ready: 2, deferred: 0}`

## MODIFIED

### REQ-UI-059: Colour tokens
<!-- base: da1064484249a8a70e522b9cea78ed7209affdff7c88d4127e4bffa2e3fb6074 -->
The frontend SHALL use the Strung palette, defined for light and dark: cool neutrals for the page (porcelain), surfaces (paper), wells and hover (sunk), borders (rule), text (graphite) and secondary text (slate); one identity colour, amethyst, used as REQ-UI-141 describes; the state colours jade for Ready and Done, lapis for In progress, amber for Blocked and for warnings (late, at risk), and hematite for Deferred, used only to say a state or a warning and never to decorate; carnelian for bugs and errors only; and the categorical lane colours of REQ-UI-118 and chart series colours, which name a lane, a person or a series and never a state. A chart, bar or strand that shows states SHALL use the state colours, Done always in jade. The frontend SHALL show text, the state colours, the identity colour and carnelian with a contrast of at least 4.5:1 against every surface (page, paper and sunk) they are drawn on, SHALL draw the strokes of the state glyphs (REQ-UI-064) and the outline of inputs, selects and other controls with at least 3:1 against their surface (separators and card borders are decoration and are not held to this), and SHALL show priority with weight, never with a hue (REQ-UI-140).
Source: `assets/2026-11-22/index.html#tokens`, `assets/2026-11-22/tokens-light.png`, `assets/2026-11-22/tokens-dark.png`

#### Scenario: Light values
- GIVEN the light theme
- WHEN the palette is read
- THEN page is #F4F5F8, paper #FFFFFF, sunk #ECEEF3, rule #DDE0E7, graphite #1B1D26, slate #596072, amethyst #6A3DB8, jade #0E7A5C, lapis #2557D6, amber #AE500A, hematite #646A78 and carnelian #B42318

#### Scenario: Dark values
- GIVEN the dark theme
- WHEN the palette is read
- THEN page is #12131A, paper #1B1C25, sunk #242632, rule #2E303D, graphite #E8E9F0, slate #A0A5B5, amethyst #B89EF6, jade #45CF9F, lapis #93B1FF, amber #F2A54C, hematite #9298A6 and carnelian #FF8A7A

#### Scenario: Done is jade everywhere
- GIVEN a closed bead in the List, a closed epic on the Gantt and the closed part of the Team scope
- WHEN each is shown in the light theme and then the dark theme
- THEN each is drawn in the jade of that theme

#### Scenario: Contrast
- GIVEN the palette of a theme
- WHEN text, the state colours, the identity colour, carnelian, glyph strokes and control outlines are measured against the surfaces they sit on
- THEN text and the colours are at least 4.5:1, and glyph strokes and control outlines at least 3:1

### REQ-UI-064: State mark
<!-- base: 094646845039fd1634c9af026292d99d30791af4d308ffea76ddbbd2b14e87a8 -->
The frontend SHALL draw the state of a bead (Ready, In progress, Blocked, Done or Deferred, by the rules of REQ-UI-049) as a glyph whose fill says how far the bead has come, followed by the state's name wherever the state is named: Ready as a hollow ring in the Ready colour, In progress as a ring in the In progress colour with its right half filled, Done as a full bead in the Done colour, Blocked as a full bead in the Blocked colour crossed by a short bar in the surface colour (a knot), and Deferred as a dashed ring in the Deferred colour. The Board and Focus cards, the List and Tree rows, the Graph nodes, the bead page, My Tasks and the Gantt SHALL use the same glyph and name, and no card, row or node SHALL carry a coloured edge for its state. A milestone status (REQ-MILESTONE-UI-022) SHALL use the glyph of Deferred for Planned, of Ready for Scheduled, of In progress for Active and of Done for Closed.
Source: `assets/2026-11-22/index.html#tokens`, `assets/2026-11-22/tokens-light.png`

#### Scenario: Blocked card
- GIVEN a blocked bead
- WHEN the Board is shown
- THEN its card shows "Blocked" after the knot glyph, and the card has no coloured left edge

#### Scenario: Same state, same mark
- GIVEN an in-progress bead shown on the Board, in the list, in the Tree and in the graph
- WHEN each view is shown
- THEN each shows "In progress" after the half-filled glyph in the same colour

#### Scenario: Shapes without colour
- GIVEN a ready, an in-progress, a done, a blocked and a deferred bead
- WHEN their List rows are shown in grayscale
- THEN their glyphs differ by shape: hollow, half, full, knot and dashed

#### Scenario: Milestone status
- GIVEN an active milestone and a planned milestone
- WHEN the Milestones list is shown
- THEN the first reads "Active" after the half-filled glyph and the second "Planned" after the dashed ring

### REQ-UI-067: Type
<!-- base: 4f3e07c038fe829b771acbcd77f97e2c22d49f637b2858b5382b3d3738e51bf4 -->
The frontend SHALL show the type of a bead as its name in plain text, never as a pill: on the List and Tree rows, the Board and Focus cards and the Graph nodes only for a bug, as the word "bug" in the bug colour (carnelian) without a border or a tint, and on the bead page for every type, among its facts (REQ-UI-028).

#### Scenario: Only bugs on rows
- GIVEN an epic, a bug, a feature and a task
- WHEN their List rows are shown
- THEN only the row of the bug shows a type, the word "bug" in the bug colour, and no row shows a pill

#### Scenario: Every type on the bead page
- GIVEN a feature
- WHEN its bead page loads
- THEN its facts read Type "feature" as text

### REQ-UI-065: Card anatomy
<!-- base: e04e45646138994773003062a7f7f5f47e933af218173e9df5117eaeb7ada2f2 -->
A bead card of the Board and Focus views SHALL show on its first line the id in the monospace face shortened as REQ-UI-107 describes and `P<n>`, below it the title as a link to `/beads/<project>/<id>`, and on its last line the state mark of REQ-UI-064, the type of REQ-UI-067 for a bug, the size of REQ-UI-110 when the bead has `points` or `estimate_minutes`, the indicators of REQ-UI-066 and the assignee as REQ-UI-135 describes, each as text (REQ-UI-140), the title and the assignee wrapping inside the card (REQ-UI-107).

#### Scenario: Full card
- GIVEN a ready P1 task assigned to alice with 2 comments and 1 dependency
- WHEN its card is shown
- THEN it shows the id and `P1`, the title link, "Ready", a comment indicator 2, a dependency indicator 1 and alice

#### Scenario: Bare card
- GIVEN a bead with an owner, no assignee, no comments and no dependencies
- WHEN its card is shown
- THEN the last line shows only the state and "Unassigned" in the muted color

#### Scenario: Card with points
- GIVEN an in-progress epic with `points: 8`
- WHEN its Board card is shown
- THEN its last line shows the state, the size "8 pt" as text and the assignee or "Unassigned"

### REQ-UI-110: Readable text and facts
<!-- base: e3c2a1a9c795fea10b9fd1a33027aea1f532e8b5f394afec4cd0fd72f22b1d97 -->
On every page, at every window width from 360px and in the light and the dark theme, the frontend SHALL NOT draw the text of one element over the text of another, or over a chart bar, line or arrow that the text does not belong to; SHALL end every text it cuts short with an ellipsis and give the full text as `title` (REQ-UI-107); SHALL give text a contrast with its background of at least 4.5:1, or 3:1 for text of at least 18.66px bold or 24px; SHALL show a set of facts about one thing (such as owner, assignee, dates and counts) as label/value pairs, each label in the muted color and each value in the text color and a heavier weight, never as one run of text of one style; SHALL show a priority as the text `P<n>`, bold in the text color for P0 and P1 and in the muted color otherwise (REQ-UI-140); and SHALL show a size as text that reads "<p> pt" for a bead with `points`, else "<n>d" from `estimate_minutes`.

#### Scenario: No overlapping text
- GIVEN the example project
- WHEN the Projects, Beads (List, Board, Focus, Graph, and Lanes of the epic `ex-e12`), bead, My Tasks, Milestones, milestone (Gantt at each zoom, Beads, Retro) and Reports (each tab) pages are shown at 390, 1024, 1440 and 1920px in both themes
- THEN no text overlaps other text or a bar, line or arrow it does not belong to, and no text spills out of its box without an ellipsis

#### Scenario: Facts as label and value
- GIVEN the bead page of an epic, the velocity line of a kicked-off milestone and the header of a lane
- WHEN they are shown
- THEN each fact shows its label in the muted color and its value in the text color with a heavier weight

#### Scenario: Priority
- GIVEN beads at P0, P1 and P2
- WHEN their List rows are shown
- THEN `P0` and `P1` are bold in the text color, `P2` is in the muted color, and none of them is a pill

#### Scenario: Contrast
- GIVEN the Reports Team and Velocity tabs in the light and the dark theme
- WHEN they are shown
- THEN every milestone id and label has a contrast of at least 4.5:1 with its background

### REQ-UI-044: List rows
<!-- base: f10aa6dd44ae008c7d259f221e60d738db629889d4a3e0f1a3fe5050187e3f64 -->
The List view SHALL show for each row an open/close control when it has children, its id in the monospace face shortened as REQ-UI-107 describes, its title as a link to `/beads/<project>/<id>` cut short with the full title as `title` and never narrower than 8rem while the row is at least 360px wide, its state as REQ-UI-064 describes, its type as REQ-UI-067 describes, `P<n>`, the indicators of REQ-UI-066, its assignee as REQ-UI-135 describes, up to three labels from 768px, and its last update as REQ-UI-131 describes, SHALL show for an epic with a track the strand of its tracks (REQ-UI-138, REQ-UI-130), SHALL show for an epic with prep tasks (REQ-BEADS-002) "Prep x/y", where x is its closed prep tasks and y all its prep tasks, SHALL show the word "Prep" (REQ-UI-140) on the row of a prep task, SHALL open only the root level at first unless branches were remembered (REQ-UI-074), SHALL open and close a branch when its control is used, SHALL offer "Expand all" and "Collapse all", SHALL show at most 2000 rows and say how many more are not shown, and SHALL draw a row on two lines under 768px.

#### Scenario: Row content
- GIVEN a blocked P1 bug assigned to alice with 2 comments
- WHEN the List view is shown
- THEN its row shows the id, the title link, "Blocked", the word "bug" in the bug colour, `P1`, a comment indicator 2 and alice

#### Scenario: Open a branch
- GIVEN the List view with a collapsed epic
- WHEN the user opens it
- THEN its children are shown, and closing it hides them again

#### Scenario: Expand all and collapse all
- GIVEN a hierarchy with several levels
- WHEN the user chooses "Expand all", then "Collapse all"
- THEN every branch opens, then only the roots are shown

#### Scenario: Epic progress
- GIVEN an epic with 5 children of which 3 are closed
- WHEN the List view is shown with "Show closed" on
- THEN the epic shows a strand of 5 beads and "3/5"

#### Scenario: Epic with a prep task
- GIVEN epic `e-1` with tracks `t-1` (closed) and `t-2` (open), and the open prep task `p-1` labelled `prep` and `prep:mockup`
- WHEN the List view is shown with "Show closed" on and `e-1` open
- THEN `e-1` shows a strand of 2 beads, "1/2" and "Prep 0/1", and the row of `p-1` shows the word "Prep" while the rows of `t-1` and `t-2` do not

#### Scenario: Plain text
- GIVEN a title containing `<script>x</script>`
- WHEN the List view is shown
- THEN it appears as text and no `script` element exists

#### Scenario: Two lines on a phone
- GIVEN a window 390px wide
- WHEN a row is shown
- THEN the title is on the first line and the state, type and indicators on the second

#### Scenario: Row limit
- GIVEN 2100 root beads
- WHEN the List view is shown
- THEN 2000 rows are shown and a line says "100 more not shown"

#### Scenario: Long id keeps the title
- GIVEN the epic `ex-payments-provider-migration-and-reconciliation-2026` with an open task and the title "Migrate every checkout payment to the new provider"
- WHEN the List view is shown at 1440px and at 390px with the epic open
- THEN each of the two rows shows its open/close control when it has children, its shortened id and at least the start of its title

#### Scenario: Owner is not the assignee
- GIVEN a bead with owner `lead@example.com` and no assignee
- WHEN the List view is shown at 1440px
- THEN its row shows "Unassigned" and not `lead@example.com`

### REQ-UI-028: Bead detail
<!-- base: 5a22703b4c2b98ca542633b482efbfca857542dc41f1b3bee9b20d67ea33e115 -->
The bead page SHALL show the bead's id, title and type, a line of facts with its state as REQ-UI-064 describes (for example "In progress", never the raw `in_progress`; for a milestone, its milestone status as REQ-MILESTONE-UI-022 describes), its priority as `P<n>` (REQ-UI-110) and its size as REQ-UI-110 describes, the reason of its points (`points_reason`) on its own line under that line, its labels, and its assignee (REQ-UI-135), creator (the person of `created_by`, else of `owner`, REQ-BEADS-023), creation and update times and comment count as label/value pairs (REQ-UI-110), each time written as REQ-UI-131 describes, its description rendered as GitHub-flavored Markdown (headings, emphasis, lists, task lists, inline code, code blocks, tables, block quotes and links), its dependencies and the beads it blocks (each with id, title and status, linking to that bead in the same project), and for an epic its children with the strand of its tracks (REQ-UI-138), from its `child_counts` (REQ-UI-130), when it has a track. WHEN an epic has prep tasks (REQ-BEADS-002), the bead page SHALL show "Prep x/y" next to the strand, where x is its closed prep tasks and y all its prep tasks, and SHALL mark each prep task in the children list with the word "Prep" (REQ-UI-140). Raw HTML in the description SHALL be shown as text and SHALL NOT create elements, a link SHALL open in a new tab with `rel="noreferrer"`, and a link whose URL is not `http`, `https` or `mailto` SHALL be shown as text.
Source: `assets/2026-11-08/mockup/index.html#bead-detail`

#### Scenario: Markdown description
- GIVEN a bead whose description is `## Change` followed by `1. Format **dates**` and a fenced code block
- WHEN the page loads
- THEN the description shows a heading "Change", a numbered list item with "dates" in bold, and a code block

#### Scenario: Raw HTML stays text
- GIVEN a bead with a description containing `<script>x</script>` and `<img src=x onerror=alert(1)>`
- WHEN the page loads
- THEN both appear as text and no `script` or `img` element exists in the description

#### Scenario: Unsafe link
- GIVEN a bead with a description containing `[run](javascript:alert(1))` and `[docs](https://example.com)`
- WHEN the page loads
- THEN "run" is not a link, and "docs" links to `https://example.com` in a new tab

#### Scenario: Relations link inside the console
- GIVEN a bead with one dependency
- WHEN the page loads
- THEN the dependency shows its id, title and status and links to `/beads/<project>/<its id>`

#### Scenario: Epic progress
- GIVEN an epic with 4 children of which 3 are closed
- WHEN the page loads
- THEN the children are listed and the strand shows 4 beads and "3/4"

#### Scenario: Epic with a prep task
- GIVEN epic `e-1` with tracks `t-1` (closed) and `t-2` (open), and the closed prep task `p-1` labelled `prep` and `prep:mockup`
- WHEN the page of `e-1` loads
- THEN the strand reads "1/2", "Prep 1/1" is shown next to it, and the children list shows `t-1`, `t-2` and `p-1`, with the word "Prep" on `p-1` only

#### Scenario: Fact line and facts
- GIVEN in-progress P1 epic `e-3` with `points: 5`, `points_reason: "new endpoint and UI"`, owner `lead@example.com`, assignee `bao`, created by `lead`, created and updated at 2026-05-11 16:00:00 and 0 comments, shown in 2026
- WHEN its page loads
- THEN the fact line shows "In progress", "P1" and "5 pt" as text, none of them in a pill, the line under it reads "new endpoint and UI", and the facts read Assignee "bao", Created by "lead", Created "11 May, 16:00", Updated "11 May, 16:00" and Comments "0", with no Owner fact, each label in the muted color and each value in the text color

#### Scenario: No assignee
- GIVEN a task with owner `lead@example.com` and no assignee
- WHEN its page loads
- THEN the facts read Assignee "Unassigned" and Created by "lead"

### REQ-UI-049: Node content
<!-- base: 6d58db6213c189143ef3a3ee7510a480881a5ef7545fae737e45e777f235765a -->
The Graph view (REQ-UI-106) SHALL show on each node the content of a card: the bead id in the monospace face shortened as REQ-UI-107 describes and `P<n>` on the first line, its title on one line with the full title as `title`, and its state as REQ-UI-064 describes on one line, the state label cut short before the strand is, and on a node with children an icon that says it can be opened, with the strand of REQ-UI-138 over its tracks (REQ-BEADS-002) when it has a track. The node of a prep task SHALL show the word "Prep" (REQ-UI-140).

#### Scenario: Node with children
- GIVEN epic `e-1` without a parent with 3 tasks, 1 of them closed, and "Show closed" on
- WHEN the Graph view of the project is shown
- THEN the node `e-1` shows the strand with "1/3" and the open icon

#### Scenario: State label
- GIVEN a ready task and a blocked task
- WHEN the Graph view of the epic is drawn
- THEN the first node reads "Ready" with its icon and the second "Blocked" with its icon

#### Scenario: Closed bead
- GIVEN a closed task and "Show closed" on
- WHEN the Graph view of the epic is drawn
- THEN it is drawn as "Done"

#### Scenario: Node with a prep task
- GIVEN epic `e-1` without a parent with tracks `t-1` (closed) and `t-2` (open), and the open prep task `p-1` labelled `prep` and `prep:mockup`, and "Show closed" on
- WHEN the Graph view of the project is shown, and then the Graph view with the scope `e-1`
- THEN the node `e-1` shows the strand with "1/2" and the open icon, and with the scope `e-1` the node `p-1` shows the word "Prep" while `t-1` and `t-2` do not

#### Scenario: Long state line
- GIVEN an in-progress epic with 2 of 5 tracks done and a title of 80 characters
- WHEN its node is drawn
- THEN its id, title and state each take one line inside the node, and the strand with "2/5" is shown in full

### REQ-UI-130: Progress whatever the filters
<!-- base: ba81e4930410a8d62c4e88b8fdeb20ed61dccafdd79a0c30343d58e1d42467e6 -->
Wherever the frontend shows how many of a bead's children are done (the List row, REQ-UI-044; the Graph node, REQ-UI-049; the bead page, REQ-UI-028; the epic Progress card, REQ-UI-120; the Gantt row, REQ-MILESTONE-UI-013), it SHALL take the numbers from the bead's `child_counts` (REQ-BEADS-022), so that "Show closed" and the other filters SHALL NOT change them.

#### Scenario: Show closed off
- GIVEN epic `e-1` with 5 tracks, 3 of them closed, and "Show closed" off
- WHEN the List view and then the Graph view of the project are shown
- THEN the row of `e-1` and its node each show the strand with "3/5"

#### Scenario: Gantt row
- GIVEN the same epic in a milestone
- WHEN its Gantt row is shown
- THEN its second line shows the strand with "3/5"

### REQ-UI-120: Epic overview cards
<!-- base: 510ca66706d1b432a9b63d64277abb24f512dfe09117d74de50e8413ee0b453d -->
The Overview tab of an epic page SHALL show three cards side by side from 1024px and one under another below:
- Progress: the large strand of REQ-UI-138 and its sentence, from the epic's `child_counts` (REQ-UI-130), over its children that are neither prep tasks (REQ-BEADS-002) nor merge gates (REQ-BEADS-019) whatever "Show closed" says, then as label/value facts "Points" ("<done> of <total> pt done" over the tracks with `points`, or "No points"), "Bugs" (the open beads of the epic's `bugs`, "0 open" when none) and "Prep" ("<closed>/<total>" of its prep tasks, or "none");
- Workflow: the stages discuss, plan, orchestrate, execute and ship with the epic's current stage marked and the earlier ones ticked, then "Gates" ("<satisfied> of <n> satisfied"), "Warnings" and "Waivers" (each a count with the items on hover and focus, or "none"), from `GET /api/beads/{project}/{id}/workflow` (REQ-BEADS-020); "No workflow" when the answer has no stage, and the error when it fails, the rest of the page unaffected;
- Milestone: the epic's milestone id and title linking to the milestone page, its status (REQ-MILESTONE-UI-022), its window "<start> – <end>" (REQ-UI-131), the working days (Monday to Friday) from today to `end`, both counted, while it is active, and its forecast finish with a warning mark when the milestone is late (REQ-MILESTONE-UI-023) (from `GET /api/milestones?project=`, REQ-MILESTONE-UI-008); "No milestone" when the epic's `milestone` is `null`.
Source: `assets/2026-11-21/epic-page/mockup/index.html`

#### Scenario: Progress by state
- GIVEN epic `ex-e12` with 8 tracks (4 closed, 1 in progress, 2 ready, 1 blocked) and a merge gate child
- WHEN its Overview is shown
- THEN Progress shows a strand of 8 beads and reads "4 done, 1 in progress, 1 blocked, 2 ready"

#### Scenario: Progress with closed beads hidden
- GIVEN the same epic and "Show closed" off on the Beads page it was opened from
- WHEN its Overview is shown
- THEN Progress still reads "4 done, 1 in progress, 1 blocked, 2 ready"

#### Scenario: Points
- GIVEN tracks with points 3 (closed), 5 (in progress) and 3 (closed), and tracks without points
- WHEN the Overview is shown
- THEN Points reads "6 of 11 pt done"

#### Scenario: Workflow stage
- GIVEN `gin state --workflow-id ex-e12` reports stage `execute`, 4 of 6 gates satisfied, no warnings and no waivers
- WHEN the Overview is shown
- THEN discuss, plan and orchestrate are ticked, execute is marked, ship is plain, and Gates reads "4 of 6 satisfied"

#### Scenario: Workflow unavailable
- GIVEN the workflow request answers 502 with an error
- WHEN the Overview is shown
- THEN the Workflow card shows the error and the Progress and Milestone cards are shown

#### Scenario: Milestone forecast late
- GIVEN milestone `ex-m2` active from 10 Nov to 1 Dec 2026 with a forecast finish of 16 Feb 2027
- WHEN the Overview of `ex-e12` is shown on 20 Nov 2026
- THEN the Milestone card shows "ex-m2 Checkout v2", "10 Nov – 1 Dec", "8 working days" left and the finish "16 Feb 2027" with a warning mark

### REQ-UI-112: Lane header and state
<!-- base: e448e4ef2380973a581af266bdc38ee37dfceea52cbdbdf11e5d8707d74279f9 -->
Each lane row's header SHALL show the lane name in a heavier weight, then as label/value facts (REQ-UI-110):
- State: the lane's state as an icon and its words;
- Held by: the distinct assignees of the lane's tracks that are not closed, or "Unclaimed" when none has one; left out when every track is closed;
- Lease: "until <date>" from the latest `claim.expires_at` among the lane's tracks that are not closed when it is later than now, "expired <date>" when it is not, left out when none of them has a `claim`;
- Tracks: the strand of REQ-UI-138 over all the lane's tracks whatever the search and filters.
The state SHALL be the first of these that holds:
1. "All tracks closed": every track is closed;
2. "Running": a track is `in_progress`, or a track that is not closed has a `claim` whose `expires_at` is later than now;
3. "Waiting for <lanes>": the lane's first card that is not closed is blocked by merge gates that are not closed, `<lanes>` being their `waits_for.lane` values, joined by ", ", or "another lane" for a gate whose `waits_for.lane` is `null`;
4. "Blocked": that card is blocked (REQ-BEADS-007);
5. "Not started": no track is closed;
6. "Idle": otherwise.
The header of the row "No lane" SHALL show its name and Tracks only.

#### Scenario: Running lane with a lease
- GIVEN lane `be` with track 1 closed and track 2 `in_progress`, both assigned to `ann`, track 2 with a `claim` expiring tomorrow at 16:00
- WHEN the Lanes view is shown
- THEN the `be` header shows State "Running", Held by `ann`, Lease "until <tomorrow> 16:00" and Tracks "1/2"

#### Scenario: Waiting for another lane
- GIVEN lane `qa` whose only track, open and unassigned, is blocked by an open merge gate waiting for track 2 of lane `be` and a closed merge gate waiting for track 3 of lane `fe`
- WHEN the Lanes view is shown
- THEN the `qa` header shows State "Waiting for be", Held by "Unclaimed" and Tracks "0/1"

#### Scenario: Idle lane with an expired lease
- GIVEN lane `infra` with track 5 closed and track 6 open, assigned to `chi` with a `claim` that expired yesterday
- WHEN the Lanes view is shown
- THEN the `infra` header shows State "Idle", Held by `chi` and Lease "expired <yesterday date and time>"

#### Scenario: All tracks closed
- GIVEN lane `fe` whose only track is closed
- WHEN the Lanes view is shown
- THEN the `fe` header shows State "All tracks closed" and Tracks "1/1", and no Held by or Lease

#### Scenario: Not started and blocked
- GIVEN lane `x` with two open unassigned tracks without blockers, and lane `y` whose first open track is blocked by an open bead that is not a merge gate
- WHEN the Lanes view is shown
- THEN `x` shows State "Not started" and `y` shows State "Blocked"

### REQ-UI-118: Lane box header and colours
<!-- base: e68b6fe080f1e8337e86ae91f707ac1548f97f3651700145d4210f6f5312bdb5 -->
Each lane box of REQ-UI-117 SHALL show a header with a colour swatch, the lane name in a heavier weight and the lane's state as an icon and words (REQ-UI-112) on its first line, and the holder and the lease, joined by a comma, and the strand of the lane's tracks (REQ-UI-112, REQ-UI-138) in the muted colour on its second line, cut with an ellipsis and with the full text as `title`. The box SHALL have a background tint and a border in the lane's colour: lane colour `k` of eight categorical colours with a light and a dark step each, `k` being the position of the lane name among the names of the scope's lanes sorted, counted again from 1 after 8, so that a filter never changes a lane's colour. Text in a box SHALL keep the text colours, never the lane colour, at a contrast of at least 4.5:1 (REQ-UI-110). The "No lane" box SHALL have a dashed neutral border, no swatch and no state.
Source: `assets/2026-11-20/mockup/index.html`, `assets/2026-11-20/shots/b-dark.png`

#### Scenario: Header
- GIVEN lane be with track 1 closed and track 2 in progress held by ann with a lease until tomorrow 16:00
- WHEN the Graph of `ex-e12` is shown
- THEN the be box header reads "be" and "Running" on its first line and "ann, lease until <tomorrow> 16:00" and the strand with "1/2" on its second line

#### Scenario: Colours follow the lane name
- GIVEN lanes be, fe, infra and qa, and the assignee filter showing only bao (lane fe)
- WHEN the Graph of `ex-e12` is shown with and without the filter
- THEN the fe box has lane colour 2 in both cases, and be, infra and qa have colours 1, 3 and 4 when shown

#### Scenario: No lane box
- GIVEN two tracks of `ex-e12` without a lane
- WHEN the Graph is shown
- THEN they sit in a dashed box "No lane" with the strand "1/2" and no swatch or state

### REQ-UI-121: Epic lanes summary and tracks table
<!-- base: 3ec4d754893d12013a61bdd05f03caec3c56d72d0fb9eb8c69e2ae66bef18d96 -->
Under the cards, the Overview tab SHALL show, while the epic has lanes (REQ-UI-111), a section "Lanes" with one row per lane in the row order of the Lanes view: the lane colour of REQ-UI-118 as a swatch and pale background, the lane name, its state (REQ-UI-112) as an icon and words, the holder and lease, what it waits for ("waits for <lane> #<N> (merge pending)" or "(merged)" for each merge gate of its first open track), and the strand of REQ-UI-138, with a link "Open the Lanes tab". It SHALL then show a section "Tracks" with a table of the epic's children that are not merge gates, with the columns Id (linking to the bead page), Title (cut with an ellipsis and `title`), State (REQ-UI-064), Lane (the lane of REQ-UI-115 with its colour dot, or "No lane"), Assignee (REQ-UI-135, "Unassigned" when none), Points ("–" when none) and Blocked by (the open blockers' ids, a merge gate written "<lane> #<N>, merge pending"), first ordered by Id; WHEN the user activates a column header other than Blocked by, the table SHALL sort by that column, ascending then descending, with `aria-sort` on that header. Below 1024px the table SHALL keep Id, Title and State and let the rest scroll sideways within the table.
Source: `assets/2026-11-21/epic-page/mockup/index.html`

#### Scenario: Lanes summary
- GIVEN epic `ex-e12` with lanes be, fe, infra and qa
- WHEN its Overview is shown
- THEN the Lanes section lists be, fe, infra and qa with their states, and qa reads "waits for be #2 (merge pending), fe #3 (merged)" and the strand "0/1"

#### Scenario: No lanes section
- GIVEN epic `ex-e3` without lanes
- WHEN its Overview is shown
- THEN there is no Lanes section and the Tracks table has no colour dot

#### Scenario: Tracks table
- GIVEN epic `ex-e12` with 8 tracks and a merge gate child
- WHEN its Overview is shown
- THEN the Tracks table has 8 rows ordered by id, no row reads "Waits for", and the row of `ex-e12.4` reads Blocked, "qa", "Unassigned" and "be #2, merge pending"

#### Scenario: Sort by a column
- GIVEN the Tracks table of `ex-e12`
- WHEN the user activates the State header twice
- THEN the rows are ordered by state ascending and then descending, and the header has `aria-sort` "descending"

### REQ-UI-115: Lane on a bead
<!-- base: ef4a2116f8e638dcb763efad23d5d1e96f641988289fc2ac0c174a23ad1a7859 -->
WHERE a bead's `lane` is not `null` (REQ-BEADS-019), its List row, its Board and Focus cards, its Graph node, its Gantt child row (REQ-MILESTONE-UI-015), its bead page and its details panel SHALL show its lane as text (REQ-UI-140): a dot and the lane name, the dot in the lane colour of REQ-UI-118 where the lanes of its scope are drawn (the Tracks table of REQ-UI-121) and in the muted colour elsewhere, cut with an ellipsis and with the title "Lane <name>"; the cards of the Lanes view and the cards inside the lane boxes of the Graph view (REQ-UI-117), whose row or box names the lane, SHALL NOT. The labels of a bead SHALL NOT show its `lane:<name>` label when it has a `lane`, nor its `track:<N>` label when it has a `track`. The facts of a bead page (REQ-UI-110) SHALL add Lane (the name), Track ("#<N>", followed by the plan's file name when `track.plan` is known) and Lease ("until <date>" or "expired <date>" as in REQ-UI-112) when the bead has them.

#### Scenario: Chip in every view
- GIVEN track 2 of `ex-e12` in lane `be`, labelled `lane:be` and `track:2`
- WHEN its List row, Board card, Gantt child row and bead page are shown
- THEN each shows the lane "be" with the title "Lane be", and no label reads `lane:be` or `track:2`

#### Scenario: No lane inside a lane box
- GIVEN the Graph view with `scope=ex-e12`, whose tracks have lanes
- WHEN it is shown
- THEN the card of track 2 sits in the box headed "be" and shows no lane

#### Scenario: Facts
- GIVEN track 2 with `track` `{"plan": ".planning/plans/2026-11-20-shop.md", "number": 2}` and a `claim` expiring tomorrow at 16:00
- WHEN its bead page is shown
- THEN the facts include Lane "be", Track "#2 2026-11-20-shop.md" and Lease "until <tomorrow> 16:00"

#### Scenario: Bead without a lane
- GIVEN a bead whose `lane` is `null`
- WHEN its List row is shown
- THEN it shows no lane

### REQ-UI-116: Merge gates in the views
<!-- base: 85edbd50e910a8d40511f5046b158ad0731e24183c42acff8737d5161d4b33fd -->
The List, Board, Focus and My Tasks views SHALL NOT show merge gates (REQ-BEADS-019), and no count of children or tracks that the frontend shows ("n of m done" of a Graph node, the child counts of a List row and of a bead page) SHALL count them. WHILE the Graph view draws no lane boxes (REQ-UI-117), it SHALL draw a merge gate as a node with a dashed border and a merge icon that reads, in place of its title, "Waits for <lane> #<N> to merge" (`<lane>` its `waits_for.lane`, else "track" without the `#`) and, in place of its state, "Waiting" while it is not closed or "Merged" when it is closed; WHILE it draws lane boxes, a merge gate SHALL be a label on an arrow as in REQ-UI-117. The bead page of a merge gate SHALL show the same words as its title and state, keep its own title as a fact "Placeholder", and add the fact "Waits for" with the plan path and the track number. In the Dependencies of a bead page (REQ-UI-028), a merge gate SHALL read "Waits for <lane> #<N>, merge pending" or "Waits for <lane> #<N>, merged", with `<lane> #<N>` written as on its Graph node.

#### Scenario: Not on the Board
- GIVEN an open merge gate without blockers and an open task without blockers
- WHEN the user opens the Board, List and Focus views
- THEN the task is shown and the merge gate is not

#### Scenario: Not counted as a child
- GIVEN epic `ex-e12` with 8 tracks and a merge gate whose parent is `ex-e12`
- WHEN its Graph node is shown in the project scope
- THEN it reads "n of 8 done"

#### Scenario: Merge gate node
- GIVEN the closed merge gate `ex-g3` without a parent, waiting for track 3 of lane `fe`, and "Show closed" on
- WHEN the Graph view of the project is shown
- THEN the gate is a dashed node with a merge icon reading "Waits for fe #3 to merge" and "Merged"

#### Scenario: Merge gate label in lane boxes
- GIVEN an open merge gate waiting for track 2 of lane `be`, in the Graph view of `ex-e12`
- WHEN the view is shown
- THEN no node reads "Waits for be #2 to merge" and the arrow from track 2 to the qa box carries "Waiting for be #2"

#### Scenario: Dependencies of a track
- GIVEN track 4 blocked by an open merge gate waiting for track 2 of lane `be` and a closed one waiting for track 3 of lane `fe`
- WHEN the bead page of track 4 is shown
- THEN its Dependencies read "Waits for be #2, merge pending" and "Waits for fe #3, merged"

### REQ-UI-117: Lane clusters in the Graph view
<!-- base: 280e2ec2b10b94daa1c2a72424794ad18ef4e05ab4c339c6271bc220339d8032 -->
WHILE the scope of the Graph view (REQ-UI-106) has a loaded child that is not a merge gate and whose `lane` is not `null` (REQ-BEADS-019, the condition of the Lanes tab in REQ-UI-111), the Graph view SHALL draw, instead of the layers of REQ-UI-048:
- one box per lane of the scope's children that are not merge gates, holding the cards of its drawn tracks, and one dashed "No lane" box for the drawn children without a lane;
- the boxes in tiers from left to right: a box, the "No lane" box included, is in the tier to the right of every box whose tracks its tracks wait for, directly or through a merge gate (REQ-UI-111); the boxes of one tier stand one under another in the row order of the Lanes view; the "No lane" box comes last in its tier, and in the last tier when none of its tracks depends on or blocks a track of a lane; lanes that wait for each other in a loop share one tier;
- the cards inside a box from left to right by their dependency layer within the lane, the cards of one layer one under another;
- an arrow between two cards of one box for each dependency between them, and an arrow from the right edge of a card to the left edge of the box of another lane, level with the waiting card, for each dependency of that lane's tracks on it, directly or through a merge gate, so that no dependency between drawn cards goes without an arrow; an arrow to a box that is not in a later tier (lanes in a loop) runs in a channel below every box;
- no node for a merge gate, but a label on its arrow in the gap between two tiers, on the surface colour and without a border: "Waiting for <lane> #<N>" on a dashed arrow while the gate is not closed, "Merged <lane> #<N>" when it is closed (`<lane>` and `<N>` from its `waits_for`); and, for a gate whose track is not drawn, the label "Waiting for track <N>" or "Merged track <N>" on the top edge of the waiting box.

The view SHALL leave out a box with no drawn card, SHALL NOT offer the switch "Only linked" (REQ-UI-081) and SHALL keep the selection, details panel, Escape, opening and screen-reader list of REQ-UI-051, REQ-UI-052, REQ-UI-054 and REQ-UI-106. WHEN a card has focus, Arrow Left and Arrow Right SHALL move to the previous or next card of its box and, from the first or last card of a box, to the card that an arrow of the focused card comes from in the tier on the left or leads to in the tier on the right, the nearest by y when there are several, else to the card of that tier nearest by y; Arrow Up and Arrow Down SHALL move to the card nearest by x in the box above or below in the same tier. No arrow, label or box SHALL be drawn over a card or over the text of a header.

#### Scenario: Boxes in tiers
- GIVEN epic `ex-e12` with lanes be (tracks 1 and 2), fe (track 3), infra (tracks 5 and 6), qa (track 4, waiting for tracks 2 and 3 through merge gates) and two tracks without a lane, with "Show closed" on
- WHEN the user opens the Graph view with `scope=ex-e12`
- THEN boxes be, fe and infra stand one under another in the first tier on the left, qa and then "No lane" stand in the second tier to their right, and no node reads "Waits for"

#### Scenario: Tracks left to right
- GIVEN track 2 of lane be blocked by track 1
- WHEN the Graph of `ex-e12` is shown
- THEN the card of track 2 is right of the card of track 1 inside the be box, with an arrow from track 1 to track 2

#### Scenario: Gate labels
- GIVEN track 4 of lane qa blocked by an open merge gate waiting for track 2 of lane be and a closed one waiting for track 3 of lane fe
- WHEN the Graph of `ex-e12` is shown
- THEN a dashed arrow from the right edge of track 2 to the left edge of the qa box carries "Waiting for be #2", and an arrow from track 3 to the qa box carries "Merged fe #3", both labels in the gap between the two tiers

#### Scenario: Track not drawn
- GIVEN a merge gate titled `external: .planning/plans/other.md#7` that blocks track 4 and whose track is not a child of `ex-e12`
- WHEN the Graph of `ex-e12` is shown
- THEN the label "Waiting for track 7" is on the top edge of the qa box and no arrow is drawn for it

#### Scenario: No lane box with dependencies
- GIVEN a track without a lane that is blocked by track 2 of lane be, and a track of lane fe blocked by another track without a lane
- WHEN the Graph view of the scope is shown
- THEN the "No lane" box is in the tier to the right of be, and an arrow runs from track 2 to the "No lane" box and another from the "No lane" track to the fe box

#### Scenario: Lanes in a loop
- GIVEN lane x with a track blocked by a track of lane y, and lane y with a track blocked by a track of lane x
- WHEN the Graph view of the scope is shown
- THEN boxes x and y share a tier, both arrows are drawn in the channel below the boxes, and the cycle warning names x and y

#### Scenario: Scope without lanes
- GIVEN epic `ex-e3`, whose tracks have no lane
- WHEN the user opens its Graph view
- THEN the nodes are drawn in layers as in REQ-UI-048 with no box, and the switch "Only linked" is offered

#### Scenario: Keys between boxes
- GIVEN the focus on track 2, the last card of the be box
- WHEN the user presses Arrow Right, then Enter
- THEN the focus moves to track 4 in the qa box, and Enter selects it and the details panel shows it

### REQ-UI-090: Delivery flow view
<!-- base: 5077cd4af333c4b31b513ead721463aca73a19617ff9fbf65f5ef980094748e5 -->
The Delivery tab SHALL show, in this order:
- A row of figures: beads closed (`totals.closed`), and the median cycle time and median lead time from `delivery.overall` ("—" when absent).
- Beads closed per ISO week, as a column chart stacked by type with a legend.
- Cycle time and lead time as two range charts side by side, each with a dot at the median and a tick at the 85th percentile. A switch SHALL choose between By type (the default) and By member. Each range SHALL show, on hover and on focus, its type or member, the number of beads, the median and the 85th percentile.
- The estimate table of REQ-REPORTS-004, when it has rows. Each row SHALL show its estimate as "<n>d", or "<p> pt" when it has `points`, and its actual working days. A row with an estimate in days SHALL show as text (REQ-UI-140), not as a chip, the actual minus the estimated working days, rounded to one decimal:
  - "+<n> d" in the warning color when the difference is above 0;
  - "on estimate" when it is 0;
  - "−<n> d" when it is below 0.

  A row with points and no estimate in days SHALL show "<x> d/pt" from its `days_per_point` in place of that difference.

The Delivery tab SHALL NOT show beads in progress; the Team tab shows them (REQ-REPORTS-013 to REQ-REPORTS-016).
Source: `assets/2026-11-12/mockup/index.html`

#### Scenario: no estimates
- GIVEN a report without estimated epics
- WHEN the page is shown
- THEN no estimate table is shown

#### Scenario: by member
- GIVEN a report whose `by_member` holds `ann` with median cycle time 1.5 days
- WHEN the user picks By member
- THEN both range charts show one range per member and `ann`'s cycle range has its dot at 1.5 days

#### Scenario: estimate difference
- GIVEN epics estimated at 5 working days that took 7, 3 and 4.5
- WHEN the Delivery tab is shown
- THEN their differences read, as text, "+2 d" in the warning color, "−2 d" and "−0.5 d"

#### Scenario: points row
- GIVEN an estimate row with `estimate_days: null`, `points: 5`, `actual_days: 7` and `days_per_point: 1.4`
- WHEN the Delivery tab is shown
- THEN the row reads "5 pt", "7" and "1.4 d/pt", with no difference

#### Scenario: no work in progress
- GIVEN the Delivery tab is shown
- WHEN the figures and sections are read
- THEN there is no "In progress now" figure, no "Oldest in progress" table and no "In progress by member" chart

### REQ-UI-109: Kind, capabilities and estimate in the Beads views
<!-- base: 89f8d56b4eaa13203113b9e235e356c826423ecfe44c597631274be7edf153b8 -->
The frontend SHALL show the word "Technical" or "Parity" (REQ-UI-140) for an epic of that kind, and no kind for a capability epic, on its List row, its Board and Focus card, its bead page and its Gantt label; SHALL show the bead's capabilities as text, joined by commas, on its bead page; SHALL show on the bead page the size of REQ-UI-110 (REQ-UI-028), "<n>d" counting 480 minutes of `estimate_minutes` as one working day and rounding to one decimal, or "<p> pt" with its `points_reason` on the line under it; and SHALL show on an epic's List row, at every width, its complexity (REQ-UI-028) as text and its size as REQ-UI-110 describes ("<p> pt" when it has `points`, else "<n>d"), among the items that give way before the title (REQ-UI-044).

#### Scenario: Technical epic
- GIVEN technical epic `e-1` with capabilities `beads` and `ui`, complexity `medium` and `estimate_minutes: 1440`
- WHEN its List row and its bead page are shown
- THEN the row shows "Technical", "medium" and the size "3d", and the bead page shows "Technical", the capabilities "beads, ui", and the size "3d"

#### Scenario: Capability epic
- GIVEN capability epic `e-2` without an estimate
- WHEN its List row is shown
- THEN it shows no kind and no estimate

#### Scenario: Partial day
- GIVEN a task with `estimate_minutes: 240`
- WHEN its bead page is shown
- THEN it shows the size "0.5d"

#### Scenario: Pointed epic
- GIVEN epic `e-3` with complexity `medium`, `points: 5` and `points_reason: "new endpoint and UI"`, and epic `e-4` with `points: 3` and no complexity
- WHEN their List rows and the bead page of `e-3` are shown
- THEN `e-3`'s row shows "medium" and the size "5 pt", `e-4`'s shows the size "3 pt", and the bead page of `e-3` shows the size "5 pt" and "new endpoint and UI"

#### Scenario: Size at every width
- GIVEN epic `e-3` with complexity `medium` and `points: 5`
- WHEN its List row is shown at 390px and at 1440px
- THEN both rows show "medium" and the size "5 pt"

### REQ-UI-132: Tooltips for marks and counts
<!-- base: 19a2fe2615972a29271d8a54c982494a42173d231acb70cbc389a7fe26cdcbbe -->
WHEN the pointer rests on a state mark (REQ-UI-064), a size or points value, the word Prep or a Prep count, a lane or lane count, a strand (REQ-UI-138), a Gantt verdict (REQ-MILESTONE-UI-024), a comment or dependency indicator (REQ-UI-066), or a count of blocked, done or in-progress beads, and WHEN keyboard focus reaches one of them that takes focus, the frontend SHALL show within 500 ms a tooltip with one sentence that says what it means, and for a count the rule it counts by and the scope it counts in, SHALL tie the tooltip to the element with `aria-describedby`, and SHALL close it on Escape, on blur and when the pointer leaves; the native `title` SHALL remain only for text cut short (REQ-UI-107).

#### Scenario: Blocked count
- GIVEN the Projects card of `example` with "blocked 4"
- WHEN the user moves the keyboard focus to it
- THEN a tooltip reads "Blocked: status blocked, or waiting on an open blocker of its own or of a parent. Prep tasks are counted apart." and Escape closes it

#### Scenario: Dependency indicator
- GIVEN a bead card with the dependency indicator 2
- WHEN the pointer rests on the indicator
- THEN a tooltip says what the 2 dependencies are, and the indicator has no `title`

### REQ-UI-133: Legend
<!-- base: 61468990ae0e349ce6a92087dbe3c03fbb48c66099314d2b7c51ba8aac0c714a -->
The Beads page, the milestone page and the Reports page SHALL offer a "Legend" control in their header that, on a click, a tap, Enter or Space, opens a panel listing, each with its look and one sentence, the state glyphs (REQ-UI-064), the strand (REQ-UI-138), the size and points, Prep, lanes, the comment and dependency indicators, on the milestone page the two verdict marks of the Gantt (REQ-MILESTONE-UI-024), and what blocked, done and progress mean; the panel SHALL close on Escape, on a click outside it and on the control, SHALL return focus to the control, and SHALL fit inside a window 360px wide.

#### Scenario: Open and close
- GIVEN the Beads page
- WHEN the user activates "Legend" and then presses Escape
- THEN the panel lists the five state glyphs, the strand and the meaning of blocked, done and progress, and then closes with the focus back on "Legend"

#### Scenario: Phone
- GIVEN a window 390px wide
- WHEN the user taps "Legend" on the milestone page
- THEN the panel opens inside the window and the page does not scroll sideways

### REQ-UI-134: Plain labels in PM views
<!-- base: 16348b8107e9fdee59c7a8603cf3107a7b3dc22e01955e0c1ccbae289f24ea82 -->
Type: non-functional
Category: usability
The Milestones list, the milestone page and the Reports page SHALL use these words: "Commitment met" for say/do, "Parallel lanes" for the number of lanes, "Not estimated" for unestimated, "days per point" for d/pt, the strand of REQ-UI-138 for the tracks of an epic, "Prep <n>/<m>" for its prep tasks, "Spec approved" and "Spec not approved yet" for the spec of an epic, "unassigned" for beads without an assignee, and "late" only as REQ-MILESTONE-UI-023 defines it; each of these SHALL carry a tooltip (REQ-UI-132) that says what it counts.

#### Scenario: Milestones list
- GIVEN milestone M1 with `velocity.say_do: 0.62` and `lanes: 2`
- WHEN the Milestones list is shown
- THEN its row reads "Commitment met 62%" under the column "Commitment met", and its lanes under the column "Parallel lanes"

#### Scenario: Gantt row
- GIVEN epic `ex-e3` with 5 of 11 tracks closed, 1 of 3 prep tasks closed and a confirmed spec
- WHEN its Gantt row is shown
- THEN its second line shows the strand with "5/11", "Prep 1/3" and "Spec approved"

### REQ-UI-003: Workflow state display
<!-- base: 74d726be3ea5b4b7785cf3d68717f89c839b1150ff67381ca97404339c89c517 -->
The Projects page SHALL show, for each project with `workflow` data, "Workspace of <n> repos" with a "Show repos" control that lists each repo's path, branch and shape and marks a repo that is frozen or not present, "Team mode on <host>" while team mode is on, an alert listing the `decision` when it is `hold` together with the `warnings` and `remedies`, and "<n> review waiver(s)" with each waiver's task, reason and actor, showing none of them when it is absent or empty; it SHALL NOT show the default workflow's stage and gates.

#### Scenario: Workspace and team
- GIVEN a project with a workspace of 8 repos, one of them frozen, and team mode on with host `github`
- WHEN the Projects page loads and the user chooses "Show repos"
- THEN the card shows "Workspace of 8 repos" and "Team mode on github", then the 8 repos with the frozen one marked

#### Scenario: Health alert
- GIVEN a project with `decision` `hold`, the warning "event log unreadable" and one review waiver for `t-1`
- WHEN the Projects page loads
- THEN the card shows an alert with "hold" and the warning, and "1 review waiver" naming `t-1`

#### Scenario: Plain project
- GIVEN a project without workspace, team, warnings or waivers and the default workflow at stage `discuss`
- WHEN the Projects page loads
- THEN the card shows none of these and no default-workflow stage or gate chips

### REQ-UI-072: Breadcrumb
<!-- base: 08dfd985c01432f5c6afd25fc0ec0fcd7ecd882bfdd15ee0a6e74e94f5cae99d -->
WHEN a bead is shown as a page, not as the details panel of another view, the bead page SHALL show a navigation labelled "Breadcrumb" with an ordered list of: one link to the remembered place (REQ-UI-073) named for it, which is "Beads" followed by the name of its view and, when a search, a status, priority, label, type, assignee or sprint filter or "Show closed" is active, ", N filters" where N counts them, the title of the milestone with the same view and filter count for the Beads tab of a milestone page, the title of the milestone for its other tabs, or "My Tasks", "Reports" or "Projects"; then the title of the bead's parent as a link to its page when it has one; then the title of the bead marked `aria-current="page"`. Each title SHALL be cut short to one line with the full title and the id as its `title`. Under 640px the breadcrumb SHALL show only the first link.

#### Scenario: Place and filters
- GIVEN the Beads page was last at `?project=a&view=board&status=open&q=fix`
- WHEN the bead page of `a-1` titled "Fix login" is shown
- THEN the breadcrumb reads "Beads › Board, 2 filters" then "Fix login", and the first link goes to `/beads?project=a&view=board&status=open&q=fix`

#### Scenario: Parent
- GIVEN the bead `a-2` has the parent `a-1` titled "Checkout"
- WHEN the bead page of `a-2` is shown
- THEN the breadcrumb has a link "Checkout" to `/beads/a/a-1` before the title of `a-2`

#### Scenario: No remembered place
- GIVEN no page was remembered in this tab
- WHEN the bead page of `a-1` is shown
- THEN the breadcrumb reads "Beads" then the title of `a-1`, and "Beads" goes to `/beads?project=a`

#### Scenario: Details panel
- GIVEN a bead shown in the details panel of the List view
- WHEN the panel is shown
- THEN it has no breadcrumb and keeps its "Open page" link

#### Scenario: From a milestone page
- GIVEN the Beads tab of milestone `m2` titled "Checkout v2" of project `a` was last at `?tab=beads&view=board&status=open`
- WHEN the bead page of `a-1` is shown
- THEN the breadcrumb reads "Checkout v2 › Board, 1 filter" then the title of `a-1`, and the first link goes to `/milestones/a/m2?tab=beads&view=board&status=open`

#### Scenario: From My Tasks
- GIVEN the My Tasks page was last at `/my-tasks?project=a`
- WHEN the user opens `a-1` from it
- THEN the breadcrumb reads "My Tasks" then the title of `a-1`, and "My Tasks" goes to `/my-tasks?project=a`

### REQ-UI-095: Report tabs
<!-- base: 2f17c8332bb100b6375ecaac37b19e86a97c4a2e48604a37236c7288c15d4c34 -->
WHILE the report sections are not listed in the sidebar (REQ-UI-129), the Reports page SHALL show the tabs Team, Delivery, Velocity and Quality, in that order, as a WAI-ARIA tab list in which Left and Right move between tabs. Under each tab name it SHALL show a headline:
- Team, from the team report of the selected milestone:
  - "Finished on time", or "Finished <n> d late" with a warning icon, for a closed milestone;
  - "Starts <start>" before its start;
  - "<closed> of <scope> done, late" with a warning icon when the milestone is late (REQ-MILESTONE-UI-023);
  - otherwise "<closed> of <scope> done, on pace", or ", behind pace" with a warning icon when `pace_needed` is above `pace`;
  - "No milestones" when the project has none;
  - no headline while "All projects" is selected.
- Delivery: "<closed> beads closed", where `<closed>` is `totals.closed`.
- Velocity: "<x> days per point" from the selected project's `days_per_point` (REQ-REPORTS-018), with "assumed" when it is assumed, once the Milestones list has loaded; no headline while "All projects" is selected or when `days_per_point` is `null`.
- Quality: "<rate> rework", with "—" in place of `<rate>` when `totals.rework_rate` is absent.

The page SHALL request the team report and the Milestones list (REQ-MILESTONE-UI-008, for the forecast `finish` of REQ-MILESTONE-UI-023 and for the Velocity tab) whenever a single project is selected, whatever the tab, and SHALL request the Milestones list at most once per project and refresh. WHILE the Milestones list is loading or after it failed, the Team headline SHALL apply REQ-MILESTONE-UI-023 without the forecast. It SHALL show no headline for a tab while its report loads or after it failed to load. It SHALL keep the selected tab in the URL query `tab` (`team`, `delivery`, `velocity` or `quality`), SHALL select Team when `tab` is missing or holds another value, including the retired `usage` and `coverage`, and SHALL keep the project, period, sprint, milestone and member when the tab changes. WHILE the window is narrower than the tab list, the tab list SHALL scroll sideways instead of widening the page and SHALL fade its edge on each side that has hidden tabs.
Source: `assets/2026-11-12/mockup/index.html`

#### Scenario: shared link
- GIVEN the URL `/reports?project=alpha&days=7&tab=quality`
- WHEN the page loads
- THEN the Quality tab is selected and its panel shows the report for `alpha` and 7 days

#### Scenario: unknown tab
- GIVEN the URL `/reports?project=alpha&tab=nope`
- WHEN the page loads
- THEN the Team tab is selected

#### Scenario: change tab
- GIVEN the Reports page for `alpha`, 90 days and the Delivery tab
- WHEN the user picks the Quality tab
- THEN the URL becomes `/reports?project=alpha&days=90&tab=quality` without a reload and no new report is requested

#### Scenario: velocity tab
- GIVEN the Reports page for `alpha` on the Delivery tab, whose milestones list has `days_per_point: {value: 1.4, measured_epics: 6, assumed: false}`
- WHEN the user picks the Velocity tab
- THEN the URL has `tab=velocity`, `GET /api/milestones?project=alpha` has been requested once, and the Velocity headline reads "1.4 days per point"

#### Scenario: headlines
- GIVEN a report with 41 closed beads and rework rate 0.09
- WHEN the page is shown
- THEN the headlines read "41 beads closed" and "9% rework", and no tab is named AI usage or Data coverage

#### Scenario: retired tab in a link
- GIVEN the URL `/reports?project=alpha&tab=coverage`
- WHEN the page loads
- THEN the Team tab is selected

#### Scenario: team headline
- GIVEN the team report of an open milestone with 27 of 64 beads closed, `pace` 3.6 and `pace_needed` 3.4, whose forecast `finish` is before its `end`
- WHEN the page is shown on the Delivery tab
- THEN the Team headline reads "27 of 64 done, on pace" without a warning icon

#### Scenario: late milestone headline
- GIVEN the team report of an open milestone with 27 of 64 beads closed whose forecast `finish` is after its `end`
- WHEN the page is shown
- THEN the Team headline reads "27 of 64 done, late" with a warning icon

#### Scenario: keyboard
- GIVEN the Delivery tab is selected and has focus
- WHEN the user presses Right
- THEN the Velocity tab is selected and has focus

#### Scenario: Hidden tabs are hinted
- GIVEN the Reports page at a window 360px wide where Quality does not fit
- WHEN the page is shown
- THEN the right edge of the tab list fades, and scrolling it to the end removes the right fade and shows a left one

### REQ-MILESTONE-UI-001: Milestones list
<!-- base: ec0ce005cd41eb6a0e2ad13b2b0adb0b9feb98bc8faae2a11b89cb00c6477acd -->
gin-console SHALL show a Milestones entry in the sidebar that opens a per-project list of milestones with title, status (REQ-MILESTONE-UI-022), start and end (and kickoff when set), parallel lanes, forecast finish, epic progress as the strand of REQ-UI-138 over the counts of REQ-MILESTONE-UI-025, commitment met, and warning count as "<n> warnings" after a dashed ring in the warning color, from `gin milestone list --all --json`, under the column headers Status, Milestone, Period, Parallel lanes, Commitment met, Epics and Warnings. Parallel lanes SHALL read "<n> lanes" ("1 lane" when `<n>` is 1), or "–" when the entry has no `lanes`. The forecast finish SHALL read "Finishes <date>" (REQ-UI-131) when the entry's `finish` is set, in the warning color when the milestone is late (REQ-MILESTONE-UI-023). Commitment met SHALL read "Commitment met <n>%" with the entry's `velocity.say_do` as a whole percent, or "–" when the entry has no `velocity` or its `say_do` is `null`. gin-console SHALL show a list entry's `error` in place of its progress and warnings, SHALL show "No dates" in place of the period of an entry whose `start` or `end` is `null`, SHALL cut a long title short with the full title as `title`, and SHALL NOT show the `unassigned_epics` count, which REQ-MILESTONE-UI-010 replaces with a list.
Source: `assets/2026-11-08/mockup/index.html#milestones`

#### Scenario: list
- GIVEN project P whose gin-workflow reports milestones M1 (active) and M2 (planned)
- WHEN the user opens Milestones for P
- THEN both milestones are listed with their status, period, lanes, progress, and warning count

#### Scenario: lanes and finish
- GIVEN project P whose `milestone list` reports M1 with `lanes: 2`, `end: 2026-11-12`, `finish: 2026-11-23`, and M2 with `lanes: 1`, `end: 2026-12-04`, `finish: 2026-12-01`
- WHEN the user opens Milestones for P
- THEN M1 shows "2 lanes" and "Finishes 23 Nov" in the warning color, and M2 shows "1 lane" and "Finishes 1 Dec" without it

#### Scenario: commitment met
- GIVEN project P whose `milestone list` reports M1 with `velocity.say_do: 0.62`, M2 with `velocity.say_do: null`, and M3 without `velocity`
- WHEN the user opens Milestones for P
- THEN M1 shows "Commitment met 62%", and M2 and M3 show "–" for commitment met

#### Scenario: older gin-workflow
- GIVEN project P whose `milestone list` entries have no `lanes` key
- WHEN the user opens Milestones for P
- THEN each row shows "–" for lanes and the rest of the row as before

#### Scenario: unassigned count not shown
- GIVEN project P whose `milestone list` reports `unassigned_epics: 4`
- WHEN the user opens Milestones for P
- THEN the page does not show a sentence counting roadmap epics outside milestones

#### Scenario: schedule error
- GIVEN project P whose `milestone list` reports M2 with `error` "dependency cycle: A -> B -> A"
- WHEN the user opens Milestones for P
- THEN M2 shows that error in place of its progress and warning count, and M1 is shown normally

#### Scenario: milestone without dates
- GIVEN project P whose `milestone list` reports M1 (active) and M4 with `start: null`, `end: null` and `error` "M4 has no start/end metadata"
- WHEN the user opens Milestones for P
- THEN M1 is shown normally, and M4 shows "No dates" and that error

### REQ-MILESTONE-UI-003: Milestone Gantt tab
<!-- base: eea05295ffafc2893dd569e5b7f8a9be70ac35d07450af3c88348952d1314574 -->
gin-console SHALL show, on a milestone's page, a Gantt tab drawing one continuous bar per epic, weekends included, from `planned_start` to `planned_end` of `gin milestone show --json`, as gin-workflow scheduled them on the milestone's lanes and without rescheduling them, in the look of the epic's state glyph (REQ-UI-064): filled in the In progress colour while it is in progress, in the Done colour when it is closed and in the Blocked colour when it is blocked (REQ-BEADS-021), an outline in the Ready colour when it is open, and a dashed outline in the Deferred colour when it is deferred, the part of a bar after the milestone `end` hatched in the warning colour, with a line at the JSON `today` date, a line at the milestone `end`, and each epic's warnings as the verdict of REQ-MILESTONE-UI-024, reading `spec_due` as "Spec due before kick-off", `after_integration` as "Ends after integration on <integration date>", `open_bugs` as "<count> open bug(s)" and `oversized` as "<days> working day(s) longer than the milestone", and any other code as the code itself.

#### Scenario: overflow shown
- GIVEN milestone M1 whose `show` output gives epic A warning `overflow` of 2 days
- WHEN the user opens the Gantt tab of M1
- THEN A's bar extends past the end line, the part past it hatched in the warning colour, and A's verdict reads "2 working days past the end"

#### Scenario: lane-bound dates
- GIVEN milestone M1 with `lanes: 1` whose `show` output places independent epics A on 2026-11-09 to 2026-11-10 and B on 2026-11-11 to 2026-11-12
- WHEN the user opens the Gantt tab of M1
- THEN B's bar starts on 2026-11-11, after A's bar ends, and not alongside A

#### Scenario: today from the JSON
- GIVEN milestone M1 whose `show` output has `today: 2026-11-04`
- WHEN the user opens the Gantt tab of M1
- THEN the today line is drawn at 2026-11-04 whatever the browser's date

#### Scenario: external blocker named
- GIVEN epic A in M1 with warning `external_blocker` and `external_depends_on` `[{"id": "E9", "milestone": "M2"}]`
- WHEN the user opens the Gantt tab of M1
- THEN A shows an external blocker warning naming E9 and M2

#### Scenario: newer warnings
- GIVEN epics in M1 with warnings `spec_due`, `after_integration` (integration 2026-11-24), `open_bugs` with `count: 2` and `oversized` with `days: 3`
- WHEN the user opens the Gantt tab of M1
- THEN their verdicts read "Spec due before kick-off", "Ends after integration on 24 Nov", "2 open bugs" and "3 working days longer than the milestone"

#### Scenario: One bar per epic
- GIVEN in-progress epic A planned from Thursday 2026-11-05 to Wednesday 2026-11-11
- WHEN the user opens the Gantt tab
- THEN A is one continuous bar filled in the In progress colour from 5 Nov to 11 Nov, across the weekend, and not one pill per working day

### REQ-MILESTONE-UI-013: Readable Gantt rows
<!-- base: b3bb8e48a806eb4d2ccf37700e4ab45baeb90f8298a6b27ca434cbde1200e5e8 -->
Each epic row of the Gantt SHALL show, in a label column 168px wide under 1024px windows, 300px from 1024px, 380px from 1280px and 440px from 1600px that stays visible while the chart scrolls and that no chart line, arrow, bar or title crosses, the state glyph (REQ-UI-064) and title on one line and the epic id (linking to its bead page), the estimate as text (REQ-UI-140), the period, the strand of its tracks (REQ-UI-138), prep and spec on the next, the estimate reading "<n>d", or "<n>d left" when the epic is in progress and its `remaining_days` is below its estimate, or "assumed <n>d" when it has no estimate and `assumed_days` is set, preceded by "<p> pt, " when the epic has `points`, each line cut short with an ellipsis instead of wrapping and the full title available on hover, except that under 1024px the items of the second line (id, estimate, period, strand, prep, spec) wrap onto further lines rather than being cut, followed by the verdict of REQ-MILESTONE-UI-024, the spec item being left out when a warning of the epic already says the spec is not confirmed; WHEN at least 90 px of chart are left after an epic's bar, the row SHALL also show the epic's title after the bar, cut short with an ellipsis before the next end or today line or the edge of the chart.

#### Scenario: long id
- GIVEN epic `gin-workflow-rm-process-hygiene` titled "Process hygiene: consistent skills, rules that bind where it matters"
- WHEN the Gantt is shown on a phone
- THEN the title takes one line cut short with an ellipsis, and the id, period and strand wrap onto the following lines, none of them cut to less than its first word

#### Scenario: title after the bar
- GIVEN epic A whose bar ends on the first day of a 10-day plan shown as `Whole milestone`
- WHEN the Gantt is shown
- THEN A's title is shown after its bar

#### Scenario: remaining and assumed days
- GIVEN an in-progress epic A with `estimate_days: 5` and `remaining_days: 2`, and an open epic B without an estimate and with `assumed_days: 3`
- WHEN the Gantt is shown
- THEN A's second line reads "2d left" and B's reads "assumed 3d"

#### Scenario: points
- GIVEN an open epic C with `points: 5` and `estimate_days: 7`, and an in-progress epic D with `points: 3`, `estimate_days: 4` and `remaining_days: 1`
- WHEN the Gantt is shown
- THEN C's second line reads "5 pt, 7d" and D's reads "3 pt, 1d left"

#### Scenario: Wide window
- GIVEN in-progress epic `ex-e3` with `points: 8`, `estimate_days: 20`, `remaining_days: 11`, 5 of 11 tracks closed and no confirmed spec, in an active milestone that warns "Spec not confirmed"
- WHEN the Gantt is shown at 2000px
- THEN the label column is 440px wide, the second line starts with the id and "8 pt, 11d left" and is cut with an ellipsis inside the column, it does not say "No confirmed spec", and no text of the label column overlaps a bar or a line

#### Scenario: Tail title stops at the end line
- GIVEN an epic whose bar ends 60px before the milestone's end line and whose title is longer than that
- WHEN the Gantt is shown
- THEN its title after the bar ends with an ellipsis before the end line

### REQ-MILESTONE-UI-015: Child beads on the Gantt
<!-- base: 0df09dc6904e5ea1aebce4757b35fd0e2d392e86b6fd6aa254bcdb81ad5f2dd7 -->
The Gantt SHALL load the project's beads, open and closed, and for each epic with beads whose `parent` is that epic and that are not merge gates (REQ-BEADS-019) SHALL show an expand button in its row, with the strand of REQ-UI-138 over its tracks when it has a track and "Prep x/y" (closed prep tasks over all prep tasks, REQ-BEADS-002) when it has a prep task, a track being a child that is neither a prep task nor a merge gate; WHEN the user expands an epic, the Gantt SHALL show under it one row per child that is not a merge gate, prep tasks included, ordered by id, with the child's state glyph (REQ-UI-064), its id (linking to its bead page), its title, the word "Prep" for a prep task (REQ-UI-140), its lane (REQ-UI-115), and "closed <date>" from `closed_at` for a closed child or its status otherwise, and SHALL shade the parent epic's period in those rows without drawing bars for them. Epics SHALL start collapsed, and expanding or collapsing one SHALL leave the others as they are. IF the beads cannot be loaded, THEN the Gantt SHALL be drawn without expand buttons or counts.

#### Scenario: expand
- GIVEN epic `gin-workflow-rm-cost-control` with four closed children, closed on 2026-11-01
- WHEN the user expands it
- THEN four rows `.1` to `.4` are shown under it, each with "closed 1 Nov", and the epic row shows the strand with "4/4"

#### Scenario: no children
- GIVEN epic A with no bead whose `parent` is A
- WHEN the Gantt is shown
- THEN A has no expand button and no closed count

#### Scenario: open child
- GIVEN epic B with child `B.2` in status `in_progress`
- WHEN the user expands B
- THEN the row of `B.2` reads "In progress" and has no closing date

#### Scenario: beads unavailable
- GIVEN the request for the project's beads fails
- WHEN the user opens the Gantt tab
- THEN the epics, bars and arrows are drawn and no epic has an expand button

#### Scenario: prep task
- GIVEN epic `e-1` with tracks `t-1` (closed) and `t-2` (open), and the closed prep task `p-1` labelled `prep` and `prep:mockup`, and epic `e-2` whose only child is the open prep task `p-2` labelled `prep`
- WHEN the user expands `e-1` and `e-2`
- THEN `e-1` shows the strand with "1/2" and "Prep 1/1" with rows `p-1`, `t-1` and `t-2`, `e-2` shows "Prep 0/1" and no strand with the row `p-2`, and only `p-1` and `p-2` show the word "Prep"

#### Scenario: merge gate and lane
- GIVEN epic `e-1` with track `t-1` in lane `be` (open) and merge gate `g-1` (open) whose parent is `e-1`
- WHEN the user expands `e-1`
- THEN `e-1` shows the strand with "0/1", the only row is `t-1` with the lane "be", and `g-1` has no row

### REQ-MILESTONE-UI-023: Late milestone
<!-- base: 58b09eb685f709cd79fd01331da8b264834a181387c2a21cd07db87f006ecb88 -->
Type: business-rule
A milestone SHALL be late WHEN it is not closed and today is after its `end`, WHEN it is not closed and its forecast `finish` (REQ-MILESTONE-UI-008) is after its `end`, or WHEN it is closed and the day it closed is after its `end`. The Milestones list (REQ-MILESTONE-UI-001), the milestone card of a bead page and of an epic Overview (REQ-UI-120), the Team tab (REQ-REPORTS-012) and the Team headline (REQ-UI-095) SHALL mark a milestone late by this rule only, and "behind pace" SHALL describe the pace of closing only, never lateness.

#### Scenario: Forecast after the end
- GIVEN active milestone `m1` ending on 1 Dec 2026 with a forecast `finish` of 16 Feb 2027, shown on 21 Nov 2026
- WHEN the Milestones list, the Team tab and the milestone card of one of its epics are shown
- THEN each marks `m1` late

#### Scenario: Past the end without a forecast
- GIVEN active milestone `m2` ending on 20 Nov 2026 with no forecast `finish`, shown on 21 Nov 2026
- WHEN the Team tab is shown
- THEN `m2` is marked late

#### Scenario: Closed on time and closed late
- GIVEN milestone `m3` ending on Friday 27 Nov 2026 and closed that day, and milestone `m4` with the same end closed on Tuesday 1 Dec 2026
- WHEN the Team tab is shown for each
- THEN `m3` reads "Closed, on time" and `m4` reads "Closed, 2 d late"

#### Scenario: Behind pace is not late
- GIVEN active milestone `m5` ending on 11 Dec 2026 with a forecast `finish` of 10 Dec 2026, `pace` 2.0 and `pace_needed` 3.4, shown on 21 Nov 2026
- WHEN the Team tab is shown
- THEN its headline says "behind pace" and nothing calls `m5` late

### REQ-REPORTS-012: Team tab
<!-- base: ae27226f879573aa70dbaa905e750253865eb17b0f28d4ee5817ab643c3df476 -->
WHILE a single project is selected, the Team tab of the Reports page SHALL request REQ-REPORTS-008 with the URL's `milestone`, and SHALL show:
- A Milestone select with the groups Active (`active`), Planned (`scheduled` and `planned`, by `start`) and Closed (latest `end` first), set to the answer's `milestone`.
- A Member select with "All members (<n>)" and each row of `members` as "<member> (<scope>)".
- A "Clear member" control while a member is selected.
- A link "Open Gantt" to the milestone page.
- The milestone line:
  - the title;
  - the milestone status of REQ-MILESTONE-UI-022 as its glyph and word (REQ-UI-064): Active, Scheduled or Planned, followed by ", late" with a warning mark when the milestone is late (REQ-MILESTONE-UI-023, its forecast `finish` taken from the Milestones list of REQ-UI-095), or "Closed, on time" or "Closed, <n> d late", where `<n>` is the working days from `end` to `closed_on`;
  - "<start> – <end>" (REQ-UI-131);
  - "working day <elapsed> of <working_days>, <days_left> left" while the period holds `today`, "starts in <n> working days" before `start`, or "finished <closed_on>" once closed.
- WHEN `undated` is above 0, the note "<undated> milestones without start and end dates are not listed".

Its selects SHALL be no wider than the panel, a long option cut short. It SHALL keep the milestone, member and bead status in the URL query (`milestone`, `member`, `status`). It SHALL put the answer's `milestone` in the URL when it differs. It SHALL select All members when `member` is not one of `members`. A change of milestone SHALL clear the member and status. The tab SHALL NOT show the period or sprint choice, and SHALL keep `days` and `sprint` in the URL for the other tabs.
Source: `assets/2026-11-12/mockup/index.html`, `assets/2026-11-12/team-active.png`

#### Scenario: shared link
- GIVEN the URL `/reports?project=alpha&tab=team&milestone=m1&member=ann&status=closed`
- WHEN the page loads
- THEN milestone `m1`, member `ann` and the Closed list are shown

#### Scenario: default milestone in the URL
- GIVEN the URL `/reports?project=alpha&tab=team`
- WHEN the answer's `milestone` is `m2`
- THEN the URL becomes `/reports?project=alpha&days=30&tab=team&milestone=m2` without a reload

#### Scenario: change milestone
- GIVEN the Team tab for `m2` with member `ann` and the Closed list
- WHEN the user picks `m1`
- THEN the team report for `m1` is requested, All members is selected and the default list of REQ-REPORTS-016 is shown

#### Scenario: late active milestone
- GIVEN active milestone `m2` whose forecast `finish` in the Milestones list is after its `end`
- WHEN the Team tab is shown
- THEN its status reads "Active, late" with a warning mark

#### Scenario: no period choice
- GIVEN the Team tab is selected
- WHEN the panel is shown
- THEN no period buttons and no sprint field are shown

#### Scenario: long options on a phone
- GIVEN a milestone titled with 120 characters and a member `nguyen.thi.thanh.huong.payments-team@example-company.com.vn`
- WHEN the Team tab is shown at 390px
- THEN both selects fit inside the window and the page does not scroll sideways

### REQ-REPORTS-013: Team figures
<!-- base: 5ea0d567ef317850720b531d81f1fc088373af7ce2ab2c1d935f4f067b88669a -->
The Team tab SHALL show a row of figures, in this order, from `team`, or from the selected member's row:
- Done: "<closed> of <scope>" and "<done> of scope" ("of assigned" for a member).
- In progress: the count and "oldest <n> d", in the warning color above 3 days, or "nothing started".
- Open: the count, and "<blocked> blocked, <unclaimed> unassigned" ("<blocked> blocked" for a member). This line is in the warning color when `blocked` is above 0.
- Pace or Throughput:
  - For the team, while `pace_needed` is not `null`: Pace, "<pace> done per day" and "needs <pace_needed> done per day to finish by <end>". Both are in the warning color when `pace_needed` is above `pace`.
  - Otherwise: Throughput, "<throughput> done per week".
- Median cycle: "<n> d" or "—".
- On time: the percentage, in the warning color below 100%. Under it: "<late_open> open after the end date" in the warning color when `late_open` is above 0, else "closed by <end>".
- Rework: the percentage or "—", and "<reopens> reopens, <bugs> bugs later".

Each figure SHALL carry a tooltip (REQ-UI-132) with the rule it counts by. Under the figures, "Scope by status" SHALL draw the scope as the strand of REQ-UI-138, its Ready being Open without blocked, with a legend giving each state's glyph, word and count.
Source: `assets/2026-11-12/mockup/index.html`, `assets/2026-11-12/team-active.png`

#### Scenario: behind pace
- GIVEN `team.pace` 2.0 and `pace_needed` 3.4
- WHEN the Team tab is shown
- THEN the Pace figure reads "2.0 done per day" and "needs 3.4 done per day to finish by 27 Nov", in the warning color

#### Scenario: member figures
- GIVEN member `ann` with scope 11, closed 6 and 1 blocked bead
- WHEN the user selects `ann`
- THEN the figures read "6 / 11", "55% of assigned", "1 blocked", and Throughput instead of Pace

#### Scenario: closed milestone
- GIVEN a closed milestone with `throughput` 13.2 and `on_time` 0.88
- WHEN the Team tab is shown
- THEN the figures show Throughput "13.2 done per week" and On time "88%" in the warning color

#### Scenario: open after the end date
- GIVEN an open milestone that ended yesterday with `late_open` 4
- WHEN the Team tab is shown
- THEN On time reads "4 open after the end date" in the warning color

### REQ-REPORTS-016: Team bead list
<!-- base: c46976eb3288ac4877b910a3575672d8b8c5d637217b829707412ae8027ebd62 -->
The Team tab SHALL show the scope beads of the selected member, or of every member, under the heading "Beads" ("Beads of <member>" when one is selected). A tab list holds Open, In progress, Closed and All, each with its count. The default is Open, or Closed for a closed milestone. The columns are:
- Open: Bead, Epic, Type, Assignee, Priority (`P<priority>`), a status as its glyph and word (REQ-UI-064), and Age (days since `created_at`). Sorted by priority, then oldest first.
- In progress: Bead, Epic, Type, Assignee, and "In progress for" (`age_days`, in the warning color above 3 days). Sorted longest first.
- Closed: Bead, Epic, Type, Assignee, Closed (the date), Cycle, On time as text ("On time", or "<late_days> d late" in the warning color), and Rework (the bead's `rework`, REQ-REPORTS-019). Sorted newest first.
- All: Bead, Epic, Type, Assignee, and a status as its glyph and word.

In every list:
- Bead shows the title linking to the bead page, with the id under it.
- Epic links to the epic's bead page.
- Pressing a column header sorts by that column, ascending first, and pressing it again reverses the order. The header is marked with `aria-sort`. Age sorts by its number of days, so descending puts the oldest bead first.
- The list shows 15 rows, then a "Show 15 more" control while more remain.
- An empty list says "No <status> beads in this milestone", adding " for <member>" when one is selected.
Source: `assets/2026-11-12/mockup/index.html`, `assets/2026-11-12/team-closed.png`

#### Scenario: counts follow the member
- GIVEN `ann` has 4 open, 1 in-progress and 6 closed beads
- WHEN the user selects `ann`
- THEN the tabs read Open 4, In progress 1, Closed 6 and All 11

#### Scenario: closed row
- GIVEN a closed bead `a-3` with cycle 0.9 days, `late_days` 2 and `rework` 0
- WHEN the Closed list is shown
- THEN its row shows "0.9 d", "2 d late" and "0", and its title opens `/beads/alpha/a-3`

#### Scenario: show more
- GIVEN 43 closed beads
- WHEN the Closed list is shown and the user presses "Show 15 more"
- THEN 30 rows are shown

#### Scenario: sort
- GIVEN the Open list sorted by priority
- WHEN the user presses the Age header twice
- THEN the rows are sorted by age, oldest first, and the header has `aria-sort="descending"`

### REQ-BEADS-022: Child counts
<!-- base: a14538e5b716e87efbb240cd1defbf64ed890d267583cf500bbc1e8904847712 -->
WHEN a client requests the bead list or a bead detail, the server SHALL add to each bead `child_counts`, an object with `total` and `closed`, the number of its direct children that are tracks (neither prep tasks, REQ-BEADS-002, nor merge gates, REQ-BEADS-019) and the number of those whose status is `closed`, `in_progress`, `blocked`, `ready` and `deferred`, the number of those tracks that are not closed in each state the Board gives them (REQ-UI-031, REQ-BEADS-021), and `prep_total` and `prep_closed`, the number of its direct children that are prep tasks and of those that are closed, counted over every bead of the export whatever `closed` the request has. A bead SHALL count as done when, and only when, its status is `closed`.

#### Scenario: Counts ignore the closed filter
- GIVEN epic `e-1` with tracks `t-1` and `t-2` (closed) and `t-3` (open), the closed prep task `p-1` labelled `prep`, and the merge gate `g-1` titled `external: .planning/plans/p.md#1`
- WHEN a client requests `GET /api/beads?project=<name>` without `closed=1`
- THEN `e-1` has `child_counts` `{total: 3, closed: 2, in_progress: 0, blocked: 0, ready: 1, deferred: 0, prep_total: 1, prep_closed: 1}` although `t-1`, `t-2` and `p-1` are not in the list

#### Scenario: Bead without children
- GIVEN a task without children
- WHEN a client requests its detail
- THEN its `child_counts` is `{total: 0, closed: 0, in_progress: 0, blocked: 0, ready: 0, deferred: 0, prep_total: 0, prep_closed: 0}`

#### Scenario: Counts by state
- GIVEN epic `e-2` with the tracks `t-1` (closed), `t-2` (in progress), `t-3` (in progress and blocked by the open bead `x`), `t-4` (open and ready) and `t-5` (deferred)
- WHEN a client requests `GET /api/beads?project=<name>`
- THEN `e-2` has `child_counts` `{total: 5, closed: 1, in_progress: 1, blocked: 1, ready: 1, deferred: 1, prep_total: 0, prep_closed: 0}`

## REMOVED
