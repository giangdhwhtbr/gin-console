# TC-UI-283: My work same handle at another domain

- **REQ:** REQ-UI-100@6b611f17
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 9ed83363

**Preconditions:**
- Signed-in email `giangdhwhtbr@gmail.com` (localStorage `gin-console.email`)
- Project A, the current project, has a ready bead assigned to `giangdhwhtbr@other.example`

**Steps:**
1. Open /my-tasks?project=A

**Expected:**
- The bead assigned to `giangdhwhtbr@other.example` is in "Assigned to me"
