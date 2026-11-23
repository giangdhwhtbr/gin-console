# TC-UI-225: Not an epic

- **REQ:** REQ-UI-119@fcb75f6f
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 040d85db

**Preconditions:**
- Project `example` has task `ex-e3.2`, a child of epic `ex-e3`, with 2 comments so that the page has its discussion column

**Steps:**
1. Open `/beads/example/ex-e3.2`

**Expected:**
- The page has no tab "Overview", "Graph" or "Lanes"
- The page keeps the discussion column next to the description
