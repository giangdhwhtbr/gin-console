# TC-REQUIREMENTS-005: Outdated case

- **REQ:** REQ-REQUIREMENTS-002@bc229001
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-25-57-api
- **Checked:** 00b00684

**Preconditions:**
- A living requirement has one passed case and one `outdated` case

**Steps:**
1. Send `GET /api/requirements?project=proj`

**Expected:**
- The status is `untested` with the reason `outdated`
