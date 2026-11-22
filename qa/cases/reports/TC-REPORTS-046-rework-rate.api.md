# TC-REPORTS-046: Rework rate

- **REQ:** REQ-REPORTS-005@30b969a9
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T08-49-45-api
- **Checked:** 665251bc

**Preconditions:**
- `ann` closed 4 beads in `alpha`, one of them reopened once in the interaction log

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=alpha`

**Expected:**
- `quality.members` holds `ann` with `closed` 4, `reopens` 1 and `rework_rate` 0.25
