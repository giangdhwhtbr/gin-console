# TC-MILESTONE-UI-098: Forecast card with no open epic estimated

- **REQ:** REQ-MILESTONE-UI-016@5a233a4f
- **Priority:** medium

**Preconditions:**
- Project `P` whose `milestone list` reports forecast `finish: null`, `open_epics: 2`, `unestimated: 2`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones?project=P`

**Expected:**
- The card reads "No estimate: no open epic is estimated"
- The card shows the pair Not estimated "2 not estimated" with a warning mark
- The card shows no deadline comparison
