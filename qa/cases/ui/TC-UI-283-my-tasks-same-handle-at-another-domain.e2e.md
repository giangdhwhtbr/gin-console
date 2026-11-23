# TC-UI-283: My Tasks same handle at another domain

- **REQ:** REQ-UI-100@14d1209a
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 9ed83363

**Preconditions:**
- Signed-in email `giangdhwhtbr@gmail.com` (localStorage `gin-console.email`)
- Project A, the current project, has an open bead assigned to `giangdhwhtbr@other.example`

**Steps:**
1. Open /my-tasks?project=A

**Expected:**
- The bead assigned to `giangdhwhtbr@other.example` is listed
