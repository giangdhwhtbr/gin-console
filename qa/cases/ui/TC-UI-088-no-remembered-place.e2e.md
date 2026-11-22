# TC-UI-088: No remembered place

- **REQ:** REQ-UI-072@b8e02f9d
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 3b7db59b

**Preconditions:**
- Project `a` with bead `a-1`; the Beads page was not shown in this browser tab

**Steps:**
1. Open the bead page of `a-1` directly in a new tab

**Expected:**
- The breadcrumb reads "Beads" then the title of `a-1`
- "Beads" goes to `/beads?project=a`
