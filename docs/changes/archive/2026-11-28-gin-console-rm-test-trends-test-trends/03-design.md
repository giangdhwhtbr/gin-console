# Design: Test trends

Epic: gin-console-rm-test-trends

## Architecture

Backend, `gin_console/qa/`:
- `source.py`: `load_runs(run, cwd, since)` runs `runs export --format json --since <date>` through the injected `GinQaRunner` and validates only `at`, `case`, `capability`, `hash8`, `result` and `bug` of each run into `RunExport` (`runs`, `problems`); unknown keys are ignored. No `runs` list, or a failure whose message holds `invalid choice`, gives `QaError(cause="outdated")`; gin-qa not found gives `missing`, as `load_cases` does.
- `trends.py`: pure functions over the ordered runs and the window: `window(days, tz, today)` returns the local dates, the start instant and the `--since` date; `pass_rate`, `flaky`, `time_to_fix` (streaks, medians, still failing) as REQ-QA-015 to REQ-QA-017 say. `zoneinfo` resolves `tz`; an unknown zone raises before any read.
- `models.py`: `Trends`, `PassRateRow`, `PassRatePoint`, `FlakyCase`, `FixStats`, `TimeToFix`, `StillFailing`.
- `router.py`: `GET /api/qa/trends/{project}`. The project check (REQ-AUTH-007) and the 422 checks run before the cache. A new `KeyedCache[tuple[str, str], RunExport]` (60 s, one run at a time, failures not kept) keyed by project and `--since` date, registered in `on_refresh`; the capability filter and the window cut apply after the cache, so a filter change reads no new export.

Frontend, `features/qa/`:
- `TestsPage.tsx`: a tab bar (Cases, Trends) driven by `tab` in the URL; the Cases tab is today's content unchanged.
- `TrendsTab.tsx`: the window choice and the capability filter (`filters.ts` gains `tab` and `days`), `PassRateChart.tsx` (recharts `LineChart` in `reports/ChartBox`, colours from `reports/colors.ts`, `connectNulls` off, wrapped in `role="img"` with an `aria-label`), `FlakyList.tsx`, `TimeToFix.tsx` (medians and the still-failing list), `duration.ts` (days, hours, minutes).
- `api.ts`: `fetchTrends(project, days, tz, capability)` sending `Intl.DateTimeFormat().resolvedOptions().timeZone`, and guards for the fields used.
- `QaError.tsx` is reused for the Trends tab's failed states.

Rules of the change: gin-qa owns the run history; the console reads it through `gin-qa runs export`, never `qa/runs` files, and changes nothing.

## Data Flow

- [Test trends activity](docs/specs/qa/diagrams/trends-activity.md) (use case: [Review test trends](docs/specs/qa/use-cases/review-test-trends.md)).

## Error Handling

- `days` not 7, 30 or 90, or an unknown `tz`: 422 before gin-qa runs.
- gin-qa not found: 502 `missing`; no `runs` list or no `runs` command: 502 `outdated`; a timeout (30 s), another non-zero exit or JSON that does not parse: 502 with the message and `cause: null`. Failures are not cached.
- A run with an `at` that does not parse or a missing `case` is skipped and added to `problems` as `run <n>: <reason>`; the response is still 200.
- Frontend: the Trends tab shows its own error with "Try again"; the Cases tab does not read the trends, so it keeps working.

## Testing

- `pytest` with the fake gin-qa runner of `tests/fake_gin_qa.py` (a canned `runs export` per cwd, `invalid choice`, not found, timeout):
  - `test_qa_trends.py` (pure): window and `--since` across a time-zone day edge, rates with a gap and blocked runs, flips under one and two `hash8`, streaks open and closed, the median of an even and odd count, runs sharing an `at`.
  - `test_qa_trends_api.py`: 200 shape, 422s before the runner, 404 and hidden project, `missing`, `outdated`, timeout, problems kept, the cache by project and date, refresh.
- `vitest`: `TestsPage.test.tsx` (tabs, default Cases, `tab=trends`), `TrendsTab.test.tsx` (window and capability in the URL and the request, chart label, flaky links, durations, still failing with bug link, empty state, problems note, errors, 390px), `duration.test.ts`.
- QA track: gin-qa cases for REQ-QA-014 to REQ-QA-019, api cases for the endpoint, an e2e spec for the Trends tab, and a manual check on this host against the live run history.

## Open Technical Questions
