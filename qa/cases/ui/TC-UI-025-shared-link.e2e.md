# TC-UI-025: Shared link

- **REQ:** REQ-UI-095@2f17c833
- **Priority:** medium

**Preconditions:**
- The URL `/reports?project=alpha&days=7&tab=quality`
- The window is 900px wide, so the sidebar lists no report sections and the page shows its tab list

**Test data:**
- None

**Steps:**
1. Open `/reports?project=alpha&days=7&tab=quality`

**Expected:**
- The Quality tab is selected and its panel shows the report for `alpha` and 7 days
