# TC-MILESTONE-UI-021: Open milestone without blockers is not ready work
REQ: REQ-MILESTONE-UI-007@f332d94b
Priority: high
Result: passed
Run: qa/evidence/2026-11-23T03-32-23-api
Checked: 7b408eff

Preconditions:
- project P with open milestone M1 without blockers and open task T without blockers

Steps:
1. Request `GET /api/projects`
2. Request `GET /api/beads?project=P`

Expected:
- P's ready count is 1 (T only)
- M1 is not flagged ready; T is
