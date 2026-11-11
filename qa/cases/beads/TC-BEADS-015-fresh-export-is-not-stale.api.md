# TC-BEADS-015: Fresh export is not stale

- **REQ:** REQ-BEADS-013@a896831f
- **Priority:** high

**Preconditions:**
- Project P whose file was read when `.beads/embeddeddolt/*/.dolt/noms/manifest` held `root-1`; the manifest still holds `root-1`

**Steps:**
1. Request `GET /api/projects/beads`

**Expected:**
- `beads.stale` of P is `false`
