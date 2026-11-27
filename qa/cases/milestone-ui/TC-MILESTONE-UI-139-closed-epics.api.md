# TC-MILESTONE-UI-139: Closed epics

- **REQ:** REQ-MILESTONE-UI-008@4b68a946
- **Priority:** high

**Preconditions:**
- Project `P` whose Beads export holds closed epic `e-2` labelled `roadmap` under milestone `m1`, started 2026-10-12 and closed 2026-10-28
- Closed epic `e-3` labelled `roadmap` without `started_at`, created 2026-10-01 and closed 2026-10-09
- Closed epic `e-4` without the `roadmap` label

**Test data:**
- None

**Steps:**
1. Request `GET /api/milestones?project=P`

**Expected:**
- `closed_epics` holds `{id: e-2, milestone: m1, start: 2026-10-12, end: 2026-10-28}` and `{id: e-3, milestone: null, start: 2026-10-01, end: 2026-10-09}` with their titles
- `e-4` is not in `closed_epics`
