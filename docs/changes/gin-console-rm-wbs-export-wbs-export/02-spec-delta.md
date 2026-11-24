# Spec Delta: Wbs export

## ADDED

### REQ-MILESTONE-UI-026: WBS export endpoint
WHEN a client requests `GET /api/milestones/{project}/wbs` with query parameter `format` (`xlsx`, `csv`, or `md`) and optional `milestone` (a milestone bead id), the server SHALL read the project's Beads snapshot including closed beads (REQ-BEADS-012) and the project's milestone list and detail(s) from `gin`, SHALL build the WBS rows (REQ-MILESTONE-UI-027, REQ-MILESTONE-UI-028), and SHALL return HTTP 200 with `Content-Disposition: attachment; filename="<project>-wbs-<YYYY-MM-DD>.<ext>"` (or `<project>-<milestone>-wbs-<YYYY-MM-DD>.<ext>` when `milestone` is given) and the matching media type (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `text/csv; charset=utf-8`, or `text/markdown; charset=utf-8`). The server SHALL respond 404 when `project` is not configured or `milestone` is not a milestone in the project's snapshot, and SHALL respond 422 when `format` is missing or not one of `xlsx`, `csv`, `md`, or when `milestone` contains characters outside letters, digits, `.`, `_`, and `-`. IF `gin milestone list` or `gin milestone show` fails, THEN the server SHALL still return HTTP 200 using the Beads snapshot alone, leaving `gin`-derived planned dates, forecast end, and epic estimates blank, and SHALL include a warning message in the `X-WBS-Warning` response header as well as in the Excel `About` sheet and Markdown header.

#### Scenario: Milestone Excel download
- GIVEN configured project `alpha` with milestone `m1`
- WHEN a client requests `GET /api/milestones/alpha/wbs?milestone=m1&format=xlsx` on `2026-11-24`
- THEN the server responds 200 with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and `Content-Disposition: attachment; filename="alpha-m1-wbs-2026-11-24.xlsx"`

#### Scenario: Project CSV download
- GIVEN configured project `alpha`
- WHEN a client requests `GET /api/milestones/alpha/wbs?format=csv` on `2026-11-24`
- THEN the server responds 200 with `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="alpha-wbs-2026-11-24.csv"`

#### Scenario: Invalid project, milestone, or format
- GIVEN configured project `alpha` without milestone `m99`
- WHEN a client requests `/api/milestones/nope/wbs?format=md`, `/api/milestones/alpha/wbs?milestone=m99&format=md`, `/api/milestones/alpha/wbs?format=pdf`, and `/api/milestones/alpha/wbs?milestone=a%20b&format=md`
- THEN the responses are 404, 404, 422, and 422

#### Scenario: Degraded gin CLI fallback
- GIVEN configured project `alpha` with milestone `m1` whose snapshot has epic `e1` and task `t1`, while `gin milestone show` fails
- WHEN a client requests `GET /api/milestones/alpha/wbs?milestone=m1&format=md`
- THEN the server responds 200 with rows for `m1`, `e1`, and `t1`, blank `gin`-derived dates and epic estimates, a non-empty `X-WBS-Warning` header, and the warning noted in the Markdown header

### REQ-MILESTONE-UI-027: WBS hierarchy, ordering, and numbering
Type: business-rule
WHEN building WBS rows for a milestone or a project, the server SHALL include all open and closed beads in scope EXCEPT prep tasks (label `prep`) and merge gates (REQ-BEADS-019), SHALL guard against parent-child cycles, and SHALL assign deterministic hierarchical WBS numbers (`1`, `1.1`, `1.1.1`, continuing for any deeper levels):
- For a milestone scope, the milestone bead SHALL be root `1`, its child epics `1.n`, and their descendants `1.n.m` (and deeper).
- For a project scope, top-level roots SHALL be ordered as: (1) milestones ordered by planned `start` ascending (nulls last) then `id`, (2) epics with no milestone parent ordered by planned start ascending (nulls last), priority ascending, then `created_at` ascending and `id`, and (3) parentless non-epic beads ordered by priority ascending, then `created_at` ascending and `id`.
- Children of any node SHALL be ordered: epics by planned start ascending (nulls last), priority ascending, `created_at` ascending, then `id`; non-epics by priority ascending, `created_at` ascending, then `id`.
- An empty scope (e.g. a project with no beads or a milestone with no children) SHALL produce a valid row list without error.

