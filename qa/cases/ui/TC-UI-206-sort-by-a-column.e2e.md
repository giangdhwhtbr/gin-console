# TC-UI-206: Sort by a column

- **REQ:** REQ-UI-121@12205711
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 8c3551a4

**Preconditions:**
- Epic `ex-e12` has 8 tracks in different states

**Steps:**
1. Open `/beads/example/ex-e12`
2. Activate the header "State" of the Tracks table
3. Activate the header "State" again

**Expected:**
- After step 2 the rows are ordered by state ascending and the header has `aria-sort` "ascending"
- After step 3 the rows are ordered by state descending and the header has `aria-sort` "descending"
