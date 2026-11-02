# Test cases: milestone-ui

### TC-MILESTONE-UI-001: List milestones with status, period, progress and warnings
REQ: REQ-MILESTONE-UI-001@b8f53ca9
Type: e2e
Priority: high

Preconditions:
- project P whose `milestone list --all --json` reports M1 (active) and M2 (planned)

Steps:
1. Open /milestones
2. Select project P

Expected:
- M1 and M2 are listed
- Each row shows its status, start and end, epic progress, and warning count
- The URL has `project=P`

### TC-MILESTONE-UI-002: Kickoff date shown when set
REQ: REQ-MILESTONE-UI-001@b8f53ca9
Type: e2e
Priority: low

Preconditions:
- project P whose `milestone list` reports planned M2 with `kickoff: 2026-11-16`

Steps:
1. Open /milestones?project=P

Expected:
- M2 shows its kickoff date 2026-11-16 next to its period

### TC-MILESTONE-UI-003: Unassigned epics count not shown
REQ: REQ-MILESTONE-UI-001@b8f53ca9
Type: e2e
Priority: medium

Preconditions:
- project P whose `milestone list` reports `unassigned_epics: 4`

Steps:
1. Open /milestones?project=P

Expected:
- No sentence counting roadmap epics outside milestones is shown

### TC-MILESTONE-UI-004: Schedule error replaces progress and warnings
REQ: REQ-MILESTONE-UI-001@b8f53ca9
Type: e2e
Priority: high

Preconditions:
- project P whose `milestone list` reports M1 normally and M2 with `error` "dependency cycle: A -> B -> A"

Steps:
1. Open /milestones?project=P

Expected:
- M2 shows "dependency cycle: A -> B -> A" in place of its progress and warning count
- M1 shows its progress and warning count

### TC-MILESTONE-UI-005: Graph tab shows epics and their dependency edge
REQ: REQ-MILESTONE-UI-002@d40b9a33
Type: e2e
Priority: high

Preconditions:
- milestone M1 of project P with epics A and B, B depending on A

Steps:
1. Open /milestones/P/M1
2. Click the "Graph" tab

Expected:
- The URL has `tab=graph`
- A and B are shown as nodes
- An edge runs from A to B

### TC-MILESTONE-UI-006: Graph tab marks a dependency outside the milestone as external
REQ: REQ-MILESTONE-UI-002@d40b9a33
Type: e2e
Priority: medium

Preconditions:
- epic A in M1 depending on epic X in M2

Steps:
1. Open /milestones/P/M1?tab=graph

Expected:
- X is shown as an external node
- An edge runs from X to A

### TC-MILESTONE-UI-007: Gantt shows an overflow warning past the end line
REQ: REQ-MILESTONE-UI-003@68d4a64d
Type: e2e
Priority: high

Preconditions:
- milestone M1 whose `show` output gives epic A warning `overflow` of 2 days

Steps:
1. Open /milestones/P/M1

Expected:
- The Gantt tab is selected
- A's bar extends past the end line
- A shows an overflow warning of 2 days

### TC-MILESTONE-UI-008: Today line drawn at the JSON today
REQ: REQ-MILESTONE-UI-003@68d4a64d
Type: e2e
Priority: high

Preconditions:
- milestone M1 whose `show` output has `today: 2026-11-04`
- the browser clock set to 2026-11-20

Steps:
1. Open /milestones/P/M1

Expected:
- The today line is drawn at 2026-11-04

### TC-MILESTONE-UI-009: External blocker warning names the epic and its milestone
REQ: REQ-MILESTONE-UI-003@68d4a64d
Type: e2e
Priority: medium

Preconditions:
- epic A in M1 with warning `external_blocker` and `external_depends_on` `[{"id": "E9", "milestone": "M2"}]`

Steps:
1. Open /milestones/P/M1

Expected:
- A shows an external blocker warning naming E9 and M2

### TC-MILESTONE-UI-010: Bars colored by bead status
REQ: REQ-MILESTONE-UI-003@68d4a64d
Type: e2e
Priority: low

