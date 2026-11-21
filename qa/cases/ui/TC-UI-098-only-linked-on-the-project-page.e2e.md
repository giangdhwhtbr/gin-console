# TC-UI-098: Only linked on the project page

- **REQ:** REQ-UI-081@e4288672
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-18T15-52-57

**Preconditions:**
- Project `p` with `r-1` depending on `r-2`, and 5 other beads without a parent and without arrows

**Steps:**
1. Open `/beads?project=p&milestone=all&view=graph`

**Expected:**
- `r-1` and `r-2` are drawn
- "5 without dependencies" is shown
