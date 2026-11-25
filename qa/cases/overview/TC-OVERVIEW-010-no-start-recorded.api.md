# TC-OVERVIEW-010: No start recorded

- **REQ:** REQ-OVERVIEW-003@d8277076
- **Priority:** medium

**Preconditions:**
- `overview.aging_days` is 3
- An in-progress bead without `started_at`, updated 5 working days ago

**Steps:**
1. Request `GET /api/overview`

**Expected:**
- The bead is in `aging` with `days` 5