Preconditions:
- milestone M1 with epic A closed, epic B in progress, and epic C open

Steps:
1. Open /milestones/P/M1

Expected:
- A, B and C each have one bar from `planned_start` to `planned_end`
- Each bar has the color of its status shown in the legend

### TC-MILESTONE-UI-011: Kick-start preview redraws the Gantt from the picked date
REQ: REQ-MILESTONE-UI-004@ed8c64e1
Type: e2e
Priority: high

Preconditions:
- planned milestone M1 of project P

Steps:
1. Open /milestones/P/M1
2. Set "Kick-start date" to 2026-11-16

Expected:
- The URL has `start=2026-11-16`
- The Gantt is drawn from 2026-11-16 and labelled as a preview
- The command `gin-workflow milestone kickstart M1 --date 2026-11-16` is shown

### TC-MILESTONE-UI-012: Kick-start date defaults to kickoff, else start
REQ: REQ-MILESTONE-UI-004@ed8c64e1
Type: e2e
Priority: medium

Preconditions:
- planned milestone M1 with `kickoff: 2026-11-16` and `start: 2026-11-09`
- scheduled milestone M2 without kickoff and with `start: 2026-11-23`

Steps:
1. Open /milestones/P/M1
2. Open /milestones/P/M2

Expected:
- On M1, "Kick-start date" shows 2026-11-16
- On M2, "Kick-start date" shows 2026-11-23

### TC-MILESTONE-UI-013: No kick-start picker for an active milestone
REQ: REQ-MILESTONE-UI-004@ed8c64e1
Type: e2e
Priority: high

Preconditions:
- active milestone M1

Steps:
1. Open /milestones/P/M1

Expected:
- No "Kick-start date" picker is shown

### TC-MILESTONE-UI-014: No kick-start picker for a closed milestone
REQ: REQ-MILESTONE-UI-004@ed8c64e1
Type: e2e
Priority: medium

Preconditions:
- closed milestone M1

Steps:
1. Open /milestones/P/M1

Expected:
- No "Kick-start date" picker is shown

### TC-MILESTONE-UI-015: Failed preview shows the error and no bars
REQ: REQ-MILESTONE-UI-004@ed8c64e1
Type: e2e
Priority: high

Preconditions:
- planned milestone M1 whose `show --start 2026-11-16` exits 1

Steps:
1. Open /milestones/P/M1
2. Set "Kick-start date" to 2026-11-16

Expected:
- The Gantt tab shows the error
- No bars are drawn, neither the current plan nor an earlier preview

### TC-MILESTONE-UI-016: Old gin-workflow names the install fix
REQ: REQ-MILESTONE-UI-005@3ee8a9e1
Type: e2e
Priority: high

Preconditions:
- project P whose gin-workflow has no `milestone` command (API responds 502 with `cause: "outdated"`)

Steps:
1. Open /milestones?project=P

Expected:
- An error says milestones need a newer gin-workflow
- The error tells to run `gin-workflow/install.sh`

### TC-MILESTONE-UI-017: Markdown tracking names the Beads fix
REQ: REQ-MILESTONE-UI-005@3ee8a9e1
Type: e2e
Priority: high

Preconditions:
- project P with `providers.task_tracking: markdown` (API responds 502 with `cause: "tracking"`)

Steps:
1. Open /milestones?project=P

Expected:
- An error says milestones need `providers.task_tracking: beads`

### TC-MILESTONE-UI-018: Unknown schema is reported and nothing is listed
REQ: REQ-MILESTONE-UI-005@3ee8a9e1
Type: e2e
Priority: medium

Preconditions:
- project P whose `milestone list` reports `schema: 2` (API responds 502 with `cause: "schema"`)

Steps:
1. Open /milestones?project=P

Expected:
- An error says schema 2 is not supported
- No milestone is listed

### TC-MILESTONE-UI-019: Milestone page shows the same unavailable error
REQ: REQ-MILESTONE-UI-005@3ee8a9e1
Type: e2e
Priority: medium

Preconditions:
- project P whose gin-workflow has no `milestone` command

