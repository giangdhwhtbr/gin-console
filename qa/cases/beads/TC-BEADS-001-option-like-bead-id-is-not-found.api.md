# TC-BEADS-001: Option-like bead id is not found

- **REQ:** REQ-BEADS-003@a779b303
- **Priority:** high

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
