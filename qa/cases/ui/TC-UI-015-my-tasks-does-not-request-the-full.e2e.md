# TC-UI-015: My Tasks does not request the full projects list

- **REQ:** REQ-UI-100@651177c0
- **Priority:** medium

**Preconditions:**
- Two projects in `/api/projects/beads`
- Request log of the stubbed API

**Steps:**
1. Open /my-tasks

**Expected:**
- No request goes to `/api/projects`
