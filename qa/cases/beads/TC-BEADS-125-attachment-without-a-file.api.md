# TC-BEADS-125: Attachment without a file

- **REQ:** REQ-BEADS-028@efb2bd9f
- **Priority:** medium

**Preconditions:**
- Bead `a-1` of `alpha` whose image 1 is the available attachment `A` with no `local:` line

**Steps:**
1. Send `GET /api/beads/alpha/a-1/images/1`

**Expected:**
- The response is 404
