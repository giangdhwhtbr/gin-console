# TC-SERVER-021: Tools

- **REQ:** REQ-SERVER-012@bada5444
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-26T14-14-56-api
- **Checked:** cff6bb6d

**Preconditions:**
- The server is running with a fake `bd` command

**Steps:**
1. Request `GET /api/projects/beads` without a `Sec-Fetch-Site` header

**Expected:**
- The answer is 200
