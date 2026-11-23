# TC-UI-015: My Tasks does not request the full projects list

- **REQ:** REQ-UI-100@14d1209a
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-45-40
- **Checked:** c6c83ca1

**Preconditions:**
- Two projects in `/api/projects/beads`
- Request log of the stubbed API

**Steps:**
1. Open /my-tasks

**Expected:**
- No request goes to `/api/projects`
