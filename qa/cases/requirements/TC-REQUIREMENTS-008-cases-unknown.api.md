# TC-REQUIREMENTS-008: Cases unknown

- **REQ:** REQ-REQUIREMENTS-002@bc229001
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-25-57-api
- **Checked:** dd06b5d1

**Preconditions:**
- A living requirement has closed beads and null cases

**Steps:**
1. Send `GET /api/requirements?project=proj`

**Expected:**
- The status is `unknown` with the reason `cases unknown`
