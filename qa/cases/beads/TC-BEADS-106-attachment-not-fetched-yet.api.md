# TC-BEADS-106: Attachment not fetched yet

- **REQ:** REQ-BEADS-031@400d25fb
- **Priority:** medium

**Preconditions:**
- Project `alpha` has bead `a-1` with the entry `{sha256: A, store: "git-ref"}`
- Project `alpha` has neither `refs/gin/attachments` nor `refs/gin-console/attachments`

**Steps:**
1. Send `GET /api/beads/alpha/a-1`

**Expected:**
- The image of `A` is not available with `reason` `not_fetched` and `served_as` `null`
