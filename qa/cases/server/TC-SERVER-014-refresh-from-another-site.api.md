# TC-SERVER-014: Refresh from another site

- **REQ:** REQ-SERVER-012@bada5444
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-26T14-14-56-api
- **Checked:** 84471bcb

**Preconditions:**
- The server is running with a fake `bd` command that records its calls

**Steps:**
1. Request `POST /api/refresh` with the header `Sec-Fetch-Site: cross-site`

**Expected:**
- The answer is 403
- The fake `bd` command was not called, so no pull ran
