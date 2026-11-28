# Plan: Test trends

Epic: gin-console-rm-test-trends
Spec: `docs/changes/gin-console-rm-test-trends-test-trends/` (`01-proposal.md`, `02-spec-delta.md`, `03-design.md`)

## Objective

The Tests page of a project gets a Trends tab that shows, for the last 7, 30 or 90 local days, the pass rate per capability and day, the flaky cases, the median time from a failure to the next pass and the cases still failing. All of it is read from `gin-qa runs export --format json` through one new endpoint, `GET /api/qa/trends/{project}`, and worked out on the server (REQ-QA-014 to REQ-QA-019).

Goal: pass rate over runs, flaky cases and time from failure to fix.
Architecture: the `qa` context gets a second gin-qa source (`load_runs`), pure functions in `qa/trends.py` and one cached route; the frontend's `features/qa/` gets a Cases | Trends tab bar and a Trends tab that only draws the answer.
Tech Stack: FastAPI, pydantic, `zoneinfo`; React 19, Tailwind 4, recharts 3, vitest; gin-qa for cases and e2e specs.

Global Constraints (from the spec and AGENTS.md):
- Read-only: the console reads gin-qa output and never writes `qa/` files; it never reads `qa/runs` files directly.
- No test starts `gin-qa`, `gin` or `bd`; gin-qa is injected as `run_gin_qa` and faked in tests.
- Linux, macOS and native Windows keep working (`zoneinfo` needs the `tzdata` package on Windows).
- mypy is strict; every new or changed test names its REQ-ID.
- Only `passed` and `failed` runs count in REQ-QA-015 to REQ-QA-017; runs are taken in export order (`at`, then file and line).

## Route Rubric
- Choose the weakest model that can do the work.
- Raise the model for broad context or design judgement.
- Raise the effort for intrinsic difficulty: intricate logic, many edge cases, or long chains of steps.

| Kind of work | Model | Effort |
|---|---|---|
| Mechanical edits, documentation, boilerplate | weakest | `low` |
| Bounded implementation with a clear spec | middle | `medium` |
| Cross-module change, security, migration, concurrency | strongest | `high` |

Unclear requirements never raise the model or effort.

## Requirement Analysis
- Problem statement: the Tests page shows only each case's latest result; nobody can see whether results improve, which cases flip without being changed, or how long failures stay open. gin-qa now keeps every result as a run record (`gin-qa runs export`, shipped in gin-workflow-g2gx).
- Success criteria: on this host the Trends tab of gin-console for 30 days shows a line per capability from 2026-11-22, lists the cases with a flip under one `hash8`, and its counts match a script over `gin-qa runs export --format json`; `pytest`, `ruff`, `mypy`, `vitest`, `typecheck`, `lint` and `build` pass with each REQ named in a test; `gin-qa cases check --change gin-console-rm-test-trends` prints `ok`.
- Constraints: the Global Constraints above; the window is local days of the browser's IANA zone; 422 for `days` other than 7, 30, 90 or an unknown `tz`; 502 `missing`/`outdated` as REQ-QA-002; a 60 second cache per project and `--since` date.
- Non-goals: running tests or recording results; reading `qa/runs` directly; per-actor or per-run breakdowns, alerts, other windows; following renumbered case ids.

## Approach Options
### Option 1: The server works out the trends (A in the spec)
- Summary: `load_runs` reads the export with `--since`, `qa/trends.py` computes every section, one endpoint answers a small JSON.
- Pros: the rules live in pure Python functions tested with pytest; the browser downloads a few KB instead of the raw history (about 700 KB for 5 days today, growing with every run); the cache is shared by every viewer.
- Cons: the server needs the browser's time zone for the local days.

### Option 2: The server passes the raw runs, the browser computes
- Summary: an endpoint returns the export as is; TypeScript computes the sections.
- Pros: a thinner backend.
- Cons: megabytes per load at 90 days; the streak and flip rules in TypeScript, away from the other QA rules.

### Recommended Approach
- Selected option: Option 1 (confirmed in discuss, 2026-11-28).
- Rationale: small answers, every rule unit-tested next to the existing `qa` service, and the 60 second cache already built for `cases export`.

