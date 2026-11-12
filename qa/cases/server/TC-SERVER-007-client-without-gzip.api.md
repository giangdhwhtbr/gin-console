# TC-SERVER-007: Client without gzip

- **REQ:** REQ-SERVER-011@1be7c6cf
- **Priority:** medium

**Preconditions:**
- Project `alpha` whose bead list with closed beads is larger than 1000 bytes when serialized

**Steps:**
1. Send `GET /api/beads?project=alpha&closed=1` with `Accept-Encoding: identity`

**Expected:**
- The response has no `Content-Encoding` header
