# TC-MILESTONE-UI-117: Milestone list counts epics by state

- **REQ:** REQ-MILESTONE-UI-025@5673e6e2
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-49-57-api
- **Checked:** 301631c0

**Preconditions:**
- Project `alpha` whose `gin milestone list` reports milestone `m1` with `epics` `{total: 4, closed: 1}`, and whose `bd export` holds the milestone bead `m1` with the epics `e-1` (closed), `e-2` (in progress), `e-3` (open, blocked by an open bead) and `e-4` (open and ready)

**Test data:**
- None

**Steps:**
1. Send `GET /api/milestones?project=alpha`

**Expected:**
- `m1` has `epics` `{total: 4, closed: 1, in_progress: 1, blocked: 1, ready: 1, deferred: 0}`
