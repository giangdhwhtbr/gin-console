# Design: Reports status and one scope

Epic: gin-console-rm-reports-status

## Architecture

The work stays inside the `reports` context (ADR 0001), plus one field in `milestones` and the shell's navigation. The Reports backend reads only the snapshot and the interaction log, and never runs `gin`. The frontend joins the status report with the Milestones list and the milestone detail, which the console already serves and caches.

- **Milestone history:** `backend/src/gin_console/reports/history.py` (new) is the one module that reads `metadata.milestone_moves` and `metadata.points_history` (REQ-REPORTS-021).
  - `parse_moves(raw)` and `parse_points(raw)` accept the JSON text or list that gin-workflow writes. They return dated entries, and an empty list for anything else.
  - `milestone_on(epic, day)` and `points_on(epic, day)` apply the rules of REQ-REPORTS-021. Points go through `beads/kinds.py` `points_of` for the scale check.
- **Reports source:** `reports/source.py` `read_beads` adds to `ReportBead`:
  - the parsed `moves` and `points_history`;
  - `blockers`, the open beads it waits on through `blocks` dependencies, and `blocked_since`, the earliest `created_at` of those dependencies;
  - for milestone rows, `kickoff` and `planned_days_per_point`.
- **Interaction log:** `reports/interactions.py` keeps the reopen date of each reopen (`dict[str, list[date]]`). The count stays `len(...)`, so REQ-REPORTS-019 does not change. Bugs found later carry their `created_at` for the week-ago rework rate.
- **Status report:** `reports/status.py` (new) has `build_status(beads, milestone, today, reopens) -> StatusReport`. It reuses:
  - `team.py`'s scope, milestone selection and working-day helpers, moved to a shared `reports/scope.py` where both need them;
  - `beads/definitions.py` `is_blocked`, `child_counts` and `person_key`.
  
  It holds one function per part: `burnup` (REQ-REPORTS-022), `kpis` (REQ-REPORTS-023), `changes` (REQ-REPORTS-024), `risks` (REQ-REPORTS-025) and `epic_rows` (REQ-REPORTS-026).
- **Points and accuracy:** `reports/points.py` (new) has:
  - `shares(epic, tracks)`;
  - `points_delivered(epics, person)`;
  - `accuracy(epics, planned, person)`, which rounds as gin-workflow's `velocity` (`milestone.py` `velocity`, `actual_days`).
  
  `team.py` adds `points_delivered` and `accuracy` to `TeamFigures`, `trend` (one team figure set per milestone of the last 6 started) and `unassigned` (REQ-REPORTS-034, REQ-REPORTS-035).
- **One scope in the API:** `reports/router.py` has one dependency, `report_scope(milestone, days)`, which returns `Milestone(id) | Period(days)` or answers 422. It serves three routes:
  - `GET /api/reports`, which replaces `sprint`;
  - `GET /api/reports/team`, which adds `days`;
  - `GET /api/reports/status`, which is new.
  
  Each route keeps its own `KeyedCache` (60 s), keyed by `(project, scope)` and cleared by `on_refresh`. `service.build_report` selects the closed beads of the milestone's scope instead of the sprint's.
- **Models:** `reports/models.py`:
  - adds `StatusReport`, `StatusPeriod`, `StatusKpis` (`beads`, `points`, `pace`, `blocked`, `rework`), `BurnupDay`, `ScopeChange`, `Changes`, `BlockedRisk`, `Risks`, `StatusEpic`, `TrendRow` and `Unassigned`;
  - in `Report`, replaces `sprint` with `milestone`;
  - in `TeamReport`, adds `period_days`, `trend` and `unassigned`; its `days` stays the working-day rows of REQ-REPORTS-011.
  
  `milestones/models.py` `Forecast` adds `epics: list[ForecastEpic] = []`, with `ForecastEpic` holding `id`, `milestone`, `planned_start`, `planned_end` and `estimate_source` (REQ-MILESTONE-UI-008).
