# TC-REPORTS-055: All projects with one failing

- **REQ:** REQ-REPORTS-018@2d3d5d2a
- **Priority:** medium

**Preconditions:**
- Project `alpha` whose milestones list has velocity, a kicked-off milestone and `days_per_point`
- Project `beta` whose `GET /api/milestones?project=beta` answers 502 with `cause: "outdated"`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/reports?project=all&tab=velocity`

**Expected:**
- `alpha` shows its figures, charts and table
- `beta` shows the outdated error
