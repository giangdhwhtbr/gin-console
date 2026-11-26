# TC-REQUIREMENTS-027: Unknown

- **REQ:** REQ-REQUIREMENTS-008@fec00dd2
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-33-21-api
- **Checked:** 75f08020

**Preconditions:**
- No folder is named `nope`

**Steps:**
1. Send `GET /api/requirements/changes/proj/nope`

**Expected:**
- The response is 404
