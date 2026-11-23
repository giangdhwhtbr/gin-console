# TC-UI-285: Bead page without an assignee

- **REQ:** REQ-UI-028@a720e49e
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 3a8dc297

**Preconditions:**
- Task `t-1` of project `alpha` has owner `lead@example.com` and no assignee

**Steps:**
1. Open `/beads/alpha/t-1`

**Expected:**
- The facts read Assignee "Unassigned" and Created by "lead"
