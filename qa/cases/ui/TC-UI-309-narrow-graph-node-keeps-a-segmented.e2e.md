# TC-UI-309: Narrow Graph node keeps a segmented strand

- **REQ:** REQ-UI-138@b0819958
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** c78feddc

**Preconditions:**
- Project `P` reports epic `e-5` with 12 tracks, 3 closed and 9 ready

**Steps:**
1. Open `/beads?project=P&view=graph`
2. Find the node of `e-5`

**Expected:**
- The node shows the segmented thread, not 12 separate beads
- The node shows "3/12" in full, not cut short
