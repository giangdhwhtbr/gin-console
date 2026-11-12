# TC-BEADS-020: Same list

- **REQ:** REQ-BEADS-014@29794851
- **Priority:** medium

**Preconditions:**
- Project `alpha` with beads that do not change between the two requests

**Steps:**
1. Send `GET /api/beads?project=alpha` and note the `ETag` and `Cache-Control` headers
2. Send `GET /api/beads?project=alpha` again and note the same headers

**Expected:**
- Both responses are 200
- Both responses have the same `ETag`, in the form `W/"<tag>"`
- Both responses have `Cache-Control: no-cache`
