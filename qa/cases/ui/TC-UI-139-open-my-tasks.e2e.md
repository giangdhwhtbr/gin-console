# TC-UI-139: Open My Tasks

- **REQ:** REQ-UI-099@56160f6e
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 78e1b4d8

**Preconditions:**
- Projects `a` and `b` are configured and the current project is `a`

**Steps:**
1. Open `/beads?project=a`
2. Click "My Tasks" in the main navigation

**Expected:**
- The URL is `/my-tasks?project=a` without a reload
- The My Tasks page is shown and the "My Tasks" link is the current link
