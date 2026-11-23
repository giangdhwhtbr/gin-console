# TC-REPORTS-064: Reopens counted

- **REQ:** REQ-REPORTS-019@4dd40cfb
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** b42c3ed4

**Preconditions:**
- The `.beads/interactions.jsonl` of `alpha` holds, for bead `a-1`, status changes `in_progress`→`closed`, `closed`→`open`, `open`→`closed` and `closed`→`in_progress`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=alpha`

**Expected:**
- `a-1` has `reopens` 2
