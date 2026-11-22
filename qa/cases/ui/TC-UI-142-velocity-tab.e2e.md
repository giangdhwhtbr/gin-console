# TC-UI-142: Velocity tab

- **REQ:** REQ-UI-095@c32236ad
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T04-57-11
- **Checked:** fb3d690d

**Preconditions:**
- The Reports page for `alpha` on the Delivery tab
- The milestones list of `alpha` has `days_per_point: {value: 1.4, measured_epics: 6, assumed: false}`
- The window is 900px wide, so the sidebar lists no report sections and the page shows its tab list

**Test data:**
- None

**Steps:**
1. Open `/reports?project=alpha&tab=delivery`
2. Pick the Velocity tab

**Expected:**
- The URL has `tab=velocity`
- `GET /api/milestones?project=alpha` is requested once
- The Velocity headline reads "1.4 days per point"
