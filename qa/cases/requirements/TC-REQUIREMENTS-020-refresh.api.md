# TC-REQUIREMENTS-020: Refresh

- **REQ:** REQ-REQUIREMENTS-006@279f125e
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-33-21-api
- **Checked:** e59bcd6c

**Preconditions:**
- The trace answer of `proj` is kept

**Steps:**
1. Send `POST /api/refresh`
2. Send `GET /api/requirements?project=proj`

**Expected:**
- `gin specs trace` runs again
