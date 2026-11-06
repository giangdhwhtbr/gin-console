# TC-MILESTONE-UI-037: Show closed adds closed epics dimmed
REQ: REQ-MILESTONE-UI-010@870a452a
Priority: medium

Preconditions:
- project P with open epic A and closed epic E, both without a parent

Steps:
1. Open /milestones?project=P
2. Check "Show closed"

Expected:
- Before the check, only A is listed and the heading shows 1
- After the check, A and E are listed with E dimmed
- The heading shows 2
