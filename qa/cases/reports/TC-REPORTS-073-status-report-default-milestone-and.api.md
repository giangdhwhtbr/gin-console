# TC-REPORTS-073: Status report default milestone and period

- **REQ:** REQ-REPORTS-020@ed25d604
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-24T03-52-06-api
- **Checked:** 67ffacd1

**Preconditions:**
- Project `alpha` has closed milestone `m1`, active milestone `m2` (with kickoff) and planned milestone `m3`
- Project `alpha` also has 5 non-milestone beads closed in the last 30 days, one of them reopened once in `interactions.jsonl`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/status?project=alpha`
2. Send `GET /api/reports/status?project=alpha` again 20 seconds later
3. Send `GET /api/reports/status?project=alpha&days=30`

**Expected:**
- After step 1, `milestone` is `m2`, `days` is `null`, and `period`, `kpis`, `burnup`, `changes`, `risks` and `epics` describe `m2`
- After step 2, no `gin` or `bd` process starts and the same `generated_at` is returned
- After step 3, `milestone` and `period` are `null`, `days` is 30, `kpis.beads.done` is 5, `kpis.rework.rate` is 0.2, and `burnup`, `changes.items`, `risks.blocked`, `risks.unestimated` and `epics` are empty
