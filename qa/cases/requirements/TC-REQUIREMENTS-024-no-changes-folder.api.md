# TC-REQUIREMENTS-024: No changes folder

- **REQ:** REQ-REQUIREMENTS-007@c7879d3e
- **Priority:** low
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-25-57-api
- **Checked:** 8c5e9e6a

**Preconditions:**
- Project `empty` has no `docs/changes`

**Steps:**
1. Send `GET /api/requirements/changes?project=empty`

**Expected:**
- The response is 200 with an empty list
