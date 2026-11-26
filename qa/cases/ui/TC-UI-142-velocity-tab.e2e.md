# TC-UI-142: Velocity tab

- **REQ:** REQ-UI-095@3fd9927e
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 3c976649

**Preconditions:**
- The Reports page for `alpha` on the Delivery section
- The milestones list of `alpha` has `days_per_point: {value: 1.4, measured_epics: 6, assumed: false}`
- The window is 900px wide, so the sidebar lists no report sections and the page shows its row of section links

**Test data:**
- None

**Steps:**
1. Open `/reports/delivery?project=alpha`
2. Open the Velocity section

**Expected:**
- The path is `/reports/velocity`
- `GET /api/milestones?project=alpha` is requested once
- The Velocity headline reads "1.4 days per point"
