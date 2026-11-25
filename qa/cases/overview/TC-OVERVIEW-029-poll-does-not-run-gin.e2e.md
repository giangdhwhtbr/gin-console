# TC-OVERVIEW-029: Poll does not run gin

- **REQ:** REQ-OVERVIEW-010@e311d5a8
- **Priority:** high

**Preconditions:**
- The page is open and its gates and verdicts are loaded; the overview names the same epics and milestones

**Steps:**
1. Open `/`
2. Wait 10 seconds

**Expected:**
- `/api/overview` is requested again
- No workflow, status or milestones request is sent
