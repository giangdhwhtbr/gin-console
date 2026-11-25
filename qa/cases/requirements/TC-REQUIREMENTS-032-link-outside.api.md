# TC-REQUIREMENTS-032: Link outside

- **REQ:** REQ-REQUIREMENTS-010@89434c84
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-25-57-api
- **Checked:** 35c42bab

**Preconditions:**
- A confirmed folder holds a symbolic link to a file outside it

**Steps:**
1. Send `GET /api/requirements/mockups/proj/files/ui/2026-11-22/link.html`

**Expected:**
- The response is 404
- The target file is not served
