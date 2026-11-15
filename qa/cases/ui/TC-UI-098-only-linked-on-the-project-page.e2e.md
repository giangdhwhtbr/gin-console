# TC-UI-098: Only linked on the project page

- **REQ:** REQ-UI-081@abf925c9
- **Priority:** high

**Preconditions:**
- Project `p` with `r-1` depending on `r-2`, and 5 other beads without a parent and without arrows

**Steps:**
1. Open the Dependencies page of project `p`

**Expected:**
- `r-1` and `r-2` are drawn
- "5 without dependencies" is shown
