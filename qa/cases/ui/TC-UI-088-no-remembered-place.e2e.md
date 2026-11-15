# TC-UI-088: No remembered place

- **REQ:** REQ-UI-072@950311bf
- **Priority:** medium

**Preconditions:**
- Project `a` with bead `a-1`; the Beads page was not shown in this browser tab

**Steps:**
1. Open the bead page of `a-1` directly in a new tab

**Expected:**
- The breadcrumb reads "Beads" then `a-1`
- "Beads" goes to `/beads?project=a`
