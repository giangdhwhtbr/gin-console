# TC-UI-174: Merge gates not on the List, Board and Focus views

- **REQ:** REQ-UI-116@f93f8f82
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** b28342d3

**Preconditions:**
- An open merge gate without blockers and an open task without blockers

**Steps:**
1. Open the Board view
2. Open the List view
3. Open the Focus view

**Expected:**
- In each view the task is shown
- In each view the merge gate is not shown
