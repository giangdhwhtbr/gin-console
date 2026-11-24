# TC-REPORTS-060: Late active milestone

- **REQ:** REQ-REPORTS-012@79484a74
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** e4900dfe

**Preconditions:**
- Project `alpha` has active milestone `m2` whose forecast `finish` in the Milestones list is after its `end`
- The URL has `milestone=m2`

**Test data:**
- None

**Steps:**
1. Open `/reports/team?project=alpha&milestone=m2`
2. Look at the status in the scope line

**Expected:**
- The status reads "Active, late"
- The status shows a warning mark
