# Tests: Strung visual system

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-UI-059, REQ-UI-064, REQ-UI-136, REQ-UI-137, REQ-UI-138, REQ-UI-139, REQ-UI-140, REQ-UI-141, REQ-MILESTONE-UI-003, REQ-MILESTONE-UI-024, REQ-MILESTONE-UI-025, REQ-UI-110 | manual (Playwright by claude) | fail, claude (Playwright on the Tailscale build of 9441322, 595/599 checks, screenshots in qa/evidence/2026-11-22-strung-tc1). Failing: Gantt `ex-e3` strand count "5/11" cut by 11px at 1440 light and dark (milestone-gantt-1440-*.png); Gantt epic rows differ in height (104/88/120px) at 390 light and dark (milestone-gantt-390-*.png). Mobile list hides the strand below the @xl container by design, so the list strand checks run at 1440 only. Sweep: no overlap or page overflow; one clipped Gantt meta line (same "5/11"). |
