# TC-REPORTS-007: Default milestone

- **REQ:** REQ-REPORTS-008@969b8165
- **Priority:** high

**Preconditions:**
- Project `alpha` with closed milestone `m1`, active milestone `m2` and planned milestone `m3`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha`

**Expected:**
- `milestone` is `m2` and `milestones` holds `m1`, `m2` and `m3` with statuses `closed`, `active` and `planned`
