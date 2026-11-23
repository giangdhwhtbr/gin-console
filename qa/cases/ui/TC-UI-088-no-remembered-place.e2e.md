# TC-UI-088: No remembered place

- **REQ:** REQ-UI-072@6a1a0b98
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 2d3176b9

**Preconditions:**
- Project `a` with bead `a-1`; the Beads page was not shown in this browser tab

**Steps:**
1. Open the bead page of `a-1` directly in a new tab

**Expected:**
- The breadcrumb reads "Beads" then the title of `a-1`
- "Beads" goes to `/beads?project=a`
