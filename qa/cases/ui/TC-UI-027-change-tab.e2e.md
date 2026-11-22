# TC-UI-027: Change tab

- **REQ:** REQ-UI-095@2f17c833
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T08-56-47
- **Checked:** 30c9780a

**Preconditions:**
- The Reports page for `alpha`, 90 days and the Delivery tab
- The window is 900px wide, so the sidebar lists no report sections and the page shows its tab list

**Test data:**
- None

**Steps:**
1. Pick the Quality tab

**Expected:**
- The URL becomes `/reports?project=alpha&days=90&tab=quality` without a reload and no new report is requested
