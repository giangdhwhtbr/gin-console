# TC-UI-253: Bead page from My Tasks

- **REQ:** REQ-UI-057@e16f2d59
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 855d587c

**Preconditions:**
- Project `alpha` has bead `a-1` assigned to the user, who is shown in My Tasks

**Steps:**
1. Open `/my-tasks`
2. Open `a-1` from the list

**Expected:**
- The bead page is shown
- Only the My Tasks link in the main navigation has `aria-current="page"`
