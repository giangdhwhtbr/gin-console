# TC-BEADS-021: Not modified

- **REQ:** REQ-BEADS-014@29794851
- **Priority:** high

**Preconditions:**
- Project `alpha` with at least one bead

**Steps:**
1. Send `GET /api/beads?project=alpha` and note the `ETag` header
2. Send `GET /api/beads?project=alpha` with `If-None-Match` set to the `ETag` from step 1

**Expected:**
- The response to step 2 is 304
- The response to step 2 has the same `ETag` as in step 1
- The body of the response to step 2 is empty
