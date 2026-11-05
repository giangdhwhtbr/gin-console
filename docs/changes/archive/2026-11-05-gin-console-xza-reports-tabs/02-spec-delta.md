# Spec Delta: Reports tabs

## ADDED

### REQ-UI-095: Report tabs
The Reports page SHALL show the tabs Delivery, AI usage, Quality and Data coverage, in that order, as a WAI-ARIA tab list in which Left and Right move between tabs. Under each tab name it SHALL show a headline from the loaded report:
- Delivery: "<closed> beads closed", where `<closed>` is `totals.closed`.
- AI usage: "<tokens> tokens, <cost>", with "no price" in place of `<cost>` when `totals.cost` is absent.
- Quality: "<rate> rework", with "—" in place of `<rate>` when `totals.rework_rate` is absent.
- Data coverage: "<n> gaps" ("1 gap" when `<n>` is 1), with a warning icon when `<n>` is above 0. `<n>` is the sum of five counts: beads not collected, beads with unreadable usage, models without a price, beads with incomplete logs (`coverage.sources`), and projects under `errors`.

The page SHALL show no headline while the report loads or after it failed to load. It SHALL keep the selected tab in the URL query `tab` (`delivery`, `usage`, `quality` or `coverage`), SHALL select Delivery when `tab` is missing or holds another value, and SHALL keep the project, period and sprint when the tab changes. WHILE the window is narrower than the tab list, the tab list SHALL scroll sideways instead of widening the page.

#### Scenario: shared link
- GIVEN the URL `/reports?project=alpha&days=7&tab=quality`
- WHEN the page loads
- THEN the Quality tab is selected and its panel shows the report for `alpha` and 7 days

#### Scenario: unknown tab
- GIVEN the URL `/reports?project=alpha&tab=nope`
- WHEN the page loads
- THEN the Delivery tab is selected

#### Scenario: change tab
- GIVEN the Reports page for `alpha`, 90 days and the Delivery tab
- WHEN the user picks the AI usage tab
- THEN the URL becomes `/reports?project=alpha&days=90&tab=usage` without a reload and no new report is requested

#### Scenario: headlines
- GIVEN a report with 41 closed beads, 12,400,000 tokens, cost 38.2, rework rate 0.09, 3 beads not collected, 1 unreadable bead and 1 unpriced model
- WHEN the page is shown
- THEN the headlines read "41 beads closed", "12.4M tokens, $38.20", "9% rework" and "5 gaps", and the Data coverage headline has a warning icon

#### Scenario: no gaps
- GIVEN a report with no coverage gaps and no failed project
- WHEN the page is shown
- THEN the Data coverage headline reads "0 gaps" without a warning icon

#### Scenario: keyboard
- GIVEN the Delivery tab is selected and has focus
- WHEN the user presses Right
- THEN the AI usage tab is selected and has focus

## MODIFIED

### REQ-UI-088: Reports page
<!-- base: 17e0d7608bba677409002b04400d0bdfc26190c8e2efb7cf221a043dbce4b7f0 -->
The frontend SHALL show the Reports page at `/reports`, loaded as its own chunk. The page header SHALL hold the project choice: each configured project and "All projects", with the first project as the default. The panel of each tab of REQ-UI-095 SHALL hold a period choice (7, 30 or 90 days, default 30) and a sprint field, which apply to every tab. The page SHALL keep the choices in the URL query, so that a reload, the back button and a shared link show the same report. Each tab SHALL open with its own row of figures (REQ-UI-089 to REQ-UI-091). The page SHALL label every cost "estimated" and SHALL show "no price" where a cost is absent.

#### Scenario: shared link
- GIVEN the URL `/reports?project=all&days=7`
- WHEN the page loads
- THEN "All projects" and 7 days are selected and the report for them is requested

#### Scenario: change period
- GIVEN the Reports page for `alpha` and 30 days
- WHEN the user picks 90 days
- THEN the URL becomes `/reports?project=alpha&days=90&tab=delivery` without a reload and the report is requested again

#### Scenario: period kept across tabs
- GIVEN the Reports page for `alpha` with 7 days picked on the Delivery tab
- WHEN the user picks the Quality tab
- THEN 7 days is selected in the Quality panel