## Scope
- In scope: REQ-QA-014 to REQ-QA-019; the README "Tests" section; gin-qa cases and an e2e spec for the new REQs.
- Out of scope: everything under Non-goals; any change to the Cases tab beyond moving it under a tab.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (backend) and Track 2 (frontend) touch disjoint files and meet only at the JSON contract written in Interfaces, so they run together; Track 3 (QA cases and e2e) needs both.
```

## Tasks

### Track 1: Trends endpoint over the run history (backend)
- **Dependencies**: none
- **Requirements**: REQ-QA-014, REQ-QA-015, REQ-QA-016, REQ-QA-017
- **Files**:
  - Modify `backend/src/gin_console/qa/source.py:26-32` (`run_gin_qa` maps an argparse `invalid choice` to `outdated`), append `load_runs` after `:52`
  - Modify `backend/src/gin_console/qa/models.py` (append `ExportRun`, `RunExport`, `PassRatePoint`, `PassRateRow`, `FlakyCase`, `FixStats`, `CapabilityFix`, `TimeToFix`, `StillFailing`, `Trends`)
  - Create `backend/src/gin_console/qa/trends.py`
  - Modify `backend/src/gin_console/qa/router.py:21-25` (imports), `:49-53` (the `runs` cache and its `clear` in `on_refresh`), and add the `GET /qa/trends/{project}` route before `return router`
  - Modify `backend/pyproject.toml` (dependency `tzdata; sys_platform == "win32"`) and `backend/uv.lock` (from `uv lock`)
  - Modify `backend/tests/fake_gin_qa.py` (append `run_record`, `runs_export`, `runs_args`)
  - Modify `README.md:462-467` (section "Tests": the Trends tab reads `gin-qa runs export --format json --since <date>`, kept 60 seconds per project and start date; an older gin-qa without `runs` is reported as too old)
  - Test `backend/tests/test_qa_trends.py`
  - Test `backend/tests/test_qa_trends_api.py`
  - Test `backend/tests/test_qa_source.py` (the `invalid choice` mapping and `load_runs`)
- **Interfaces**:
  - Consumes: `run_json`, `CollectError` (`projects/collect.py:17-23`, `.returncode`, `.stderr`), `GinQaRunner`, `QaError`, `Cause` (`qa/source.py:14-23`, `qa/models.py:8`), `KeyedCache` (`beads/service.py:8-51`), `project_entry` and `failure` inside `build_router` (`qa/router.py:56-91`), the injected `clock` (`app.py:91`, `clock.utc_now`), `FakeGinQa` (`tests/fake_gin_qa.py:40-56`).
  - Produces (`qa/source.py`):
    ```python
    def run_gin_qa(args: list[str], cwd: Path) -> Any:
        # as today, plus before the generic QaError:
        # if exc.returncode == 2 and "invalid choice" in exc.stderr:
        #     raise QaError(f"this gin-qa has no `{args[0]}` command", "outdated") from None

    def load_runs(run: GinQaRunner, cwd: Path, since: date) -> RunExport:
        # run(["runs", "export", "--format", "json", "--since", since.isoformat()], cwd)
        # not a dict with a list "runs" -> QaError("this gin-qa has no run history", "outdated")
        # a "problems" value that is not a list of str is read as []
        # each row validated alone: a row that is not a dict, without a str "case", or whose "at"
        # does not parse as an aware datetime is skipped and adds f"run {n}: {reason}" (n from 1)
        # to problems; returns RunExport(runs=[...in export order...], problems=[...])
    ```
  - Produces (`qa/models.py`, pydantic, `extra="ignore"` as the existing export models):
    ```python
    class ExportRun(BaseModel):
        case: str; capability: str = ""; hash8: str = ""; result: str; at: datetime; bug: str = ""
    class RunExport(BaseModel): runs: list[ExportRun]; problems: list[str] = []

    class PassRatePoint(BaseModel): date: date; passed: int; failed: int; rate: float | None
    class PassRateRow(BaseModel): name: str; points: list[PassRatePoint]
    class FlakyCase(BaseModel):
        case: str; capability: str; flips: int; last_result: str; last_at: datetime
    class FixStats(BaseModel): fixes: int; median_seconds: float | None
    class CapabilityFix(FixStats): name: str
    class TimeToFix(BaseModel): overall: FixStats; by_capability: list[CapabilityFix]
    class StillFailing(BaseModel):
        case: str; capability: str; failing_since: datetime; bug: str | None
    class Trends(BaseModel):
        days: list[date]; tz: str
        pass_rate: list[PassRateRow]; flaky: list[FlakyCase]
        time_to_fix: TimeToFix; still_failing: list[StillFailing]; problems: list[str]
    ```
    `datetime` values serialize as `YYYY-MM-DDTHH:MM:SSZ` (UTC); dates as `YYYY-MM-DD`.
  - Produces (`qa/trends.py`, no I/O):
    ```python
    WINDOWS = (7, 30, 90)
    COUNTED = ("passed", "failed")

    @dataclass(frozen=True)
    class Window:
        days: list[date]   # local dates, oldest first, the last is today in tz
        start: datetime    # 00:00 of days[0] in tz, as an aware datetime
        since: date        # start.astimezone(UTC).date(), the --since value

    def window(days: int, tz: ZoneInfo, now: datetime) -> Window
    def in_window(runs: Sequence[ExportRun], win: Window, capability: str | None) -> list[ExportRun]
        # at >= win.start, result in COUNTED, capability matched when given; export order kept
    def pass_rate(runs: Sequence[ExportRun], win: Window, tz: ZoneInfo) -> list[PassRateRow]
        # REQ-QA-015: rows sorted by name, one point per win.days, rate round(p / (p + f), 3) or None
    def flaky(runs: Sequence[ExportRun]) -> list[FlakyCase]
        # REQ-QA-016: per case, per hash8, flips = changes between consecutive results;
        # listed when the summed flips > 0; capability, last_result, last_at of the case's last run;
        # sorted by (-flips, case)
    def time_to_fix(runs: Sequence[ExportRun]) -> tuple[TimeToFix, list[StillFailing]]
        # REQ-QA-017: a streak opens at a failed run with none open, closes at the next passed run of
        # that case whatever its hash8; durations in seconds; statistics.median or None; the case's
        # capability is that of the streak's first run; still failing sorted by (failing_since, case);
        # bug = last non-empty bug of the open streak's runs, else None
    def build_trends(export: RunExport, win: Window, tz: ZoneInfo, capability: str | None) -> Trends
    ```
  - Produces (`qa/router.py`): `runs = KeyedCache[tuple[str, date], RunExport](TTL, clock)` added to `on_refresh`; route
    ```python
    @router.get("/qa/trends/{project}", response_model=Trends)
    def get_trends(request: Request, project: str, days: int = 30, tz: str = "UTC",
                   capability: str | None = None) -> Trends | JSONResponse:
        entry = project_entry(request, project)          # 404 first (REQ-AUTH-007)
        if days not in WINDOWS: raise HTTPException(422, "days must be 7, 30 or 90")
        try: zone = ZoneInfo(tz)
        except (ZoneInfoNotFoundError, ValueError): raise HTTPException(422, "unknown time zone")
        win = window(days, zone, clock())
        try: export = runs.get((entry.name, win.since), lambda: load_runs(run_gin_qa, entry.path, win.since))
        except QaError as exc: return failure(exc)
        return build_trends(export, win, zone, capability or None)
    ```
  - Produces (`tests/fake_gin_qa.py`): `run_record(case: str = "TC-UI-001", result: str = "passed", at: str = "2026-11-26T10:00:00Z", **fields) -> dict[str, Any]` (every key of the real export: `actor` `claude`, `bug` `""`, `capability` `ui`, `evidence` `[]`, `hash8` `aaaa1111`, `run` `""`); `runs_export(*records, problems: Sequence[str] = ()) -> dict[str, Any]`; `runs_args(since: str) -> tuple[str, ...]` = `("runs", "export", "--format", "json", "--since", since)`.
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `high`
- **Why:** bounded to the existing `qa` context with every rule and scenario written in the spec, but the logic has many edge cases (local-day edges across time zones, runs sharing an `at`, flips per `hash8`, open and closed streaks, even and odd medians), so the effort is raised, not the model.
- **Steps**:
  1. `test_qa_source.py`: a runner raising `CollectError("gin-qa exited 2: ...", 2, "usage: gin-qa ...\ngin-qa: error: argument command: invalid choice: 'runs'")` through the real `run_gin_qa` (patch `run_json`) gives `QaError` cause `outdated`; exit 2 without `invalid choice` keeps cause `None`; `load_runs` keeps runs in order, ignores unknown keys, turns a row without `case` and one with `at` `"yesterday"` into `run 2: ...` problems, keeps the export's own problems first, and `{"cases": []}` gives `outdated` (REQ-QA-014). Run `uv --directory backend run pytest tests/test_qa_source.py`; expect failures. Write the models and `load_runs`; run again; expect pass.
  2. `test_qa_trends.py`, one test per scenario of REQ-QA-014 (window), REQ-QA-015, REQ-QA-016, REQ-QA-017 with the spec's exact data, plus: `window(30, ZoneInfo("UTC"), ...)` has 30 days ending today; a run at the window start counts and one a second earlier does not; `blocked` and `not run` never count; two runs with the same `at` keep export order (failed then passed is one flip); an odd number of fixes gives the middle value; `capability="ui"` drops other capabilities from every section; empty runs give empty lists and `FixStats(fixes=0, median_seconds=None)`. Run; expect failures. Write `trends.py`; run; expect pass.
  3. `test_qa_trends_api.py` through `create_app(settings, static_dir=..., run_gin_qa=FakeGinQa(...), clock=lambda: datetime(2026, 11, 28, 5, tzinfo=UTC))` as `tests/test_qa_api.py` builds it: the 200 shape for `days=7&tz=Asia/Ho_Chi_Minh` with `fake.calls[0][0] == list(runs_args("2026-11-21"))`; 422 for `days=14` and `tz=Mars/Base` with `fake.calls == []`; 404 for an unknown project and a project hidden by auth with `fake.calls == []`; `missing` (a runner raising `QaError(..., "missing")`); `outdated`; a timeout message with cause `null`; problems kept; the cache: a second request with `capability=ui` within 60 seconds makes no call, `POST /api/refresh` then a request makes one, a failure is not kept. Run; expect failures. Add the route and cache; run; expect pass.
  4. Add `tzdata; sys_platform == "win32"` to `backend/pyproject.toml` dependencies, run `uv --directory backend lock`; update the README paragraph.
  5. Run `uv --directory backend run pytest`, `uv --directory backend run ruff check .`, `uv --directory backend run mypy`; commit `feat(qa): trends endpoint over gin-qa run history (gin-console-rm-test-trends)`.
- **Acceptance criteria**:
  - Every scenario of REQ-QA-014 to REQ-QA-017 has a test naming the REQ-ID; the existing qa tests pass unchanged.
  - No test starts `gin-qa`.
  - `pytest`, `ruff check .` and `mypy` pass.
- **Estimated complexity**: medium

### Track 2: Trends tab on the Tests page (frontend)
- **Dependencies**: none (builds against the JSON contract of Track 1's `Trends`)
- **Requirements**: REQ-QA-018, REQ-QA-019
- **Files**:
  - Modify `frontend/src/features/qa/TestsPage.tsx:52-62` (`TestsView` renders `Tabs` and a `tabpanel`; Cases holds today's content; Trends renders `TrendsTab`)
  - Modify `frontend/src/features/qa/filters.ts:3-25` (`tab` and `days` read and written; `caseFiltersToSearch` keeps them)
  - Modify `frontend/src/features/qa/api.ts:5-20` (types), `:100-131` (guard `isTrends`, `fetchTrends`)
  - Modify `frontend/src/features/qa/fixtures.ts` (a `trends` fixture with the spec's data)
  - Create `frontend/src/features/qa/TrendsTab.tsx`
  - Create `frontend/src/features/qa/PassRateChart.tsx`
  - Create `frontend/src/features/qa/FlakyList.tsx`
  - Create `frontend/src/features/qa/TimeToFix.tsx`
  - Create `frontend/src/features/qa/duration.ts`
  - Test `frontend/src/features/qa/TestsPage.test.tsx`
  - Test `frontend/src/features/qa/TrendsTab.test.tsx`
  - Test `frontend/src/features/qa/duration.test.ts`
  - Test `frontend/src/features/qa/filters.test.ts`
- **Interfaces**:
  - Consumes: `Tabs` (`components/Tabs.tsx`, ids `tab-<value>` / `panel-<value>`), `ChartBox`, `legendText` (`features/reports/ChartBox.tsx:5-13`), the `tick` and `tooltipStyle` constants of `features/reports/velocity/VelocityCharts.tsx` (export them if they are not exported), `QaError`, `QaFailure`, `useFetched`, `caseHref` (`features/qa/api.ts:46-158`), `navigate`, `useLocation` (`app/route`), the `/beads/<project>/<id>` link of `CaseList.tsx`.
  - Produces (`api.ts`):
    ```ts
    export type PassRatePoint = { date: string; passed: number; failed: number; rate: number | null };
    export type PassRateRow = { name: string; points: PassRatePoint[] };
    export type FlakyCase = { case: string; capability: string; flips: number; last_result: string; last_at: string };
    export type FixStats = { fixes: number; median_seconds: number | null };
    export type StillFailing = { case: string; capability: string; failing_since: string; bug: string | null };
    export type Trends = { days: string[]; tz: string; pass_rate: PassRateRow[]; flaky: FlakyCase[]; time_to_fix: { overall: FixStats; by_capability: (FixStats & { name: string })[] }; still_failing: StillFailing[]; problems: string[] };
    export const TREND_WINDOWS = [7, 30, 90] as const;
    export type TrendWindow = (typeof TREND_WINDOWS)[number];
    export const fetchTrends = (project: string, days: TrendWindow, tz: string, capability: string | null) =>
      get(`/api/qa/trends/${enc(project)}?${new URLSearchParams({ days: String(days), tz, ...(capability ? { capability } : {}) })}`, isTrends);
    export const browserZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    ```
  - Produces (`filters.ts`): `CaseFilters` gains `tab: "cases" | "trends"` (default `cases`) and `days: TrendWindow` (default 30); `parseCaseFilters` reads `tab` and `days` (unknown values give the defaults); `caseFiltersToSearch` writes `tab=trends` only for Trends and `days` only when not 30, so today's Cases URLs are unchanged.
  - Produces (`duration.ts`): `formatDuration(seconds: number): string` — below 60 gives `"< 1 min"`; else the two largest non-zero units of `d`, `h`, `min` (`6300` → `"1 h 45 min"`, `90000` → `"1 d 1 h"`, `120` → `"2 min"`); `sinceText(from: string, now: Date): string` = `formatDuration` of the difference.
  - Produces (components): `TrendsTab({ project, filters, onChange })` (fetches with `useFetched` keyed on project, days and capability; window as a 3-button group with `aria-pressed`; capability `<select>` from `pass_rate` names plus the current one; loading text "Loading trends…"; `QaError` on failure; the REQ-QA-019 empty text; the problems note); `PassRateChart({ rows, days })` (recharts `LineChart` in `ChartBox height={240}`, one `Line` per row with `connectNulls={false}`, Y axis 0–100 %, colours `var(--series-<i+1>)` by the row's index in the sorted names, wrapped in `<div role="img" aria-label="Pass rate per day by capability, <first day> to <last day>">`); `FlakyList({ project, rows })` (a table inside `overflow-x-auto`: Case (link `caseHref`), Capability, Flips, Last result, Last run); `TimeToFix({ project, data })` (overall median and fixes, a per-capability table, then "Still failing" rows with Case link, Capability, Failing for `sinceText`, Bug link `/beads/<project>/<bug>` or "—").
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** bounded UI in existing patterns (the milestone page's `Tabs`, the Reports charts, the Tests page's URL filters) with every text, link and URL key written in the spec.
- **Steps**:
  1. `duration.test.ts` and `filters.test.ts` (REQ-QA-018: defaults, `tab=trends`, `days=7`, unknown `days=14` gives 30, Cases URLs unchanged). Run `pnpm -C frontend test --run src/features/qa/duration.test.ts src/features/qa/filters.test.ts`; expect failures. Write `duration.ts` and the filter changes; run; expect pass.
  2. `TestsPage.test.tsx`: tabs Cases and Trends, Cases selected by default with the existing content, `?tab=trends` selects Trends and does not fetch the cases list for the panel (REQ-QA-018); the existing tests pass unchanged.
  3. `TrendsTab.test.tsx`, mocking `fetch` as `TestsPage.test.tsx` does: both scenarios of REQ-QA-018 (30 days pressed, the request URL holds `days=30&tz=`, the chart's `aria-label`, `TC-UI-001` linking to `/tests/alpha/TC-UI-001`, "1 h 45 min", `TC-BEADS-001`'s bug linking to `/beads/alpha/gin-console-3kd`; picking 7 days and `ui` gives `tab=trends&days=7&capability=ui` in the URL and the request); both scenarios of REQ-QA-019 (no runs text without a chart; `outdated` text on Trends while the Cases tab still lists cases); "No fix yet" when `fixes` is 0; the problems note "2 lines of the run history could not be read"; no sideways scroll at 390px as `TestsPage.test.tsx` checks it. Run; expect failures. Write the components; run; expect pass.
  4. Run `pnpm -C frontend test --run src/features/qa`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, `pnpm -C frontend build`; commit `feat(qa): Trends tab on the Tests page (gin-console-rm-test-trends)`.
- **Acceptance criteria**:
  - Every scenario of REQ-QA-018 and REQ-QA-019 has a test naming the REQ-ID; existing `features/qa` tests pass unchanged.
  - `typecheck`, `lint`, `build` and the qa vitest files pass.
- **Estimated complexity**: medium

### Track 3: QA cases and e2e spec for Test trends
- **Dependencies**: Track 1, Track 2
- **Requirements**: REQ-QA-014, REQ-QA-015, REQ-QA-016, REQ-QA-017, REQ-QA-018, REQ-QA-019
- **Files**:
  - Create `qa/cases/qa/TC-QA-041-*.api.md` to the last new number (api cases for REQ-QA-014 to REQ-QA-017: window and since, 422s, outdated, cache, pass rate, flaky, time to fix)
  - Create `qa/cases/qa/TC-QA-*-*.e2e.md` (e2e cases for REQ-QA-018 and REQ-QA-019: open the tab, change the window, no runs, old gin-qa on Trends only)
  - Create `qa/e2e/qa/tc-qa-*.spec.ts` (one spec per e2e case, built with the `gin-qa:e2e` skill)
  - Modify `docs/changes/gin-console-rm-test-trends-test-trends/05-tests.md` (manual check row)
- **Interfaces**:
  - Consumes: the endpoint of Track 1 and the tab of Track 2; the existing qa cases `qa/cases/qa/TC-QA-001` to `TC-QA-040` and the e2e helpers of `qa/e2e/`; `gin-qa cases next-id qa` for numbers.
  - Produces: cases traced to REQ-QA-014 to REQ-QA-019 that `gin-qa cases check --change gin-console-rm-test-trends` accepts; passing e2e specs.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** QA work in the project's existing gin-qa conventions (the `qa-track` skill), bounded by six REQs with written scenarios.
- **Steps**:
  1. Follow the `qa-track` and `gin-console-qa` skills: write the cases with `/gin-qa:cases` from `02-spec-delta.md`; run `gin-qa cases check --change gin-console-rm-test-trends`; expect `ok`.
  2. Build the e2e specs with `/gin-qa:e2e` against the running app (`uv run --directory backend -m gin_console` after `pnpm -C frontend build`); run them; expect each to pass.
  3. Manual check on this host: open `/tests?project=gin-console&tab=trends`, compare the 30-day counts with a script over `gin-qa runs export --format json`; record the result in `05-tests.md`.
  4. Commit `test(qa): cases and e2e for Test trends (gin-console-rm-test-trends)`.
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-rm-test-trends` prints `ok`; every new REQ has at least one case.
  - The new e2e specs pass on Chromium; the manual check is recorded.
- **Estimated complexity**: medium

## Integration
- **Branch**: `feat/test-trends`
- **Merge strategy**: parallel-then-merge (Tracks 1 and 2 in their own worktrees, merged into `feat/test-trends`, then Track 3 on the merged branch)

## Validation
- [ ] `uv --directory backend run pytest`, `ruff check .`, `mypy` pass
- [ ] `pnpm -C frontend test --run`, `typecheck`, `lint`, `build` pass
- [ ] `gin specs lint --change gin-console-rm-test-trends --against master` exits 0 and `gin specs trace --change gin-console-rm-test-trends` has no missing REQ
- [ ] Manual: the Trends tab of gin-console on this host matches the live run history for 30 days

## Notes
- The user may override `Model:` and `Effort:` before plan approval.
- Provider roles describe responsibility rather than filename patterns.
- The Parent Bead `gin-console-rm-test-trends` stays open until the human-confirmed merge; track beads close after tests and review pass.
- `run_gin_qa` keeps its signature, so `app.py` needs no change; the `outdated` mapping of an argparse `invalid choice` also covers an old gin-qa without `cases export`, which today reads as a generic error.
