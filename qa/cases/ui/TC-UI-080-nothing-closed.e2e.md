# TC-UI-080: Nothing closed

- **REQ:** REQ-UI-091@6dedf223
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T08-56-47
- **Checked:** 18675dc6

**Preconditions:**
- A report with no selected closed bead
- The window is 900px wide, so the page shows its tab list

**Test data:**
- None

**Steps:**
1. Open `/reports?project=alpha&tab=quality`

**Expected:**
- The rework rate reads "—"
- Each table says "No data in this period"
