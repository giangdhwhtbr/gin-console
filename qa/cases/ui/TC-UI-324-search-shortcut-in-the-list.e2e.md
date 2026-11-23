# TC-UI-324: Search shortcut in the List

- **REQ:** REQ-UI-037@ce7edeaf
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** d9d6ce79

**Preconditions:**
- The List view of project `example` is shown
- A row has focus

**Steps:**
1. Press `/`

**Expected:**
- The `searchbox "Search"` has focus
- The key `/` is not typed into the search box
