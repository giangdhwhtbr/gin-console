# TC-UI-025: Shared link

- **REQ:** REQ-UI-095@78603446
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 4adad74e

**Preconditions:**
- The URL `/reports?project=alpha&days=7&tab=quality`
- The window is 900px wide, so the sidebar lists no report sections and the page shows its tab list

**Test data:**
- None

**Steps:**
1. Open `/reports?project=alpha&days=7&tab=quality`

**Expected:**
- The Quality tab is selected and its panel shows the report for `alpha` and 7 days
