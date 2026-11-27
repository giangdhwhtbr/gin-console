# TC-BEADS-096: Image count of the list

- **REQ:** REQ-BEADS-001@d5450d95
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-27T00-00-02-api
- **Checked:** 45a85695

**Preconditions:**
- Project `p` with bug `b-1` naming 3 images of which 2 are available, and task `t-1` naming none

**Steps:**
1. Send `GET /api/beads?project=p`

**Expected:**
- `b-1` has `image_count: 2`
- `t-1` has `image_count: 0`
