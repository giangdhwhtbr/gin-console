# TC-MILESTONE-UI-039: Beads failure stays in the section and Retry refetches
REQ: REQ-MILESTONE-UI-010@870a452a
Priority: high

Preconditions:
- project P whose milestones load and whose `GET /api/beads` responds 502

Steps:
1. Open /milestones?project=P
2. Click "Retry" in the section

Expected:
- The milestones are listed
- The section shows the error with a "Retry" button
- Retry requests `/api/beads` again
