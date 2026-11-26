# TC-UI-088: No remembered place

- **REQ:** REQ-UI-072@bb47458a
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T23-57-16
- **Checked:** f0e3ea17

**Preconditions:**
- Project `a` with bead `a-1`; the Beads page was not shown in this browser tab

**Steps:**
1. Open the bead page of `a-1` directly in a new tab

**Expected:**
- The breadcrumb reads "Beads" then the title of `a-1`
- "Beads" goes to `/beads?project=a`
