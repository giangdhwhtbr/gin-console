# TC-REQUIREMENTS-002: Trace warning

- **REQ:** REQ-REQUIREMENTS-001@d2023c02
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-33-21-api
- **Checked:** 965d4271

**Preconditions:**
- The trace has null `beads` and the warning `beads: bd exited 1`

**Steps:**
1. Send `GET /api/requirements?project=proj`

**Expected:**
- The response is 200
- `beads` of the requirement is null
- The warning `beads: bd exited 1` is returned
