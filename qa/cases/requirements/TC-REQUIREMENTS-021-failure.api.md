# TC-REQUIREMENTS-021: Failure

- **REQ:** REQ-REQUIREMENTS-006@279f125e
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-33-21-api
- **Checked:** fea56672

**Preconditions:**
- The trace fails

**Steps:**
1. Send `GET /api/requirements?project=proj` twice

**Expected:**
- `gin specs trace` runs for each request
