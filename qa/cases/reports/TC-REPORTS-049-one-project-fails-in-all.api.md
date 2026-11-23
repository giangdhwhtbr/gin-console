# TC-REPORTS-049: One project fails, the other is served

- **REQ:** REQ-REPORTS-007@deeb89a4
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** b3a709b9

**Preconditions:**
- Projects `alpha` and `beta`
- `bd` exits non-zero in `beta` and succeeds in `alpha`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=beta`
2. Send `GET /api/reports?project=alpha`

**Expected:**
- The response for `beta` is 502 with an `error`
- The response for `alpha` is 200 with the beads of `alpha`
- Neither answer has an `errors` key
