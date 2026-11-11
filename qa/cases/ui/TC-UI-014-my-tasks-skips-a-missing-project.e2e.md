# TC-UI-014: My Tasks skips a missing project directory

- **REQ:** REQ-UI-100@651177c0
- **Priority:** medium

**Preconditions:**
- Project C in `/api/projects/beads` with `exists: false`, plus an existing project A
- Request log of the stubbed API

**Steps:**
1. Open /my-tasks

**Expected:**
- No `GET /api/beads?project=C` request is sent
- A is still requested
