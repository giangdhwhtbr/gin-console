# TC-BEADS-067: Merge gate is never ready

- **REQ:** REQ-BEADS-007@d68de99d
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-46-49-api
- **Checked:** 2d0a0f3e

**Preconditions:**
- Project `alpha` has an open bead `g-1` titled `external: .planning/plans/p.md#2` without blockers

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads?project=alpha`

**Expected:**
- `g-1` has `ready` false and `blocked` false
