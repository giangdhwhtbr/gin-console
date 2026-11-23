# TC-BEADS-058: Only pull

- **REQ:** REQ-BEADS-003@1b0ec299
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** 5587d3d0

**Preconditions:**
- Projects A and B are configured, each with a Dolt remote
- The `bd` command is replaced by a fake that records every call

**Steps:**
1. Send `POST /api/refresh`

**Expected:**
- The only `bd` commands the fake recorded were one `bd dolt pull` in A's directory and one in B's
