# Spec Delta: Readable ui

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

### REQ-UI-110: Readable text and facts
On every page, at every window width from 360px and in the light and the dark theme, the frontend SHALL NOT draw the text of one element over the text of another, or over a chart bar, line or arrow that the text does not belong to; SHALL end every text it cuts short with an ellipsis and give the full text as `title` (REQ-UI-107); SHALL give text a contrast with its background of at least 4.5:1, or 3:1 for text of at least 18.66px bold or 24px; SHALL show a set of facts about one thing (such as owner, assignee, dates and counts) as label/value pairs, each label in the muted color and each value in the text color and a heavier weight, never as one run of text of one style; SHALL show a priority as a `P<n>` pill, in the destructive color for P0 and the warning color for P1; and SHALL show a size as a badge that reads "<p> pt" for a bead with `points`, else "<n>d" from `estimate_minutes`.

#### Scenario: No overlapping text
- GIVEN the example project
- WHEN the Projects, Beads (List, Board, Focus, Graph), bead, My Tasks, Milestones, milestone (Gantt at each zoom, Beads, Retro) and Reports (each tab) pages are shown at 390, 1024, 1440 and 1920px in both themes
- THEN no text overlaps other text or a bar, line or arrow it does not belong to, and no text spills out of its box without an ellipsis

#### Scenario: Facts as label and value
- GIVEN the bead page of an epic and the velocity line of a kicked-off milestone
- WHEN they are shown
- THEN each fact shows its label in the muted color and its value in the text color with a heavier weight

#### Scenario: Priority pill
- GIVEN beads at P0, P1 and P2
- WHEN their List rows are shown
- THEN `P0` is a pill in the destructive color, `P1` in the warning color, and `P2` in the neutral color

#### Scenario: Contrast
- GIVEN the Reports Team and Velocity tabs in the light and the dark theme
- WHEN they are shown
- THEN every milestone id and label has a contrast of at least 4.5:1 with its background

## MODIFIED

### REQ-UI-028: Bead detail
<!-- base: cf0b4f435a515b58831386ada7744c0bd1aedb198438dfea059709e24f9c4c28 -->
The bead page SHALL show the bead's id, title and type, a row of badges with its state as REQ-UI-064 describes (for example "In progress", never the raw `in_progress`), its priority as a `P<n>` pill (REQ-UI-110) and its size as REQ-UI-110 describes, the reason of its points (`points_reason`) on its own line under that row, its labels, and its owner, assignee, creator, creation and update times and comment count as label/value pairs (REQ-UI-110), each time written as "<d> <Mon> <yyyy> <HH:mm>" without seconds, its description rendered as GitHub-flavored Markdown (headings, emphasis, lists, task lists, inline code, code blocks, tables, block quotes and links), its dependencies and the beads it blocks (each with id, title and status, linking to that bead in the same project), and for an epic its children with a progress bar of closed tracks over all tracks when it has a track. WHEN an epic has prep tasks (REQ-BEADS-002), the bead page SHALL show "Prep x/y" next to the progress bar, where x is its closed prep tasks and y all its prep tasks, and SHALL mark each prep task in the children list with a "Prep" chip. Raw HTML in the description SHALL be shown as text and SHALL NOT create elements, a link SHALL open in a new tab with `rel="noreferrer"`, and a link whose URL is not `http`, `https` or `mailto` SHALL be shown as text.
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
- THEN the children are listed and a progress bar reads 3 of 4

#### Scenario: Epic with a prep task
- GIVEN epic `e-1` with tracks `t-1` (closed) and `t-2` (open), and the closed prep task `p-1` labelled `prep` and `prep:mockup`
- WHEN the page of `e-1` loads
- THEN the progress bar reads 1 of 2, "Prep 1/1" is shown next to it, and the children list shows `t-1`, `t-2` and `p-1`, with a "Prep" chip on `p-1` only

