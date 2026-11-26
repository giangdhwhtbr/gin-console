# TC-MILESTONE-UI-004: Schedule error replaces progress and warnings
REQ: REQ-MILESTONE-UI-001@eeee2b06
Priority: high
Result: passed
Run: qa/evidence/2026-11-23T10-34-33
Checked: 0e3fed22

Preconditions:
- project P whose `milestone list` reports M1 normally and M2 with `error` "dependency cycle: A -> B -> A"

Steps:
1. Open /milestones?project=P&view=list

Expected:
- M2 shows "dependency cycle: A -> B -> A" in place of its strand and warnings
- M1 shows its strand and "<n> warnings"
