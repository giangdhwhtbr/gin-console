# TC-OVERVIEW-013: Overdue and never kicked off

- **REQ:** REQ-OVERVIEW-006@eff40ea7
- **Priority:** high

**Preconditions:**
- Planned milestone `m1` ended yesterday and was never kicked off; active milestone `m2` ends next month

**Steps:**
1. Request `GET /api/overview`

**Expected:**
- The `milestone` of the project is `m1`
