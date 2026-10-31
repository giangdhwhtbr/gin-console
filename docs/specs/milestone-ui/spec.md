# Milestone ui

## Purpose

## Requirements

### REQ-MILESTONE-UI-001: Milestones list
gin-console SHALL show a Milestones entry in the sidebar that opens a per-project list of milestones with title, status, start and end (and kickoff when set), epic progress, and warning count, from `gin-workflow milestone list --all --json`, SHALL show the number of `unassigned_epics`, and SHALL show a list entry's `error` in place of its progress and warnings.

#### Scenario: list
- GIVEN project P whose gin-workflow reports milestones M1 (active) and M2 (planned)
- WHEN the user opens Milestones for P
- THEN both milestones are listed with their status, period, progress, and warning count

#### Scenario: epics not yet in a milestone
- GIVEN project P whose `milestone list` reports `unassigned_epics: 4`
- WHEN the user opens Milestones for P
- THEN the page shows that 4 roadmap epics are not in any milestone

#### Scenario: schedule error
- GIVEN project P whose `milestone list` reports M2 with `error` "dependency cycle: A -> B -> A"
- WHEN the user opens Milestones for P
- THEN M2 shows that error in place of its progress and warning count, and M1 is shown normally

### REQ-MILESTONE-UI-002: Milestone Graph tab
gin-console SHALL show, on a milestone's page, a Graph tab with the milestone's epics and their dependency edges, marking dependencies outside the milestone as external.

#### Scenario: graph
- GIVEN milestone M1 with epics A and B, B depending on A
- WHEN the user opens the Graph tab of M1
- THEN A and B are shown with an edge from A to B

#### Scenario: dependency outside the milestone
- GIVEN epic A in M1 depending on epic X in M2
- WHEN the user opens the Graph tab of M1
- THEN X is shown as an external node with an edge to A

### REQ-MILESTONE-UI-003: Milestone Gantt tab
gin-console SHALL show, on a milestone's page, a Gantt tab drawing one bar per epic from `planned_start` to `planned_end` of `gin-workflow milestone show --json`, colored by bead status, with a line at the JSON `today` date, a line at the milestone `end`, and each epic's warnings.

#### Scenario: overflow shown
- GIVEN milestone M1 whose `show` output gives epic A warning `overflow` of 2 days
- WHEN the user opens the Gantt tab of M1
- THEN A's bar extends past the end line and A shows an overflow warning of 2 days

#### Scenario: today from the JSON
- GIVEN milestone M1 whose `show` output has `today: 2026-11-04`
- WHEN the user opens the Gantt tab of M1
- THEN the today line is drawn at 2026-11-04 whatever the browser's date

#### Scenario: external blocker named
- GIVEN epic A in M1 with warning `external_blocker` and `external_depends_on` `[{"id": "E9", "milestone": "M2"}]`
- WHEN the user opens the Gantt tab of M1
- THEN A shows an external blocker warning naming E9 and M2

### REQ-MILESTONE-UI-004: Kick-start preview
WHILE a milestone is `planned` or `scheduled`, gin-console SHALL show on its Gantt tab a Kick-start date picker defaulting to `kickoff`, else `start`, and WHEN the user picks a date SHALL redraw the Gantt from `gin-workflow milestone show <id> --start <date> --json`, labelled as a read-only preview with the command `gin-workflow milestone kickstart <id> --date <date>`; it SHALL NOT show the picker for `active` or `closed` milestones, and IF the preview fails, THEN it SHALL show the error in the Gantt tab instead of any plan.

#### Scenario: preview
- GIVEN planned milestone M1
- WHEN the user picks 2026-11-16 as the kick-start date
- THEN the Gantt is drawn from 2026-11-16, labelled preview, and shows `gin-workflow milestone kickstart M1 --date 2026-11-16`

#### Scenario: active milestone
- GIVEN active milestone M1
- WHEN the user opens its Gantt tab
- THEN no Kick-start date picker is shown

#### Scenario: preview fails
- GIVEN planned milestone M1 whose `show --start 2026-11-16` exits 1
- WHEN the user picks 2026-11-16
- THEN the Gantt tab shows the error and no bars

