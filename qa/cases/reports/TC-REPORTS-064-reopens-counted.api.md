# TC-REPORTS-064: Reopens counted

- **REQ:** REQ-REPORTS-019@3228f7dd
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T08-49-45-api
- **Checked:** 32797f2c

**Preconditions:**
- The `.beads/interactions.jsonl` of `alpha` holds, for bead `a-1`, status changes `in_progress`→`closed`, `closed`→`open`, `open`→`closed` and `closed`→`in_progress`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=alpha`

**Expected:**
- `a-1` has `reopens` 2
