# TC-REQUIREMENTS-036: SVG

- **REQ:** REQ-REQUIREMENTS-011@9bc2cbb9
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-33-21-api
- **Checked:** ef172beb

**Preconditions:**
- A confirmed folder holds `pic.svg`

**Steps:**
1. Send `GET /api/requirements/mockups/proj/files/ui/2026-11-22/pic.svg`

**Expected:**
- The content type is `image/svg+xml`
- The response carries the same two headers
