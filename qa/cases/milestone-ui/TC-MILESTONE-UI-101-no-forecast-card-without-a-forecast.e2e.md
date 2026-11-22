# TC-MILESTONE-UI-101: No forecast card without a forecast

- **REQ:** REQ-MILESTONE-UI-016@5a233a4f
- **Priority:** medium

**Preconditions:**
- Project `P` whose `milestone list` reports `forecast: null`
- Project `Q` whose `milestone list` has no `forecast` key

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones?project=P`
3. Open `/milestones?project=Q`

**Expected:**
- No forecast card is shown for P or Q
- The milestone list is shown as before
