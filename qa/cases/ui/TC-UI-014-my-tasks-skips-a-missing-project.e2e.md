# TC-UI-014: My Tasks skips a missing project directory

- **REQ:** REQ-UI-100@14d1209a
- **Priority:** medium

**Preconditions:**
- Project C in `/api/projects/beads` with `exists: false`, plus an existing project A, which is the current project
- Request log of the stubbed API

**Steps:**
1. Open /my-tasks?project=A

**Expected:**
- No `GET /api/beads?project=C` request is sent
- A is still requested
