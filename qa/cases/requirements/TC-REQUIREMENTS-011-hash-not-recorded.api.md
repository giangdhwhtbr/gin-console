# TC-REQUIREMENTS-011: Hash not recorded

- **REQ:** REQ-REQUIREMENTS-003@f6da60b3
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-33-21-api
- **Checked:** b25fee6c

**Preconditions:**
- A requirement has a sign-off whose `current` is null and which is not waived

**Steps:**
1. Send `GET /api/requirements?project=proj`

**Expected:**
- The sign-off state is `unknown version`
