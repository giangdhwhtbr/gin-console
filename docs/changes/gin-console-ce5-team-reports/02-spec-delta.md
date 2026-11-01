# Spec Delta: Team reports

## ADDED

### REQ-REPORTS-001: Report request
WHEN a client requests `GET /api/reports` with `project` (a configured project name or `all`), `days` (7, 30 or 90, default 30) and optionally `sprint`, the server SHALL run `bd list --all --limit 0 --json` once in each selected project, SHALL select the beads closed in the last `days` days or, when `sprint` is given, the epics labelled `sprint:<sprint>` and their descendants whatever their close date, SHALL return the sections of REQ-REPORTS-003 to REQ-REPORTS-006 together with `generated_at`, SHALL serve the same answer for the same `project`, `days` and `sprint` for 60 seconds without running `bd` again, SHALL respond 404 when `project` is neither `all` nor configured, and SHALL respond 422 when `days` is another value or `sprint` holds a character outside letters, digits, `.`, `_` and `-`.

#### Scenario: default period
- GIVEN project `alpha` with beads closed 3, 20 and 40 days ago
- WHEN a client requests `/api/reports?project=alpha`
- THEN the report counts the beads closed 3 and 20 days ago and not the one closed 40 days ago

#### Scenario: sprint
- GIVEN epic `a-1` labelled `sprint:s7` with a child closed 50 days ago, and epic `a-2` without the label
- WHEN a client requests `/api/reports?project=alpha&sprint=s7`
- THEN the report counts `a-1` and its child and nothing of `a-2`

#### Scenario: cached
- GIVEN a report for `alpha` and 30 days was answered 20 seconds ago
- WHEN a client requests it again
- THEN `bd` does not run and the same `generated_at` is returned

#### Scenario: bad input
- GIVEN no project `nope`
- WHEN a client requests `project=nope`, `days=14` or `sprint=a b`
- THEN the responses are 404, 422 and 422, and no `bd` command ran

### REQ-REPORTS-002: Own share of a bead
The server SHALL read `metadata.ai_usage` (a JSON string or object with `version` 1) of each selected bead, SHALL take as a bead's own share its tokens, cost and quality counts minus, for an epic, the sum of those of its children that hold `ai_usage`, per model, per role and model, and per stage, never below 0, SHALL count a token as `input + output + cache_read + cache_write`, SHALL count each bead's own share once, at its `closed_at`, and SHALL keep a cost absent when gin-workflow wrote none for that model.

#### Scenario: epic with collected children
- GIVEN epic `a-1` whose `ai_usage` holds 1000 tokens of model `m` in `discuss` and 600 in `execute`, and its only child `a-1.1` holds 600 tokens of `m` in `execute`
- WHEN the report is built
- THEN `a-1` owns 1000 tokens in `discuss` and 0 in `execute`, `a-1.1` owns 600 in `execute`, and the total is 1600

#### Scenario: child larger than its share in the epic
- GIVEN epic `a-1` holds 500 tokens of `m` in `execute` and its child holds 700
- WHEN the report is built
- THEN `a-1` owns 0 tokens in `execute`, not -200

#### Scenario: unpriced model
- GIVEN a bead whose `ai_usage` has `cost: null` for model `m`
- WHEN the report is built
- THEN its tokens count and its cost is absent, not 0

