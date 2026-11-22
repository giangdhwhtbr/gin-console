# TC-UI-224: No Lanes tab without lanes

- **REQ:** REQ-UI-119@fcb75f6f
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 21739b33

**Preconditions:**
- Project `example` has epic `ex-e3` whose tracks have no lane

**Steps:**
1. Open `/beads/example/ex-e3?tab=lanes`

**Expected:**
- The tabs are "Overview", "Graph" and "Discussion"
- There is no tab "Lanes"
- Overview is open
