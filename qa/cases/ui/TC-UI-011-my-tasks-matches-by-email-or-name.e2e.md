# TC-UI-011: My Tasks matches by email or name

- **REQ:** REQ-UI-100@14d1209a
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 3b9db449

**Preconditions:**
- Signed-in email `giangdhwhtbr@gmail.com` (localStorage `gin-console.email`)
- Project A in `/api/projects/beads`; `GET /api/beads?project=A` returns open beads assigned to `giangdhwhtbr`, `GiangDHWHTBR@gmail.com` and `alice`, and one unassigned open bead owned by `giangdhwhtbr@gmail.com`

**Steps:**
1. Open /my-tasks?project=A

**Expected:**
- Only the beads assigned to `giangdhwhtbr` and `GiangDHWHTBR@gmail.com` are listed
- The count is 2
