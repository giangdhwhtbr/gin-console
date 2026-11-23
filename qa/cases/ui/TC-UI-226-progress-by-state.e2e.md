# TC-UI-226: Progress by state

- **REQ:** REQ-UI-120@1a27452c
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** f5d1c614

**Preconditions:**
- Project `example` has epic `ex-e12` with 8 tracks (4 closed, 1 in progress, 2 ready, 1 blocked) and a merge gate child

**Steps:**
1. Open `/beads/example/ex-e12`

**Expected:**
- Progress shows a large strand, an image named "4 done, 1 in progress, 1 blocked, 2 ready" of 8 tracks
- Progress reads "4 done, 1 in progress, 1 blocked, 2 ready"
- The merge gate is not counted
