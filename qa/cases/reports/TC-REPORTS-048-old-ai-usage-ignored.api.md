# TC-REPORTS-048: Old ai_usage ignored

- **REQ:** REQ-REPORTS-005@30b969a9
- **Priority:** low
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T08-49-45-api
- **Checked:** fe09cc88

**Preconditions:**
- A closed task whose metadata holds `ai_usage.quality.reopens` 5
- The interaction log has no reopen of it

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=alpha`

**Expected:**
- The task counts 0 reopens
- `totals.rework_rate` is 0