Steps:
1. Open /milestones/P/M1

Expected:
- An error says milestones need a newer gin-workflow and to run `gin-workflow/install.sh`

### TC-MILESTONE-UI-020: Project Dependencies graph keeps epics under a milestone
REQ: REQ-MILESTONE-UI-006@3025db15
Type: e2e
Priority: high

Preconditions:
- epics A and B of project P, B depending on A, both children of milestone M1

Steps:
1. Open /beads/P/graph

Expected:
- A and B are shown as nodes
- An edge runs from A to B
- M1 is not shown and does not group or hide A and B

### TC-MILESTONE-UI-021: Open milestone without blockers is not ready work
REQ: REQ-MILESTONE-UI-007@f332d94b
Type: api
Priority: high

Preconditions:
- project P with open milestone M1 without blockers and open task T without blockers

Steps:
1. Request `GET /api/projects`
2. Request `GET /api/beads?project=P`

Expected:
- P's ready count is 1 (T only)
- M1 is not flagged ready; T is

### TC-MILESTONE-UI-022: List milestones of a project
REQ: REQ-MILESTONE-UI-008@6a188a65
Type: api
Priority: high

Preconditions:
- project P whose `milestone list --all --json` prints schema 1 with M1

Steps:
1. Request `GET /api/milestones?project=P`

Expected:
- The response is 200
- The body has M1, `unassigned_epics`, and `today`
- The command ran in P's directory

### TC-MILESTONE-UI-023: Show one milestone with a start date
REQ: REQ-MILESTONE-UI-008@6a188a65
Type: api
Priority: high

Preconditions:
- project P whose `milestone show M1 --start 2026-11-16 --json` prints schema 1

Steps:
1. Request `GET /api/milestones/P/M1?start=2026-11-16`

Expected:
- The response is 200 with the plan of M1
- `milestone show M1 --start 2026-11-16 --json` ran

### TC-MILESTONE-UI-024: Response without start is cached for 5 seconds
REQ: REQ-MILESTONE-UI-008@6a188a65
Type: api
Priority: medium

Preconditions:
- project P whose `milestone list --all --json` prints schema 1

Steps:
1. Request `GET /api/milestones?project=P`
2. Request it again within 5 seconds
3. Request it again after 5 seconds

Expected:
- The command ran once for the first two requests
- The command ran again for the third request

### TC-MILESTONE-UI-025: Preview with start is never cached
REQ: REQ-MILESTONE-UI-008@6a188a65
Type: api
Priority: medium

Preconditions:
- a request for M1 with `start=2026-11-16` answered less than 5 seconds ago

Steps:
1. Request `GET /api/milestones/P/M1?start=2026-11-16` again

Expected:
- `milestone show M1 --start 2026-11-16 --json` runs again

### TC-MILESTONE-UI-026: Invalid start is rejected without running a command
REQ: REQ-MILESTONE-UI-008@6a188a65
Type: api
Priority: high

Preconditions:
- project P

Steps:
1. Request `GET /api/milestones/P/M1?start=next-monday`

Expected:
- The response is 422
- No command runs

### TC-MILESTONE-UI-027: Unknown project or missing directory answers 404
REQ: REQ-MILESTONE-UI-008@6a188a65
Type: api
Priority: medium

Preconditions:
- no project named Q is configured
- project R is configured but its directory does not exist

Steps:
1. Request `GET /api/milestones?project=Q`
2. Request `GET /api/milestones/R/M1`

Expected:
- Both responses are 404

### TC-MILESTONE-UI-028: Old gin-workflow answers 502 outdated and is not cached
REQ: REQ-MILESTONE-UI-008@6a188a65
Type: api
Priority: high

Preconditions:
- project P whose `gin-workflow milestone` exits 2 with `invalid choice: 'milestone'`

Steps:
1. Request `GET /api/milestones?project=P`
2. Request it again within 5 seconds

Expected:
- Both responses are 502 with `error` and `cause: "outdated"`
- The command ran for each request

### TC-MILESTONE-UI-029: Markdown tracking answers 502 tracking
REQ: REQ-MILESTONE-UI-008@6a188a65
Type: api
Priority: high

