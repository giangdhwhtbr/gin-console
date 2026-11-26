# TC-REQUIREMENTS-003: Legacy layout

- **REQ:** REQ-REQUIREMENTS-001@d2023c02
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-33-21-api
- **Checked:** 3697308a

**Preconditions:**
- The trace has the layout `legacy` and no requirements

**Steps:**
1. Send `GET /api/requirements?project=proj`

**Expected:**
- The response is 200 with the layout `legacy` and an empty list
