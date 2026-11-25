# TC-OVERVIEW-014: Only closed milestones

- **REQ:** REQ-OVERVIEW-006@eff40ea7
- **Priority:** medium

**Preconditions:**
- The only milestone of the project is closed

**Steps:**
1. Request `GET /api/overview`

**Expected:**
- The `milestone` of the project is `null`
