# TC-BEADS-024: Failure

- **REQ:** REQ-BEADS-014@29794851
- **Priority:** medium

**Preconditions:**
- Project `alpha` whose `.beads` has no `issues.jsonl`

**Steps:**
1. Send `GET /api/beads?project=alpha` with `If-None-Match: W/"abc"`

**Expected:**
- The response is 502
- The body has an `error`
- The response has no `ETag` header
