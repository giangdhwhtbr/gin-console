# TC-UI-015: My work does not request the full projects list

- **REQ:** REQ-UI-100@6b611f17
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** c6c83ca1

**Preconditions:**
- Two projects in `/api/projects/beads`
- Request log of the stubbed API

**Steps:**
1. Open /my-tasks

**Expected:**
- No request goes to `/api/projects`
