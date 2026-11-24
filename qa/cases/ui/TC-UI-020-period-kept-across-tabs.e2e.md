# TC-UI-020: Period kept across tabs

- **REQ:** REQ-UI-088@e23f9c54
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 2034ff7f

**Preconditions:**
- The Reports page for `alpha` with "Last 7 days" picked on the Delivery section (`/reports/delivery?project=alpha&days=7`)
- The window is 900px wide, so the sidebar lists no report sections and the page shows its row of section links

**Test data:**
- None

**Steps:**
1. Open the Team section
2. Open the Rework section

**Expected:**
- "Last 7 days" is selected in the Rework section
