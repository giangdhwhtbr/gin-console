# TC-BEADS-016: Write not exported marks the beads stale

- **REQ:** REQ-BEADS-013@a896831f
- **Priority:** high

**Preconditions:**
- Project P whose file was read when the manifest held `root-1`

**Steps:**
1. Write the manifest so it holds `root-2`, leaving `issues.jsonl` unchanged
2. Wait for the 5-second reuse of `GET /api/projects` (REQ-SERVER-008) to pass
3. Request `GET /api/projects`

**Expected:**
- `beads.stale` of P is `true`
- The counts of P are those of the file
