# TC-UI-139: Open My work

- **REQ:** REQ-UI-099@d20e7c33
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 78e1b4d8

**Preconditions:**
- Projects `a` and `b` are configured and the current project is `a`

**Steps:**
1. Open `/beads?project=a`
2. Click "My work" in the main navigation

**Expected:**
- The URL is `/my-tasks?project=a` without a reload
- The My work page is shown and the "My work" link is the current link
