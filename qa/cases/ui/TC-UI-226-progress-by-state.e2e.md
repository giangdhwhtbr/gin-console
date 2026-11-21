# TC-UI-226: Progress by state

- **REQ:** REQ-UI-120@39a3c2e0
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-21T05-35-36
- **Checked:** f72d8fef

**Preconditions:**
- Project `example` has epic `ex-e12` with 8 tracks (4 closed, 1 in progress, 2 ready, 1 blocked) and a merge gate child

**Steps:**
1. Open `/beads/example/ex-e12`

**Expected:**
- Progress reads "4 of 8 tracks closed · 50%"
- The legend reads Done 4, In progress 1, Ready 2 and Blocked 1
- The merge gate is not counted
