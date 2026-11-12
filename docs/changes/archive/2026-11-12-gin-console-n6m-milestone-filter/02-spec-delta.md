# Spec Delta: Milestone filter

## ADDED

### REQ-BEADS-015: Project milestones
WHEN a client requests `GET /api/beads/milestones?project=<name>`, the server SHALL read the project's beads from its `bd export` snapshot (REQ-BEADS-012) without starting a process, and SHALL return `milestones`: every bead of type `milestone`, each with `id`, `title`, `status`, `start` and `end` (ISO dates from `metadata.start` and `metadata.end`, or `null` when missing or not a valid date), and `current`: the id of the current milestone, or `null`. A milestone's `status` SHALL be `closed` when the bead is closed, else `active` when `metadata.kickoff` is a date on or before today, `scheduled` when it is after today, and `planned` without a valid kickoff. The current milestone SHALL be the first match, among milestones with both dates, of: the `active` milestone with the earliest `start`; the open milestone whose `start` to `end` holds today; the open milestone with the earliest `start` after today (ties by `id`). The server SHALL respond 404 when the project is not configured or its directory does not exist, and 502 with an `error` as in REQ-BEADS-005.

#### Scenario: Current milestone
- GIVEN project `alpha` with closed milestone `m1`, active milestone `m2` and planned milestone `m3`
- WHEN a client requests `GET /api/beads/milestones?project=alpha`
- THEN `milestones` holds `m1`, `m2` and `m3` with statuses `closed`, `active` and `planned`, and `current` is `m2`

#### Scenario: Period holds today
- GIVEN project `alpha` whose only open milestone `m4` has no kickoff and runs from before today to after today
- WHEN a client requests its milestones
- THEN `current` is `m4`

#### Scenario: No open milestone
- GIVEN project `alpha` whose milestones are all closed
- WHEN a client requests its milestones
- THEN `current` is `null`

#### Scenario: Undated milestone
- GIVEN a milestone bead `m5` without `metadata.end`
- WHEN a client requests its project's milestones
- THEN `m5` is listed with `end` `null` and is not `current`

#### Scenario: Bad input
- GIVEN no project `nope`
- WHEN a client requests `GET /api/beads/milestones?project=nope`
- THEN the response is 404

### REQ-UI-104: Beads milestone filter
WHEN the Beads page loads a project, the frontend SHALL request `GET /api/beads/milestones?project=<name>` and SHALL offer a "Milestone" single-select in the bead filter bar, and in its mobile sheet (REQ-UI-084), listing "All", "No milestone", then the milestones grouped as Active (`active`), Planned (`scheduled` and `planned`, by `start`) and Closed (latest `end` first), kept in the URL as `milestone` (`all`, `none` or a milestone id). WHEN the URL has no `milestone`, the filter SHALL select `current`, or "All" when `current` is `null`. WHILE a milestone is selected, only the beads whose `milestone` is that id SHALL match; WHILE "No milestone" is selected, only the beads whose `milestone` is `null` SHALL match. WHILE a closed milestone is selected, closed beads SHALL be fetched and shown without "Show closed". The filter SHALL apply to the List, Board and Focus views. IF the milestones request fails, THEN the select SHALL say "Milestones unavailable" and the page SHALL behave as with "All".

#### Scenario: Default to the current milestone
- GIVEN project `alpha` whose current milestone is `m2`, with beads under `m2` and `m3` and a bead under no milestone
- WHEN the user opens `/beads?project=alpha`
- THEN only the beads under `m2` are shown and the Milestone select shows `m2`

#### Scenario: All and No milestone
- GIVEN the same project
- WHEN the user chooses "All" and then "No milestone"
- THEN every bead is shown with `milestone=all` in the URL, then only the bead under no milestone with `milestone=none`

#### Scenario: Closed milestone
- GIVEN closed milestone `m1` whose beads are all closed, and "Show closed" off
- WHEN the user chooses `m1`
- THEN the beads are requested with `closed=1` and the closed beads of `m1` are shown

#### Scenario: No current milestone
- GIVEN a project whose milestones are all closed
- WHEN the user opens its Beads page without `milestone`
- THEN "All" is selected and every open bead is shown

#### Scenario: Milestones unavailable
- GIVEN `GET /api/beads/milestones` answers 502
- WHEN the Beads page loads
- THEN the Milestone select says "Milestones unavailable" and every bead is shown

### REQ-UI-105: My Tasks project and milestone filters
The My Tasks page SHALL offer a "Project" select with "All projects" (the default) and each project whose directory exists, kept in the URL as `project`, and a "Milestone" select kept in the URL as `milestone`. WHILE "All projects" is selected, the Milestone select SHALL be disabled and every matching bead of every project SHALL be listed. WHEN a project is selected, the page SHALL list only that project's matching beads, SHALL request `GET /api/beads/milestones?project=<name>`, and SHALL offer the choices of REQ-UI-104, selecting `current` (or "All" when `current` is `null`) WHILE the URL has no `milestone`; the milestone choice SHALL filter the beads as in REQ-UI-104, and a closed milestone SHALL list its closed beads without "Show closed". A change of project SHALL clear `milestone`.

