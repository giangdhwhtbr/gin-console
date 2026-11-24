# TC-REPORTS-078: Changes since kickoff list scope events and ignore splits

- **REQ:** REQ-REPORTS-024@35ea3408
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-24T03-52-06-api
- **Checked:** 6c63f881

**Preconditions:**
- Project `alpha`, `today` 2026-11-23, active milestone `m2` kicked off 2026-11-11
- Epic `e-1` split into 4 tracks on 12 Nov
- Epic `e-2` re-estimated from 5 to 8 on 16 Nov
- Epic `e-4` moved into `m2` on 18 Nov with 3 points
- Bug `b-1` created 18 Nov under track `t-7` of `e-2`, assigned to `chi`
- Epic `e-5` of 5 points moved from `m2` to `m3` on 20 Nov

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/status?project=alpha&milestone=m2`

**Expected:**
- `changes.items` is ordered newest `day` first and then by `id`: `e-5` (`epic_removed`, 5 points) on 20 Nov, then `b-1` (`bug_added`, epic `e-2`, person `chi`) and `e-4` (`epic_added`, 3 points) on 18 Nov, then `e-2` (`re_estimated`, `from` 5, `to` 8) on 16 Nov
- No item names `e-1` or its tracks created on 12 Nov