- **Routes and navigation (frontend):**
  - `app/App.tsx` serves `ReportsPage` for every path under `/reports`.
  - `features/reports/sections.ts` (new) holds:
    - `SECTIONS` (status, team, delivery, velocity, rework);
    - `sectionOf(pathname)`;
    - `legacyTarget(url)`, which handles `/reports`, `?tab=`, `quality`→`rework` and the retired tabs.
    
    Unknown sections go to `NotFoundPage`.
  - `app/Layout.tsx`:
    - the Reports item is `current` on `/reports/*`;
    - sub-items show on any Reports path;
    - `sectionStore` hrefs become paths.
    
    `app/origin.ts` and `app/project.ts` treat every `/reports/*` path as the Reports page, keeping the path on a project switch.
  - `TabStrip` becomes a row of links (`aria-current="page"`) that keeps its scroll and fade behaviour.
- **One scope (frontend):**
  - `features/reports/filters.ts` reads and writes `milestone | days`, applies the URL rules of REQ-REPORTS-033 with `replace`, and drops `sprint`.
  - `ScopeSelect.tsx` (new) replaces the Team milestone select and the Delivery/Quality period buttons and sprint field. It lists the team report's `milestones`.
  - The page requests the team report, the status report and the Milestones list whatever the section (REQ-UI-095).
- **Status section (frontend):** `features/reports/status/` (new):
  - `statusApi.ts`: the request and its validator;
  - `verdict.ts`: `paceFinish`, `statusVerdict` and `verdictSentence` (REQ-REPORTS-027). It reuses `features/milestones/late.ts` `lateOf` and the working-day helpers of `features/reports/team/format.ts`;
  - `StatusSection.tsx`, which fetches the milestone detail through the existing `features/milestones` API client;
  - `VerdictPanel.tsx` (`StateGlyph`);
  - `StatusFigures.tsx` (uses `Figures`);
  - `BurnupChart.tsx` (Recharts `ComposedChart` with `ReferenceLine` and `ReferenceArea` in `ChartBox`);
  - `ChangesPanel.tsx`;
  - `RisksPanel.tsx`;
  - `EpicTable.tsx`, with `Strand`, plus `features/milestones/gantt.ts` `verdictOf` and `Verdict.tsx` for the epic verdict.
- **Team and the other sections:**
  - `team/TeamFigures.tsx` and `team/MemberTable.tsx` add points and accuracy.
  - `team/UnassignedNote.tsx` and `team/AcrossMilestones.tsx` are new.
  - `velocity/VelocityTab.tsx` marks the selected milestone.
  - `QualitySection.tsx` is renamed `ReworkSection.tsx`, and its empty text becomes "No data in this scope".
  - `headlines.ts` adds the Status headline and the period Team headline.
- **Example data:** `scripts/make_example_project.py` gives the active milestone:
  - a kickoff;
  - `milestone_moves` with an epic moved in after kickoff and one moved out;
  - a `points_history` with a re-estimate and a late first estimate;
  - a bug created after kickoff;
  - a blocked chain;
  - closed beads without an assignee;
  - three earlier closed milestones with `planned_days_per_point` for the trend.

## Data Flow

- `docs/specs/reports/diagrams/status-section-activity.md`: from opening Reports to the Status section, with the period, no-milestone, failure and partial-failure paths. Use case: `docs/specs/reports/use-cases/review-milestone-status.md`.
- `docs/specs/reports/diagrams/status-verdict-state.md`: the verdicts of REQ-REPORTS-027 and what moves a milestone between them.
- `docs/specs/reports/diagrams/team-tab-activity.md` (updated): the Team section with the shared scope, the period, the unassigned note and Across milestones. Use case: `docs/specs/reports/use-cases/review-team-in-milestone.md` (updated).
- `GET /api/reports/status` → `SnapshotStore.get(project)` + `InteractionStore.reopens(project)` → `read_beads` (with history, blockers and milestone metadata) → `build_status` → JSON, cached for 60 s.
- Status page: status report ∥ `GET /api/milestones/{project}/{id}` (cached 5 s by REQ-MILESTONE-UI-008) ∥ the Milestones list already loaded by the page → `statusVerdict` and `EpicTable` join them by epic id.

## Error Handling

