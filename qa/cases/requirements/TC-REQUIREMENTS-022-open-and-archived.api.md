# TC-REQUIREMENTS-022: Open and archived

- **REQ:** REQ-REQUIREMENTS-007@c7879d3e
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-25-57-api
- **Checked:** 51a12b4d

**Preconditions:**
- `docs/changes` holds one open change and `docs/changes/archive` holds two archived ones with different date prefixes

**Steps:**
1. Send `GET /api/requirements/changes?project=proj`

**Expected:**
- The open change is first and the newest archived one second
- Each row has its folder, epic, title and, from the trace, its counts and sign-off
