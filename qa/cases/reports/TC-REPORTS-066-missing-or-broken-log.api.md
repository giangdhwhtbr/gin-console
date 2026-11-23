# TC-REPORTS-066: Missing or broken log

- **REQ:** REQ-REPORTS-019@4dd40cfb
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** 29277971

**Preconditions:**
- Project `alpha` without `.beads/interactions.jsonl`
- Project `beta` whose log holds a line that is not JSON, a line without `extra`, and one reopen of `b-1`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=alpha`
2. Send `GET /api/reports?project=beta`

**Expected:**
- Both responses are 200
- Every bead of `alpha` has `reopens` 0
- `b-1` has `reopens` 1
