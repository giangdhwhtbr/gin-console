# TC-SERVER-013: Image from another site

- **REQ:** REQ-SERVER-012@bada5444
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-26T14-14-56-api
- **Checked:** faded27a

**Preconditions:**
- The server is running with a fake `bd` command

**Steps:**
1. Request `GET /api/projects/beads` with the header `Sec-Fetch-Site: cross-site`

**Expected:**
- The answer is 403 with the body `{"error": "cross-site request refused"}`
- The endpoint does not run
