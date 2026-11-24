# TC-REPORTS-075: Epic milestone membership and points history

- **REQ:** REQ-REPORTS-021@134492ab
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-24T03-52-06-api
- **Checked:** d07b64df

**Preconditions:**
- Project `alpha` has active milestone `m2` (kickoff 2026-11-09) and planned milestone `m3`, `today` is 2026-11-23
- Epic `e-4` created 2 Nov with `milestone_moves` `[{from: null, to: m2, at: 2026-11-18T09:00:00Z}]` and `points: 3`
- Epic `e-5` created 1 Nov with `milestone_moves` `[{from: m2, to: m3, at: 2026-11-20T10:00:00Z}]` and `points: 5`
- Epic `e-2` under `m2` with `points_history` `[{from: null, to: 5, at: 2026-11-10T08:00:00Z}, {from: 5, to: 8, at: 2026-11-16T08:00:00Z}]`
- Epic `e-6` under `m2` created 3 Nov with `points: 3` and no history
- Epic `e-7` under `m2` created 3 Nov with `points: 5`, `points_history: "oops"` and `milestone_moves: [{"to": "m3"}]` (missing `at`)

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/status?project=alpha&milestone=m2`

**Expected:**
- Response is 200 (broken history on `e-7` does not fail the report)
- On 9 Nov `scope_points` includes `e-5` (5), `e-6` (3) and `e-7` (5) = 13 (`e-2` has no points yet, `e-4` not in `m2` yet)
- On 10 Nov `scope_points` rises by 5 (`e-2` estimated at 5) to 18, and on 16 Nov rises by 3 (`e-2` re-estimated to 8) to 21
- On 18 Nov `scope_points` rises by 3 (`e-4` moved in) to 24
- On 20 Nov `scope_points` drops by 5 (`e-5` moved out to `m3`) to 19
- `epics` holds `e-2`, `e-4`, `e-6` and `e-7`, and does not hold `e-5`
