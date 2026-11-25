# TC-REQUIREMENTS-007: Failing beats building

- **REQ:** REQ-REQUIREMENTS-002@bc229001
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-33-21-api
- **Checked:** 0637701c

**Preconditions:**
- A requirement has a case with the effective result `failed` and an open bead

**Steps:**
1. Send `GET /api/requirements?project=proj`

**Expected:**
- The status is `failing` with the reason `failed`
