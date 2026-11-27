# TC-BEADS-104: Attachment available from either ref

- **REQ:** REQ-BEADS-031@400d25fb
- **Priority:** high

**Preconditions:**
- Project `alpha` has bead `a-1` with the entry `{sha256: A, store: "git-ref"}` and bead `a-2` with the entry `{sha256: B}`
- `A`, `B` are different sha256 values; the blob `<aa>/A` is only in `refs/gin-console/attachments` and the blob `<aa>/B` only in `refs/gin/attachments`, listed by a fake git

**Steps:**
1. Send `GET /api/beads/alpha/a-1`
2. Send `GET /api/beads/alpha/a-2`

**Expected:**
- Image 1 of `a-1` is available, served as `attachment`, with `reason` `null`
- Image 1 of `a-2` is available, served as `attachment`, with `reason` `null`
