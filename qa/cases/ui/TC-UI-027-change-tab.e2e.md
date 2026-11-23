# TC-UI-027: Change tab

- **REQ:** REQ-UI-095@78603446
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** e51f2027

**Preconditions:**
- The Reports page for `alpha`, 90 days and the Delivery tab
- The window is 900px wide, so the sidebar lists no report sections and the page shows its tab list

**Test data:**
- None

**Steps:**
1. Pick the Quality tab

**Expected:**
- The URL becomes `/reports?project=alpha&days=90&tab=quality` without a reload and no new report is requested
