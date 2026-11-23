# TC-UI-126: Escape in the search box

- **REQ:** REQ-UI-045@790904b3
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 1c4d8650

**Preconditions:**
- Project `alpha` with bead `t-1`

**Steps:**
1. Set the window width to 1280px
2. Open `/beads?project=alpha&milestone=all&view=list&select=t-1`
3. Click the search box and type `pay`
4. Press Escape

**Expected:**
- The text in the search box is cleared
- `t-1` stays selected and the URL still has `select=t-1`
