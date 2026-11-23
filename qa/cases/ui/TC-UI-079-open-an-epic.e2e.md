# TC-UI-079: Open an epic

- **REQ:** REQ-UI-091@6dedf223
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 80483caf

**Preconditions:**
- The Quality tab of the Reports page for `alpha`
- An epic row for `e-1` of project `alpha`
- The window is 900px wide, so the page shows its tab list

**Test data:**
- None

**Steps:**
1. Open `/reports?project=alpha&tab=quality`
2. Click the title of epic `e-1`

**Expected:**
- The page `/beads/alpha/e-1` is shown
