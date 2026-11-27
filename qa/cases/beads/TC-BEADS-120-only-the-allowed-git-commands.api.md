# TC-BEADS-120: Only the allowed git commands

- **REQ:** REQ-BEADS-035@bd378381
- **Priority:** high

**Preconditions:**
- Project `alpha` has bead `a-1` with git-ref entries `A` and `B`, and the blob of `A` is available
- A recording fake git replaces git

**Steps:**
1. Send `POST /api/refresh`
2. Send `GET /api/beads?project=alpha`
3. Send `GET /api/beads/alpha/a-1`
4. Send `GET /api/beads/alpha/a-1/attachments/A`

**Expected:**
- Every recorded command ran in `alpha`'s directory and is the fetch of REQ-BEADS-033, `ls-tree -r --name-only` on one of the two refs, or `cat-file` on a blob of one of them
- No recorded command names `refs/gin/attachments-origin`, `push` or `update-ref`
