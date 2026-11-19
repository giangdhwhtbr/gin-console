# TC-MILESTONE-UI-001: List milestones with status, period, progress and warnings
REQ: REQ-MILESTONE-UI-001@ecd0d02b
Priority: high
Result: passed
Run: qa/evidence/2026-11-15T14-02-27

Preconditions:
- project P whose `milestone list --all --json` reports M1 (active) and M2 (planned)

Steps:
1. Open /milestones
2. Select project P

Expected:
- M1 and M2 are listed
- Each row shows its status, start and end, epic progress, and warning count
- The URL has `project=P`
