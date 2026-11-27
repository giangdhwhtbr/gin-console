# TC-REQUIREMENTS-028: Not confirmed

- **REQ:** REQ-REQUIREMENTS-009@c0995b92
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-33-21-api
- **Checked:** c6764f12

**Preconditions:**
- A folder under `docs/specs/ui/assets` has `Confirmed: no` in `description.md`

**Steps:**
1. Send `GET /api/requirements/mockups?project=proj`

**Expected:**
- The folder is not returned
