# TC-MILESTONE-UI-100: Forecast card with an error

- **REQ:** REQ-MILESTONE-UI-016@5a233a4f
- **Priority:** medium

**Preconditions:**
- Project `P` whose `milestone list` reports forecast `error: "Deadline: soon is not a date (YYYY-MM-DD)"`, `deadline: null` and `finish: 2026-11-20`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones?project=P`

**Expected:**
- The card shows "Deadline: soon is not a date (YYYY-MM-DD)" in the destructive color
- The card still reads "Finishes 20 Nov"
