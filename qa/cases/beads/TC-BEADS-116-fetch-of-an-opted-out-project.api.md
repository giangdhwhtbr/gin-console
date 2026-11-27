# TC-BEADS-116: Fetch of an opted-out project

- **REQ:** REQ-BEADS-033@49ff080f
- **Priority:** medium

**Preconditions:**
- Project A sets `pull: false`
- A fake git records every call

**Steps:**
1. Send `POST /api/refresh`
2. Send `GET /api/projects/beads`

**Expected:**
- The fake git recorded no call in A's directory
- A has `attachments_fetch` `null`
