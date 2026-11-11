# TC-SERVER-003: Unreadable beads are an error in the entry

- **REQ:** REQ-SERVER-010@bdb24d2b
- **Priority:** medium

**Preconditions:**
- Project P1 exists without `.beads/issues.jsonl`; project P2 exists with the file

**Steps:**
1. Request `GET /api/projects/beads`

**Expected:**
- `beads` of P1 is `{"error": "<the REQ-BEADS-005 message>"}`
- P2 has its summary
