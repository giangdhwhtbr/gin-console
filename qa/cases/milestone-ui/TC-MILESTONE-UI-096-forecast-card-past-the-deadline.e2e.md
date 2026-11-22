# TC-MILESTONE-UI-096: Forecast card past the deadline

- **REQ:** REQ-MILESTONE-UI-016@5a233a4f
- **Priority:** medium

**Preconditions:**
- Project `P` whose `milestone list` reports forecast `finish: 2027-01-07`, `deadline: 2026-12-31`, `overflow_days: 5`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones?project=P`

**Expected:**
- The card reads "5 working days past the deadline" in the warning color
