# TC-BEADS-017: Export catches up

- **REQ:** REQ-BEADS-013@a896831f
- **Priority:** high

**Preconditions:**
- Project P whose export is stale (manifest changed, file not)

**Steps:**
1. Write `issues.jsonl` again
2. Request `GET /api/projects/beads`

**Expected:**
- The file was read again
- `beads.stale` of P is `false`
