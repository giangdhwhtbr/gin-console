# TC-UI-065: Closed bead

- **REQ:** REQ-UI-049@73f03f4c
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** d166e3f9

**Preconditions:**
- Epic `e-1` in project `alpha` has a closed task `t-1`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=graph&scope=e-1&closed=1`

**Expected:**
- "Show closed" is on
- The node `t-1` is drawn as "Done"
