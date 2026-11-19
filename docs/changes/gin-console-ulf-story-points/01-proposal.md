# Story points and velocity KPIs

Epic: gin-console-ulf
Kind: capability
Date: 2026-11-19

## Why

gin-workflow shipped story points on 2026-11-19 (gin-workflow-y7d6, capability `story-points`; spec `gin-workflow/.planning/specs/2026-11-19-story-points-design.md`, R3 and R5). A roadmap epic now carries `points` (1, 2, 3, 5, 8, 13 or 21) and `points_reason` in its bead metadata instead of `estimated_minutes`, and `gin milestone list/show --json` adds, without changing `schema: 1`:
- per epic row (show): `points`, `points_reason`, `estimate_source` (`points`, `days` or `assumed`), `actual_days`, `actual_days_per_point`; `estimate_days` holds `ceil(points × days_per_point)` for an epic with points;
- top level (show and list): `days_per_point` `{value, measured_epics, assumed}`;
- per milestone (show, and list `--all`): `velocity` `{committed_points, completed_points, added_points, say_do, days_per_point, planned_days_per_point, accuracy}`, the committed and planned values being a snapshot taken at kick-start and `null` before it.

gin-console drops all of these keys (pydantic ignores them), shows no points anywhere, and its Delivery estimate table leaves out every epic with points, since those have no `estimated_minutes`. The installed gin on this host already prints the new keys.

Comments considered: 1, latest 2026-11-19T12:44:37Z (the `[gin ship]` note that the capability shipped and the JSON matches the contract in the bead's description).

## What Changes

- The Milestones API passes `days_per_point`, `velocity` and the epic points keys through, `null` when an older gin lacks them.
- Milestones list: a Say/do column. Forecast card: days per point. Milestone page: a velocity line (committed, completed, added, say/do, days per point, planned, accuracy). Gantt: "5 pt · 5d".
- Beads: the bead list carries `points` and `points_reason` from the bead metadata; the List row shows "<complexity> · 5 pt" and the bead page "Points 5" with the reason.
- Reports: a Velocity tab (committed vs completed per milestone, days per point per milestone, accuracy) fed by the Milestones API; the Delivery estimate table keeps epics with points, showing "5 pt" and the actual working days per point.
- The example project gets epics with points and a closed milestone kicked off with a commitment, so every KPI has values.

## User Stories

### US-1: See how big each epic is
As a team member, I want to see an epic's story points next to its days wherever the console shows an estimate, so that a scored epic no longer reads as unestimated.
REQ: REQ-BEADS-001, REQ-UI-109, REQ-MILESTONE-UI-008, REQ-MILESTONE-UI-013

Acceptance criteria:
- An epic with `points: 5` and `estimate_days: 5` reads "5 pt · 5d" on the Gantt.
- Its List row reads "medium · 5 pt" and its bead page "Points 5" with its reason.
- An epic with a day estimate and no points reads as before.
- Output from a gin without the new keys still loads, without points.

### US-2: Know whether the team does what it commits to
As a team lead, I want each kicked-off milestone's committed and completed points and say/do, so that I can see whether commitments hold.
REQ: REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-021, REQ-MILESTONE-UI-008

Acceptance criteria:
- The Milestones list shows "Say/do 62%" for a milestone with `say_do: 0.62` and "–" before kick-start.
- The milestone page shows "Committed 13 pt · Completed 8 pt · Added 3 pt · Say/do 62%".
- A milestone not kicked off shows "Not kicked off" in place of the commitment.

### US-3: See the team's pace and estimate accuracy over time
As a team lead, I want the days per point and the estimate accuracy of every milestone side by side, so that I can tell whether the team is speeding up and whether plans are realistic.
REQ: REQ-REPORTS-018, REQ-UI-095, REQ-MILESTONE-UI-016, REQ-MILESTONE-UI-021

Acceptance criteria:
- Reports › Velocity shows committed vs completed points per milestone, days per point per milestone with the planned value, and accuracy, oldest milestone first.
- The forecast card and the Velocity tab show the current days per point, marked "assumed" when gin assumed it.
- Nothing is shown per member.

### US-4: Pointed epics count in the estimate table
As a team lead, I want closed epics scored in points to stay in the Delivery estimate table, so that the table still covers the work.
REQ: REQ-REPORTS-004, REQ-UI-090

Acceptance criteria:
- A closed epic with `points: 5` that took 7 working days shows "5 pt", "7" and "1.4 d/pt".
- An epic with `estimated_minutes` keeps its "+2 d" chip.

## Capabilities Affected

- `milestone-ui`: ADDED REQ-MILESTONE-UI-021; MODIFIED REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-008, REQ-MILESTONE-UI-013, REQ-MILESTONE-UI-016.
  - Diagram: `docs/specs/milestone-ui/diagrams/milestone-velocity-activity.md`.
- `reports`: ADDED REQ-REPORTS-018; MODIFIED REQ-REPORTS-004.
  - Diagram: `docs/specs/reports/diagrams/velocity-tab-activity.md`.
  - Use case: `docs/specs/reports/use-cases/review-velocity.md`.
- `beads`: MODIFIED REQ-BEADS-001.
- `ui`: MODIFIED REQ-UI-090, REQ-UI-095, REQ-UI-109.
- Assets: none.

## Non-goals

- Setting or changing points from the console (it stays read-only; `gin milestone points` does that).
- Any figure per member.
- Recomputing gin's `days_per_point`, commitment or accuracy in the console; the Beads pages show no days derived from points.
- The Reports backend running `gin`.
- Changing gin-workflow.

## Success Criteria

- Every scenario of the ADDED and MODIFIED requirements has an automated test that carries its REQ-ID.
- TC-1 passes on the deployed console with the example project regenerated with points, checked by Playwright with screenshots at 1440×900 and 390×844.
