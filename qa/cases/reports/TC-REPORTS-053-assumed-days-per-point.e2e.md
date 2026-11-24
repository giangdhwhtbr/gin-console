# TC-REPORTS-053: Assumed days per point

- **REQ:** REQ-REPORTS-018@70b62d05
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** f1ffdad5

**Preconditions:**
- Project `alpha` whose milestones list has `days_per_point` `{value: 1.0, measured_epics: 0, assumed: true}`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/reports/velocity?project=alpha`

**Expected:**
- The figure reads "1.0 days per point" with "assumed"
