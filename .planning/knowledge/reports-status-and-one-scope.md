# Reports status, shared scope, and backend date fallbacks

**Context**
Epic `gin-console-rm-reports-status` added `/api/reports/status` (rebuilding milestone history and burn-up), unified Reports sections under `/reports/<section>` with one shared scope, added Team KPI v2, and expanded API/E2E QA coverage.

**Decision/Solution**
- **Missing timestamp fallback (`date.min`):** `datetime.min.astimezone()` raises `ValueError` (year 0 on platforms with timezone offsets). Use `date.min` directly as the fallback day when sorting or defaulting a missing timestamp in history/status calculations (Track `.1`).
- **Backend formatting:** Run `ruff format` only on files you changed; `ruff format .` rewrites unrelated backend files (also noted in `e2e-parallel-runs-and-ellipsis.md`).
- **SVG font sizes and light-mode contrast:** `frontend/src/app/style-guard.test.ts` enforces REQ-UI-137 font sizes (`12, 13, 14, 16, 20, 28, 40px`), including Recharts SVG `fontSize` props (Track `.7`). For `text-state-blocked` (`#AE500A`) on a tinted surface in light mode, use `bg-state-blocked/5` (4.53:1) rather than `bg-state-blocked/10` (4.25:1, fails WCAG AA in `TC-UI-154`, Track `.9`).
- **API QA case test naming:** `qa/guidelines.md` globs `backend/tests/test_*_api.py` for `type: api` cases; name new API case test files with the `_api.py` suffix so `gin-qa tests plan/run/check` discovers them automatically (Track `.9`).

**Consequences**
- History parsers stay safe against missing/broken timestamps without timezone `ValueError`s.
- Status and Team UI components pass both `style-guard.test.ts` and `TC-UI-154` contrast checks.
- `gin-qa tests` tracks all Reports status API cases without manual overrides.

**References**
- `backend/src/gin_console/reports/history.py`, `backend/tests/test_reports_status_cases_api.py`
- `frontend/src/features/reports/status/VerdictPanel.tsx`, `frontend/src/app/style-guard.test.ts`
- `qa/guidelines.md`, `e2e-parallel-runs-and-ellipsis.md`
- Beads: `gin-console-rm-reports-status` (`.1`, `.7`, `.9`)

**Scope**
Backend timestamp/history helpers, Reports UI components, and `gin-qa` API case test files.
