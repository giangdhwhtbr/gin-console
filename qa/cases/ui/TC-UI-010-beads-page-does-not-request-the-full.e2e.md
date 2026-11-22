# TC-UI-010: Beads page does not request the full projects list

- **REQ:** REQ-UI-023@3c2e03cc
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** b0df5cac

**Preconditions:**
- Two projects in `/api/projects/beads`
- Request log of the stubbed API

**Steps:**
1. Open /beads

**Expected:**
- No request goes to `/api/projects`
