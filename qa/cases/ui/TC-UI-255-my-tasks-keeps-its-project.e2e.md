# TC-UI-255: My work keeps its project

- **REQ:** REQ-UI-073@9e85a65b
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** 55db4b10

**Preconditions:**
- Projects `a` and `b` are configured; project `b` has bead `b-1` assigned to the user

**Steps:**
1. Open `/my-tasks?project=b`
2. Open `b-1` from the list
3. Use the first link of the breadcrumb

**Expected:**
- After step 2 the first link reads "My work"
- After step 3 My work of project `b` is shown, the URL is `/my-tasks?project=b` and there is no project select
