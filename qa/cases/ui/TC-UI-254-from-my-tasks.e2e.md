# TC-UI-254: From My Tasks

- **REQ:** REQ-UI-072@08dfd985
- **Priority:** high

**Preconditions:**
- Project `a` has bead `a-1` titled "Fix login" assigned to the user

**Steps:**
1. Open `/my-tasks?project=a`
2. Open `a-1` from the list

**Expected:**
- The breadcrumb reads "My Tasks" then "Fix login"
- "My Tasks" goes to `/my-tasks?project=a`