### REQ-UI-089: AI usage view
<!-- base: c35a01d4f2630f18fe85e38e5c35744b3deb410c535b7ea4accf3c43557200bb -->
The AI usage tab SHALL show, in this order:
- A row of figures: tokens, estimated cost, tokens per closed bead, and cache reads (`totals.cache_ratio` as a percentage).
- A horizontal bar chart of tokens per member, stacked by stage, with each member's total at the end of the bar. Each bar SHALL show, on hover and on focus, the member's closed beads, tokens, cost, tokens per bead and cache ratio.
- A 100% bar of tokens per stage, with each stage's share written as text.
- A table of the top epics. Each row SHALL link to the epic's bead page and show its tokens, its closed and total children, and one of three budget states:
  - with a budget and a cost: a meter of `budget.cost` against `budget.budget_usd`, with the percentage, in the warning color above 100%;
  - with a budget but no cost: "no price";
  - without a budget: "No budget".
- A table of the top beads.
- A table of tokens and cost per model and role.

#### Scenario: member bar
- GIVEN a report with members `ann` and `Unassigned`
- WHEN the page is shown and the user focuses `ann`'s bar
- THEN the chart has one bar per member, stacked by stage, and `ann`'s beads, tokens, cost, tokens per bead and cache ratio are shown

#### Scenario: budget meter
- GIVEN top epics `a-1` with budget 10 and cost 11.7, and `a-2` without a budget
- WHEN the AI usage tab is shown
- THEN `a-1` shows a meter at 117% in the warning color and `a-2` shows "No budget"

### REQ-UI-090: Delivery flow view
<!-- base: c592c8a71cac9f763bba3cdf717190e8bb92b675a594defce7b04132651dae5c -->
The Delivery tab SHALL show, in this order:
- A row of figures: beads closed (`totals.closed`), median cycle time and median lead time (from `delivery.overall`, "—" when absent), and beads in progress now (the sum of the in-progress counts per member).
- Beads closed per ISO week, as a column chart stacked by type with a legend.
- Cycle time and lead time as two range charts side by side, each with a dot at the median and a tick at the 85th percentile. A switch SHALL choose between By type (the default) and By member. Each range SHALL show, on hover and on focus, its type or member, the number of beads, the median and the 85th percentile.
- The 5 oldest in-progress beads, with their age in days and a link to each bead page, next to a bar chart of in-progress beads per member.
- The estimate table of REQ-REPORTS-004, when it has rows. Each row SHALL hold a chip with the actual minus the estimated working days, rounded to one decimal:
  - "+<n> d" in the warning color when the difference is above 0;
  - "on estimate" when it is 0;
  - "−<n> d" when it is below 0.

#### Scenario: no estimates
- GIVEN a report without estimated epics
- WHEN the page is shown
- THEN no estimate table is shown

#### Scenario: by member
- GIVEN a report whose `by_member` holds `ann` with median cycle time 1.5 days
- WHEN the user picks By member
- THEN both range charts show one range per member and `ann`'s cycle range has its dot at 1.5 days

#### Scenario: estimate chip
- GIVEN epics estimated at 5 working days that took 7, 3 and 4.5
- WHEN the Delivery tab is shown
- THEN their chips read "+2 d" in the warning color, "−2 d" and "−0.5 d"

### REQ-UI-091: Quality view
<!-- base: 706f2974e0d5bbc4fc635de4a0637edc548bc501f85d9297beb72ca7de6fb55b -->
The Quality tab SHALL show, in this order:
- A row of figures:
  - the rework rate (`totals.rework_rate`);
  - reopens, summed over the member rows of REQ-REPORTS-005;
  - bugs found later, summed over the member rows;
  - review cycles per bead: the sum of the member rows' review cycles divided by the sum of their beads, or "—" when there are no beads.
- The points of REQ-REPORTS-005 as a scatter plot of tokens against rework. Points with rework above 0 SHALL be drawn in a second color, and a legend SHALL name both colors. Each point SHALL name its bead on hover and on focus, and SHALL open the bead's page on click.
- A table of the member rows, with reopens, bugs, review cycles per bead, rejections and rework rate.
- The review findings per severity (critical, important, minor, suggestion) and the waivers, summed over the member rows.

#### Scenario: open a point
- GIVEN a point for bead `a-3` of project `alpha`
- WHEN the user clicks it
- THEN the page `/beads/alpha/a-3` is shown

#### Scenario: figures
- GIVEN member rows `ann` (4 beads, 1 reopen, 5 review cycles) and `bao` (1 bead, 1 bug, 1 review cycle)
- WHEN the Quality tab is shown
- THEN the figures show 1 reopen, 1 bug found later and 1.2 review cycles per bead

