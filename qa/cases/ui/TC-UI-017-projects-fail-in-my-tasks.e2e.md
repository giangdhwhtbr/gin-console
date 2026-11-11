# TC-UI-017: Projects fail in My Tasks

- **REQ:** REQ-UI-102@caa19354
- **Priority:** high

**Preconditions:**
- `GET /api/projects/beads` responds 500

**Steps:**
1. Open /my-tasks

**Expected:**
- The page says the projects could not be loaded
- No beads are listed
