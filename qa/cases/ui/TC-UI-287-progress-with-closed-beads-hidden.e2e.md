# TC-UI-287: Progress with closed beads hidden

- **REQ:** REQ-UI-120@510ca667
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T04-57-11
- **Checked:** 09c77854

**Preconditions:**
- Project `example` has epic `ex-e12` with 8 tracks (4 closed, 1 in progress, 2 ready, 1 blocked) and a merge gate child
- "Show closed" is off on the Beads page

**Steps:**
1. Open `/beads?project=example&milestone=all`
2. Click the title of `ex-e12`

**Expected:**
- After step 2 Progress reads "4 of 8 tracks closed · 50%"
