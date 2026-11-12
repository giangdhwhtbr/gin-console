# TC-REPORTS-016: Buckets and members

- **REQ:** REQ-REPORTS-009@522708e2
- **Priority:** medium

**Preconditions:**
- Scope beads with status `blocked` and no assignee, `deferred` assigned to `ann`, and `in_progress` assigned to `bao`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha`

**Expected:**
- Their buckets are `open`, `open` and `in_progress`, and their members are `Unassigned`, `ann` and `bao`
