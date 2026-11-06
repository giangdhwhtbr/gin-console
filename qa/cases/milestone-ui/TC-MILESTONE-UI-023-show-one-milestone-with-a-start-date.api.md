# TC-MILESTONE-UI-023: Show one milestone with a start date
REQ: REQ-MILESTONE-UI-008@6a188a65
Priority: high
Result: passed
Run: qa/evidence/2026-11-06T04-03-21-api

Preconditions:
- project P whose `milestone show M1 --start 2026-11-16 --json` prints schema 1

Steps:
1. Request `GET /api/milestones/P/M1?start=2026-11-16`

Expected:
- The response is 200 with the plan of M1
- `milestone show M1 --start 2026-11-16 --json` ran
