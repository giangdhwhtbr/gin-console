# TC-UI-015: My Tasks does not request the full projects list

- **REQ:** REQ-UI-100@14d1209a
- **Priority:** medium

**Preconditions:**
- Two projects in `/api/projects/beads`
- Request log of the stubbed API

**Steps:**
1. Open /my-tasks

**Expected:**
- No request goes to `/api/projects`
