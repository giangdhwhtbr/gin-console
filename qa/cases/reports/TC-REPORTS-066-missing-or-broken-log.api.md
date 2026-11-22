# TC-REPORTS-066: Missing or broken log

- **REQ:** REQ-REPORTS-019@3228f7dd
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T08-49-45-api
- **Checked:** 7a0d1e93

**Preconditions:**
- Project `alpha` without `.beads/interactions.jsonl`
- Project `beta` whose log holds a line that is not JSON, a line without `extra`, and one reopen of `b-1`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=all`

**Expected:**
- The response is 200
- Every bead of `alpha` has `reopens` 0
- `b-1` has `reopens` 1
