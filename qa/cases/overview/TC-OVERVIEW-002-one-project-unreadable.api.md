# TC-OVERVIEW-002: One project unreadable

- **REQ:** REQ-OVERVIEW-001@ff4db4a2
- **Priority:** high

**Preconditions:**
- Project `a` has no `.beads/issues.jsonl`; project `b` has one with beads

**Steps:**
1. Request `GET /api/overview`

**Expected:**
- The response is 200
- `a` has an `error` message and `b` has its lists and no error
