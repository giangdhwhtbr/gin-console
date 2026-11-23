# TC-BEADS-001: Option-like bead id is not found

- **REQ:** REQ-BEADS-003@1b0ec299
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** cae8b7cf

**Preconditions:**
- Project P with `.beads/issues.jsonl` holding at least one bead

**Test data:**
- Ids: `--help`, `../x`

**Steps:**
1. Request `GET /api/beads/P/--help`
2. Request `GET /api/beads/P/..%2Fx`

**Expected:**
- Both responses are 404
- No file outside `.beads/issues.jsonl` was read
