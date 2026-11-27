# TC-SERVER-008: Counts and active epics

- **REQ:** REQ-SERVER-006@ec9c5c6d
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-26T14-14-56-api
- **Checked:** ce7bc2ac

**Preconditions:**
- Project `alpha` has 3 open, 1 in_progress and 2 ready issues
- `alpha` has epic `e-1` in_progress and epic `e-2` open and ready

**Test data:**
- None

**Steps:**
1. Send `GET /api/projects/beads`

**Expected:**
- `alpha` has a `beads` object with those counts
- `beads.epics` lists `e-1` and `e-2`, each with `id`, `title` and `status`
