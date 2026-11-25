# TC-OVERVIEW-005: Blocked through its parent

- **REQ:** REQ-OVERVIEW-002@1bf3dfee
- **Priority:** medium

**Preconditions:**
- Epic `e-1` is blocked by the open bead `a-1`; its open child `e-1.1` has no blockers of its own

**Steps:**
1. Build the overview
2. Request `GET /api/overview`

**Expected:**
- `e-1` and `e-1.1` are both in `blocked`
- Both have the blocker `a-1`
