# TC-UI-080: Nothing closed

- **REQ:** REQ-UI-091@6dedf223
- **Priority:** medium

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
