# TC-MILESTONE-UI-031: Other command failure answers 502 with null cause
REQ: REQ-MILESTONE-UI-008@6a188a65
Priority: medium
Result: passed
Run: qa/evidence/2026-11-06T04-03-21-api

Preconditions:
- project P whose `milestone show M1 --json` exits 1 with `milestone error: unknown milestone M1`

Steps:
1. Request `GET /api/milestones/P/M1`

Expected:
- The response is 502 with `error` holding the message and `cause: null`
