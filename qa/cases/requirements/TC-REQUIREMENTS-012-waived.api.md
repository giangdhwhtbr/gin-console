# TC-REQUIREMENTS-012: Waived

- **REQ:** REQ-REQUIREMENTS-003@f6da60b3
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-25-57-api
- **Checked:** 1526b7d6

**Preconditions:**
- A requirement has a sign-off with `waived` true and the reason `legacy` in `evidence`

**Steps:**
1. Send `GET /api/requirements?project=proj`

**Expected:**
- The sign-off state is `waived`
- The evidence holds the reason `legacy`
