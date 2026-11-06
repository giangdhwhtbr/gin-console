# TC-MILESTONE-UI-035: Lists only parentless epics
REQ: REQ-MILESTONE-UI-010@870a452a
Priority: high

Preconditions:
- project P with open epics A (labelled `roadmap`) and B (no labels) without a parent, open epic C whose parent is milestone M1, open epic D whose parent is epic A, and open task T without a parent

Steps:
1. Open /milestones?project=P

Expected:
- The "Epics not in a milestone" heading shows 2
- The section lists A and B only
- Each row shows state, id, title, priority, and labels
- A's title links to /beads/P/A and B's to /beads/P/B
