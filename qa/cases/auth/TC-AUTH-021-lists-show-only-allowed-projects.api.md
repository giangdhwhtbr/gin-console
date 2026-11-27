# TC-AUTH-021: Lists show only allowed projects

- **REQ:** REQ-AUTH-007@e145510c
- **Priority:** high

**Preconditions:**
- Projects `a` and `b`; user `an` with projects `[a]`

**Steps:**
1. Request `GET /api/projects/beads` as `an`
2. Request `GET /api/overview` as `an`

**Expected:**
- Only `a` is listed in each
