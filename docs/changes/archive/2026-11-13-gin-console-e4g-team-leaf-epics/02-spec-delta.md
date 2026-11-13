# Spec Delta: Team tab counts epics not yet split into tasks

## ADDED

## MODIFIED

### REQ-REPORTS-009: Team scope and bead rows
<!-- base: 522708e2bb786ebe77c082417fe76da115ac7ba39c0b31bd31895a00c5f2a272 -->
The scope of a milestone SHALL be every bead that is not a milestone, whose chain of parents (itself included) holds an epic whose parent is the milestone, and that is either not an epic or an epic that no bead has as its parent.

Each scope bead SHALL fall in one bucket:
- `closed` for status `closed`;
- `in_progress` for status `in_progress`;
- `open` for any other status.

Its member SHALL be its `assignee`, or `Unassigned` when it has none.

The response SHALL hold `beads`, one row per scope bead, with:
- `id`, `title`, `issue_type`, `status`, `bucket`, `assignee`, `priority` and `created_at`;
- `epic`: the `id` and `title` of the nearest epic among the bead and its chain of parents;
- `started_at` and `closed_at`;
- `cycle_days`, as the cycle time of REQ-REPORTS-004, or `null`;
- `age_days`: for an in-progress bead, the days since `started_at` (else `updated_at`); otherwise `null`;
- `late_days`: for a closed bead, the working days (Monday to Friday) after the milestone's `end` up to the date of `closed_at`, 0 when it closed on or before `end`; otherwise `null`;
- `rework`: the bead's own reopens plus bugs found later (REQ-REPORTS-002), or `null` when it has no readable `ai_usage`.

#### Scenario: nested beads
- GIVEN milestone `m2` with epic `e1`, whose child `e1.1` has child `e1.1.1`, and epic `e9` under milestone `m3` with child `e9.1`
- WHEN the team report for `m2` is built
- THEN `beads` holds `e1.1` and `e1.1.1` with epic `e1`, and neither `e1` nor `e9.1`

#### Scenario: epic not yet split into tasks
- GIVEN milestone `m2` with epics `e2`, `e3` and `e4` without child beads, all assigned to `ann`, and epic `e5` whose only child, a closed task, is assigned to `ann`
- WHEN the team report for `m2` is built
- THEN `beads` holds `e2`, `e3`, `e4` and the task, each of `e2`, `e3` and `e4` with itself as its epic, `e5` is not in `beads`, and `ann`'s row has scope 4 and closed 1

#### Scenario: nested epic without children
- GIVEN milestone `m2` with epic `e1` whose only child is epic `e1.1` without child beads
- WHEN the team report for `m2` is built
- THEN `beads` holds `e1.1` with itself as its epic, and not `e1`

#### Scenario: buckets and members
- GIVEN scope beads with status `blocked` and no assignee, `deferred` assigned to `ann`, and `in_progress` assigned to `bao`
- WHEN the team report is built
- THEN their buckets are `open`, `open` and `in_progress`, and their members are `Unassigned`, `ann` and `bao`

#### Scenario: late close
- GIVEN milestone `m2` ending on Friday 2026-11-27 and a scope bead closed on Tuesday 2026-12-01
- WHEN the team report is built
- THEN its `late_days` is 2

## REMOVED
