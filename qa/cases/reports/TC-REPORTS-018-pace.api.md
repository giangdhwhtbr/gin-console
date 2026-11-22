# TC-REPORTS-018: Pace

- **REQ:** REQ-REPORTS-010@5a79bc07
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T08-49-45-api
- **Checked:** df4f52d4

**Preconditions:**
- An open milestone from 2026-11-02 to 2026-11-27, `today` 2026-11-12, 64 scope beads with 27 closed of which 18 closed from 2026-11-06 to 2026-11-12

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha`

**Expected:**
- `team.throughput` is 18, `pace` 3.6, `days_left` 11, `pace_needed` 37 ÷ 11 and `elapsed` 9
