# TC-UI-233: Favorite in a new tab

- **REQ:** REQ-UI-124@86ecfe10
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 0375bc78

**Preconditions:**
- Projects `a`, `b` and `c` are configured and `c` is the favorite; nothing was chosen in this tab

**Steps:**
1. Open `/beads`

**Expected:**
- The Beads page of `c` is shown
- The URL becomes `/beads?project=c`
