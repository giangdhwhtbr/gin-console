# TC-UI-253: Bead page from My Tasks

- **REQ:** REQ-UI-057@92e2ae1c
- **Priority:** high

**Preconditions:**
- Project `alpha` has bead `a-1` assigned to the user, who is shown in My Tasks

**Steps:**
1. Open `/my-tasks`
2. Open `a-1` from the list

**Expected:**
- The bead page is shown
- Only the My Tasks link in the main navigation has `aria-current="page"`
