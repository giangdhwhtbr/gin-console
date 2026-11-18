# TC-UI-099: Off inside a bead

- **REQ:** REQ-UI-081@abf925c9
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-18T15-52-57

**Preconditions:**
- Project `p` with an epic `e-1` that has an unlinked task

**Steps:**
1. Open `/beads/p/e-1/graph`

**Expected:**
- The unlinked task is drawn
- "Only linked" is off
