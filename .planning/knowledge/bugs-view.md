# Bugs view: source epic, dates and the sixth report section

**Context**
Epic `gin-console-rm-bugs-view` added `GET /api/reports/bugs` and the Bugs section (`/reports/bugs`): bugs by source epic, opened and closed per ISO week, and every open bug with its age. Measured on 2026-11-25 over 300 bugs (gin-console, gin-workflow, qwikfone): 19% hold a `discovered-from` link, 38% reach an epic by that link or by their parents, 6% reach a capability, and gin-qa sets no label on the bugs it files.

**Decision/Solution**
- **Source epic:** the first `discovered-from` target by id that is in the project and is or has an epic (`Tree.epics_of`), else the nearest epic among the bug's parents, else "Source unknown". A bug discovered from another bug takes that bug's parents' epic, never a second `discovered-from` hop. `ReportBead.found_in` holds the targets, built once per `read_beads` by inverting `Snapshot.dependents`.
- **Dropped parts:** bugs by capability and "found by QA versus found later" were dropped at discuss: too few bugs carry the data (6% and 1 bug).
- **Dates:** every count compares local dates (`day_of`), never datetimes, so naive and aware stamps never meet. `read_beads` already drops a row without a valid `created_at` (`ReportBead` requires it), so no report handles a missing creation date.
- **Scope:** a milestone counts the bugs of its dates (start to the earlier of end and today), not the bugs of its epics; open bugs are listed whatever the scope. A milestone whose end is before its start is treated as not started.
- **A new report endpoint on the Reports page** needs three things, or tests fail or the page asks twice: a stub parameter in the `stub()` helper of `ReportsPage.test.tsx` (unlisted `/api/reports/*` routes answer 404), a route in the e2e helpers `qa/e2e/support/reports.ts` (`stubReports`) and `qa/e2e/support/example.ts` (`stubExample`), and the shared `answers()` rule of `ReportsView.tsx`, so that an answer for the default scope also counts for the milestone the server chose.
- **Tests:** report fixtures stamped at 12:00 UTC give the same local date only from UTC-11 to UTC+11 (5 bugs tests fail under `TZ=Pacific/Kiritimati`). `toHaveTextContent` on a table row joins the cell texts without spaces, so assert on cells. A gin-qa `api` case needs a TC-named test in a `backend/tests/test_*_api.py` file; `test_reports_bugs.py` does not count (see `reports-status-and-one-scope.md`).

**Consequences**
- 62% of today's bugs show under "Source unknown" until bugs are filed with `discovered-from` or a parent.
- Every Reports page load requests the bugs report, whatever the section, for the sidebar headline.

**References**
- `backend/src/gin_console/reports/bugs.py`, `reports/source.py`, `reports/router.py`, `backend/tests/test_reports_bugs.py`, `backend/tests/test_reports_bugs_cases_api.py`
- `frontend/src/features/reports/bugs/`, `frontend/src/features/reports/ReportsView.tsx`, `frontend/src/features/reports/ReportsPage.test.tsx`
- `qa/e2e/support/reports.ts`, `qa/e2e/support/example.ts`
- Beads: `gin-console-rm-bugs-view` (`.1` to `.4`)

**Scope**
Reports backend and frontend, and the gin-qa cases and e2e helpers of Reports.
