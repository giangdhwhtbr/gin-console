# TC-BEADS-110: Attachment served

- **REQ:** REQ-BEADS-032@8984003b
- **Priority:** high

**Preconditions:**
- Project `alpha` has bead `a-1` with the entry `{sha256: A}`
- `refs/gin-console/attachments` holds the PNG blob `<aa>/A` of 300 KB whose SHA-256 is `A`

**Steps:**
1. Send `GET /api/beads/alpha/a-1/attachments/A`

**Expected:**
- The response is 200 with `Content-Type` `image/png` and the bytes of the blob
- The headers are `Cache-Control: private, max-age=31536000, immutable`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox; default-src 'none'` and `Content-Disposition: inline`
