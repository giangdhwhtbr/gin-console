# TC-UI-011: My work matches by email or name

- **REQ:** REQ-UI-100@6b611f17
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 3b9db449

**Preconditions:**
- Signed-in email `giangdhwhtbr@gmail.com` (localStorage `gin-console.email`)
- Project A in `/api/projects/beads`; `GET /api/beads?project=A` returns ready beads assigned to `giangdhwhtbr`, `GiangDHWHTBR@gmail.com` and `alice`, and one unassigned ready bead owned by `giangdhwhtbr@gmail.com`

**Steps:**
1. Open /my-tasks?project=A

**Expected:**
- "Assigned to me" holds the beads assigned to `giangdhwhtbr` and `GiangDHWHTBR@gmail.com`
- "Unclaimed" holds the unassigned bead
- The bead assigned to `alice` is in no group
