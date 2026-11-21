# TC-UI-010: Beads page does not request the full projects list

- **REQ:** REQ-UI-023@3c2e03cc
- **Priority:** medium

**Preconditions:**
- Two projects in `/api/projects/beads`
- Request log of the stubbed API

**Steps:**
1. Open /beads

**Expected:**
- No request goes to `/api/projects`
