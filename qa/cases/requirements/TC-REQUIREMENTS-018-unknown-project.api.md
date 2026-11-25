# TC-REQUIREMENTS-018: Unknown project

- **REQ:** REQ-REQUIREMENTS-005@d6f45620
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-25-57-api
- **Checked:** 77c6d042

**Preconditions:**
- No project is named `nope`; project `gone` is configured but its directory is missing

**Steps:**
1. Send `GET /api/requirements?project=nope`
2. Send `GET /api/requirements?project=gone`
3. Send `GET /api/requirements/reqs/nope/REQ-AUTH-001`

**Expected:**
- Each response is 404
