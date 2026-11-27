# TC-MILESTONE-UI-140: Closed epics unreadable

- **REQ:** REQ-MILESTONE-UI-008@4b68a946
- **Priority:** medium

**Preconditions:**
- Project `P` whose `milestone list` succeeds and whose Beads export cannot be read

**Test data:**
- None

**Steps:**
1. Request `GET /api/milestones?project=P`

**Expected:**
- The response is 200
- `closed_epics` is null
