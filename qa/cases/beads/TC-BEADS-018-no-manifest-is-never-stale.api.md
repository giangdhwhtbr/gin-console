# TC-BEADS-018: No manifest is never stale

- **REQ:** REQ-BEADS-013@c0cfe2a2
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-46-49-api
- **Checked:** 758cc1bd

**Preconditions:**
- Project P with `.beads/issues.jsonl` and no `.beads/embeddeddolt` manifest

**Steps:**
1. Request `GET /api/projects/beads`

**Expected:**
- `beads.stale` of P is `false`