### REQ-REPORTS-003: AI usage section
The report SHALL hold, over the own shares of the selected closed beads: totals (tokens, cost, closed beads, tokens per closed bead, rework rate of REQ-REPORTS-005), one row per member keyed by `assignee` (beads without one under `Unassigned`) with closed beads, tokens, cost, tokens per closed bead, tokens per stage and cache ratio `cache_read / (input + cache_read + cache_write)`, the 10 epics with the most tokens (an epic's own share plus those of its selected descendants, with its project, `ai_usage.budget` when present, and its closed and total children), the 10 beads with the largest own share, tokens and cost per stage, and tokens and cost per model and role.

#### Scenario: member rows
- GIVEN `ann` closed two beads of 100 and 300 tokens and an unassigned bead of 50 tokens closed
- WHEN the report is built
- THEN `ann` has 2 closed beads, 400 tokens and 200 tokens per bead, and `Unassigned` has 1 bead and 50 tokens

#### Scenario: open epic with closed children
- GIVEN open epic `a-1` without `ai_usage` and two closed children of 200 tokens each
- WHEN the report is built
- THEN `a-1` is in the epic list with 400 tokens and 2 of 2 children closed

### REQ-REPORTS-004: Delivery flow section
The report SHALL hold beads closed per ISO week by `issue_type`, median and 85th percentile cycle time (`started_at` to `closed_at`) and lead time (`created_at` to `closed_at`) in days per `issue_type` and per member, leaving a bead out of a time when a timestamp is missing or the close is before the start, the in-progress beads per member and the 5 oldest by `started_at` (else `updated_at`) whatever the period, and for each selected closed epic with `estimated_minutes` its estimate in working days (`estimated_minutes / 480`) against the weekdays from its `started_at` (else `created_at`) to its `closed_at`, both dates counted.

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

### REQ-REPORTS-005: Quality section
The report SHALL hold, from the own shares of `ai_usage.quality`, per member and per epic of REQ-REPORTS-003: reopens, bugs, review cycles, rejections, findings by severity (critical, important, minor, suggestion), waivers and the rework rate (the share of beads with `ai_usage` that have reopens or bugs above 0), and one point per selected closed non-epic bead with `ai_usage` holding its id, project, title, tokens and rework (reopens + bugs + rejections).

#### Scenario: rework rate
- GIVEN `ann` closed 4 beads with `ai_usage`, one of them reopened once
- WHEN the report is built
- THEN `ann` has 1 reopen and a rework rate of 25%

#### Scenario: points
- GIVEN a closed task of 900 tokens with 1 reopen and 2 rejections, and a closed epic
- WHEN the report is built
- THEN the points hold the task with tokens 900 and rework 3, and not the epic

### REQ-REPORTS-006: Data coverage section
The report SHALL list the selected closed beads without `ai_usage` with the command `gin-workflow usage collect --bead <id>`, the selected beads whose `ai_usage` is not readable or not `version` 1 (left out of every other section), the models listed in `unpriced`, the share of tokens under `Unassigned`, the beads whose `sources` hold a value other than `ok` or whose `skipped_lines` is above 0, and the projects that failed.

#### Scenario: not collected
- GIVEN a closed bead `a-9` without `ai_usage`
- WHEN the report is built
- THEN coverage lists `a-9` with `gin-workflow usage collect --bead a-9`, and no section counts its tokens

#### Scenario: unreadable usage
- GIVEN a closed bead whose `ai_usage` is `{"version": 2}` and one whose `ai_usage` is not JSON
- WHEN the report is built
- THEN coverage lists both and the report is answered

### REQ-REPORTS-007: Failures
IF `bd` fails in the selected project as in REQ-BEADS-005, THEN the server SHALL respond 502 with an `error`; WHILE `project` is `all`, the server SHALL instead build the report from the projects that answered, list each failed project with its error under `errors`, and respond 502 only when every project failed; and the server SHALL NOT keep a failed answer in the cache.

#### Scenario: one project fails in all
- GIVEN projects `alpha` and `beta`, and `bd` exits non-zero in `beta`
- WHEN a client requests `/api/reports?project=all`
- THEN the response is 200 with `alpha`'s beads and `errors` holding `beta`

#### Scenario: single project fails
- GIVEN `bd` exits non-zero in `alpha`
- WHEN a client requests `/api/reports?project=alpha` twice
- THEN both responses are 502 and `bd` ran twice

#### Scenario: all members merged
- GIVEN `ann` closed a bead of 100 tokens in `alpha` and one of 200 in `beta`
- WHEN a client requests `/api/reports?project=all`
- THEN one member row `ann` holds 2 beads and 300 tokens

### REQ-UI-088: Reports page
The frontend SHALL show the Reports page at `/reports`, loaded as its own chunk, with a project choice (each configured project and "All projects", default the first project), a period choice (7, 30 or 90 days, default 30) and a sprint field, SHALL keep the choices in the URL query so that reload, back and a shared link show the same report, SHALL show a KPI row with the totals of REQ-REPORTS-003, and SHALL label every cost "estimated" and show "no price" where a cost is absent.

#### Scenario: shared link
- GIVEN the URL `/reports?project=all&days=7`
- WHEN the page loads
- THEN "All projects" and 7 days are selected and the report for them is requested

#### Scenario: change period
- GIVEN the Reports page for `alpha` and 30 days
- WHEN the user picks 90 days
- THEN the URL becomes `/reports?project=alpha&days=90` without a reload and the report is requested again

### REQ-UI-089: AI usage view
The Reports page SHALL show the AI usage section as a horizontal bar chart of tokens per member stacked by stage with a table of the member rows, a table of the top epics (with budget status when present, each linking to its bead page) and of the top beads, a 100% bar of tokens per stage, and a table of tokens and cost per model and role.

#### Scenario: members
- GIVEN a report with members `ann` and `Unassigned`
- WHEN the page is shown
- THEN the chart has one bar each, stacked by stage, and the table shows their beads, tokens, cost, tokens per bead and cache ratio

### REQ-UI-090: Delivery flow view
The Reports page SHALL show beads closed per ISO week as a column chart stacked by type, the cycle and lead time medians and p85 per type and per member as tables, the in-progress count per member with the 5 oldest in-progress beads and their age in days, each linking to its bead page, and the estimate table of REQ-REPORTS-004 when it has rows.

#### Scenario: no estimates
- GIVEN a report without estimated epics
- WHEN the page is shown
- THEN no estimate table is shown

### REQ-UI-091: Quality view
The Reports page SHALL show the quality counts per member and per epic as tables, and the points of REQ-REPORTS-005 as a scatter plot of tokens against rework whose points name the bead on hover and focus and open its bead page on click.

#### Scenario: open a point
- GIVEN a point for bead `a-3` of project `alpha`
- WHEN the user clicks it
- THEN the page `/beads/alpha/a-3` is shown

### REQ-UI-092: Data coverage view
The Reports page SHALL show the data coverage of REQ-REPORTS-006, each not-collected bead with a button that copies its `gin-workflow usage collect` command, and the fixed note "Estimates from local Claude Code and Codex logs on the machine that collected them. Antigravity and OpenCode are not measured."

#### Scenario: copy command
- GIVEN coverage lists `a-9` as not collected
- WHEN the user presses its copy button
- THEN the clipboard holds `gin-workflow usage collect --bead a-9`

### REQ-UI-093: Report states
The Reports page SHALL show a loading state while the report loads, SHALL show "No data in this period" in a section that has no rows instead of an empty chart, IF the report request fails, THEN SHALL show the error with a Retry button, SHALL show a warning naming each project under `errors` while showing the rest, and SHALL NOT show a late answer for filters that are no longer selected.

#### Scenario: partial failure
- GIVEN the answer for "All projects" has `errors` holding `beta`
- WHEN the page is shown
- THEN a warning names `beta` and its error and the sections show the other projects

#### Scenario: late answer
- GIVEN the report for 30 days is loading and the user picks 7 days
- WHEN the answer for 30 days arrives
- THEN the page does not show it

## MODIFIED

### REQ-UI-008: Sessions navigation
<!-- base: cfe2728a9ce6b01df4cbe6c3e995b54f22b693270ff29d615e8986e9363a1788 -->
The frontend SHALL show the Projects page at `/`, the session list at `/sessions` and the session log at `/sessions/<project>/<id>`, changing page without a full reload and following the browser back and forward buttons, while the "Main" navigation holds no Sessions link.

#### Scenario: Open the list by URL
- GIVEN the Projects page is shown
- WHEN the user opens `/sessions`
- THEN the session list is shown and the "Main" navigation has no "Sessions" link

#### Scenario: Back button
- GIVEN the user opened a session log from the list
- WHEN the user presses back
- THEN the session list is shown

### REQ-UI-055: Main navigation
<!-- base: 9af771421b1c9697587c05176b1e7b7ef0486746e298dc7b31f80418a02854b1 -->
The frontend SHALL show one navigation landmark labelled "Main" on every page, holding exactly one link each to Projects (`/`), Beads (`/beads`), Milestones (`/milestones`), Reports (`/reports`) and Quota (`/quota`), in that order.

#### Scenario: Five links
- GIVEN any page is shown
- WHEN the page loads
- THEN the "Main" navigation holds the links Projects, Beads, Milestones, Reports and Quota, one each, and no Sessions link

### REQ-UI-057: Current destination
<!-- base: c06e5adedcd015170c0873187fe874be2b4d7f907980510f0a49366b4456342c -->
The "Main" navigation SHALL mark the link of the page being shown with `aria-current="page"` and a visible highlight, treating `/beads`, `/beads/<project>/<id>` as Beads, `/milestones`, `/milestones/<project>/<id>` as Milestones and `/reports` as Reports, SHALL mark no link on `/sessions` and `/sessions/<project>/<id>`, and SHALL mark no other link.

#### Scenario: Bead page
- GIVEN the URL is `/beads/alpha/a-1`
- WHEN the page loads
- THEN only the Beads link has `aria-current="page"`

#### Scenario: Milestone page
- GIVEN the URL is `/milestones/alpha/m-1`
- WHEN the page loads
- THEN only the Milestones link has `aria-current="page"`

#### Scenario: Reports page
- GIVEN the URL is `/reports?project=alpha`
- WHEN the page loads
- THEN only the Reports link has `aria-current="page"`

#### Scenario: Session page
- GIVEN the URL is `/sessions/alpha/s-1`
- WHEN the page loads
- THEN no link has `aria-current="page"`

#### Scenario: Change page
- GIVEN the Projects page is shown
- WHEN the user clicks "Quota"
- THEN only the Quota link has `aria-current="page"`

## REMOVED
