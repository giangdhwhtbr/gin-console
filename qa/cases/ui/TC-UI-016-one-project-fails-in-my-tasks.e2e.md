# TC-UI-016: One project fails in My Tasks

- **REQ:** REQ-UI-102@caa19354
- **Priority:** high

**Preconditions:**
- Projects A and B in `/api/projects/beads`; `GET /api/beads?project=B` responds 500; A has 2 beads assigned to the signed-in email

**Steps:**
1. Open /my-tasks

**Expected:**
- An error names B
- The 2 beads of A are listed
