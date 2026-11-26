# TC-REQUIREMENTS-006: No case

- **REQ:** REQ-REQUIREMENTS-002@bc229001
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-33-21-api
- **Checked:** ee11eb0c

**Preconditions:**
- A living requirement has no case and one test file

**Steps:**
1. Send `GET /api/requirements?project=proj`

**Expected:**
- The status is `untested` with the reason `no case`
