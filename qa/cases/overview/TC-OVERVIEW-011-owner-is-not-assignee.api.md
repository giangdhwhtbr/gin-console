# TC-OVERVIEW-011: Owner is not assignee

- **REQ:** REQ-OVERVIEW-004@3bf39e85
- **Priority:** high

**Preconditions:**
- A ready bead with `owner` `lead@example.com` and no `assignee`; a ready bead assigned to `ann`

**Steps:**
1. Request `GET /api/overview`

**Expected:**
- Only the first bead is in `unassigned`