#### Scenario: Badges and facts
- GIVEN in-progress P1 epic `e-3` with `points: 5`, `points_reason: "new endpoint and UI"`, owner `lead@example.com`, assignee `bao`, created by `lead`, created and updated at 2026-05-11 16:00:00 and 0 comments
- WHEN its page loads
- THEN the badge row shows "In progress", "P1" and "5 pt", the line under it reads "new endpoint and UI", and the facts read Owner "lead@example.com", Assignee "bao", Created by "lead", Created "11 May 2026 16:00", Updated "11 May 2026 16:00" and Comments "0", each label in the muted color and each value in the text color

### REQ-UI-065: Card anatomy
<!-- base: 15f2bcc97504676ee04302c5507b26acb29c50f50396a2bcf25c095183583a04 -->
A bead card of the Board and Focus views SHALL show on its first line the id in the monospace face shortened as REQ-UI-107 describes and `P<n>`, below it the title as a link to `/beads/<project>/<id>`, and on its last line the state mark of REQ-UI-064, the type badge of REQ-UI-067, the size badge of REQ-UI-110 when the bead has `points` or `estimate_minutes`, the indicators of REQ-UI-066 and the assignee when there is one, the title and the assignee wrapping inside the card (REQ-UI-107).

#### Scenario: Full card
- GIVEN a ready P1 task assigned to alice with 2 comments and 1 dependency
- WHEN its card is shown
- THEN it shows the id and `P1`, the title link, "Ready", the type "task", a comment indicator 2, a dependency indicator 1 and alice

#### Scenario: Bare card
- GIVEN a bead with no assignee, no comments and no dependencies
- WHEN its card is shown
- THEN the last line shows only the state and the type

#### Scenario: Card with points
- GIVEN an in-progress epic with `points: 8`
- WHEN its Board card is shown
- THEN its last line shows the state, the type and the size badge "8 pt"

### REQ-UI-109: Kind, capabilities and estimate in the Beads views
<!-- base: c2b6a5c402cf9c3c73ba3464a559326d5060fb4941595515229a5dbf772a79ef -->
The frontend SHALL show a "Technical" or "Parity" badge for an epic of that kind, and no kind badge for a capability epic, on its List row, its Board and Focus card, its bead page and its Gantt label; SHALL show the bead's capabilities as chips on its bead page; SHALL show on the bead page the size badge of REQ-UI-110 (REQ-UI-028), "<n>d" counting 480 minutes of `estimate_minutes` as one working day and rounding to one decimal, or "<p> pt" with its `points_reason` on the line under it; and SHALL show on an epic's List row, at every width, its complexity (REQ-UI-028) as text and its size as the badge of REQ-UI-110 ("<p> pt" when it has `points`, else "<n>d"), among the items that give way before the title (REQ-UI-044).

#### Scenario: Technical epic
- GIVEN technical epic `e-1` with capabilities `beads` and `ui`, complexity `medium` and `estimate_minutes: 1440`
- WHEN its List row and its bead page are shown
- THEN the row shows "Technical", "medium" and the size badge "3d", and the bead page shows "Technical", the chips `beads` and `ui`, and the size badge "3d"

#### Scenario: Capability epic
- GIVEN capability epic `e-2` without an estimate
- WHEN its List row is shown
- THEN it shows no kind badge and no estimate

#### Scenario: Partial day
- GIVEN a task with `estimate_minutes: 240`
- WHEN its bead page is shown
- THEN it shows the size badge "0.5d"

#### Scenario: Pointed epic
- GIVEN epic `e-3` with complexity `medium`, `points: 5` and `points_reason: "new endpoint and UI"`, and epic `e-4` with `points: 3` and no complexity
- WHEN their List rows and the bead page of `e-3` are shown
- THEN `e-3`'s row shows "medium" and the size badge "5 pt", `e-4`'s shows the size badge "3 pt", and the bead page of `e-3` shows the size badge "5 pt" and "new endpoint and UI"

#### Scenario: Size at every width
- GIVEN epic `e-3` with complexity `medium` and `points: 5`
- WHEN its List row is shown at 390px and at 1440px
- THEN both rows show "medium" and the size badge "5 pt"