#### Scenario: All projects
- GIVEN tasks assigned to me in projects A and B
- WHEN My Tasks opens at `/my-tasks`
- THEN "All projects" is selected, the Milestone select is disabled, and the tasks of A and B are listed

#### Scenario: Project with a current milestone
- GIVEN project A whose current milestone is `m2`, with my tasks under `m2` and `m3`
- WHEN the user chooses project A
- THEN the URL is `/my-tasks?project=A`, the Milestone select shows `m2`, and only my tasks under `m2` are listed

#### Scenario: Change project clears the milestone
- GIVEN My Tasks at `/my-tasks?project=A&milestone=m3`
- WHEN the user chooses project B
- THEN the URL is `/my-tasks?project=B` and B's current milestone is selected

## MODIFIED

### REQ-BEADS-001: Bead list
<!-- base: cd3426b7933489b2160addaf9291e69a7ce1d2ef54ab66f3d10253915bf8f656 -->
WHEN a client requests `GET /api/beads?project=<name>`, the server SHALL return the beads of that configured project, each with `id`, `title`, `status`, `priority`, `issue_type`, `labels`, `owner`, `assignee`, `parent`, `created_at`, `updated_at`, `dependency_count`, `dependent_count`, `comment_count` and `milestone` (the id of the nearest bead of type `milestone` among the bead and its ancestors, found over every bead of the export whether closed or not, or `null`), and without the description, SHALL leave out closed beads unless the request has `closed=1`, and SHALL respond 404 when the project is not configured or its directory does not exist.

#### Scenario: Open beads by default
- GIVEN a project with 3 open, 1 in-progress and 4 closed beads
- WHEN a client requests `GET /api/beads?project=<name>`
- THEN 4 beads are returned and none is closed

#### Scenario: Closed beads on request
- GIVEN the same project
- WHEN a client requests `GET /api/beads?project=<name>&closed=1`
- THEN all 8 beads are returned

#### Scenario: Unknown project
- GIVEN no project named `nope`
- WHEN a client requests `GET /api/beads?project=nope`
- THEN the response is 404

#### Scenario: Missing directory
- GIVEN a configured project whose directory does not exist
- WHEN a client requests its beads
- THEN the response is 404

#### Scenario: Milestone of a bead
- GIVEN milestone `m2`, its closed epic `e1`, and an open task `e1.1` under `e1`
- WHEN a client requests `GET /api/beads?project=<name>`
- THEN `e1.1` has `milestone` `m2`, `m2` has `milestone` `m2`, and a bead under no milestone has `milestone` `null`

### REQ-UI-025: Search and filters
<!-- base: b654a6927bc729362f06ce637bb55d4d94095703b71197438ec2de9a82e0a28d -->
The bead list SHALL offer a search box that matches the id, title and labels case-insensitively, and filters for status, priority, label, type, assignee, sprint and milestone (REQ-UI-104), SHALL combine distinct filter categories with AND, SHALL serialize multi-select filters (`status`, `priority`, `label`, `assignee`) as comma-separated values in the URL query (`q`, `status`, `priority`, `label`, `label_mode`, `type`, `assignee`, `sprint`, `milestone`), and SHALL restore them on page load.

#### Scenario: Search
- GIVEN beads titled "Fix login" and "Add search"
- WHEN the user types "LOGIN"
- THEN only "Fix login" remains

#### Scenario: Multi-select combined filters
- GIVEN open P1 beads, in-progress P1 beads, and closed P2 beads
- WHEN the user filters status "open,in_progress" and priority "1"
- THEN only open and in-progress P1 beads remain and the URL query contains `status=open,in_progress&priority=1`

#### Scenario: Restored from the URL
- GIVEN the URL query has `?status=open,in_progress&priority=0,1&assignee=alice%40example.com&sprint=sprint-1&milestone=m2`
- WHEN the page loads
- THEN the filters are restored and applied to the view

### REQ-UI-043: List filters
<!-- base: 3e1f5b92154077f95817571aa4f5659e0047661b31845b1b233837d2944a554b -->
WHEN a search or a filter is active, the List view SHALL show only the beads that match them together with their ancestors in the hierarchy, with every branch that leads to a match open, and SHALL leave out closed beads unless "Show closed" is on, a sprint filter is active, or a closed milestone is selected (REQ-UI-104).

#### Scenario: Match with ancestors
- GIVEN an epic with a child titled "Fix login" and another titled "Add search"
- WHEN the user searches "login"
- THEN the epic and the "Fix login" child are shown, open, and "Add search" is not

#### Scenario: Closed beads
- GIVEN a closed child and "Show closed" off
- WHEN the List view is shown
- THEN the closed child is not shown, and it is shown after "Show closed" is turned on

#### Scenario: Filter by assignee
- GIVEN an epic with children assigned to "alice" and "bob"
- WHEN the user filters by assignee "alice"
- THEN the epic and the child assigned to "alice" are shown, and the child assigned to "bob" is not

#### Scenario: Filter by milestone
- GIVEN milestone `m2` with an epic and its child task, and an epic under no milestone
- WHEN the user selects milestone `m2`
- THEN the epic under `m2` and its child task are shown, the other epic is not, and no milestone bead is shown (REQ-MILESTONE-UI-009)

## REMOVED
