# Spec Delta: Project card health from gin state

## ADDED

## MODIFIED

### REQ-SERVER-005: Workflow state per project
<!-- base: 29d24f1f857592470fe015762652567e307fff805666d055ca3fc04b0bb213db -->
WHEN a client requests `GET /api/projects`, the server SHALL include for each existing project a `workflow` object with `stage`, `layout` and `gates` (gate name to state), `workspace` (`null`, or `root` and `repos`, each repo with `path`, `branch`, `shape`, `frozen` and `present`), `team` (`enabled`, `host`, `me`), `decision`, `warnings`, `remedies` and `review_waivers` (each with `task_id`, `reason` and `actor`), taken from `gin state --format json` run read-only in the project directory, with `null` or an empty list for each of them that the output lacks.

#### Scenario: Workflow state present
- GIVEN a project whose `gin state --format json` reports stage `discuss` and five gates
- WHEN a client requests `GET /api/projects`
- THEN that project's `workflow` has `stage` `discuss` and the five gates with their states

#### Scenario: Workspace, team and health
- GIVEN a project whose `gin state --format json` reports a workspace with 8 repos, `team.enabled` true with host `github`, `decision` `hold`, the warning "event log unreadable" and one review waiver
- WHEN a client requests `GET /api/projects`
- THEN that project's `workflow` carries the 8 repos, the team, `decision` `hold`, the warning and the waiver

#### Scenario: Older gin
- GIVEN a project whose `gin state --format json` has no `workspace`, `team`, `decision`, `warnings`, `remedies` or `review_waivers`
- WHEN a client requests `GET /api/projects`
- THEN `workflow.workspace` is `null`, `team` is `null`, `decision` is `null`, and the three lists are empty

### REQ-SERVER-006: Beads summary per project
<!-- base: a80c9bc689d5b44eee26a2ea5472c0800c39d39dc7dd34a7968e3ad3f59fc9f8 -->
WHEN a client requests `GET /api/projects`, the server SHALL include for each existing project a `beads` object with the counts `open`, `in_progress`, `blocked` and `ready`, and an `epics` list of the epics that are `in_progress` or that are `open` and ready, each with `id`, `title`, `status` and, for an `in_progress` epic in `GET /api/projects` only (never in `GET /api/projects/beads`, which starts no process, REQ-SERVER-010), `workflow`: the `stage`, `gates`, `warnings` and `review_waivers` of `gin state --workflow-id <id> --format json`, or `{"error": <message>}` when that command fails, the commands for one project running at most four at a time, taken from the project's `bd export` snapshot (REQ-BEADS-012) with readiness worked out as in REQ-BEADS-007, where `blocked` counts the beads that are not closed and blocked, and `ready` never counts a bead of type `milestone`. The counts `open`, `in_progress`, `blocked` and `ready` SHALL leave out prep tasks (REQ-BEADS-002). The `beads` object SHALL add `prep`, the number of prep tasks that are not closed.

#### Scenario: Counts and active epics
- GIVEN a project with 3 open, 1 in_progress and 2 ready issues, one in_progress epic and one ready open epic
- WHEN a client requests `GET /api/projects`
- THEN `beads` has those counts and `epics` lists both epics

#### Scenario: No active epics
- GIVEN a project with no in_progress epic and no ready open epic
- WHEN a client requests `GET /api/projects`
- THEN `beads.epics` is an empty list

#### Scenario: Milestone not counted as ready
- GIVEN a project with 2 ready issues and an open milestone without blockers
- WHEN a client requests `GET /api/projects`
- THEN `beads.ready` is 2

#### Scenario: Prep tasks counted apart
- GIVEN a project whose only beads are the in_progress epic `e-1`, its open ready tracks `t-1` and `t-2`, its open prep task `p-1` labelled `prep` and `prep:mockup` without blockers, and its closed prep task `p-2` labelled `prep`
- WHEN a client requests `GET /api/projects`
- THEN `beads.open` is 2, `beads.in_progress` is 1, `beads.ready` is 2, `beads.blocked` is 0 and `beads.prep` is 1

#### Scenario: Stage of an epic in progress
- GIVEN in_progress epic `e-1` whose `gin state --workflow-id e-1` reports stage `execute`, and ready epic `e-2`
- WHEN a client requests `GET /api/projects`
- THEN `e-1` has `status` `in_progress` and `workflow.stage` `execute`, `e-2` has `status` `open` and no `workflow`, and no `gin state` ran for `e-2`

#### Scenario: One epic fails
- GIVEN in_progress epics `e-1` and `e-3`, and `gin state --workflow-id e-3` exiting non-zero
- WHEN a client requests `GET /api/projects`
- THEN `e-1` has its `workflow`, `e-3` has `workflow` `{"error": …}`, and the rest of the project is unchanged

#### Scenario: Project beads endpoint unchanged
- GIVEN the same in_progress epic `e-1`
- WHEN a client requests `GET /api/projects/beads`
- THEN `e-1` has `id`, `title` and `status` and no `workflow`, and no `gin state` ran

### REQ-UI-003: Workflow state display
<!-- base: 1088d3984c7fff445754bde0e4b52719fc22b87986ac44570b327be2c548aa45 -->
The Projects page SHALL show, for each project with `workflow` data, "workspace · <n> repos" with a "Show repos" control that lists each repo's path, branch and shape and marks a repo that is frozen or not present, "team · <host>" while team mode is on, an alert listing the `decision` when it is `hold` together with the `warnings` and `remedies`, and "<n> review waiver(s)" with each waiver's task, reason and actor, showing none of them when it is absent or empty; it SHALL NOT show the default workflow's stage and gates.

#### Scenario: Workspace and team
- GIVEN a project with a workspace of 8 repos, one of them frozen, and team mode on with host `github`
- WHEN the Projects page loads and the user chooses "Show repos"
- THEN the card shows "workspace · 8 repos" and "team · github", then the 8 repos with the frozen one marked

#### Scenario: Health alert
- GIVEN a project with `decision` `hold`, the warning "event log unreadable" and one review waiver for `t-1`
- WHEN the Projects page loads
- THEN the card shows an alert with "hold" and the warning, and "1 review waiver" naming `t-1`

#### Scenario: Plain project
- GIVEN a project without workspace, team, warnings or waivers and the default workflow at stage `discuss`
- WHEN the Projects page loads
- THEN the card shows none of these and no default-workflow stage or gate chips

### REQ-UI-004: Beads summary display
<!-- base: fc5b08bfb9d2a1bdfbb493251c776b70062ca7b118fe89eb60027bc15f3714ae -->
The Projects page SHALL show, for each project with `beads` data, the counts open, in progress, blocked and ready, the count `prep` as "prep <n>" when it is above 0, and the active epics as `id` and `title`, each epic in progress with its `workflow.stage` and, when its `warnings` or `review_waivers` are not empty, a warning mark with their count whose details show on hover and focus, an epic whose `workflow` is an error with "stage unknown" and the error as its details, and a ready epic with "ready", or a "no active epics" note when the list is empty.

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

## REMOVED
