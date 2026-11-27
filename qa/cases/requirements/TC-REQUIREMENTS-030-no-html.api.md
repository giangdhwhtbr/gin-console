# TC-REQUIREMENTS-030: No HTML

- **REQ:** REQ-REQUIREMENTS-009@c0995b92
- **Priority:** low
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-33-21-api
- **Checked:** e0b7ae3a

**Preconditions:**
- A confirmed folder holds only PNG files

**Steps:**
1. Send `GET /api/requirements/mockups?project=proj`

**Expected:**
- The folder is returned with its images and an empty HTML list
