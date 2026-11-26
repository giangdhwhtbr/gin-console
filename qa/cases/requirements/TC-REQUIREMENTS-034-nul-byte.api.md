# TC-REQUIREMENTS-034: NUL byte

- **REQ:** REQ-REQUIREMENTS-010@f4cb8de5
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T23-57-24-api
- **Checked:** 08b6ae3b

**Preconditions:**
- A confirmed folder holds `index.html`

**Steps:**
1. Send `GET /api/requirements/mockups/proj/files/ui/2026-11-22/index.html%00`

**Expected:**
- The response is 404
