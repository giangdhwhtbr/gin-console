# TC-UI-006: My Tasks shows the note of the current project only

- **REQ:** REQ-UI-103@e6e5851a
- **Priority:** high

**Preconditions:**
- Projects A and B, both with `beads.stale: true`; A is the current project; both have tasks for the signed-in email

**Test data:**
- Email: any, stored in localStorage `gin-console.email` (the app gates on it)

**Steps:**
1. Open /my-tasks?project=A

**Expected:**
- One note names A
- No note names B
- The tasks of A are listed, and none of B
