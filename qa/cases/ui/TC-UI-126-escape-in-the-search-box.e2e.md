# TC-UI-126: Escape in the search box

- **REQ:** REQ-UI-045@790904b3
- **Priority:** medium

**Preconditions:**
- Project `alpha` with bead `t-1`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=list&select=t-1`
2. Click the search box and type `pay`
3. Press Escape

**Expected:**
- The text in the search box is cleared
- `t-1` stays selected and the URL still has `select=t-1`
