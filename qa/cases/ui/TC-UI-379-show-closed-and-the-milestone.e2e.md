# TC-UI-379: Show closed and the milestone

- **REQ:** REQ-UI-072@bb47458a
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T23-57-16
- **Checked:** 73138b5d

**Preconditions:**
- Project `a` has the milestone `m1`, which is its current milestone, and a bead `a-1` titled "Fix login"

**Steps:**
1. Open `/beads?project=a&view=list&closed=1&milestone=all&kind=technical`
2. Open the bead page of `a-1`

**Expected:**
- The breadcrumb reads "Beads › List, 2 filters" then "Fix login"
- Show closed is not counted as a filter; the milestone "All" (not the current one) and the kind are
