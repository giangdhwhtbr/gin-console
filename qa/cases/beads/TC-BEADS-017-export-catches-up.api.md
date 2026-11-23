# TC-BEADS-017: Export catches up

- **REQ:** REQ-BEADS-013@c0cfe2a2
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-46-49-api
- **Checked:** 68958957

**Preconditions:**
- Project P whose export is stale (manifest changed, file not)

**Steps:**
1. Write `issues.jsonl` again
2. Request `GET /api/projects/beads` at once

**Expected:**
- The file was read again
- `beads.stale` of P is `false`
