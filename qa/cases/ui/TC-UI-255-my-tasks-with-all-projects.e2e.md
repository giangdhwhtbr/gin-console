# TC-UI-255: My Tasks with all projects

- **REQ:** REQ-UI-073@99c2938a
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** aa91fe89

**Preconditions:**
- Projects `a` and `b` are configured; project `b` has bead `b-1` assigned to the user

**Steps:**
1. Open `/my-tasks`
2. Open `b-1` from the list
3. Use the first link of the breadcrumb

**Expected:**
- After step 2 the first link reads "My Tasks"
- After step 3 My Tasks is shown with "All projects"
