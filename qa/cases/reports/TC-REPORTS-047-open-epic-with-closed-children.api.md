# TC-REPORTS-047: Open epic with closed children

- **REQ:** REQ-REPORTS-003@3cabb52c
- **Priority:** medium

**Preconditions:**
- Project `alpha` has open epic `a-1` without `ai_usage`
- `a-1` has two closed children of 200 tokens each

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=alpha`

**Expected:**
- `usage.epics` holds `a-1` with 400 tokens, `closed_children` 2 and `children` 2
