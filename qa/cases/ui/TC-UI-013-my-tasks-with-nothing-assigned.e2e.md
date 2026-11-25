# TC-UI-013: My work with nothing assigned

- **REQ:** REQ-UI-100@6b611f17
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** db3b96b7

**Preconditions:**
- Signed-in email `giangdhwhtbr@gmail.com`
- The current project is A and none of its beads is assigned to `giangdhwhtbr@gmail.com` or `giangdhwhtbr`

**Steps:**
1. Open /my-tasks?project=A

**Expected:**
- The page says "No work for giangdhwhtbr@gmail.com"
- A link "Open the Beads page" goes to `/beads?project=A`
