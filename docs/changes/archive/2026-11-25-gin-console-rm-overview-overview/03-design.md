# Design: Overview for leads

Epic: gin-console-rm-overview

## Architecture

- **Backend `gin_console/overview/`** (`models.py`, `service.py`, `router.py`), following ADR 0001: `GET /api/overview` reads each project's snapshot through the shared `SnapshotStore` and builds `ReportBead` values with `reports/source.py` `read_beads`.
- **Shared rules:** `_blocker` and `_wait` (`reports/status.py`) and `_tracked` (`reports/scope.py`) become public in place and `overview` imports them. Reports results do not change. `current_milestone` is unchanged; the overdue-first choice lives in `overview/service.py`.
- **Config:** `OverviewSettings.aging_days` in `config.py`, `config.example.yaml` and `README.md`. Config sections forbid unknown keys, so deploy the code before adding the key.
- **Frontend `features/overview/`:** the page, its API client, the gate and waiver rules, and the bounded workflow loader (4 at a time). It reuses `statusVerdict`, `personOf`, `AssigneeName`, `StaleNote`, `Alert`, `Hint` and `useLoad`.
- **Shell:** `HomeRedirect` is replaced by the Overview page in `App.tsx`; `Layout.tsx` gains the first link; `origin.ts` gains the kind `overview`, whose place has no project and matches a bead of any project.
- **No new ADR:** no new architecture rule, and no scheduled gin run.

## Data Flow

- `docs/specs/overview/diagrams/overview-page-activity.md`: lists first, then verdicts and gates.
- `docs/specs/config/diagrams/overview-settings-activity.md`: the aging setting.

1. `GET /api/overview` gives the lists and workload.
2. Per project with a milestone: `GET /api/reports/status`, then `GET /api/milestones` for the forecast.
3. Per in-progress epic: `GET /api/beads/<project>/<epic>/workflow` (60 s server cache), 4 at a time.

Step 1 repeats every 10 s while visible. Steps 2 and 3 run on open, on Refresh, and for names not seen before.

## Error Handling

- A project's error stays with that project (REQ-OVERVIEW-001, REQ-OVERVIEW-010).
- Status, forecast and gate failures stay on their line (REQ-OVERVIEW-007, REQ-OVERVIEW-008).
- A malformed workflow answer counts as a failed request, so that it cannot blank the page.

## Testing

- **Backend (pytest):** each list with snapshot fixtures and an injected clock, milestone choice, per-project errors, no process, the config key. `test_counts_agree.py` compares the blocked count with `GET /api/projects/beads`. Reports tests keep passing without a change of their expected values.
- **Frontend (vitest):** gate and waiver rules, 4 requests at most, the verdict before and after the forecast, polling without gin, errors, grouping by person, breadcrumb and switcher. Tests that pin four links and the `/` redirect follow the new REQ text.
- **E2E (Playwright):** several projects, one unreadable project, 360px. TC-1 (`05-tests.md`) runs on the Tailscale build.

## Risks

- Opening the page can run `gin state` once per in-progress epic (14 when measured on 2026-11-24, 0.2 to 2.0 s each). The lists do not wait for it.
- "At risk" needs only one blocked bead or unestimated epic (REQ-REPORTS-027), so many projects may read "At risk".
- Days count from `started_at`, which may be older than the current spell of work.

## Open Technical Questions
