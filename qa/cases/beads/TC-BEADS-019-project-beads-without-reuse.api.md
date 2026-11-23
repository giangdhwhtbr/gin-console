# TC-BEADS-019: Project beads without reuse

- **REQ:** REQ-BEADS-013@c0cfe2a2
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-46-49-api
- **Checked:** 0d1ae84a

**Preconditions:**
- Project P whose file was read when the manifest held `root-1`

**Steps:**
1. Write the manifest so it holds `root-2`, leaving `issues.jsonl` unchanged
2. Request `GET /api/projects/beads` at once

**Expected:**
- `beads.stale` of P is `true`
