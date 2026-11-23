# TC-UI-304: Strand of an epic with seven tracks

- **REQ:** REQ-UI-138@b0819958
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 2dbec4ee

**Preconditions:**
- Project `P` reports epic `e-1` with 7 tracks: 2 closed, 1 in progress, 1 blocked and 3 ready (`child_counts`)

**Steps:**
1. Open `/beads?project=P&view=list`
2. Find the row of `e-1`

**Expected:**
- The row shows a strand of 7 beads in the order 2 full, 1 half, 1 knot and 3 hollow
- The strand is followed by "2/7"
- The strand has `role="img"` and the accessible name "2 done, 1 in progress, 1 blocked, 3 ready of 7 tracks"
