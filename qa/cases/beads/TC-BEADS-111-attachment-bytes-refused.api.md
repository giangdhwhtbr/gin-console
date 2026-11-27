# TC-BEADS-111: Attachment bytes refused

- **REQ:** REQ-BEADS-032@8984003b
- **Priority:** high

**Preconditions:**
- Bead `a-1` of `alpha` has the entries `A`, `B` and `C`
- The blob of `A` is a PNG whose SHA-256 is not `A`, the blob of `B` is a text file whose SHA-256 is `B`, and the blob of `C` is a PNG of 11 MB whose SHA-256 is `C`

**Steps:**
1. Send `GET /api/beads/alpha/a-1/attachments/A`
2. Send `GET /api/beads/alpha/a-1/attachments/B`
3. Send `GET /api/beads/alpha/a-1/attachments/C`

**Expected:**
- Every response is 404 with the body `{"error":"not found"}`
