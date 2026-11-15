# TC-UI-094: Reload

- **REQ:** REQ-UI-073@21bc1bf0
- **Priority:** medium

**Preconditions:**
- Project `a` with bead `a-1`

**Steps:**
1. Open `/beads?project=a&view=focus`
2. Open the bead page of `a-1`
3. Reload the page

**Expected:**
- The breadcrumb still returns to the Focus view
