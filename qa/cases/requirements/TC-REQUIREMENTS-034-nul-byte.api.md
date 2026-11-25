# TC-REQUIREMENTS-034: NUL byte

- **REQ:** REQ-REQUIREMENTS-010@89434c84
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-33-21-api
- **Checked:** 83c791f6

**Preconditions:**
- A confirmed folder holds `index.html`

**Steps:**
1. Send `GET /api/requirements/mockups/proj/files/ui/2026-11-22/index.html%00`

**Expected:**
- The response is 404
