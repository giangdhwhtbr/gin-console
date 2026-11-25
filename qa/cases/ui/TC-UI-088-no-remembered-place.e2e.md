# TC-UI-088: No remembered place

- **REQ:** REQ-UI-072@3768e26f
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** 8758b045

**Preconditions:**
- Project `a` with bead `a-1`; the Beads page was not shown in this browser tab

**Steps:**
1. Open the bead page of `a-1` directly in a new tab

**Expected:**
- The breadcrumb reads "Beads" then the title of `a-1`
- "Beads" goes to `/beads?project=a`
