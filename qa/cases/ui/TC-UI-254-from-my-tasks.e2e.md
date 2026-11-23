# TC-UI-254: From My Tasks

- **REQ:** REQ-UI-072@6a1a0b98
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** db131e38

**Preconditions:**
- Project `a` has bead `a-1` titled "Fix login" assigned to the user

**Steps:**
1. Open `/my-tasks?project=a`
2. Open `a-1` from the list

**Expected:**
- The breadcrumb reads "My Tasks" then "Fix login"
- "My Tasks" goes to `/my-tasks?project=a`
