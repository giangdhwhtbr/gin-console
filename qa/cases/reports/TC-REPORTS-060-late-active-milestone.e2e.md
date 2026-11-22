# TC-REPORTS-060: Late active milestone

- **REQ:** REQ-REPORTS-012@023dc4c5
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** e4900dfe

**Preconditions:**
- Project `alpha` has active milestone `m2` whose forecast `finish` in the Milestones list is after its `end`
- The URL has `milestone=m2`

**Test data:**
- None

**Steps:**
1. Open `/reports?project=alpha&tab=team&milestone=m2`
2. Look at the status in the milestone line

**Expected:**
- The status reads "Active, late"
- The status shows a warning mark
