# TC-UI-235: My Tasks keeps all projects

- **REQ:** REQ-UI-124@86ecfe10
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** fe8e8209

**Preconditions:**
- Projects `a` and `b` are configured and the current project is `b`

**Steps:**
1. Open `/beads?project=b`
2. Click "My Tasks" in the main navigation

**Expected:**
- The page is `/my-tasks` and shows "All projects"
