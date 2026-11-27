# TC-BEADS-105: Reasons an attachment is not available

- **REQ:** REQ-BEADS-031@400d25fb
- **Priority:** high

**Preconditions:**
- Project `alpha` has bead `a-1` whose description names `attachment:C`, with the entries `{sha256: A, store: "git-ref", pruned_at: "2026-11-20T10:00:00Z"}` and `{sha256: B, store: "s3"}`
- Neither ref of `alpha` holds a blob

**Steps:**
1. Send `GET /api/beads/alpha/a-1`

**Expected:**
- The image of `C` has `reason` `not_listed`, the image of `A` `pruned` and the image of `B` `unsupported_store`
- None of the three is available and each has `served_as` `null`
