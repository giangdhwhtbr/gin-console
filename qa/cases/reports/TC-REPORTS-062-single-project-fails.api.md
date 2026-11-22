# TC-REPORTS-062: Single project fails

- **REQ:** REQ-REPORTS-007@f51b674f
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T08-49-45-api
- **Checked:** c1d2368a

**Preconditions:**
- `bd` exits non-zero in `alpha`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=alpha`
2. Send `GET /api/reports?project=alpha` again

**Expected:**
- Both responses are 502
- `bd` ran twice
