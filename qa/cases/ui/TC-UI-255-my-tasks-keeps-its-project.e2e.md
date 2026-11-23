# TC-UI-255: My Tasks keeps its project

- **REQ:** REQ-UI-073@3fe05bd7
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** b92f464c

**Preconditions:**
- Projects `a` and `b` are configured; project `b` has bead `b-1` assigned to the user

**Steps:**
1. Open `/my-tasks?project=b`
2. Open `b-1` from the list
3. Use the first link of the breadcrumb

**Expected:**
- After step 2 the first link reads "My Tasks"
- After step 3 My Tasks of project `b` is shown, the URL is `/my-tasks?project=b` and there is no project select