#### Scenario: Milestone hierarchy and exclusion of prep and merge gates
- GIVEN milestone `m1` with epic `e1` (planned start `2026-12-01`) and epic `e2` (planned start `2026-12-05`), where `e1` has open task `t1`, closed task `t2`, a `prep`-labelled task `p1`, and a merge gate `g1`
- WHEN the WBS is built for milestone `m1`
- THEN rows are numbered `1` (`m1`), `1.1` (`e1`), `1.1.1` (`t1` or `t2` by priority/created), `1.1.2` (the other task), and `1.2` (`e2`), and neither `p1` nor `g1` appears

#### Scenario: Project root ordering and deeper nesting
- GIVEN project `alpha` with milestone `m2` (start `2026-12-20`), milestone `m1` (start `2026-12-01`), unassigned epic `e9`, parentless bug `b1`, and a task `t1` under `e9` with child task `t1a`
- WHEN the WBS is built for project `alpha`
- THEN roots are numbered `1` (`m1`), `2` (`m2`), `3` (`e9`), `4` (`b1`), and `t1a` is numbered `3.1.1`

#### Scenario: Cycle guard
- GIVEN two beads `a` and `b` whose `parent-child` links form a cycle
- WHEN the WBS is built
- THEN the builder terminates without infinite recursion and emits each bead at most once

### REQ-MILESTONE-UI-028: WBS row fields and definitions
Type: business-rule
WHEN populating columns for each WBS row, the server SHALL compute:
- `WBS`: hierarchical number from REQ-MILESTONE-UI-027;
- `ID`: bead id;
- `Name`: bead title;
- `Type`: plain bead type label (e.g. Milestone, Epic, Task, Bug, Feature, Chore);
- `Status`: plain status word using the shared rules (`Done` when `is_done`, `Blocked` when `is_blocked`, `In progress` when `in_progress`, else `Open`);
- `Assignee`: normalized person display name (`member_of`) or `Unassigned`, NEVER reading the bead's `owner` field (REQ-UI-135);
- `Points`: `metadata.points` for epics and tasks (blank if unset), and the sum of its child epics' points for milestones (blank if none are set);
- `Estimate (days)`: for epics, `gin` `estimate_days` formatted with `(assumed)` when `estimate_source` is assumed; for milestones, the sum of its epics' estimate days; for tasks/bugs, `estimate_minutes / 480` when set, else blank;
- `Planned start` and `Planned end`: `metadata.start`/`metadata.end` for milestones, `gin` `planned_start`/`planned_end` for epics, blank for tasks/bugs;
- `Forecast end`: `gin` `finish` for milestones; for epics, `closed_on` when closed else forecast `planned_end` from `gin milestone list`; blank for tasks/bugs;
- `% done`: for milestones, done points ÷ total points of its epics using the burn-up rule (blank when total points is 0); for epics, closed tracks ÷ total tracks from `child_counts`, `100%` when the epic is closed, `0%` when open and not split; for tasks/bugs, `100%` when closed else `0%`;
- `Depends on`: comma-separated WBS numbers for blockers present in the exported WBS, falling back to the blocker's bead id when the blocker is outside the exported scope.

#### Scenario: Assignee never uses owner and blocked uses is_blocked
- GIVEN open task `t1` with `owner: "alice@example.com"`, `assignee: null`, blocked by open task `t2` (WBS `1.1.1`) and external bead `ext-9`
- WHEN `t1`'s WBS row is built
- THEN `Status` is `Blocked`, `Assignee` is `Unassigned`, and `Depends on` is `1.1.1, ext-9`

#### Scenario: Rollups on milestone and epic
- GIVEN milestone `m1` with closed epic `e1` (5 points, 2.0 estimate days) and open epic `e2` (3 points, 1.5 assumed estimate days, 1 of 2 tracks closed)
- WHEN WBS rows are built for `m1`
- THEN `e1` has `100%` done and `Forecast end` equal to its `closed_on`, `e2` has `50%` done and estimate `1.5 (assumed)`, and `m1` has `Points` 8, `Estimate (days)` 3.5, and `% done` `81%` (`(5 + 1.5) / 8`)