### REQ-MILESTONE-UI-005: Milestones unavailable
IF the installed gin-workflow has no `milestone` command, reports a `schema` other than 1, or reports that milestones need `providers.task_tracking: beads`, THEN gin-console SHALL show an error on the Milestones pages that names the cause and the fix (`gin-workflow/install.sh`, or switching the project to Beads tracking).

#### Scenario: old gin-workflow
- GIVEN project P whose gin-workflow has no `milestone` command
- WHEN the user opens Milestones for P
- THEN an error says milestones need a newer gin-workflow and to run `gin-workflow/install.sh`

#### Scenario: markdown tracking
- GIVEN project P with `providers.task_tracking: markdown`
- WHEN the user opens Milestones for P
- THEN an error says milestones need `providers.task_tracking: beads`

#### Scenario: unknown schema
- GIVEN project P whose `milestone list` reports `schema: 2`
- WHEN the user opens Milestones for P
- THEN an error says schema 2 is not supported and no milestone is listed

### REQ-MILESTONE-UI-006: Project Dependencies graph unchanged by milestones
gin-console's project-level Dependencies graph SHALL treat a parent of type `milestone` as no parent, so that epics under milestones keep their own nodes and epic-to-epic edges.

#### Scenario: epics under a milestone
- GIVEN epics A and B, B depending on A, both children of milestone M1
- WHEN the user opens the project Dependencies graph
- THEN A and B are shown as nodes with an edge from A to B, and M1 does not hide them

### REQ-MILESTONE-UI-007: Milestones are not ready work in the console
gin-console SHALL exclude beads of type `milestone` from the ready work it collects.

#### Scenario: open milestone without blockers
- GIVEN open milestone M1 without blockers
- WHEN the console collects ready beads for the project
- THEN M1 is not counted or flagged as ready

### REQ-MILESTONE-UI-008: Milestones API
WHEN a client requests `GET /api/milestones?project=<name>` or `GET /api/milestones/{project}/{id}` with an optional `start=YYYY-MM-DD`, the server SHALL return the output of `gin-workflow milestone list --all --json` or `gin-workflow milestone show <id> [--start <date>] --json` run in the project directory, SHALL cache a response without `start` for 5 seconds and never cache one with `start`, SHALL respond 404 for an unknown project or missing directory, 422 without running any command for a `start` that is not an ISO date, and IF the command fails or its output is not `schema: 1`, THEN SHALL respond 502 with `error` and `cause` set to `outdated` (no `milestone` command), `tracking` (project not on Beads tracking), `schema` (schema not 1), or `null`.

#### Scenario: list
- GIVEN project P whose `milestone list --all --json` prints schema 1 with M1
- WHEN a client requests `GET /api/milestones?project=P`
- THEN the response is 200 with M1, `unassigned_epics`, and `today`

#### Scenario: preview not cached
- GIVEN a request for M1 with `start=2026-11-16` answered less than 5 seconds ago
- WHEN a client requests M1 with `start=2026-11-16` again
- THEN `milestone show M1 --start 2026-11-16 --json` runs again

#### Scenario: invalid start
- GIVEN project P
- WHEN a client requests `GET /api/milestones/P/M1?start=next-monday`
- THEN the response is 422 and no command runs

#### Scenario: old gin-workflow
- GIVEN project P whose `gin-workflow milestone` exits 2 with `invalid choice: 'milestone'`
- WHEN a client requests `GET /api/milestones?project=P`
- THEN the response is 502 with `cause: "outdated"`, and the failure is not cached

#### Scenario: markdown tracking
- GIVEN project P whose `milestone list` exits 1 with `milestone error: milestones need providers.task_tracking: beads`
- WHEN a client requests `GET /api/milestones?project=P`
- THEN the response is 502 with `cause: "tracking"`

### REQ-MILESTONE-UI-009: Milestone beads hidden from Beads views
The List, Board, Focus, and Dependencies views SHALL NOT show beads of type `milestone`, and SHALL show the beads whose parent is a milestone as having no parent.

#### Scenario: list view
- GIVEN milestone M1 with child epics A and B
- WHEN the user opens the List view
- THEN M1 is not listed and A and B are roots

#### Scenario: board view
- GIVEN open milestone M1 and open epic A
- WHEN the user opens the Board view
- THEN A is on the board and M1 is in no column
