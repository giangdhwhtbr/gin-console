# TC-AUTH-001: No auth section

- **REQ:** REQ-AUTH-001@ba7c4e83
- **Priority:** high

**Preconditions:**
- A config without `auth`, projects `a` and `b`

**Steps:**
1. Request `GET /api/projects/beads` without a cookie

**Expected:**
- The response is 200
- Every configured project is listed
- No cookie is set
