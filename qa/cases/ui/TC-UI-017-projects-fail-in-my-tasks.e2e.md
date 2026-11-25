# TC-UI-017: Projects fail in My work

- **REQ:** REQ-UI-102@366e8139
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 0ce452e0

**Preconditions:**
- `GET /api/projects/beads` responds 500

**Steps:**
1. Open /my-tasks

**Expected:**
- The page says the projects could not be loaded
- No beads are listed
