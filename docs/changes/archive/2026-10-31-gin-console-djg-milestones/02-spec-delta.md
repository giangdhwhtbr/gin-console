# Spec Delta: Milestones

<!-- One block per requirement: "### REQ-<CAP>-<NNN>: <title>", one SHALL/MUST statement,
     and at least one "#### Scenario:" with "- GIVEN", "- WHEN", "- THEN" bullets.
     Get new IDs from `gin-workflow specs next-id <cap>`.
     MODIFIED and REMOVED blocks put an HTML comment "base: <hash>" on the line after the heading,
     the living block hash from `gin-workflow specs hash <REQ-ID>`; REMOVED blocks add "Reason: <why>".
     Preferred sentence patterns (EARS): "WHEN <trigger>, the <system> SHALL <response>",
     "WHILE <state>, ...", "IF <unwanted condition>, THEN ...", "WHERE <feature>, ...". -->

## ADDED

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

## MODIFIED

### REQ-BEADS-007: Readiness and closing time
<!-- base: d14e4b60023e28c6fad8fdf198f2ea34d60fd740efff2a33fa033bbb4c6ca782 -->
WHEN a client requests the bead list, the server SHALL add to each bead `ready` (true when `bd ready` lists it and its type is not `milestone`), `blocked` (true when `bd blocked` lists it or its status is `blocked`) and `closed_at` (the time it was closed, absent for a bead that is not closed), SHALL ignore ids that `bd ready` or `bd blocked` list but `bd list` does not, SHALL use the same 5-second cache entry for all three commands, and IF `bd ready` or `bd blocked` fails or prints an unexpected shape, THEN SHALL respond 502 as in REQ-BEADS-005 instead of returning wrong flags.

#### Scenario: Flags
- GIVEN an open unblocked bead, an open bead with an unfinished blocker, an in-progress bead and a closed bead
- WHEN a client requests the list with `closed=1`
- THEN the first has `ready` true, the second `blocked` true, the third both false, and the fourth has `closed_at`

#### Scenario: Milestone is never ready
- GIVEN an open milestone without blockers that `bd ready` lists
- WHEN a client requests the list
- THEN the milestone has `ready` false

#### Scenario: Unknown id is ignored
- GIVEN `bd ready` lists an id that `bd list` does not
- WHEN a client requests the list
- THEN that id does not appear and the request succeeds

#### Scenario: Readiness command fails
- GIVEN `bd blocked` exits with a non-zero status
- WHEN a client requests the list
- THEN the response is 502 with an `error`, and the failure is not cached

#### Scenario: One cache entry
- GIVEN a list was returned less than 5 seconds ago
- WHEN a client requests the same list
- THEN none of the three commands runs again

### REQ-SERVER-006: Beads summary per project
<!-- base: 4b162d7884e2574cfe1d2be287257c2c43bbcce371ee3c78d6065ddd0c67e022 -->
WHEN a client requests `GET /api/projects`, the server SHALL include for each existing project a `beads` object with the counts `open`, `in_progress`, `blocked` and `ready`, and an `epics` list of the epics that are `in_progress` or that are `open` and ready, each with `id` and `title`, taken from read-only `bd` commands run in the project directory, where `ready` never counts a bead of type `milestone`.

#### Scenario: Counts and active epics
- GIVEN a project with 3 open, 1 in_progress and 2 ready issues, one in_progress epic and one ready open epic
- WHEN a client requests `GET /api/projects`
- THEN `beads` has those counts and `epics` lists both epics

#### Scenario: No active epics
- GIVEN a project with no in_progress epic and no ready open epic
- WHEN a client requests `GET /api/projects`
- THEN `beads.epics` is an empty list

#### Scenario: Milestone not counted as ready
- GIVEN a project with 2 ready issues and an open milestone without blockers that `bd ready` lists
- WHEN a client requests `GET /api/projects`
- THEN `beads.ready` is 2

### REQ-UI-055: Main navigation
<!-- base: 97592ceb8a2a4a25c90a4898448e38068b706d9d31f39bbe36c81daccf3410c3 -->
The frontend SHALL show one navigation landmark labelled "Main" on every page, holding exactly one link each to Projects (`/`), Beads (`/beads`), Milestones (`/milestones`), Sessions (`/sessions`) and Quota (`/quota`).

#### Scenario: Five links
- GIVEN any page is shown
- WHEN the page loads
- THEN the "Main" navigation holds the links Projects, Beads, Milestones, Sessions and Quota, one each

### REQ-UI-057: Current destination
<!-- base: a8fa59c6e5e5e1e0f7113b8abce7d955cb70da81bbeefca7ae2294332c9b96fd -->
The "Main" navigation SHALL mark the link of the page being shown with `aria-current="page"` and a visible highlight, treating `/beads`, `/beads/<project>/<id>` as Beads, `/milestones`, `/milestones/<project>/<id>` as Milestones and `/sessions`, `/sessions/<project>/<id>` as Sessions, and SHALL mark no other link.

#### Scenario: Bead page
- GIVEN the URL is `/beads/alpha/a-1`
- WHEN the page loads
- THEN only the Beads link has `aria-current="page"`

#### Scenario: Milestone page
- GIVEN the URL is `/milestones/alpha/m-1`
- WHEN the page loads
- THEN only the Milestones link has `aria-current="page"`

#### Scenario: Change page
- GIVEN the Projects page is shown
- WHEN the user clicks "Quota"
- THEN only the Quota link has `aria-current="page"`

## REMOVED
