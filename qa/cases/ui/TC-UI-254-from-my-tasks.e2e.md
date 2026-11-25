# TC-UI-254: From My work

- **REQ:** REQ-UI-072@3768e26f
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** fe1fb2bc

**Preconditions:**
- Project `a` has bead `a-1` titled "Fix login" assigned to the user

**Steps:**
1. Open `/my-tasks?project=a`
2. Open `a-1` from the list

**Expected:**
- The breadcrumb reads "My work" then "Fix login"
- "My work" goes to `/my-tasks?project=a`
