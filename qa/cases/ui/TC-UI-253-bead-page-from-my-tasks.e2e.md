# TC-UI-253: Bead page from My work

- **REQ:** REQ-UI-057@16af801c
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 855d587c

**Preconditions:**
- Project `alpha` has bead `a-1` assigned to the user, who is shown in My work

**Steps:**
1. Open `/my-tasks`
2. Open `a-1` from the list

**Expected:**
- The bead page is shown
- Only the My work link in the main navigation has `aria-current="page"`
