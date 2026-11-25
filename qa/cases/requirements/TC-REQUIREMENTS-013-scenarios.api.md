# TC-REQUIREMENTS-013: Scenarios

- **REQ:** REQ-REQUIREMENTS-004@4b7e40e2
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-33-21-api
- **Checked:** b09ce0d1

**Preconditions:**
- `REQ-AUTH-001` has two scenarios in the living spec

**Steps:**
1. Send `GET /api/requirements/reqs/proj/REQ-AUTH-001`

**Expected:**
- Both scenarios are returned with their given, when and then lines
