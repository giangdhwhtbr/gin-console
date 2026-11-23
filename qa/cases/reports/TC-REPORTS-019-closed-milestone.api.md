# TC-REPORTS-019: Closed milestone

- **REQ:** REQ-REPORTS-010@5a79bc07
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** bc07e9cf

**Preconditions:**
- Closed milestone `m1`, a milestone from 2026-10-05 to 2026-10-30 closed on 2026-11-03 with 58 closed beads, 7 of them closed after 2026-10-30

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha&milestone=m1`

**Expected:**
- `team.throughput` is 13.2, `pace_needed` is `null` and `on_time` is 51 ÷ 58