### REQ-MILESTONE-UI-029: WBS Excel format
WHEN `format=xlsx` is requested, the server SHALL serialize the WBS using `openpyxl` into a valid `.xlsx` workbook with two sheets:
- Sheet `WBS`: frozen header row (`A2`), autofilter across the header columns, bold level-1 rows, Excel row outline grouping (`outlineLevel`) matching each row's nesting depth so levels collapse cleanly, real Excel date cells (`YYYY-MM-DD`) for Planned start, Planned end, and Forecast end, real numeric percent cells (`0%`) for `% done`, and formula-injection protection prefixing any string cell starting with `=`, `+`, `-`, or `@` with `'`.
- Sheet `About`: key-value rows naming the project, scope (project or milestone title and id), `generated_at` timestamp, the definitions used (done, blocked, progress, assignee, estimate), and any degraded-`gin` warning.

#### Scenario: Excel workbook structure and grouping
- GIVEN a WBS with milestone `1`, epic `1.1`, and task `1.1.1` whose title starts with `=SUM(A1)`
- WHEN serialized with `to_xlsx` and read back with `openpyxl`
- THEN sheets `WBS` and `About` exist, `WBS` has `freeze_panes == "A2"`, autofilter enabled, row outline levels `0`, `1`, `2`, date cells stored as `date` values, `% done` stored as numeric ratios formatted as `0%`, and the title cell starts with `'=SUM(A1)`

### REQ-MILESTONE-UI-030: WBS CSV for Jira format
WHEN `format=csv` is requested, the server SHALL serialize a UTF-8 CSV compatible with Jira External System Import:
- Columns SHALL be `Issue ID`, `Parent ID`, `Issue Type`, `Summary`, `Status`, `Labels`, `Assignee`, `Story Points`, `Original Estimate`, `Start date`, `Due date`, `Fix Version`, zero or more `Link "Blocks"` columns (as many as the maximum blocker count on any row), followed by `WBS`, `Forecast end`, `% done`, and `Bead ID`.
- Milestones SHALL NOT be emitted as issue rows; instead, every issue under a milestone SHALL carry that milestone's title in `Fix Version`.
- `Parent ID` SHALL reference the parent row's `Issue ID` (blank for epics and parentless issues), and every parent row SHALL appear before its children.
- `Issue Type` SHALL map epic → `Epic`, bug → `Bug`, child of a task → `Sub-task`, and other tasks/beads → `Task`.
- `Status` SHALL map Done → `Done`, In progress → `In Progress`, and Open or Blocked → `To Do`; blocked rows SHALL include `blocked` in `Labels`.
- `Assignee` SHALL be the assignee's email when known, else the normalized handle, or blank when unassigned.
- `Original Estimate` SHALL be total seconds as an integer (`1 day = 28800` seconds, blank when unset).
- `Start date`, `Due date`, and `Forecast end` SHALL use ISO `YYYY-MM-DD`.
- Each `Link "Blocks"` cell SHALL hold the blocking issue's `Issue ID` when in scope (or bead id if external).
- String cells starting with `=`, `+`, `-`, or `@` SHALL be prefixed with `'` to prevent spreadsheet formula injection.

#### Scenario: Jira CSV hierarchy, Fix Version, estimate seconds, and blocked label
- GIVEN milestone `m1` titled `PM reporting` containing epic `e1` (estimate 2 days, planned `2026-12-18` to `2026-12-22`) and blocked task `t1` under `e1` blocked by open task `t2` under `e1`
- WHEN serialized with `to_csv`
- THEN `m1` has no row, `e1`, `t1`, and `t2` each have `Fix Version` = `PM reporting`, `e1` precedes `t1` and `t2` with `e1`'s `Issue ID` in their `Parent ID`, `e1`'s `Original Estimate` is `57600`, `t1` has `Status` = `To Do`, `Labels` containing `blocked`, and `Link "Blocks"` set to `t2`'s `Issue ID`

### REQ-MILESTONE-UI-031: WBS Markdown format
WHEN `format=md` is requested, the server SHALL serialize a UTF-8 Markdown document starting with `# <project> WBS — <scope>`, a `Generated: <YYYY-MM-DD HH:MM UTC>` line, an optional `> Warning: <message>` callout when `gin` degraded, and a GitHub-flavored Markdown table with the columns of REQ-MILESTONE-UI-028, escaping `|` as `\|` and replacing newlines in cell text with spaces.

