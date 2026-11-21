# TC-UI-089: Details panel

- **REQ:** REQ-UI-072@1fc49d22
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-18T15-52-57

**Preconditions:**
- Project `a` with bead `a-1`

**Steps:**
1. Open `/beads?project=a`
2. Select `a-1` in the List view

**Expected:**
- The details panel of `a-1` has no breadcrumb
- The details panel keeps its "Open page" link
