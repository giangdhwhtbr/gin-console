# TC-REPORTS-080: Status epic rows include open and closed epics

- **REQ:** REQ-REPORTS-026@f05d3961
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-24T03-52-06-api
- **Checked:** 33f5683a

**Preconditions:**
- Project `alpha`, active milestone `m2`
- Open epic `e-1` of 8 points assigned to `lead@example.com`, with 4 tracks of which 2 are closed
- Closed epic `e-3` without an assignee, closed on 2026-11-20

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/status?project=alpha&milestone=m2`

**Expected:**
- `epics` holds `e-1` with `points` 8, `person` `lead`, `closed_on` `null`, `child_counts.closed` 2 and `child_counts.total` 4
- `epics` holds `e-3` with `person` `Unassigned` and `closed_on` `2026-11-20`
