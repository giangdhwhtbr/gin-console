# TC-MILESTONE-UI-099: Days per point on the forecast card

- **REQ:** REQ-MILESTONE-UI-016@5a233a4f
- **Priority:** medium

**Preconditions:**
- Project `P` whose `milestone list` reports a forecast and `days_per_point: {value: 1.4, measured_epics: 6, assumed: false}`
- Project `Q` whose `milestone list` reports a forecast and `days_per_point: {value: 1.0, measured_epics: 0, assumed: true}`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones?project=P`
3. Open `/milestones?project=Q`

**Expected:**
- After step 2, P's card shows the pair Days per point "1.4"
- After step 3, Q's card shows the pair Days per point "1.0 (assumed)"
