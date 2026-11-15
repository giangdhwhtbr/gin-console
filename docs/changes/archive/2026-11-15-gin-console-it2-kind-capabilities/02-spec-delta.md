# Spec Delta: Epic kind and capabilities in the Beads views

## ADDED

### REQ-UI-108: Kind and capability filters
The bead filter bar and its mobile sheet SHALL offer a "Kind" select (All, Capability, Technical, Parity) kept in the URL as `kind`, and a multi-select "Capability" listing every capability of the loaded beads, kept in the URL as `capability` and hidden while there is none. A bead SHALL match the Kind filter when it or its nearest epic ancestor has that kind, and the Capability filter when its capabilities or those of its nearest epic ancestor hold any chosen capability. The filters SHALL apply to the List, Board, Focus and Graph views on the Beads page and on a milestone's Beads tab, and SHALL count in the breadcrumb's filter count (REQ-UI-072).

#### Scenario: Kind filter keeps the tracks
- GIVEN technical epic `e-1` with task `t-1`, and capability epic `e-2` with task `t-2`
- WHEN the user chooses Kind "Technical"
- THEN the URL has `kind=technical` and `e-1` and `t-1` are shown while `e-2` and `t-2` are not

#### Scenario: Capability filter
- GIVEN track `t-1` with capability `milestone-ui` and track `t-3` with capability `beads`
- WHEN the user chooses the capability `milestone-ui`
- THEN the URL has `capability=milestone-ui` and `t-1` is shown while `t-3` is not

#### Scenario: No capabilities
- GIVEN a project whose beads have no capability
- WHEN the Beads page is shown
- THEN there is no "Capability" filter

### REQ-UI-109: Kind, capabilities and estimate in the Beads views
The frontend SHALL show a "Technical" or "Parity" badge for an epic of that kind, and no kind badge for a capability epic, on its List row, its Board and Focus card, its bead page and its Gantt label; SHALL show the bead's capabilities as chips on its bead page; SHALL show "Estimate <n>d" on the bead page of a bead with `estimate_minutes`, counting 480 minutes as one working day and rounding to one decimal; and SHALL show on an epic's List row its complexity (REQ-UI-028) and estimate as "<complexity> · <n>d", or either alone, among the items that give way before the title (REQ-UI-044).

#### Scenario: Technical epic
- GIVEN technical epic `e-1` with capabilities `beads` and `ui`, complexity `medium` and `estimate_minutes: 1440`
- WHEN its List row and its bead page are shown
- THEN the row shows "Technical" and "medium · 3d", and the bead page shows "Technical", the chips `beads` and `ui`, and "Estimate 3d"

#### Scenario: Capability epic
- GIVEN capability epic `e-2` without an estimate
- WHEN its List row is shown
- THEN it shows no kind badge and no estimate

#### Scenario: Partial day
- GIVEN a task with `estimate_minutes: 240`
- WHEN its bead page is shown
- THEN it shows "Estimate 0.5d"

## MODIFIED

### REQ-BEADS-001: Bead list
<!-- base: dc0f6cd99e1fa8db8fdf1506ec2e44ba1dbaffc6c8d21c4cc8ac7d3bbeb3a059 -->
WHEN a client requests `GET /api/beads?project=<name>`, the server SHALL return the beads of that configured project, each with `id`, `title`, `status`, `priority`, `issue_type`, `labels`, `owner`, `assignee`, `parent`, `created_at`, `updated_at`, `dependency_count`, `dependent_count`, `comment_count`, `milestone` (the id of the nearest bead of type `milestone` among the bead and its ancestors, found over every bead of the export whether closed or not, or `null`), `kind` (for an epic, `technical` or `parity` from its `kind:` label, else `capability`; `null` for any other type), `capabilities` (the names on the `Capabilities:` line of the bead's description, split by commas, without a trailing `(new)`, together with the lower-cased `<CAP>` of each `req:REQ-<CAP>-<NNN>` label of the bead and, for an epic, of its children, sorted and without duplicates) `complexity` (`low`, `medium` or `high` from a `Complexity:` line of the bead's description, or `null`) and `estimate_minutes` (the bead's `estimated_minutes` when above 0, or `null`), and without the description, SHALL leave out closed beads unless the request has `closed=1`, and SHALL respond 404 when the project is not configured or its directory does not exist.

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

#### Scenario: Kind, capabilities and estimate
- GIVEN epic `e-1` labelled `kind:technical` with the description lines `Capabilities: beads, ui (new)` and `Complexity: medium (two views)` and `estimated_minutes: 960`, and its track `t-1` labelled `req:REQ-MILESTONE-UI-019`
- WHEN a client requests `GET /api/beads?project=p`
- THEN `e-1` has `kind: "technical"`, `capabilities: ["beads", "milestone-ui", "ui"]`, `complexity: "medium"` and `estimate_minutes: 960`, and `t-1` has `kind: null` and `capabilities: ["milestone-ui"]`

#### Scenario: Defaults
- GIVEN epic `e-2` without a `kind:` label, a `Capabilities:` line or `req:` labels
- WHEN a client requests the beads
- THEN `e-2` has `kind: "capability"`, `capabilities: []`, `complexity: null` and `estimate_minutes: null`

## REMOVED
