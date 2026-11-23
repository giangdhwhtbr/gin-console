# TC-UI-305: Strand of more than 16 tracks is segmented

- **REQ:** REQ-UI-138@b0819958
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** b598ba2c

**Preconditions:**
- Project `P` reports epic `e-2` with 19 tracks: 11 closed, 1 in progress, 6 ready and 1 deferred

**Steps:**
1. Open `/beads?project=P&view=list`
2. Find the row of `e-2`

**Expected:**
- The strand is 4 segments whose lengths are in the ratio 11, 1, 6 and 1
- The strand is followed by "11/19"
- The strand is named "11 done, 1 in progress, 6 ready, 1 deferred of 19 tracks" (no blocked, as 0 is left out)
