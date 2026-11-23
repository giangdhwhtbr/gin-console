# TC-BEADS-016: Write not exported marks the beads stale

- **REQ:** REQ-BEADS-013@c0cfe2a2
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-46-49-api
- **Checked:** 525601d1

**Preconditions:**
- Project P whose file was read when the manifest held `root-1`

**Steps:**
1. Write the manifest so it holds `root-2`, leaving `issues.jsonl` unchanged
2. Request `GET /api/projects/beads` at once

**Expected:**
- `beads.stale` of P is `true`
- The counts of P are those of the file
