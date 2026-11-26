# TC-SERVER-012: Retired projects endpoint

- **REQ:** REQ-SERVER-004@b306e141
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-26T14-14-56-api
- **Checked:** be8ee062

**Preconditions:**
- The server is running with fake `gin` and `bd` commands

**Steps:**
1. Request `GET /api/projects`
2. Request `GET /api/projects/beads`

**Expected:**
- The first response is 404 and is not `index.html`
- The second response is 200