### REQ-UI-004: Beads summary display
<!-- base: 825967e7bf8029aa2416a1a6953b37d66770e34ea2ae79e49017af1b0e662802 -->
The Projects page SHALL show, for each project with `beads` data, the counts open, in progress, blocked and ready, the blocked count in the warning color with a warning icon when it is above 0, the count `prep` as "prep <n>" when it is above 0, and the active epics as `id` and `title`, each epic in progress with its `workflow.stage` and, when its `warnings` or `review_waivers` are not empty, a warning mark with their count whose details show on hover and focus, an epic whose `workflow` is an error with "stage unknown" and the error as its details, and a ready epic with "ready", or a "no active epics" note when the list is empty.

#### Scenario: Counts and epics
- GIVEN a project with the counts 3, 1, 0, 2 and one active epic
- WHEN the Projects page loads
- THEN the card shows all four counts and the epic id and title

#### Scenario: Prep count
- GIVEN a project with the counts 3, 1, 0, 2 and `prep` 2, and a project with `prep` 0
- WHEN the Projects page loads
- THEN the first card shows the four counts and "prep 2", and the second card shows no prep count

#### Scenario: Stage per epic
- GIVEN in_progress epic `e-1` at stage `execute` with one review waiver, and ready epic `e-2`
- WHEN the Projects page loads
- THEN `e-1` shows `execute` and a warning mark "1", and `e-2` shows "ready"

#### Scenario: Blocked work stands out
- GIVEN a project with 19 blocked beads and a project with none
- WHEN the Projects page loads
- THEN the first card shows "blocked 19" in the warning color with a warning icon, and the second shows "blocked 0" in the normal color without it

### REQ-UI-095: Report tabs
<!-- base: 04f9b5dd13d2080d6cab24d4c76e41fcabfeb9d6e4b1f9966867fe4d86070554 -->
The Reports page SHALL show the tabs Team, Delivery, Velocity, AI usage, Quality and Data coverage, in that order, as a WAI-ARIA tab list in which Left and Right move between tabs. Under each tab name it SHALL show a headline:
- Team, from the team report of the selected milestone:
  - "Finished on time", or "Finished <n> d late" with a warning icon, for a closed milestone;
  - "Starts <start>" before its start;
  - "<closed> of <scope> closed · on pace", or "· behind pace" with a warning icon when `pace_needed` is above `pace`;
  - "<closed> of <scope> closed · past end" with a warning icon when `late_open` is above 0;
  - "No milestones" when the project has none;
  - no headline while "All projects" is selected.
- Delivery: "<closed> beads closed", where `<closed>` is `totals.closed`.
- Velocity: "<x> d/pt" from the selected project's `days_per_point` (REQ-REPORTS-018), with "assumed" when it is assumed, once the Velocity tab has loaded it; no headline while "All projects" is selected or when `days_per_point` is `null`.
- AI usage: "<tokens> tokens, <cost>", with "no price" in place of `<cost>` when `totals.cost` is absent.
- Quality: "<rate> rework", with "—" in place of `<rate>` when `totals.rework_rate` is absent.
- Data coverage: "<n> gaps" ("1 gap" when `<n>` is 1), with a warning icon when `<n>` is above 0. `<n>` is the sum of five counts: beads not collected, beads with unreadable usage, models without a price, beads with incomplete logs (`coverage.sources`), and projects under `errors`.

The page SHALL request the team report whenever a single project is selected, whatever the tab, so that the Team headline shows, and SHALL request the Milestones list for the Velocity tab only once that tab has been selected. It SHALL show no headline for a tab while its report loads or after it failed to load. It SHALL keep the selected tab in the URL query `tab` (`team`, `delivery`, `velocity`, `usage`, `quality` or `coverage`), SHALL select Team when `tab` is missing or holds another value, and SHALL keep the project, period, sprint, milestone and member when the tab changes. WHILE the window is narrower than the tab list, the tab list SHALL scroll sideways instead of widening the page and SHALL fade its edge on each side that has hidden tabs.
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
- WHEN the user picks the AI usage tab
- THEN the URL becomes `/reports?project=alpha&days=90&tab=usage` without a reload and no new report is requested

