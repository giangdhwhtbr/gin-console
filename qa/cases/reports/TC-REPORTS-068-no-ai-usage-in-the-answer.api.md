# TC-REPORTS-068: No AI usage in the answer

- **REQ:** REQ-REPORTS-001@bfa65820
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T08-49-45-api
- **Checked:** f813889b

**Preconditions:**
- Project `alpha` with a closed task whose metadata still holds an `ai_usage` object

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=alpha`

**Expected:**
- The answer has no `usage` and no `coverage` key
- `totals` holds only `closed` and `rework_rate`