### REQ-UI-092: Data coverage view
<!-- base: 2dbc7b8142a06e3f8282bcb79b324fe22b6949c89148134740c2659a60ad5fb4 -->
The Data coverage tab SHALL show the data coverage of REQ-REPORTS-006 as five blocks, in this order, each headed by its name and its count:
1. Not collected: each bead, linking to its bead page, with a button that copies its `gin-workflow usage collect` command.
2. Unreadable usage: each bead with its problem.
3. Models without a price: each model.
4. Incomplete logs: each bead with its sources that are not `ok` and its skipped lines.
5. Projects that failed: each project with its error.

A block whose count is 0 SHALL show one sentence saying that nothing is missing, instead of an empty list. After the blocks, the tab SHALL show the share of tokens under Unassigned when it is above 0, and the fixed note "Estimates from local Claude Code and Codex logs on the machine that collected them. Antigravity and OpenCode are not measured."

#### Scenario: copy command
- GIVEN coverage lists `a-9` as not collected
- WHEN the user presses its copy button
- THEN the clipboard holds `gin-workflow usage collect --bead a-9`

#### Scenario: empty block
- GIVEN a report where no project failed
- WHEN the Data coverage tab is shown
- THEN the "Projects that failed" block shows count 0 and a sentence, and no list

### REQ-REPORTS-003: AI usage section
<!-- base: a770dc40025df8677286e9bd559d2097e737020c9340f21a8cefe84cc6aa76c5 -->
The report SHALL hold the following, over the own shares of the selected closed beads:
- Totals: tokens, cost, closed beads, tokens per closed bead, the cache ratio `cache_read / (input + cache_read + cache_write)` summed over the models of every own share (absent when the denominator is 0), and the rework rate of REQ-REPORTS-005.
- One row per member, keyed by `assignee` (beads without one fall under `Unassigned`). Each row holds closed beads, tokens, cost, tokens per closed bead, tokens per stage, and the cache ratio.
- The 10 epics with the most tokens. An epic's tokens are its own share plus those of its selected descendants. Each epic row holds its project, `ai_usage.budget` when present, and its closed and total children.
- The 10 beads with the largest own share.
- Tokens and cost per stage.
- Tokens and cost per model and role.

#### Scenario: member rows
- GIVEN `ann` closed two beads of 100 and 300 tokens and an unassigned bead of 50 tokens closed
- WHEN the report is built
- THEN `ann` has 2 closed beads, 400 tokens and 200 tokens per bead, and `Unassigned` has 1 bead and 50 tokens

#### Scenario: open epic with closed children
- GIVEN open epic `a-1` without `ai_usage` and two closed children of 200 tokens each
- WHEN the report is built
- THEN `a-1` is in the epic list with 400 tokens and 2 of 2 children closed

#### Scenario: total cache ratio
- GIVEN two closed beads whose own shares hold model tokens of input 100, cache_read 300, cache_write 0, and input 100, cache_read 0, cache_write 0
- WHEN the report is built
- THEN `totals.cache_ratio` is 0.6

### REQ-REPORTS-004: Delivery flow section
<!-- base: 1507a4ee7c2eef5ea2d707995a0cb6a1a690154a2d46de71d782f277cc90a135 -->
The report SHALL hold:
- Beads closed per ISO week, by `issue_type`.
- The median and 85th percentile cycle time (`started_at` to `closed_at`) and lead time (`created_at` to `closed_at`), in days, per `issue_type`, per member, and over all selected closed beads together (`overall`). A time SHALL leave a bead out when a timestamp is missing or the close is before the start. Within a row, a time SHALL be absent when no bead has it.
- The in-progress beads per member, and the 5 oldest by `started_at` (else `updated_at`), whatever the period.
- For each selected closed epic with `estimated_minutes`: its estimate in working days (`estimated_minutes / 480`), against the weekdays from its `started_at` (else `created_at`) to its `closed_at`, both dates counted.

#### Scenario: percentiles
- GIVEN five closed tasks with cycle times of 1, 2, 3, 4 and 10 days
- WHEN the report is built
- THEN the task median is 3 days and the p85 lies between 4 and 10 days

#### Scenario: missing start
- GIVEN a closed task without `started_at`
- WHEN the report is built
- THEN it counts in throughput and lead time and not in cycle time

#### Scenario: estimate
- GIVEN an epic with `estimated_minutes` 2400 created on a Monday and closed on the Tuesday of the next week
- WHEN the report is built
- THEN it shows 5 estimated and 7 actual working days

#### Scenario: overall
- GIVEN a closed task with cycle time 1 day and a closed bug with cycle time 3 days
- WHEN the report is built
- THEN `overall` holds a cycle median of 2 days over 2 beads

#### Scenario: nothing closed
- GIVEN no closed bead in the period
- WHEN the report is built
- THEN `overall` has no cycle time and no lead time

## REMOVED