#### Scenario: Markdown escaping and warning
- GIVEN a WBS for project `alpha` with a task titled `Fix A | B\nnow` and a degraded-`gin` warning
- WHEN serialized with `to_markdown`
- THEN the output contains `# alpha WBS — Project`, the `> Warning:` line, and a table row containing `Fix A \| B now`

### REQ-MILESTONE-UI-032: Export WBS menu on Milestone and Milestones pages
The Milestone page header (`MilestonePage`) SHALL show an `Export WBS` button that opens a menu with three download links — `Excel (.xlsx)`, `CSV for Jira (.csv)`, and `Markdown (.md)` — pointing to `/api/milestones/<project>/wbs?milestone=<id>&format=<fmt>` with the `download` attribute. The Milestones list page header (`MilestonesPage`) SHALL show the same `Export WBS` menu pointing to `/api/milestones/<project>/wbs?format=<fmt>` for a project-wide export.

#### Scenario: Milestone page menu links
- GIVEN the user opens milestone `m1` of project `alpha`
- WHEN the user opens the `Export WBS` menu in the header
- THEN three download links appear for `/api/milestones/alpha/wbs?milestone=m1&format=xlsx`, `format=csv`, and `format=md`

#### Scenario: Milestones list page menu links
- GIVEN the user opens the Milestones list for project `alpha`
- WHEN the user opens the `Export WBS` menu in the header
- THEN three download links appear for `/api/milestones/alpha/wbs?format=xlsx`, `format=csv`, and `format=md`

### REQ-REPORTS-037: Status summary Markdown format
Type: business-rule
WHEN building a Markdown status summary for a loaded milestone on Reports Status, the frontend SHALL produce:
- `# <milestone title> (<start> – <end>)` (or `# <milestone title>` when dates are missing) and a `Generated: <YYYY-MM-DD>` line;
- `**Verdict:** <verdict> — <verdict sentence>`;
- `## KPIs` with a bullet list of the five figures (Beads done, Points done, Pace, Blocked, Rework), each including its week-on-week change text when present;
- `## Risks` with a bullet list of the rendered risk items (blocked chains, unestimated epics, unapproved specs), or `None.` when there are no risks;
- `## Epics` with a Markdown table of columns `Epic | Verdict | Progress | Planned | Forecast | Assignee` in the same row order as `EpicTable`, using `—` when planned, forecast, or verdict is unavailable, and escaping `|` and newlines in cell text.

#### Scenario: Full status summary
- GIVEN a loaded Status section for milestone `PM reporting` with verdict `At risk`, 5 KPIs, 1 blocked-chain risk, and 2 epics
- WHEN `summaryMarkdown` is called
- THEN it returns Markdown containing the title heading, `**Verdict:** At risk — ...`, `## KPIs` with 5 bullets, `## Risks` with 1 bullet, and `## Epics` with a 2-row table matching `EpicTable` order

#### Scenario: No risks and degraded milestone detail
- GIVEN a loaded Status section with 0 risks and failed milestone detail
- WHEN `summaryMarkdown` is called
- THEN `## Risks` contains `None.` and the `## Epics` rows show `—` for Verdict, Planned, and Forecast

### REQ-REPORTS-038: Copy summary button on Reports Status
WHILE the Reports Status section (`/reports/status`) has a loaded milestone report, the section header SHALL show a `Copy summary` button; the button SHALL NOT be shown on period scopes or while the report is loading or in an error state. WHEN the user clicks `Copy summary`, the frontend SHALL build the Markdown of REQ-REPORTS-037 and write it via `navigator.clipboard.writeText`, SHALL show `Copied` on the button for 2 seconds on success, and IF the clipboard write rejects, THEN it SHALL show an inline `Couldn't copy` error message.

#### Scenario: Copy succeeds
- GIVEN `/reports/status` has loaded milestone `m1` and clipboard write resolves
- WHEN the user clicks `Copy summary`
- THEN `navigator.clipboard.writeText` is called with the Markdown summary and the button text changes to `Copied` for 2 seconds

#### Scenario: Copy fails
- GIVEN `/reports/status` has loaded milestone `m1` and clipboard write rejects
- WHEN the user clicks `Copy summary`
- THEN an inline `Couldn't copy` message is shown

#### Scenario: Hidden on period scope
- GIVEN `/reports/status` is switched to a 30-day period scope
- WHEN the section renders
- THEN no `Copy summary` button is rendered

## MODIFIED

## REMOVED
