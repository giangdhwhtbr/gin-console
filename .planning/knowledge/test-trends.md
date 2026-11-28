# Test trends

**Context**
Epic `gin-console-rm-test-trends` (2026-11-28) adds a Trends tab to the Tests page: pass rate per capability per local day, flaky cases, and time to fix (median streaks, still-failing cases), over a 7, 30 or 90 day window. The run history belongs to gin-qa; the console reads it only through `gin-qa runs export --format json --since <date>` and never reads `qa/runs` files (ADR 0007).

**Decision/Solution**
- Backend `gin_console/qa/`: `source.load_runs` validates only `at`, `case`, `capability`, `hash8`, `result`, `bug` per run; a bad run goes to `problems` and the response stays 200. No `runs` list or `invalid choice` gives cause `outdated`. `trends.py` holds pure functions (`window`, `pass_rate`, `flaky`, `time_to_fix`); `GET /api/qa/trends/{project}?days=&tz=&capability=` checks the project and the 422s (`days`, unknown `tz`) before the cache, which is keyed by (project, `--since` date), 60 s, cleared on refresh; the capability filter and window cut apply after the cache.
- The window has both a start and an end bound (review fix 3bfa91b): runs after the local end of today are dropped.
- Time zones: compare aware datetimes in UTC when a local midnight may fall in a DST gap. For a nonexistent local time, `==` against the same UTC instant is False (PEP 495), so day bounds are built with `zoneinfo` and converted to UTC before any comparison.
- Frontend `features/qa/`: `tab` and `days` live in the URL (`filters.ts`); `PassRateChart` keys lines by index and cycles the 8 colours of `reports/colors.ts` (review fix d5f5542), `connectNulls` off, wrapped in `role="img"`; the browser time zone is sent as `tz`.
- A new project route goes into `PROJECT_ROUTES` of `backend/tests/test_auth_access_api.py`, see [test-coverage](test-coverage.md).

**Consequences**
- The Trends tab needs a gin-qa with the `runs export` command on the console host; an older gin-qa shows `outdated`.
- Review minors left open: the capability select stays usable while loading (.2 F2); the invalid-choice message is kept as gin-qa prints it (.1 F3).

**References**
- `docs/changes/archive/2026-11-28-gin-console-rm-test-trends-test-trends/`, `docs/specs/qa/spec.md` (REQ-QA-014 to REQ-QA-019)
- `backend/src/gin_console/qa/{source,trends,router,models}.py`, `backend/tests/test_qa_trends.py`, `backend/tests/test_qa_trends_api.py`, `frontend/src/features/qa/TrendsTab.tsx`, `qa/e2e/qa/tc-qa-049.spec.ts` to `tc-qa-052`
- Beads: `gin-console-rm-test-trends` (`.1` to `.3`); related [test-coverage](test-coverage.md)

**Scope**
Anything that reads the gin-qa run history, and date windows computed in a caller's time zone.
