# TC-UI-080: Nothing closed

- **REQ:** REQ-UI-091@1e16f3d0
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 18675dc6

**Preconditions:**
- A report with no selected closed bead
- The window is 900px wide, so the page shows its row of section links

**Test data:**
- None

**Steps:**
1. Open `/reports/rework?project=alpha`

**Expected:**
- The rework rate reads "—"
- Each table says "No data in this scope"
