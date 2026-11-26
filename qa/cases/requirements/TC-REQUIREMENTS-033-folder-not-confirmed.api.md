# TC-REQUIREMENTS-033: Folder not confirmed

- **REQ:** REQ-REQUIREMENTS-010@f4cb8de5
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T23-57-24-api
- **Checked:** 38bdcd32

**Preconditions:**
- A folder `ui/2026-11-01` has `Confirmed: no` and holds `index.html`

**Steps:**
1. Send `GET /api/requirements/mockups/proj/files/ui/2026-11-01/index.html`

**Expected:**
- The response is 404
