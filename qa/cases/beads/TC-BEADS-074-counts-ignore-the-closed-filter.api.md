# TC-BEADS-074: Counts ignore the closed filter

- **REQ:** REQ-BEADS-022@5b74cbda
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T04-35-00-api
- **Checked:** 2071f18e

**Preconditions:**
- Project `alpha` whose `bd export` holds epic `e-1` with tracks `t-1` and `t-2` (closed) and `t-3` (open), the closed prep task `p-1` labelled `prep`, and the merge gate `g-1` titled `external: .planning/plans/p.md#1`

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads?project=alpha`
2. Send `GET /api/beads?project=alpha&closed=1`

**Expected:**
- After step 1, the list does not hold `t-1`, `t-2` or `p-1`
- After step 1, `e-1` has `child_counts` `{total: 3, closed: 2, in_progress: 0, blocked: 0, ready: 1, deferred: 0, prep_total: 1, prep_closed: 1}`
- After step 2, `e-1` has the same `child_counts`
- Neither `t-3` nor `g-1` changes `prep_total`; `g-1` is not counted in `total`
