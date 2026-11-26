# TC-REPORTS-092: Bugs report cache refresh and no process

- **REQ:** REQ-REPORTS-039@542f0964
- **Priority:** medium

**Preconditions:**
- Project `alpha` with `today` 2026-11-25 and the active milestone `m2`
- The bugs report for `alpha` and `m2` was answered 20 seconds ago

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/bugs?project=alpha&milestone=m2`
2. Send the same request again 20 seconds later
3. Send `POST /api/refresh`
4. Send the same request again

**Expected:**
- No `gin` or `bd` process starts for any request
- The answer of step 2 has the same `generated_at` as step 1
- The answer of step 4 has a newer `generated_at`
