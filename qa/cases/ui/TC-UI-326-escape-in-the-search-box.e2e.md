# TC-UI-326: Escape in the search box

- **REQ:** REQ-UI-037@ce7edeaf
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** b2452bca

**Preconditions:**
- The Beads page of project `example` is shown
- The search box holds the text "pay" and has focus

**Steps:**
1. Press `Esc`
2. Press `Esc` again

**Expected:**
- After the first `Esc` the search box is empty and keeps focus
- After the second `Esc` the search box no longer has focus
