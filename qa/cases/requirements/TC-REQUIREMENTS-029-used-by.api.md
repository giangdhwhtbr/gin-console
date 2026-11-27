# TC-REQUIREMENTS-029: Used by

- **REQ:** REQ-REQUIREMENTS-009@c0995b92
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-33-21-api
- **Checked:** c8633516

**Preconditions:**
- `REQ-UI-129` has the `Source:` line `../ui/assets/2026-11-22/index.html#reports`

**Steps:**
1. Send `GET /api/requirements/mockups?project=proj`

**Expected:**
- The folder `2026-11-22` of `ui` lists `REQ-UI-129`
