# TC-MILESTONE-UI-004: Schedule error replaces progress and warnings
REQ: REQ-MILESTONE-UI-001@b8f53ca9
Priority: high

Preconditions:
- project P whose `milestone list` reports M1 normally and M2 with `error` "dependency cycle: A -> B -> A"

Steps:
1. Open /milestones?project=P

Expected:
- M2 shows "dependency cycle: A -> B -> A" in place of its progress and warning count
- M1 shows its progress and warning count
