# TC-BEADS-045: Opted out or missing

- **REQ:** REQ-BEADS-016@ea0e7f1e
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-46-49-api
- **Checked:** 5b5ac079

**Preconditions:**
- Project A is configured with `pull: false`
- Project B is configured but its directory does not exist
- The `bd` command is replaced by a fake that records every call

**Steps:**
1. Send `POST /api/refresh`
2. Request `GET /api/projects/beads`

**Expected:**
- The fake recorded no `bd` call for A or B
- A and B both have `pull` `null`
