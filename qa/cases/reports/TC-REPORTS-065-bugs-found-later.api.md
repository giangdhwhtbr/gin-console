# TC-REPORTS-065: Bugs found later

- **REQ:** REQ-REPORTS-019@3228f7dd
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T08-49-45-api
- **Checked:** 010ad877

**Preconditions:**
- Bead `a-1`, a closed bug `a-9` and an open bug `a-10` with `discovered-from` dependencies on `a-1`, and a task `a-11` with one too
- No reopen of `a-1` in the log

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=alpha`

**Expected:**
- `a-1` has `bugs` 2 and `rework` 2
