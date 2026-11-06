# TC-MILESTONE-UI-025: Preview with start is never cached
REQ: REQ-MILESTONE-UI-008@6a188a65
Priority: medium
Result: passed
Run: qa/evidence/2026-11-06T04-03-21-api

Preconditions:
- a request for M1 with `start=2026-11-16` answered less than 5 seconds ago

Steps:
1. Request `GET /api/milestones/P/M1?start=2026-11-16` again

Expected:
- `milestone show M1 --start 2026-11-16 --json` runs again
