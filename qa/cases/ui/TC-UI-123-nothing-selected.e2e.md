# TC-UI-123: Nothing selected

- **REQ:** REQ-UI-045@790904b3
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** b2153fee

**Preconditions:**
- Project `alpha` with bead `t-1`

**Steps:**
1. Set the window width to 1280px
2. Open `/beads?project=alpha&milestone=all&view=list`

**Expected:**
- The URL has no `select`
- There is no details panel and the list takes the full width of the page
