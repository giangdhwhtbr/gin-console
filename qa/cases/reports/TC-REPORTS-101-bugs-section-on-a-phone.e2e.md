# TC-REPORTS-101: Bugs section on a phone

- **REQ:** REQ-REPORTS-043@022646a7
- **Priority:** medium

**Preconditions:**
- Project `alpha` has a bugs report with an open bug whose title is long, and an epic row with a long title
- The window is 390px wide

**Test data:**
- None

**Steps:**
1. Open `/reports/bugs?project=alpha&days=30`

**Expected:**
- The Bugs section is shown and its "Open bugs" table scrolls sideways inside its frame
- The page has no horizontal scroll
