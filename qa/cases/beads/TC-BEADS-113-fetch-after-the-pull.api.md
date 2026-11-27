# TC-BEADS-113: Fetch after the pull

- **REQ:** REQ-BEADS-033@49ff080f
- **Priority:** high

**Preconditions:**
- Project A is configured; its `bd dolt pull` exits 1 with a merge conflict and its `git fetch` exits 0
- Fake `bd` and `git` runners record every call

**Steps:**
1. Send `POST /api/refresh`
2. Send `GET /api/projects/beads`

**Expected:**
- The refresh response is 204
- `git fetch --quiet --no-write-fetch-head origin +refs/gin/attachments:refs/gin-console/attachments` ran in A's directory after `bd dolt pull` ended
- A has `pull.status` `error` and `attachments_fetch.status` `ok`
