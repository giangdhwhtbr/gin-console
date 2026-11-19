# TC-MILESTONE-UI-095: Forecast card on time with a deadline

- **REQ:** REQ-MILESTONE-UI-016@f4425100
- **Priority:** medium

**Preconditions:**
- Project `P` whose `milestone list` reports forecast `finish: 2026-12-23`, `deadline: 2026-12-31`, `overflow_days: 0`, `lanes: 2`, `open_epics: 5`, `unestimated: 0`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones?project=P`

**Expected:**
- The card reads "Finishes 23 Dec"
- The card reads "6 working days spare"
- The card reads "2 lanes", "5 open epics" and "0 unestimated"
- "0 unestimated" has no warning mark
