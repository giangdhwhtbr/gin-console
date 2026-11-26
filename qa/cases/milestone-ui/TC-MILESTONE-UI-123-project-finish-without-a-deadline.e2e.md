# TC-MILESTONE-UI-123: Project finish without a deadline

- **REQ:** REQ-MILESTONE-UI-034@9fbc206a
- **Priority:** medium

**Preconditions:**
- Project `gin-workflow` whose `forecast` has `finish` 2027-01-19, `deadline` null and `overflow_days` 0

**Test data:**
- Today: 2027-01-05

**Steps:**
1. Open `/milestones?project=gin-workflow`

**Expected:**
- The header reads "Project finishes 19 Jan" and nothing more
- "deadline" and "working days late" are not shown
