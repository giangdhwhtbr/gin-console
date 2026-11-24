# WBS export and Copy summary

**Context**
Epic `gin-console-rm-wbs-export` (2026-11-24) added `GET /api/milestones/{project}/wbs` (Excel, CSV for Jira, Markdown) built from the Beads snapshot joined with `gin milestone list|show`, an Export WBS menu on the Milestone and Milestones pages, and a Copy summary button on Reports Status.

**Decision/Solution**
- gin field semantics: for an assumed epic estimate, `gin milestone show` leaves `estimate_days` null and puts the value in `assumed_days` (gin-workflow `workflow_core/milestone.py`); an epic with points is never assumed. The bd field for a task estimate is `estimated_minutes` (480 per working day).
- Jira External System Import: a `Link "Blocks"` column is imported as the outward link (`<row> blocks <cell>`), so the link goes on the blocker's row. `Issue ID` is the row position from 1 and `Bead ID` is a separate column. Jira allows one sub-task level, so a sub-task's sub-task is parented to its nearest non-sub-task ancestor. A blocker outside the file cannot be linked and stays in `Depends on`.
- openpyxl: it ships no type hints (`types-openpyxl` in the dev group for mypy strict); it reads date cells back as `datetime`; it raises `IllegalCharacterError` on control characters, so every xlsx string cell goes through one helper that strips `openpyxl.cell.cell.ILLEGAL_CHARACTERS_RE` and applies the formula-injection guard.
- HTTP headers: Starlette fails with a 500 on a header value that is not latin-1. `X-WBS-Warning` is reduced to ASCII; a filename that is not `[A-Za-z0-9._-]` gets an ASCII fallback plus RFC 5987 `filename*=UTF-8''...`.
- mypy strict cannot infer a lambda passed as the loader of `KeyedCache.get`; `functools.partial(show_milestone, ...)` works.
- Reports Status: the epic rows, risk items and KPI figures are pure helpers in `frontend/src/features/reports/status/statusView.ts`, shared by `EpicTable`, `RisksPanel`, `StatusFigures` and `summaryMarkdown`, so the copied summary matches the screen.
- Tests: base-ui `Menu` items appear only after the open click settles, so query them with `findBy*`; `Menu.LinkItem` renders an `<a role="menuitem">` that keeps `href` and `download`. A 2 s "Copied" timer is tested with `vi.useFakeTimers()` without `shouldAdvanceTime` and `fireEvent.click` inside an async `act`.

**Consequences**
- Project-scope export runs `gin milestone show` once per listed milestone (closed ones included), serially, through the 5 s `details` cache.
- Known follow-ups from review: `milestones/wbs.py` imports the private `_deps` of `beads/snapshot.py`; children of an excluded prep task are dropped in milestone scope; the warning text says all gin fields are blank even when one milestone's `show` failed; `ReportsPage.test.tsx` does not assert that the period scope has no Copy summary button.
- The epic shipped without gin-qa cases for its 9 REQs (user decision at ship); the automated tests name each REQ.

**References**
- `backend/src/gin_console/milestones/{wbs.py,wbs_formats.py,router.py}`, `backend/tests/{test_wbs.py,test_wbs_formats.py,test_milestones_wbs_api.py}`
- `frontend/src/features/milestones/ExportWbsMenu.tsx`, `frontend/src/features/reports/status/{statusView.ts,summaryMarkdown.ts,CopySummaryButton.tsx}`
- Change: `docs/changes/archive/2026-11-24-gin-console-rm-wbs-export-wbs-export/`
- Beads: `gin-console-rm-wbs-export` (`.1` to `.5`); related [one-set-of-definitions](one-set-of-definitions.md), [reports-status-and-one-scope](reports-status-and-one-scope.md)

**Scope**
WBS export and its formats, download headers, gin milestone fields, and the Reports Status summary.
