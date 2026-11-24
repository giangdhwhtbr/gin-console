# TC-REPORTS-076: Burn-up scope, done points and boundaries

- **REQ:** REQ-REPORTS-022@23aaf03a
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-24T03-52-06-api
- **Checked:** d9c75d6c

**Preconditions:**
- Project `alpha` with `today` 2026-11-23
- Active milestone `m2` (kickoff 2026-11-11, end 2026-12-02) with epic `e-1` (8 points, split on 12 Nov into 4 tracks, 2 closed on 13 Nov, epic closed on 18 Nov) and epic `e-2` (re-estimated from 5 to 8 on 16 Nov)
- Closed milestone `m1` (kickoff 2026-10-05, end 2026-10-30, closed 2026-11-03)
- Planned milestone `m3` (start 2026-12-18, end 2026-12-31, no kickoff)

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/status?project=alpha&milestone=m2`
2. Send `GET /api/reports/status?project=alpha&milestone=m1`
3. Send `GET /api/reports/status?project=alpha&milestone=m3`

**Expected:**
- For `m2`, `scope_points` is the same on 11 Nov and 12 Nov (splitting does not change scope)
- For `m2`, `e-1` contributes 4 to `done_points` on 13 Nov and 8 on 18 Nov
- For `m2`, `scope_points` rises by 3 on 16 Nov when `e-2` is re-estimated from 5 to 8
- For `m1`, the last `burnup` entry is `2026-11-03`
- For `m3`, `burnup` is empty
