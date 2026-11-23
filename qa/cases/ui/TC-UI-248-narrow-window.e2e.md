# TC-UI-248: Narrow window

- **REQ:** REQ-UI-129@de1adeec
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** e12f82c5

**Preconditions:**
- Project `a` is configured with a report
- The window is 900px wide

**Steps:**
1. Open `/reports?project=a&tab=delivery`

**Expected:**
- The sidebar lists no report sections
- The page shows its tab list
