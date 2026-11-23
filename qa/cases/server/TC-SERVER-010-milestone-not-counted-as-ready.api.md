# TC-SERVER-010: Milestone not counted as ready

- **REQ:** REQ-SERVER-006@ec9c5c6d
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** 09ef57a1

**Preconditions:**
- Project `alpha` has 2 ready issues and an open milestone `m-1` without blockers

**Test data:**
- None

**Steps:**
1. Send `GET /api/projects/beads`

**Expected:**
- `beads.ready` of `alpha` is 2