Preconditions:
- project P whose `milestone list` exits 1 with `milestone error: milestones need providers.task_tracking: beads`

Steps:
1. Request `GET /api/milestones?project=P`

Expected:
- The response is 502 with `cause: "tracking"`

### TC-MILESTONE-UI-030: Schema other than 1 answers 502 schema
REQ: REQ-MILESTONE-UI-008@6a188a65
Type: api
Priority: medium

Preconditions:
- project P whose `milestone list --all --json` prints `schema: 2`

Steps:
1. Request `GET /api/milestones?project=P`

Expected:
- The response is 502 with `cause: "schema"`

### TC-MILESTONE-UI-031: Other command failure answers 502 with null cause
REQ: REQ-MILESTONE-UI-008@6a188a65
Type: api
Priority: medium

Preconditions:
- project P whose `milestone show M1 --json` exits 1 with `milestone error: unknown milestone M1`

Steps:
1. Request `GET /api/milestones/P/M1`

Expected:
- The response is 502 with `error` holding the message and `cause: null`

### TC-MILESTONE-UI-032: List view hides the milestone and roots its epics
REQ: REQ-MILESTONE-UI-009@b69e4614
Type: e2e
Priority: high

Preconditions:
- project P with milestone M1 and child epics A and B

Steps:
1. Open /beads?project=P
2. Choose the "List" view

Expected:
- M1 is not listed
- A and B are shown as roots

### TC-MILESTONE-UI-033: Board view hides the milestone
REQ: REQ-MILESTONE-UI-009@b69e4614
Type: e2e
Priority: high

Preconditions:
- project P with open milestone M1 and open epic A

Steps:
1. Open /beads?project=P
2. Choose the "Board" view

Expected:
- A is on the board
- M1 is in no column

### TC-MILESTONE-UI-034: Focus view hides the milestone
REQ: REQ-MILESTONE-UI-009@b69e4614
Type: e2e
Priority: medium

Preconditions:
- project P with open milestone M1 and open epic A, child of M1

Steps:
1. Open /beads?project=P
2. Choose the "Focus" view

Expected:
- M1 is not shown
- A is shown without a parent

### TC-MILESTONE-UI-035: Lists only parentless epics
REQ: REQ-MILESTONE-UI-010@870a452a
Type: e2e
Priority: high

Preconditions:
- project P with open epics A (labelled `roadmap`) and B (no labels) without a parent, open epic C whose parent is milestone M1, open epic D whose parent is epic A, and open task T without a parent

Steps:
1. Open /milestones?project=P

Expected:
- The "Epics not in a milestone" heading shows 2
- The section lists A and B only
- Each row shows state, id, title, priority, and labels
- A's title links to /beads/P/A and B's to /beads/P/B

### TC-MILESTONE-UI-036: Rows ordered by priority then id
REQ: REQ-MILESTONE-UI-010@870a452a
Type: e2e
Priority: low

Preconditions:
- project P with parentless open epics `p-b` (P1), `p-a` (P1), and `p-c` (P0)

Steps:
1. Open /milestones?project=P

Expected:
- The section lists `p-c`, `p-a`, `p-b` in that order

### TC-MILESTONE-UI-037: Show closed adds closed epics dimmed
REQ: REQ-MILESTONE-UI-010@870a452a
Type: e2e
Priority: medium

Preconditions:
- project P with open epic A and closed epic E, both without a parent

Steps:
1. Open /milestones?project=P
2. Check "Show closed"

Expected:
- Before the check, only A is listed and the heading shows 1
- After the check, A and E are listed with E dimmed
- The heading shows 2

### TC-MILESTONE-UI-038: Every epic in a milestone
REQ: REQ-MILESTONE-UI-010@870a452a
Type: e2e
Priority: medium

Preconditions:
- project P whose open epics all have a milestone parent

Steps:
1. Open /milestones?project=P

Expected:
- The section heading shows 0
- The section says every epic is in a milestone

