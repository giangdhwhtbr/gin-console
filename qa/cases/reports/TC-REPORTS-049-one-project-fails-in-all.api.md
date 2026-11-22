# TC-REPORTS-049: One project fails in all

- **REQ:** REQ-REPORTS-007@f51b674f
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T08-49-45-api
- **Checked:** 398a034e

**Preconditions:**
- Projects `alpha` and `beta`
- `bd` exits non-zero in `beta`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=all`

**Expected:**
- The response is 200 with the beads of `alpha`
- `errors` holds `beta` with its error
