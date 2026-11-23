# TC-SERVER-009: No active epics

- **REQ:** REQ-SERVER-006@ec9c5c6d
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** d4d670f2

**Preconditions:**
- Project `alpha` has no in_progress epic and no open epic that is ready

**Test data:**
- None

**Steps:**
1. Send `GET /api/projects/beads`

**Expected:**
- `beads.epics` of `alpha` is an empty list
