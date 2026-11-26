# TC-UI-027: Change tab

- **REQ:** REQ-UI-095@3fd9927e
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** e51f2027

**Preconditions:**
- The Reports page for `alpha`, 90 days and the Delivery section (`/reports/delivery?project=alpha&days=90`)
- The window is 900px wide, so the sidebar lists no report sections and the page shows its row of section links

**Test data:**
- None

**Steps:**
1. Open the Rework section

**Expected:**
- The URL becomes `/reports/rework?project=alpha&days=90` without a reload and no new report is requested
