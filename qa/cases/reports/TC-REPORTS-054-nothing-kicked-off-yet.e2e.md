# TC-REPORTS-054: Nothing kicked off yet

- **REQ:** REQ-REPORTS-018@70b62d05
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** e6cc9828

**Preconditions:**
- Project `alpha` whose milestones all have `committed_points: null` and `completed_points: 0`, or no `velocity` key

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/reports/velocity?project=alpha`

**Expected:**
- It shows "No kicked-off milestones with points yet"
- No chart is shown
