# TC-UI-405: Bugs section and headline

- **REQ:** REQ-UI-095@3fd9927e
- **Priority:** high

**Preconditions:**
- Project `alpha` has a bugs report whose `figures.open_now` is 25, and a rework report
- The window is 900px wide, so the sidebar lists no report sections and the page shows its row of section links

**Test data:**
- None

**Steps:**
1. Open `/reports/rework?project=alpha&days=30`
2. Open the Bugs section

**Expected:**
- After step 1, the row "Report sections" lists Status, Team, Delivery, Velocity, Rework and Bugs in that order, and Bugs reads "25 open bugs" without a warning icon
- After step 2, the URL becomes `/reports/bugs?project=alpha&days=30` and the Bugs link is marked `aria-current="page"`
- No new bugs report is requested by step 2
