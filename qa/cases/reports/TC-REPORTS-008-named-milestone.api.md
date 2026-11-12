# TC-REPORTS-008: Named milestone

- **REQ:** REQ-REPORTS-008@969b8165
- **Priority:** medium

**Preconditions:**
- The same project

**Test data:**
- None

**Steps:**
1. A client requests `/api/reports/team?project=alpha&milestone=m1`

**Expected:**
- `milestone` is `m1` and the sections describe `m1`
