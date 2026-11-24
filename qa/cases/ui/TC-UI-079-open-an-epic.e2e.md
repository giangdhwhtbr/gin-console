# TC-UI-079: Open an epic

- **REQ:** REQ-UI-091@1e16f3d0
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 80483caf

**Preconditions:**
- The Rework section of the Reports page for `alpha`
- An epic row for `e-1` of project `alpha`
- The window is 900px wide, so the page shows its row of section links

**Test data:**
- None

**Steps:**
1. Open `/reports/rework?project=alpha`
2. Click the title of epic `e-1`

**Expected:**
- The page `/beads/alpha/e-1` is shown
