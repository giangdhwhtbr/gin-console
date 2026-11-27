# TC-UI-233: Favorite in a new tab

- **REQ:** REQ-UI-124@79a26394
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** 3d8751d4

**Preconditions:**
- Projects `a`, `b` and `c` are configured and `c` is the favorite; nothing was chosen in this tab

**Steps:**
1. Open `/beads`

**Expected:**
- The Beads page of `c` is shown
- The URL becomes `/beads?project=c`
