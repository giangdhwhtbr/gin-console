# TC-OVERVIEW-007: Above the threshold

- **REQ:** REQ-OVERVIEW-003@d8277076
- **Priority:** high

**Preconditions:**
- `overview.aging_days` is 3
- Two in-progress beads started on Monday 16 Nov and Wednesday 18 Nov 2026; today is Friday 20 Nov 2026

**Steps:**
1. Request `GET /api/overview`

**Expected:**
- Only the bead started on 16 Nov is in `aging`, with `days` 4
