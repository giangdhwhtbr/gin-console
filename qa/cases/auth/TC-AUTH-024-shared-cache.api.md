# TC-AUTH-024: Shared cache

- **REQ:** REQ-AUTH-007@e145510c
- **Priority:** high

**Preconditions:**
- `root` has loaded `GET /api/beads?project=b`, so it is cached

**Steps:**
1. Request the same route as `an` with projects `[a]`

**Expected:**
- The response is 404
