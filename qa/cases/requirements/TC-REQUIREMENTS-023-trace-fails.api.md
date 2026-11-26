# TC-REQUIREMENTS-023: Trace fails

- **REQ:** REQ-REQUIREMENTS-007@c7879d3e
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-33-21-api
- **Checked:** 39d8bb67

**Preconditions:**
- The trace fails

**Steps:**
1. Send `GET /api/requirements/changes?project=proj`

**Expected:**
- The response is 200 with the changes
- Sign-offs and counts are null
- `error` holds the failure
