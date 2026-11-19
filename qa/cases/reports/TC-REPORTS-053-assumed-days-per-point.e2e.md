# TC-REPORTS-053: Assumed days per point

- **REQ:** REQ-REPORTS-018@d6b9d106
- **Priority:** medium

**Preconditions:**
- Project `alpha` whose milestones list has `days_per_point` `{value: 1.0, measured_epics: 0, assumed: true}`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/reports?project=alpha&tab=velocity`

**Expected:**
- The figure reads "1.0 d/pt" with "assumed"
