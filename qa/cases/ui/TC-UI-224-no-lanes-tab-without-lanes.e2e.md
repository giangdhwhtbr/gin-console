# TC-UI-224: No Lanes tab without lanes

- **REQ:** REQ-UI-119@fcb75f6f
- **Priority:** medium

**Preconditions:**
- Project `example` has epic `ex-e3` whose tracks have no lane

**Steps:**
1. Open `/beads/example/ex-e3?tab=lanes`

**Expected:**
- The tabs are "Overview", "Graph" and "Discussion"
- There is no tab "Lanes"
- Overview is open
