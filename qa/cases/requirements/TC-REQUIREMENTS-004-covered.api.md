# TC-REQUIREMENTS-004: Covered

- **REQ:** REQ-REQUIREMENTS-002@bc229001
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-25-57-api
- **Checked:** 17907d9d

**Preconditions:**
- A living requirement has closed beads and two cases with the effective result `passed`

**Steps:**
1. Send `GET /api/requirements?project=proj`

**Expected:**
- The status is `covered` and it has no reasons