- **Bad scope:** both `milestone` and `days`, a `days` other than 7, 30 or 90, or a `milestone` with other characters answer 422 before the snapshot is read. `/api/reports` answers 404 for a milestone that is not listed. Status and Team fall back to the default milestone (REQ-REPORTS-008), and the page writes it back into the URL.
- **Bad history metadata:** it is ignored per entry (REQ-REPORTS-021) and never fails a report. The epic is then treated as having no history.
- **Snapshot failure:** 502 with `error`, not cached (REQ-REPORTS-007, REQ-REPORTS-020).
- **Milestone detail or Milestones list failure** (`gin` missing, outdated or slow): the Status section still shows everything from the status report. Planned, Forecast and the epic verdicts read "—", the verdict follows the late rule without the forecast, and the spec risk line is left out (REQ-REPORTS-032).
- **Late answers:** each request is keyed by project and scope, and an answer for a scope that is no longer selected is dropped (REQ-UI-093).
- **Old links:** `?tab=`, `/reports` and `sprint` are rewritten with `replace`, so the back button does not loop.

## Testing

- **Backend (pytest), each test naming its REQ:**
  - `test_reports_history.py`: REQ-REPORTS-021. It covers membership with moves in, moves out, no moves and a first move from another milestone; points with re-estimates, a late first estimate and no history; broken JSON and broken entries.
  - `test_reports_status.py`:
    - REQ-REPORTS-022: a split keeps the scope, half the tracks closed, a closed epic, a re-estimate step, a closed milestone ending at `closed_on`, before the first day;
    - REQ-REPORTS-023: week-ago values, the oldest wait from dependency dates and from `updated_at`, the rework rate a week ago with dated reopens, `null` before a week;
    - REQ-REPORTS-024, REQ-REPORTS-025, REQ-REPORTS-026;
    - REQ-REPORTS-023 for a period.
  - `test_reports_points.py`: REQ-REPORTS-034, with shares by closed tracks, an epic without tracks, accuracy against gin-workflow's `velocity` on the same fixture (the numbers copied from gin-workflow's `test_milestone.py` velocity case) and `null` cases.
  - `test_reports_team.py`: REQ-REPORTS-009 period scope, REQ-REPORTS-010 period values, REQ-REPORTS-035 trend and unassigned.
  - `test_reports_api.py`:
    - REQ-REPORTS-001 milestone scope and bad input;
    - REQ-REPORTS-008 `days`;
    - REQ-REPORTS-020: no process, cache, bad input and 502.
  - `test_milestones_*`: REQ-MILESTONE-UI-008 `forecast.epics`, and old output without it.
- **Frontend (vitest):**
  - `sections.test.ts`: paths, `?tab=` and `/reports` rewrites, the retired tabs, unknown sections.
  - `filters.test.ts`: the scope rules of REQ-REPORTS-033.
  - `project.test.ts`: a project switch keeps the section path and `days` and drops `milestone`.
  - `Layout` tests: the Reports item is current on `/reports/*`, sub-item hrefs, tabs below 1024px.
  - `verdict.test.ts`: every verdict and sentence of REQ-REPORTS-027, including a forecast that has not loaded.
  - Status components: figures and change lines, burn-up lines and accessible name, the changes and risks texts, epic table joins and ordering, every state of REQ-REPORTS-032.
  - Team: the two new figures and columns, the unassigned note threshold, the Across milestones panel. Velocity: the selected milestone is marked. Rework: the section name and empty text.
- **QA:**
  - gin-qa cases for the added REQs and new scenarios.
  - Reworded cases for the modified REQs (`?tab=` URLs become paths, Quality becomes Rework).
  - The `qa/e2e/support/reports.ts` mocks gain the status report.
  - The full e2e suite runs.
- **TC-1:** Playwright on the Tailscale build, at 1440px and 390px:
  - the Status section of the example project's active milestone, with every panel;
  - one scope across the five sections;
  - old `?tab=` links;
  - Team KPI v2;
  - the Velocity mark;
  - no sideways page scroll.

## Risks

- **History starts late:** `milestone_moves` and `points_history` exist only for epics that gin-workflow touched since it began writing them (around 2026-11-21). Older epics count as being in their milestone with their current points since creation, so the burn-up of an older milestone shows no scope change.
- **Points lock at kickoff:** gin-workflow refuses point changes after a milestone kicks off, except at `/milestone-close`. Re-estimates after kickoff are rare, and scope changes come mostly from epics moved in.
- **Stale frontend:** the report JSON changes (`sprint` becomes `milestone`, new keys). Deploy builds the frontend and restarts the service together.
- **Two sources of planned dates:** Planned comes from `gin milestone show` and Forecast from `gin milestone list`. Both are gin-workflow schedules, so they agree on their rules, and the console only displays them.

## Open Technical Questions
