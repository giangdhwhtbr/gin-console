# TC-REPORTS-077: Status KPIs week-ago deltas, oldest wait and kickoff week

- **REQ:** REQ-REPORTS-023@2a187853
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-24T03-52-06-api
- **Checked:** 7d04df84

**Preconditions:**
- Project `alpha`, `today` Monday 2026-11-23 (week-ago day 2026-11-16)
- Active milestone `m2` (kickoff 2026-11-02, end 2026-12-02) with 10 scope beads closed by 16 Nov (one reopened on 13 Nov, one reopened on 19 Nov) and 3 more closed after 16 Nov, plus open scope beads including `t-3` blocked by open bead `t-9` via a `blocks` dependency created 4 working days ago and `t-4` with status `blocked` updated 2 working days ago
- Active milestone `m4` kicked off 3 days ago (2026-11-20)

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/status?project=alpha&milestone=m2`
2. Send `GET /api/reports/status?project=alpha&milestone=m4`

**Expected:**
- For `m2`, `kpis.beads.done_week_ago` is 10 and `kpis.beads.done` is 13
- For `m2`, `kpis.points` matches the first (`at_kickoff`) and last (`done`, `scope`) burn-up entries
- For `m2`, `kpis.blocked` has `count` 2 and `oldest_days` 4
- For `m2`, `kpis.rework.rate_week_ago` is 0.1
- For `m4`, every `*_week_ago` field in `kpis` is `null`
