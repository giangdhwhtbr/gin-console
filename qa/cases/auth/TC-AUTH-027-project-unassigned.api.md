# TC-AUTH-027: Project unassigned

- **REQ:** REQ-AUTH-009@b203dbad
- **Priority:** high

**Preconditions:**
- `an` signed in with projects `[a, b]`; the operator runs `user unassign an b`

**Steps:**
1. Request `GET /api/beads?project=b` as `an`

**Expected:**
- The response is 404
