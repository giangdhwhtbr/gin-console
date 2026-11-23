# TC-UI-064: State label

- **REQ:** REQ-UI-049@73f03f4c
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 2817fcfe

**Preconditions:**
- Epic `e-1` in project `alpha` has a ready task `t-1` and a blocked task `t-2`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=graph&scope=e-1`

**Expected:**
- The node `t-1` reads "Ready" after its glyph, without a coloured left edge
- The node `t-2` reads "Blocked" after its glyph, without a coloured left edge
