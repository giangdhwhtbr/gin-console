# TC-UI-254: From My work

- **REQ:** REQ-UI-072@bb47458a
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T23-57-16
- **Checked:** 9e19558a

**Preconditions:**
- Project `a` has bead `a-1` titled "Fix login" assigned to the user

**Steps:**
1. Open `/my-tasks?project=a`
2. Open `a-1` from the list

**Expected:**
- The breadcrumb reads "My work" then "Fix login"
- "My work" goes to `/my-tasks?project=a`
