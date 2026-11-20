# TC-UI-175: Merge gates not counted as children

- **REQ:** REQ-UI-116@85edbd50
- **Priority:** medium

**Preconditions:**
- Epic `ex-e12` has 8 tracks and a merge gate whose parent is `ex-e12`

**Steps:**
1. Open the Graph view without a scope

**Expected:**
- The node of `ex-e12` reads "n of 8 done"
