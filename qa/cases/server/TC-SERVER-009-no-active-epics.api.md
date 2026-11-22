# TC-SERVER-009: No active epics

- **REQ:** REQ-SERVER-006@ea632040
- **Priority:** medium

**Preconditions:**
- Project `alpha` has no in_progress epic and no open epic that is ready

**Test data:**
- None

**Steps:**
1. Send `GET /api/projects`

**Expected:**
- `beads.epics` of `alpha` is an empty list
