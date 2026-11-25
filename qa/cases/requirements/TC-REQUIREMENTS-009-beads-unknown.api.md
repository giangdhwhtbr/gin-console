# TC-REQUIREMENTS-009: Beads unknown

- **REQ:** REQ-REQUIREMENTS-002@bc229001
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-33-21-api
- **Checked:** a40bb166

**Preconditions:**
- A living requirement has null beads and one passed case

**Steps:**
1. Send `GET /api/requirements?project=proj`

**Expected:**
- The status is `covered`
