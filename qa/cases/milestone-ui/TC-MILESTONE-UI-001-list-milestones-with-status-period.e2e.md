# TC-MILESTONE-UI-001: List milestones with status, period, progress and warnings
REQ: REQ-MILESTONE-UI-001@ec0ce005
Priority: high
Result: passed
Run: qa/evidence/2026-11-22T04-57-11
Checked: 82e15ccc

Preconditions:
- project P whose `milestone list --all --json` reports M1 (active) and M2 (planned)

Steps:
1. Open /milestones
2. Select project P

Expected:
- M1 and M2 are listed
- Each row shows its status with the one status mark (icon and word), start and end, epic progress, and warning count
- The URL has `project=P`