#### Scenario: velocity tab
- GIVEN the Reports page for `alpha` on the Delivery tab, whose milestones list has `days_per_point: {value: 1.4, measured_epics: 6, assumed: false}`
- WHEN the user picks the Velocity tab
- THEN the URL has `tab=velocity`, `GET /api/milestones?project=alpha` is requested once, and the Velocity headline reads "1.4 d/pt"

#### Scenario: headlines
- GIVEN a report with 41 closed beads, 12,400,000 tokens, cost 38.2, rework rate 0.09, 3 beads not collected, 1 unreadable bead and 1 unpriced model
- WHEN the page is shown
- THEN the headlines read "41 beads closed", "12.4M tokens, $38.20", "9% rework" and "5 gaps", and the Data coverage headline has a warning icon

#### Scenario: no gaps
- GIVEN a report with no coverage gaps and no failed project
- WHEN the page is shown
- THEN the Data coverage headline reads "0 gaps" without a warning icon

#### Scenario: team headline
- GIVEN the team report of an open milestone with 27 of 64 beads closed, `pace` 3.6 and `pace_needed` 3.4
- WHEN the page is shown on the Delivery tab
- THEN the Team headline reads "27 of 64 closed · on pace" without a warning icon

#### Scenario: keyboard
- GIVEN the Delivery tab is selected and has focus
- WHEN the user presses Right
- THEN the Velocity tab is selected and has focus

#### Scenario: Hidden tabs are hinted
- GIVEN the Reports page at a window 768px wide where Data coverage does not fit
- WHEN the page is shown
- THEN the right edge of the tab list fades, and scrolling it to the end removes the right fade and shows a left one

### REQ-MILESTONE-UI-013: Readable Gantt rows
<!-- base: 569753eadd6b8355a79cf89bc7fab5858a55dec0c778d74f37237f94e0ef2476 -->
Each epic row of the Gantt SHALL show, in a label column 300px wide under 1280px windows, 380px from 1280px and 440px from 1600px that stays visible while the chart scrolls and that no chart line, arrow, bar or title crosses, the status icon and title on one line and the epic id (linking to its bead page), the estimate as a size badge, the period, the closed tracks, prep and spec on the next, the estimate reading "<n>d", or "<n>d left" when the epic is in progress and its `remaining_days` is below its estimate, or "assumed <n>d" when it has no estimate and `assumed_days` is set, preceded by "<p> pt · " when the epic has `points`, each line cut short with an ellipsis instead of wrapping and the full title available on hover, except that under 1024px the items of the second line (id, estimate, period, closed tracks, prep, spec) wrap onto further lines rather than being cut, followed by the epic's warnings, the spec item being left out when the warnings already say the spec is not confirmed; WHEN at least 90 px of chart are left after an epic's bar, the row SHALL also show the epic's title after the bar, cut short with an ellipsis before the next end or today line or the edge of the chart.

#### Scenario: long id
- GIVEN epic `gin-workflow-rm-process-hygiene` titled "Process hygiene: consistent skills, rules that bind where it matters"
- WHEN the Gantt is shown on a phone
- THEN the title takes one line cut short with an ellipsis, and the id, period and closed tracks wrap onto the following lines, none of them cut to less than its first word

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
- THEN C's second line reads "5 pt · 7d" and D's reads "3 pt · 1d left"

#### Scenario: Wide window
- GIVEN in-progress epic `ex-e3` with `points: 8`, `estimate_days: 20`, `remaining_days: 11`, 5 of 11 tracks closed and no confirmed spec, in an active milestone that warns "Spec not confirmed"
- WHEN the Gantt is shown at 2000px
- THEN the label column is 440px wide, the second line starts with the id and "8 pt · 11d left" and is cut with an ellipsis inside the column, it does not say "No confirmed spec", and no text of the label column overlaps a bar or a line

#### Scenario: Tail title stops at the end line
- GIVEN an epic whose bar ends 60px before the milestone's end line and whose title is longer than that
- WHEN the Gantt is shown
- THEN its title after the bar ends with an ellipsis before the end line

## REMOVED
