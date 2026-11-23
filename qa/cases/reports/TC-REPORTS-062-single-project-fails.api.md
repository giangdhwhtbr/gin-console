# TC-REPORTS-062: Single project fails

- **REQ:** REQ-REPORTS-007@deeb89a4
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** 46276420

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