### TC-MILESTONE-UI-039: Beads failure stays in the section and Retry refetches
REQ: REQ-MILESTONE-UI-010@870a452a
Type: e2e
Priority: high

Preconditions:
- project P whose milestones load and whose `GET /api/beads` responds 502

Steps:
1. Open /milestones?project=P
2. Click "Retry" in the section

Expected:
- The milestones are listed
- The section shows the error with a "Retry" button
- Retry requests `/api/beads` again

### TC-MILESTONE-UI-040: Whole milestone by default fills the width
REQ: REQ-MILESTONE-UI-011@83b54b5c
Type: e2e
Priority: high

Preconditions:
- milestone M1 whose plan spans 2026-11-02 to 2026-11-11

Steps:
1. Open /milestones/P/M1

Expected:
- "Whole milestone" is selected in Zoom
- The last day of the plan ends at the right edge of the chart

### TC-MILESTONE-UI-041: Two weeks starts on the Monday of today
REQ: REQ-MILESTONE-UI-011@83b54b5c
Type: e2e
Priority: high

Preconditions:
- milestone M1 whose plan spans 2026-11-02 to 2026-11-27 and `today: 2026-11-11`

Steps:
1. Open /milestones/P/M1?tab=gantt&start=2026-11-02
2. Choose "2 weeks" in Zoom

Expected:
- The URL has `zoom=2w` and keeps `tab=gantt` and `start=2026-11-02`
- The days in view are 2026-11-09 to 2026-11-22

### TC-MILESTONE-UI-042: Today outside the plan starts on the plan's first Monday
REQ: REQ-MILESTONE-UI-011@83b54b5c
Type: e2e
Priority: medium

Preconditions:
- milestone M1 whose plan starts on Wednesday 2026-11-04 and `today: 2026-10-29`

Steps:
1. Open /milestones/P/M1?zoom=1w

Expected:
- "1 week" is selected
- The days in view are 2026-11-02 to 2026-11-08

### TC-MILESTONE-UI-043: Unknown zoom falls back to whole milestone
REQ: REQ-MILESTONE-UI-011@83b54b5c
Type: e2e
Priority: low

Preconditions:
- milestone M1

Steps:
1. Open /milestones/P/M1?zoom=3w

Expected:
- "Whole milestone" is selected

### TC-MILESTONE-UI-044: Zoom kept with the preview
REQ: REQ-MILESTONE-UI-011@83b54b5c
Type: e2e
Priority: medium

Preconditions:
- planned milestone M1

Steps:
1. Open /milestones/P/M1?zoom=1w
2. Set "Kick-start date" to 2026-11-16

Expected:
- The URL keeps `zoom=1w` and has `start=2026-11-16`
- The preview is drawn at one week

### TC-MILESTONE-UI-045: Drag to later dates
REQ: REQ-MILESTONE-UI-012@a4f22671
Type: e2e
Priority: high

Preconditions:
- milestone M1 zoomed to `1 week` with 2026-11-02 to 2026-11-08 in view

Steps:
1. Open /milestones/P/M1?zoom=1w
2. Drag the chart to the left by the width of one week

Expected:
- 2026-11-09 to 2026-11-15 are in view
- The label reads "9 Nov – 15 Nov"

### TC-MILESTONE-UI-046: Drag over a link does not open it
REQ: REQ-MILESTONE-UI-012@a4f22671
Type: e2e
Priority: high

Preconditions:
- milestone M1 zoomed to `1 week`

Steps:
1. Open /milestones/P/M1?zoom=1w
2. Press on an epic id, drag 40 px and release

Expected:
- The days in view move
- The bead page is not opened

### TC-MILESTONE-UI-047: Click without drag still opens the link
REQ: REQ-MILESTONE-UI-012@a4f22671
Type: e2e
Priority: medium

Preconditions:
- milestone M1 zoomed to `1 week` with epic A

Steps:
1. Open /milestones/P/M1?zoom=1w
2. Click A's id without moving the mouse

Expected:
- The bead page /beads/P/A opens

### TC-MILESTONE-UI-048: Step by a period
REQ: REQ-MILESTONE-UI-012@a4f22671
Type: e2e
Priority: high

