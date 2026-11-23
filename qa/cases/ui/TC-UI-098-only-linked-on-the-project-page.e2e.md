# TC-UI-098: Only linked on the project page

- **REQ:** REQ-UI-081@e4288672
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 6d79ad2c

**Preconditions:**
- Project `p` with `r-1` depending on `r-2`, and 5 other beads without a parent and without arrows

**Steps:**
1. Open `/beads?project=p&milestone=all&view=graph`

**Expected:**
- `r-1` and `r-2` are drawn
- "5 without dependencies" is shown
