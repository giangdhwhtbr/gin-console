# Reports

## Purpose

## Requirements

### REQ-REPORTS-001: Report request
WHEN a client requests `GET /api/reports` with `project` (a configured project name or `all`), `days` (7, 30 or 90, default 30) and optionally `sprint`, the server SHALL read every bead of each selected project from its `bd export` snapshot (REQ-BEADS-012), SHALL select the beads closed in the last `days` days or, when `sprint` is given, the epics labelled `sprint:<sprint>` and their descendants whatever their close date, SHALL return the sections of REQ-REPORTS-003 to REQ-REPORTS-006 together with `generated_at`, SHALL serve the same answer for the same `project`, `days` and `sprint` for 60 seconds without running `bd` again unless `POST /api/refresh` dropped it, SHALL respond 404 when `project` is neither `all` nor configured, and SHALL respond 422 when `days` is another value or `sprint` holds a character outside letters, digits, `.`, `_` and `-`.

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
The report SHALL list the selected closed beads without `ai_usage` with the command `gin usage collect --bead <id>`, the selected beads whose `ai_usage` is not readable or not `version` 1 (left out of every other section), the models listed in `unpriced`, the share of tokens under `Unassigned`, the beads whose `sources` hold a value other than `ok` or whose `skipped_lines` is above 0, and the projects that failed.

#### Scenario: not collected
- GIVEN a closed bead `a-9` without `ai_usage`
- WHEN the report is built
- THEN coverage lists `a-9` with `gin usage collect --bead a-9`, and no section counts its tokens

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
