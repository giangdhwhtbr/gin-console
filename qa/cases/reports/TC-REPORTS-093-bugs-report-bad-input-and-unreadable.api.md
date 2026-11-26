# TC-REPORTS-093: Bugs report bad input and unreadable export

- **REQ:** REQ-REPORTS-039@542f0964
- **Priority:** high

**Preconditions:**
- Project `alpha` with the active milestone `m2`; no project `nope`
- The `bd export` snapshot of `alpha` cannot be read on the first request and can on the second

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/bugs?project=nope`
2. Send `GET /api/reports/bugs?project=alpha&days=14`
3. Send `GET /api/reports/bugs?project=alpha&milestone=a%20b`
4. Send `GET /api/reports/bugs?project=alpha&milestone=m2&days=7`
5. Send `GET /api/reports/bugs?project=alpha`
6. Send `GET /api/reports/bugs?project=alpha` again

**Expected:**
- The responses of steps 1 to 4 are 404, 422, 422 and 422, each with an `error`, and the export is not read for them
- The response of step 5 is 502 with an `error`
- The response of step 6 is 200 (the failure was not cached)
