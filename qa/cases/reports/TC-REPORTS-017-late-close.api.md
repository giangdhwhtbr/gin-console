# TC-REPORTS-017: Late close

- **REQ:** REQ-REPORTS-009@b3daf2cc
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** f3d5316f

**Preconditions:**
- Project `alpha` has milestone `m2` ending on Friday 2026-11-27, with epic `e1`
- Epic `e1` has child task `e1.1`, closed on Tuesday 2026-12-01

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha&milestone=m2`

**Expected:**
- The `late_days` of `e1.1` is 2
