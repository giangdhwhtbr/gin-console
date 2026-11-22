# TC-UI-283: My Tasks same handle at another domain

- **REQ:** REQ-UI-100@906b78b7
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 9bba4197

**Preconditions:**
- Signed-in email `giangdhwhtbr@gmail.com` (localStorage `gin-console.email`)
- Project A has an open bead assigned to `giangdhwhtbr@other.example`

**Steps:**
1. Open /my-tasks

**Expected:**
- The bead assigned to `giangdhwhtbr@other.example` is listed
