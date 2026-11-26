# TC-REPORTS-091: Bugs report scope and period

- **REQ:** REQ-REPORTS-039@542f0964
- **Priority:** high

**Preconditions:**
- Project `alpha` with `today` 2026-11-25, the active milestone `m2` (2026-11-16 to 2026-12-04), the closed milestone `m1` (2026-10-05 to 2026-10-30) and the planned milestone `m3` starting 2026-12-07
- `alpha` has one open bug `b1`, a child of epic `e1` titled "Epic one", created on 2026-11-20
- Project `beta` has no milestones and one open bug

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/bugs?project=alpha`
2. Send `GET /api/reports/bugs?project=alpha&milestone=m1`
3. Send `GET /api/reports/bugs?project=alpha&days=7`
4. Send `GET /api/reports/bugs?project=alpha&milestone=m3`
5. Send `GET /api/reports/bugs?project=beta`

**Expected:**
- After step 1, `milestone` is `m2`, `days` is `null` and `period` is 2026-11-16 to 2026-11-25
- After step 2, `period` is 2026-10-05 to 2026-10-30
- After step 3, `milestone` is `null`, `days` is 7 and `period` is 2026-11-18 to 2026-11-25
- After step 4, `period` is `null`, `weeks` is empty, `figures.opened` and `figures.closed` are 0, and `open` holds `b1`
- After step 5, `milestone`, `days` and `period` are `null`, and `open` holds the bug
- A merge gate bead of type `bug` is not counted as a bug
