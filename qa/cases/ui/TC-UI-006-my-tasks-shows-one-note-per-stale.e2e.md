# TC-UI-006: My Tasks shows one note per stale project

- **REQ:** REQ-UI-103@5ebe1b9b
- **Priority:** high

**Preconditions:**
- Project A with `beads.stale: true` and project B with `beads.stale: false`; both have tasks for the signed-in email

**Test data:**
- Email: any, stored in localStorage `gin-console.email` (the app gates on it)

**Steps:**
1. Open /my-tasks

**Expected:**
- One note names A
- No note names B
- The tasks of A and B are listed
