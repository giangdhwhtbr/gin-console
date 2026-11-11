# TC-BEADS-018: No manifest is never stale

- **REQ:** REQ-BEADS-013@083a7f3b
- **Priority:** medium

**Preconditions:**
- Project P with `.beads/issues.jsonl` and no `.beads/embeddeddolt` manifest

**Steps:**
1. Request `GET /api/projects`

**Expected:**
- `beads.stale` of P is `false`
