# TC-BEADS-093: Image served

- **REQ:** REQ-BEADS-028@487cfa9a
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-27T00-00-02-api
- **Checked:** d4b9b0ac

**Preconditions:**
- Bead `a-1` of project `alpha` whose image 1 is an available PNG

**Steps:**
1. Send `GET /api/beads/alpha/a-1/images/1`

**Expected:**
- The response is 200 with `Content-Type` `image/png` and the bytes of the file
- The headers are `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox; default-src 'none'`, `Content-Disposition: inline` and `Cache-Control: private, no-cache`
