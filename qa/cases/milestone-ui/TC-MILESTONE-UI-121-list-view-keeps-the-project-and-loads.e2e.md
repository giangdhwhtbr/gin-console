# TC-MILESTONE-UI-121: List view keeps the project and loads once

- **REQ:** REQ-MILESTONE-UI-033@4e0cb01a
- **Priority:** high

**Preconditions:**
- Same project as TC-MILESTONE-UI-120 (`alpha`), whose `milestone list` is answered once and counted

**Test data:**
- Today: 2026-11-12

**Steps:**
1. Open `/milestones?project=alpha&zoom=weeks&closed=1`
2. Press List in the View row
3. Press Timeline in the View row

**Expected:**
- After step 2: the URL is `/milestones?project=alpha&zoom=weeks&closed=1&view=list`
- After step 2: the list of milestones and the project forecast card are shown, and the Timeline is not
- After step 3: the URL is `/milestones?project=alpha&zoom=weeks&closed=1`, with no `view`, and the Timeline is shown
- `GET /api/milestones?project=alpha` was requested once in all three steps
