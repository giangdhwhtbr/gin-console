# TC-UI-285: Bead page without an assignee

- **REQ:** REQ-UI-028@5a22703b
- **Priority:** medium

**Preconditions:**
- Task `t-1` of project `alpha` has owner `lead@example.com` and no assignee

**Steps:**
1. Open `/beads/alpha/t-1`

**Expected:**
- The facts read Assignee "Unassigned" and Created by "lead"