Preconditions:
- milestone M1 zoomed to `2 weeks` with 2026-11-02 to 2026-11-15 in view

Steps:
1. Open /milestones/P/M1?zoom=2w
2. Click "Later" (›)

Expected:
- 2026-11-16 to 2026-11-29 are in view
- The label shows the new first and last day

### TC-MILESTONE-UI-049: Earlier disabled at the start of the plan
REQ: REQ-MILESTONE-UI-012@a4f22671
Type: e2e
Priority: medium

Preconditions:
- milestone M1 zoomed to `1 week` with the first day of the plan in view

Steps:
1. Open /milestones/P/M1?zoom=1w

Expected:
- "Earlier" (‹) is disabled

### TC-MILESTONE-UI-050: Later disabled at the end of the plan
REQ: REQ-MILESTONE-UI-012@a4f22671
Type: e2e
Priority: medium

Preconditions:
- milestone M1 whose plan spans 2026-11-02 to 2026-11-13, zoomed to `1 week`

Steps:
1. Open /milestones/P/M1?zoom=1w
2. Click "Later" (›)

Expected:
- The last day of the plan is in view
- "Later" (›) is disabled

### TC-MILESTONE-UI-051: Whole milestone does not pan
REQ: REQ-MILESTONE-UI-012@a4f22671
Type: e2e
Priority: medium

Preconditions:
- milestone M1 on a screen wide enough for the plan

Steps:
1. Open /milestones/P/M1
2. Drag the chart to the left by 100 px

Expected:
- ‹, › and the label of days in view are not shown
- The chart does not move

### TC-MILESTONE-UI-052: Days in view kept when the plan refreshes
REQ: REQ-MILESTONE-UI-012@a4f22671
Type: e2e
Priority: low

Preconditions:
- milestone M1 zoomed to `1 week`

Steps:
1. Open /milestones/P/M1?zoom=1w
2. Click "Later" (›)
3. Wait for the plan to refresh

Expected:
- The days in view after the refresh are the same as before it

### TC-MILESTONE-UI-053: Long title and id cut with an ellipsis on a phone
REQ: REQ-MILESTONE-UI-013@707f050a
Type: e2e
Priority: medium

Preconditions:
- epic `gin-workflow-rm-process-hygiene` titled "Process hygiene: consistent skills, rules that bind where it matters"
- a phone-sized viewport (390 × 844)

Steps:
1. Open /milestones/P/M1
2. Hover the epic's title

Expected:
- The title and the id each take one line, cut short with an ellipsis
- The full title is shown on hover
- The id links to its bead page

### TC-MILESTONE-UI-054: Label column stays visible while the chart scrolls
REQ: REQ-MILESTONE-UI-013@707f050a
Type: e2e
Priority: medium

Preconditions:
- milestone M1 zoomed to `1 week` with epic A

Steps:
1. Open /milestones/P/M1?zoom=1w
2. Click "Later" (›)

Expected:
- A's status icon, title, id, period and estimate stay visible

### TC-MILESTONE-UI-055: Title shown after the bar when room is left
REQ: REQ-MILESTONE-UI-013@707f050a
Type: e2e
Priority: low

Preconditions:
- epic A whose bar ends on the first day of a 10-day plan shown as `Whole milestone`

Steps:
1. Open /milestones/P/M1

Expected:
- A's title is shown after its bar

### TC-MILESTONE-UI-056: No title after a bar that ends near the chart edge
REQ: REQ-MILESTONE-UI-013@707f050a
Type: e2e
Priority: low

Preconditions:
- epic Z whose bar ends on the last day of the plan shown as `Whole milestone`

Steps:
1. Open /milestones/P/M1

Expected:
- Z's title is not shown after its bar

### TC-MILESTONE-UI-057: Arrow from the end of the dependency to the start of the dependent
REQ: REQ-MILESTONE-UI-014@d417b46f
Type: e2e
Priority: high

Preconditions:
- epic B in M1 with `depends_on: ["A"]`, A planned 2026-11-02 and B planned 2026-11-03

