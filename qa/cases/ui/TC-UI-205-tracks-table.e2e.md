# TC-UI-205: Tracks table

- **REQ:** REQ-UI-121@3ec4d754
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-21T05-35-36
- **Checked:** 77eedd15

**Preconditions:**
- Epic `ex-e12` has 8 tracks and a merge gate child
- `ex-e12.4` is blocked by the merge gate that waits for track 2 of lane be

**Steps:**
1. Open `/beads/example/ex-e12`

**Expected:**
- The Tracks table has 8 rows ordered by id
- No row reads "Waits for"
- The row of `ex-e12.4` reads "Blocked", "qa", "Unassigned" and "be #2 · merge pending"
