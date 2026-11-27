# TC-AUTH-023: All projects

- **REQ:** REQ-AUTH-007@e145510c
- **Priority:** medium

**Preconditions:**
- User `root` with projects `"*"`

**Steps:**
1. Request `GET /api/projects/beads` as `root`

**Expected:**
- Every configured project is listed