Steps:
1. Open /milestones/P/M1

Expected:
- An arrow runs from the end of A's bar on 2026-11-02 to the start of B's bar on 2026-11-03
- The arrow is not in the blocked color

### TC-MILESTONE-UI-058: No arrow for a dependency outside the milestone
REQ: REQ-MILESTONE-UI-014@d417b46f
Type: e2e
Priority: medium

Preconditions:
- epic B in M1 with `depends_on: ["X"]` where X is not an epic of M1

Steps:
1. Open /milestones/P/M1

Expected:
- No arrow is drawn for X

### TC-MILESTONE-UI-059: Hover highlights the whole chain
REQ: REQ-MILESTONE-UI-014@d417b46f
Type: e2e
Priority: medium

Preconditions:
- epics A, B, C, D in M1 where B depends on A, C depends on B, and D has no dependency

Steps:
1. Open /milestones/P/M1
2. Hover B's row

Expected:
- A, B, C and the arrows A→B and B→C are highlighted
- D is faded

### TC-MILESTONE-UI-060: Keyboard focus highlights the chain
REQ: REQ-MILESTONE-UI-014@d417b46f
Type: e2e
Priority: low

Preconditions:
- epics A, B, C, D in M1 where B depends on A, C depends on B, and D has no dependency

Steps:
1. Open /milestones/P/M1
2. Press Tab until B's id link has focus

Expected:
- A, B, C and the arrows A→B and B→C are highlighted
- D is faded

### TC-MILESTONE-UI-061: Dependent starting too early draws a blocked arrow
REQ: REQ-MILESTONE-UI-014@d417b46f
Type: e2e
Priority: medium

Preconditions:
- epic B in M1 depending on A, with A planned to end 2026-11-05 and B planned to start 2026-11-05

Steps:
1. Open /milestones/P/M1

Expected:
- The arrow from A to B is drawn in the blocked color

### TC-MILESTONE-UI-062: Expand an epic shows its closed children
REQ: REQ-MILESTONE-UI-015@f33e3903
Type: e2e
Priority: high

Preconditions:
- epic `gin-workflow-rm-cost-control` with four closed children `.1` to `.4`, closed on 2026-11-01

Steps:
1. Open /milestones/P/M1
2. Click "Show 4 child beads of gin-workflow-rm-cost-control"

Expected:
- Before expanding, no child rows are shown and the epic row shows "4/4 closed"
- Four rows `.1` to `.4` are shown under the epic, ordered by id, each with "closed 1 Nov"
- The child rows shade the epic's period and draw no bars

### TC-MILESTONE-UI-063: Epic without children has no expand button
REQ: REQ-MILESTONE-UI-015@f33e3903
Type: e2e
Priority: medium

Preconditions:
- epic A with no bead whose `parent` is A

Steps:
1. Open /milestones/P/M1

Expected:
- A has no expand button and no closed count

### TC-MILESTONE-UI-064: Open child shows its status instead of a date
REQ: REQ-MILESTONE-UI-015@f33e3903
Type: e2e
Priority: medium

Preconditions:
- epic B with child `B.2` in status `in_progress`

Steps:
1. Open /milestones/P/M1
2. Expand B

Expected:
- The row of `B.2` reads "In progress"
- The row of `B.2` has no closing date

### TC-MILESTONE-UI-065: Expanding one epic leaves the others as they are
REQ: REQ-MILESTONE-UI-015@f33e3903
Type: e2e
Priority: low

Preconditions:
- epics A and B in M1, each with child beads

Steps:
1. Open /milestones/P/M1
2. Expand A
3. Expand B
4. Collapse A

Expected:
- A's children are hidden
- B's children are still shown

### TC-MILESTONE-UI-066: Beads unavailable still draws the Gantt
REQ: REQ-MILESTONE-UI-015@f33e3903
Type: e2e
Priority: medium

Preconditions:
- milestone M1 whose `GET /api/beads` for the project fails

Steps:
1. Open /milestones/P/M1

Expected:
- The epics, bars and arrows are drawn
- No epic has an expand button or a closed count
