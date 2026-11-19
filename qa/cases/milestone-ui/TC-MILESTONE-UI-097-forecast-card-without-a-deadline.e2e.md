# TC-MILESTONE-UI-097: Forecast card without a deadline

- **REQ:** REQ-MILESTONE-UI-016@f4425100
- **Priority:** medium

**Preconditions:**
- Project `P` whose `milestone list` reports forecast `deadline: null` and `finish: 2026-11-20`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones?project=P`

**Expected:**
- The card reads "Finishes 20 Nov" and "No deadline"
- The card shows `- Deadline: YYYY-MM-DD` as the line to add to the roadmap
