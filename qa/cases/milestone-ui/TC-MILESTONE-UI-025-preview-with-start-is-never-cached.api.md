# TC-MILESTONE-UI-025: Preview with start is never cached
REQ: REQ-MILESTONE-UI-008@4b68a946
Priority: medium
Result: passed
Run: qa/evidence/2026-11-23T03-32-23-api
Checked: 0f2a2937

Preconditions:
- a request for M1 with `start=2026-11-16` answered less than 5 seconds ago

Steps:
1. Request `GET /api/milestones/P/M1?start=2026-11-16` again

Expected:
- `milestone show M1 --start 2026-11-16 --json` runs again
