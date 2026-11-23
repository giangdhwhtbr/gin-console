# TC-BEADS-002: Closed value that is not a flag is ignored

- **REQ:** REQ-BEADS-003@1b0ec299
- **Priority:** low
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** 5cde571c

**Preconditions:**
- Project P with `.beads/issues.jsonl` holding one open and one closed bead

**Test data:**
- Query values: `closed=../x`, `closed=true`

**Steps:**
1. Request `GET /api/beads/P?closed=../x`
2. Request `GET /api/beads/P?closed=true`

**Expected:**
- Both responses are 200
- Neither list contains the closed bead
