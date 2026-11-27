# TC-SERVER-020: The console itself

- **REQ:** REQ-SERVER-012@62d45eda
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-26T14-14-56-api
- **Checked:** b07bb473

**Preconditions:**
- The server is running with a fake `bd` command

**Steps:**
1. Request `GET /api/projects/beads` with the header `Sec-Fetch-Site: same-origin`

**Expected:**
- The answer is 200
