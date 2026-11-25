# Overview

## Purpose

## Diagrams

- [overview-page-activity](diagrams/overview-page-activity.md)

## Use Cases

- [review-what-needs-me](use-cases/review-what-needs-me.md)

## Requirements

### REQ-OVERVIEW-001: Overview request
WHEN a client requests `GET /api/overview`, the server SHALL return `generated_at`, `aging_days` (REQ-CONFIG-007) and `projects`, the configured projects in config order, each with `name`, `error` and, when `error` is `null`, `stale` (REQ-BEADS-013), `milestone` (REQ-OVERVIEW-006), `blocked` (REQ-OVERVIEW-002), `aging` (REQ-OVERVIEW-003), `unassigned` (REQ-OVERVIEW-004), `in_progress` (REQ-OVERVIEW-005) and `epics` (the epics with status `in_progress`, by `id`, with `id` and `title`), read from each project's `bd export` snapshot (REQ-BEADS-012), and SHALL NOT start any process. IF the beads of a project cannot be read (REQ-BEADS-005) or its directory does not exist, THEN its `error` SHALL hold the message and the other projects SHALL be returned as usual.

#### Scenario: No process
- GIVEN two existing projects with `.beads/issues.jsonl`
- WHEN a client requests `GET /api/overview`
- THEN the response is 200 with both projects in config order and no `gin` or `bd` process was started

#### Scenario: One project unreadable
- GIVEN project `a` without `.beads/issues.jsonl` and project `b` with one
- WHEN a client requests `GET /api/overview`
- THEN `a` has an `error` message and `b` has its lists

#### Scenario: Missing directory
- GIVEN a project whose directory does not exist
- WHEN a client requests `GET /api/overview`
- THEN its `error` says the directory does not exist

### REQ-OVERVIEW-002: Blocked work
Type: business-rule
`blocked` SHALL hold every blocked bead of the project by the rule of REQ-BEADS-021 without prep tasks, milestones and merge gates, longest wait first and then by `id`, each with `id`, `title`, `assignee`, `days` (its wait in working days, worked out as for REQ-REPORTS-025) and `blocker`, found by the rule of REQ-REPORTS-025 with the blocker's assignee as `person`, or `null` when no open blocker is in the project's export.

#### Scenario: Blocker and its person
- GIVEN bead `t-3` waiting 4 working days on open bead `t-8` assigned to `bao@example.com`
- WHEN the overview is built
- THEN `t-3` has `days` 4 and the blocker `t-8` with `person` `bao`

#### Scenario: Blocked through its parent
- GIVEN epic `e-1` blocked by open bead `a-1`, and its open child `e-1.1` without blockers of its own
- WHEN the overview is built
- THEN `e-1` and `e-1.1` are both listed with the blocker `a-1`

#### Scenario: No blocker to show
- GIVEN a bead with status `blocked` and no blocker
- WHEN the overview is built
- THEN it is listed with `blocker` `null`

### REQ-OVERVIEW-003: Work in progress too long
Type: business-rule
`aging` SHALL hold the beads with status `in_progress` that are not blocked, not prep tasks, milestones or merge gates, and not epics split into tracks, whose `days`, the working days after the day of `started_at`, or of `updated_at` when it has no `started_at`, up to today, is above `aging_days`, longest first and then by `id`, each with `id`, `title`, `assignee` and `days`.

#### Scenario: Above the threshold
- GIVEN `aging_days` 3 and beads started on Monday 16 Nov and Wednesday 18 Nov 2026, today Friday 20 Nov 2026
- WHEN the overview is built
- THEN only the first is listed, with `days` 4

#### Scenario: Weekend not counted
- GIVEN `aging_days` 3 and a bead started on Thursday 19 Nov 2026, today Tuesday 24 Nov 2026
- WHEN the overview is built
- THEN its wait is 3 working days and it is not listed

#### Scenario: Blocked and split epics left out
- GIVEN a blocked in-progress bead and an in-progress epic with tracks, both started 10 working days ago
- WHEN the overview is built
- THEN neither is in `aging`

#### Scenario: No start recorded
- GIVEN an in-progress bead without `started_at` updated 5 working days ago, and `aging_days` 3
- WHEN the overview is built
- THEN it is listed with `days` 5

