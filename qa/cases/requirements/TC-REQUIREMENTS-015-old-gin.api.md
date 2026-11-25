# TC-REQUIREMENTS-015: Old gin

- **REQ:** REQ-REQUIREMENTS-005@d6f45620
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-25-57-api
- **Checked:** caea9cd6

**Preconditions:**
- The installed gin rejects `specs trace --all`

**Steps:**
1. Send `GET /api/requirements?project=proj`

**Expected:**
- The response is 502 with `error` and the cause `outdated`
