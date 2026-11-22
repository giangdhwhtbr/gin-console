# TC-UI-254: From My Tasks

- **REQ:** REQ-UI-072@b8e02f9d
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 605e7621

**Preconditions:**
- Project `a` has bead `a-1` titled "Fix login" assigned to the user

**Steps:**
1. Open `/my-tasks?project=a`
2. Open `a-1` from the list

**Expected:**
- The breadcrumb reads "My Tasks" then "Fix login"
- "My Tasks" goes to `/my-tasks?project=a`
