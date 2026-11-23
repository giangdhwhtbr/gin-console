# TC-BEADS-015: Fresh export is not stale

- **REQ:** REQ-BEADS-013@c0cfe2a2
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** d7956f60

**Preconditions:**
- Project P whose file was read when `.beads/embeddeddolt/*/.dolt/noms/manifest` held `root-1`; the manifest still holds `root-1`

**Steps:**
1. Request `GET /api/projects/beads`

**Expected:**
- `beads.stale` of P is `false`
