# TC-UI-011: My Tasks matches by email or name

- **REQ:** REQ-UI-100@651177c0
- **Priority:** high

**Preconditions:**
- Signed-in email `giangdhwhtbr@gmail.com` (localStorage `gin-console.email`)
- Project A in `/api/projects/beads`; `GET /api/beads?project=A` returns open beads assigned to `giangdhwhtbr`, `GiangDHWHTBR@gmail.com` and `alice`, and one unassigned open bead owned by `giangdhwhtbr@gmail.com`

**Steps:**
1. Open /my-tasks

**Expected:**
- Only the beads assigned to `giangdhwhtbr` and `GiangDHWHTBR@gmail.com` are listed
- The count is 2
