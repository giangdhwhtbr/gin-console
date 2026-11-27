# TC-REQUIREMENTS-062: Grant path

- **REQ:** REQ-REQUIREMENTS-010@1ea0e060
- **Priority:** high

**Preconditions:**
- Auth is on, a user allowed project `a` is signed in and holds the grant `G`
- A confirmed mockup of `a` with `style.css`, `index.html` and a `notes.txt`

**Steps:**
1. Request `GET /api/requirements/mockups/a/g/G/files/ui/2026-11-22/style.css` without a cookie
2. Request the same folder's `notes.txt`
3. Request a path with `..` through the grant

**Expected:**
- The css file is served as it is on the path without `g/G`
- The `.txt` file and the `..` path answer 404
