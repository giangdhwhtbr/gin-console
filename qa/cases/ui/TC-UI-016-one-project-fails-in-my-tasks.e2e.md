# TC-UI-016: The beads request of the project fails in My Tasks

- **REQ:** REQ-UI-102@366e8139
- **Priority:** high

**Preconditions:**
- The current project is A and `GET /api/beads?project=A` responds 500 with an error message

**Steps:**
1. Open /my-tasks?project=A

**Expected:**
- An error names A and its message
- No beads are listed
