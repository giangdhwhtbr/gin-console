# TC-BEADS-043: Pull each project

- **REQ:** REQ-BEADS-016@ea0e7f1e
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-46-49-api
- **Checked:** 210b2ee1

**Preconditions:**
- Projects A and B are configured, each with a Dolt remote
- The `bd` command is replaced by a fake that records every call and exits 0 for `bd dolt pull` in both

**Steps:**
1. Send `POST /api/refresh`
2. Request `GET /api/projects/beads`

**Expected:**
- The fake recorded one `bd dolt pull` in A's directory and one in B's
- A and B each have `pull.status` `ok`, `pull.at` set and `pull.error` `null`
