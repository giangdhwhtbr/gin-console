# TC-REPORTS-047: Epic rows

- **REQ:** REQ-REPORTS-005@30b969a9
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T08-49-45-api
- **Checked:** ebbf5b86

**Preconditions:**
- Epic `e-1` has closed tasks `t-1` (reopened once) and `t-2`
- Epic `e-2` has closed tasks `t-3` and `t-4` and no rework

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=alpha`

**Expected:**
- `quality.epics` lists `e-1` (closed 2, reopens 1, rework rate 0.5) before `e-2` (closed 2, rework rate 0)
