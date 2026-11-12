# Design: Team tab

Epic: gin-console-slc

## Architecture

The change stays inside the `reports` bounded context (ADR 0001), plus the Reports page shell.

Backend (`backend/src/gin_console/reports/`):
- `source.py`: `read_beads` also carries each bead's `priority`, and for milestone beads the `metadata.start`, `end` and `kickoff` strings. It reads only `.beads/issues.jsonl` through the existing `SnapshotStore`, so it still starts no process.
- `team.py` (new): pure functions from `list[ReportBead]`, the milestone id and `today` to the `TeamReport` model. They cover:
  - milestone listing, status and default choice (REQ-REPORTS-008);
  - scope and bead rows (REQ-REPORTS-009);
  - KPIs (REQ-REPORTS-010);
  - closed per working day (REQ-REPORTS-011).

  It reuses `own_share`, `_Tree`, `_span`, `UNASSIGNED` and the cycle-time rule of `service.py` rather than copying them. Working days are Monday to Friday, as `_weekdays` already counts them.
- `models.py`: `TeamReport`, `TeamMilestone`, `TeamBead`, `TeamFigures` (shared by `team` and each member row) and `DayRow`. `DeliverySection` drops `wip` and `oldest`, and `WipRow` and `WipBead` go.
- `router.py`: `GET /api/reports/team` beside `GET /api/reports`. It uses its own `KeyedCache[(project, milestone), TeamReport]` with the same 60-second TTL, registered in `on_refresh`. It returns the same 404, 422 and 502 shapes. `today` is `clock()` as a local date, so tests inject it.
- `service.py`: `_delivery` stops building `wip` and `oldest` (REQ-REPORTS-004).

Frontend (`frontend/src/features/reports/`):
- `filters.ts`: adds the `team` tab first and the default. It parses `milestone`, `member` and `status` (`open`, `in_progress`, `closed`, `all`), and `reportSearch` writes them only when set.
- `teamApi.ts`: `fetchTeam({project, milestone})` with a runtime shape check, as `api.ts` does for reports.
- `team/` components:
  - `TeamSection.tsx`: filters, milestone line and layout;
  - `TeamFigures.tsx`: the figures and the status bar;
  - `ClosedPerDayChart.tsx`: a stacked column chart in HTML and CSS, as `RangeChart.tsx` is, with Today and End markers;
  - `MemberTable.tsx`;
  - `BeadTable.tsx`: status tabs, sort and "Show 15 more".

  Member filtering, the list counts and sorting run in the browser over `beads` and `members`, so a member change sends no request.
- `memberColors.ts`: a fixed color per member, assigned in `members` order from the series palette `--series-1..8`, with Unassigned on the neutral color.
- `ReportsPage.tsx`: requests the team report whenever a single project is selected, with the same keyed "late answer" guard as the report. It renders the Team panel without the period and sprint row, and computes the Team headline in `headlines.ts`.
- `DeliverySection.tsx` and `headlines.ts`: drop "Oldest in progress", "In progress by member" and "In progress now". `api.ts` drops `wip` and `oldest` from its type and shape check.

The mockup `docs/specs/reports/assets/2026-11-12/mockup/index.html` sets the layout, wording and states. Its "Mockup controls" bar and "Mockup note" box are not built.

## Data Flow

See `docs/specs/reports/diagrams/team-tab-activity.md` and the use case `docs/specs/reports/use-cases/review-team-in-milestone.md`.

1. The Reports page reads `project`, `tab`, `milestone`, `member` and `status` from the URL.
2. With a single project, it calls `GET /api/reports/team?project=P[&milestone=M]`.
3. The router reads the snapshot (cached by file change) and builds the `TeamReport`, then caches it for 60 seconds.
4. The page writes the answer's `milestone` back to the URL with `replace`, and drops `member` when it is not in `members`.
5. The Team panel derives the member view from `team` or the member's row, and the lists from `beads`.

Reopens and bugs come from `metadata.ai_usage` in the snapshot, written earlier by `gin usage collect`. No `bd history` call is made at request time.

## Error Handling

- Unknown project, or a project whose directory is missing: 404. A bad `milestone` value: 422 with an `error`. The page shows these like the report errors.
- Unreadable snapshot (REQ-BEADS-005) or a nesting `RecursionError`: 502 with an `error`, not cached. The Team panel shows the error and Retry (REQ-REPORTS-017).
- A milestone without valid `start` and `end`: left out and counted in `undated`; it does not fail the request.
- A cycle in the parent chain: `_Tree` stops on a cycle already, so such a bead is out of scope unless an epic under the milestone appears before the loop.
- A row with wrong types: left out by `read_beads`, as today.
- Division by zero (empty scope, no working days left, no collected beads): the figure is `null` and the UI shows "—".

## Testing

Backend (`uv run --directory backend pytest`). Each test names its REQ.
- `tests/test_reports_team.py`, pure `team.py` tests from built `ReportBead` lists:
  - every scenario of REQ-REPORTS-009 to REQ-REPORTS-011;
  - the status and default-milestone scenarios of REQ-REPORTS-008.
- Router tests with the existing fake snapshot fixtures:
  - REQ-REPORTS-008 default, named, unknown and undated milestone, no milestones, 404, 422 and 502;
  - the 60-second cache and the refresh drop, with no process started.
- `tests/test_reports_*`: the "no work in progress" scenario of REQ-REPORTS-004. Existing delivery tests that assert `wip` and `oldest` change.

Frontend (`pnpm -C frontend test --run`), with Vitest and Testing Library on fixtures in `reportFixtures.ts`:
- `filters.test.ts`: the `team` default, and parsing and writing `milestone`, `member` and `status`.
- `team/*.test.tsx`: the scenarios of REQ-REPORTS-012 to REQ-REPORTS-017, among them the member filter from the table, counts, sort, "Show 15 more", late answer, All projects and no milestones.
- `ReportsPage.test.tsx` and `sections.test.tsx`: the MODIFIED scenarios of REQ-UI-088, REQ-UI-090 and REQ-UI-095.

Manual (`05-tests.md` TC-1): on the Tailscale deploy, the Team tab for `qwikfone` and its milestone, in light and dark themes and at 400 px wide, against the mockup's layout. Opening the tab starts no `gin` or `bd` process.

## Open Technical Questions
