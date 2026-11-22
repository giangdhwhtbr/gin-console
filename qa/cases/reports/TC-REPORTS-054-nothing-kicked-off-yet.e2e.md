# TC-REPORTS-054: Nothing kicked off yet

- **REQ:** REQ-REPORTS-018@2d3d5d2a
- **Priority:** medium

**Preconditions:**
- Project `alpha` whose milestones all have `committed_points: null` and `completed_points: 0`, or no `velocity` key

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/reports?project=alpha&tab=velocity`

**Expected:**
- It shows "No kicked-off milestones with points yet"
- No chart is shown
