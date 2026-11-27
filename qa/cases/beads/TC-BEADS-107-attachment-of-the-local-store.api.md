# TC-BEADS-107: Attachment of the local store

- **REQ:** REQ-BEADS-031@400d25fb
- **Priority:** medium

**Preconditions:**
- Project `alpha` at a folder `<alpha>` has bead `a-1` with the entries `{sha256: A, store: "local"}` and `{sha256: B, store: "local"}`
- The file `<alpha>/.agent-workflow/attachments/<aa>/A` is a PNG; `<alpha>/.agent-workflow/attachments/<aa>/B` is a symlink to a PNG outside `<alpha>`

**Steps:**
1. Send `GET /api/beads/alpha/a-1`

**Expected:**
- The image of `A` is available and served as `attachment`
- The image of `B` is not available with `reason` `not_fetched`