### REQ-OVERVIEW-004: Unassigned ready work
Type: business-rule
`unassigned` SHALL hold the beads that are ready (REQ-BEADS-007) and have no `assignee`, leaving out prep tasks, milestones, merge gates and epics split into tracks, by `priority` and then by `id`, each with `id`, `title` and `priority`; the `owner` SHALL NOT count as an assignee.

#### Scenario: Owner is not assignee
- GIVEN a ready bead with `owner` `lead@example.com` and no `assignee`, and a ready bead assigned to `ann`
- WHEN the overview is built
- THEN only the first is listed

#### Scenario: Split epic
- GIVEN ready epic `e-1` without assignee whose ready track `e-1.1` has no assignee
- WHEN the overview is built
- THEN `e-1.1` is listed and `e-1` is not

### REQ-OVERVIEW-005: Work in progress per member
Type: business-rule
`in_progress` SHALL hold the beads with status `in_progress` that are not blocked, leaving out prep tasks, milestones, merge gates and epics split into tracks, each with `id`, `title` and `assignee`. The Overview page SHALL group these beads of all projects by person (REQ-BEADS-023), showing for each the total, the number per project and the beads, highest total first and then by name, with "Unassigned" last when a bead has no assignee.

#### Scenario: One person in two projects
- GIVEN an in-progress bead assigned to `ann` in project `a` and two assigned to `ann@example.com` in project `b`
- WHEN the Overview page is shown
- THEN one row reads `ann` with total 3, 1 in `a` and 2 in `b`

#### Scenario: Unassigned last
- GIVEN 1 in-progress bead of `ann` and 4 without assignee
- WHEN the Overview page is shown
- THEN `ann` comes first and "Unassigned" last

### REQ-OVERVIEW-006: Milestone of a project
Type: business-rule
`milestone` SHALL be the `id` and `title` of the first that exists among the project's open milestones listed by REQ-REPORTS-008: the one past its `end` with the earliest `end`, whether or not it was kicked off; else the current milestone of REQ-BEADS-015; else `null`. A closed milestone SHALL never be chosen.

#### Scenario: Overdue and never kicked off
- GIVEN planned milestone `m1` ended yesterday and active milestone `m2` ends next month
- WHEN the overview is built
- THEN `milestone` is `m1`

#### Scenario: Only closed milestones
- GIVEN a project whose only milestone is closed
- WHEN the overview is built
- THEN `milestone` is `null`

### REQ-OVERVIEW-007: Milestone verdicts
The Overview page SHALL show one line per project without an error: the title of its milestone (REQ-OVERVIEW-006) as a link to the milestone page, with the verdict and sentence of REQ-REPORTS-027 from `GET /api/reports/status` for that milestone, or "No open milestone" when there is none. It SHALL show the verdict before the forecast `finish` is loaded with the note "Checking forecast", SHALL update it once `GET /api/milestones` answers, and IF that request fails, THEN SHALL keep the verdict without the forecast with the note "Forecast not loaded". IF the status request fails, THEN the line SHALL show its error and the other lines SHALL be shown as usual.

#### Scenario: Forecast changes the word
- GIVEN the verdict of `m1` is "On track" without a forecast
- WHEN the forecast answers with a `finish` after the `end` of `m1`
- THEN the line changes to "Late" and "Checking forecast" is gone

#### Scenario: Forecast fails
- GIVEN `GET /api/milestones?project=a` answers 502
- WHEN the Overview page is shown
- THEN the line of `a` keeps its verdict and says "Forecast not loaded"

#### Scenario: No open milestone
- GIVEN project `b` with `milestone` `null`
- WHEN the Overview page is shown
- THEN its line reads "No open milestone" and no status is requested for `b`

### REQ-OVERVIEW-008: Gates not met and waivers
Type: business-rule
After the overview has loaded, the page SHALL request `GET /api/beads/<project>/<epic>/workflow` for each of the `epics` of every project, at most 4 at a time, and SHALL list:
- under "Gates not met", each epic with `requirement_confirmed`, `plan_approved` or `orchestration_ready` `unmet`, or any gate `unknown`, naming those gates;
- under "Waivers", each gate whose value starts with `waived`, with its reason, and each review waiver, with its bead and reason.
WHILE requests are open, the page SHALL show "Checking <done> of <total>" in place of both counts. IF a request fails, THEN "Gates not met" SHALL hold the line "Could not read gates" with the epic and the error, which SHALL NOT be counted.

