# TC-UI-323: Search shortcut on the Board

- **REQ:** REQ-UI-037@ce7edeaf
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 81c22aa3

**Preconditions:**
- The Board view of project `example` is shown at 1280px wide
- No field has focus

**Steps:**
1. Press `/`

**Expected:**
- The `searchbox "Search"` has focus
- The key `/` is not typed into the search box
