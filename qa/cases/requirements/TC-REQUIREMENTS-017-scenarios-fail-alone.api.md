# TC-REQUIREMENTS-017: Scenarios fail alone

- **REQ:** REQ-REQUIREMENTS-005@d6f45620
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-33-21-api
- **Checked:** 3e6c37c8

**Preconditions:**
- `gin specs reqs` fails and the trace answers

**Steps:**
1. Send `GET /api/requirements?project=proj`
2. Send `GET /api/requirements/reqs/proj/REQ-AUTH-001`

**Expected:**
- The list is 200
- The scenarios request is 502