#### Scenario: Started before its plan
- GIVEN in-progress epic `e-1` with `plan_approved` `unmet`, and in-progress epic `e-2` with only `implementation_complete` and `shipped` `unmet`
- WHEN the gates are read
- THEN "Gates not met (1)" lists `e-1` with `plan_approved` and not `e-2`

#### Scenario: Waivers
- GIVEN in-progress epic `e-1` whose `plan_approved` is `waived(hotfix)` and which has a review waiver of `e-1.2` with the reason "no reviewer"
- WHEN the gates are read
- THEN "Waivers (2)" lists `plan_approved` with "hotfix" and `e-1.2` with "no reviewer"

#### Scenario: Still checking
- GIVEN 14 epics of which 5 have answered
- WHEN the page is shown
- THEN both sections read "Checking 5 of 14" and no count

#### Scenario: One epic fails
- GIVEN the request of `e-3` answers 502
- WHEN all requests have ended
- THEN "Could not read gates" names `e-3` and the error, and the count leaves it out

#### Scenario: Bounded requests
- GIVEN 14 epics
- WHEN the page asks for their gates
- THEN at most 4 workflow requests are open at any time

### REQ-OVERVIEW-009: Needs attention lists
The Overview page SHALL show, under "Needs attention", the sections "Blocked", "In progress > <aging_days> days", "Gates not met", "Waivers" and "Unassigned ready" in this order, over all projects, each with its count, its first 10 rows in the order of its list across projects and, when it has more, a "Show all" button. Each row SHALL name its project and link to its bead page, and show the assignee (REQ-UI-135) where the list has one; a Blocked row SHALL show its wait and its blocker, as a link, with the blocker's person. An empty section SHALL read "None". Each section heading, the workload heading and the milestones heading SHALL explain its rule in a tooltip (REQ-UI-132). The page SHALL hold no control that changes a project or a bead.

#### Scenario: More than ten
- GIVEN 12 blocked beads in three projects
- WHEN the Overview page is shown
- THEN "Blocked (12)" shows the 10 that waited longest, and "Show all" shows the other 2

#### Scenario: Nothing to do
- GIVEN no waiver on an in-progress epic
- WHEN the gates are read
- THEN "Waivers (0)" reads "None"

#### Scenario: Definition
- GIVEN `aging_days` is 3
- WHEN keyboard focus reaches the heading "In progress > 3 days"
- THEN a tooltip says which beads count, that days are working days, and that blocked beads are listed under Blocked

### REQ-OVERVIEW-010: Loading and errors
WHILE the Overview page is visible, it SHALL request `GET /api/overview` again every 10 seconds, and SHALL request verdicts, forecasts and gates only when the page opens, when "Refresh data" is used (REQ-UI-096), and for an epic or milestone that the overview did not name before. IF a later `GET /api/overview` fails, THEN the page SHALL keep what it shows and add the error. The page SHALL show one alert per project with an `error`, and for each project with `stale` `true` the note of REQ-UI-103 for that project. WHEN no project is configured, it SHALL say so.

#### Scenario: Project error
- GIVEN project `a` has an `error` and `b` has none
- WHEN the Overview page is shown
- THEN one alert names `a` and its error, and the lists hold the beads of `b`

#### Scenario: Poll does not run gin
- GIVEN the page is open and its gates and verdicts are loaded
- WHEN 10 seconds pass and the overview names the same epics and milestones
- THEN `/api/overview` is requested again and no workflow, status or milestones request is sent

#### Scenario: Later failure
- GIVEN the lists are shown
- WHEN the next `GET /api/overview` fails
- THEN the lists stay and an alert shows the error

#### Scenario: No projects
- GIVEN no project is configured
- WHEN the Overview page is shown
- THEN it says no projects are configured

### REQ-OVERVIEW-011: Overview on a phone
Type: non-functional
Category: usability
At a window width of 360px the Overview page SHALL show every fact of its rows without sideways scrolling of the page.

#### Scenario: Narrow window
- GIVEN a window 360px wide, a project name of 60 characters and a blocked bead with a blocker
- WHEN the Overview page is shown
- THEN the page's scroll width does not exceed its client width, and the row shows the bead, project, assignee, wait, blocker and the blocker's person
