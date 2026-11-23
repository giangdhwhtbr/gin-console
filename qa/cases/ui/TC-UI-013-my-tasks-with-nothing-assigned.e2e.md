# TC-UI-013: My Tasks with nothing assigned

- **REQ:** REQ-UI-100@14d1209a
- **Priority:** medium

**Preconditions:**
- Signed-in email `giangdhwhtbr@gmail.com`
- The current project is A and none of its beads is assigned to `giangdhwhtbr@gmail.com` or `giangdhwhtbr`

**Steps:**
1. Open /my-tasks?project=A

**Expected:**
- The page says "No tasks assigned to giangdhwhtbr@gmail.com"
- A link "Open the Beads page" goes to `/beads?project=A`
