# TC-BEADS-019: Project beads without reuse

- **REQ:** REQ-BEADS-013@a896831f
- **Priority:** high

**Preconditions:**
- Project P whose file was read when the manifest held `root-1`

**Steps:**
1. Write the manifest so it holds `root-2`, leaving `issues.jsonl` unchanged
2. Request `GET /api/projects/beads` at once

**Expected:**
- `beads.stale` of P is `true`
