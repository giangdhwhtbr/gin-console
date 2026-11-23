# TC-BEADS-004: No bd process is started

- **REQ:** REQ-BEADS-003@1b0ec299
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** 08f28379

**Preconditions:**
- Project P with `.beads/issues.jsonl`
- The `bd` command is replaced by a fake that records every call

**Steps:**
1. Request the list of beads of P
2. Request one bead of P
3. Request the comments of that bead
4. Request `GET /api/projects/beads`
5. Request the report of P

**Expected:**
- All responses succeed
- The fake `bd` recorded no call
