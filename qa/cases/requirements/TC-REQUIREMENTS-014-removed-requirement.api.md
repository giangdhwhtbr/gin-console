# TC-REQUIREMENTS-014: Removed requirement

- **REQ:** REQ-REQUIREMENTS-004@4b7e40e2
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-33-21-api
- **Checked:** 082f07a5

**Preconditions:**
- `REQ-AUTH-099` is known only to the trace

**Steps:**
1. Send `GET /api/requirements/reqs/proj/REQ-AUTH-099`

**Expected:**
- The response is 404
