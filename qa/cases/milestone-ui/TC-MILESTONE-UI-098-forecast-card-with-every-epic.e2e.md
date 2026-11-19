# TC-MILESTONE-UI-098: Forecast card with every epic unestimated

- **REQ:** REQ-MILESTONE-UI-016@f4425100
- **Priority:** medium

**Preconditions:**
- Project `P` whose `milestone list` reports forecast `finish: null`, `open_epics: 2`, `unestimated: 2`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones?project=P`

**Expected:**
- The card reads "No estimate: every open epic is unestimated"
- The card reads "2 unestimated" with a warning mark
- The card shows no deadline comparison
