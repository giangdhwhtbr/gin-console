# TC-BEADS-114: No store and no remote

- **REQ:** REQ-BEADS-033@49ff080f
- **Priority:** medium

**Preconditions:**
- Project A's `git fetch` exits 128 with "fatal: couldn't find remote ref refs/gin/attachments"
- Project B's `git fetch` exits 128 with "fatal: 'origin' does not appear to be a git repository"

**Steps:**
1. Send `POST /api/refresh`
2. Send `GET /api/projects/beads`

**Expected:**
- A has `attachments_fetch.status` `no_store` and `error` `null`
- B has `attachments_fetch.status` `no_remote` and `error` `null`
