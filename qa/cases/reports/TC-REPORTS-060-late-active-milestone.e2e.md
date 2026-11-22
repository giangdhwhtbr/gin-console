# TC-REPORTS-060: Late active milestone

- **REQ:** REQ-REPORTS-012@ae27226f
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T04-57-11
- **Checked:** d1236adc

**Preconditions:**
- Project `alpha` has active milestone `m2` whose forecast `finish` in the Milestones list is after its `end`
- The URL has `milestone=m2`

**Test data:**
- None

**Steps:**
1. Open `/reports?project=alpha&tab=team&milestone=m2`
2. Look at the status chip in the milestone line

**Expected:**
- The status chip reads "Active · late"
- The chip shows a warning mark
