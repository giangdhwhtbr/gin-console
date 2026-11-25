# TC-OVERVIEW-009: Blocked and split epics left out

- **REQ:** REQ-OVERVIEW-003@d8277076
- **Priority:** medium

**Preconditions:**
- `overview.aging_days` is 3
- An in-progress blocked bead, and an in-progress epic with tracks, both started 10 working days ago

**Steps:**
1. Request `GET /api/overview`

**Expected:**
- Neither is in `aging`
