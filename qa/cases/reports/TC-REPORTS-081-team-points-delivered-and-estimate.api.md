# TC-REPORTS-081: Team points delivered and estimate accuracy

- **REQ:** REQ-REPORTS-034@f7f0b4f1
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-24T03-52-06-api
- **Checked:** 5452b653

**Preconditions:**
- Project `alpha` with milestone `m1` (`planned_days_per_point: 1.5`) having closed epic `e-a` (5 points, 6 working days from `started_at` to `closed_at`) and closed epic `e-b` (3 points, 4 working days)
- Project `alpha` also has milestone `m2` (no `planned_days_per_point`) with closed epic `e-1` (8 points, 4 closed tracks: 3 assigned to `ann`, 1 to `bao@example.com`) and closed epic `e-2` (3 points, no tracks, assigned to `chi`)

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha&milestone=m2`
2. Send `GET /api/reports/team?project=alpha&milestone=m1`
3. Send `GET /api/reports/team?project=alpha&days=30`

**Expected:**
- For `m2`, `ann` has `points_delivered` 6, `bao` 2, `chi` 3, team 11, and `accuracy` is `null` for team and every member
- For `m1`, `team.accuracy` is 1.2
- For 30 days, `accuracy` is `null` for team and every member
